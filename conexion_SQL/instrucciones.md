# Conexión SQL Server — MOLDES_PLATOS

## Credenciales
Definidas en `.env` en la raíz del proyecto. El cliente las lee directamente
(no pasan por Vite). No añadir prefijo `VITE_` a estas variables.

Variables requeridas: `DB_SERVER`, `DB_PORT`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`, `DB_ENCRYPT`, `DB_TRUST_SERVER_CERT`.

La contraseña va solo en `.env`, nunca en el código.

## Cliente de base de datos
`src/integrations/sqlserver/client.server.ts`
- Solo ejecutable en servidor (nunca en el navegador)
- Pool de conexiones de hasta 10 conexiones simultáneas
- Toda consulta a DB debe hacerse dentro de un `createServerFn()`

## Tabla `usuarios`
Columnas relevantes:

| Columna | Tipo | Notas |
|---|---|---|
| `id` | INT IDENTITY | PK |
| `username` | NVARCHAR | usado como login (puede ser email o nombre) |
| `password_hash` | NVARCHAR | bcrypt (coste 12) |
| `nombre` | NVARCHAR | nombre visible |
| `puesto` | NVARCHAR | nullable — posición de trabajo |
| `rol` | NVARCHAR | `operario` / `encargado` / `administrador` |
| `activo` | BIT | si es 0 no puede iniciar sesión |
| `puede_ver_moldes` | BIT | |
| `puede_ver_historial` | BIT | |
| `puede_crear_incidencias` | BIT | |
| `flujo_picar` | NVARCHAR | `moldes` o `producto` |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

## Autenticación
- Función: `src/lib/auth.functions.ts` → `signInFn`
- Flujo: busca por `username` → valida bcrypt → devuelve sesión
- Sesión guardada en `localStorage` con clave `app_session`
- Formato de sesión: tipo `UsuarioSession` (id, username, nombre, puesto, rol, activo, flags)

## Gestión de usuarios (solo administradores)
- Ruta en la app: `/admin/usuarios`
- Funciones servidor: `src/lib/incidencias.functions.ts`
  - `listUsuarios` — lista todos los usuarios
  - `createUsuario` — inserta en `usuarios` con bcrypt
  - `deleteUsuario` — elimina (protege último administrador)
  - `updateUsuarioPuesto` — cambia puesto
  - `updateUsuarioRol` — añade/quita rol
  - `updateUsuarioActivo` — activa/desactiva cuenta
  - `resetUsuarioPassword` — actualiza hash de contraseña
- El auto-registro de usuarios está deshabilitado; solo el administrador crea cuentas
