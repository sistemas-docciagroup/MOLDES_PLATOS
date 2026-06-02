import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveDemoOf } from "./of-demo";
import {
  moldes, estadosMolde, reparaciones, recomendacionesMolde,
  incidencias, fabricaciones, picadasOf, alertasVistas, ofMoldesAsignados, colores,
} from "./mock-db";

function id() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

const PUESTO_VALUES = ["preparacion_molde", "desmoldeo", "repaso", "valvula", "empaquetado", "reparacion_moldes"] as const;
const ESTADO_OFICIAL_VALUES = ["ok", "seguir_produccion", "observacion", "mandar_reparacion", "en_reparacion", "reparado", "descartado"] as const;
const PICADA_RESULTADO_VALUES = ["fabricacion_autorizada", "fabricacion_con_aviso", "fabricacion_bloqueada", "incidencia_registrada", "recomendacion_registrada", "enviado_reparacion"] as const;
const FABRICACION_RESULTADO_VALUES = ["fabricacion_ok", "fabricacion_con_incidencia", "fabricacion_con_observacion", "enviado_reparacion"] as const;

export const buscarOf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ numeroOf: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data }) => {
    const demo = resolveDemoOf(data.numeroOf);
    return { ...demo, esDemo: true, mensajeDemo: "Datos demo porque todavía no existe conexión SQL Server." };
  });

export const consultarMolde = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ numeroMolde: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data }) => {
    const numero = data.numeroMolde.trim();
    const maestro = moldes.find((m) => m.numero_molde === numero) ?? null;
    const estado = estadosMolde.find((e) => e.numero_molde === numero) ?? null;
    const recomendaciones = recomendacionesMolde.filter((r) => r.numero_molde === numero && !r.revisada).sort((a, b) => b.fecha_hora.localeCompare(a.fecha_hora));
    const incidenciaActiva = incidencias.filter((i) => i.molde === numero).sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
    return { maestro, estado, recomendaciones, incidenciaActiva, existeEnCatalogo: !!maestro };
  });

export const registrarPicadaOf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    numeroOf: z.string().min(1).max(120),
    modelo: z.string().max(120).nullable().optional(),
    medida: z.string().max(60).nullable().optional(),
    color: z.string().max(60).nullable().optional(),
    numeroMolde: z.string().min(1).max(120),
    resultado: z.enum(PICADA_RESULTADO_VALUES),
    incidenciaId: z.string().nullable().optional(),
    recomendacionId: z.string().nullable().optional(),
  }).parse(input))
  .handler(async ({ data }) => {
    const estado = estadosMolde.find((e) => e.numero_molde === data.numeroMolde.trim());
    const row = {
      id: id(), numero_of: data.numeroOf.trim(), modelo: data.modelo ?? null, medida: data.medida ?? null,
      color: data.color ?? null, numero_molde: data.numeroMolde.trim(), usuario_id: "admin-001",
      usuario_nombre: "Administrador", puesto: null, resultado: data.resultado,
      incidencia_id: data.incidenciaId ?? null, recomendacion_id: data.recomendacionId ?? null,
      estado_molde_en_momento: estado?.estado_actual ?? null, puede_fabricar: estado?.puede_fabricar ?? true,
      tenia_incidencia_activa: !!estado?.incidencia_activa_id, fecha_hora: new Date().toISOString(),
    };
    picadasOf.push(row);
    return row;
  });

export const crearRecomendacion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    numeroMolde: z.string().min(1).max(120),
    recomendacion: z.string().min(1).max(500),
    textoOriginal: z.string().max(2000).nullable().optional(),
    fotoUrl: z.string().url().nullable().optional(),
    incidenciaRelacionadaId: z.string().nullable().optional(),
  }).parse(input))
  .handler(async ({ data }) => {
    const row = {
      id: id(), numero_molde: data.numeroMolde.trim(), usuario_id: "admin-001",
      usuario_nombre: "Administrador", puesto: null, recomendacion: data.recomendacion,
      texto_original: data.textoOriginal ?? null, foto_url: data.fotoUrl ?? null,
      incidencia_relacionada_id: data.incidenciaRelacionadaId ?? null, revisada: false, fecha_hora: new Date().toISOString(),
    };
    recomendacionesMolde.push(row);
    return row;
  });

