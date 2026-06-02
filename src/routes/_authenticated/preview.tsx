import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/_authenticated/preview")({ component: Page });

function Pane({ title, src }: { title: string; src: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [key, setKey] = useState(0);
  const reload = () => setKey((k) => k + 1);

  return (
    <section className="flex flex-col rounded-xl border border-border bg-card overflow-hidden min-w-0">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-secondary/40 px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground truncate">{title}</span>
        <a href={src} target="_blank" rel="noreferrer" className="text-[10px] text-muted-foreground hover:underline truncate flex-1">{new URL(src).host}</a>
        <button
          onClick={reload}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-secondary"
          aria-label="Recargar"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
      {/* Cada iframe va a un dominio distinto (preview vs publicado) →
          orígenes separados = storage Supabase independiente = login real en cada uno. */}
      <iframe
        key={key}
        ref={ref}
        src={src}
        title={title}
        className="w-full h-[80vh] bg-background"
      />
    </section>
  );
}

// URLs estables del proyecto: preview (último build) y published (producción).
const PROJECT_ID = "039b8d3a-0370-41c8-b656-8c66da21f4d0";
const LEFT_BASE_URL = import.meta.env.VITE_APP_PREVIEW_URL ?? `https://project--${PROJECT_ID}-dev.lovable.app`;
const RIGHT_BASE_URL = import.meta.env.VITE_APP_PUBLISHED_URL ?? `https://project--${PROJECT_ID}.lovable.app`;
const trim = (u: string) => (u.endsWith("/") ? u.slice(0, -1) : u);
const LEFT_URL = `${trim(LEFT_BASE_URL)}/login`;
const RIGHT_URL = `${trim(RIGHT_BASE_URL)}/login`;

function Page() {
  const { isAdmin, loading } = useAuth();

  if (loading) return null;

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-md px-4 py-4">
        <header className="mb-4 flex items-center gap-3">
          <Link to="/" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-xl font-bold flex-1">Vista doble</h1>
        </header>
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Solo administradores.</p>
      </main>
    );
  }

  return (
    <main className="px-3 py-3">
      <header className="mb-3 flex items-center gap-2">
        <Link to="/" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary shrink-0"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-base font-bold flex-1 truncate">Vista doble · app real</h1>
      </header>
      <p className="mb-3 text-[11px] text-muted-foreground">
        Dos instancias reales de la app, sesiones independientes. Inicia sesión en cada panel con un usuario distinto (admin a la izquierda, p.ej. preparación a la derecha) y trabaja en paralelo.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Pane title="Izquierda · preview" src={LEFT_URL} />
        <Pane title="Derecha · publicado" src={RIGHT_URL} />
      </div>
    </main>
  );
}
