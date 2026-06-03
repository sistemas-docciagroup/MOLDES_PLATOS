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

function sessionToProfile(s: ReturnType<typeof mockAuth.getFullSession>): {
  profile: Profile | null;
  roles: Rol[];
  isAdmin: boolean;
  isStaff: boolean;
} {
  if (!s) return { profile: null, roles: [], isAdmin: false, isStaff: false };
  const roles: Rol[] = [s.rol];
  const isAdmin = roles.includes("administrador");
  return {
    profile: {
      id: s.id,
      nombre: s.nombre,
      email: s.username,
      puesto: s.puesto,
      activo: s.activo,
      puede_ver_moldes: s.puede_ver_moldes,
      puede_ver_historial: s.puede_ver_historial,
      puede_crear_incidencias: s.puede_crear_incidencias,
      flujo_picar: s.flujo_picar,
    },
    roles,
    isAdmin,
    isStaff: isAdmin || roles.includes("encargado"),
  };
}

function useAuthState(): AuthState {
  const [user, setUser] = useState<MockUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = mockAuth.getFullSession();

    // Validar epoch del servidor para detectar reinicios
    getServerEpoch()
      .then(({ epoch }) => {
        if (stored && stored.serverEpoch !== epoch) {
          mockAuth.signOut();
        } else {
          setUser(mockAuth.getSession());
        }
      })
      .catch(() => {
        // Si el servidor no responde, mantener sesión local (más permisivo que limpiarla)
        setUser(mockAuth.getSession());
      })
      .finally(() => {
        setLoading(false);
      });

    const unsubscribe = mockAuth.onAuthStateChange((nextUser) => {
      setUser(nextUser);
    });

    return unsubscribe;
  }, []);

  const { profile, roles, isAdmin, isStaff } = useMemo(
    () => sessionToProfile(user ? mockAuth.getFullSession() : null),
    [user],
  );

  return { loading, user, profile, roles, isStaff, isAdmin };
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthState();
  return createElement(AuthContext.Provider, { value: auth }, children);
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
