import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { CanalBadge, type EstadoCanal } from "@/components/CanalesBadges";
import { ArrowLeft, Mic, Square, Loader2, CheckCircle2, XCircle, Camera, X, PackageOpen, ScanLine, Pencil, Ban, ShieldAlert, Boxes, Factory, Check } from "lucide-react";
import { processAudioProducto, saveIncidenciaProducto } from "@/lib/incidencias-producto.functions";
import { listarDefectos } from "@/lib/defectos.functions";
import { useAuth } from "@/lib/use-auth";
import { RouteGuard } from "@/components/PermissionGate";

export const Route = createFileRoute("/_authenticated/incidencia-producto-form")({
  validateSearch: (s: Record<string, unknown>) => ({
    pedido: typeof s.pedido === "string" ? s.pedido : undefined,
    molde: typeof s.molde === "string" ? s.molde : undefined,
    modelo: typeof s.modelo === "string" ? s.modelo : undefined,
    color: typeof s.color === "string" ? s.color : undefined,
    medida: typeof s.medida === "string" ? s.medida : undefined,
  }),
  component: () => (
    <RouteGuard buttonId="btn_incidencias_producto">
      <Page />
    </RouteGuard>
  ),
});

type RecStatus = "idle" | "recording" | "processing";
type SaveStatus = "idle" | "saving" | "saved" | "error";
type Modo = "voz" | "texto";

