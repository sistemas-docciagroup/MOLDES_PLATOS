import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPool, sql } from "@/integrations/sqlserver/client.server";

const PUESTO_VALUES = [
  "preparacion_molde", "desmoldeo", "repaso", "valvula", "empaquetado", "reparacion_moldes",
] as const;

const RESULTADOS = [
  "fabricacion_ok", "fabricacion_con_incidencia", "fabricacion_con_observacion", "enviado_reparacion",
] as const;

export const listarFabricaciones = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    desde:            z.string().nullable().optional(),
    hasta:            z.string().nullable().optional(),
    molde:            z.string().max(120).nullable().optional(),
    usuario:          z.string().max(120).nullable().optional(),
    resultado:        z.enum(RESULTADOS).nullable().optional(),
    color:            z.string().max(60).nullable().optional(),
    puesto:           z.enum(PUESTO_VALUES).nullable().optional(),
    limite:           z.number().int().min(1).max(500).optional(),
    incluirEliminadas: z.boolean().optional(),
  }).parse(input ?? {}))
  .handler(async ({ data }) => {
    const pool = await getPool();

    const conditions: string[] = [];
    const req = pool.request();

    if (!data.incluirEliminadas) conditions.push("f.eliminada = 0");
    if (data.desde)    { conditions.push("f.fecha_hora >= @desde");   req.input("desde",   sql.NVarChar, data.desde); }
    if (data.hasta)    { conditions.push("f.fecha_hora <= @hasta");   req.input("hasta",   sql.NVarChar, data.hasta + "T23:59:59"); }
    if (data.molde)    { conditions.push("f.numero_molde LIKE @molde"); req.input("molde",  sql.NVarChar, `%${data.molde}%`); }
    if (data.usuario)  { conditions.push("f.usuario_nombre LIKE @usu"); req.input("usu",    sql.NVarChar, `%${data.usuario}%`); }
    if (data.resultado){ conditions.push("f.resultado = @resultado");  req.input("resultado", sql.NVarChar, data.resultado); }
    if (data.puesto)   { conditions.push("f.puesto = @puesto");        req.input("puesto",  sql.NVarChar, data.puesto); }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const top   = data.limite ?? 200;

    const res = await req.query(`
      SELECT TOP (${top})
        f.id, f.numero_of, f.numero_molde, f.modelo,
        f.usuario_id, f.usuario_nombre, f.puesto,
        f.resultado, f.texto_incidencia, f.observacion,
        f.eliminada, f.motivo_eliminacion, f.fecha_hora,
        s.e_descripcion AS descripcion_sap
      FROM fabricaciones f
      LEFT JOIN sap_of_material s ON s.numero_of = f.numero_of
      ${where}
      ORDER BY f.fecha_hora DESC
    `);

    return res.recordset.map((r: any) => ({
      id:                r.id,
      numero_of:         r.numero_of,
      numero_molde:      r.numero_molde,
      modelo:            r.modelo ?? null,
      usuario_id:        r.usuario_id ?? null,
      usuario_nombre:    r.usuario_nombre ?? "—",
      puesto:            r.puesto ?? null,
      resultado:         r.resultado,
      texto_incidencia:  r.texto_incidencia ?? null,
      observacion:       r.observacion ?? null,
      eliminada:         Boolean(r.eliminada),
      motivo_eliminacion: r.motivo_eliminacion ?? null,
      fecha_hora:        r.fecha_hora instanceof Date ? r.fecha_hora.toISOString() : String(r.fecha_hora),
      descripcion_sap:   r.descripcion_sap ?? null,
    }));
  });

export const eliminarOf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    fabricacionId: z.string(),
    motivo:        z.string().max(500).nullable().optional(),
  }).parse(input))
  .handler(async ({ data }) => {
    const pool = await getPool();
    await pool.request()
      .input("id",     sql.NVarChar, data.fabricacionId)
      .input("motivo", sql.NVarChar, data.motivo ?? null)
      .query(`
        UPDATE fabricaciones
        SET eliminada = 1, motivo_eliminacion = @motivo
        WHERE id = @id
      `);
    return { ok: true };
  });

