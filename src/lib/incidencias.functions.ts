import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPool, sql } from "@/integrations/sqlserver/client.server";
import { incidencias, reparaciones, estadosMolde, fabricaciones } from "./mock-db";
import type { Puesto } from "./constants";

function id() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

const PUESTO_VALUES = [
  "preparacion_molde", "desmoldeo", "repaso", "valvula", "empaquetado", "reparacion_moldes",
] as const;

const MAX_AUDIO_BASE64_BYTES = 10_000_000;

const processSchema = z.object({
  audioBase64: z.string().min(10).max(MAX_AUDIO_BASE64_BYTES),
  mimeType: z.string().min(1).max(100).default("audio/webm"),
  puesto: z.enum(PUESTO_VALUES),
});

// IA: devuelve datos de ejemplo (sin conexión real a modelo de IA)
async function callIA(puesto: Puesto) {
  return {
    molde: "514",
    descripcion: "Muestra de transcripción de audio simulada — conecta un proveedor de IA para activar el procesamiento real.",
    transcripcion: "Audio recibido. Procesamiento de IA no disponible en modo demo.",
    motivo_corto: "Sucio",
    zona: "superficie",
    color: null as string | null,
    tipo_fallo: null as "molde" | "proceso" | null,
  };
}

export const processAudioIncidencia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => processSchema.parse(input))
  .handler(async ({ data }) => callIA(data.puesto));

export const processAudioReparacion = processAudioIncidencia;

const fotoSchema = z.object({ foto_url: z.string().url(), foto_nombre: z.string().min(1) }).nullable().optional();

const saveIncidenciaSchema = z.object({
  molde: z.string().max(100).nullable(),
  descripcion: z.string().min(1).max(5000),
  transcripcion: z.string().min(1).max(20000),
  motivo_corto: z.string().max(255).nullable(),
  zona: z.string().max(100).nullable(),
  color: z.string().max(100).nullable(),
  foto: fotoSchema,
  foto2: fotoSchema,
  estado_molde: z.enum(["seguir_produccion", "observacion", "mandar_reparacion"]).default("seguir_produccion"),
  tipo_fallo: z.enum(["molde", "proceso"]).nullable().optional(),
});

export const saveIncidencia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveIncidenciaSchema.parse(input))
  .handler(async ({ data }) => {
    const newId = id();
    const now = new Date().toISOString();
    incidencias.push({
      id: newId, molde: data.molde ?? "", descripcion: data.descripcion, transcripcion: data.transcripcion,
      motivo_corto: data.motivo_corto, zona: data.zona, color: data.color,
      foto_url: data.foto?.foto_url ?? null, foto_url_2: data.foto2?.foto_url ?? null,
      estado_molde: data.estado_molde, tipo_fallo: data.tipo_fallo ?? null,
      user_id: "admin-001", puesto: "preparacion_molde", estado: "pendiente", created_at: now,
    });
    if (data.estado_molde === "mandar_reparacion" && data.molde) {
      reparaciones.push({
        id: id(), molde: data.molde, descripcion: data.descripcion, transcripcion: data.transcripcion,
        motivo_corto: data.motivo_corto, user_id: "admin-001", puesto: "preparacion_molde",
        estado: "en_reparacion", foto_url: data.foto?.foto_url ?? null, foto_nombre: null,
        foto_url_2: data.foto2?.foto_url ?? null, foto_nombre_2: null, numero_of: null,
        descripcion_reparacion: null, fecha_envio: now, fecha_reparacion: null,
      });
    }
    return { id: newId };
  });

const saveReparacionSchema = z.object({
  molde: z.string().min(1),
  descripcion: z.string().min(1),
  transcripcion: z.string().nullable(),
  motivo_corto: z.string().nullable(),
  foto: fotoSchema,
});

export const enviarReparacion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveReparacionSchema.parse(input))
  .handler(async ({ data }) => {
    const newId = id();
    reparaciones.push({
      id: newId, molde: data.molde, descripcion: data.descripcion, transcripcion: data.transcripcion,
      motivo_corto: data.motivo_corto, user_id: "admin-001", puesto: "preparacion_molde",
      estado: "en_reparacion", foto_url: data.foto?.foto_url ?? null, foto_nombre: null,
      foto_url_2: null, foto_nombre_2: null, numero_of: null,
      descripcion_reparacion: null, fecha_envio: new Date().toISOString(), fecha_reparacion: null,
    });
    return { id: newId };
  });

