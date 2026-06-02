import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { incidenciasProducto, recomendacionesMolde, recomendacionesBloqueo } from "./mock-db";

function id() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

const PUESTO_VALUES = [
  "preparacion_molde", "desmoldeo", "repaso", "valvula", "empaquetado", "reparacion_moldes",
] as const;

export const processAudioProducto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    audioBase64: z.string().min(10),
    mimeType: z.string().default("audio/webm"),
    puesto: z.enum(PUESTO_VALUES).nullable().optional(),
  }).parse(input))
  .handler(async () => ({
    descripcion: "Muestra simulada — conecta un proveedor de IA para activar el procesamiento real.",
    transcripcion: "Audio recibido. Procesamiento de IA no disponible en modo demo.",
    motivo_corto: "Fallo visual",
    molde: null as string | null,
    pedido: null as string | null,
  }));

const fotoSchema = z.object({ foto_url: z.string().url(), foto_nombre: z.string().min(1) }).nullable().optional();

const saveSchema = z.object({
  descripcion: z.string().max(2000).optional().default(""),
  transcripcion: z.string().max(4000).nullable().optional(),
  motivo_corto: z.string().max(120).nullable().optional(),
  molde: z.string().max(120).nullable().optional(),
  pedido: z.string().max(120).nullable().optional(),
  origen: z.enum(["molde", "producto"]).default("producto"),
  defectos: z.array(z.string().min(1).max(80)).max(20).optional().default([]),
  recomendar_bloqueos: z.array(z.enum(["basicos", "delicados"])).max(2).optional().default([]),
  foto: fotoSchema,
});

export const saveIncidenciaProducto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveSchema.parse(input))
  .handler(async ({ data }) => {
    const defectosList = (data.defectos ?? []).map((d) => d.trim()).filter(Boolean);
    const desc = data.descripcion?.trim() || defectosList.join(", ");
    if (!desc) throw new Error("Indica un defecto predefinido o explica la incidencia.");
    const newId = id();
    const now = new Date().toISOString();
    incidenciasProducto.push({
      id: newId, descripcion: desc, transcripcion: data.transcripcion ?? desc,
      motivo_corto: data.motivo_corto ?? (defectosList[0] ?? null),
      molde: data.molde ?? null, pedido: data.pedido ?? null, origen: data.origen,
      defectos: defectosList, user_id: "admin-001", puesto: null, foto_url: data.foto?.foto_url ?? null, created_at: now,
    });
    if (data.origen === "molde" && data.molde?.trim()) {
      recomendacionesMolde.push({
        id: id(), numero_molde: data.molde.trim(), usuario_id: "admin-001",
        usuario_nombre: "Administrador", puesto: null, recomendacion: desc,
        texto_original: data.transcripcion ?? desc, foto_url: data.foto?.foto_url ?? null,
        incidencia_relacionada_id: newId, revisada: false, fecha_hora: now,
      });
      for (const canal of data.recomendar_bloqueos ?? []) {
        recomendacionesBloqueo.push({
          id: id(), numero_molde: data.molde.trim(), canal, motivo: desc,
          usuario_id: "admin-001", usuario_nombre: "Administrador", puesto: null,
          estado: "pendiente", foto_url: data.foto?.foto_url ?? null, transcripcion: data.transcripcion ?? null,
          motivo_revision: null, created_at: now,
        });
      }
    }
    return { id: newId };
  });

export const listIncidenciasProducto = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return [...incidenciasProducto]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((r) => ({ ...r, nombre_usuario: "Administrador" }));
  });

export const statsIncidenciasProducto = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const byPuesto: Record<string, number> = {};
    for (const r of incidenciasProducto) {
      const k = r.puesto ?? "sin_puesto";
      byPuesto[k] = (byPuesto[k] ?? 0) + 1;
    }
    return { total: incidenciasProducto.length, byPuesto };
  });
