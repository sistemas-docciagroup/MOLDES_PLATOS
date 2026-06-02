import { useCanShowButton } from "@/lib/use-permisos";

import { getNavEntriesForSurface, renderNavEntry } from "@/lib/navigation-permissions";

const ACCESOS = getNavEntriesForSurface("home");

export function AccesosGrid() {
  const { can, ready, scope } = useCanShowButton();

  if (!scope || !ready) return null;

  const visibles = ACCESOS.filter((a) => a.buttonId && can(a.buttonId));
  if (visibles.length === 0) return null;

  const cls =
    "flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-3 text-center shadow-sm active:scale-[0.98] transition-transform";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="mb-1 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Accesos rápidos
      </div>

      <ul className={`grid min-h-0 flex-1 gap-2 ${visibles.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
        {visibles.map((a) => {
          const Icon = a.icon;
          if (!Icon) return null;
          const inner = (
            <>
              <Icon className="h-9 w-9 text-primary" />
              <span className="text-sm font-semibold leading-tight">{a.label}</span>
            </>
          );
          return <li key={a.key} className="min-h-0">{renderNavEntry(a, cls, inner)}</li>;
        })}
      </ul>
    </div>
  );
}
