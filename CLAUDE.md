# CLAUDE.md

# What to do

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build (Cloudflare Workers)
npm run build:dev    # Development build
npm run preview      # Preview production build
npm run lint         # ESLint
npm run format       # Prettier
```

## Stack

- **Framework**: TanStack Start (React SSR) + TanStack Router (file-based routing)
- **Database**: Microsoft SQL Server (via `mssql` / `tedious` driver)
- **Auth**: Custom auth layer over SQL Server
- **Deployment**: Cloudflare Workers via `@cloudflare/vite-plugin`
- **UI**: Shadcn/Radix UI + Tailwind CSS v4
- **Data fetching**: TanStack React Query + TanStack Start `createServerFn()`
- **Forms**: React Hook Form + Zod
- **Path alias**: `@/*` → `src/*`

## Architecture

### Routing
File-based routing under `src/routes/`. All authenticated pages live under `src/routes/_authenticated/` and are wrapped by `src/routes/_authenticated.tsx` (header + nav). The route tree is auto-generated at `src/routeTree.gen.ts` — never edit it manually.

### Auth & Permissions
- `src/lib/use-auth.ts` — `AuthProvider` + `useAuth()` hook. Loads session, user profile, and roles (`administrador`, `encargado`, `operario`). Refreshes every 15s and on window focus. Auto signs out if `profile.activo === false`.
- `src/lib/use-permisos.ts` — `PermisosProvider` + `useCanShowButton()`. Button/menu visibility is driven by the `permisos_puesto_botones` table. Admins can preview as different `puestos`.
- `src/components/PermissionGate.tsx` — wraps UI elements that require specific permissions.

### Server Functions
All database mutations and server-side logic use TanStack Start's `createServerFn()` in files named `*.functions.ts` under `src/lib/`. These are called from the client via `useServerFn()`. Auth is enforced through shared middleware defined in `src/integrations/sqlserver/auth-middleware.ts`.

```typescript
// Server-side (src/lib/example.functions.ts)
export const myFn = createServerFn(...).middleware(requireAuth).handler(...)

// Client-side usage
const fn = useServerFn(myFn);
await fn(payload);
```

### SQL Server Clients
- `src/integrations/sqlserver/client.ts` — browser-safe client (no credentials)
- `src/integrations/sqlserver/client.server.ts` — server-side client with full DB access
- `src/integrations/sqlserver/types.ts` — TypeScript types matching the database schema

### AI Integration
`src/lib/incidencias.functions.ts` contains `processAudioIncidencia()`, which transcribes voice recordings and extracts structured incident data (molde, descripcion, motivo_corto, zona, color, tipo_fallo).

## Domain Concepts

This is a **Spanish-language manufacturing management system** for a production facility that makes platos (dishes/molds). Key domain entities:

| Term | Meaning |
|------|---------|
| molde | Production mold |
| OF (Orden de Fabricación) | Production/manufacturing order |
| picar OF | Process/cut a production order |
| incidencia | Incident/defect report |
| reparación | Repair record |
| puesto | Worker position/role |
| encargado | Supervisor role |

## Key Environment Variables

Defined in `.env`. Required vars: `DB_SERVER`, `DB_PORT`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`, `DB_ENCRYPT`, `DB_TRUST_SERVER_CERT`.