export const actualizarEstadoOficial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    numeroMolde: z.string().min(1).max(120),
    estadoActual: z.enum(ESTADO_OFICIAL_VALUES),
    puedeFabricar: z.boolean(),
    restriccionColor: z.string().max(200).nullable().optional(),
    recomendacionActual: z.string().max(500).nullable().optional(),
    incidenciaActivaId: z.string().nullable().optional(),
  }).parse(input))
  .handler(async ({ data }) => {
    const numero = data.numeroMolde.trim();
    const now = new Date().toISOString();
    let estado = estadosMolde.find((e) => e.numero_molde === numero);
    if (estado) {
      Object.assign(estado, { estado_actual: data.estadoActual, puede_fabricar: data.puedeFabricar, restriccion_color: data.restriccionColor ?? null, recomendacion_actual: data.recomendacionActual ?? null, incidencia_activa_id: data.incidenciaActivaId ?? null, decidido_por_usuario_id: "admin-001", decidido_por_nombre: "Administrador", fecha_decision: now });
    } else {
      estado = { id: id(), numero_molde: numero, estado_actual: data.estadoActual, puede_fabricar: data.puedeFabricar, restriccion_color: data.restriccionColor ?? null, recomendacion_actual: data.recomendacionActual ?? null, incidencia_activa_id: data.incidenciaActivaId ?? null, decidido_por_usuario_id: "admin-001", decidido_por_nombre: "Administrador", fecha_decision: now, estado_basicos: "ok", motivo_basicos: null, fecha_estado_basicos: null, decidido_por_basicos_id: null, decidido_por_basicos_nombre: null, estado_delicados: "ok", motivo_delicados: null, fecha_estado_delicados: null, decidido_por_delicados_id: null, decidido_por_delicados_nombre: null };
      estadosMolde.push(estado);
    }
    return estado;
  });

export const historialMolde = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ numeroMolde: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data }) => {
    const numero = data.numeroMolde.trim();
    return {
      estado: estadosMolde.find((e) => e.numero_molde === numero) ?? null,
      incidencias: incidencias.filter((i) => i.molde === numero).sort((a, b) => b.created_at.localeCompare(a.created_at)),
      recomendaciones: recomendacionesMolde.filter((r) => r.numero_molde === numero).sort((a, b) => b.fecha_hora.localeCompare(a.fecha_hora)),
      picadas: picadasOf.filter((p) => p.numero_molde === numero).sort((a, b) => b.fecha_hora.localeCompare(a.fecha_hora)),
      reparaciones: reparaciones.filter((r) => r.molde === numero).sort((a, b) => b.fecha_envio.localeCompare(a.fecha_envio)),
    };
  });

export const registrarFabricacion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    numeroOf: z.string().min(1).max(120),
    modelo: z.string().max(120).nullable().optional(),
    medida: z.string().max(60).nullable().optional(),
    color: z.string().max(60).nullable().optional(),
    numeroMolde: z.string().min(1).max(120),
    resultado: z.enum(FABRICACION_RESULTADO_VALUES),
    textoIncidencia: z.string().max(2000).nullable().optional(),
    observacion: z.string().max(2000).nullable().optional(),
    incidenciaId: z.string().nullable().optional(),
    reparacionId: z.string().nullable().optional(),
  }).parse(input))
  .handler(async ({ data }) => {
    const row = {
      id: id(), numero_of: data.numeroOf.trim(), modelo: data.modelo ?? null, medida: data.medida ?? null,
      color: data.color ?? null, numero_molde: data.numeroMolde.trim(), usuario_id: "admin-001",
      usuario_nombre: "Administrador", puesto: null, resultado: data.resultado,
      texto_incidencia: data.textoIncidencia ?? null, observacion: data.observacion ?? null,
      incidencia_id: data.incidenciaId ?? null, reparacion_id: data.reparacionId ?? null,
      fecha_hora: new Date().toISOString(), eliminada: false, motivo_eliminacion: null,
    };
    fabricaciones.push(row);
    return row;
  });