export const listReparaciones = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ activas: z.boolean().default(true) }).parse(input))
  .handler(async ({ data }) => {
    const rows = reparaciones
      .filter((r) => data.activas ? r.estado === "en_reparacion" : ["reparado", "descartado"].includes(r.estado))
      .sort((a, b) => b.fecha_envio.localeCompare(a.fecha_envio));
    return rows.map((r) => ({ ...r, nombre_envia: "Administrador", nombre_repara: null }));
  });

export const updateReparacionEstado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    id: z.string(),
    estado: z.enum(["en_reparacion", "reparado", "descartado"]),
    descripcion_reparacion: z.string().max(2000).nullable().optional(),
  }).parse(input))
  .handler(async ({ data }) => {
    const idx = reparaciones.findIndex((r) => r.id === data.id);
    if (idx >= 0) {
      reparaciones[idx].estado = data.estado;
      if (data.estado !== "en_reparacion") reparaciones[idx].fecha_reparacion = new Date().toISOString();
      if (data.descripcion_reparacion !== undefined) reparaciones[idx].descripcion_reparacion = data.descripcion_reparacion ?? null;
    }
    return { ok: true };
  });

export const cambiarEstadoMolde = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    molde: z.string().min(1),
    estado_nuevo: z.enum(["seguir_produccion", "observacion"]),
  }).parse(input))
  .handler(async ({ data }) => {
    const now = new Date().toISOString();
    incidencias.push({
      id: id(), molde: data.molde, descripcion: `Cambio de estado a ${data.estado_nuevo}`,
      transcripcion: null, motivo_corto: "Cambio de estado", zona: null, color: null,
      foto_url: null, foto_url_2: null, estado_molde: data.estado_nuevo, tipo_fallo: null,
      user_id: "admin-001", puesto: "preparacion_molde", estado: "pendiente", created_at: now,
    });
    return { ok: true };
  });

// ── Admin — gestión de usuarios (SQL Server) ───────────────────────────────

async function queryUsuarios(pool: Awaited<ReturnType<typeof getPool>>) {
  const res = await pool.request().query(`
    SELECT CAST(id AS NVARCHAR(36)) AS id, username, nombre, puesto, rol,
           activo, puede_ver_moldes, puede_ver_historial,
           puede_crear_incidencias, flujo_picar, created_at
    FROM   usuarios
    ORDER  BY created_at
  `);
  return res.recordset.map((r: any) => ({
    id:                       String(r.id),
    email:                    r.username,
    nombre:                   r.nombre,
    puesto:                   r.puesto ?? null,
    roles:                    [r.rol as string],
    activo:                   Boolean(r.activo),
    puede_ver_moldes:         Boolean(r.puede_ver_moldes),
    puede_ver_historial:      Boolean(r.puede_ver_historial),
    puede_crear_incidencias:  Boolean(r.puede_crear_incidencias),
    flujo_picar:              r.flujo_picar as string,
  }));
}

export const listUsuarios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const pool = await getPool();
    return queryUsuarios(pool);
  });

export const updateUsuarioPuesto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ user_id: z.string(), puesto: z.enum(PUESTO_VALUES).nullable() }).parse(input))
  .handler(async ({ data }) => {
    const pool = await getPool();
    await pool.request()
      .input("id",    sql.NVarChar, data.user_id)
      .input("puesto", sql.NVarChar, data.puesto)
      .query("UPDATE usuarios SET puesto = @puesto, updated_at = GETDATE() WHERE CAST(id AS NVARCHAR(36)) = @id");
    return { ok: true };
  });

export const updateUsuarioFlujo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ user_id: z.string(), flujo_picar: z.enum(["moldes", "producto"]) }).parse(input))
  .handler(async ({ data }) => {
    const pool = await getPool();
    await pool.request()
      .input("id",          sql.NVarChar, data.user_id)
      .input("flujo_picar", sql.NVarChar, data.flujo_picar)
      .query("UPDATE usuarios SET flujo_picar = @flujo_picar, updated_at = GETDATE() WHERE CAST(id AS NVARCHAR(36)) = @id");
    return { ok: true };
  });

