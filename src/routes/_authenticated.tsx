import { createFileRoute, Link, Outlet, redirect, useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import LogOut from "lucide-react/dist/esm/icons/log-out";
import Menu from "lucide-react/dist/esm/icons/menu";
import X from "lucide-react/dist/esm/icons/x";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import { mockAuth } from "@/lib/mock-auth";
import { AuthProvider, useAuth } from "@/lib/use-auth";
import { puestoLabel } from "@/lib/constants";
import { PermisosProvider, useCanShowButton, useRefreshPermisos } from "@/lib/use-permisos";
import { HOME_BUTTON_IDS, getNavEntriesForSurface, renderNavEntry } from "@/lib/navigation-permissions";

const ICON_BTN_CLS = "inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary";
const MENU_ITEM_CLS = "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium hover:bg-secondary";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("app_session");
    if (!raw) throw redirect({ to: "/login" });
  },
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <AuthProvider>
      <PermisosProvider>
        <AuthLayoutContent />
      </PermisosProvider>
    </AuthProvider>
  );
}

function AuthLayoutContent() {
  const navigate = useNavigate();
  const router = useRouter();
  const location = useLocation();
  const { loading, user, profile, roles } = useAuth();
  const { scope, can, ready } = useCanShowButton();
  const refreshPermisos = useRefreshPermisos();
  const [menuOpen, setMenuOpen] = useState(false);
  const isHome = location.pathname === "/";

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [loading, navigate, user]);

  const goBack = () => {
    if (window.history.length > 1) router.history.back();
    else navigate({ to: "/" });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <div className="min-h-screen bg-background" />;
  }

  const isAdmin = roles.includes("administrador");
  const rol = isAdmin ? "Administrador"
    : roles.includes("encargado") ? "Encargado" : "Operario";

  const logout = () => {
    mockAuth.signOut();
    navigate({ to: "/login" });
  };


  const closeMenu = () => setMenuOpen(false);

  const menuItems = useMemo(
    () => getNavEntriesForSurface("menu").filter((item) => {
      if (!ready && item.buttonId) return false;
      if (item.onlyScope === "admin" && scope !== "admin") return false;
      if (item.buttonId && !can(item.buttonId)) return false;
      if (item.buttonId && HOME_BUTTON_IDS.includes(item.buttonId)) return false;
      return true;
    }),
    [ready, scope, can],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            {!isHome && (
              <button onClick={goBack} className={ICON_BTN_CLS} aria-label="Volver">
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <Link to="/" className="min-w-0">
              <div className="truncate text-sm font-semibold">{profile?.nombre ?? user.email}</div>
              <div className="truncate text-xs text-muted-foreground">
                {rol}{profile?.puesto ? ` · ${puestoLabel(profile.puesto)}` : ""}
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={logout} className={ICON_BTN_CLS} aria-label="Cerrar sesión" title="Cerrar sesión">
              <LogOut className="h-5 w-5" />
            </button>
            <button onClick={() => setMenuOpen(true)} className={ICON_BTN_CLS} aria-label="Menú">
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={closeMenu} />
          <aside className="absolute right-0 top-0 h-full w-72 max-w-[85vw] border-l border-border bg-card pt-[env(safe-area-inset-top)] shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{profile?.nombre ?? user.email}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {rol}{profile?.puesto ? ` · ${puestoLabel(profile.puesto)}` : ""}
                </div>
              </div>
              <button onClick={closeMenu} className={ICON_BTN_CLS} aria-label="Cerrar menú">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1 p-3">
              {menuItems.map((it) => {
                const Icon = it.icon;
                if (!Icon) return null;
                return (
                  <div key={it.key}>
                    {renderNavEntry(
                      it,
                      MENU_ITEM_CLS,
                      <><Icon className="h-5 w-5" /> {it.label}</>,
                      closeMenu,
                    )}
                  </div>
                );
              })}
              <button
                onClick={async () => { await refreshPermisos(); closeMenu(); }}
                className={`${MENU_ITEM_CLS} text-left`}
              >
                <RefreshCw className="h-5 w-5" /> Refrescar permisos
              </button>
              <button onClick={() => { closeMenu(); logout(); }} className={`${MENU_ITEM_CLS} text-left`}>
                <LogOut className="h-5 w-5" /> Cerrar sesión
              </button>
            </nav>
          </aside>
        </div>
      )}

      <Outlet />
    </div>
  );
}
