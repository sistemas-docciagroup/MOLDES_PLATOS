import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import ScanLine from "lucide-react/dist/esm/icons/scan-line";
import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2";
import XCircle from "lucide-react/dist/esm/icons/x-circle";
import Send from "lucide-react/dist/esm/icons/send";
import Wrench from "lucide-react/dist/esm/icons/wrench";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import X from "lucide-react/dist/esm/icons/x";
import Camera from "lucide-react/dist/esm/icons/camera";
import Mic from "lucide-react/dist/esm/icons/mic";
import Square from "lucide-react/dist/esm/icons/square";
import PackageOpen from "lucide-react/dist/esm/icons/package-open";
import Ban from "lucide-react/dist/esm/icons/ban";
import Eye from "lucide-react/dist/esm/icons/eye";
import { RouteGuard } from "@/components/PermissionGate";
import { useAuth } from "@/lib/use-auth";
import { useCanShowButton } from "@/lib/use-permisos";
import {
  buscarOf, registrarFabricacion, mandarReparacionRapida, evaluarFabricacion,
  obtenerMoldeDeOf, asignarMoldeAOf, alertasPendientesMolde, marcarAlertaVista,
} from "@/lib/of.functions";
import { crearRecomendacionBloqueo, desbloquearCanal } from "@/lib/recomendaciones-bloqueo.functions";
import { processAudioIncidencia, saveIncidencia } from "@/lib/incidencias.functions";
import { listarMoldesDisponibles } from "@/lib/moldes.functions";
import { clasificarColor } from "@/lib/colores.functions";
import { buscarOfSap, type SapOfData } from "@/lib/sap.functions";
import { PUESTOS, type Puesto } from "@/lib/constants";
import { toast } from "sonner";


const puestoLabel = (p: Puesto | null) => PUESTOS.find((x) => x.value === p)?.label ?? "—";

type ColorClass = { color: string; tipo_color: "basico" | "delicado"; permite_molde_con_incidencia: boolean; encontrado: boolean };
type EstadoCanal = "ok" | "observacion" | "bloqueado";
type Evaluacion = {
  canal: "basicos" | "delicados";
  colorEncontrado: boolean;
  estadoCanal: EstadoCanal;
  puedeFabricar: boolean;
  requiereObservacion: boolean;
  motivo: string | null;
  decididoPor: string | null;
  fecha: string | null;
  enReparacion: boolean;
  estadoBasicos: EstadoCanal;
  estadoDelicados: EstadoCanal;
};

export const Route = createFileRoute("/_authenticated/picar-of")({
  validateSearch: (s: Record<string, unknown>) => ({
    puesto: typeof s.puesto === "string" ? (s.puesto as string) : undefined,
  }),
  component: () => (
    <RouteGuard buttonId="btn_picar_of">
      <Page />
    </RouteGuard>
  ),
});

type Step = "of" | "molde" | "acciones";

type OfData = {
  numero_of: string; modelo: string; medida: string; color: string; molde_sugerido: string;
  esDemo?: boolean; mensajeDemo?: string;
};

type MoldeDisponible = {
  numero_molde: string;
  medida: string | null;
  modelo: string | null;
  estado: {
    estado_actual: string;
    restriccion_color: string | null;
    puede_fabricar: boolean;
    estado_basicos?: EstadoCanal;
    estado_delicados?: EstadoCanal;
    motivo_basicos?: string | null;
    motivo_delicados?: string | null;
  } | null;
  en_reparacion: boolean;
  fecha_envio_reparacion?: string | null;
  dias_en_reparacion?: number | null;
};

const PUESTOS_FLUJO_PRODUCTO = new Set(["repaso", "empaquetado", "valvula", "desmoldeo"]);