export const updateUsuarioRol = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ user_id: z.string(), role: z.string(), add: z.boolean() }).parse(input))
  .handler(async ({ data }) => {
    // En esta tabla el rol es un campo único: al cambiar se reemplaza
    const pool = await getPool();
    await pool.request()
      .input("id",  sql.NVarChar, data.user_id)
      .input("rol", sql.NVarChar, data.role)
      .query("UPDATE usuarios SET rol = @rol, updated_at = GETDATE() WHERE CAST(id AS NVARCHAR(36)) = @id");
    return { ok: true };
  });

export const createUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    email:    z.string().min(1).max(100),
    password: z.string().min(6),
    nombre:   z.string().min(1).max(120),
    puesto:   z.enum(PUESTO_VALUES).nullable(),
    roles:    z.array(z.string()).min(1),
  }).parse(input))
  .handler(async ({ data }) => {
    const pool = await getPool();

    // Verificar que el username no exista ya
    const exists = await pool.request()
      .input("username", sql.NVarChar, data.email.trim())
      .query("SELECT id FROM usuarios WHERE username = @username");
    if (exists.recordset.length > 0) throw new Error("Ya existe un usuario con ese nombre.");

    const hash = await bcrypt.hash(data.password, 12);
    const rol  = data.roles[0] ?? "operario";

    const res = await pool.request()
      .input("username",                sql.NVarChar, data.email.trim())
      .input("password_hash",           sql.NVarChar, hash)
      .input("nombre",                  sql.NVarChar, data.nombre)
      .input("puesto",                  sql.NVarChar, data.puesto)
      .input("rol",                     sql.NVarChar, rol)
      .input("activo",                  sql.Bit,      1)
      .input("puede_ver_moldes",        sql.Bit,      0)
      .input("puede_ver_historial",     sql.Bit,      0)
      .input("puede_crear_incidencias", sql.Bit,      1)
      .input("flujo_picar",             sql.NVarChar, "moldes")
      .query(`
        INSERT INTO usuarios
          (username, password_hash, nombre, puesto, rol, activo,
           puede_ver_moldes, puede_ver_historial, puede_crear_incidencias, flujo_picar)
        OUTPUT CAST(inserted.id AS NVARCHAR(36)) AS id
        VALUES
          (@username, @password_hash, @nombre, @puesto, @rol, @activo,
           @puede_ver_moldes, @puede_ver_historial, @puede_crear_incidencias, @flujo_picar)
      `);

    return { ok: true, user_id: String(res.recordset[0].id) };
  });

export const deleteUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ user_id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    if (data.user_id === context.userId) throw new Error("No puedes eliminar tu propio usuario.");
    const pool = await getPool();

    // Proteger: no borrar si es el único administrador
    const adminCount = await pool.request()
      .query("SELECT COUNT(*) AS n FROM usuarios WHERE rol = 'administrador' AND activo = 1");
    const target = await pool.request()
      .input("id", sql.NVarChar, data.user_id)
      .query("SELECT rol FROM usuarios WHERE CAST(id AS NVARCHAR(36)) = @id");
    if (target.recordset[0]?.rol === "administrador" && adminCount.recordset[0].n <= 1) {
      throw new Error("Debe quedar al menos un administrador en el sistema.");
    }

    await pool.request()
      .input("id", sql.NVarChar, data.user_id)
      .query("DELETE FROM usuarios WHERE CAST(id AS NVARCHAR(36)) = @id");
    return { ok: true };
  });

export const getEstadisticas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const pool = await getPool();
    const usersRes = await pool.request().query("SELECT COUNT(*) AS total FROM usuarios WHERE activo = 1");
    const totalUsuarios: number = usersRes.recordset[0].total;
    const counts: Record<string, number> = {};
    incidencias.forEach((i) => { const k = i.puesto ?? "sin_puesto"; counts[k] = (counts[k] ?? 0) + 1; });
    return {
      totalIncidencias: incidencias.length,
      totalUsuarios,
      reparadas:    reparaciones.filter((r) => r.estado === "reparado").length,
      enReparacion: reparaciones.filter((r) => r.estado === "en_reparacion").length,
      porPuesto: counts,
    };
  });

