import type { ComponentType, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BarChart3, Boxes, Eye, Search, Send, ShieldCheck, Users, Wrench, PackageOpen, ScanLine, ClipboardList, Palette, Ban, Inbox, Tag } from "lucide-react";
import type { ButtonId } from "@/lib/buttons";

export type NavigationSurface = "home" | "menu" | "header" | "special-route";

export type NavEntry = {
  key: string;
  label: string;
  surfaces: NavigationSurface[];
  icon?: ComponentType<{ className?: string }>;
  buttonId?: ButtonId;
  to?: string;
  params?: Record<string, string>;
  onSelect?: () => void;
  onlyScope?: "admin";
};

const openMandarReparacion = () => {
  window.dispatchEvent(new CustomEvent("open-mandar-reparacion"));
};

export const NAV_ENTRIES: NavEntry[] = [
  {
    key: "home",
    label: "Home",
    surfaces: ["header"],
    to: "/",
  },
  {
    key: "estado-moldes",
    buttonId: "btn_estado_moldes",
    label: "Moldes con incidencia",
    icon: Boxes,
    surfaces: ["home", "menu"],
    to: "/moldes",
  },
  {
    key: "buscar-molde",
    buttonId: "btn_buscar_molde",
    label: "Buscar molde / historial incidencias",
    icon: Search,
    surfaces: ["home", "menu"],
    to: "/molde/$codigo",
    params: { codigo: "_" },
  },
  {
    key: "mandar-reparacion",
    buttonId: "btn_mandar_reparacion",
    label: "Mandar reparación",
    icon: Send,
    surfaces: ["home"],
    onSelect: openMandarReparacion,
  },
  {
    key: "moldes-reparacion",
    buttonId: "btn_moldes_reparacion",
    label: "Moldes en reparación",
    icon: Wrench,
    surfaces: ["home", "menu"],
    to: "/reparaciones",
  },
  {
    key: "incidencias-producto",
    buttonId: "btn_incidencias_producto",
    label: "Incidencias de producto",
    icon: PackageOpen,
    surfaces: ["home", "menu"],
    to: "/incidencias-producto",
  },
  {
    key: "picar-of",
    buttonId: "btn_picar_of",
    label: "Picar OF",
    icon: ScanLine,
    surfaces: ["menu"],
    to: "/picar-of",
  },
  {
    key: "of-fabricadas",
    buttonId: "btn_of_fabricadas",
    label: "OF fabricadas",
    icon: ClipboardList,
    surfaces: ["home", "menu"],
    to: "/of-fabricadas",
  },
  {
    key: "bloquear-canal",
    buttonId: "btn_bloquear_canal",
    label: "Bloquear básico/delicado",
    icon: Ban,
    surfaces: ["home", "menu"],
    to: "/bloquear-canal",
  },
  {
    key: "recomendaciones-bloqueo",
    buttonId: "btn_recomendaciones_bloqueo",
    label: "Recomendaciones de bloqueo",
    icon: Inbox,
    surfaces: ["home", "menu"],
    to: "/recomendaciones-bloqueo",
  },
  {
    key: "gestion-moldes",
    label: "Gestión de moldes",
    icon: Boxes,
    surfaces: ["menu"],
    to: "/gestion-moldes",
    onlyScope: "admin",
  },
  {
    key: "panel-admin",
    buttonId: "btn_panel_admin",
    label: "Panel admin",
    icon: BarChart3,
    surfaces: ["menu"],
    to: "/admin/panel",
  },
  {
    key: "usuarios",
    buttonId: "btn_usuarios",
    label: "Usuarios",
    icon: Users,
    surfaces: ["menu"],
    to: "/admin/usuarios",
  },
  {
    key: "permisos-puesto",
    buttonId: "btn_permisos_puesto",
    label: "Permisos por puesto",
    icon: ShieldCheck,
    surfaces: ["menu"],
    to: "/admin/permisos",
  },
  {
    key: "vista-previa",
    label: "Vista previa por puesto",
    icon: Eye,
    surfaces: ["menu", "special-route"],
    to: "/admin/vista-previa",
    onlyScope: "admin",
  },
  {
    key: "admin-colores",
    label: "Colores de fabricación",
    icon: Palette,
    surfaces: ["menu"],
    to: "/admin/colores",
    onlyScope: "admin",
  },
  {
    key: "admin-defectos",
    label: "Defectos predefinidos",
    icon: Tag,
    surfaces: ["menu"],
    to: "/admin/defectos",
    onlyScope: "admin",
  },
];

export const HOME_BUTTON_IDS: ButtonId[] = NAV_ENTRIES.filter(
  (entry) => entry.buttonId && entry.surfaces.includes("home"),
).map((entry) => entry.buttonId as ButtonId);

export const getNavEntriesForSurface = (surface: NavigationSurface) =>
  NAV_ENTRIES.filter((entry) => entry.surfaces.includes(surface));

export function renderNavEntry(
  entry: NavEntry,
  cls: string,
  inner: ReactNode,
  onAfterSelect?: () => void,
) {
  if (entry.to) {
    if (entry.params) {
      return (
        <Link to={entry.to} params={entry.params} className={cls} onClick={onAfterSelect}>
          {inner}
        </Link>
      );
    }

    return (
      <Link to={entry.to} className={cls} onClick={onAfterSelect}>
        {inner}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        entry.onSelect?.();
        onAfterSelect?.();
      }}
      className={cls}
    >
      {inner}
    </button>
  );
}
