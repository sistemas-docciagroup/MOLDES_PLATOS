import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  moldes, moldeModelos, estadosMolde, reparaciones,
  type Molde, type EstadoMolde,
} from "./mock-db";

function id() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

const moldeSchema = z.object({
  numeroMolde: z.string().min(1).max(120),
  medida: z.string().max(60).nullable().optional(),
  modelos: z.array(z.string().min(1).max(120)).max(50),
  rfid: z.string().max(120).nullable().optional(),
  notas: z.string().max(1000).nullable().optional(),
});

export const listarMoldesGestion = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const modelosByMolde = new Map<string, string[]>();
    for (const r of moldeModelos) {
      const arr = modelosByMolde.get(r.numero_molde) ?? [];
      arr.push(r.modelo);
      modelosByMolde.set(r.numero_molde, arr);
    }
    const estadoByMolde = new Map(estadosMolde.map((e) => [e.numero_molde, e]));
    return moldes.map((m) => ({
      ...m,
      modelos: modelosByMolde.get(m.numero_molde) ?? [],
      estado: estadoByMolde.get(m.numero_molde) ?? null,
    }));
  });

export const crearMolde = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => moldeSchema.parse(input))
  .handler(async ({ data }) => {
    const numero = data.numeroMolde.trim();
    if (moldes.find((m) => m.numero_molde === numero)) throw new Error("Ya existe un molde con ese número.");
    moldes.push({ numero_molde: numero, medida: data.medida ?? null, modelo: data.modelos[0] ?? null, activo: true, notas: data.notas ?? null, codigo_rfid_futuro: data.rfid ?? null, created_at: new Date().toISOString() });
    for (const modelo of data.modelos) moldeModelos.push({ numero_molde: numero, modelo });
    return { ok: true };
  });

export const editarMolde = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => moldeSchema.parse(input))
  .handler(async ({ data }) => {
    const numero = data.numeroMolde.trim();
    const idx = moldes.findIndex((m) => m.numero_molde === numero);
    if (idx < 0) throw new Error("Molde no encontrado.");
    moldes[idx] = { ...moldes[idx], medida: data.medida ?? null, modelo: data.modelos[0] ?? null, notas: data.notas ?? null, codigo_rfid_futuro: data.rfid ?? null };
    const keep = moldeModelos.filter((r) => r.numero_molde !== numero);
    moldeModelos.splice(0, moldeModelos.length, ...keep);
    for (const modelo of data.modelos) moldeModelos.push({ numero_molde: numero, modelo });
    return { ok: true };
  });

export const desactivarMolde = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ numeroMolde: z.string().min(1).max(120), activo: z.boolean() }).parse(input))
  .handler(async ({ data }) => {
    const idx = moldes.findIndex((m) => m.numero_molde === data.numeroMolde.trim());
    if (idx >= 0) moldes[idx].activo = data.activo;
    return { ok: true };
  });

export const borrarMolde = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ numeroMolde: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data }) => {
    const numero = data.numeroMolde.trim();
    const filter = <T extends { numero_molde?: string; molde?: string }>(arr: T[], field: keyof T) =>
      arr.splice(0, arr.length, ...arr.filter((x) => x[field] !== numero));
    filter(moldes as any[], "numero_molde");
    filter(moldeModelos as any[], "numero_molde");
    filter(estadosMolde as any[], "numero_molde");
    return { ok: true };
  });

export const listarMoldesDisponibles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    modelo: z.string().min(1).max(120),
    medida: z.string().max(60).nullable().optional(),
  }).parse(input))
  .handler(async ({ data }) => {
    const numeros = moldeModelos.filter((r) => r.modelo === data.modelo).map((r) => r.numero_molde);
    let candidates = moldes.filter((m) => m.activo && numeros.includes(m.numero_molde));
    if (data.medida) candidates = candidates.filter((m) => m.medida === data.medida);
    if (candidates.length === 0) candidates = moldes.filter((m) => m.activo && numeros.includes(m.numero_molde));
    return enriquecer(candidates);
  });

function enriquecer(maestro: Molde[]) {
  const numeros = maestro.map((m) => m.numero_molde);
  const estadoBy = new Map(estadosMolde.filter((e) => numeros.includes(e.numero_molde)).map((e) => [e.numero_molde, e]));
  const repBy = new Map<string, string>();
  for (const r of reparaciones.filter((r) => numeros.includes(r.molde) && r.estado === "en_reparacion")) {
    if (!repBy.has(r.molde)) repBy.set(r.molde, r.fecha_envio);
  }
  return maestro.map((m) => {
    const estado = estadoBy.get(m.numero_molde) ?? null;
    const fechaRep = repBy.get(m.numero_molde) ?? null;
    const dias = fechaRep ? Math.floor((Date.now() - new Date(fechaRep).getTime()) / 86400000) : null;
    return { ...m, estado, en_reparacion: repBy.has(m.numero_molde), fecha_envio_reparacion: fechaRep, dias_en_reparacion: dias };
  });
}
