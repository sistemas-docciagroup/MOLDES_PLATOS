import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Loader2, ChevronRight } from "lucide-react";
import { listMoldesIncidencias } from "@/lib/incidencias.functions";
import { EstadoBadge, type EstadoMolde } from "@/components/EstadoMolde";
import { CanalesBadges } from "@/components/CanalesBadges";
import { puestoLabel } from "@/lib/constants";

import { RouteGuard } from "@/components/PermissionGate";

export const Route = createFileRoute("/_authenticated/moldes")({
  component: () => (
    <RouteGuard buttonId="btn_estado_moldes">
      <Page />
    </RouteGuard>
  ),
});

const TINT: Record<EstadoMolde, string> = {
  seguir_produccion: "border-l-4 border-l-[color:var(--estado-seguir)]",
  observacion: "border-l-4 border-l-[color:var(--estado-observacion)]",
  mandar_reparacion: "border-l-4 border-l-[color:var(--estado-reparacion)]",
};

function Page() {
  const fetchList = useServerFn(listMoldesIncidencias);
  const [tab, setTab] = useState<"preparacion" | "otros">("preparacion");
  const { data, isLoading, error } = useQuery({
    queryKey: ["moldes-estado"],
    queryFn: () => fetchList(),
  });

  const filtrados = (data ?? []).filter((m) => m.estado_molde !== "mandar_reparacion");
  const preparacion = filtrados.filter((m) => m.puesto === "preparacion_molde");
  const otros = filtrados.filter((m) => m.puesto !== "preparacion_molde");
  const visibles = tab === "preparacion" ? preparacion : otros;

  return (
    <main className="mx-auto max-w-md px-4 py-4">
      <header className="mb-4 flex items-center gap-3">
        <Link to="/" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Moldes con incidencia</h1>
      </header>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setTab("preparacion")}
          className={`h-11 rounded-md border text-sm font-medium ${tab === "preparacion" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary"}`}
        >
          Preparación molde
          <span className="ml-1 text-xs opacity-80">({preparacion.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("otros")}
          className={`h-11 rounded-md border text-sm font-medium ${tab === "otros" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary"}`}
        >
          Otros puestos
          <span className="ml-1 text-xs opacity-80">({otros.length})</span>
        </button>
      </div>

      <p className="mb-3 rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
        {tab === "preparacion"
          ? "Decisiones e incidencias oficiales de Preparación molde."
          : "Avisos y recomendaciones abiertos por Repaso, Válvula, Desmoldeo, Reparación o Empaquetado."}
      </p>

      {isLoading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
      {error && <p className="text-sm text-destructive">Error al cargar.</p>}
      {!isLoading && visibles.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {tab === "preparacion" ? "Sin incidencias de Preparación molde." : "Sin avisos de otros puestos."}
        </p>
      )}

      <ul className="space-y-2">
        {visibles.map((m) => {
          const estado = m.estado_molde as EstadoMolde;
          return (
            <li key={m.molde}>
              <Link
                to="/molde/$codigo"
                params={{ codigo: m.molde }}
                className={`flex items-center gap-3 rounded-xl border border-border bg-card p-3 ${TINT[estado] ?? ""}`}
              >
                <div className="h-14 w-14 shrink-0 rounded-lg bg-secondary" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate font-semibold">{m.molde}</div>
                    <EstadoBadge estado={estado} />
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {m.motivo_corto ?? "—"}
                  </div>
                  <div className="mt-1">
                    <CanalesBadges basicos={m.estado_basicos} delicados={m.estado_delicados} />
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                    <span>Puesto: <span className="text-foreground">{puestoLabel(m.puesto)}</span></span>
                    <span>·</span>
                    <span>{m.nombre_usuario ?? "—"}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Hace {m.dias} día{m.dias !== 1 ? "s" : ""}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
