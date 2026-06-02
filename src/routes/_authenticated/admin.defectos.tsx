import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Loader2, Plus, Pencil, Trash2, X, Tag, Boxes, Factory } from "lucide-react";
import { AdminGuard } from "@/components/PermissionGate";
import { listarDefectos, upsertDefecto, borrarDefecto } from "@/lib/defectos.functions";

export const Route = createFileRoute("/_authenticated/admin/defectos")({
  component: () => (
    <AdminGuard>
      <Page />
    </AdminGuard>
  ),
});

type Defecto = {
  id: string;
  tipo: "producto" | "molde";
  nombre: string;
  orden: number;
  activo: boolean;
};

function Page() {
  const listFn = useServerFn(listarDefectos);
  const { data, isLoading } = useQuery({ queryKey: ["defectos"], queryFn: () => listFn() });
  const [edit, setEdit] = useState<Defecto | { tipo: "producto" | "molde" } | null>(null);

  const rows = (data ?? []) as Defecto[];
  const producto = rows.filter((r) => r.tipo === "producto");
  const molde = rows.filter((r) => r.tipo === "molde");

  return (
    <main className="mx-auto max-w-md px-4 py-4">
      <header className="mb-4 flex items-center gap-3">
        <Link to="/" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold flex-1">Defectos predefinidos</h1>
        <Tag className="h-5 w-5 text-primary" />
      </header>

      <p className="mb-3 rounded-md border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
        Los operarios verán estos defectos como botones rápidos al registrar una incidencia de producto.
        Hay dos listas separadas: <b>defectos del producto</b> y <b>defectos del molde</b>.
      </p>

      {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}

      <Section titulo="Defectos del producto" icon={Boxes} rows={producto} onEdit={setEdit} onNew={() => setEdit({ tipo: "producto" })} />
      <Section titulo="Defectos del molde" icon={Factory} rows={molde} onEdit={setEdit} onNew={() => setEdit({ tipo: "molde" })} />

      {edit && (
        <EditDialog
          row={"id" in edit ? edit : null}
          defaultTipo={"id" in edit ? edit.tipo : edit.tipo}
          onClose={() => setEdit(null)}
        />
      )}
    </main>
  );
}

function Section({
  titulo, icon: Icon, rows, onEdit, onNew,
}: {
  titulo: string;
  icon: React.ComponentType<{ className?: string }>;
  rows: Defecto[];
  onEdit: (c: Defecto) => void;
  onNew: () => void;
}) {
  return (
    <section className="mb-4">
      <div className="mb-1.5 flex items-center justify-between">
        <h2 className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Icon className="h-3.5 w-3.5" /> {titulo}
        </h2>
        <button onClick={onNew} className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-1 text-[11px]">
          <Plus className="h-3 w-3" /> Añadir
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">Aún no hay defectos.</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => (
            <li key={r.id} className={`flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-2.5 ${!r.activo ? "opacity-60" : ""}`}>
              <div className="min-w-0">
                <div className="font-semibold text-sm">{r.nombre}{!r.activo && <span className="ml-2 text-[10px] text-muted-foreground">(inactivo)</span>}</div>
                <div className="text-[11px] text-muted-foreground">Orden: {r.orden}</div>
              </div>
              <button onClick={() => onEdit(r)} className="h-8 w-8 rounded-md border border-border bg-secondary inline-flex items-center justify-center">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EditDialog({ row, defaultTipo, onClose }: { row: Defecto | null; defaultTipo: "producto" | "molde"; onClose: () => void }) {
  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertDefecto);
  const delFn = useServerFn(borrarDefecto);
  const [nombre, setNombre] = useState(row?.nombre ?? "");
  const [tipo, setTipo] = useState<"producto" | "molde">(row?.tipo ?? defaultTipo);
  const [orden, setOrden] = useState<number>(row?.orden ?? 100);
  const [activo, setActivo] = useState(row?.activo ?? true);
  const [err, setErr] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => upsertFn({ data: {
      id: row?.id ?? null, tipo, nombre: nombre.trim(), orden, activo,
    }}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["defectos"] }); onClose(); },
    onError: (e: Error) => setErr(e.message),
  });

  const del = useMutation({
    mutationFn: () => delFn({ data: { id: row!.id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["defectos"] }); onClose(); },
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{row ? "Editar defecto" : "Nuevo defecto"}</h2>
          <button onClick={onClose} className="rounded-full bg-secondary p-1"><X className="h-4 w-4" /></button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(["producto", "molde"] as const).map((t) => (
            <button key={t} onClick={() => setTipo(t)}
              className={`h-9 rounded-md border text-xs font-medium ${tipo === t ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground"}`}>
              {t === "producto" ? "Producto" : "Molde"}
            </button>
          ))}
        </div>

        <label className="block text-sm space-y-1">
          <span>Nombre</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Rebaba"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" autoFocus />
        </label>

        <label className="block text-sm space-y-1">
          <span>Orden (menor = aparece antes)</span>
          <input type="number" value={orden} onChange={(e) => setOrden(parseInt(e.target.value || "0", 10))}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
          <span>Activo (visible para los operarios)</span>
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
          <button disabled={!nombre.trim() || save.isPending} onClick={() => save.mutate()}
            className="h-10 flex-1 rounded-md bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
