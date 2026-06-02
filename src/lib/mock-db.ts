import { v4 as uuid } from "crypto";

function id() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function daysAgo(n: number) { return new Date(Date.now() - n * 86400000).toISOString(); }

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type Molde = {
  numero_molde: string; medida: string | null; modelo: string | null;
  activo: boolean; notas: string | null; codigo_rfid_futuro: string | null; created_at: string;
};
export type MoldeModelo = { numero_molde: string; modelo: string };
export type EstadoMolde = {
  id: string; numero_molde: string; estado_actual: string; puede_fabricar: boolean;
  restriccion_color: string | null; recomendacion_actual: string | null;
  incidencia_activa_id: string | null; decidido_por_usuario_id: string | null;
  decidido_por_nombre: string | null; fecha_decision: string | null;
  estado_basicos: string; motivo_basicos: string | null;
  fecha_estado_basicos: string | null; decidido_por_basicos_id: string | null; decidido_por_basicos_nombre: string | null;
  estado_delicados: string; motivo_delicados: string | null;
  fecha_estado_delicados: string | null; decidido_por_delicados_id: string | null; decidido_por_delicados_nombre: string | null;
};
export type Fabricacion = {
  id: string; numero_of: string; modelo: string | null; medida: string | null; color: string | null;
  numero_molde: string; usuario_id: string; usuario_nombre: string; puesto: string | null;
  resultado: string; texto_incidencia: string | null; observacion: string | null;
  incidencia_id: string | null; reparacion_id: string | null; fecha_hora: string;
  eliminada: boolean; motivo_eliminacion: string | null;
};
export type Incidencia = {
  id: string; molde: string; descripcion: string; transcripcion: string | null;
  motivo_corto: string | null; zona: string | null; color: string | null;
  foto_url: string | null; foto_url_2: string | null; estado_molde: string | null;
  tipo_fallo: string | null; user_id: string; puesto: string | null; estado: string; created_at: string;
};
export type Reparacion = {
  id: string; molde: string; descripcion: string; transcripcion: string | null;
  motivo_corto: string | null; user_id: string; puesto: string; estado: string;
  foto_url: string | null; foto_nombre: string | null; foto_url_2: string | null; foto_nombre_2: string | null;
  numero_of: string | null; descripcion_reparacion: string | null;
  fecha_envio: string; fecha_reparacion: string | null;
};
export type Color = { id: string; color: string; tipo_color: string; permite_molde_con_incidencia: boolean; activo: boolean };
export type Defecto = { id: string; tipo: string; nombre: string; orden: number; activo: boolean };
export type RecomendacionMolde = {
  id: string; numero_molde: string; usuario_id: string; usuario_nombre: string;
  puesto: string | null; recomendacion: string; texto_original: string | null;
  foto_url: string | null; incidencia_relacionada_id: string | null; revisada: boolean; fecha_hora: string;
};
export type RecomendacionBloqueo = {
  id: string; numero_molde: string; canal: string; motivo: string;
  usuario_id: string; usuario_nombre: string; puesto: string | null;
  estado: string; foto_url: string | null; transcripcion: string | null;
  motivo_revision: string | null; created_at: string;
};
export type IncidenciaProducto = {
  id: string; descripcion: string; transcripcion: string | null; motivo_corto: string | null;
  molde: string | null; pedido: string | null; origen: string | null;
  defectos: string[]; user_id: string; puesto: string | null; foto_url: string | null; created_at: string;
};
export type PicadaOf = {
  id: string; numero_of: string; modelo: string | null; medida: string | null; color: string | null;
  numero_molde: string; usuario_id: string; usuario_nombre: string; puesto: string | null;
  resultado: string; incidencia_id: string | null; recomendacion_id: string | null;
  estado_molde_en_momento: string | null; puede_fabricar: boolean; tenia_incidencia_activa: boolean; fecha_hora: string;
};
export type HistorialCambioOf = {
  id: string; fabricacion_id: string; molde_anterior: string; molde_nuevo: string;
  motivo: string; usuario_id: string; usuario_nombre: string; created_at: string;
};
export type AlertaVista = { id: string; user_id: string; tipo: string; referencia_id: string; numero_molde: string; created_at: string };
export type OfMoldeAsignado = {
  numero_of: string; numero_molde: string; modelo: string | null; medida: string | null; color: string | null;
  asignado_por_id: string; asignado_por_nombre: string; puesto: string | null; created_at: string;
};