export const getMoldeEstado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ molde: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const inc = incidencias.filter((i) => i.molde.toLowerCase() === data.molde.trim().toLowerCase()).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    if (!inc) return null;
    const dias = Math.floor((Date.now() - new Date(inc.created_at).getTime()) / 86400000);
    return { ...inc, dias };
  });

export const listMoldesIncidencias = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const byMolde = new Map<string, typeof incidencias[0]>();
    for (const i of [...incidencias].sort((a, b) => b.created_at.localeCompare(a.created_at))) {
      if (i.molde && !byMolde.has(i.molde.toLowerCase())) byMolde.set(i.molde.toLowerCase(), i);
    }
    return Array.from(byMolde.values()).map((i) => ({
      molde: i.molde, estado_molde: i.estado_molde, motivo_corto: i.motivo_corto,
      descripcion: i.descripcion, fecha: i.created_at, nombre_usuario: "Administrador",
      estado_basicos: "ok" as const, estado_delicados: "ok" as const,
    }));
  });

export const getHistorialMolde = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ molde: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const molde = data.molde.trim().toLowerCase();
    const estado = estadosMolde.find((e) => e.numero_molde.toLowerCase() === molde);
    return {
      molde: data.molde,
      incidencias: incidencias.filter((i) => i.molde.toLowerCase() === molde).map((i) => ({ ...i, nombre_usuario: "Administrador" })),
      reparaciones: reparaciones.filter((r) => r.molde.toLowerCase() === molde).map((r) => ({ ...r, nombre_usuario: "Administrador", nombre_repara: null })),
      cambios_estado: [],
      fabricaciones: fabricaciones.filter((f) => f.numero_molde.toLowerCase() === molde),
      estado_basicos: (estado?.estado_basicos ?? "ok") as "ok" | "observacion" | "bloqueado",
      estado_delicados: (estado?.estado_delicados ?? "ok") as "ok" | "observacion" | "bloqueado",
      motivo_basicos: estado?.motivo_basicos ?? null,
      motivo_delicados: estado?.motivo_delicados ?? null,
    };
  });

export const resetUsuarioPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ user_id: z.string(), password: z.string().min(6).max(72) }).parse(input))
  .handler(async ({ data }) => {
    const pool = await getPool();
    const hash = await bcrypt.hash(data.password, 12);
    await pool.request()
      .input("id",   sql.NVarChar, data.user_id)
      .input("hash", sql.NVarChar, hash)
      .query("UPDATE usuarios SET password_hash = @hash, updated_at = GETDATE() WHERE CAST(id AS NVARCHAR(36)) = @id");
    return { ok: true };
  });

export const updateUsuarioActivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ user_id: z.string(), activo: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    if (data.user_id === context.userId && !data.activo) throw new Error("No puedes desactivar tu propio usuario.");
    const pool = await getPool();
    await pool.request()
      .input("id",     sql.NVarChar, data.user_id)
      .input("activo", sql.Bit,      data.activo ? 1 : 0)
      .query("UPDATE usuarios SET activo = @activo, updated_at = GETDATE() WHERE CAST(id AS NVARCHAR(36)) = @id");
    return { ok: true };
  });

export const updateUsuarioPermiso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    user_id: z.string(),
    permiso: z.enum(["puede_ver_moldes", "puede_ver_historial", "puede_crear_incidencias"]),
    value:   z.boolean(),
  }).parse(input))
  .handler(async ({ data }) => {
    const pool = await getPool();
    // El nombre de columna viene validado por el enum, es seguro usarlo directamente
    const col = data.permiso;
    await pool.request()
      .input("id",    sql.NVarChar, data.user_id)
      .input("value", sql.Bit,      data.value ? 1 : 0)
      .query(`UPDATE usuarios SET ${col} = @value, updated_at = GETDATE() WHERE CAST(id AS NVARCHAR(36)) = @id`);
    return { ok: true };
  });

export const seedDemoUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({ results: ["Los usuarios se gestionan directamente en SQL Server."] }));

export const deleteIncidencia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data }) => {
    incidencias.splice(0, incidencias.length, ...incidencias.filter((i) => i.id !== data.id));
    return { ok: true };
  });