function Page() {
  const { profile, user } = useAuth();
  const search = Route.useSearch();
  const puestoUrl = (search.puesto ?? null) as Puesto | null;
  const puestoActual = (puestoUrl ?? profile?.puesto ?? null) as Puesto | null;
  // Si la URL trae ?puesto=X (admin previsualizando), el flujo se deriva de ese puesto.
  // Si no, se usa el flujo configurado en el perfil del usuario.
  const flujoProducto = puestoUrl
    ? PUESTOS_FLUJO_PRODUCTO.has(puestoUrl)
    : (profile?.flujo_picar ?? "moldes") === "producto";
  const navigate = useNavigate();
  const { scope } = useCanShowButton();
  const esPreparacion = puestoActual === "preparacion_molde" || scope === "admin";

  const buscarOfFn = useServerFn(buscarOf);
  const buscarOfSapFn = useServerFn(buscarOfSap);
  const listarMoldesFn = useServerFn(listarMoldesDisponibles);
  const registrarFabFn = useServerFn(registrarFabricacion);
  const mandarRepFn = useServerFn(mandarReparacionRapida);
  const processIncidenciaFn = useServerFn(processAudioIncidencia);
  const saveIncidenciaFn = useServerFn(saveIncidencia);
  const clasificarColorFn = useServerFn(clasificarColor);
  const evaluarFabFn = useServerFn(evaluarFabricacion);
  const obtenerMoldeOfFn = useServerFn(obtenerMoldeDeOf);
  const asignarMoldeOfFn = useServerFn(asignarMoldeAOf);
  const alertasFn = useServerFn(alertasPendientesMolde);
  const marcarVistaFn = useServerFn(marcarAlertaVista);
  const crearBloqueoFn = useServerFn(crearRecomendacionBloqueo);
  const desbloquearFn = useServerFn(desbloquearCanal);

  const [step, setStep] = useState<Step>("of");
  const [ofInput, setOfInput] = useState("");
  const [ofData, setOfData] = useState<OfData | null>(null);
  const [moldeAsignadoOf, setMoldeAsignadoOf] = useState<string | null>(null);
  const [moldesDisp, setMoldesDisp] = useState<MoldeDisponible[]>([]);
  const [moldeSel, setMoldeSel] = useState<MoldeDisponible | null>(null);
  const [moldeManual, setMoldeManual] = useState("");
  const [colorClass, setColorClass] = useState<ColorClass | null>(null);
  const [evaluacion, setEvaluacion] = useState<Evaluacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [sapData, setSapData] = useState<SapOfData | null>(null);
  const [sapError, setSapError] = useState<string | null>(null);
  const [sapLoading, setSapLoading] = useState(false);

  const [showIncidencia, setShowIncidencia] = useState(false);
  const [showObservacion, setShowObservacion] = useState(false);
  const [showReparacion, setShowReparacion] = useState(false);
  const [showBloqueo, setShowBloqueo] = useState<null | "basicos" | "delicados" | "ambos">(null);
  const [showAlertas, setShowAlertas] = useState(false);

  const ofInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (step === "of") ofInputRef.current?.focus(); }, [step]);


  const buscarOfMut = useMutation({
    mutationFn: async (numeroOf: string) => {
      setSapData(null); setSapError(null); setSapLoading(true);
      const [ofResult] = await Promise.all([
        buscarOfFn({ data: { numeroOf } }),
        buscarOfSapFn({ data: { numeroOf } })
          .then((sap) => { setSapData(sap); setSapLoading(false); })
          .catch((e) => { setSapError(e instanceof Error ? e.message : "Error SAP"); setSapLoading(false); }),
      ]);
      return ofResult;
    },
    onSuccess: async (d) => {
      setOfData(d as OfData);
      setError(null);

      // Las 3 llamadas son independientes — se lanzan en paralelo
      const [moldesResult, colorResult, asignadoResult] = await Promise.allSettled([
        listarMoldesFn({ data: { modelo: d.modelo, medida: d.medida || null } }),
        d.color ? clasificarColorFn({ data: { color: d.color } }) : Promise.resolve(null),
        obtenerMoldeOfFn({ data: { numeroOf: d.numero_of } }),
      ]);

      setMoldesDisp(moldesResult.status === "fulfilled" ? moldesResult.value as MoldeDisponible[] : []);
      setColorClass(colorResult.status === "fulfilled" ? colorResult.value as ColorClass | null : null);

      const asignado = asignadoResult.status === "fulfilled" ? asignadoResult.value : null;

      if (asignado) {
        setMoldeAsignadoOf(asignado.numero_molde);
        if (!flujoProducto) {
          setMoldeSel({
            numero_molde: asignado.numero_molde,
            medida: asignado.medida ?? d.medida ?? null,
            modelo: asignado.modelo ?? d.modelo ?? null,
            estado: null,
            en_reparacion: false,
          });
          setStep("acciones");
          void evaluar(asignado.numero_molde, d as OfData);
          return;
        }
      }

      if (!flujoProducto && !asignado && !esPreparacion) {
        setError("Esta OF aún no tiene molde asignado. Preparación de molde debe asignar el molde primero.");
        setStep("of");
        return;
      }

      setStep("molde");
    },
    onError: (e: Error) => setError(e.message),
  });

  const numeroMoldeFinal = moldeSel?.numero_molde ?? moldeManual.trim();

  const restriccionChoca = (() => {
    const restr = moldeSel?.estado?.restriccion_color?.toLowerCase().trim();
    const color = ofData?.color?.toLowerCase().trim();
    if (!restr || !color) return false;
    if (restr.startsWith("solo ")) return !restr.includes(color);
    if (restr.startsWith("no ")) return restr.includes(color);
    return false;
  })();

  const estadoMolde = moldeSel?.estado?.estado_actual ?? "ok";
  const moldeConIncidencia = moldeSel
    ? (estadoMolde === "observacion" || estadoMolde === "mandar_reparacion" || moldeSel.en_reparacion)
    : false;
  const tieneProblema = moldeSel
    ? (estadoMolde !== "ok" || moldeSel.en_reparacion || !!moldeSel.estado?.restriccion_color)
    : false;
  void tieneProblema;

  // Gating: solo se bloquea totalmente la fabricación si AMBOS canales están bloqueados.
  // Si al menos uno (básicos o delicados) está OK, mostramos todas las opciones.
  const estadoBas = evaluacion?.estadoBasicos ?? "ok";
  const estadoDel = evaluacion?.estadoDelicados ?? "ok";
  const ambosBloqueados = estadoBas === "bloqueado" && estadoDel === "bloqueado";
  const bloqueado = ambosBloqueados;
  const requiereObservacion = evaluacion?.estadoCanal === "observacion" && !ambosBloqueados;
  void requiereObservacion;
  const puedeBloquearOficial = esPreparacion; // admin o preparacion_molde

  // Alertas pendientes del molde (recomendaciones, sugerencias de bloqueo, estado canal)
  const alertasQuery = useQuery({
    queryKey: ["alertas-molde", numeroMoldeFinal],
    queryFn: () => alertasFn({ data: { numeroMolde: numeroMoldeFinal } }),
    enabled: !!numeroMoldeFinal && step === "acciones",
  });
  const alertasPendientes = alertasQuery.data?.alertas ?? [];

  const resetAll = () => {
    setStep("of"); setOfInput(""); setOfData(null); setMoldeAsignadoOf(null); setMoldesDisp([]);
    setMoldeSel(null); setMoldeManual(""); setColorClass(null); setEvaluacion(null);
    setError(null); setInfo(null); setSapData(null); setSapError(null);
    setShowIncidencia(false); setShowObservacion(false); setShowReparacion(false);
    setShowBloqueo(null); setShowAlertas(false);
  };

  const evaluar = async (numeroMolde: string, of?: OfData | null) => {
    const data = of ?? ofData;
    if (!data) return;
    try {
      const ev = await evaluarFabFn({ data: { numeroMolde, color: data.color || null } });
      setEvaluacion(ev as Evaluacion);
    } catch {
      setEvaluacion(null);
    }
  };

  const persistirAsignacion = async (numeroMolde: string) => {
    if (!ofData || !esPreparacion) return;
    try {
      await asignarMoldeOfFn({ data: {
        numeroOf: ofData.numero_of,
        numeroMolde,
        modelo: ofData.modelo ?? null,
        medida: ofData.medida ?? null,
        color: ofData.color ?? null,
      }});
    } catch (e) {
      // No bloqueamos el flujo si falla, solo avisamos
      console.error("No se pudo guardar la asignación OF↔molde:", e);
    }
  };

  const onSeleccionarMolde = (m: MoldeDisponible) => {
    if (m.en_reparacion) return;
    setMoldeSel(m); setMoldeManual(""); setStep("acciones"); setInfo(null); setError(null);
    setEvaluacion(null);
    void evaluar(m.numero_molde);
    void persistirAsignacion(m.numero_molde);
  };

  const onUsarManual = () => {
    if (!moldeManual.trim()) return;
    const num = moldeManual.trim();
    setMoldeSel({
      numero_molde: num,
      medida: ofData?.medida ?? null,
      modelo: ofData?.modelo ?? null,
      estado: null,
      en_reparacion: false,
    });
    setStep("acciones"); setInfo(null); setError(null);
    setEvaluacion(null);
    void evaluar(num);
    void persistirAsignacion(num);
  };


  const guardarFabricacion = async (
    resultado: "fabricacion_ok" | "fabricacion_con_incidencia" | "fabricacion_con_observacion" | "enviado_reparacion",
    extras: { textoIncidencia?: string; observacion?: string; reparacionId?: string; incidenciaId?: string } = {},
  ) => {
    if (!ofData || !numeroMoldeFinal) return null;
    try {
      const row = await registrarFabFn({ data: {
        numeroOf: ofData.numero_of,
        modelo: ofData.modelo, medida: ofData.medida, color: ofData.color,
        numeroMolde: numeroMoldeFinal,
        resultado,
        textoIncidencia: extras.textoIncidencia ?? null,
        observacion: extras.observacion ?? null,
        incidenciaId: extras.incidenciaId ?? null,
        reparacionId: extras.reparacionId ?? null,
      }});
      return row;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar fabricación");
      return null;
    }
  };

  const handleAutorizar = async () => {
    const ok = await guardarFabricacion("fabricacion_ok");
    if (ok) { setInfo("✅ Fabricación autorizada y registrada."); }
  };

  return (
    <main className="mx-auto max-w-md px-4 py-3">
      <header className="mb-3 flex items-center gap-2">
        <Link to="/" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold leading-tight truncate">Picar OF</h1>
            <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${flujoProducto ? "bg-amber-500/15 text-amber-400 border border-amber-500/40" : "bg-primary/15 text-primary border border-primary/40"}`}>
              {flujoProducto ? <PackageOpen className="h-3 w-3" /> : <ScanLine className="h-3 w-3" />}
              {flujoProducto ? "Producto" : "Moldes"}
            </span>
          </div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">
            {puestoLabel(puestoActual)}
          </div>
        </div>
      </header>

      

      {error && (
        <div className="mb-2 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
          <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}
      {info && (
        <div className="mb-2 flex items-start gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-2 text-xs text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" /><span>{info}</span>
        </div>
      )}

      {step === "of" && (
        <section className="space-y-2 rounded-xl border border-border bg-card p-3">
          <label className="text-xs font-medium text-muted-foreground">Escanear o introducir OF</label>
          <input
            ref={ofInputRef}
            value={ofInput}
            onChange={(e) => setOfInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && ofInput.trim()) buscarOfMut.mutate(ofInput.trim()); }}
            placeholder="OF-XXXXXX o pistola lectora"
            className="h-12 w-full rounded-md border border-input bg-background px-3 text-base"
            autoComplete="off"
          />
          <button
            onClick={() => ofInput.trim() && buscarOfMut.mutate(ofInput.trim())}
            disabled={!ofInput.trim() || buscarOfMut.isPending}
            className="h-11 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {buscarOfMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
            Buscar OF
          </button>

          {/* Resultado SAP - visible mientras se resuelve y en el paso "of" */}
          {sapLoading && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Consultando SAP…
            </div>
          )}
          {sapError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              SAP: {sapError}
            </div>
          )}
        </section>
      )}

      {step === "molde" && ofData && (
        <section className="space-y-3">
          <div className="rounded-xl border border-border bg-card px-3 py-2 flex items-center gap-2 flex-wrap text-xs">
            <span className="text-[10px] uppercase text-muted-foreground">OF</span>
            <span className="font-semibold text-sm">{ofData.numero_of}</span>
            {(!sapData || sapData.configurable) && (
              <>
                <span className="text-muted-foreground">·</span>
                <span><span className="text-muted-foreground">Modelo</span> <b>{ofData.modelo}</b></span>
                <span className="text-muted-foreground">·</span>
                <span><span className="text-muted-foreground">Medida</span> <b>{ofData.medida}</b></span>
                <span className="text-muted-foreground">·</span>
                <span><span className="text-muted-foreground">Color</span> <b>{ofData.color}</b></span>
              </>
            )}
          </div>

          {/* Datos SAP */}
          {sapLoading && (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Consultando SAP…
            </div>
          )}
          {sapData && (
            <div className="rounded-xl border border-border bg-card px-4 py-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Material SAP</p>
              <p className="text-base font-bold leading-snug">{sapData.descripcion || "—"}</p>
              {sapData.configurable && sapData.configuracion.length > 0 && (
                <ul className="mt-1 space-y-1">
                  {sapData.configuracion.map((c, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">{c.atbez}</span>
                      <span className="font-medium">{c.atwtb}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {sapError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              SAP: {sapError}
            </div>
          )}


          {flujoProducto ? (
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <p className="text-sm text-muted-foreground">¿Hay alguna incidencia con el producto de esta OF?</p>
              <button
                onClick={() => {
                  toast.success(`OK · OF ${ofData.numero_of} registrada`);
                  resetAll();
                }}
                className="h-14 w-full rounded-md bg-emerald-600 text-base font-semibold text-white inline-flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="h-5 w-5" /> Sin incidencia
              </button>
              <button
                onClick={() => navigate({
                  to: "/incidencia-producto-form",
                  search: { pedido: ofData.numero_of, molde: moldeAsignadoOf ?? ofData.molde_sugerido, modelo: ofData.modelo, color: ofData.color, medida: ofData.medida },
                })}
                className="h-14 w-full rounded-md bg-destructive text-base font-semibold text-destructive-foreground inline-flex items-center justify-center gap-2"
              >
                <PackageOpen className="h-5 w-5" /> Registrar incidencia de producto
              </button>
              <button onClick={() => setStep("of")} className="mt-1 h-10 w-full rounded-md border border-border bg-secondary text-sm">Volver</button>

            </div>
          ) : (
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <label className="text-sm font-medium">¿Con qué molde vas a fabricar?</label>
            {moldesDisp.length === 0 && (
              <p className="text-xs text-muted-foreground">No hay moldes catalogados para este modelo. Introduce uno manualmente.</p>
            )}
            <ul className="space-y-1.5">
              {moldesDisp.map((m) => <MoldeCard key={m.numero_molde} molde={m} ofColor={ofData.color} onClick={() => onSeleccionarMolde(m)} />)}
            </ul>

            <div className="pt-2 border-t border-border space-y-1.5">
              <label className="text-xs font-medium">o introduce molde manualmente:</label>
              <div className="flex gap-1.5">
                <input
                  value={moldeManual}
                  onChange={(e) => setMoldeManual(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") onUsarManual(); }}
                  placeholder="Nº de molde"
                  className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                />
                <button onClick={onUsarManual} disabled={!moldeManual.trim()}
                  className="h-10 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">Usar</button>
              </div>
            </div>
            <button onClick={() => setStep("of")} className="mt-2 h-10 w-full rounded-md border border-border bg-secondary text-sm">Volver</button>
          </div>
          )}
        </section>
      )}

      {step === "acciones" && ofData && moldeSel && (
        <section className="space-y-3">
          <div className={`rounded-xl border p-3 text-sm space-y-2 ${
            bloqueado ? "border-destructive/50 bg-destructive/10" :
            requiereObservacion ? "border-amber-500/50 bg-amber-500/10" :
            evaluacion ? "border-emerald-500/40 bg-emerald-500/10" :
            "border-border bg-card"
          }`}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] text-muted-foreground truncate">
                  OF {ofData.numero_of} · {ofData.modelo} · {ofData.medida} · {ofData.color}
                </div>
                <div className="text-base font-semibold mt-0.5">Molde {moldeSel.numero_molde}</div>
              </div>
              {evaluacion && (
                <div className="flex items-center gap-1.5 text-[10px] shrink-0">
                  <CanalChip label="Bás." estado={evaluacion.estadoBasicos} active={evaluacion.canal === "basicos"} />
                  <CanalChip label="Del." estado={evaluacion.estadoDelicados} active={evaluacion.canal === "delicados"} />
                </div>
              )}
            </div>

            {evaluacion && (
              <div className="flex items-center gap-2 text-xs font-medium">
                {bloqueado ? <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" /> :
                  requiereObservacion ? <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" /> :
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                <span>
                  Canal <b>{evaluacion.canal === "basicos" ? "básicos" : "delicados"}</b>:{" "}
                  {evaluacion.estadoCanal === "ok" ? "Autorizado" :
                    evaluacion.estadoCanal === "observacion" ? "Con observación" : "Bloqueado"}
                </span>
              </div>
            )}

            {moldeSel.estado?.restriccion_color && (
              <div className={`flex items-start gap-2 rounded-md border p-2 text-xs ${restriccionChoca ? "border-amber-500/50 bg-amber-500/10 text-amber-400" : "border-border bg-secondary"}`}>
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div>Restricción: <b>{moldeSel.estado.restriccion_color}</b>{restriccionChoca ? " — no coincide" : ""}</div>
              </div>
            )}
            {evaluacion?.motivo && <div className="text-xs">Motivo: <b>{evaluacion.motivo}</b></div>}
            {colorClass && (
              <div className="text-[11px] text-muted-foreground">
                Color <b>{colorClass.color}</b> · {colorClass.tipo_color === "delicado" ? "delicado" : "básico"}
                {!colorClass.encontrado && " (no clasificado)"}
              </div>
            )}
          </div>

          {alertasPendientes.length > 0 && (
            <button
              onClick={() => setShowAlertas(true)}
              className={`flex w-full items-center justify-between gap-2 rounded-lg border-2 px-3 py-2.5 text-left text-sm font-semibold ${
                alertasPendientes.some(a => a.severidad === "bloqueo")
                  ? "border-destructive/60 bg-destructive/15 text-destructive"
                  : "border-amber-500/60 bg-amber-500/15 text-amber-400"
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>{alertasPendientes.length} alerta{alertasPendientes.length === 1 ? "" : "s"} sin ver</span>
              </div>
              <Eye className="h-4 w-4" />
            </button>
          )}

          {info ? (
            <button
              onClick={resetAll}
              className="h-14 w-full rounded-lg bg-primary text-base font-semibold text-primary-foreground inline-flex items-center justify-center gap-2"
            >
              <Send className="h-5 w-5" /> Picar otra OF
            </button>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                {!bloqueado && (
                  <>
                    <button onClick={handleAutorizar}
                      className="h-24 rounded-xl bg-emerald-600 text-sm font-semibold text-white shadow-sm inline-flex flex-col items-center justify-center gap-1 p-2 text-center leading-tight hover:bg-emerald-500 transition-colors">
                      <CheckCircle2 className="h-6 w-6" /> Fabricar
                    </button>
                    <button onClick={() => setShowIncidencia(true)}
                      className="h-24 rounded-xl border border-amber-500/50 bg-card text-xs font-semibold text-amber-500 inline-flex flex-col items-center justify-center gap-1 p-2 text-center leading-tight hover:bg-amber-500/10 transition-colors">
                      <AlertTriangle className="h-6 w-6" /> Fabricar con incidencia
                    </button>
                    <button onClick={() => setShowObservacion(true)}
                      className="h-24 rounded-xl border border-amber-500/50 bg-card text-xs font-semibold text-amber-500 inline-flex flex-col items-center justify-center gap-1 p-2 text-center leading-tight hover:bg-amber-500/10 transition-colors">
                      <AlertTriangle className="h-6 w-6" /> Fabricar con observación
                    </button>
                  </>
                )}
                <button onClick={() => setShowReparacion(true)}
                  className={`h-24 rounded-xl border border-destructive/50 bg-card text-xs font-semibold text-destructive inline-flex flex-col items-center justify-center gap-1 p-2 text-center leading-tight hover:bg-destructive/10 transition-colors ${bloqueado ? "col-span-2" : ""}`}>
                  <Wrench className="h-6 w-6" /> Mandar a reparar
                </button>
              </div>

              <div className="rounded-xl border border-border bg-card/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {puedeBloquearOficial ? "Bloqueo de canal" : "Recomendar bloqueo"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {puedeBloquearOficial ? "Pulsa para activar/desactivar" : "Solo recomendación · genera alerta"}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <BloqueoToggle
                    label="Básicos"
                    bloqueado={estadoBas === "bloqueado"}
                    puedeOficial={puedeBloquearOficial}
                    onClick={async () => {
                      if (puedeBloquearOficial && estadoBas === "bloqueado") {
                        try {
                          await desbloquearFn({ data: { numero_molde: numeroMoldeFinal, canal: "basicos" } });
                          toast.success("Canal básicos desbloqueado.");
                          void evaluar(numeroMoldeFinal);
                        } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
                      } else {
                        setShowBloqueo("basicos");
                      }
                    }}
                  />
                  <BloqueoToggle
                    label="Delicados"
                    bloqueado={estadoDel === "bloqueado"}
                    puedeOficial={puedeBloquearOficial}
                    onClick={async () => {
                      if (puedeBloquearOficial && estadoDel === "bloqueado") {
                        try {
                          await desbloquearFn({ data: { numero_molde: numeroMoldeFinal, canal: "delicados" } });
                          toast.success("Canal delicados desbloqueado.");
                          void evaluar(numeroMoldeFinal);
                        } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
                      } else {
                        setShowBloqueo("delicados");
                      }
                    }}
                  />

                </div>
              </div>
            </>
          )}
        </section>
      )}

      {showAlertas && numeroMoldeFinal && (
        <AlertasDialog
          alertas={alertasPendientes}
          onClose={() => setShowAlertas(false)}
          onVista={async (a) => {
            try {
              await marcarVistaFn({ data: { tipo: a.tipo, referenciaId: a.id, numeroMolde: numeroMoldeFinal } });
              await alertasQuery.refetch();
            } catch { /* noop */ }
          }}
        />
      )}

      {showBloqueo && numeroMoldeFinal && (
        <BloqueoDialog
          canal={showBloqueo}
          numeroMolde={numeroMoldeFinal}
          puesto={puestoActual}
          processFn={processIncidenciaFn}
          onClose={() => setShowBloqueo(null)}
          onSave={async ({ motivo, transcripcion, fotoUrl }) => {
            try {
              const res = await crearBloqueoFn({ data: {
                numero_molde: numeroMoldeFinal,
                canal: showBloqueo,
                motivo,
                transcripcion: transcripcion ?? null,
                foto_url: fotoUrl ?? null,
              }});
              setShowBloqueo(null);
              toast.success(res.aplicado
                ? `Bloqueo aplicado (${showBloqueo}).`
                : `Sugerencia de bloqueo enviada (${showBloqueo}). Pendiente de revisión.`);
              void evaluar(numeroMoldeFinal);
              void alertasQuery.refetch();

            } catch (e) {
              setError(e instanceof Error ? e.message : "Error al bloquear.");
            }
          }}
        />
      )}




      {showIncidencia && (
        <IncidenciaDialog
          puesto={puestoActual}
          molde={numeroMoldeFinal}
          color={ofData?.color ?? null}
          processFn={processIncidenciaFn}
          saveFn={saveIncidenciaFn}
          onClose={() => setShowIncidencia(false)}
          onSave={async ({ textoIncidencia, incidenciaId }: { textoIncidencia: string; incidenciaId: string }) => {
            const ok = await guardarFabricacion("fabricacion_con_incidencia", { textoIncidencia, incidenciaId });
            if (ok) { setInfo("Fabricación autorizada con incidencia."); setShowIncidencia(false); }
          }}
        />
      )}
      {showObservacion && (
        <ObservacionDialog
          puesto={puestoActual}
          processFn={processIncidenciaFn}
          onClose={() => setShowObservacion(false)}
          onSave={async (texto) => {
            const ok = await guardarFabricacion("fabricacion_con_observacion", { observacion: texto });
            if (ok) { setInfo("Observación registrada."); setShowObservacion(false); }
          }}
        />
      )}
      {showReparacion && ofData && numeroMoldeFinal && (
        <ReparacionDialog
          numeroMolde={numeroMoldeFinal}
          numeroOf={ofData.numero_of}
          userId={user?.id ?? ""}
          onClose={() => setShowReparacion(false)}
          onSaved={async (reparacionId) => {
            const ok = await guardarFabricacion("enviado_reparacion", { reparacionId });
            if (ok) { setInfo("Molde enviado a reparación."); setShowReparacion(false); }
          }}
          mandarRepFn={mandarRepFn}
        />
      )}
      {!profile && null}
    </main>
  );
}

