import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Ban, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { crearRecomendacionBloqueo } from "@/lib/recomendaciones-bloqueo.functions";
import { useCanShowButton } from "@/lib/use-permisos";

export const Route = createFileRoute("/_authenticated/bloquear-canal")({
  validateSearch: (s: Record<string, unknown>) => ({
    molde: typeof s.molde === "string" ? s.molde : undefined,
    canal: s.canal === "basicos" || s.canal === "delicados" || s.canal === "ambos" ? s.canal : undefined,
  }),
  component: Page,
});

function Page() {
  const router = useRouter();
  const search = Route.useSearch();
  const { can, ready, scope } = useCanShowButton();
  const crearFn = useServerFn(crearRecomendacionBloqueo);

  const [molde, setMolde] = useState(search.molde ?? "");
  const [canal, setCanal] = useState<"basicos" | "delicados" | "ambos">(search.canal ?? "basicos");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (ready && !can("btn_bloquear_canal") && scope !== "admin") {
    return (
      <main className="mx-auto max-w-md px-4 py-6">
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          No tienes permiso para esta acción.
        </p>
      </main>
    );
  }

  const onSubmit = async () => {
    setError(null); setInfo(null);
    if (!molde.trim()) { setError("Indica el número de molde."); return; }
    if (motivo.trim().length < 3) { setError("Indica un motivo claro."); return; }
    setSaving(true);
    try {
      const res = await crearFn({ data: {
        numero_molde: molde.trim(),
        canal,
        motivo: motivo.trim(),
      }});
      setInfo(res.aplicado
        ? "Bloqueo aplicado al molde."
        : "Recomendación enviada. Preparación de molde la revisará.");
      setMolde(""); setMotivo("");
      router.invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar.");
    } finally { setSaving(false); }
  };

  return (
    <main className="mx-auto max-w-md px-4 py-4">
      <header className="mb-4 flex items-center gap-3">
        <Link to="/" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="flex-1 text-xl font-bold">Bloquear básico/delicado</h1>
        <Ban className="h-5 w-5 text-destructive" />
      </header>

      {info && <div className="mb-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-500">{info}</div>}
      {error && <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

      <div className="space-y-4 rounded-xl border border-border bg-card p-4">
        <div>
          <label className="text-xs text-muted-foreground">Número de molde</label>
          <input
            value={molde}
            onChange={(e) => setMolde(e.target.value)}
            className="mt-1 h-12 w-full rounded-md border border-input bg-background px-3 text-base"
            placeholder="Ej. 12345"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Canal a bloquear</label>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {(["basicos","delicados","ambos"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCanal(c)}
                className={`h-12 rounded-md border-2 text-sm font-semibold capitalize ${canal === c ? "border-destructive bg-destructive/10 text-destructive" : "border-border bg-secondary text-secondary-foreground"}`}
              >
                {c === "basicos" ? "Básicos" : c === "delicados" ? "Delicados" : "Ambos"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Motivo</label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-md border border-input bg-background p-3 text-base"
            placeholder="Describe por qué hay que bloquear este molde…"
          />
        </div>

        <button
          onClick={onSubmit}
          disabled={saving}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-md bg-destructive text-base font-semibold text-destructive-foreground disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Ban className="h-5 w-5" />}
          {saving ? "Enviando…" : "Bloquear / Enviar recomendación"}
        </button>

        <p className="text-[11px] text-muted-foreground">
          Si tu puesto puede bloquear directamente (Preparación molde / admin), el bloqueo se aplica al instante.
          En caso contrario, se enviará como recomendación a Preparación molde.
        </p>
      </div>
    </main>
  );
}
