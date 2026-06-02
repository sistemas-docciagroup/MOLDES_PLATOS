import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, PackageOpen, BarChart3, Filter } from "lucide-react";
import { statsIncidenciasProducto, listIncidenciasProducto } from "@/lib/incidencias-producto.functions";
import { RouteGuard } from "@/components/PermissionGate";
import { PUESTOS, puestoLabel } from "@/lib/constants";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/_authenticated/incidencias-producto")({
  validateSearch: (s: Record<string, unknown>) => ({
    puesto: typeof s.puesto === "string" ? (s.puesto as string) : undefined,
  }),
  component: () => (
    <RouteGuard buttonId="btn_incidencias_producto">
      <Page />
    </RouteGuard>
  ),
});

function Page() {
  const { puesto } = Route.useSearch();
  return puesto ? <DetallesPorPuesto puesto={puesto} /> : <Overview />;
}

function Overview() {
  const { user } = useAuth();
  const statsFn = useServerFn(statsIncidenciasProducto);
  const { data: stats, isLoading } = useQuery({
    queryKey: ["incidencias-producto-stats"],
    queryFn: () => statsFn(),
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const total = stats?.total ?? 0;
  const byPuesto = stats?.byPuesto ?? {};

  const ordered = [
    ...PUESTOS.map((p) => ({ value: p.value, label: p.label, count: byPuesto[p.value] ?? 0 })),
    ...Object.keys(byPuesto)
      .filter((k) => !PUESTOS.some((p) => p.value === k))
      .map((k) => ({ value: k, label: puestoLabel(k), count: byPuesto[k] })),
  ];

  return (
    <main className="mx-auto max-w-md px-4 py-4">
      <header className="mb-4 flex items-center gap-3">
        <Link to="/" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold flex-1">Incidencias de producto</h1>
        <PackageOpen className="h-5 w-5 text-primary" />
      </header>

      <section className="mb-4 rounded-2xl border border-border bg-card p-5 text-center shadow-sm">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <BarChart3 className="h-4 w-4" /> Total global
        </div>
        <div className="mt-2 text-5xl font-extrabold tabular-nums text-primary">
          {isLoading ? "…" : total}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          incidencias registradas
        </div>
      </section>

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Por puesto — pulsa para ver detalles
      </h2>
      <ul className="mb-6 space-y-2">
        {ordered.map((row) => (
          <li key={row.value}>
            <Link
              to="/incidencias-producto"
              search={{ puesto: row.value }}
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 active:scale-[0.98] transition-transform"
            >
              <span className="text-sm font-medium">{row.label}</span>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold tabular-nums text-primary">
                {row.count}
              </span>
            </Link>
          </li>
        ))}
        {ordered.length === 0 && (
          <li className="rounded-xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            Sin datos.
          </li>
        )}
      </ul>
    </main>
  );
}

function DetallesPorPuesto({ puesto }: { puesto: string }) {
  const { user } = useAuth();
  const listFn = useServerFn(listIncidenciasProducto);
  const { data: list, isLoading } = useQuery({
    queryKey: ["incidencias-producto", user?.id],
    queryFn: () => listFn(),
    enabled: !!user,
  });

  const filtered = (list ?? []).filter((i) => (i.puesto ?? "sin_puesto") === puesto);

  return (
    <main className="mx-auto max-w-md px-4 py-4">
      <header className="mb-4 flex items-center gap-3">
        <Link
          to="/incidencias-producto"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1">
            <Filter className="h-3 w-3" /> Filtrado por puesto
          </div>
          <h1 className="truncate text-lg font-bold">{puestoLabel(puesto)}</h1>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold tabular-nums text-primary">
          {filtered.length}
        </span>
      </header>

      <ul className="mb-6 space-y-2">
        {isLoading && (
          <li className="rounded-xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            Cargando…
          </li>
        )}
        {!isLoading && filtered.length === 0 && (
          <li className="rounded-xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            Sin incidencias en este puesto.
          </li>
        )}
        {filtered.map((i) => (
          <li key={i.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm font-semibold">{i.motivo_corto ?? "Producto"}</div>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wide text-secondary-foreground">
                Producto
              </span>
            </div>
            <p className="mt-1 text-sm">{i.descripcion}</p>
            {i.foto_url && <img src={i.foto_url} alt="" className="mt-2 h-32 w-full rounded object-cover" />}
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span>
                {new Date(i.created_at).toLocaleString("es-ES", {
                  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                })}
              </span>
              <span>Registrado por: {i.nombre_usuario}</span>
              {i.molde && <span>Molde: {i.molde}</span>}
              {i.pedido && <span>OF: {i.pedido}</span>}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
