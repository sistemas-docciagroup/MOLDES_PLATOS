import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { X, ScanLine, Mic, Square, Loader2, ChevronDown, Camera } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { processAudioIncidencia, saveIncidencia } from "@/lib/incidencias.functions";
import { statsIncidenciasProducto } from "@/lib/incidencias-producto.functions";
import { useAuth } from "@/lib/use-auth";
import { PUESTOS } from "@/lib/constants";
import { useCanShowButton, usePreviewPuesto } from "@/lib/use-permisos";
import { AccesosGrid } from "@/components/AccesosGrid";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/")({ component: HomePage });

export function HomePage() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const effectivePuesto = usePreviewPuesto(profile?.puesto);
  const { ready, scope, can } = useCanShowButton();
  const permisosListos = scope === "admin" || ready;
  const saveFn = useServerFn(saveIncidencia);
  const processFn = useServerFn(processAudioIncidencia);

  const [modo, setModo] = useState<"voz" | "texto">("voz");
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [transcripcion, setTranscripcion] = useState<string | null>(null);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState({ molde: "", descripcion: "" });
  const [fotos, setFotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const addFoto = (file: File) => {
    if (fotos.length >= 2) return;
    setFotos((f) => [...f, file]);
    setPreviews((p) => [...p, URL.createObjectURL(file)]);
  };
  const removeFoto = (i: number) => {
    URL.revokeObjectURL(previews[i]);
    setFotos((f) => f.filter((_, x) => x !== i));
    setPreviews((p) => p.filter((_, x) => x !== i));
  };
  const uploadFoto = async (file: File): Promise<{ foto_url: string; foto_nombre: string } | null> => {
    if (!user?.id) return null;
    const ext = file.name.split(".").pop() || "jpg";
    const name = `${user.id}/reparacion-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("incidencias-fotos").upload(name, file, { contentType: file.type });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from("incidencias-fotos").getPublicUrl(name);
    return { foto_url: data.publicUrl, foto_nombre: file.name };
  };

  const puestoInfo = PUESTOS.find((p) => p.value === profile?.puesto);

  // Disparado por el acceso rápido "Mandar reparación" (menu/home)
  useEffect(() => {
    const handler = () => {
      setError(null); setInfo(null);
      setShowManual(true);
      setTimeout(() => {
        document.getElementById("mandar-reparacion-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);
    };
    window.addEventListener("open-mandar-reparacion", handler);
    return () => window.removeEventListener("open-mandar-reparacion", handler);
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    mrRef.current?.stream.getTracks().forEach((t) => t.stop());
  }, []);

  const procesarAudio = async (blob: Blob, mimeType: string) => {
    if (!profile?.puesto) { setError("Tu usuario no tiene puesto asignado para usar voz."); return; }
    setProcessing(true); setError(null);
    try {
      const audioBase64 = await blobToBase64(blob);
      const result = await processFn({ data: { audioBase64, mimeType, puesto: profile.puesto } });
      setTranscripcion(result.transcripcion || null);
      setManual((m) => ({ ...m, descripcion: result.descripcion || result.transcripcion || "" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al procesar el audio.");
    } finally { setProcessing(false); }
  };

  const startRecording = async () => {
    setError(null); setTranscripcion(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        await procesarAudio(blob, mr.mimeType || "audio/webm");
      };
      mr.start();
      mrRef.current = mr;
      setRecording(true); setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch {
      setError("No se pudo acceder al micrófono.");
    }
  };

  const stopRecording = () => mrRef.current?.stop();

  const enviarReparacionManual = async () => {
    if (!manual.molde.trim()) { setError("Indica el número de molde."); return; }
    if (!manual.descripcion.trim()) { setError("Describe el problema."); return; }
    setSaving(true); setError(null);
    try {
      const f1 = fotos[0] ? await uploadFoto(fotos[0]) : null;
      const f2 = fotos[1] ? await uploadFoto(fotos[1]) : null;
      await saveFn({ data: {
        molde: manual.molde.trim(),
        descripcion: manual.descripcion.trim(),
        transcripcion: (transcripcion || manual.descripcion).trim(),
        motivo_corto: null, zona: null, color: null,
        foto: f1,
        foto2: f2,
        estado_molde: "mandar_reparacion",
        tipo_fallo: null,
      }});
      setInfo("Molde enviado a reparación.");
      setManual({ molde: "", descripcion: "" });
      previews.forEach((p) => URL.revokeObjectURL(p));
      setFotos([]); setPreviews([]);
      setTranscripcion(null);
      setShowManual(false);
      router.invalidate();
      setTimeout(() => setInfo(null), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally { setSaving(false); }
  };

  return (
    <main className="relative">
      <div className="mx-auto flex h-[calc(100dvh-64px)] max-w-md flex-col gap-3 px-4 py-3 overflow-hidden">
        {permisosListos && can("btn_picar_of") && (
          <PicarOfDropdown isAdmin={scope === "admin"} puestoUsuario={effectivePuesto} />
        )}

        {info && (
          <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
            {info}
          </div>
        )}
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {showManual && (
          <div className="fixed inset-0 z-50 flex flex-col bg-background">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-lg font-bold">Mandar a reparación</h2>
              <button
                type="button"
                onClick={() => { setShowManual(false); setManual({ molde: "", descripcion: "" }); setError(null); setTranscripcion(null); previews.forEach((p) => URL.revokeObjectURL(p)); setFotos([]); setPreviews([]); }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div id="mandar-reparacion-form" className="flex-1 overflow-y-auto p-4 space-y-4">
              <p className="rounded-md bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                Indica el molde y el problema
              </p>

              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <input
                placeholder="Número de molde"
                value={manual.molde}
                onChange={(e) => setManual((m) => ({ ...m, molde: e.target.value }))}
                className="h-14 w-full rounded-md border border-input bg-background px-4 text-base"
              />

              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setModo("voz")}
                  className={`h-14 rounded-md border text-base font-medium ${modo === "voz" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary"}`}>
                  Voz
                </button>
                <button type="button" onClick={() => { setModo("texto"); setTranscripcion(null); }}
                  className={`h-14 rounded-md border text-base font-medium ${modo === "texto" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary"}`}>
                  Escribir
                </button>
              </div>

              {modo === "voz" ? (
                <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                  <button type="button" onClick={() => (recording ? stopRecording() : startRecording())} disabled={processing || saving}
                    className={`flex h-16 w-full items-center justify-center gap-2 rounded-md text-base font-semibold disabled:opacity-60 ${recording ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}>
                    {processing ? <Loader2 className="h-6 w-6 animate-spin" /> : recording ? <Square className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                    {processing ? "Analizando audio…" : recording ? `Parar grabación (${formatTime(elapsed)})` : "Grabar problema con IA"}
                  </button>
                  {transcripcion && (
                    <div className="rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
                      <div className="mb-1 font-medium text-foreground">Transcripción IA</div>
                      {transcripcion}
                    </div>
                  )}
                </div>
              ) : (
                <textarea
                  placeholder="Descripción del problema"
                  value={manual.descripcion}
                  onChange={(e) => setManual((m) => ({ ...m, descripcion: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background p-4 text-base"
                  rows={6}
                />
              )}

              <div className="rounded-xl border border-border bg-card p-3">
                <div className="mb-2 text-sm font-medium">Fotos (máx. 2)</div>
                <div className="flex gap-2">
                  {previews.map((src, i) => (
                    <div key={i} className="relative">
                      <img src={src} alt="" className="h-20 w-20 rounded-md object-cover" />
                      <button type="button" onClick={() => removeFoto(i)} className="absolute -top-1 -right-1 rounded-full bg-destructive p-0.5 text-destructive-foreground">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {fotos.length < 2 && (
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="h-20 w-20 rounded-md border-2 border-dashed border-border bg-background flex items-center justify-center text-muted-foreground">
                      <Camera className="h-5 w-5" />
                    </button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) addFoto(f); e.target.value = ""; }} />
              </div>
            </div>

            <div className="border-t border-border bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                onClick={enviarReparacionManual}
                disabled={saving}
                className="h-14 w-full rounded-md bg-primary text-base font-semibold text-primary-foreground disabled:opacity-50"
              >
                {saving ? "Enviando…" : "Mandar a reparación"}
              </button>
            </div>
          </div>
        )}

        <AccesosGrid />
      </div>
    </main>
  );
}

function PicarOfDropdown({ isAdmin, puestoUsuario }: { isAdmin: boolean; puestoUsuario: string | null }) {
  const [open, setOpen] = useState(false);
  const statsFn = useServerFn(statsIncidenciasProducto);
  const { user } = useAuth();
  const { data: stats } = useQuery({
    queryKey: ["incidencias-producto-stats"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.access_token) return { byPuesto: {} as Record<string, number> };
      try { return await statsFn(); } catch { return { byPuesto: {} as Record<string, number> }; }
    },
    enabled: !!user,
    refetchInterval: 30_000,
    retry: false,
    throwOnError: false,
  });

  const puestos = isAdmin ? PUESTOS : PUESTOS.filter((p) => p.value === puestoUsuario);
  if (puestos.length === 0) return null;

  const countFor = (v: string) => stats?.byPuesto?.[v] ?? 0;

  // Un solo puesto: link directo (sin desplegable)
  if (puestos.length === 1) {
    const p = puestos[0];
    const n = countFor(p.value);
    return (
      <div className="flex flex-col items-center justify-center py-6">
        <Link
          to="/picar-of"
          search={{ puesto: p.value }}
          className="relative flex h-56 w-56 flex-col items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground shadow-2xl shadow-primary/40 ring-4 ring-primary/20 active:scale-[0.97] transition-transform"
        >
          <ScanLine className="h-16 w-16" />
          <span className="text-xl font-extrabold tracking-tight">Picar OF</span>
          <span className="text-xs font-medium opacity-90">{p.label}</span>
          {n > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex min-w-[2rem] items-center justify-center rounded-full bg-destructive px-2 py-1 text-xs font-bold text-destructive-foreground shadow-md tabular-nums">
              {n} inc.
            </span>
          )}
        </Link>
      </div>
    );
  }

  return (
    <div className="shrink-0 space-y-2">
      <div className="flex h-12 w-full items-center gap-2 rounded-xl bg-primary px-4 text-base font-bold text-primary-foreground shadow-md">
        <ScanLine className="h-5 w-5" />
        Picar OF — elige puesto
      </div>
      <ul className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-2">
        {puestos.map((p) => {
          const n = countFor(p.value);
          return (
            <li key={p.value}>
              <Link
                to="/picar-of"
                search={{ puesto: p.value }}
                className="relative flex h-16 w-full flex-col items-center justify-center gap-0.5 rounded-lg bg-secondary px-2 text-center text-sm font-medium text-secondary-foreground active:scale-[0.98]"
              >
                <span className="inline-flex items-center gap-1.5">
                  <ScanLine className="h-4 w-4 text-primary shrink-0" />
                  <span className="leading-tight">{p.label}</span>
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Incidencias: <b className="text-foreground tabular-nums">{n}</b>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => {
      const s = String(r.result || "");
      resolve(s.includes(",") ? s.split(",")[1] : s);
    };
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${ss.toString().padStart(2, "0")}`;
}
