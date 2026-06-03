# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Application Overview

A fully responsive web app to monitor and control resin shower tray molds in a manufacturing facility. Core features: mold status tracking, incident/defect reporting, production order (OF) management, repair history, mold blocking, and role-based user access.

## Commands

```bash
pnpm run dev         # Start dev server (usar pnpm, no npm)
pnpm run build       # Production build (Cloudflare Workers)
pnpm run build:dev   # Development build
pnpm run preview     # Preview production build
pnpm run lint        # ESLint
pnpm run format      # Prettier
```

Al instalar pnpm por primera vez ejecutar `pnpm approve-builds` y seleccionar todos (tecla `a`) para aprobar esbuild, sharp y workerd.

There is no test framework configured — no unit or integration tests exist in this project.

## Stack

- **Framework**: TanStack Start (React SSR) + TanStack Router (file-based routing)
- **Database**: Microsoft SQL Server (via `mssql` / `tedious` driver)
- **Auth**: Custom auth against SQL Server `usuarios` table (bcrypt passwords, session in `localStorage`)
- **Deployment**: Cloudflare Workers via `@cloudflare/vite-plugin` + `wrangler.jsonc`
- **UI**: Shadcn/Radix UI + Tailwind CSS v4 + Lucide icons
- **Data fetching**: TanStack React Query + TanStack Start `createServerFn()`
- **Forms**: React Hook Form + Zod
- **Path alias**: `@/*` → `src/*`

## Architecture

### Routing
File-based routing under `src/routes/`. All authenticated pages live under `src/routes/_authenticated/` and are wrapped by `src/routes/_authenticated.tsx` (header + nav). The route tree is auto-generated at `src/routeTree.gen.ts` — never edit it manually.

Key route groups:
- `/login` — unauthenticated entry point
- `/_authenticated/` — dashboard home
- `/_authenticated/moldes` — mold list and detail
- `/_authenticated/incidencias` — incident tracking
- `/_authenticated/picar-of`, `of-fabricadas` — production order management
- `/_authenticated/admin.*` — admin-only pages (users, permisos, stats)

### Auth & Permissions
- `src/lib/use-auth.ts` — `AuthProvider` + `useAuth()` hook. Loads session from `localStorage`, fetches user profile and roles from DB. Refreshes every 15s and on window focus. Auto signs out if `profile.activo === false`.
- `src/lib/use-permisos.ts` — `PermisosProvider` + `useCanShowButton()`. Per-button visibility driven by the `permisos_puesto_botones` table. Admins can preview the UI as different `puestos`.
- `src/components/PermissionGate.tsx` — `PermissionGate` wraps UI elements by `ButtonId`; `RouteGuard` protects whole routes; `AdminGuard` restricts to admin role.
- `src/lib/buttons.ts` — 26 named `ButtonId` constants that map to DB permission records.

**Roles**: `operario`, `encargado`, `administrador`  
**Puestos**: `preparacion_molde`, `desmoldeo`, `repaso`, `valvula`, `empaquetado`, `reparacion_moldes`

### Server Functions
All DB mutations and server-side logic use TanStack Start's `createServerFn()` in `*.functions.ts` files under `src/lib/`. Auth is enforced via middleware in `src/integrations/supabase/auth-middleware.ts` (named `requireSupabaseAuth` — extracts Bearer token; falls back to `"admin-001"` in dev).

```typescript
// src/lib/example.functions.ts
export const myFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => schema.parse(data))
  .handler(async ({ data, context }) => { /* DB logic via mssql */ })

// Client usage
const fn = useServerFn(myFn);
await fn({ data: payload });
```

Existing function files: `auth`, `moldes`, `incidencias`, `of`, `fabricaciones`, `colores`, `defectos`, `recomendaciones-bloqueo`, `incidencias-producto`, `admin-stats`.

### SQL Server Client
- `src/integrations/sqlserver/client.server.ts` — server-only, reads `.env` directly (Vite does not inject non-`VITE_` vars in SSR). Uses `mssql` connection pool (max 10).
- `src/integrations/sqlserver/types.ts` — TypeScript types matching DB schema.

There is no browser-side SQL client. All DB access is server-side only through `createServerFn()`.

### Mock Data y funcionalidades pendientes de conectar

`src/lib/mock-db.ts` — mock en memoria para moldes, órdenes y fabricaciones.

Partes que aún usan mock en lugar de DB real (actualizar cuando se conecten):

| Fichero | Qué usa mock | Estado |
|---|---|---|
| `src/lib/use-permisos.ts` → `fetchPermisos()` | Devuelve todos los permisos activos para todos los puestos | Pendiente conectar tabla `permisos_puesto_botones` |
| `src/routes/_authenticated/index.tsx` → `uploadFoto()` | No sube la foto, devuelve `null` | Pendiente conectar almacenamiento |
| `src/routes/_authenticated/picar-of.tsx` → `uploadOne()` | Igual | Pendiente conectar almacenamiento |
| `src/routes/_authenticated/incidencia-producto-form.tsx` → `uploadPhoto()` | Igual | Pendiente conectar almacenamiento |

### Ciclo de vida de la sesión
La sesión se guarda en `localStorage` (clave `app_session`) e incluye un `serverEpoch` — un ID aleatorio generado **en cada arranque del servidor** (`auth.functions.ts`). Al montar `AuthProvider`, `use-auth.ts` llama a `getServerEpoch()` y compara con el epoch almacenado. Si no coinciden (servidor reiniciado), fuerza `signOut()` y muestra el login. Esto garantiza que cada reinicio del servidor requiere login nuevo.

### Supabase — legado de Lovable
El proyecto viene de Lovable.dev y arrastra imports de Supabase. **No está configurado ni en uso real.** No añadir nuevas dependencias de Supabase. El cliente `src/integrations/supabase/client.ts` existe pero no debe usarse para datos ni auth. El auth middleware está en `src/integrations/supabase/auth-middleware.ts` por convención heredada, pero autentica contra SQL Server.

### AI Integration
`src/lib/incidencias.functions.ts` — `processAudioIncidencia()` transcribes voice recordings and extracts structured incident data (`molde`, `descripcion`, `motivo_corto`, `zona`, `color`, `tipo_fallo`).

## Domain Concepts

Spanish-language system for a shower tray production facility. Key terms:

| Term | Meaning |
|------|---------|
| molde | Production mold |
| OF (Orden de Fabricación) | Manufacturing order |
| picar OF | Log/process a production order against a mold |
| incidencia | Incident or defect report on a mold |
| reparación | Repair record |
| puesto | Worker station/position (not the same as `rol`) |
| encargado | Supervisor role |
| gravedad | Incident severity (baja / media / alta) |

## Key Environment Variables

Defined in `.env` (read directly by `client.server.ts`, not via Vite). Required:

```
DB_SERVER=
DB_PORT=1433
DB_DATABASE=
DB_USER=
DB_PASSWORD=
DB_ENCRYPT=true
DB_TRUST_SERVER_CERT=true
```