export const mandarReparacionRapida = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    numeroMolde: z.string().min(1).max(120),
    motivo: z.string().min(1).max(500),
    transcripcion: z.string().max(5000).nullable().optional(),
    fotoUrl1: z.string().url().nullable().optional(),
    fotoNombre1: z.string().max(255).nullable().optional(),
    fotoUrl2: z.string().url().nullable().optional(),
    fotoNombre2: z.string().max(255).nullable().optional(),
    numeroOf: z.string().max(120).nullable().optional(),
  }).parse(input))
  .handler(async ({ data }) => {
    const now = new Date().toISOString();
    const numero = data.numeroMolde.trim();
    const row = {
      id: id(), molde: numero, descripcion: data.motivo, transcripcion: data.transcripcion ?? null,
      motivo_corto: data.motivo.slice(0, 100), user_id: "admin-001", puesto: "preparacion_molde",
      estado: "en_reparacion", foto_url: data.fotoUrl1 ?? null, foto_nombre: data.fotoNombre1 ?? null,
      foto_url_2: data.fotoUrl2 ?? null, foto_nombre_2: data.fotoNombre2 ?? null,
      numero_of: data.numeroOf ?? null, descripcion_reparacion: null, fecha_envio: now, fecha_reparacion: null,
    };
    reparaciones.push(row);
    let estado = estadosMolde.find((e) => e.numero_molde === numero);
    if (!estado) { estado = { id: id(), numero_molde: numero, estado_actual: "en_reparacion", puede_fabricar: false, restriccion_color: null, recomendacion_actual: null, incidencia_activa_id: null, decidido_por_usuario_id: "admin-001", decidido_por_nombre: "Administrador", fecha_decision: now, estado_basicos: "bloqueado", motivo_basicos: "Molde en reparación", fecha_estado_basicos: now, decidido_por_basicos_id: "admin-001", decidido_por_basicos_nombre: "Administrador", estado_delicados: "bloqueado", motivo_delicados: "Molde en reparación", fecha_estado_delicados: now, decidido_por_delicados_id: "admin-001", decidido_por_delicados_nombre: "Administrador" }; estadosMolde.push(estado); }
    else { Object.assign(estado, { estado_actual: "en_reparacion", puede_fabricar: false, estado_basicos: "bloqueado", motivo_basicos: "Molde en reparación", fecha_estado_basicos: now, decidido_por_basicos_id: "admin-001", decidido_por_basicos_nombre: "Administrador", estado_delicados: "bloqueado", motivo_delicados: "Molde en reparación", fecha_estado_delicados: now, decidido_por_delicados_id: "admin-001", decidido_por_delicados_nombre: "Administrador" }); }
    return row;
  });

export const evaluarFabricacion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ numeroMolde: z.string().min(1).max(120), color: z.string().max(60).nullable().optional() }).parse(input))
  .handler(async ({ data }) => {
    const numero = data.numeroMolde.trim();
    const color = (data.color ?? "").trim();
    let canal: "basicos" | "delicados" = "delicados";
    let colorEncontrado = false;
    if (color) {
      const cf = colores.find((c) => c.color.toLowerCase() === color.toLowerCase() && c.activo);
      if (cf) { colorEncontrado = true; canal = cf.tipo_color === "basico" ? "basicos" : "delicados"; }
    }
    const estado = estadosMolde.find((e) => e.numero_molde === numero) ?? null;
    const enReparacion = reparaciones.some((r) => r.molde === numero && r.estado === "en_reparacion");
    type EC = "ok" | "observacion" | "bloqueado";
    let estadoCanal: EC = "ok";
    let motivo: string | null = null;
    let decididoPor: string | null = null;
    let fecha: string | null = null;
    if (estado) {
      if (canal === "basicos") { estadoCanal = estado.estado_basicos as EC; motivo = estado.motivo_basicos; decididoPor = estado.decidido_por_basicos_nombre; fecha = estado.fecha_estado_basicos; }
      else { estadoCanal = estado.estado_delicados as EC; motivo = estado.motivo_delicados; decididoPor = estado.decidido_por_delicados_nombre; fecha = estado.fecha_estado_delicados; }
    }
    const estadoCanalEfectivo: EC = enReparacion ? "bloqueado" : estadoCanal;
    if (enReparacion) motivo = motivo ?? "Molde en reparación";
    return {
      canal, colorEncontrado, estadoCanal, puedeFabricar: estadoCanalEfectivo !== "bloqueado",
      requiereObservacion: estadoCanalEfectivo === "observacion", motivo, decididoPor, fecha, enReparacion,
      estadoBasicos: (estado?.estado_basicos ?? "ok") as EC, estadoDelicados: (estado?.estado_delicados ?? "ok") as EC,
    };
  });

export const actualizarEstadoCanal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    numeroMolde: z.string().min(1).max(120),
    canal: z.enum(["basicos", "delicados"]),
    estado: z.enum(["ok", "observacion", "bloqueado"]),
    motivo: z.string().max(500).nullable().optional(),
  }).parse(input))
  .handler(async ({ data }) => {
    const numero = data.numeroMolde.trim();
    const now = new Date().toISOString();
    let estado = estadosMolde.find((e) => e.numero_molde === numero);
    if (!estado) { estado = { id: id(), numero_molde: numero, estado_actual: "ok", puede_fabricar: true, restriccion_color: null, recomendacion_actual: null, incidencia_activa_id: null, decidido_por_usuario_id: null, decidido_por_nombre: null, fecha_decision: null, estado_basicos: "ok", motivo_basicos: null, fecha_estado_basicos: null, decidido_por_basicos_id: null, decidido_por_basicos_nombre: null, estado_delicados: "ok", motivo_delicados: null, fecha_estado_delicados: null, decidido_por_delicados_id: null, decidido_por_delicados_nombre: null }; estadosMolde.push(estado); }
    if (data.canal === "basicos") { estado.estado_basicos = data.estado; estado.motivo_basicos = data.motivo ?? null; estado.fecha_estado_basicos = now; estado.decidido_por_basicos_id = "admin-001"; estado.decidido_por_basicos_nombre = "Administrador"; }
    else { estado.estado_delicados = data.estado; estado.motivo_delicados = data.motivo ?? null; estado.fecha_estado_delicados = now; estado.decidido_por_delicados_id = "admin-001"; estado.decidido_por_delicados_nombre = "Administrador"; }
    return { ok: true };
  });

