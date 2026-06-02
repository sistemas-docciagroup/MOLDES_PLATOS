import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Loader2, Search, ImageIcon, X } from "lucide-react";
import { getHistorialMolde } from "@/lib/incidencias.functions";
import { contadorMolde } from "@/lib/colores.functions";
import { EstadoBadge, type EstadoMolde } from "@/components/EstadoMolde";
import { CanalesBadges } from "@/components/CanalesBadges";
import { puestoLabel } from "@/lib/constants";

import { RouteGuard } from "@/components/PermissionGate";

export const Route = createFileRoute("/_authenticated/molde/$codigo")({
  component: () => (
    <RouteGuard buttonId="btn_buscar_molde">
      <Page />
    </RouteGuard>
  ),
});

type FotoRef = { url: string; alt?: string };

function FotosLazy({ fotos }: { fotos: FotoRef[] }) {
  const [open, setOpen] = useState(false);
  const [viewer, setViewer] = useState<string | null>(null);
  const validas = fotos.filter((f) => !!f.url);
  if (validas.length === 0) return null;

  return (
    <div className="mt-2">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-secondary px-2 text-xs"
        >
          <ImageIcon className="h-3.5 w-3.5" /> Ver fotos ({validas.length})
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {validas.map((f, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setViewer(f.url)}
              className="block h-28 w-full overflow-hidden rounded border border-border"
            >
              <img src={f.url} alt={f.alt ?? ""} loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {viewer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setViewer(null)}
        >
          <button
            type="button"
            onClick={() => setViewer(null)}
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary"
          >
            <X className="h-5 w-5" />
          </button>
          <img src={viewer} alt="" className="max-h-full max-w-full rounded" />
        </div>
      )}
    </div>
  );
}