// ─── Datos iniciales ──────────────────────────────────────────────────────────

export const moldes: Molde[] = [
  { numero_molde: "514", medida: "70x120", modelo: "PIZARRA", activo: true, notas: null, codigo_rfid_futuro: null, created_at: daysAgo(300) },
  { numero_molde: "132", medida: "80x140", modelo: "PIZARRA", activo: true, notas: "Revisado en última campaña", codigo_rfid_futuro: null, created_at: daysAgo(280) },
  { numero_molde: "069", medida: "70x100", modelo: "LISO", activo: true, notas: null, codigo_rfid_futuro: null, created_at: daysAgo(250) },
  { numero_molde: "089", medida: "80x120", modelo: "LISO", activo: true, notas: null, codigo_rfid_futuro: null, created_at: daysAgo(240) },
  { numero_molde: "101", medida: "90x90", modelo: "SEMI PIZARRA", activo: true, notas: null, codigo_rfid_futuro: null, created_at: daysAgo(220) },
  { numero_molde: "218", medida: "90x90", modelo: "CUADRADO PIZARRA", activo: true, notas: "Canal básicos con observación", codigo_rfid_futuro: null, created_at: daysAgo(200) },
  { numero_molde: "301", medida: "60x90", modelo: "LISO", activo: true, notas: null, codigo_rfid_futuro: null, created_at: daysAgo(180) },
  { numero_molde: "445", medida: "70x120", modelo: "SEMI PIZARRA", activo: true, notas: null, codigo_rfid_futuro: null, created_at: daysAgo(160) },
  { numero_molde: "502", medida: "80x140", modelo: "CUADRADO PIZARRA", activo: false, notas: "Dado de baja por grieta profunda", codigo_rfid_futuro: null, created_at: daysAgo(140) },
  { numero_molde: "610", medida: "90x90", modelo: "PIZARRA", activo: true, notas: null, codigo_rfid_futuro: null, created_at: daysAgo(120) },
];

export const moldeModelos: MoldeModelo[] = [
  { numero_molde: "514", modelo: "PIZARRA" },
  { numero_molde: "514", modelo: "SEMI PIZARRA" },
  { numero_molde: "132", modelo: "PIZARRA" },
  { numero_molde: "069", modelo: "LISO" },
  { numero_molde: "089", modelo: "LISO" },
  { numero_molde: "089", modelo: "SEMI PIZARRA" },
  { numero_molde: "101", modelo: "SEMI PIZARRA" },
  { numero_molde: "218", modelo: "CUADRADO PIZARRA" },
  { numero_molde: "301", modelo: "LISO" },
  { numero_molde: "445", modelo: "SEMI PIZARRA" },
  { numero_molde: "445", modelo: "PIZARRA" },
  { numero_molde: "502", modelo: "CUADRADO PIZARRA" },
  { numero_molde: "610", modelo: "PIZARRA" },
];