function Page() {
  const { user } = useAuth();
  const processFn = useServerFn(processAudioProducto);
  const saveFn = useServerFn(saveIncidenciaProducto);
  const listDefectosFn = useServerFn(listarDefectos);
  const qc = useQueryClient();
  const search = Route.useSearch();

  const [pedido, setPedido] = useState(search.pedido ?? "");
  const [molde, setMolde] = useState(search.molde ?? "");
  const [descripcion, setDescripcion] = useState("");
  const [transcripcion, setTranscripcion] = useState<string | null>(null);
  const [motivoCorto, setMotivoCorto] = useState<string | null>(null);
  const [modo, setModo] = useState<Modo>("voz");
  const [origen, setOrigen] = useState<"producto" | "molde">("producto");
  const [defectos, setDefectos] = useState<string[]>([]);
  const [mostrarOtro, setMostrarOtro] = useState(false);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [recStatus, setRecStatus] = useState<RecStatus>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [recBasicos, setRecBasicos] = useState(false);
  const [recDelicados, setRecDelicados] = useState(false);

  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const ofInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { ofInputRef.current?.focus(); }, []);

  const moldeTrim = molde.trim();
  const { data: estadoMolde } = useQuery({
    queryKey: ["estado-molde-canales", moldeTrim],
    enabled: !!moldeTrim,
    staleTime: 10_000,
    queryFn: async () => null, // TODO: conectar a DB real (antes usaba Supabase)
  });
  const estBas = (estadoMolde?.estado_basicos ?? "ok") as EstadoCanal;
  const estDel = (estadoMolde?.estado_delicados ?? "ok") as EstadoCanal;

  const { data: defectosTodos } = useQuery({
    queryKey: ["defectos"],
    staleTime: 60_000,
    queryFn: () => listDefectosFn(),
  });
  const defectosVisibles = useMemo(
    () => (defectosTodos ?? []).filter((d) => d.activo && d.tipo === origen),
    [defectosTodos, origen],
  );

  const toggleDefecto = (nombre: string) => {
    setDefectos((prev) => prev.includes(nombre) ? prev.filter((x) => x !== nombre) : [...prev, nombre]);
  };



  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        await procesarAudio(blob, mr.mimeType || "audio/webm");
      };
      mr.start();
      mrRef.current = mr;
      setRecStatus("recording"); setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch {
      setError("No se pudo acceder al micrófono.");
    }
  };

  const stopRecording = () => {
    mrRef.current?.stop();
    setRecStatus("processing");
  };

  const procesarAudio = async (blob: Blob, mimeType: string) => {
    try {
      const audioBase64 = await blobToBase64(blob);
      const r = await processFn({ data: { audioBase64, mimeType } });
      setDescripcion(r.descripcion);
      setTranscripcion(r.transcripcion);
      setMotivoCorto(r.motivo_corto);
      if (r.molde && !molde.trim()) setMolde(r.molde);
      if (r.pedido && !pedido.trim()) setPedido(r.pedido);
      setRecStatus("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al procesar audio");
      setRecStatus("idle");
    }
  };

  const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f));
  };
  const removePhoto = () => {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // TODO: conectar a almacenamiento real cuando esté disponible
  const uploadPhoto = async (): Promise<{ foto_url: string; foto_nombre: string } | null> => {
    return null;
  };

  const resetForm = () => {
    setPedido(""); setMolde(""); setDescripcion(""); setTranscripcion(null); setMotivoCorto(null);
    setOrigen("producto");
    setDefectos([]);
    setMostrarOtro(false);
    setRecBasicos(false);
    setRecDelicados(false);
    removePhoto();
  };

  const guardar = async () => {
    setError(null);
    if (!pedido.trim()) { setError("Indica la OF (pícala o escríbela)."); return; }
    if (!molde.trim()) { setError("Indica el número de molde."); return; }
    if (defectos.length === 0 && !descripcion.trim()) {
      setError("Marca un defecto predefinido o explica la incidencia.");
      return;
    }
    setSaveStatus("saving");
    try {
      const foto = await uploadPhoto();
      await saveFn({ data: {
        descripcion: descripcion.trim(),
        transcripcion: transcripcion ?? descripcion.trim() ?? null,
        motivo_corto: motivoCorto,
        molde: molde.trim(),
        pedido: pedido.trim(),
        origen,
        defectos,
        recomendar_bloqueos: origen === "molde"
          ? ([
            ...(recBasicos ? ["basicos"] : []),
            ...(recDelicados ? ["delicados"] : []),
          ] as Array<"basicos" | "delicados">)
          : [],
        foto,
      }});
      setSaveStatus("saved");
      resetForm();
      qc.invalidateQueries({ queryKey: ["incidencias-producto"] });
      qc.invalidateQueries({ queryKey: ["incidencias-producto-stats"] });
      setTimeout(() => setSaveStatus("idle"), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
      setSaveStatus("error");
    }
  };

  const isRecording = recStatus === "recording";
  const isProcessing = recStatus === "processing";
  const isSaving = saveStatus === "saving";

  return (
    <main className="mx-auto flex h-[calc(100dvh-64px)] max-w-md flex-col overflow-hidden px-3 py-2">
      <header className="mb-2 flex items-center gap-2">
        <Link to="/picar-of" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-base font-bold flex-1 leading-tight">Incidencia de producto</h1>
        <PackageOpen className="h-5 w-5 text-primary" />
      </header>

      {error && (
        <div className="mb-2 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
          <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}
      {saveStatus === "saved" && (
        <div className="mb-2 flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-2 text-xs text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" /> Incidencia guardada.
        </div>
      )}

      {(search.pedido || search.molde) ? (
        <section className="mb-2 flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs">
          <ScanLine className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-muted-foreground">OF</span>
          <span className="font-semibold">{pedido || "—"}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">Molde</span>
          <span className="font-semibold">{molde || "—"}</span>
          {moldeTrim && (
            <>
              <CanalBadge label="B" estado={estBas} />
              <CanalBadge label="D" estado={estDel} />
            </>
          )}
        </section>
      ) : (
        <section className="mb-2 grid grid-cols-2 gap-2 rounded-lg border border-border bg-card p-2">
          <div>
            <label className="mb-1 flex items-center gap-1 text-[11px] font-medium">
              <ScanLine className="h-3 w-3 text-primary" /> OF <span className="text-destructive">*</span>
            </label>
            <input
              ref={ofInputRef}
              value={pedido}
              onChange={(e) => setPedido(e.target.value)}
              placeholder="OF"
              className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1 text-[11px] font-medium">
              Molde <span className="text-destructive">*</span>
              {moldeTrim && (
                <span className="ml-auto flex gap-1">
                  <CanalBadge label="B" estado={estBas} />
                  <CanalBadge label="D" estado={estDel} />
                </span>
              )}
            </label>
            <input
              value={molde}
              onChange={(e) => setMolde(e.target.value)}
              placeholder="Ej. 1234"
              className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm"
              autoComplete="off"
            />
          </div>
        </section>
      )}


      <section className="mb-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setOrigen("producto")}
          className={`h-9 rounded-lg border text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-all ${
            origen === "producto"
              ? "border-primary/60 bg-gradient-to-br from-primary/15 to-primary/5 text-primary shadow-[0_0_0_1px_hsl(var(--ring))]"
              : "border-border bg-secondary/40 text-muted-foreground"
          }`}
        >
          <Boxes className="h-3.5 w-3.5" />
          <span className="tracking-wide">Defecto producto</span>
        </button>
        <button
          type="button"
          onClick={() => setOrigen("molde")}
          className={`h-9 rounded-lg border text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-all ${
            origen === "molde"
              ? "border-orange-500/50 bg-gradient-to-br from-orange-500/15 to-orange-600/5 text-orange-300 shadow-[0_0_0_1px_hsl(var(--ring))]"
              : "border-border bg-secondary/40 text-muted-foreground"
          }`}
        >
          <Factory className="h-3.5 w-3.5" />
          <span className="tracking-wide">Viene del molde</span>
        </button>
      </section>

      <section className="mb-2 flex flex-1 min-h-0 flex-col rounded-lg border border-border bg-card p-2.5">
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-xs font-medium">
            Defectos {origen === "molde" ? "del molde" : "del producto"}
          </label>
          {defectos.length > 0 && (
            <span className="text-[10px] text-muted-foreground">{defectos.length} marcado{defectos.length === 1 ? "" : "s"}</span>
          )}
        </div>

        {defectosVisibles.length === 0 ? (
          <div className="mb-1.5 rounded-md border border-dashed border-border p-2 text-[11px] text-muted-foreground">
            No hay defectos predefinidos. Pídele al administrador que los configure o describe la incidencia abajo.
          </div>
        ) : (
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {defectosVisibles.map((d) => {
              const on = defectos.includes(d.nombre);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDefecto(d.nombre)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${
                    on
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-secondary/40 text-foreground/80"
                  }`}
                >
                  {on && <Check className="h-3 w-3" />}
                  {d.nombre}
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => setMostrarOtro((v) => !v)}
          className={`mb-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition-all ${
            mostrarOtro
              ? "border-primary/60 bg-primary/15 text-primary"
              : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
          }`}
        >
          {mostrarOtro ? (
            <>
              <X className="h-4 w-4" /> Ocultar descripción
            </>
          ) : (
            <>
              <Pencil className="h-4 w-4" /> No encuentro mi defecto / explicar
            </>
          )}
        </button>

        {mostrarOtro && (
          <>
            <div className="mb-1.5 inline-flex self-end rounded-md border border-border bg-secondary p-0.5 text-[11px]">
              <button
                onClick={() => setModo("voz")}
                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 ${modo === "voz" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                <Mic className="h-3 w-3" /> Voz
              </button>
              <button
                onClick={() => setModo("texto")}
                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 ${modo === "texto" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                <Pencil className="h-3 w-3" /> Escribir
              </button>
            </div>

            {modo === "voz" ? (
              <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => (isRecording ? stopRecording() : startRecording())}
                  disabled={isProcessing}
                  className={`relative flex h-12 w-12 items-center justify-center rounded-full transition-all disabled:opacity-60 ${isRecording ? "bg-destructive" : "bg-primary active:scale-95"}`}
                >
                  {isRecording && <span className="absolute inset-0 animate-ping rounded-full bg-destructive/40" />}
                  {isProcessing ? <Loader2 className="h-5 w-5 animate-spin text-primary-foreground" />
                    : isRecording ? <Square className="h-5 w-5 fill-current text-destructive-foreground" />
                    : <Mic className="h-6 w-6 text-primary-foreground" strokeWidth={1.5} />}
                </button>
                <div className="text-[11px] font-medium tabular-nums text-muted-foreground">
                  {isRecording ? `● ${formatTime(elapsed)} — pulsa para parar`
                    : isProcessing ? "Transcribiendo…"
                    : descripcion ? "Pulsa para regrabar" : "Pulsa para grabar"}
                </div>
                {descripcion && (
                  <div className="w-full rounded-md border border-border bg-background p-2 text-xs">
                    <div className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Transcripción</div>
                    <div className="line-clamp-3">{descripcion}</div>
                    {motivoCorto && <div className="mt-0.5 text-[11px] text-muted-foreground">Motivo: {motivoCorto}</div>}
                  </div>
                )}
              </div>
            ) : (
              <textarea
                value={descripcion}
                onChange={(e) => { setDescripcion(e.target.value); setTranscripcion(e.target.value); }}
                placeholder="Describe el problema…"
                className="w-full flex-1 min-h-0 resize-none rounded-md border border-input bg-background p-2 text-sm"
              />
            )}
          </>
        )}
      </section>

      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={onPhotoChange} className="hidden" />
      {photoPreview ? (
        <div className="relative mb-2 overflow-hidden rounded-lg border border-border">
          <img src={photoPreview} alt="" className="h-20 w-full object-cover" />
          <button onClick={removePhoto} className="absolute right-1.5 top-1.5 rounded-full bg-destructive p-1 text-destructive-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button onClick={() => fileInputRef.current?.click()} className="mb-2 flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-border bg-secondary text-xs font-medium">
          <Camera className="h-4 w-4" /> Añadir foto (opcional)
        </button>
      )}

      <button
        onClick={guardar}
        disabled={isSaving || isRecording || isProcessing}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        Guardar incidencia
      </button>

      {moldeTrim && origen === "molde" && (
        <section className="mt-2">
          <div className="mb-1 text-[10px] text-muted-foreground">
            Recomendar bloqueo a preparación de moldes
          </div>
          <div className="grid grid-cols-2 gap-2">
            <BloqueoToggle
              label="Básicos"
              estado={estBas}
              activo={recBasicos}
              tone="amber"
              onClick={() => setRecBasicos((v) => !v)}
            />
            <BloqueoToggle
              label="Delicados"
              estado={estDel}
              activo={recDelicados}
              tone="violet"
              onClick={() => setRecDelicados((v) => !v)}
            />
          </div>
        </section>
      )}
    </main>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60); const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const r = reader.result as string;
      resolve(r.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function BloqueoToggle({
  label,
  estado,
  activo,
  tone,
  onClick,
}: {
  label: string;
  estado: EstadoCanal;
  activo: boolean;
  tone: "amber" | "violet";
  onClick: () => void;
}) {
  const bloqueado = estado === "bloqueado";
  const toneClasses = tone === "amber"
    ? "border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-600/5 text-amber-300 hover:border-amber-400/60"
    : "border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-violet-600/5 text-violet-300 hover:border-violet-400/60";
  const activeClasses = "border-primary/70 bg-primary/15 text-primary";
  const blockedClasses = "border-red-700/40 bg-red-950/30 text-red-300/70";
  const cls = bloqueado ? blockedClasses : activo ? activeClasses : toneClasses;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={bloqueado}
      aria-pressed={activo}
      className={`group relative h-9 overflow-hidden rounded-lg border text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-all disabled:opacity-60 ${cls}`}
    >
      {bloqueado ? <Ban className="h-3.5 w-3.5" /> : activo ? <Check className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
      <span className="tracking-wide">
        {bloqueado ? `${label} bloqueado` : activo ? `${label} · recomendado` : `Recomendar ${label.toLowerCase()}`}
      </span>
    </button>
  );
}
