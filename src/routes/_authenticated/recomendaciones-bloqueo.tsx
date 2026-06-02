import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, X, Loader2, Inbox, Filter, Eye } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listarRecomendacionesBloqueo, responderRecomendacionBloqueo } from "@/lib/recomendaciones-bloqueo.functions";

export const Route = createFileRoute("/_authenticated/recomendaciones-bloqueo")({ component: Page });

type Rec = {
  id: string;
  numero_molde: string;
  canal: "basicos" | "delicados" | "ambos";
  motivo: string;
  usuario_nombre: string;
  puesto: string | null;
  estado: "pendiente" | "aceptada" | "rechazada";
  revisada_por_nombre: string | null;
  fecha_revision: string | null;
  created_at: string;
  foto_url: string | null;
};

function Page() {
  const listFn = useServerFn(listarRecomendacionesBloqueo);
  const respFn = useServerFn(responderRecomendacionBloqueo);
  const [tab, setTab] = useState<"pendiente" | "resueltas">("pendiente");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fotosAbiertas, setFotosAbiertas] = useState<Record<string, boolean>>({});

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["recomendaciones-bloqueo"],
    queryFn: () => listFn(),
    refetchInterval: 15_000,
  });

  const responder = async (id: string, accion: "aceptar" | "rechazar") => {
    setError(null); setBusyId(id);
    try {
      await respFn({ data: { id, accion } });
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al responder.");
    } finally { setBusyId(null); }
  };

  const items = (data?.items ?? []) as Rec[];
  const puedeRevisar = data?.puedeRevisar ?? false;

  // Filtros para la pestaña "Resueltas"
  const [filtroEstado, setFiltroEstado] = useState<"todas" | "aceptada" | "rechazada">("todas");
  const [filtroCanal, setFiltroCanal] = useState<"todos" | "basicos" | "delicados" | "ambos">("todos");
  const [filtroMolde, setFiltroMolde] = useState("");
  const [filtroRevisor, setFiltroRevisor] = useState("");
  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");

  const resueltas = useMemo(() => items.filter((i) => i.estado !== "pendiente"), [items]);

  const visibles = useMemo(() => {
    if (tab === "pendiente") return items.filter((r) => r.estado === "pendiente");
    return resueltas.filter((r) => {
      if (filtroEstado !== "todas" && r.estado !== filtroEstado) return false;
      if (filtroCanal !== "todos" && r.canal !== filtroCanal) return false;
      if (filtroMolde && !r.numero_molde.toLowerCase().includes(filtroMolde.toLowerCase())) return false;
      if (filtroRevisor && !(r.revisada_por_nombre ?? "").toLowerCase().includes(filtroRevisor.toLowerCase())) return false;
      const fecha = r.fecha_revision ? new Date(r.fecha_revision) : null;
      if (filtroDesde) {
        const d = new Date(filtroDesde);
        if (!fecha || fecha < d) return false;
      }
      if (filtroHasta) {
        const h = new Date(filtroHasta); h.setHours(23, 59, 59, 999);
        if (!fecha || fecha > h) return false;
      }
      return true;
    });
  }, [items, resueltas, tab, filtroEstado, filtroCanal, filtroMolde, filtroRevisor, filtroDesde, filtroHasta]);

  const limpiarFiltros = () => {
    setFiltroEstado("todas"); setFiltroCanal("todos");
    setFiltroMolde(""); setFiltroRevisor(""); setFiltroDesde(""); setFiltroHasta("");
  };

  const canalLabel = (c: Rec["canal"]) => c === "basicos" ? "Básicos" : c === "delicados" ? "Delicados" : "Ambos";

  return (
    <main className="mx-auto max-w-md px-4 py-4">
      <header className="mb-4 flex items-center gap-3">
        <Link to="/" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="flex-1 text-xl font-bold">Recomendaciones de bloqueo</h1>
        <Inbox className="h-5 w-5 text-primary" />
      </header>

      <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-1">
        {(["pendiente", "resueltas"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`h-9 rounded-md text-sm font-semibold capitalize ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {t === "pendiente" ? `Pendientes (${items.filter(i => i.estado === "pendiente").length})` : `Resueltas (${resueltas.length})`}
          </button>
        ))}
      </div>

      {tab === "resueltas" && (
        <div className="mb-3 rounded-xl border border-border bg-card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Filter className="h-3.5 w-3.5" /> Filtros
            </div>
            <button onClick={limpiarFiltros} className="text-[11px] font-semibold text-primary underline-offset-2 hover:underline">
              Limpiar
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as typeof filtroEstado)}
              className="h-9 rounded-md border border-border bg-background px-2 text-xs">
              <option value="todas">Estado: Todas</option>
              <option value="aceptada">Aceptadas</option>
              <option value="rechazada">Rechazadas</option>
            </select>
            <select value={filtroCanal} onChange={(e) => setFiltroCanal(e.target.value as typeof filtroCanal)}
              className="h-9 rounded-md border border-border bg-background px-2 text-xs">
              <option value="todos">Canal: Todos</option>
              <option value="basicos">Básicos</option>
              <option value="delicados">Delicados</option>
              <option value="ambos">Ambos</option>
            </select>
            <input value={filtroMolde} onChange={(e) => setFiltroMolde(e.target.value)} placeholder="Molde…"
              className="h-9 rounded-md border border-border bg-background px-2 text-xs" />
            <input value={filtroRevisor} onChange={(e) => setFiltroRevisor(e.target.value)} placeholder="Revisado por…"
              className="h-9 rounded-md border border-border bg-background px-2 text-xs" />
            <label className="text-[10px] text-muted-foreground">
              Desde
              <input type="date" value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)}
                className="mt-0.5 h-9 w-full rounded-md border border-border bg-background px-2 text-xs" />
            </label>
            <label className="text-[10px] text-muted-foreground">
              Hasta
              <input type="date" value={filtroHasta} onChange={(e) => setFiltroHasta(e.target.value)}
                className="mt-0.5 h-9 w-full rounded-md border border-border bg-background px-2 text-xs" />
            </label>
          </div>
          <div className="text-[11px] text-muted-foreground">
            {visibles.length} de {resueltas.length} resultado{resueltas.length === 1 ? "" : "s"}
          </div>
        </div>
      )}

      {error && <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

      {isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Cargando…</p>
      ) : visibles.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {tab === "pendiente" ? "No hay recomendaciones pendientes." : "Sin resultados con los filtros actuales."}
        </p>
      ) : (
        <ul className="space-y-2">
          {visibles.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-bold">Molde {r.numero_molde}</div>
                  <div className="text-[11px] text-muted-foreground">
                    Canal: <b className="text-foreground">{canalLabel(r.canal)}</b> · {r.usuario_nombre}
                    {r.puesto ? ` (${r.puesto})` : ""}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                  r.estado === "pendiente" ? "bg-amber-500/20 text-amber-500"
                  : r.estado === "aceptada" ? "bg-emerald-500/20 text-emerald-500"
                  : "bg-muted text-muted-foreground"
                }`}>{r.estado}</span>
              </div>
              <p className="mt-2 text-sm">{r.motivo}</p>
              {r.estado !== "pendiente" && r.revisada_por_nombre && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Resuelto por {r.revisada_por_nombre}
                  {r.fecha_revision ? ` · ${new Date(r.fecha_revision).toLocaleString()}` : ""}
                </p>
              )}
              {r.foto_url && (
                <div className="mt-2">
                  {fotosAbiertas[r.id] ? (
                    <a href={r.foto_url} target="_blank" rel="noopener noreferrer">
                      <img src={r.foto_url} alt="Foto de la recomendación" loading="lazy"
                        className="max-h-64 w-full rounded-md border border-border object-contain" />
                    </a>
                  ) : (
                    <button
                      onClick={() => setFotosAbiertas((p) => ({ ...p, [r.id]: true }))}
                      className="inline-flex h-8 items-center gap-1 rounded-md bg-secondary px-2 text-xs font-semibold"
                    >
                      <Eye className="h-3 w-3" /> Ver foto
                    </button>
                  )}
                </div>
              )}
              {r.estado === "pendiente" && puedeRevisar && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    disabled={busyId === r.id}
                    onClick={() => responder(r.id, "rechazar")}
                    className="flex h-10 items-center justify-center gap-1 rounded-md border border-border bg-secondary text-sm font-semibold disabled:opacity-50"
                  >
                    {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                    Rechazar
                  </button>
                  <button
                    disabled={busyId === r.id}
                    onClick={() => responder(r.id, "aceptar")}
                    className="flex h-10 items-center justify-center gap-1 rounded-md bg-destructive text-sm font-semibold text-destructive-foreground disabled:opacity-50"
                  >
                    {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Bloquear
                  </button>
                </div>
              )}
              {r.estado === "pendiente" && !puedeRevisar && (
                <p className="mt-2 text-[11px] italic text-muted-foreground">
                  Pendiente de revisión por Preparación molde.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
