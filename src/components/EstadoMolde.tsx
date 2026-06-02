import { CheckCircle2, Eye, Wrench } from "lucide-react";

export type EstadoMolde = "seguir_produccion" | "observacion" | "mandar_reparacion";

export const ESTADO_INFO: Record<EstadoMolde, { label: string; short: string; bg: string; ring: string; icon: typeof CheckCircle2 }> = {
  seguir_produccion: {
    label: "Producir con incidencia",
    short: "Con incidencia",
    bg: "bg-[color:var(--estado-seguir)] text-[color:var(--estado-seguir-fg)]",
    ring: "ring-[color:var(--estado-seguir)]",
    icon: CheckCircle2,
  },
  observacion: {
    label: "Producir con observación",
    short: "Con observación",
    bg: "bg-[color:var(--estado-observacion)] text-[color:var(--estado-observacion-fg)]",
    ring: "ring-[color:var(--estado-observacion)]",
    icon: Eye,
  },
  mandar_reparacion: {
    label: "Mandar a reparación",
    short: "Reparación",
    bg: "bg-[color:var(--estado-reparacion)] text-[color:var(--estado-reparacion-fg)]",
    ring: "ring-[color:var(--estado-reparacion)]",
    icon: Wrench,
  },
};

export function EstadoBadge({ estado }: { estado: EstadoMolde }) {
  const info = ESTADO_INFO[estado];
  const Icon = info.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${info.bg}`}>
      <Icon className="h-3.5 w-3.5" /> {info.short}
    </span>
  );
}

export function EstadoPicker({ value, onChange }: { value: EstadoMolde | null; onChange: (v: EstadoMolde) => void }) {
  const opts: EstadoMolde[] = ["seguir_produccion", "observacion", "mandar_reparacion"];
  return (
    <div className="grid grid-cols-1 gap-2">
      {opts.map((e) => {
        const info = ESTADO_INFO[e];
        const Icon = info.icon;
        const active = value === e;
        return (
          <button
            type="button"
            key={e}
            onClick={() => onChange(e)}
            className={`flex h-14 items-center justify-center gap-2 rounded-xl text-base font-semibold transition ${info.bg} ${active ? "ring-4 ring-offset-2 ring-offset-background " + info.ring : "opacity-70"}`}
          >
            <Icon className="h-5 w-5" /> {info.label}
          </button>
        );
      })}
    </div>
  );
}