export const cambiarMoldeFabricacion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    fabricacionId: z.string(),
    nuevoMolde:    z.string().min(1).max(120),
    motivo:        z.string().min(3).max(500),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const pool = await getPool();

    const current = await pool.request()
      .input("id", sql.NVarChar, data.fabricacionId)
      .query("SELECT numero_molde FROM fabricaciones WHERE id = @id");

    const row = current.recordset[0];
    if (!row) throw new Error("Fabricación no encontrada.");

    const moldeAnterior = row.numero_molde;
    const moldeNuevo    = data.nuevoMolde.trim();
    if (moldeAnterior === moldeNuevo) throw new Error("El molde nuevo es igual al actual.");

    const histId = Math.random().toString(36).slice(2) + Date.now().toString(36);

    await pool.request()
      .input("id",         sql.NVarChar, data.fabricacionId)
      .input("nuevoMolde", sql.NVarChar, moldeNuevo)
      .query("UPDATE fabricaciones SET numero_molde = @nuevoMolde WHERE id = @id");

    await pool.request()
      .input("id",             sql.NVarChar, histId)
      .input("fabricacion_id", sql.NVarChar, data.fabricacionId)
      .input("molde_anterior", sql.NVarChar, moldeAnterior)
      .input("molde_nuevo",    sql.NVarChar, moldeNuevo)
      .input("motivo",         sql.NVarChar, data.motivo.trim())
      .input("usuario_id",     sql.NVarChar, context.userId)
      .query(`
        INSERT INTO historial_cambios_of (id, fabricacion_id, molde_anterior, molde_nuevo, motivo, usuario_id)
        VALUES (@id, @fabricacion_id, @molde_anterior, @molde_nuevo, @motivo, @usuario_id)
      `);

    return { ok: true };
  });

export const historialCambiosFabricacion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ fabricacionId: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const pool = await getPool();
    const res = await pool.request()
      .input("id", sql.NVarChar, data.fabricacionId)
      .query(`
        SELECT id, fabricacion_id, molde_anterior, molde_nuevo, motivo,
               usuario_id, usuario_nombre, created_at
        FROM historial_cambios_of
        WHERE fabricacion_id = @id
        ORDER BY created_at DESC
      `);
    return res.recordset.map((r: any) => ({
      id:             r.id,
      fabricacion_id: r.fabricacion_id,
      molde_anterior: r.molde_anterior,
      molde_nuevo:    r.molde_nuevo,
      motivo:         r.motivo,
      usuario_id:     r.usuario_id ?? null,
      usuario_nombre: r.usuario_nombre ?? null,
      created_at:     r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    }));
  });

export const incidenciasDeOf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ numeroOf: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data }) => {
    const pool = await getPool();
    const numeroOf = data.numeroOf.trim();

    const res = await pool.request()
      .input("numero_of", sql.NVarChar, numeroOf)
      .query(`
        SELECT id, resultado AS tipo, fecha_hora AS fecha,
               ISNULL(texto_incidencia, observacion) AS descripcion,
               NULL AS motivo, numero_molde AS molde, puesto, usuario_nombre
        FROM fabricaciones
        WHERE numero_of = @numero_of
          AND resultado IN ('fabricacion_con_incidencia','fabricacion_con_observacion','enviado_reparacion')
          AND eliminada = 0
        ORDER BY fecha_hora DESC
      `);

    const items = res.recordset.map((r: any) => ({
      id:             r.id,
      tipo:           r.tipo,
      fecha:          r.fecha instanceof Date ? r.fecha.toISOString() : String(r.fecha),
      descripcion:    r.descripcion ?? "",
      motivo:         null as string | null,
      molde:          r.molde,
      puesto:         r.puesto ?? null,
      usuario_nombre: r.usuario_nombre ?? "—",
    }));

    return { total: items.length, items };
  });
