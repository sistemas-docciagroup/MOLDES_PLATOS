import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, History, ChevronDown, ChevronUp, ImageIcon } from "lucide-react";
import { useState } from "react";
import { listReparaciones, updateReparacionEstado } from "@/lib/incidencias.functions";
import { useAuth } from "@/lib/use-auth";
import { RouteGuard } from "@/components/PermissionGate";

export const Route = createFileRoute("/_authenticated/reparaciones")({
  component: () => (
    <RouteGuard buttonId="btn_moldes_reparacion">
      <Page />
    </RouteGuard>
  ),
});

function Page() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAdmin, profile } = useAuth();
  const puedeReparar = isAdmin || profile?.puesto === "reparacion_moldes";
  const fetchList = useServerFn(listReparaciones);
  const updateFn = useServerFn(updateReparacionEstado);
  const [descs, setDescs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showFotos, setShowFotos] = useState<Record<string, boolean>>({});
  const [viewer, setViewer] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["reparaciones-activas"],
    queryFn: () => fetchList({ data: { activas: true } }),
  });

  const handleUpdate = async (id: string, estado: "reparado" | "descartado") => {
    setBusy(id);
    try {
      const descripcion_reparacion = descs[id]?.trim() || null;
      await updateFn({ data: { id, estado, descripcion_reparacion } });
      await queryClient.invalidateQueries({ queryKey: ["reparaciones-activas"] });
      router.invalidate();
    } catch (e) {
      alert((e as Error).message);
    } finally { setBusy(null); }
  };

  const toggle = (id: string) => setExpanded((m) => ({ ...m, [id]: !m[id] }));

  return (
    <main className="mx-auto max-w-md px-4 py-4">
      <header className="mb-4 flex items-center gap-3">
        <Link to="/" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-xl font-bold">Moldes en reparación</h1>
      </header>

      {!puedeReparar && (
        <p className="mb-3 rounded-md border border-border bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
          Solo el taller de reparación o un administrador pueden cerrar reparaciones. Modo solo consulta.
        </p>
      )}

      {data && data.length > 0 && (
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{data.length} molde{data.length !== 1 ? "s" : ""}</span>
          <button
            type="button"
            onClick={() => {
              const allOpen = data.every((r) => expanded[r.id]);
              const next: Record<string, boolean> = {};
              data.forEach((r) => { next[r.id] = !allOpen; });
              setExpanded(next);
            }}
            className="rounded-md border border-border bg-secondary px-2 py-1"
          >
            {data.every((r) => expanded[r.id]) ? "Contraer todo" : "Expandir todo"}
          </button>
        </div>
      )}

      {isLoading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}

      <ul className="space-y-1.5">
        {data?.map((r) => {
          const dias = Math.floor((Date.now() - new Date(r.fecha_envio).getTime()) / 86400000);
          const isOpen = !!expanded[r.id];
          const fotos = [r.foto_url, r.foto_url_2].filter(Boolean) as string[];
          const diasCls = dias >= 7 ? "bg-destructive/15 text-destructive" : dias >= 3 ? "bg-amber-500/15 text-amber-400" : "bg-secondary text-muted-foreground";
          return (
            <li key={r.id} className="overflow-hidden rounded-lg border border-border bg-card">
              <button
                type="button"
                onClick={() => toggle(r.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-base font-semibold">{r.molde}</span>
                    {r.numero_of && <span className="truncate text-xs text-muted-foreground">· OF {r.numero_of}</span>}
                  </div>
                  {r.motivo_corto && (
                    <div className="truncate text-xs text-muted-foreground">{r.motivo_corto}</div>
                  )}
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${diasCls}`}>{dias}d</span>
                {isOpen ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
              </button>

              {isOpen && (
                <div className="border-t border-border px-3 py-3 space-y-3">
                  <p className="text-sm">{r.descripcion}</p>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>Inicio: {new Date(r.fecha_envio).toLocaleDateString("es-ES")}</span>
                    <span>Envió: {r.nombre_envia ?? "—"}</span>
                  </div>

                  {fotos.length > 0 && (
                    showFotos[r.id] ? (
                      <div className="grid grid-cols-2 gap-2">
                        {fotos.map((u, i) => (
                          <button key={i} type="button" onClick={() => setViewer(u)} className="block h-24 w-full overflow-hidden rounded border border-border">
                            <img src={u} alt="" loading="lazy" className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowFotos((s) => ({ ...s, [r.id]: true }))}
                        className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-secondary px-2 text-xs"
                      >
                        <ImageIcon className="h-3.5 w-3.5" /> Ver fotos ({fotos.length})
                      </button>
                    )
                  )}

                  <Link
                    to="/molde/$codigo"
                    params={{ codigo: r.molde }}
                    className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-border bg-secondary text-xs font-medium"
                  >
                    <History className="h-3.5 w-3.5" /> Ver historial del molde
                  </Link>

                  {puedeReparar && (
                    <div className="space-y-2">
                      <textarea
                        placeholder="Breve descripción de lo reparado…"
                        value={descs[r.id] ?? ""}
                        onChange={(e) => setDescs((d) => ({ ...d, [r.id]: e.target.value }))}
                        className="w-full rounded-md border border-input bg-background p-2 text-sm"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button
                          disabled={busy === r.id}
                          onClick={() => handleUpdate(r.id, "reparado")}
                          className="flex-1 rounded-md bg-emerald-500/20 px-2 py-2 text-sm font-medium text-emerald-400 disabled:opacity-50"
                        >Reparado</button>
                        <button
                          disabled={busy === r.id}
                          onClick={() => handleUpdate(r.id, "descartado")}
                          className="flex-1 rounded-md bg-zinc-500/20 px-2 py-2 text-sm font-medium text-zinc-300 disabled:opacity-50"
                        >Descartar</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
        {data && data.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">No hay moldes en reparación.</p>}
      </ul>

      {viewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setViewer(null)}>
          <img src={viewer} alt="" className="max-h-full max-w-full rounded" />
        </div>
      )}
    </main>
  );
}
