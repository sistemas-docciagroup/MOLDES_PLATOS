import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Plus, Loader2, X, Edit2, Power, PowerOff, Trash2 } from "lucide-react";
import { AdminGuard } from "@/components/PermissionGate";
import {
  listarMoldesGestion, crearMolde, editarMolde, desactivarMolde, borrarMolde,
} from "@/lib/moldes.functions";

export const Route = createFileRoute("/_authenticated/gestion-moldes")({
  component: () => (
    <AdminGuard>
      <Page />
    </AdminGuard>
  ),
});

type MoldeRow = {
  numero_molde: string;
  modelo: string | null;
  medida: string | null;
  codigo_rfid_futuro: string | null;
  notas: string | null;
  activo: boolean;
  modelos: string[];
  estado: { estado_actual: string; restriccion_color: string | null } | null;
};

function Page() {
  const fetchFn = useServerFn(listarMoldesGestion);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["moldes-gestion"],
    queryFn: () => fetchFn(),
  });

  const [search, setSearch] = useState("");
  const [filtroModelo, setFiltroModelo] = useState<string>("");
  const [filtroMedida, setFiltroMedida] = useState<string>("");
  const [showInactivos, setShowInactivos] = useState(false);
  const [editing, setEditing] = useState<MoldeRow | null>(null);
  const [creating, setCreating] = useState(false);

  const desactivarFn = useServerFn(desactivarMolde);
  const toggleActivo = useMutation({
    mutationFn: (vars: { numeroMolde: string; activo: boolean }) =>
      desactivarFn({ data: vars }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["moldes-gestion"] }),
  });

  const borrarFn = useServerFn(borrarMolde);
  const borrar = useMutation({
    mutationFn: (numeroMolde: string) => borrarFn({ data: { numeroMolde } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["moldes-gestion"] }),
    onError: (e: Error) => alert(`Error al borrar: ${e.message}`),
  });

  const todos = (data ?? []) as MoldeRow[];
  const modelosUnicos = Array.from(new Set(todos.flatMap((m) => m.modelos))).sort();
  const medidasUnicas = Array.from(new Set(todos.map((m) => m.medida).filter((x): x is string => !!x))).sort();

  const filtered = todos
    .filter((m) => showInactivos || m.activo)
    .filter((m) => !filtroModelo || m.modelos.includes(filtroModelo))
    .filter((m) => !filtroMedida || m.medida === filtroMedida)
    .filter((m) => {
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      return m.numero_molde.toLowerCase().includes(s)
        || m.modelos.some((mo) => mo.toLowerCase().includes(s))
        || (m.medida ?? "").toLowerCase().includes(s);
    });

  return (
    <main className="mx-auto max-w-2xl px-4 py-4">
      <header className="mb-4 flex items-center gap-3">
        <Link to="/" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold flex-1">Gestión de moldes</h1>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Nuevo
        </button>
      </header>

      <div className="mb-3 space-y-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nº, modelo o medida"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={filtroModelo}
            onChange={(e) => setFiltroModelo(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">Todos los modelos</option>
            {modelosUnicos.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select
            value={filtroMedida}
            onChange={(e) => setFiltroMedida(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">Todas las medidas</option>
            {medidasUnicas.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={showInactivos} onChange={(e) => setShowInactivos(e.target.checked)} />
            Ver inactivos
          </label>
          <span>{filtered.length} molde{filtered.length === 1 ? "" : "s"}</span>
        </div>
      </div>


      {isLoading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}

      <ul className="space-y-2">
        {filtered.map((m) => (
          <li key={m.numero_molde} className={`rounded-xl border border-border bg-card p-3 ${!m.activo ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{m.numero_molde}</span>
                  {!m.activo && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">Inactivo</span>}
                  {m.estado?.estado_actual && m.estado.estado_actual !== "ok" && (
                    <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">
                      {m.estado.estado_actual}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Medida: {m.medida ?? "—"} · RFID: {m.codigo_rfid_futuro ?? "—"}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {m.modelos.length === 0 && <span className="text-xs text-muted-foreground italic">sin modelos</span>}
                  {m.modelos.map((mo) => (
                    <span key={mo} className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">{mo}</span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => setEditing(m as MoldeRow)} className="rounded-md bg-secondary p-2"><Edit2 className="h-4 w-4" /></button>
                <button
                  onClick={() => toggleActivo.mutate({ numeroMolde: m.numero_molde, activo: !m.activo })}
                  className="rounded-md bg-secondary p-2"
                  title={m.activo ? "Desactivar" : "Reactivar"}
                >
                  {m.activo ? <PowerOff className="h-4 w-4 text-destructive" /> : <Power className="h-4 w-4 text-emerald-500" />}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`¿Borrar definitivamente el molde ${m.numero_molde}?\n\nSe eliminarán también sus incidencias, recomendaciones, reparaciones y estado asociados. Esta acción no se puede deshacer.`)) {
                      borrar.mutate(m.numero_molde);
                    }
                  }}
                  className="rounded-md bg-destructive/10 p-2"
                  title="Borrar molde"
                  disabled={borrar.isPending}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </div>
            </div>
          </li>
        ))}
        {!isLoading && filtered.length === 0 && (
          <li className="py-12 text-center text-sm text-muted-foreground">No hay moldes.</li>
        )}
      </ul>

      {(creating || editing) && (
        <MoldeDialog
          molde={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ["moldes-gestion"] }); }}
        />
      )}
    </main>
  );
}

function MoldeDialog({ molde, onClose, onSaved }: { molde: MoldeRow | null; onClose: () => void; onSaved: () => void }) {
  const crearFn = useServerFn(crearMolde);
  const editarFn = useServerFn(editarMolde);
  const isEdit = !!molde;
  const [numero, setNumero] = useState(molde?.numero_molde ?? "");
  const [medida, setMedida] = useState(molde?.medida ?? "");
  const [rfid, setRfid] = useState(molde?.codigo_rfid_futuro ?? "");
  const [notas, setNotas] = useState(molde?.notas ?? "");
  const [modelos, setModelos] = useState<string[]>(molde?.modelos ?? []);
  const [nuevoModelo, setNuevoModelo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const guardar = useMutation({
    mutationFn: async () => {
      const payload = {
        numeroMolde: numero.trim(),
        medida: medida.trim() || null,
        rfid: rfid.trim() || null,
        notas: notas.trim() || null,
        modelos,
      };
      if (isEdit) await editarFn({ data: payload });
      else await crearFn({ data: payload });
    },
    onSuccess: onSaved,
    onError: (e: Error) => setError(e.message),
  });

  const addModelo = () => {
    const m = nuevoModelo.trim();
    if (!m || modelos.includes(m)) return;
    setModelos([...modelos, m]);
    setNuevoModelo("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{isEdit ? "Editar molde" : "Nuevo molde"}</h2>
          <button onClick={onClose} className="rounded-full bg-secondary p-1"><X className="h-4 w-4" /></button>
        </div>

        <div>
          <label className="text-xs font-medium">Nº molde *</label>
          <input
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            disabled={isEdit}
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium">Medida</label>
            <input value={medida} onChange={(e) => setMedida(e.target.value)} placeholder="120x70"
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">RFID</label>
            <input value={rfid} onChange={(e) => setRfid(e.target.value)} placeholder="opcional"
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium">Modelos de plato compatibles *</label>
          <div className="mt-1 flex gap-1">
            <input
              value={nuevoModelo}
              onChange={(e) => setNuevoModelo(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addModelo(); } }}
              placeholder="Ej: PIZARRA, LISO, SEMI PIZARRA"
              className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
            />
            <button type="button" onClick={addModelo} className="rounded-md bg-secondary px-3 text-sm">Añadir</button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {modelos.map((m) => (
              <span key={m} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-xs">
                {m}
                <button type="button" onClick={() => setModelos(modelos.filter((x) => x !== m))}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium">Notas</label>
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2}
            className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm" />
        </div>

        {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="h-10 flex-1 rounded-md border border-border bg-secondary text-sm">Cancelar</button>
          <button
            onClick={() => guardar.mutate()}
            disabled={!numero.trim() || modelos.length === 0 || guardar.isPending}
            className="h-10 flex-1 rounded-md bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {guardar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