export const estadosMolde: EstadoMolde[] = [
  {
    id: "est-514", numero_molde: "514", estado_actual: "ok", puede_fabricar: true,
    restriccion_color: null, recomendacion_actual: null, incidencia_activa_id: null,
    decidido_por_usuario_id: "admin-001", decidido_por_nombre: "Administrador", fecha_decision: daysAgo(5),
    estado_basicos: "ok", motivo_basicos: null, fecha_estado_basicos: null, decidido_por_basicos_id: null, decidido_por_basicos_nombre: null,
    estado_delicados: "ok", motivo_delicados: null, fecha_estado_delicados: null, decidido_por_delicados_id: null, decidido_por_delicados_nombre: null,
  },
  {
    id: "est-132", numero_molde: "132", estado_actual: "observacion", puede_fabricar: true,
    restriccion_color: null, recomendacion_actual: "Revisar cierre antes de cada uso", incidencia_activa_id: null,
    decidido_por_usuario_id: "admin-001", decidido_por_nombre: "Administrador", fecha_decision: daysAgo(3),
    estado_basicos: "observacion", motivo_basicos: "Cierre con desgaste", fecha_estado_basicos: daysAgo(3), decidido_por_basicos_id: "admin-001", decidido_por_basicos_nombre: "Administrador",
    estado_delicados: "ok", motivo_delicados: null, fecha_estado_delicados: null, decidido_por_delicados_id: null, decidido_por_delicados_nombre: null,
  },
  {
    id: "est-218", numero_molde: "218", estado_actual: "mandar_reparacion", puede_fabricar: false,
    restriccion_color: null, recomendacion_actual: null, incidencia_activa_id: "inc-218",
    decidido_por_usuario_id: "admin-001", decidido_por_nombre: "Administrador", fecha_decision: daysAgo(1),
    estado_basicos: "bloqueado", motivo_basicos: "Grieta en canal principal", fecha_estado_basicos: daysAgo(1), decidido_por_basicos_id: "admin-001", decidido_por_basicos_nombre: "Administrador",
    estado_delicados: "bloqueado", motivo_delicados: "Grieta en canal principal", fecha_estado_delicados: daysAgo(1), decidido_por_delicados_id: "admin-001", decidido_por_delicados_nombre: "Administrador",
  },
];

export const fabricaciones: Fabricacion[] = [
  { id: "fab-001", numero_of: "OF-2025-0045", modelo: "PIZARRA", medida: "70x120", color: "Antracita", numero_molde: "514", usuario_id: "admin-001", usuario_nombre: "Administrador", puesto: "desmoldeo", resultado: "fabricacion_ok", texto_incidencia: null, observacion: null, incidencia_id: null, reparacion_id: null, fecha_hora: daysAgo(1), eliminada: false, motivo_eliminacion: null },
  { id: "fab-002", numero_of: "OF-2025-0045", modelo: "PIZARRA", medida: "70x120", color: "Antracita", numero_molde: "132", usuario_id: "admin-001", usuario_nombre: "Administrador", puesto: "desmoldeo", resultado: "fabricacion_con_observacion", texto_incidencia: null, observacion: "Pequeño poro en esquina", incidencia_id: null, reparacion_id: null, fecha_hora: daysAgo(1), eliminada: false, motivo_eliminacion: null },
  { id: "fab-003", numero_of: "OF-2025-0046", modelo: "LISO", medida: "70x100", color: "Blanco", numero_molde: "069", usuario_id: "admin-001", usuario_nombre: "Administrador", puesto: "desmoldeo", resultado: "fabricacion_ok", texto_incidencia: null, observacion: null, incidencia_id: null, reparacion_id: null, fecha_hora: daysAgo(2), eliminada: false, motivo_eliminacion: null },
  { id: "fab-004", numero_of: "OF-2025-0046", modelo: "LISO", medida: "70x100", color: "Blanco", numero_molde: "089", usuario_id: "admin-001", usuario_nombre: "Administrador", puesto: "desmoldeo", resultado: "fabricacion_con_incidencia", texto_incidencia: "Roto en desmoldeo", observacion: null, incidencia_id: "inc-089", reparacion_id: null, fecha_hora: daysAgo(2), eliminada: false, motivo_eliminacion: null },
  { id: "fab-005", numero_of: "OF-2025-0047", modelo: "SEMI PIZARRA", medida: "90x90", color: "Gris", numero_molde: "101", usuario_id: "admin-001", usuario_nombre: "Administrador", puesto: "desmoldeo", resultado: "fabricacion_ok", texto_incidencia: null, observacion: null, incidencia_id: null, reparacion_id: null, fecha_hora: daysAgo(3), eliminada: false, motivo_eliminacion: null },
  { id: "fab-006", numero_of: "OF-2025-0047", modelo: "SEMI PIZARRA", medida: "90x90", color: "Gris", numero_molde: "445", usuario_id: "admin-001", usuario_nombre: "Administrador", puesto: "desmoldeo", resultado: "enviado_reparacion", texto_incidencia: "Grieta lateral", observacion: null, incidencia_id: null, reparacion_id: "rep-001", fecha_hora: daysAgo(3), eliminada: false, motivo_eliminacion: null },
  { id: "fab-007", numero_of: "OF-2025-0048", modelo: "PIZARRA", medida: "80x140", color: "Beige", numero_molde: "610", usuario_id: "admin-001", usuario_nombre: "Administrador", puesto: "desmoldeo", resultado: "fabricacion_ok", texto_incidencia: null, observacion: null, incidencia_id: null, reparacion_id: null, fecha_hora: daysAgo(4), eliminada: false, motivo_eliminacion: null },
  { id: "fab-008", numero_of: "OF-2025-0043", modelo: "LISO", medida: "80x120", color: "Negro", numero_molde: "301", usuario_id: "admin-001", usuario_nombre: "Administrador", puesto: "desmoldeo", resultado: "fabricacion_ok", texto_incidencia: null, observacion: null, incidencia_id: null, reparacion_id: null, fecha_hora: daysAgo(5), eliminada: false, motivo_eliminacion: null },
];