export const obtenerMoldeDeOf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ numeroOf: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data }) => ofMoldesAsignados.find((r) => r.numero_of === data.numeroOf.trim()) ?? null);

export const asignarMoldeAOf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    numeroOf: z.string().min(1).max(120), numeroMolde: z.string().min(1).max(120),
    modelo: z.string().max(120).nullable().optional(), medida: z.string().max(60).nullable().optional(),
    color: z.string().max(60).nullable().optional(),
  }).parse(input))
  .handler(async ({ data }) => {
    const numeroOf = data.numeroOf.trim();
    const idx = ofMoldesAsignados.findIndex((r) => r.numero_of === numeroOf);
    const payload = { numero_of: numeroOf, numero_molde: data.numeroMolde.trim(), modelo: data.modelo ?? null, medida: data.medida ?? null, color: data.color ?? null, asignado_por_id: "admin-001", asignado_por_nombre: "Administrador", puesto: null, created_at: new Date().toISOString() };
    if (idx >= 0) ofMoldesAsignados[idx] = payload; else ofMoldesAsignados.push(payload);
    return { ok: true };
  });

export const alertasPendientesMolde = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ numeroMolde: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data }) => {
    const numero = data.numeroMolde.trim();
    const vistasSet = new Set(alertasVistas.filter((v) => v.numero_molde === numero).map((v) => `${v.tipo}:${v.referencia_id}`));
    type Alerta = { tipo: string; severidad: "observacion" | "bloqueo"; id: string; titulo: string; detalle: string; autor: string | null; fecha: string | null; fotoUrl: string | null };
    const alertas: Alerta[] = [];
    for (const r of recomendacionesMolde.filter((r) => r.numero_molde === numero && !r.revisada)) {
      if (vistasSet.has(`recomendacion_molde:${r.id}`)) continue;
      alertas.push({ tipo: "recomendacion_molde", severidad: "observacion", id: r.id, titulo: "Recomendación del molde", detalle: r.recomendacion, autor: r.usuario_nombre, fecha: r.fecha_hora, fotoUrl: r.foto_url ?? null });
    }
    const estado = estadosMolde.find((e) => e.numero_molde === numero);
    if (estado) {
      if (estado.estado_basicos !== "ok" && estado.decidido_por_basicos_id !== "admin-001") {
        const refId = `basicos:${estado.fecha_estado_basicos ?? ""}`;
        if (!vistasSet.has(`estado_canal:${refId}`)) alertas.push({ tipo: "estado_canal", severidad: estado.estado_basicos === "bloqueado" ? "bloqueo" : "observacion", id: refId, titulo: `Canal básicos: ${estado.estado_basicos}`, detalle: estado.motivo_basicos ?? "Sin motivo", autor: estado.decidido_por_basicos_nombre, fecha: estado.fecha_estado_basicos, fotoUrl: null });
      }
      if (estado.estado_delicados !== "ok" && estado.decidido_por_delicados_id !== "admin-001") {
        const refId = `delicados:${estado.fecha_estado_delicados ?? ""}`;
        if (!vistasSet.has(`estado_canal:${refId}`)) alertas.push({ tipo: "estado_canal", severidad: estado.estado_delicados === "bloqueado" ? "bloqueo" : "observacion", id: refId, titulo: `Canal delicados: ${estado.estado_delicados}`, detalle: estado.motivo_delicados ?? "Sin motivo", autor: estado.decidido_por_delicados_nombre, fecha: estado.fecha_estado_delicados, fotoUrl: null });
      }
    }
    return { alertas };
  });

export const marcarAlertaVista = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    tipo: z.enum(["recomendacion_molde", "recomendacion_bloqueo", "estado_canal"]),
    referenciaId: z.string().min(1).max(200),
    numeroMolde: z.string().min(1).max(120),
  }).parse(input))
  .handler(async ({ data }) => {
    const key = `${data.tipo}:${data.referenciaId}`;
    const exists = alertasVistas.some((v) => v.user_id === "admin-001" && v.numero_molde === data.numeroMolde && `${v.tipo}:${v.referencia_id}` === key);
    if (!exists) alertasVistas.push({ id: id(), user_id: "admin-001", tipo: data.tipo, referencia_id: data.referenciaId, numero_molde: data.numeroMolde, created_at: new Date().toISOString() });
    return { ok: true };
  });
