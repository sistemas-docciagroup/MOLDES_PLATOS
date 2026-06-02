import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/use-auth";
import { PreviewScopeProvider } from "@/lib/use-permisos";
import { PERMISO_SCOPES, SCOPE_LABEL, type PermisoScope } from "@/lib/buttons";
import { PUESTOS, type Puesto } from "@/lib/constants";
import { HomePage } from "./index";

export const Route = createFileRoute("/_authenticated/admin/vista-previa")({ component: Page });

function Page() {
  const { isAdmin, loading } = useAuth();
  const [scope, setScope] = useState<PermisoScope>("preparacion_molde");

  if (loading) return <main className="mx-auto max-w-md px-4 py-12 text-center text-muted-foreground">Cargando…</main>;
  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-md px-4 py-4">
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Solo administradores.</p>
      </main>
    );
  }

  // Si el scope coincide con un puesto operario, lo usamos como puesto simulado.
  const puestoSim = (PUESTOS.find((p) => p.value === scope)?.value ?? null) as Puesto | null;

  return (
    <main className="mx-auto max-w-md px-3 py-2">
      <div className="mb-2 flex items-center gap-2">
        <Link to="/" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary"><ArrowLeft className="h-4 w-4" /></Link>
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value as PermisoScope)}
          className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-sm font-medium"
        >
          {PERMISO_SCOPES.map((s) => (
            <option key={s} value={s}>{SCOPE_LABEL[s]}</option>
          ))}
        </select>
      </div>

      <div className="mx-auto w-full max-w-[400px] overflow-hidden rounded-[1.5rem] border-2 border-foreground/20 bg-background shadow-xl">
        <div className="pointer-events-none select-none">
          <PreviewScopeProvider key={scope} value={{ scope, puesto: puestoSim }}>
            <HomePage />
          </PreviewScopeProvider>
        </div>
        <div className="pointer-events-none select-none">
          <PreviewScopeProvider key={scope} value={{ scope, puesto: puestoSim }}>
            <HomePage />
          </PreviewScopeProvider>
        </div>
      </div>
    </main>
  );
}
