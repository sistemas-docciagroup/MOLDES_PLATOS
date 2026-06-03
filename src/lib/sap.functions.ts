import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPool, sql } from "@/integrations/sqlserver/client.server";

const SAP_ENDPOINT =
  "http://192.168.10.202:8000/sap/bc/srt/rfc/sap/z_claude_code_01/700/z_claude_code_01/z_claude_code_01_bin?sap-language=ES";

function buildSoapRequest(numeroOf: string): string {
  return `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:sap-com:document:sap:rfc:functions">
   <soapenv:Header/>
   <soapenv:Body>
      <urn:Z_GETDESCRIPCION_MATERIAL>
         <I_OF>${numeroOf}</I_OF>
      </urn:Z_GETDESCRIPCION_MATERIAL>
   </soapenv:Body>
</soapenv:Envelope>`;
}

function getText(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`));
  return m ? m[1].trim() : "";
}

// Tipo completo para persistencia en DB (todos los campos del response)
type SapConfigItemFull = {
  atinn: string; atnam: string; atbez: string;
  atwrt: string; atwtb: string; ewahr: string;
};

type SapOfDataFull = {
  of: string;
  descripcion: string;
  configurable: boolean;
  ePedido: string;
  ePosicionPed: string;
  configuracion: SapConfigItemFull[];
};

// Tipo público expuesto al cliente (solo campos funcionales)
export type SapConfigItem = { atbez: string; atwtb: string };

export type SapOfData = {
  of: string;
  descripcion: string;
  configurable: boolean;
  configuracion: SapConfigItem[];
};

function parseSapResponse(xml: string): SapOfDataFull {
  const configurable = getText(xml, "E_CONFIGURABLE") === "X";
  const descripcion  = getText(xml, "E_DESCRIPCION");
  const of           = getText(xml, "E_OF");
  const ePedido      = getText(xml, "E_PEDIDO");
  const ePosicionPed = getText(xml, "E_POSICION_PED");

  const configuracion: SapConfigItemFull[] = [];
  const itemRx = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRx.exec(xml)) !== null) {
    const b = m[1];
    configuracion.push({
      atinn: b.match(/<ATINN>([^<]*)<\/ATINN>/)?.[1]?.trim() ?? "",
      atnam: b.match(/<ATNAM>([^<]*)<\/ATNAM>/)?.[1]?.trim() ?? "",
      atbez: b.match(/<ATBEZ>([^<]*)<\/ATBEZ>/)?.[1]?.trim() ?? "",
      atwrt: b.match(/<ATWRT>([^<]*)<\/ATWRT>/)?.[1]?.trim() ?? "",
      atwtb: b.match(/<ATWTB>([^<]*)<\/ATWTB>/)?.[1]?.trim() ?? "",
      ewahr: b.match(/<EWAHR>([^<]*)<\/EWAHR>/)?.[1]?.trim() ?? "",
    });
  }

  return { of, descripcion, configurable, ePedido, ePosicionPed, configuracion };
}

async function persistirEnDb(data: SapOfDataFull): Promise<void> {
  const pool = await getPool();

  // UPSERT cabecera
  await pool.request()
    .input("numero_of",      sql.NVarChar, data.of)
    .input("e_descripcion",  sql.NVarChar, data.descripcion || null)
    .input("e_configurable", sql.Bit,      data.configurable ? 1 : 0)
    .input("e_pedido",       sql.NVarChar, data.ePedido || null)
    .input("e_posicion_ped", sql.NVarChar, data.ePosicionPed || null)
    .query(`
      MERGE sap_of_material WITH (HOLDLOCK) AS target
      USING (SELECT @numero_of AS numero_of) AS src ON target.numero_of = src.numero_of
      WHEN MATCHED THEN
        UPDATE SET e_descripcion  = @e_descripcion,
                   e_configurable = @e_configurable,
                   e_pedido       = @e_pedido,
                   e_posicion_ped = @e_posicion_ped,
                   consultado_at  = GETDATE()
      WHEN NOT MATCHED THEN
        INSERT (numero_of, e_descripcion, e_configurable, e_pedido, e_posicion_ped)
        VALUES (@numero_of, @e_descripcion, @e_configurable, @e_pedido, @e_posicion_ped);
    `);

  // Reemplazar ítems de configuración (borra los anteriores e inserta los nuevos)
  await pool.request()
    .input("numero_of", sql.NVarChar, data.of)
    .query("DELETE FROM sap_of_configuracion WHERE numero_of = @numero_of");

  for (let i = 0; i < data.configuracion.length; i++) {
    const item = data.configuracion[i];
    await pool.request()
      .input("numero_of", sql.NVarChar, data.of)
      .input("orden",     sql.TinyInt,  i)
      .input("atinn",     sql.NVarChar, item.atinn || null)
      .input("atnam",     sql.NVarChar, item.atnam || null)
      .input("atbez",     sql.NVarChar, item.atbez || null)
      .input("atwrt",     sql.NVarChar, item.atwrt || null)
      .input("atwtb",     sql.NVarChar, item.atwtb || null)
      .input("ewahr",     sql.NVarChar, item.ewahr || null)
      .query(`
        INSERT INTO sap_of_configuracion (numero_of, orden, atinn, atnam, atbez, atwrt, atwtb, ewahr)
        VALUES (@numero_of, @orden, @atinn, @atnam, @atbez, @atwrt, @atwtb, @ewahr)
      `);
  }
}

export const buscarOfSap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ numeroOf: z.string().min(1).max(120) }).parse(input)
  )
  .handler(async ({ data }): Promise<SapOfData> => {
    const body = buildSoapRequest(data.numeroOf.trim());

    const res = await fetch(SAP_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=utf-8" },
      body,
    });

    if (!res.ok) throw new Error(`SAP respondió con estado ${res.status}`);

    const xml  = await res.text();
    const full = parseSapResponse(xml);

    // Persistir en DB en segundo plano (no bloquea la respuesta al cliente)
    persistirEnDb(full).catch((e) =>
      console.error("[sap] Error al persistir en DB:", e?.message)
    );

    // Devolver solo los campos funcionales al cliente
    return {
      of:           full.of,
      descripcion:  full.descripcion,
      configurable: full.configurable,
      configuracion: full.configuracion.map(({ atbez, atwtb }) => ({ atbez, atwtb })),
    };
  });