function KV({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</div>
      <div className="text-sm font-medium">{v || "—"}</div>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const items: { id: Step; label: string }[] = [
    { id: "of", label: "OF" }, { id: "molde", label: "Molde" }, { id: "acciones", label: "Acciones" },
  ];
  const idx = items.findIndex((i) => i.id === step);
  return (
    <div className="mb-3 flex items-center gap-1.5">
      {items.map((it, i) => (
        <div key={it.id} className={`h-1 flex-1 rounded-full ${i <= idx ? "bg-primary" : "bg-secondary"}`} />
      ))}
    </div>
  );
}

function BloqueoToggle({ label, bloqueado, puedeOficial, onClick }: { label: string; bloqueado: boolean; puedeOficial: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative h-16 rounded-lg border px-3 text-left transition-colors ${
        bloqueado
          ? "border-destructive/60 bg-destructive/10 text-destructive"
          : "border-border bg-background hover:bg-secondary/60 text-foreground"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-sm font-semibold">{label}</span>
          <span className="text-[10px] text-muted-foreground">
            {bloqueado ? (puedeOficial ? "Bloqueado · toca para desbloquear" : "Bloqueado") : (puedeOficial ? "OK · toca para bloquear" : "OK · recomendar")}
          </span>
        </div>
        <span className={`inline-flex h-6 w-11 items-center rounded-full border transition-colors ${bloqueado ? "bg-destructive border-destructive" : "bg-secondary border-border"}`}>
          <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${bloqueado ? "translate-x-5" : "translate-x-0.5"}`} />
        </span>
      </div>
    </button>
  );
}

const ESTADO_BADGE_MAP: Record<string, { c: string; l: string }> = {
  ok: { c: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40", l: "OK" },
  seguir_produccion: { c: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40", l: "Seguir producción" },
  observacion: { c: "bg-amber-500/15 text-amber-400 border-amber-500/40", l: "Observación" },
  mandar_reparacion: { c: "bg-destructive/15 text-destructive border-destructive/40", l: "Mandar reparación" },
  en_reparacion: { c: "bg-destructive/15 text-destructive border-destructive/40", l: "En reparación" },
};

function EstadoBadge({ estado, enRep }: { estado: string; enRep: boolean }) {
  const efectivo = enRep ? "en_reparacion" : estado;
  const m = ESTADO_BADGE_MAP[efectivo] ?? { c: "bg-secondary", l: efectivo };
  return <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium ${m.c}`}>{m.l}</span>;
}

const CANAL_CHIP_MAP: Record<EstadoCanal, { c: string; l: string }> = {
  ok: { c: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40", l: "OK" },
  observacion: { c: "bg-amber-500/15 text-amber-400 border-amber-500/40", l: "Observación" },
  bloqueado: { c: "bg-destructive/15 text-destructive border-destructive/40", l: "Bloqueado" },
};

function CanalChip({ label, estado, active }: { label: string; estado: EstadoCanal; active: boolean }) {
  const m = CANAL_CHIP_MAP[estado];
  return (
    <div className={`flex items-center justify-between rounded-md border px-2 py-1 ${m.c} ${active ? "ring-2 ring-offset-1 ring-offset-background" : "opacity-80"}`}>
      <span className="font-medium">{label}</span>
      <span>{m.l}</span>
    </div>
  );
}

function MoldeCard({ molde, ofColor, onClick }: { molde: MoldeDisponible; ofColor: string; onClick: () => void }) {
  const estado = molde.en_reparacion ? "en_reparacion" : (molde.estado?.estado_actual ?? "ok");
  const restriccion = molde.estado?.restriccion_color;
  const enRep = molde.en_reparacion || estado === "en_reparacion";
  const basicos = molde.estado?.estado_basicos ?? "ok";
  const delicados = molde.estado?.estado_delicados ?? "ok";
  const border = enRep
    ? "border-l-muted-foreground/30"
    : basicos === "bloqueado" && delicados === "bloqueado" ? "border-l-destructive"
    : basicos === "observacion" || delicados === "observacion" || restriccion ? "border-l-amber-500"
    : "border-l-emerald-500";
  const fechaRep = molde.fecha_envio_reparacion ? new Date(molde.fecha_envio_reparacion).toLocaleDateString() : null;
  return (
    <li>
      <button
        onClick={onClick}
        disabled={enRep}
        aria-disabled={enRep}
        className={`w-full flex items-center justify-between gap-2 rounded-lg border border-border border-l-4 ${border} px-2.5 py-2 text-left ${enRep ? "bg-muted/30 opacity-60 cursor-not-allowed grayscale" : "bg-secondary/40 hover:bg-secondary"}`}
      >
        <div className="min-w-0 flex items-center gap-2">
          <span className="font-semibold text-sm shrink-0">{molde.numero_molde}</span>
          {enRep && fechaRep && (
            <span className="text-[11px] text-muted-foreground truncate">
              En rep. {fechaRep}{typeof molde.dias_en_reparacion === "number" && ` · ${molde.dias_en_reparacion}d`}
            </span>
          )}
          {enRep && !fechaRep && <span className="text-[11px] text-muted-foreground truncate">En reparación</span>}
          {!enRep && restriccion && <span className="text-[11px] text-amber-400 truncate">Restr: {restriccion}</span>}
        </div>
        {!enRep && (
          <div className="flex items-center gap-1.5 text-[10px] shrink-0">
            <CanalChip label="Básicos" estado={basicos} active={false} />
            <CanalChip label="Delicados" estado={delicados} active={false} />
          </div>
        )}
        {ofColor && null}
      </button>
    </li>
  );
}

function TextoDialog({ title, placeholder, onClose, onSave }: { title: string; placeholder: string; onClose: () => void; onSave: (texto: string) => Promise<void> }) {
  const [texto, setTexto] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-full bg-secondary p-1"><X className="h-4 w-4" /></button>
        </div>
        <textarea
          value={texto} onChange={(e) => setTexto(e.target.value)} rows={4}
          placeholder={placeholder}
          className="w-full rounded-md border border-input bg-background p-2 text-sm"
          autoFocus
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="h-10 flex-1 rounded-md border border-border bg-secondary text-sm">Cancelar</button>
          <button
            disabled={!texto.trim() || saving}
            onClick={async () => { setSaving(true); try { await onSave(texto.trim()); } finally { setSaving(false); } }}
            className="h-10 flex-1 rounded-md bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

type IncidenciaExtraida = {
  descripcion: string;
  transcripcion: string;
  motivo_corto: string | null;
  zona: string | null;
  color: string | null;
  tipo_fallo: "molde" | "proceso" | null;
};

type ProcessIncidenciaFn = (args: { data: { audioBase64: string; mimeType: string; puesto: Puesto } }) => Promise<IncidenciaExtraida>;
type SaveIncidenciaFn = (args: { data: {
  molde: string | null;
  descripcion: string;
  transcripcion: string;
  motivo_corto: string | null;
  zona: string | null;
  color: string | null;
  foto: null;
  estado_molde: "seguir_produccion" | "observacion" | "mandar_reparacion";
  tipo_fallo?: "molde" | "proceso" | null;
} }) => Promise<{ id: string } | unknown>;

function IncidenciaDialog({
  puesto,
  molde,
  color,
  processFn,
  saveFn,
  onClose,
  onSave,
}: {
  puesto: Puesto | null;
  molde: string;
  color: string | null;
  processFn: ProcessIncidenciaFn;
  saveFn: SaveIncidenciaFn;
  onClose: () => void;
  onSave: (data: { textoIncidencia: string; incidenciaId: string }) => Promise<void>;
}) {
  const [modo, setModo] = useState<"voz" | "texto">("voz");
  const [texto, setTexto] = useState("");
  const [extraida, setExtraida] = useState<IncidenciaExtraida | null>(null);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const timerDisplayRef = useRef<HTMLSpanElement>(null);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
  }, []);

  const procesarAudio = async (blob: Blob, mimeType: string) => {
    if (!puesto) {
      setError("Tu usuario no tiene puesto asignado para usar voz IA.");
      return;
    }

    setProcessing(true);
    setError(null);
    try {
      const audioBase64 = await blobToBase64(blob);
      const result = await processFn({ data: { audioBase64, mimeType, puesto } });
      setExtraida(result);
      setTexto(result.descripcion || result.transcripcion || "");
      setModo("voz");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al procesar el audio.");
    } finally {
      setProcessing(false);
    }
  };

  const startRecording = async () => {
    if (!puesto) {
      setError("Tu usuario no tiene puesto asignado para usar voz IA.");
      return;
    }

    setError(null);
    setExtraida(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        elapsedRef.current = 0;
        if (timerDisplayRef.current) timerDisplayRef.current.textContent = "0:00";
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        await procesarAudio(blob, mr.mimeType || "audio/webm");
      };
      mr.start();
      mediaRecorderRef.current = mr;
      elapsedRef.current = 0;
      setRecording(true);
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        if (timerDisplayRef.current) timerDisplayRef.current.textContent = formatAudioTime(elapsedRef.current);
      }, 1000);
    } catch {
      setError("No se pudo acceder al micrófono.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const guardar = async () => {
    const descripcion = texto.trim();
    if (!descripcion) return;

    setSaving(true);
    setError(null);
    try {
      const row = await saveFn({ data: {
        molde,
        descripcion,
        transcripcion: extraida?.transcripcion?.trim() || descripcion,
        motivo_corto: extraida?.motivo_corto ?? null,
        zona: extraida?.zona ?? null,
        color: extraida?.color ?? color ?? null,
        foto: null,
        estado_molde: "seguir_produccion",
        tipo_fallo: extraida?.tipo_fallo ?? null,
      } });
      const incidenciaId = (row as { id?: string } | null)?.id;
      if (!incidenciaId) throw new Error("No se pudo obtener la incidencia guardada.");
      await onSave({ textoIncidencia: descripcion, incidenciaId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar la incidencia.");
    } finally {
      setSaving(false);
    }
  };

  const disabled = processing || saving;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Autorizar con incidencia</h2>
          <button onClick={onClose} className="rounded-full bg-secondary p-1"><X className="h-4 w-4" /></button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setModo("voz")}
            className={`h-10 rounded-md border text-sm font-medium ${modo === "voz" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary"}`}
          >
            Voz
          </button>
          <button
            type="button"
            onClick={() => { setModo("texto"); setExtraida(null); }}
            className={`h-10 rounded-md border text-sm font-medium ${modo === "texto" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary"}`}
          >
            Escribir
          </button>
        </div>

        {modo === "voz" && (
          <div className="space-y-3 rounded-xl border border-border bg-background p-3">
            <button
              type="button"
              onClick={() => (recording ? stopRecording() : startRecording())}
              disabled={disabled}
              className={`flex h-12 w-full items-center justify-center gap-2 rounded-md text-sm font-semibold disabled:opacity-60 ${recording ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}
            >
              {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : recording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              {processing ? "Analizando audio…" : recording ? <>Parar grabación (<span ref={timerDisplayRef}>0:00</span>)</> : "Grabar incidencia con IA"}
            </button>
            {extraida?.transcripcion && (
              <div className="rounded-md border border-border bg-card p-2 text-xs text-muted-foreground">
                <div className="mb-1 font-medium text-foreground">Transcripción IA</div>
                {extraida.transcripcion}
              </div>
            )}
          </div>
        )}

        {modo === "texto" && (
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={4}
            placeholder="Describe la incidencia breve"
            className="w-full rounded-md border border-input bg-background p-2 text-sm"
            autoFocus
          />
        )}

        {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}

        <div className="flex gap-2">
          <button onClick={onClose} className="h-10 flex-1 rounded-md border border-border bg-secondary text-sm">Cancelar</button>
          <button
            disabled={!texto.trim() || disabled || recording}
            onClick={guardar}
            className="h-10 flex-1 rounded-md bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function formatAudioTime(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

type MandarRepFn = (args: { data: {
  numeroMolde: string; motivo: string; transcripcion?: string | null;
  fotoUrl1?: string | null; fotoNombre1?: string | null;
  fotoUrl2?: string | null; fotoNombre2?: string | null;
  numeroOf?: string | null;
} }) => Promise<{ id: string } | unknown>;

function ReparacionDialog({ numeroMolde, numeroOf, userId, onClose, onSaved, mandarRepFn }: {
  numeroMolde: string; numeroOf: string; userId: string;
  onClose: () => void; onSaved: (reparacionId?: string) => Promise<void>;
  mandarRepFn: MandarRepFn;
}) {
  const [motivo, setMotivo] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const addFoto = (file: File) => {
    setFotos((prev) => {
      if (prev.length >= 2) return prev;
      return [...prev, file];
    });
    setPreviews((prev) => {
      if (prev.length >= 2) return prev;
      return [...prev, URL.createObjectURL(file)];
    });
  };
  const removeFoto = (i: number) => {
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[i]);
      return prev.filter((_, x) => x !== i);
    });
    setFotos((prev) => prev.filter((_, x) => x !== i));
  };

  // TODO: conectar a almacenamiento real cuando esté disponible
  const uploadOne = async (_file: File): Promise<{ url: string; name: string } | null> => {
    return null;
  };

  const guardar = async () => {
    if (!motivo.trim()) return;
    setSaving(true); setErr(null);
    try {
      const f1 = fotos[0] ? await uploadOne(fotos[0]) : null;
      const f2 = fotos[1] ? await uploadOne(fotos[1]) : null;
      const row = await mandarRepFn({ data: {
        numeroMolde, motivo: motivo.trim(),
        fotoUrl1: f1?.url ?? null, fotoNombre1: f1?.name ?? null,
        fotoUrl2: f2?.url ?? null, fotoNombre2: f2?.name ?? null,
        numeroOf,
      }});
      await onSaved((row as { id?: string })?.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al guardar");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Mandar a reparación</h2>
          <button onClick={onClose} className="rounded-full bg-secondary p-1"><X className="h-4 w-4" /></button>
        </div>
        <div className="text-xs text-muted-foreground">Molde <b>{numeroMolde}</b> · OF {numeroOf}</div>
        <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3}
          placeholder="Motivo de la reparación"
          className="w-full rounded-md border border-input bg-background p-2 text-sm" autoFocus />

        <div>
          <div className="text-xs font-medium mb-1">Fotos (máx. 2)</div>
          <div className="flex gap-2">
            {previews.map((src, i) => (
              <div key={i} className="relative">
                <img src={src} alt="" className="h-20 w-20 rounded-md object-cover" />
                <button onClick={() => removeFoto(i)} className="absolute -top-1 -right-1 rounded-full bg-destructive p-0.5 text-destructive-foreground">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {fotos.length < 2 && (
              <button onClick={() => fileRef.current?.click()}
                className="h-20 w-20 rounded-md border-2 border-dashed border-border bg-background flex items-center justify-center text-muted-foreground">
                <Camera className="h-5 w-5" />
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) addFoto(f); e.target.value = ""; }} />
        </div>

        {err && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">{err}</div>}

        <div className="flex gap-2">
          <button onClick={onClose} className="h-10 flex-1 rounded-md border border-border bg-secondary text-sm">Cancelar</button>
          <button
            disabled={!motivo.trim() || saving}
            onClick={guardar}
            className="h-10 flex-1 rounded-md bg-destructive text-sm font-semibold text-destructive-foreground disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Enviar a reparación
          </button>
        </div>
      </div>
    </div>
  );
}

function ObservacionDialog({
  puesto,
  processFn,
  onClose,
  onSave,
}: {
  puesto: Puesto | null;
  processFn: ProcessIncidenciaFn;
  onClose: () => void;
  onSave: (texto: string) => Promise<void>;
}) {
  const [modo, setModo] = useState<"voz" | "texto">("voz");
  const [texto, setTexto] = useState("");
  const [transcripcion, setTranscripcion] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const timerDisplayRef = useRef<HTMLSpanElement>(null);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
  }, []);

  const procesarAudio = async (blob: Blob, mimeType: string) => {
    if (!puesto) { setError("Tu usuario no tiene puesto asignado para usar voz."); return; }
    setProcessing(true); setError(null);
    try {
      const audioBase64 = await blobToBase64(blob);
      const result = await processFn({ data: { audioBase64, mimeType, puesto } });
      setTranscripcion(result.transcripcion || null);
      setTexto(result.descripcion || result.transcripcion || "");
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
        elapsedRef.current = 0;
        if (timerDisplayRef.current) timerDisplayRef.current.textContent = "0:00";
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        await procesarAudio(blob, mr.mimeType || "audio/webm");
      };
      mr.start();
      mediaRecorderRef.current = mr;
      elapsedRef.current = 0;
      setRecording(true);
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        if (timerDisplayRef.current) timerDisplayRef.current.textContent = formatAudioTime(elapsedRef.current);
      }, 1000);
    } catch {
      setError("No se pudo acceder al micrófono.");
    }
  };

  const stopRecording = () => mediaRecorderRef.current?.stop();

  const guardar = async () => {
    const t = texto.trim();
    if (!t) return;
    setSaving(true); setError(null);
    try { await onSave(t); }
    catch (e) { setError(e instanceof Error ? e.message : "Error al guardar."); }
    finally { setSaving(false); }
  };

  const disabled = processing || saving;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Fabricación con observación</h2>
          <button onClick={onClose} className="rounded-full bg-secondary p-1"><X className="h-4 w-4" /></button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setModo("voz")}
            className={`h-10 rounded-md border text-sm font-medium ${modo === "voz" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary"}`}>
            Voz
          </button>
          <button type="button" onClick={() => { setModo("texto"); setTranscripcion(null); }}
            className={`h-10 rounded-md border text-sm font-medium ${modo === "texto" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary"}`}>
            Escribir
          </button>
        </div>

        {modo === "voz" && (
          <div className="space-y-3 rounded-xl border border-border bg-background p-3">
            <button type="button" onClick={() => (recording ? stopRecording() : startRecording())} disabled={disabled}
              className={`flex h-12 w-full items-center justify-center gap-2 rounded-md text-sm font-semibold disabled:opacity-60 ${recording ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}>
              {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : recording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              {processing ? "Analizando audio…" : recording ? <>Parar grabación (<span ref={timerDisplayRef}>0:00</span>)</> : "Grabar observación con IA"}
            </button>
            {transcripcion && (
              <div className="rounded-md border border-border bg-card p-2 text-xs text-muted-foreground">
                <div className="mb-1 font-medium text-foreground">Transcripción IA</div>
                {transcripcion}
              </div>
            )}
          </div>
        )}

        {modo === "texto" && (
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={4}
            placeholder="Ej: molde nuevo, controlar, duda técnica…"
            className="w-full rounded-md border border-input bg-background p-2 text-sm" autoFocus />
        )}

        {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}

        <div className="flex gap-2">
          <button onClick={onClose} className="h-10 flex-1 rounded-md border border-border bg-secondary text-sm">Cancelar</button>
          <button disabled={!texto.trim() || disabled || recording} onClick={guardar}
            className="h-10 flex-1 rounded-md bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

type AlertaItem = {
  tipo: "recomendacion_molde" | "recomendacion_bloqueo" | "estado_canal";
  severidad: "observacion" | "bloqueo";
  id: string;
  titulo: string;
  detalle: string;
  autor: string | null;
  fecha: string | null;
  fotoUrl: string | null;
};

function AlertasDialog({ alertas, onClose, onVista }: {
  alertas: AlertaItem[];
  onClose: () => void;
  onVista: (a: AlertaItem) => Promise<void>;
}) {
  const [fotosAbiertas, setFotosAbiertas] = useState<Record<string, boolean>>({});
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 space-y-3 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Alertas del molde</h2>
          <button onClick={onClose} className="rounded-full bg-secondary p-1"><X className="h-4 w-4" /></button>
        </div>
        {alertas.length === 0 && <p className="text-sm text-muted-foreground">Sin alertas pendientes.</p>}
        <ul className="space-y-2">
          {alertas.map((a) => {
            const key = `${a.tipo}:${a.id}`;
            const fotoAbierta = fotosAbiertas[key];
            return (
              <li key={key} className={`rounded-lg border p-3 ${a.severidad === "bloqueo" ? "border-destructive/50 bg-destructive/10" : "border-amber-500/50 bg-amber-500/10"}`}>
                <div className="text-xs font-bold uppercase tracking-wide opacity-80">{a.titulo}</div>
                <p className="mt-1 text-sm">{a.detalle}</p>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {a.autor ?? "—"}{a.fecha ? ` · ${new Date(a.fecha).toLocaleString()}` : ""}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => onVista(a)}
                    className="inline-flex h-8 items-center gap-1 rounded-md bg-secondary px-2 text-xs font-semibold"
                  >
                    <Eye className="h-3 w-3" /> Marcar como vista
                  </button>
                  {a.fotoUrl && !fotoAbierta && (
                    <button
                      onClick={() => setFotosAbiertas((p) => ({ ...p, [key]: true }))}
                      className="inline-flex h-8 items-center gap-1 rounded-md bg-secondary px-2 text-xs font-semibold"
                    >
                      <Eye className="h-3 w-3" /> Ver foto
                    </button>
                  )}
                </div>
                {a.fotoUrl && fotoAbierta && (
                  <a href={a.fotoUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                    <img src={a.fotoUrl} alt="Foto de la alerta" loading="lazy" className="max-h-64 w-full rounded-md border border-border object-contain" />
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}


function BloqueoDialog({ canal, numeroMolde, puesto, processFn, onClose, onSave }: {
  canal: "basicos" | "delicados" | "ambos";
  numeroMolde: string;
  puesto: Puesto | null;
  processFn: ProcessIncidenciaFn;
  onClose: () => void;
  onSave: (data: { motivo: string; transcripcion: string | null; fotoUrl: string | null }) => Promise<void>;
}) {
  const [motivo, setMotivo] = useState("");
  const [transcripcion, setTranscripcion] = useState<string | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    if (!puesto) { setError("Sin puesto asignado para usar voz."); return; }
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        setProcessing(true);
        try {
          const audioBase64 = await blobToBase64(blob);
          const result = await processFn({ data: { audioBase64, mimeType: mr.mimeType || "audio/webm", puesto } });
          const texto = result.descripcion || result.transcripcion || "";
          setTranscripcion(result.transcripcion || null);
          if (!motivo.trim()) setMotivo(texto);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Error al procesar audio.");
        } finally { setProcessing(false); }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch { setError("No se pudo acceder al micrófono."); }
  };
  const stopRecording = () => { mediaRecorderRef.current?.stop(); };

  const fotoInputRef = useRef<HTMLInputElement>(null);

  const guardar = async () => {
    setSaving(true); setError(null);
    try {
      let fotoUrl: string | null = null;
      // TODO: subir foto a almacenamiento real cuando esté disponible
      void fotoFile;
      await onSave({ motivo: motivo.trim(), transcripcion, fotoUrl });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar.");
    } finally { setSaving(false); }
  };


  const canalLabel = canal === "basicos" ? "Básicos" : canal === "delicados" ? "Delicados" : "Ambos";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 space-y-3 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Bloquear {canalLabel}</h2>
          <button onClick={onClose} className="rounded-full bg-secondary p-1"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-xs text-muted-foreground">Molde <b className="text-foreground">{numeroMolde}</b></p>

        <button
          type="button"
          onClick={() => (recording ? stopRecording() : startRecording())}
          disabled={processing || saving}
          className={`flex h-12 w-full items-center justify-center gap-2 rounded-md text-sm font-semibold disabled:opacity-60 ${recording ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}
        >
          {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : recording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          {processing ? "Procesando…" : recording ? "Parar grabación" : "Grabar motivo (voz IA)"}
        </button>

        <div>
          <label className="text-xs font-medium">Motivo (texto opcional)</label>
          <textarea
            value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3}
            placeholder="Describe el motivo del bloqueo"
            className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-medium">Foto (opcional)</label>
          <input
            ref={fotoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setFotoFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fotoInputRef.current?.click()}
            className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-md border border-input bg-background text-sm font-medium hover:bg-secondary"
          >
            <Camera className="h-4 w-4" />
            {fotoFile ? "Cambiar foto" : "Añadir foto"}
          </button>
          {fotoFile && <p className="mt-1 truncate text-[10px] text-muted-foreground">{fotoFile.name}</p>}
        </div>

        {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}

        <div className="flex gap-2">
          <button onClick={onClose} className="h-10 flex-1 rounded-md border border-border bg-secondary text-sm">Cancelar</button>
          <button
            disabled={saving || processing}
            onClick={guardar}
            className="h-10 flex-1 rounded-md bg-destructive text-sm font-semibold text-destructive-foreground disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
            Bloquear
          </button>
        </div>

      </div>
    </div>
  );
}

