import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, ClipboardList, Filter, Pencil, History, X, Loader2, CheckCircle2, AlertTriangle, Trash2 } from "lucide-react";
import { RouteGuard, PermissionGate } from "@/components/PermissionGate";
import { listarFabricaciones, cambiarMoldeFabricacion, historialCambiosFabricacion, incidenciasDeOf, eliminarOf } from "@/lib/fabricaciones.functions";

export const Route = createFileRoute("/_authenticated/of-fabricadas")({
  component: () => (
    <RouteGuard buttonId="btn_of_fabricadas">
      <Page />
    </RouteGuard>
  ),
});

type Resultado = "fabricacion_ok" | "fabricacion_con_incidencia" | "fabricacion_con_observacion" | "enviado_reparacion";
type Puesto = "preparacion_molde" | "desmoldeo" | "repaso" | "valvula" | "empaquetado" | "reparacion_moldes";

type Fab = {
  id: string;
  numero_of: string;
  modelo: string | null;
  medida: string | null;
  color: string | null;
  numero_molde: string;
  usuario_nombre: string;
  usuario_id: string;
  puesto: Puesto | null;
  resultado: Resultado;
  fecha_hora: string;
  texto_incidencia: string | null;
  observacion: string | null;
};

type Filtros = {
  desde: string; hasta: string; molde: string; usuario: string;
  resultado: Resultado | ""; color: string; puesto: Puesto | "";
};

const RESULT_LABEL: Record<Resultado, string> = {
  fabricacion_ok: "Fabricación OK",
  fabricacion_con_incidencia: "Con incidencia",
  fabricacion_con_observacion: "Con observación",
  enviado_reparacion: "Enviado a reparación",
};

const PUESTO_LABEL: Record<Puesto, string> = {
  preparacion_molde: "Preparación molde",
  desmoldeo: "Desmoldeo",
  repaso: "Repaso",
  valvula: "Válvula",
  empaquetado: "Empaquetado",
  reparacion_moldes: "Reparación moldes",
};

