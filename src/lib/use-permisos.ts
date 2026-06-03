import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { createContext, createElement, useContext, type ReactNode } from "react";
import { useAuth } from "./use-auth";
import { BUTTONS, PERMISO_SCOPES, type ButtonId, type PermisoScope } from "./buttons";
import type { Rol, Puesto } from "./constants";

export type PermisoRow = {
  scope: PermisoScope;
  button_id: ButtonId;
  visible: boolean;
};

export type PermisoMap = Record<string, Record<string, boolean>>;

// Mock permisivo: todos los botones visibles para todos los puestos hasta que
// la tabla permisos_puesto_botones esté conectada a la DB.
function buildMockPermisos(): PermisoMap {
  const allButtons = BUTTONS.reduce<Record<string, boolean>>((acc, b) => {
    acc[b.id] = true;
    return acc;
  }, {});
  return PERMISO_SCOPES.reduce<PermisoMap>((acc, scope) => {
    acc[scope] = { ...allButtons };
    return acc;
  }, {});
}

async function fetchPermisos(): Promise<PermisoMap> {
  return buildMockPermisos();
}

function usePermisosMapQuery() {
  const { loading, user } = useAuth();
  const query = useQuery({
    queryKey: ["permisos-puesto-botones"],
    queryFn: fetchPermisos,
    staleTime: 60_000,
    enabled: !loading && !!user,
  });
  return query;
}

const PermisosContext = createContext<UseQueryResult<PermisoMap, Error> | null>(null);

export function PermisosProvider({ children }: { children: ReactNode }) {
  const query = usePermisosMapQuery();
  return createElement(PermisosContext.Provider, { value: query }, children);
}

export function usePermisosMap() {
  const ctx = useContext(PermisosContext);
  if (!ctx) throw new Error("usePermisosMap must be used within PermisosProvider");
  return ctx;
}

export function resolveScope(roles: Rol[], puesto: Puesto | null | undefined): PermisoScope | "admin" | null {
  if (roles.includes("administrador")) return "admin";
  if (roles.includes("encargado")) return "encargado";
  if (puesto) return puesto as PermisoScope;
  return null;
}

export function canShowButton(
  buttonId: ButtonId,
  scope: PermisoScope | "admin" | null,
  map: PermisoMap | undefined,
): boolean {
  if (scope === "admin") return true;
  if (!scope) return false;
  if (!map) return false;
  return map[scope]?.[buttonId] === true;
}

export function hasPermissionData(
  scope: PermisoScope | "admin" | null,
  map: PermisoMap | undefined,
): boolean {
  if (scope === "admin") return true;
  if (!scope || !map) return false;
  return scope in map;
}

export function useRefreshPermisos() {
  const qc = useQueryClient();
  return async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["permisos-puesto-botones"] }),
      qc.refetchQueries({ queryKey: ["permisos-puesto-botones"], type: "active" }),
    ]);
    window.dispatchEvent(new CustomEvent("auth:refresh"));
  };
}

export function useCanShowButton() {
  const { roles, profile } = useAuth();
  const { data: map } = usePermisosMap();
  const override = useContext(PreviewScopeContext);
  const realScope = resolveScope(roles, profile?.puesto);
  const scope = override ? override.scope : realScope;
  const ready = hasPermissionData(scope, map);
  return {
    scope,
    map,
    ready,
    can: (id: ButtonId) => canShowButton(id, scope, map),
  };
}

type PreviewScopeValue = { scope: PermisoScope | "admin"; puesto: Puesto | null };
const PreviewScopeContext = createContext<PreviewScopeValue | null>(null);

export function PreviewScopeProvider({ value, children }: { value: PreviewScopeValue; children: ReactNode }) {
  return createElement(PreviewScopeContext.Provider, { value }, children);
}

export function usePreviewPuesto(fallback: Puesto | null | undefined): Puesto | null {
  const override = useContext(PreviewScopeContext);
  if (override) return override.puesto;
  return (fallback ?? null) as Puesto | null;
}