function Page() {
  const { codigo } = Route.useParams();
  const navigate = useNavigate();

  const fetchFn = useServerFn(getHistorialMolde);
  const contFn = useServerFn(contadorMolde);
  const [search, setSearch] = useState(codigo === "_" ? "" : codigo);

  const buscar = codigo !== "_" ? codigo : "";

  const { data, isLoading } = useQuery({
    queryKey: ["historial-molde", buscar],
    queryFn: () => fetchFn({ data: { molde: buscar } }),
    enabled: !!buscar,
  });
  const { data: contador } = useQuery({
    queryKey: ["contador-molde", buscar],
    queryFn: () => contFn({ data: { numeroMolde: buscar } }),
    enabled: !!buscar,
  });

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate({ to: "/molde/$codigo", params: { codigo: search.trim() } });
  };

  // Cálculo de estado actual + datos extra si está en reparación
  const estadoActual = (() => {
    if (!data) return null;
    const abierta = data.reparaciones.find((r) => r.estado === "en_reparacion");
    if (abierta) {
      const ms = Date.now() - new Date(abierta.fecha_envio).getTime();
      const dias = Math.floor(ms / 86400000);
      return {
        label: "En reparación",
        cls: "bg-[color:var(--estado-reparacion)] text-[color:var(--estado-reparacion-fg)]",
        desde: new Date(abierta.fecha_envio).toLocaleDateString("es-ES"),
        dias,
      };
    }
    const ultIncT = data.incidencias[0] ? new Date(data.incidencias[0].created_at).getTime() : 0;
    const cerradas = data.reparaciones.filter((r) => r.fecha_cierre && (r.estado === "reparado" || r.estado === "descartado"));
    const ultCierreT = cerradas[0]?.fecha_cierre ? new Date(cerradas[0].fecha_cierre).getTime() : 0;
    if (ultIncT && ultIncT > ultCierreT) {
      const est = data.incidencias[0].estado_molde as EstadoMolde;
      if (est === "observacion") return { label: "Observación", cls: "bg-[color:var(--estado-observacion)] text-[color:var(--estado-observacion-fg)]" };
      return { label: "Seguir producción", cls: "bg-[color:var(--estado-seguir)] text-[color:var(--estado-seguir-fg)]" };
    }
    if (ultCierreT) return { label: "OK", cls: "bg-emerald-500 text-white" };
    return { label: "Sin registros", cls: "bg-secondary text-secondary-foreground" };
  })();

  const [tab, setTab] = useState<"incidencias" | "reparaciones">("incidencias");

  return (
    <main className="mx-auto max-w-md px-4 py-4">
      <header className="mb-4 flex items-center gap-3">
        <Link to="/" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Buscar molde / historial incidencias</h1>
      </header>

      <form onSubmit={onSearch} className="mb-4 flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Número de molde"
          className="h-12 flex-1 rounded-md border border-input bg-background px-3 text-base"
          autoFocus={codigo === "_"}
        />
        <button type="submit" className="inline-flex h-12 items-center gap-1 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
          <Search className="h-4 w-4" /> Buscar
        </button>
      </form>

      {!buscar && <p className="py-10 text-center text-sm text-muted-foreground">Introduce un número de molde para ver su historial.</p>}
      {isLoading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}

      {data && estadoActual && (
        <>
          <div className={`mb-3 rounded-xl px-4 py-3 ${estadoActual.cls}`}>
            <div className="text-xs uppercase tracking-wide opacity-80">Estado actual · Molde {data.molde}</div>
            <div className="text-lg font-bold">{estadoActual.label}</div>
            {"desde" in estadoActual && estadoActual.desde && (
              <div className="mt-1 text-xs opacity-90">
                En reparación desde: <b>{estadoActual.desde}</b> · Días en reparación: <b>{estadoActual.dias}</b>
              </div>
            )}
            <div className="mt-2">
              <CanalesBadges basicos={data.estado_basicos} delicados={data.estado_delicados} />
            </div>
            {(data.motivo_basicos || data.motivo_delicados) && (
              <div className="mt-1 space-y-0.5 text-[11px] opacity-90">
                {data.motivo_basicos && <div>Básicos: {data.motivo_basicos}</div>}
                {data.motivo_delicados && <div>Delicados: {data.motivo_delicados}</div>}
              </div>
            )}
          </div>

          {contador && (
            <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-3 text-xs">
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">Desde última reparación</div>
                <div className="text-lg font-bold tabular-nums">{contador.piezas_desde_ultima_reparacion}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">Piezas totales</div>
                <div className="text-lg font-bold tabular-nums">{contador.piezas_totales}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">Nº reparaciones</div>
                <div className="text-sm font-semibold tabular-nums">{contador.total_reparaciones}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">Última reparación</div>
                <div className="text-sm font-semibold">{contador.fecha_ultima_reparacion ? new Date(contador.fecha_ultima_reparacion).toLocaleDateString("es-ES") : "—"}</div>
              </div>
            </div>
          )}

          <div className="mb-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTab("incidencias")}
              className={`h-11 rounded-md border text-sm font-medium ${tab === "incidencias" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary"}`}
            >
              Incidencias ({data.incidencias.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("reparaciones")}
              className={`h-11 rounded-md border text-sm font-medium ${tab === "reparaciones" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary"}`}
            >
              Reparaciones ({data.reparaciones.length})
            </button>
          </div>

          {tab === "incidencias" && (
            <section className="max-h-[60vh] overflow-y-auto rounded-xl border border-border bg-background/40 p-2">
              {data.incidencias.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Sin incidencias registradas.</p>
              ) : (
                <ul className="space-y-2">
                  {data.incidencias.map((i) => (
                    <li key={i.id} className="rounded-xl border border-border bg-card p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-semibold">{i.motivo_corto ?? "Incidencia"}</div>
                        <EstadoBadge estado={i.estado_molde as EstadoMolde} />
                      </div>
                      {i.tipo_fallo && (
                        <div className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                          Tipo: <span className="text-foreground">{i.tipo_fallo}</span>
                        </div>
                      )}
                      <p className="mt-1 text-sm">{i.descripcion}</p>
                      <FotosLazy fotos={[{ url: i.foto_url ?? "" }]} />
                      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span>{new Date(i.created_at).toLocaleString("es-ES", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                        <span>Puesto: {puestoLabel(i.puesto)}</span>
                        <span className="col-span-2">Usuario: {i.nombre_usuario}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {tab === "reparaciones" && (
            <section className="max-h-[60vh] overflow-y-auto rounded-xl border border-border bg-background/40 p-2">
              {data.reparaciones.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Sin reparaciones registradas.</p>
              ) : (
                <ul className="space-y-2">
                  {data.reparaciones.map((r) => {
                    const dias = r.fecha_cierre
                      ? Math.floor((new Date(r.fecha_cierre).getTime() - new Date(r.fecha_envio).getTime()) / 86400000)
                      : Math.floor((Date.now() - new Date(r.fecha_envio).getTime()) / 86400000);
                    const fotos: FotoRef[] = [];
                    if (r.foto_url) fotos.push({ url: r.foto_url });
                    const r2 = (r as { foto_url_2?: string | null }).foto_url_2;
                    if (r2) fotos.push({ url: r2 });
                    return (
                      <li key={r.id} className="rounded-xl border border-border bg-card p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm font-semibold">{r.motivo_corto ?? "Reparación"}</div>
                          <span className="rounded-full border px-2 py-0.5 text-xs">{r.estado}</span>
                        </div>
                        <p className="mt-1 text-sm">{r.descripcion}</p>
                        {r.descripcion_reparacion && (
                          <p className="mt-1 rounded bg-emerald-500/10 p-2 text-sm text-emerald-300">{r.descripcion_reparacion}</p>
                        )}
                        <FotosLazy fotos={fotos} />
                        {r.numero_of && (
                          <div className="mt-1 text-xs text-muted-foreground">OF relacionada: {r.numero_of}</div>
                        )}
                        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          <span>Fecha: {new Date(r.fecha_envio).toLocaleDateString("es-ES")}</span>
                          {r.fecha_cierre && <span>Fin: {new Date(r.fecha_cierre).toLocaleDateString("es-ES")}</span>}
                          <span>Días: {dias}</span>
                          <span>Usuario: {r.nombre_usuario}</span>
                          {r.nombre_repara && <span className="col-span-2">Reparó: {r.nombre_repara}</span>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
