export type EstadoCanal = "ok" | "observacion" | "bloqueado";

const MAP: Record<EstadoCanal, { c: string; l: string }> = {
  ok: { c: "bg-emerald-600 text-white border-emerald-700", l: "OK" },
  observacion: { c: "bg-amber-500 text-black border-amber-600", l: "Observación" },
  bloqueado: { c: "bg-red-600 text-white border-red-700", l: "Bloqueado" },
};

export function CanalBadge({ label, estado }: { label: string; estado: EstadoCanal }) {
  const m = MAP[estado];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${m.c}`}>
      <span className="opacity-80">{label}:</span>
      <span className="font-semibold">{m.l}</span>
    </span>
  );
}

export function CanalesBadges({
  basicos,
  delicados,
  className,
}: {
  basicos?: EstadoCanal | null;
  delicados?: EstadoCanal | null;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap gap-1 ${className ?? ""}`}>
      <CanalBadge label="Básicos" estado={basicos ?? "ok"} />
      <CanalBadge label="Delicados" estado={delicados ?? "ok"} />
    </div>
  );
}
