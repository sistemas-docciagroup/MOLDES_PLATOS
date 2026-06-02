import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { recomendacionesBloqueo, estadosMolde } from "./mock-db";

function id() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

const CANAL = z.enum(["basicos", "delicados", "ambos"]);

function aplicarBloqueoMock(args: { numero_molde: string; canal: "basicos" | "delicados" | "ambos"; motivo: string; userId: string; userName: string }) {
  const now = new Date().toISOString();
  let estado = estadosMolde.find((e) => e.numero_molde === args.numero_molde);
  if (!estado) {
    estado = {
      id: id(), numero_molde: args.numero_molde, estado_actual: "ok", puede_fabricar: true,
      restriccion_color: null, recomendacion_actual: null, incidencia_activa_id: null,
      decidido_por_usuario_id: null, decidido_por_nombre: null, fecha_decision: null,
      estado_basicos: "ok", motivo_basicos: null, fecha_estado_basicos: null, decidido_por_basicos_id: null, decidido_por_basicos_nombre: null,
      estado_delicados: "ok", motivo_delicados: null, fecha_estado_delicados: null, decidido_por_delicados_id: null, decidido_por_delicados_nombre: null,
    };
    estadosMolde.push(estado);
  }
  if (args.canal === "basicos" || args.canal === "ambos") {
    estado.estado_basicos = "bloqueado"; estado.motivo_basicos = args.motivo;
    estado.fecha_estado_basicos = now; estado.decidido_por_basicos_id = args.userId; estado.decidido_por_basicos_nombre = args.userName;
  }
  if (args.canal === "delicados" || args.canal === "ambos") {
    estado.estado_delicados = "bloqueado"; estado.motivo_delicados = args.motivo;
    estado.fecha_estado_delicados = now; estado.decidido_por_delicados_id = args.userId; estado.decidido_por_delicados_nombre = args.userName;
  }
  if (estado.estado_basicos === "bloqueado" && estado.estado_delicados === "bloqueado") {
    estado.puede_fabricar = false; estado.estado_actual = "bloqueado";
  }
}

export const crearRecomendacionBloqueo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    numero_molde: z.string().min(1).max(60),
    canal: CANAL,
    motivo: z.string().max(500).optional().nullable().transform((v) => (v ?? "").trim()),
    foto_url: z.string().url().nullable().optional(),
    transcripcion: z.string().max(5000).nullable().optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    aplicarBloqueoMock({ numero_molde: data.numero_molde, canal: data.canal, motivo: data.motivo, userId: "admin-001", userName: "Administrador" });
    recomendacionesBloqueo.push({
      id: id(), numero_molde: data.numero_molde, canal: data.canal, motivo: data.motivo,
      usuario_id: "admin-001", usuario_nombre: "Administrador", puesto: null,
      estado: "aceptada", foto_url: data.foto_url ?? null, transcripcion: data.transcripcion ?? null,
      motivo_revision: null, created_at: new Date().toISOString(),
    });
    return { aplicado: true };
  });

export const listarRecomendacionesBloqueo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return { items: [...recomendacionesBloqueo].sort((a, b) => b.created_at.localeCompare(a.created_at)), puedeRevisar: true };
  });

export const responderRecomendacionBloqueo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string(),
    accion: z.enum(["aceptar", "rechazar"]),
    motivo_revision: z.string().max(500).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const idx = recomendacionesBloqueo.findIndex((r) => r.id === data.id);
    if (idx < 0) throw new Error("Recomendación no encontrada.");
    if (recomendacionesBloqueo[idx].estado !== "pendiente") throw new Error("Esta recomendación ya está resuelta.");
    const rec = recomendacionesBloqueo[idx];
    if (data.accion === "aceptar") {
      aplicarBloqueoMock({ numero_molde: rec.numero_molde, canal: rec.canal as "basicos" | "delicados" | "ambos", motivo: rec.motivo, userId: "admin-001", userName: "Administrador" });
    }
    recomendacionesBloqueo[idx] = { ...rec, estado: data.accion === "aceptar" ? "aceptada" : "rechazada", motivo_revision: data.motivo_revision ?? null };
    return { ok: true };
  });

export const contarRecomendacionesBloqueoPendientes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return { pendientes: recomendacionesBloqueo.filter((r) => r.estado === "pendiente").length };
  });

export const desbloquearCanal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    numero_molde: z.string().min(1).max(60),
    canal: z.enum(["basicos", "delicados", "ambos"]),
  }).parse(d))
  .handler(async ({ data }) => {
    const now = new Date().toISOString();
    const estado = estadosMolde.find((e) => e.numero_molde === data.numero_molde);
    if (!estado) return { ok: true };
    if (data.canal === "basicos" || data.canal === "ambos") {
      estado.estado_basicos = "ok"; estado.motivo_basicos = null; estado.fecha_estado_basicos = now;
      estado.decidido_por_basicos_id = "admin-001"; estado.decidido_por_basicos_nombre = "Administrador";
    }
    if (data.canal === "delicados" || data.canal === "ambos") {
      estado.estado_delicados = "ok"; estado.motivo_delicados = null; estado.fecha_estado_delicados = now;
      estado.decidido_por_delicados_id = "admin-001"; estado.decidido_por_delicados_nombre = "Administrador";
    }
    if (estado.estado_basicos !== "bloqueado" && estado.estado_delicados !== "bloqueado") {
      estado.puede_fabricar = true; estado.estado_actual = "ok";
    }
    return { ok: true };
  });
