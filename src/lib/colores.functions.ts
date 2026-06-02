import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { colores } from "./mock-db";

function id() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

export const listarColores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => [...colores]);

export const clasificarColor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ color: z.string().max(60) }).parse(input))
  .handler(async ({ data }) => {
    const found = colores.find((c) => c.color.toLowerCase() === data.color.toLowerCase() && c.activo);
    if (!found) return null;
    return { tipo_color: found.tipo_color, permite_molde_con_incidencia: found.permite_molde_con_incidencia };
  });

export const upsertColor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    id: z.string().nullable().optional(),
    color: z.string().min(1).max(60),
    tipo_color: z.enum(["basico", "delicado"]),
    permite_molde_con_incidencia: z.boolean(),
    activo: z.boolean(),
  }).parse(input))
  .handler(async ({ data }) => {
    if (data.id) {
      const idx = colores.findIndex((c) => c.id === data.id);
      if (idx >= 0) colores[idx] = { ...colores[idx], color: data.color, tipo_color: data.tipo_color, permite_molde_con_incidencia: data.permite_molde_con_incidencia, activo: data.activo };
    } else {
      colores.push({ id: id(), color: data.color, tipo_color: data.tipo_color, permite_molde_con_incidencia: data.permite_molde_con_incidencia, activo: data.activo });
    }
    return { ok: true };
  });

export const borrarColor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    colores.splice(0, colores.length, ...colores.filter((c) => c.id !== data.id));
    return { ok: true };
  });

export const contadorMolde = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ numeroMolde: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data }) => {
    return { numero_molde: data.numeroMolde, total_piezas: 0 };
  });