function ResultBadge({ r, onClick }: { r: Resultado; onClick?: () => void }) {
  const ok = r === "fabricacion_ok";
  const c = ok
    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
    : "bg-amber-500/15 text-amber-400 border-amber-500/40";
  const Icon = ok ? CheckCircle2 : AlertTriangle;
  const label = ok ? "OK" : "Incidencia";
  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${c} ${onClick ? "cursor-pointer hover:opacity-80 active:scale-95 transition" : ""}`}
    >
      <Icon className="h-3 w-3" /> {label}
    </Tag>
  );
}


function Page() {
  const listarFn = useServerFn(listarFabricaciones);
  const [showFiltros, setShowFiltros] = useState(false);
  const [filtros, setFiltros] = useState<Filtros>({
    desde: "", hasta: "", molde: "", usuario: "", resultado: "", color: "", puesto: "",
  });
  const [editar, setEditar] = useState<Fab | null>(null);
  const [verHist, setVerHist] = useState<Fab | null>(null);
  const [verInc, setVerInc] = useState<Fab | null>(null);
  const [borrar, setBorrar] = useState<Fab | null>(null);

  const query = useQuery({
    queryKey: ["fabricaciones", filtros],
    queryFn: () => listarFn({ data: {
      desde: filtros.desde || null,
      hasta: filtros.hasta || null,
      molde: filtros.molde || null,
      usuario: filtros.usuario || null,
      resultado: filtros.resultado || null,
      color: filtros.color || null,
      puesto: filtros.puesto || null,
    }}),
  });
  const rows = (query.data ?? []) as Fab[];

  const limpiar = () => setFiltros({ desde: "", hasta: "", molde: "", usuario: "", resultado: "", color: "", puesto: "" });

  return (
    <main className="mx-auto max-w-md px-4 py-4">
      <header className="mb-4 flex items-center gap-3">
        <Link to="/" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold flex-1">OF fabricadas</h1>
        <ClipboardList className="h-5 w-5 text-primary" />
      </header>

      <button onClick={() => setShowFiltros((v) => !v)}
        className="mb-3 inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-3 h-9 text-sm">
        <Filter className="h-4 w-4" /> {showFiltros ? "Ocultar filtros" : "Filtros"}
      </button>

      {showFiltros && (
        <section className="mb-3 space-y-2 rounded-xl border border-border bg-card p-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <FInput label="Desde" type="date" v={filtros.desde} onChange={(v) => setFiltros({ ...filtros, desde: v })} />
            <FInput label="Hasta" type="date" v={filtros.hasta} onChange={(v) => setFiltros({ ...filtros, hasta: v })} />
            <FInput label="Molde" v={filtros.molde} onChange={(v) => setFiltros({ ...filtros, molde: v })} />
            <FInput label="Usuario" v={filtros.usuario} onChange={(v) => setFiltros({ ...filtros, usuario: v })} />
            <FInput label="Color" v={filtros.color} onChange={(v) => setFiltros({ ...filtros, color: v })} />
            <FSelect label="Puesto" v={filtros.puesto} onChange={(v) => setFiltros({ ...filtros, puesto: v as Puesto | "" })}
              options={[["", "Todos"], ...Object.entries(PUESTO_LABEL)]} />
          </div>
          <FSelect label="Resultado" v={filtros.resultado}
            onChange={(v) => setFiltros({ ...filtros, resultado: v as Resultado | "" })}
            options={[["", "Todos"], ...Object.entries(RESULT_LABEL)]} />
          <button onClick={limpiar} className="h-9 w-full rounded-md border border-border bg-secondary text-xs">Limpiar filtros</button>
        </section>
      )}

      {query.isLoading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
      {query.error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{(query.error as Error).message}</div>}

      {!query.isLoading && rows.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">No hay OF fabricadas con esos filtros.</p>
      )}

      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl border border-border bg-card p-2.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold text-sm truncate">OF {r.numero_of}</div>
              <ResultBadge r={r.resultado} onClick={() => setVerInc(r)} />
            </div>
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
              {r.modelo && <span><b className="text-foreground">{r.modelo}</b></span>}
              {r.medida && <span>· {r.medida}</span>}
              {r.color && <span>· {r.color}</span>}
              <span>· Molde <b className="text-foreground">{r.numero_molde}</b></span>
              <span>· {new Date(r.fecha_hora).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            {(r.texto_incidencia || r.observacion) && (
              <div className="rounded-md border border-border bg-secondary/40 p-1.5 text-[11px]">
                {r.texto_incidencia && <div><b>Incidencia:</b> {r.texto_incidencia}</div>}
                {r.observacion && <div><b>Observación:</b> {r.observacion}</div>}
              </div>
            )}

            <div className="flex gap-2">
              <PermissionGate buttonId="btn_cambiar_molde_of">
                <button onClick={() => setEditar(r)}
                  className="h-9 flex-1 rounded-md border border-border bg-secondary text-xs font-medium inline-flex items-center justify-center gap-1">
                  <Pencil className="h-3.5 w-3.5" /> Cambiar molde
                </button>
              </PermissionGate>
              <button onClick={() => setVerHist(r)}
                className="h-9 flex-1 rounded-md border border-border bg-secondary text-xs font-medium inline-flex items-center justify-center gap-1">
                <History className="h-3.5 w-3.5" /> Historial
              </button>
              <PermissionGate buttonId="btn_borrar_of">
                <button onClick={() => setBorrar(r)}
                  className="h-9 rounded-md border border-destructive/40 bg-destructive/10 px-2 text-xs font-medium text-destructive inline-flex items-center justify-center"
                  aria-label="Borrar OF">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </PermissionGate>
            </div>
          </li>
        ))}
      </ul>

      {editar && (
        <CambiarMoldeDialog fab={editar} onClose={() => setEditar(null)}
          onDone={() => { setEditar(null); query.refetch(); }} />
      )}
      {verHist && <HistorialDialog fab={verHist} onClose={() => setVerHist(null)} />}
      {verInc && <IncidenciasOfDialog fab={verInc} onClose={() => setVerInc(null)} />}
      {borrar && <BorrarOfDialog fab={borrar} onClose={() => setBorrar(null)} onDone={() => { setBorrar(null); query.refetch(); }} />}
    </main>
  );
}

function KV({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</div>
      <div className="text-xs font-medium truncate">{v || "—"}</div>
    </div>
  );
}

function FInput({ label, v, onChange, type = "text" }: { label: string; v: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <input type={type} value={v} onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-2 text-xs" />
    </label>
  );
}

function FSelect({ label, v, onChange, options }: { label: string; v: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <select value={v} onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-2 text-xs">
        {options.map(([val, lab]) => <option key={val} value={val}>{lab}</option>)}
      </select>
    </label>
  );
}

function CambiarMoldeDialog({ fab, onClose, onDone }: { fab: Fab; onClose: () => void; onDone: () => void }) {
  const qc = useQueryClient();
  const cambiarFn = useServerFn(cambiarMoldeFabricacion);
  const [nuevoMolde, setNuevoMolde] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () => cambiarFn({ data: { fabricacionId: fab.id, nuevoMolde: nuevoMolde.trim(), motivo: motivo.trim() } }),
    onSuccess: () => {
      setInfo("Molde actualizado correctamente");
      setError(null);
      qc.invalidateQueries({ queryKey: ["fabricaciones"] });
      setTimeout(onDone, 800);
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Cambiar molde</h2>
          <button onClick={onClose} className="rounded-full bg-secondary p-1"><X className="h-4 w-4" /></button>
        </div>
        <div className="text-xs text-muted-foreground">OF {fab.numero_of}</div>
        <div className="rounded-md border border-border bg-secondary/40 p-2 text-sm">
          <div className="text-[10px] uppercase text-muted-foreground">Molde actual</div>
          <div className="font-semibold">{fab.numero_molde}</div>
        </div>
        <label className="block text-sm space-y-1">
          <span>Nuevo molde</span>
          <input value={nuevoMolde} onChange={(e) => setNuevoMolde(e.target.value)}
            placeholder="Nº de molde correcto"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" autoFocus />
        </label>
        <label className="block text-sm space-y-1">
          <span>Motivo del cambio</span>
          <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3}
            placeholder="Ej: se picó por error otro molde"
            className="w-full rounded-md border border-input bg-background p-2 text-sm" />
        </label>
        {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}
        {info && <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-2 text-xs text-emerald-400">{info}</div>}
        <div className="flex gap-2">
          <button onClick={onClose} className="h-10 flex-1 rounded-md border border-border bg-secondary text-sm">Cancelar</button>
          <button disabled={!nuevoMolde.trim() || motivo.trim().length < 3 || mut.isPending}
            onClick={() => mut.mutate()}
            className="h-10 flex-1 rounded-md bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

type Hist = {
  id: string; molde_anterior: string | null; molde_nuevo: string;
  motivo_cambio: string; usuario_nombre: string; fecha_hora: string;
};

function HistorialDialog({ fab, onClose }: { fab: Fab; onClose: () => void }) {
  const histFn = useServerFn(historialCambiosFabricacion);
  const { data, isLoading, error } = useQuery({
    queryKey: ["fabricacion-historial", fab.id],
    queryFn: () => histFn({ data: { fabricacionId: fab.id } }),
  });
  const rows = (data ?? []) as Hist[];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 space-y-3 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Historial de cambios</h2>
          <button onClick={onClose} className="rounded-full bg-secondary p-1"><X className="h-4 w-4" /></button>
        </div>
        <div className="text-xs text-muted-foreground">OF {fab.numero_of} · molde actual <b>{fab.numero_molde}</b></div>
        {isLoading && <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
        {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">{(error as Error).message}</div>}
        {!isLoading && rows.length === 0 && (
          <p className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">Sin cambios registrados.</p>
        )}
        <ul className="space-y-2">
          {rows.map((h) => (
            <li key={h.id} className="rounded-md border border-border bg-secondary/40 p-2 text-xs space-y-1">
              <div className="text-[10px] text-muted-foreground">{new Date(h.fecha_hora).toLocaleString("es-ES")}</div>
              <div><b>{h.molde_anterior ?? "—"}</b> → <b>{h.molde_nuevo}</b></div>
              <div className="text-muted-foreground">Motivo: {h.motivo_cambio}</div>
              <div className="text-muted-foreground">Por: {h.usuario_nombre}</div>
            </li>
          ))}
        </ul>
        <button onClick={onClose} className="h-10 w-full rounded-md border border-border bg-secondary text-sm">Cerrar</button>
      </div>
    </div>
  );
}

function IncidenciasOfDialog({ fab, onClose }: { fab: Fab; onClose: () => void }) {
  const incFn = useServerFn(incidenciasDeOf);
  const { data, isLoading, error } = useQuery({
    queryKey: ["incidencias-of", fab.numero_of],
    queryFn: () => incFn({ data: { numeroOf: fab.numero_of } }),
  });
  const items = data?.items ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 space-y-3 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Incidencias OF {fab.numero_of}</h2>
          <button onClick={onClose} className="rounded-full bg-secondary p-1"><X className="h-4 w-4" /></button>
        </div>
        <div className="text-xs text-muted-foreground">
          Total: <b className="text-foreground">{data?.total ?? 0}</b>
        </div>
        {isLoading && <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
        {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">{(error as Error).message}</div>}
        {!isLoading && items.length === 0 && (
          <p className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
            Sin incidencias registradas para esta OF.
          </p>
        )}
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={`${i.tipo}-${i.id}`} className="rounded-md border border-border bg-secondary/40 p-2 text-xs space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/40 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                  {i.tipo === "producto" ? "Producto" : i.tipo.replace("fabricacion_", "").replace("_", " ")}
                </span>
                <span className="text-[10px] text-muted-foreground">{new Date(i.fecha).toLocaleString("es-ES")}</span>
              </div>
              {i.motivo && <div className="font-semibold">{i.motivo}</div>}
              {i.descripcion && <div>{i.descripcion}</div>}
              <div className="text-muted-foreground">
                {i.puesto && <>Puesto: {PUESTO_LABEL[i.puesto as Puesto] ?? i.puesto} · </>}
                {i.molde && <>Molde: {i.molde} · </>}
                Registrado por: <b className="text-foreground">{i.usuario_nombre}</b>
              </div>
            </li>
          ))}
        </ul>
        <button onClick={onClose} className="h-10 w-full rounded-md border border-border bg-secondary text-sm">Cerrar</button>
      </div>
    </div>
  );
}

function BorrarOfDialog({ fab, onClose, onDone }: { fab: Fab; onClose: () => void; onDone: () => void }) {
  const qc = useQueryClient();
  const elimFn = useServerFn(eliminarOf);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mut = useMutation({
    mutationFn: () => elimFn({ data: { fabricacionId: fab.id, motivo: motivo.trim() || null } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fabricaciones"] });
      onDone();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-destructive">Borrar OF</h2>
          <button onClick={onClose} className="rounded-full bg-secondary p-1"><X className="h-4 w-4" /></button>
        </div>
        <div className="rounded-md border border-border bg-secondary/40 p-2 text-sm">
          <div className="text-[10px] uppercase text-muted-foreground">OF</div>
          <div className="font-semibold">{fab.numero_of} · Molde {fab.numero_molde}</div>
        </div>
        <p className="text-xs text-muted-foreground">
          La OF se marcará como eliminada y dejará de aparecer en los listados. La trazabilidad
          (incidencias, reparaciones, históricos) se mantiene intacta.
        </p>
        <label className="block text-sm space-y-1">
          <span>Motivo (opcional)</span>
          <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3}
            placeholder="Ej: duplicada / picada por error"
            className="w-full rounded-md border border-input bg-background p-2 text-sm" />
        </label>
        {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}
        <div className="flex gap-2">
          <button onClick={onClose} className="h-10 flex-1 rounded-md border border-border bg-secondary text-sm">Cancelar</button>
          <button disabled={mut.isPending} onClick={() => mut.mutate()}
            className="h-10 flex-1 rounded-md bg-destructive text-sm font-semibold text-destructive-foreground disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Borrar
          </button>
        </div>
      </div>
    </div>
  );
}
