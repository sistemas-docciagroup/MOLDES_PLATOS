export type Puesto =
  | "preparacion_molde"
  | "desmoldeo"
  | "repaso"
  | "valvula"
  | "empaquetado"
  | "reparacion_moldes";

export type Rol = "operario" | "encargado" | "administrador";
export type Gravedad = "baja" | "media" | "alta";
export type EstadoIncidencia = "pendiente" | "reparado" | "descartado";
export type EstadoReparacion = "en_reparacion" | "reparado" | "descartado";

export const PUESTOS: { value: Puesto; label: string; zona: "arriba" | "abajo" }[] = [
  { value: "preparacion_molde", label: "Preparación molde", zona: "arriba" },
  { value: "desmoldeo", label: "Desmoldeo", zona: "arriba" },
  { value: "repaso", label: "Repaso", zona: "abajo" },
  { value: "valvula", label: "Válvula", zona: "abajo" },
  { value: "empaquetado", label: "Empaquetado", zona: "abajo" },
  { value: "reparacion_moldes", label: "Reparación de moldes", zona: "abajo" },
];

export const ROLES: { value: Rol; label: string }[] = [
  { value: "operario", label: "Operario" },
  { value: "encargado", label: "Encargado" },
  { value: "administrador", label: "Administrador" },
];

export const MOTIVOS_POR_PUESTO: Record<Puesto, string[]> = {
  preparacion_molde: [
    "Sucio", "Roto", "Grieta", "Desgaste", "Silicona",
    "Cierre", "Desmoldeante", "Falta material", "Molde incorrecto",
  ],
  desmoldeo: [
    "Roto", "Pegado", "Esquina", "Grieta", "Deformado",
    "Vacío", "Superficie", "Curado", "Desechado",
  ],
  repaso: [
    "Poros", "Rayas", "Desconchón", "Acabado", "Reparado",
    "Rechazado", "Lijado", "Superficie", "Color",
  ],
  valvula: [
    "Centrado", "Rota", "Fuga", "Rosca", "Medida",
    "Montaje", "Falta pieza",
  ],
  empaquetado: [
    "Roto", "Embalaje", "Cartón", "Etiqueta", "Equivocado",
    "Golpe", "Pedido",
  ],
  reparacion_moldes: [
    "Soldadura", "Pulido", "Mecanizado", "Cambio pieza",
    "Limpieza", "Ajuste", "Sustituido", "No reparable",
  ],
};

export const puestoLabel = (p: Puesto | string | null | undefined) =>
  PUESTOS.find((x) => x.value === p)?.label ?? "—";

export const rolLabel = (r: Rol | string | null | undefined) =>
  ROLES.find((x) => x.value === r)?.label ?? "—";
