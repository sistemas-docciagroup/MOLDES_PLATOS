import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Loader2, Plus, Pencil, Trash2, X, Palette } from "lucide-react";
import { AdminGuard } from "@/components/PermissionGate";
import { listarColores, upsertColor, borrarColor } from "@/lib/colores.functions";

export const Route = createFileRoute("/_authenticated/admin/colores")({
  component: () => (
    <AdminGuard>
      <Page />
    </AdminGuard>
  ),
});

type Color = {
  id: string;
  color: string;
  tipo_color: "basico" | "delicado";
  permite_molde_con_incidencia: boolean;
  activo: boolean;
};

function Page() {
  const listFn = useServerFn(listarColores);
  const { data, isLoading } = useQuery({ queryKey: ["colores"], queryFn: () => listFn() });
  const [edit, setEdit] = useState<Color | "new" | null>(null);

  const rows = (data ?? []) as Color[];
  const basicos = rows.filter((r) => r.tipo_color === "basico");

  return (
    <main className="mx-auto max-w-md px-4 py-4">
      <header className="mb-4 flex items-center gap-3">
        <Link to="/" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold flex-1">Colores básicos</h1>
        <Palette className="h-5 w-5 text-primary" />
      </header>

      <p className="mb-3 rounded-md border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
        Aquí se gestionan únicamente los colores <b>básicos</b> (los que permiten seguir fabricando aunque el molde tenga una observación).
        Cualquier color que <b>no</b> esté en esta lista se considera automáticamente <b>delicado</b> y se bloquea cuando el canal delicados del molde está bloqueado.
      </p>

      <button onClick={() => setEdit("new")}
        className="mb-3 h-10 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground inline-flex items-center justify-center gap-2">
        <Plus className="h-4 w-4" /> Añadir color básico
      </button>

      {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}

      <Section titulo="Básicos" rows={basicos} onEdit={setEdit} />

      {edit && <EditDialog row={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
    </main>
  );
}


function Section({ titulo, rows, onEdit }: { titulo: string; rows: Color[]; onEdit: (c: Color) => void }) {
  if (rows.length === 0) return null;
  return (
    <section className="mb-4">
      <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</h2>
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.id} className={`flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-2.5 ${!r.activo ? "opacity-60" : ""}`}>
            <div className="min-w-0">
              <div className="font-semibold text-sm">{r.color}{!r.activo && <span className="ml-2 text-[10px] text-muted-foreground">(inactivo)</span>}</div>
              <div className="text-[11px] text-muted-foreground">
                {r.permite_molde_con_incidencia ? "Permite molde con incidencia" : "Bloquea molde con incidencia"}
              </div>
            </div>
            <button onClick={() => onEdit(r)} className="h-8 w-8 rounded-md border border-border bg-secondary inline-flex items-center justify-center">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EditDialog({ row, onClose }: { row: Color | null; onClose: () => void }) {
  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertColor);
  const delFn = useServerFn(borrarColor);
  const [color, setColor] = useState(row?.color ?? "");
  const tipo = "basico" as const;
  const [permite, setPermite] = useState(row?.permite_molde_con_incidencia ?? true);
  const [activo, setActivo] = useState(row?.activo ?? true);
  const [err, setErr] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => upsertFn({ data: {
      id: row?.id ?? null, color: color.trim(), tipo_color: tipo,
      permite_molde_con_incidencia: permite, activo,
    }}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["colores"] }); onClose(); },
    onError: (e: Error) => setErr(e.message),
  });

  const del = useMutation({
    mutationFn: () => delFn({ data: { id: row!.id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["colores"] }); onClose(); },
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{row ? "Editar color" : "Nuevo color"}</h2>
          <button onClick={onClose} className="rounded-full bg-secondary p-1"><X className="h-4 w-4" /></button>
        </div>
        <label className="block text-sm space-y-1">
          <span>Nombre del color</span>
        <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Ej: Blanco"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" autoFocus />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={permite} onChange={(e) => setPermite(e.target.checked)} />
          <span>Permite fabricar con molde con incidencia</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
          <span>Activo</span>
        </label>
        {err && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">{err}</div>}
        <div className="flex gap-2">
          {row && (
            <button onClick={() => del.mutate()} disabled={del.isPending}
              className="h-10 rounded-md border border-destructive/40 bg-destructive/10 px-3 text-sm text-destructive inline-flex items-center justify-center gap-1 disabled:opacity-50">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={onClose} className="h-10 flex-1 rounded-md border border-border bg-secondary text-sm">Cancelar</button>
          <button disabled={!color.trim() || save.isPending} onClick={() => save.mutate()}
            className="h-10 flex-1 rounded-md bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