export const incidencias: Incidencia[] = [
  { id: "inc-089", molde: "089", descripcion: "Rotura en ángulo durante el desmoldeo. Pieza con fisura visible.", transcripcion: null, motivo_corto: "Roto", zona: "esquina", color: "Blanco", foto_url: null, foto_url_2: null, estado_molde: "observacion", tipo_fallo: "molde", user_id: "admin-001", puesto: "desmoldeo", estado: "pendiente", created_at: daysAgo(2) },
  { id: "inc-218", molde: "218", descripcion: "Grieta profunda en el canal principal. No apto para fabricar.", transcripcion: null, motivo_corto: "Grieta", zona: "canal", color: null, foto_url: null, foto_url_2: null, estado_molde: "mandar_reparacion", tipo_fallo: "molde", user_id: "admin-001", puesto: "preparacion_molde", estado: "pendiente", created_at: daysAgo(1) },
  { id: "inc-514", molde: "514", descripcion: "Superficie con depósito de silicona. Limpieza necesaria antes del siguiente uso.", transcripcion: null, motivo_corto: "Silicona", zona: "superficie", color: "Antracita", foto_url: null, foto_url_2: null, estado_molde: "seguir_produccion", tipo_fallo: "proceso", user_id: "admin-001", puesto: "preparacion_molde", estado: "reparado", created_at: daysAgo(10) },
];

export const reparaciones: Reparacion[] = [
  { id: "rep-001", molde: "445", descripcion: "Grieta lateral — requiere soldadura y pulido", transcripcion: null, motivo_corto: "Grieta", user_id: "admin-001", puesto: "preparacion_molde", estado: "en_reparacion", foto_url: null, foto_nombre: null, foto_url_2: null, foto_nombre_2: null, numero_of: "OF-2025-0047", descripcion_reparacion: null, fecha_envio: daysAgo(3), fecha_reparacion: null },
  { id: "rep-002", molde: "514", descripcion: "Limpieza profunda de silicona acumulada", transcripcion: null, motivo_corto: "Silicona", user_id: "admin-001", puesto: "preparacion_molde", estado: "reparado", foto_url: null, foto_nombre: null, foto_url_2: null, foto_nombre_2: null, numero_of: null, descripcion_reparacion: "Limpiado con disolvente y pulido", fecha_envio: daysAgo(12), fecha_reparacion: daysAgo(10) },
  { id: "rep-003", molde: "089", descripcion: "Reparación de ángulo roto", transcripcion: null, motivo_corto: "Roto", user_id: "admin-001", puesto: "reparacion_moldes", estado: "en_reparacion", foto_url: null, foto_nombre: null, foto_url_2: null, foto_nombre_2: null, numero_of: null, descripcion_reparacion: null, fecha_envio: daysAgo(2), fecha_reparacion: null },
];

