import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { defectos } from "./mock-db";

function id() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

export const listarDefectos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => defectos.filter((d) => d.activo).sort((a, b) => a.orden - b.orden));

export const upsertDefecto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    id: z.string().nullable().optional(),
    tipo: z.string().min(1).max(60),
    nombre: z.string().min(1).max(120),
    orden: z.number().int().min(0),
    activo: z.boolean(),
  }).parse(input))
  .handler(async ({ data }) => {
    if (data.id) {
      const idx = defectos.findIndex((d) => d.id === data.id);
      if (idx >= 0) defectos[idx] = { id: data.id, tipo: data.tipo, nombre: data.nombre, orden: data.orden, activo: data.activo };
    } else {
      defectos.push({ id: id(), tipo: data.tipo, nombre: data.nombre, orden: data.orden, activo: data.activo });
    }
    return { ok: true };
  });

export const borrarDefecto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    defectos.splice(0, defectos.length, ...defectos.filter((d) => d.id !== data.id));
    return { ok: true };
  });
