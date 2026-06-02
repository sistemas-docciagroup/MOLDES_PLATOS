import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getAdminPanel } from "@/lib/admin-stats.functions";
import { puestoLabel } from "@/lib/constants";
import { useAuth } from "@/lib/use-auth";

import { RouteGuard } from "@/components/PermissionGate";

export const Route = createFileRoute("/_authenticated/admin/panel")({
  component: () => (
    <RouteGuard buttonId="btn_panel_admin">
      <Page />
    </RouteGuard>
  ),
});

function Page() {
  const { loading: authLoading, isStaff } = useAuth();
  const fetchFn = useServerFn(getAdminPanel);
  const [dias, setDias] = useState<7 | 30 | 90>(30);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-panel", dias],
    queryFn: () => fetchFn({ data: { dias } }),
    enabled: isStaff,
  });

  if (authLoading) {
    return <main className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></main>;
  }
  if (!isStaff) {
    return (
      <main className="mx-auto max-w-md px-4 py-4">
        <header className="mb-4 flex items-center gap-3">
          <Link to="/" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-xl font-bold">Panel</h1>
        </header>
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Solo encargados y administradores.
        </p>
      </main>
    );
  }

  const maxPuesto = Math.max(1, ...Object.values(data?.porPuesto ?? { x: 1 }));
  const maxMolde = Math.max(1, ...(data?.topMoldes ?? []).map((m) => m.count));

  return (
    <main className="mx-auto max-w-md px-4 py-4">
      <header className="mb-4 flex items-center gap-3">
        <Link to="/" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-xl font-bold flex-1">Panel administrador</h1>
      </header>

      <div className="mb-4 flex gap-2">
        {([7, 30, 90] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDias(d)}
            className={`flex-1 rounded-md px-3 py-2 text-xs font-medium border ${dias === d ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card"}`}
          >
            Últimos {d} días
          </button>
        ))}
      </div>

      {isLoading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
      {error && <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Error"}</p>}

      {data && (
        <div className="space-y-4">
          <section className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs uppercase text-muted-foreground">Total incidencias</div>
            <div className="text-3xl font-bold">{data.totalIncidencias}</div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Por puesto</h2>
            {Object.keys(data.porPuesto).length === 0 && <p className="text-xs text-muted-foreground">Sin datos.</p>}
            <ul className="space-y-2">
              {Object.entries(data.porPuesto).sort((a, b) => b[1] - a[1]).map(([p, n]) => (
                <li key={p} className="text-sm">
                  <div className="flex justify-between"><span>{puestoLabel(p)}</span><span className="font-mono">{n}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${(n / maxPuesto) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Por origen</h2>
            <ul className="space-y-1 text-sm">
              <li className="flex justify-between"><span>Con molde identificado</span><span className="font-mono">{data.porOrigen.con_molde}</span></li>
              <li className="flex justify-between"><span>Sin molde (otra incidencia)</span><span className="font-mono">{data.porOrigen.sin_molde}</span></li>
              <li className="flex justify-between"><span>Atribuidas al proceso</span><span className="font-mono">{data.porOrigen.atribuido_proceso}</span></li>
            </ul>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Moldes más problemáticos</h2>
            {data.topMoldes.length === 0 && <p className="text-xs text-muted-foreground">Sin datos.</p>}
            <ul className="space-y-2">
              {data.topMoldes.map((m) => (
                <li key={m.molde} className="text-sm">
                  <div className="flex justify-between">
                    <Link to="/molde/$codigo" params={{ codigo: m.molde }} className="underline-offset-2 hover:underline">{m.molde}</Link>
                    <span className="font-mono">{m.count}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-[color:var(--estado-reparacion)]" style={{ width: `${(m.count / maxMolde) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Reparaciones</h2>
            <ul className="space-y-1 text-sm">
              <li className="flex justify-between"><span>Totales enviadas</span><span className="font-mono">{data.reparaciones.totales}</span></li>
              <li className="flex justify-between"><span>Cerradas como reparado</span><span className="font-mono">{data.reparaciones.cerradas}</span></li>
              <li className="flex justify-between">
                <span>Tiempo medio reparación</span>
                <span className="font-mono">{data.reparaciones.tiempoMedioDias != null ? `${data.reparaciones.tiempoMedioDias} días` : "—"}</span>
              </li>
            </ul>
          </section>
        </div>
      )}
    </main>
  );
}
