import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { incidencias, reparaciones } from "./mock-db";

export const getAdminPanel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ dias: z.number().int().min(1).max(365).default(30) }).parse(input))
  .handler(async ({ data }) => {
    const desde = new Date(Date.now() - data.dias * 86400000).toISOString();
    const incs = incidencias.filter((i) => i.created_at >= desde);
    const reps = reparaciones.filter((r) => r.fecha_envio >= desde);

    const porPuesto: Record<string, number> = {};
    const porOrigen = { con_molde: 0, sin_molde: 0, atribuido_proceso: 0 };
    const porMolde: Record<string, number> = {};

    for (const i of incs) {
      const p = i.puesto ?? "sin_puesto";
      porPuesto[p] = (porPuesto[p] ?? 0) + 1;
      const m = (i.molde ?? "").trim();
      if (m) { porOrigen.con_molde += 1; porMolde[m] = (porMolde[m] ?? 0) + 1; }
      else porOrigen.sin_molde += 1;
      if (i.tipo_fallo === "proceso") porOrigen.atribuido_proceso += 1;
    }

    const topMoldes = Object.entries(porMolde).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([molde, count]) => ({ molde, count }));
    const cerradas = reps.filter((r) => r.fecha_reparacion && r.estado === "reparado");
    const tiempos = cerradas.map((r) => (new Date(r.fecha_reparacion!).getTime() - new Date(r.fecha_envio).getTime()) / 86400000);
    const tiempoMedioDias = tiempos.length ? Math.round((tiempos.reduce((a, b) => a + b, 0) / tiempos.length) * 10) / 10 : null;

    return {
      dias: data.dias,
      totalIncidencias: incs.length,
      porPuesto,
      porOrigen,
      topMoldes,
      reparaciones: { totales: reps.length, cerradas: cerradas.length, tiempoMedioDias },
    };
  });
