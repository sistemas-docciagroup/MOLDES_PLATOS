import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

export type SapConfigItem = { atbez: string; atwtb: string };

export type SapOfData = {
  of: string;
  descripcion: string;
  configurable: boolean;
  configuracion: SapConfigItem[];
};

function parseSapResponse(xml: string): SapOfData {
  const configurable = getText(xml, "E_CONFIGURABLE") === "X";
  const descripcion = getText(xml, "E_DESCRIPCION");
  const of = getText(xml, "E_OF");

  const configuracion: SapConfigItem[] = [];
  const itemRx = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRx.exec(xml)) !== null) {
    const block = m[1];
    const atbez = block.match(/<ATBEZ>([^<]*)<\/ATBEZ>/)?.[1]?.trim() ?? "";
    const atwtb = block.match(/<ATWTB>([^<]*)<\/ATWTB>/)?.[1]?.trim() ?? "";
    if (atbez || atwtb) configuracion.push({ atbez, atwtb });
  }

  return { of, descripcion, configurable, configuracion };
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

    if (!res.ok) {
      throw new Error(`SAP respondió con estado ${res.status}`);
    }

    const xml = await res.text();
    return parseSapResponse(xml);
  });
