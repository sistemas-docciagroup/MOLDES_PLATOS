import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { mockAuth, type MockUser } from "./mock-auth";
import { getServerEpoch } from "./auth.functions";
import type { Puesto, Rol } from "./constants";

export type Profile = {
  id: string;
  nombre: string;
  email: string;
  puesto: Puesto | null;
  activo: boolean;
  puede_ver_moldes: boolean;
  puede_ver_historial: boolean;
  puede_crear_incidencias: boolean;
  flujo_picar: "moldes" | "producto";
};

export type AuthState = {
  loading: boolean;
  user: MockUser | null;
  profile: Profile | null;
  roles: Rol[];
  isStaff: boolean;
  isAdmin: boolean;
};

function useAuthState(): AuthState {
  const [user, setUser] = useState<MockUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = mockAuth.getFullSession();

    getServerEpoch().then(({ epoch }) => {
      if (stored && stored.serverEpoch !== epoch) {
        mockAuth.signOut();
      } else {
        setUser(mockAuth.getSession());
      }
      setLoading(false);
    }).catch(() => {
      // Si no se puede contactar el servidor, limpiar sesión por seguridad
      mockAuth.signOut();
      setLoading(false);
    });

    const unsubscribe = mockAuth.onAuthStateChange((nextUser) => {
      setUser(nextUser);
    });

    return unsubscribe;
  }, []);

  // useMemo evita parsear localStorage en cada render — solo recalcula cuando user cambia
  const { profile, roles, isAdmin, isStaff } = useMemo(() => {
    const fullSession = user ? mockAuth.getFullSession() : null;
    const profile: Profile | null = fullSession
      ? {
          id:                       fullSession.id,
          nombre:                   fullSession.nombre,
          email:                    fullSession.username,
          puesto:                   fullSession.puesto,
          activo:                   fullSession.activo,
          puede_ver_moldes:         fullSession.puede_ver_moldes,
          puede_ver_historial:      fullSession.puede_ver_historial,
          puede_crear_incidencias:  fullSession.puede_crear_incidencias,
          flujo_picar:              fullSession.flujo_picar,
        }
      : null;
    const roles: Rol[] = fullSession ? [fullSession.rol] : [];
    const isAdmin = roles.includes("administrador");
    const isStaff = isAdmin || roles.includes("encargado");
    return { profile, roles, isAdmin, isStaff };
  }, [user]);

  return { loading, user, profile, roles, isStaff, isAdmin };
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthState();
  return createElement(AuthContext.Provider, { value: auth }, children);
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (ctx) return ctx;
  return useAuthState();
}
