import { signInFn, type UsuarioSession } from "./auth.functions";

export const SESSION_KEY = "app_session:v2";
// Al cambiar la versión, limpiar claves antiguas del mismo dominio
if (typeof window !== "undefined") {
  localStorage.removeItem("app_session");
}

export type MockUser = { id: string; email: string };

type AuthChangeCallback = (user: MockUser | null) => void;
const listeners: AuthChangeCallback[] = [];

function notify(user: MockUser | null) {
  listeners.forEach((cb) => cb(user));
}

export const mockAuth = {
  async signIn(username: string, password: string): Promise<{ error: string | null }> {
    try {
      const session = await signInFn({ data: { username, password } });
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      notify({ id: session.id, email: session.username });
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Error de conexión" };
    }
  },

  signOut() {
    localStorage.removeItem(SESSION_KEY);
    notify(null);
  },

  getSession(): MockUser | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw) as UsuarioSession;
      return { id: session.id, email: session.username };
    } catch {
      return null;
    }
  },

  getFullSession(): UsuarioSession | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as UsuarioSession) : null;
    } catch {
      return null;
    }
  },

  onAuthStateChange(callback: AuthChangeCallback): () => void {
    listeners.push(callback);
    return () => {
      const idx = listeners.indexOf(callback);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  },
};