export const colores: Color[] = [
  { id: "col-001", color: "Antracita", tipo_color: "basico", permite_molde_con_incidencia: false, activo: true },
  { id: "col-002", color: "Beige", tipo_color: "basico", permite_molde_con_incidencia: true, activo: true },
  { id: "col-003", color: "Blanco", tipo_color: "basico", permite_molde_con_incidencia: true, activo: true },
  { id: "col-004", color: "Negro", tipo_color: "basico", permite_molde_con_incidencia: false, activo: true },
  { id: "col-005", color: "Gris", tipo_color: "basico", permite_molde_con_incidencia: true, activo: true },
  { id: "col-006", color: "Terracota", tipo_color: "delicado", permite_molde_con_incidencia: false, activo: true },
  { id: "col-007", color: "Burdeos", tipo_color: "delicado", permite_molde_con_incidencia: false, activo: true },
  { id: "col-008", color: "Azul marino", tipo_color: "delicado", permite_molde_con_incidencia: false, activo: true },
  { id: "col-009", color: "Verde oliva", tipo_color: "delicado", permite_molde_con_incidencia: false, activo: true },
  { id: "col-010", color: "Ocre", tipo_color: "delicado", permite_molde_con_incidencia: true, activo: true },
];

export const defectos: Defecto[] = [
  { id: "def-001", tipo: "superficie", nombre: "Poro visible", orden: 1, activo: true },
  { id: "def-002", tipo: "superficie", nombre: "Raya profunda", orden: 2, activo: true },
  { id: "def-003", tipo: "estructura", nombre: "Grieta", orden: 3, activo: true },
  { id: "def-004", tipo: "estructura", nombre: "Rotura parcial", orden: 4, activo: true },
  { id: "def-005", tipo: "acabado", nombre: "Color irregular", orden: 5, activo: true },
  { id: "def-006", tipo: "acabado", nombre: "Rebaba excesiva", orden: 6, activo: true },
  { id: "def-007", tipo: "dimensional", nombre: "Fuera de medida", orden: 7, activo: true },
  { id: "def-008", tipo: "dimensional", nombre: "Deformación", orden: 8, activo: true },
];

export const recomendacionesMolde: RecomendacionMolde[] = [
  { id: "rec-001", numero_molde: "132", usuario_id: "admin-001", usuario_nombre: "Administrador", puesto: "preparacion_molde", recomendacion: "Revisar cierre antes de cada turno", texto_original: null, foto_url: null, incidencia_relacionada_id: null, revisada: false, fecha_hora: daysAgo(3) },
  { id: "rec-002", numero_molde: "514", usuario_id: "admin-001", usuario_nombre: "Administrador", puesto: "desmoldeo", recomendacion: "Aplicar desmoldeante extra en zona central", texto_original: null, foto_url: null, incidencia_relacionada_id: null, revisada: true, fecha_hora: daysAgo(15) },
];

export const recomendacionesBloqueo: RecomendacionBloqueo[] = [
  { id: "bloq-001", numero_molde: "101", canal: "delicados", motivo: "Se están produciendo muchos poros en colores delicados", usuario_id: "admin-001", usuario_nombre: "Administrador", puesto: "repaso", estado: "pendiente", foto_url: null, transcripcion: null, motivo_revision: null, created_at: daysAgo(2) },
];

export const incidenciasProducto: IncidenciaProducto[] = [
  { id: "ip-001", descripcion: "Piezas con poros en superficie visible", transcripcion: null, motivo_corto: "Poros", molde: "514", pedido: "PED-2025-112", origen: "repaso", defectos: ["def-001"], user_id: "admin-001", puesto: "repaso", foto_url: null, created_at: daysAgo(2) },
  { id: "ip-002", descripcion: "Color irregular en lote de Burdeos", transcripcion: null, motivo_corto: "Color irregular", molde: null, pedido: "PED-2025-113", origen: "empaquetado", defectos: ["def-005"], user_id: "admin-001", puesto: "empaquetado", foto_url: null, created_at: daysAgo(4) },
  { id: "ip-003", descripcion: "Rotura en esquina durante embalaje", transcripcion: null, motivo_corto: "Rotura", molde: "089", pedido: "PED-2025-108", origen: "empaquetado", defectos: ["def-004"], user_id: "admin-001", puesto: "empaquetado", foto_url: null, created_at: daysAgo(6) },
];

export const picadasOf: PicadaOf[] = [];
export const historialCambiosOf: HistorialCambioOf[] = [];
export const alertasVistas: AlertaVista[] = [];
export const ofMoldesAsignados: OfMoldeAsignado[] = [];
