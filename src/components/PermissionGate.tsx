import type { ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import type { ButtonId } from "@/lib/buttons";
import { useCanShowButton } from "@/lib/use-permisos";
import { useAuth } from "@/lib/use-auth";

export function canAccessRoute(allowed: boolean): boolean {
  return allowed;
}

/**
 * Oculta su contenido si el usuario actual no tiene permiso sobre `buttonId`.
 * Los administradores ven todo. Mientras carga el mapa de permisos no renderiza nada
 * para evitar parpadeos de botones que luego desaparecen.
 */
export function PermissionGate({
  buttonId,
  children,
  fallback = null,
}: {
  buttonId: ButtonId;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { can, ready, scope } = useCanShowButton();
  const { loading } = useAuth();
  if (loading) return null;
  if (scope === "admin") return <>{children}</>;
  if (!scope) return <>{fallback}</>;
  if (!ready) return null;
  return can(buttonId) ? <>{children}</> : <>{fallback}</>;
}

/**
 * Protege una ruta completa. Si el usuario no tiene permiso sobre `buttonId`,
 * redirige a `redirectTo` (por defecto `/`). Mientras carga muestra un spinner.
 */
export function RouteGuard({
  buttonId,
  children,
  redirectTo = "/",
}: {
  buttonId: ButtonId;
  children: ReactNode;
  redirectTo?: string;
}) {
  const { can, ready, scope } = useCanShowButton();
  const { loading } = useAuth();
  const spinner = (
    <main className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </main>
  );
  if (loading) return spinner;
  if (scope === "admin") return <>{children}</>;
  if (!scope) return <Navigate to={redirectTo} replace />;
  if (!ready) return spinner;
  if (!canAccessRoute(can(buttonId))) return <Navigate to={redirectTo} replace />;
  return <>{children}</>;
}

/**
 * Protege rutas/áreas exclusivas de Administrador.
 * No depende de `permisos_puesto_botones`.
 */
export function AdminGuard({
  children,
  redirectTo = "/",
}: {
  children: ReactNode;
  redirectTo?: string;
}) {
  const { scope } = useCanShowButton();
  const { loading } = useAuth();
  if (loading) {
    return (
      <main className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  }
  if (scope !== "admin") return <Navigate to={redirectTo} replace />;
  return <>{children}</>;
}
