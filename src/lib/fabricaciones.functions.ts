import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fabricaciones, historialCambiosOf, incidenciasProducto } from "./mock-db";

function id() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

const PUESTO_VALUES = [
  "preparacion_molde", "desmoldeo", "repaso", "valvula", "empaquetado", "reparacion_moldes",
] as const;

const RESULTADOS = [
  "fabricacion_ok", "fabricacion_con_incidencia", "fabricacion_con_observacion", "enviado_reparacion",
] as const;

export const listarFabricaciones = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    desde: z.string().nullable().optional(),
    hasta: z.string().nullable().optional(),
    molde: z.string().max(120).nullable().optional(),
    usuario: z.string().max(120).nullable().optional(),
    resultado: z.enum(RESULTADOS).nullable().optional(),
    color: z.string().max(60).nullable().optional(),
    puesto: z.enum(PUESTO_VALUES).nullable().optional(),
    limite: z.number().int().min(1).max(500).optional(),
    incluirEliminadas: z.boolean().optional(),
  }).parse(input ?? {}))
  .handler(async ({ data }) => {
    let rows = [...fabricaciones].sort((a, b) => b.fecha_hora.localeCompare(a.fecha_hora));
    if (!data.incluirEliminadas) rows = rows.filter((r) => !r.eliminada);
    if (data.desde) rows = rows.filter((r) => r.fecha_hora >= data.desde!);
    if (data.hasta) rows = rows.filter((r) => r.fecha_hora <= data.hasta!);
    if (data.molde) rows = rows.filter((r) => r.numero_molde.toLowerCase().includes(data.molde!.toLowerCase()));
    if (data.usuario) rows = rows.filter((r) => r.usuario_nombre.toLowerCase().includes(data.usuario!.toLowerCase()));
    if (data.resultado) rows = rows.filter((r) => r.resultado === data.resultado);
    if (data.color) rows = rows.filter((r) => r.color?.toLowerCase().includes(data.color!.toLowerCase()));
    if (data.puesto) rows = rows.filter((r) => r.puesto === data.puesto);
    return rows.slice(0, data.limite ?? 200);
  });

export const eliminarOf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    fabricacionId: z.string(),
    motivo: z.string().max(500).nullable().optional(),
  }).parse(input))
  .handler(async ({ data }) => {
    const idx = fabricaciones.findIndex((f) => f.id === data.fabricacionId);
    if (idx >= 0) {
      fabricaciones[idx].eliminada = true;
      fabricaciones[idx].motivo_eliminacion = data.motivo ?? null;
    }
    return { ok: true };
  });

export const cambiarMoldeFabricacion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    fabricacionId: z.string(),
    nuevoMolde: z.string().min(1).max(120),
    motivo: z.string().min(3).max(500),
  }).parse(input))
  .handler(async ({ data }) => {
    const idx = fabricaciones.findIndex((f) => f.id === data.fabricacionId);
    if (idx < 0) throw new Error("Fabricación no encontrada.");
    const moldeAnterior = fabricaciones[idx].numero_molde;
    const moldeNuevo = data.nuevoMolde.trim();
    if (moldeAnterior === moldeNuevo) throw new Error("El molde nuevo es igual al actual.");
    historialCambiosOf.push({
      id: id(), fabricacion_id: data.fabricacionId, molde_anterior: moldeAnterior, molde_nuevo: moldeNuevo,
      motivo: data.motivo.trim(), usuario_id: "admin-001", usuario_nombre: "Administrador", created_at: new Date().toISOString(),
    });
    fabricaciones[idx].numero_molde = moldeNuevo;
    return { ok: true };
  });

export const historialCambiosFabricacion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ fabricacionId: z.string() }).parse(input))
  .handler(async ({ data }) => {
    return historialCambiosOf.filter((h) => h.fabricacion_id === data.fabricacionId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  });

export const incidenciasDeOf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ numeroOf: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data }) => {
    const numeroOf = data.numeroOf.trim();
    const prod = incidenciasProducto.filter((r) => r.pedido === numeroOf);
    const fabs = fabricaciones.filter(
      (r) => r.numero_of === numeroOf && ["fabricacion_con_incidencia", "fabricacion_con_observacion", "enviado_reparacion"].includes(r.resultado)
    );
    const items = [
      ...prod.map((r) => ({ id: r.id, tipo: "producto" as const, fecha: r.created_at, descripcion: r.descripcion, motivo: r.motivo_corto, molde: r.molde, puesto: r.puesto, usuario_nombre: "Administrador" })),
      ...fabs.map((r) => ({ id: r.id, tipo: r.resultado, fecha: r.fecha_hora, descripcion: r.texto_incidencia ?? r.observacion ?? "", motivo: null as string | null, molde: r.numero_molde, puesto: r.puesto, usuario_nombre: r.usuario_nombre })),
    ].sort((a, b) => b.fecha.localeCompare(a.fecha));
    return { total: items.length, items };
  });
