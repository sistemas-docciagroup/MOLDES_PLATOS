import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useAuth } from "@/lib/use-auth";
import { BUTTONS, PERMISO_SCOPES, SCOPE_LABEL, type PermisoScope } from "@/lib/buttons";
import { Switch } from "@/components/ui/switch";
import { RouteGuard } from "@/components/PermissionGate";

export const Route = createFileRoute("/_authenticated/admin/permisos")({
  component: () => (
    <RouteGuard buttonId="btn_permisos_puesto">
      <Page />
    </RouteGuard>
  ),
});

// Permisos en memoria: todos visibles por defecto para el admin
const mockPermisos: Record<string, Record<string, boolean>> = {};

function Page() {
  const { loading, isAdmin } = useAuth();
  const [scope, setScope] = useState<PermisoScope>("preparacion_molde");
  const [, rerender] = useState(0);

  const visibleMap = useMemo(() => {
    const m: Record<string, boolean> = {};
    for (const b of BUTTONS) {
      m[b.id] = mockPermisos[scope]?.[b.id] ?? false;
    }
    return m;
  }, [scope, /* rerender dependency via state */]);

  const toggle = (button_id: string, value: boolean) => {
    if (!mockPermisos[scope]) mockPermisos[scope] = {};
    mockPermisos[scope][button_id] = value;
    rerender((n) => n + 1);
  };

  if (loading) {
    return <main className="mx-auto flex max-w-md justify-center px-4 py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></main>;
  }
  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-md px-4 py-4">
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Solo administradores.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-4">
      <header className="mb-4 flex items-center gap-3">
        <Link to="/" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-xl font-bold flex-1">Permisos por puesto</h1>
      </header>

      <div className="mb-4 rounded-xl border border-border bg-card p-3">
        <p className="mb-2 rounded-md bg-yellow-500/10 border border-yellow-500/30 px-3 py-2 text-xs text-yellow-600">
          Modo demo — los cambios se guardan solo en memoria (no hay base de datos aún).
        </p>
        <label className="text-xs text-muted-foreground">Puesto / rol</label>
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value as PermisoScope)}
          className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
        >
          {PERMISO_SCOPES.map((s) => (
            <option key={s} value={s}>{SCOPE_LABEL[s]}</option>
          ))}
        </select>
        <p className="mt-2 text-xs text-muted-foreground">
          Los administradores siempre ven todo. Activa o desactiva cada botón para el puesto seleccionado.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Ver cómo lo verá un operario: <Link to="/admin/vista-previa" className="underline">Vista previa por puesto</Link>.
        </p>
      </div>

      <ul className="space-y-1 rounded-xl border border-border bg-card overflow-hidden">
        {BUTTONS.map((b) => {
          const visible = visibleMap[b.id] ?? false;
          return (
            <li key={b.id} className="flex items-center justify-between gap-3 border-b border-border px-3 py-3 last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{b.name}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{b.categoria} · {b.id}</div>
              </div>
              <Switch checked={visible} onCheckedChange={(v) => toggle(b.id, v)} />
            </li>
          );
        })}
      </ul>

      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Save className="h-3 w-3" /> Los cambios se guardan automáticamente.
      </p>
    </main>
  );
}
