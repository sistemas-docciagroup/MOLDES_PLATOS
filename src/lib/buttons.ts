// Catálogo central de botones controlables por permisos.
// La fuente de verdad de visibilidad es la tabla permisos_puesto_botones.

export type ButtonId =
  | "btn_registrar_incidencia"
  | "btn_grabar_voz"
  | "btn_anadir_foto"
  | "btn_estado_moldes"
  | "btn_buscar_molde"
  | "btn_historial_molde"
  | "btn_mandar_reparacion"
  | "btn_moldes_reparacion"
  | "btn_validar_reparacion"
  | "btn_cambiar_estado"
  | "btn_panel_admin"
  | "btn_usuarios"
  | "btn_estadisticas"
  | "btn_permisos_puesto"
  | "btn_exportar"
  | "btn_filtros"
  | "btn_ver_foto"
  | "btn_eliminar_incidencia"
  | "btn_editar_incidencia"
  | "btn_incidencias_producto"
  | "btn_picar_of"
  | "btn_of_fabricadas"
  | "btn_cambiar_molde_of"
  | "btn_borrar_of"
  | "btn_bloquear_canal"
  | "btn_recomendaciones_bloqueo";

export type ButtonCategoria = "incidencia" | "moldes" | "reparacion" | "admin" | "acciones";

export type ButtonMeta = { id: ButtonId; name: string; categoria: ButtonCategoria };

export const BUTTONS: ButtonMeta[] = [
  { id: "btn_registrar_incidencia", name: "Registrar incidencia", categoria: "incidencia" },
  { id: "btn_grabar_voz", name: "Grabar voz", categoria: "incidencia" },
  { id: "btn_anadir_foto", name: "Añadir foto", categoria: "incidencia" },
  { id: "btn_estado_moldes", name: "Moldes con incidencia", categoria: "moldes" },
  { id: "btn_buscar_molde", name: "Buscar molde / historial incidencias", categoria: "moldes" },
  { id: "btn_historial_molde", name: "Historial molde", categoria: "moldes" },
  { id: "btn_mandar_reparacion", name: "Mandar a reparación", categoria: "reparacion" },
  { id: "btn_moldes_reparacion", name: "Moldes en reparación", categoria: "reparacion" },
  { id: "btn_validar_reparacion", name: "Validar reparación", categoria: "reparacion" },
  { id: "btn_cambiar_estado", name: "Cambiar estado", categoria: "acciones" },
  { id: "btn_panel_admin", name: "Panel admin", categoria: "admin" },
  { id: "btn_usuarios", name: "Usuarios", categoria: "admin" },
  { id: "btn_estadisticas", name: "Estadísticas", categoria: "admin" },
  { id: "btn_permisos_puesto", name: "Permisos por puesto", categoria: "admin" },
  { id: "btn_exportar", name: "Exportar", categoria: "acciones" },
  { id: "btn_filtros", name: "Filtros", categoria: "acciones" },
  { id: "btn_ver_foto", name: "Ver foto", categoria: "acciones" },
  { id: "btn_eliminar_incidencia", name: "Eliminar incidencia", categoria: "acciones" },
  { id: "btn_editar_incidencia", name: "Editar incidencia", categoria: "acciones" },
  { id: "btn_incidencias_producto", name: "Incidencias de producto", categoria: "incidencia" },
  { id: "btn_picar_of", name: "Picar OF", categoria: "incidencia" },
  { id: "btn_of_fabricadas", name: "OF fabricadas", categoria: "acciones" },
  { id: "btn_cambiar_molde_of", name: "Cambiar molde de OF", categoria: "acciones" },
  { id: "btn_borrar_of", name: "Borrar OF", categoria: "acciones" },
  { id: "btn_bloquear_canal", name: "Bloquear básico/delicado", categoria: "acciones" },
  { id: "btn_recomendaciones_bloqueo", name: "Recomendaciones de bloqueo", categoria: "acciones" },
];

export const PERMISO_SCOPES = [
  "preparacion_molde",
  "desmoldeo",
  "repaso",
  "valvula",
  "empaquetado",
  "reparacion_moldes",
  "encargado",
] as const;

export type PermisoScope = (typeof PERMISO_SCOPES)[number];

export const SCOPE_LABEL: Record<PermisoScope, string> = {
  preparacion_molde: "Preparación molde",
  desmoldeo: "Desmoldeo",
  repaso: "Repaso",
  valvula: "Válvula",
  empaquetado: "Empaquetado",
  reparacion_moldes: "Reparación moldes",
  encargado: "Encargado",
};
