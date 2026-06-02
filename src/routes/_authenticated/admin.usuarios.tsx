import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Loader2, Trash2, UserPlus, Sparkles, KeyRound, Check } from "lucide-react";
import {
  listUsuarios, updateUsuarioPuesto, updateUsuarioRol, createUsuario, deleteUsuario, seedDemoUsers,
  resetUsuarioPassword, updateUsuarioActivo, updateUsuarioFlujo,
} from "@/lib/incidencias.functions";
import { PUESTOS, ROLES, type Puesto, type Rol } from "@/lib/constants";
import { useAuth } from "@/lib/use-auth";

import { RouteGuard } from "@/components/PermissionGate";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  component: () => (
    <RouteGuard buttonId="btn_usuarios">
      <Page />
    </RouteGuard>
  ),
});

function Page() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { loading: authLoading, isAdmin, user } = useAuth();
  const fetchList = useServerFn(listUsuarios);
  const updPuesto = useServerFn(updateUsuarioPuesto);
  const updRol = useServerFn(updateUsuarioRol);
  const createFn = useServerFn(createUsuario);
  const deleteFn = useServerFn(deleteUsuario);
  const seedFn = useServerFn(seedDemoUsers);
  const resetPwdFn = useServerFn(resetUsuarioPassword);
  const setActivoFn = useServerFn(updateUsuarioActivo);
  const setFlujoFn = useServerFn(updateUsuarioFlujo);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);
  const [pwdEditing, setPwdEditing] = useState<string | null>(null);
  const [pwdValue, setPwdValue] = useState("");
  const [pwdMsg, setPwdMsg] = useState<{ id: string; text: string; ok: boolean } | null>(null);

  const runSeed = async () => {
    if (!window.confirm("¿Crear/actualizar los 8 usuarios demo? Las contraseñas serán reseteadas.")) return;
    setSeeding(true); setSeedMsg(null);
    try {
      const r = await seedFn();
      setSeedMsg(r.results.join(" · "));
      await queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    } catch (err) {
      setSeedMsg(err instanceof Error ? err.message : "Error");
    } finally { setSeeding(false); }
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["usuarios"],
    queryFn: () => fetchList(),
  });

  const totalAdmins = (data ?? []).filter((u) => u.roles.includes("administrador")).length;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    nombre: "", email: "", password: "",
    puesto: null as Puesto | null,
    roles: ["operario"] as Rol[],
  });
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [createOk, setCreateOk] = useState<string | null>(null);
  const [rolesErr, setRolesErr] = useState<string | null>(null);

  const toggleFormRol = (r: Rol) => {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(r) ? f.roles.filter((x) => x !== r) : [...f.roles, r],
    }));
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true); setCreateErr(null); setCreateOk(null);
    try {
      if (form.roles.length === 0) throw new Error("Selecciona al menos un rol.");
      await createFn({ data: form });
      setCreateOk(`Usuario ${form.email} creado correctamente.`);
      setForm({ nombre: "", email: "", password: "",
        puesto: null, roles: ["operario"] });
      await queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      router.invalidate();
    } catch (err) {
      setCreateErr(err instanceof Error ? err.message : "Error al crear usuario");
    } finally { setCreating(false); }
  };

  const changePuesto = async (user_id: string, puesto: Puesto | null) => {
    await updPuesto({ data: { user_id, puesto } });
    await queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    router.invalidate();
  };

  const changeFlujo = async (user_id: string, flujo_picar: "moldes" | "producto") => {
    await setFlujoFn({ data: { user_id, flujo_picar } });
    await queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    router.invalidate();
  };

  const toggleRol = async (user_id: string, role: Rol, has: boolean) => {
    setRolesErr(null);
    if (role === "administrador" && has && totalAdmins <= 1) {
      setRolesErr("Debe quedar al menos un administrador en el sistema.");
      return;
    }
    try {
      await updRol({ data: { user_id, role, add: !has } });
      await queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      router.invalidate();
    } catch (err) {
      setRolesErr(err instanceof Error ? err.message : "No se pudo actualizar el rol");
    }
  };

  const removeUsuario = async (u: { id: string; nombre: string; email: string }) => {
    setRolesErr(null);
    if (u.id === user?.id) {
      setRolesErr("No puedes eliminar tu propio usuario.");
      return;
    }
    if (!window.confirm(`¿Eliminar al usuario ${u.nombre} (${u.email})? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteFn({ data: { user_id: u.id } });
      await queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      router.invalidate();
    } catch (err) {
      setRolesErr(err instanceof Error ? err.message : "No se pudo eliminar el usuario");
    }
  };

  const submitPassword = async (userId: string) => {
    setPwdMsg(null);
    if (pwdValue.length < 6) {
      setPwdMsg({ id: userId, text: "Mínimo 6 caracteres.", ok: false });
      return;
    }
    try {
      await resetPwdFn({ data: { user_id: userId, password: pwdValue } });
      setPwdMsg({ id: userId, text: "Contraseña actualizada.", ok: true });
      setPwdEditing(null);
      setPwdValue("");
    } catch (err) {
      setPwdMsg({ id: userId, text: err instanceof Error ? err.message : "Error", ok: false });
    }
  };

  const toggleActivo = async (user_id: string, activo: boolean) => {
    setRolesErr(null);
    try {
      await setActivoFn({ data: { user_id, activo } });
      await queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    } catch (err) {
      setRolesErr(err instanceof Error ? err.message : "Error");
    }
  };

  if (authLoading) {
    return (
      <main className="mx-auto flex max-w-md justify-center px-4 py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-md px-4 py-4">
        <header className="mb-4 flex items-center gap-3">
          <Link to="/" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-xl font-bold flex-1">Usuarios</h1>
        </header>
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Esta pantalla solo está disponible para administradores.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-4">
      <header className="mb-4 flex items-center gap-3">
        <Link to="/" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-xl font-bold flex-1">Usuarios</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
        >
          <UserPlus className="h-4 w-4" /> {showForm ? "Cerrar" : "Nuevo"}
        </button>
      </header>

      <div className="mb-4 rounded-xl border border-border bg-card p-3">
        <button
          onClick={runSeed} disabled={seeding}
          className="inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-xs font-medium disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" /> {seeding ? "Creando..." : "Crear usuarios demo"}
        </button>
        {seedMsg && <p className="mt-2 text-xs text-muted-foreground break-words">{seedMsg}</p>}
      </div>

      {showForm && (
        <form onSubmit={submitCreate} className="mb-4 space-y-3 rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Crear nuevo usuario</h2>
          <input
            required placeholder="Nombre" value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
          <input
            required type="email" placeholder="Email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
          <input
            required type="text" placeholder="Contraseña (mín. 6)" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            minLength={6}
          />
          <div>
            <label className="text-xs text-muted-foreground">Puesto (opcional, no requerido para administradores)</label>
            <select
              value={form.puesto ?? ""}
              onChange={(e) => setForm({ ...form, puesto: e.target.value === "" ? null : (e.target.value as Puesto) })}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">— Sin puesto —</option>
              {PUESTOS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Roles</div>
            <div className="mt-1 flex flex-wrap gap-2">
              {ROLES.map((r) => {
                const has = form.roles.includes(r.value);
                return (
                  <button
                    type="button" key={r.value} onClick={() => toggleFormRol(r.value)}
                    className={`rounded-full px-3 py-1 text-xs border ${has ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>
          {createErr && <p className="text-xs text-destructive">{createErr}</p>}
          {createOk && <p className="text-xs text-emerald-500">{createOk}</p>}
          <button
            type="submit" disabled={creating}
            className="h-10 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {creating ? "Creando..." : "Crear usuario"}
          </button>
        </form>
      )}

      {isLoading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
      {error && <p className="text-sm text-destructive">No tienes permisos o ha ocurrido un error.</p>}
      {rolesErr && <p className="mb-3 text-sm text-destructive">{rolesErr}</p>}
      <ul className="space-y-3">
        {data?.map((u) => (
          <li key={u.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold truncate">{u.nombre}</div>
                <div className="text-xs text-muted-foreground truncate">{u.email}</div>
              </div>
              {u.id !== user?.id && (
                <button
                  type="button"
                  onClick={() => removeUsuario({ id: u.id, nombre: u.nombre, email: u.email })}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-destructive hover:bg-destructive/10"
                  title="Eliminar usuario"
                  aria-label="Eliminar usuario"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="mt-3">
              <label className="text-xs text-muted-foreground">Puesto</label>
              <select value={u.puesto ?? ""} onChange={(e) => changePuesto(u.id, e.target.value === "" ? null : (e.target.value as Puesto))} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="">— Sin puesto —</option>
                {PUESTOS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div className="mt-3">
              <label className="text-xs text-muted-foreground">Flujo al picar OF</label>
              <div className="mt-1 grid grid-cols-2 gap-1.5">
                {(["moldes", "producto"] as const).map((f) => {
                  const active = ((u as { flujo_picar?: string }).flujo_picar ?? "moldes") === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => changeFlujo(u.id, f)}
                      className={`h-10 rounded-md border text-xs font-medium ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary"}`}
                    >
                      {f === "moldes" ? "Moldes (OK/observación)" : "Incidencia de producto"}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xs text-muted-foreground">Roles</div>
              <div className="mt-1 flex flex-wrap gap-2">
                {ROLES.map((r) => {
                  const has = u.roles.includes(r.value);
                  const isLastAdmin = r.value === "administrador" && has && totalAdmins <= 1;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      disabled={isLastAdmin}
                      onClick={() => toggleRol(u.id, r.value, has)}
                      className={`rounded-full px-3 py-1 text-xs border disabled:cursor-not-allowed disabled:opacity-50 ${has ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
                      title={isLastAdmin ? "Debe quedar al menos un administrador en el sistema" : undefined}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 border-t border-border pt-3">
              <div className="text-xs text-muted-foreground mb-2">Estado</div>
              <label className={`flex items-center justify-between gap-3 text-sm ${u.id === user?.id ? "opacity-50" : ""}`}>
                <span className="flex-1">Usuario activo (puede iniciar sesión)</span>
                <input
                  type="checkbox"
                  className="h-5 w-5 cursor-pointer accent-primary"
                  checked={(u as { activo?: boolean }).activo !== false}
                  disabled={u.id === user?.id}
                  onChange={(e) => toggleActivo(u.id, e.target.checked)}
                />
              </label>
              <p className="mt-2 text-xs text-muted-foreground">
                Los botones que ve cada usuario se configuran en <Link to="/admin/permisos" className="underline">Permisos por puesto</Link>.
              </p>
            </div>

            <div className="mt-3 border-t border-border pt-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Contraseña</span>
                {pwdEditing !== u.id && (
                  <button
                    type="button"
                    onClick={() => { setPwdEditing(u.id); setPwdValue(""); setPwdMsg(null); }}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary"
                  >
                    <KeyRound className="h-3 w-3" /> Cambiar
                  </button>
                )}
              </div>
              {pwdEditing === u.id && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    placeholder="Nueva contraseña (mín. 6)"
                    value={pwdValue}
                    onChange={(e) => setPwdValue(e.target.value)}
                    className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => submitPassword(u.id)}
                    className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"
                  >
                    <Check className="h-3 w-3" /> Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPwdEditing(null); setPwdValue(""); }}
                    className="h-9 rounded-md border border-border px-2 text-xs"
                  >
                    Cancelar
                  </button>
                </div>
              )}
              {pwdMsg && pwdMsg.id === u.id && (
                <p className={`mt-1 text-xs ${pwdMsg.ok ? "text-emerald-500" : "text-destructive"}`}>{pwdMsg.text}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
