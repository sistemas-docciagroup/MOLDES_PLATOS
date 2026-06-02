## Objetivo
Generar un volcado SQL completo de tu base de datos Lovable Cloud que incluya:
- **Esquema**: tipos (enums), tablas, columnas, defaults, índices, claves primarias/únicas
- **Políticas RLS** y permisos (GRANTs)
- **Funciones** y **triggers** del esquema `public`
- **Datos** (INSERTs) de todas las tablas del esquema `public`

El archivo resultante se entregará como artefacto descargable en `/mnt/documents/dump.sql`.

## Cómo se generará

1. **Esquema (DDL)**: consultar `information_schema` y `pg_catalog` con `psql` para reconstruir:
   - `CREATE TYPE ... AS ENUM` para todos los tipos `USER-DEFINED` (`app_role`, `puesto_trabajo`, `gravedad`, `incidencia_estado`, `estado_molde`, `tipo_color`, `estado_canal_color`, `estado_oficial_molde`, `recomendacion_bloqueo_estado`, `tipo`, etc.)
   - `CREATE TABLE` para las 19 tablas detectadas (`alertas_vistas`, `colores_fabricacion`, `contador_piezas_molde`, `defectos_predefinidos`, `estado_actual_molde`, `fabricaciones_of`, `historial_cambios_of`, `historial_estado_molde`, `incidencias`, `incidencias_producto`, `molde_modelos`, `moldes_maestro`, `of_molde_asignado`, `permisos_puesto_botones`, `picadas_of`, `profiles`, `recomendaciones_bloqueo`, `recomendaciones_molde`, `reparaciones`, `user_roles`)
   - Índices y constraints
   - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` para todas las RLS
   - `CREATE FUNCTION` para las 7 funciones existentes (`is_staff`, `has_role`, `handle_new_user`, `reset_contador_al_reparar`, `update_updated_at_column`, `incrementar_contador_piezas`, `prevent_profile_privilege_escalation`)
   - `CREATE TRIGGER` correspondientes
   - `GRANT` statements

2. **Datos (DML)**: para cada tabla del esquema `public`, ejecutar `COPY ... TO STDOUT` o generar `INSERT INTO ... VALUES (...)` mediante un script Python con `psycopg2`/`psql`, recorriendo todas las filas.

3. **Ensamblaje**: concatenar todo en un único `dump.sql` con orden seguro (tipos → tablas → datos → índices → RLS/policies → funciones → triggers).

## Detalles técnicos

- Se usará `psql` con las variables `PG*` ya disponibles en el sandbox (acceso de lectura habilitado).
- Se **excluirán** schemas reservados de Supabase (`auth`, `storage`, `realtime`, `supabase_functions`, `vault`). Solo se vuelca el schema `public`.
- Los datos de `auth.users` **no** se incluyen (gestionado por Supabase). Esto significa que al restaurar en otra instancia, las FKs lógicas hacia `auth.users` (p.ej. `profiles.id`, `user_roles.user_id`) requerirán recrear los usuarios primero.
- Las fotos en Storage (`incidencias-fotos`) **no** se incluyen — el dump solo cubre Postgres.
- El archivo puede ser grande según el volumen de datos; se entregará como `presentation-artifact`.

## Limitaciones a confirmar

- ¿Quieres el dump **solo del schema `public`** (recomendado y seguro), o también un export de metadatos de `auth.users` (solo emails/IDs, sin hashes)?
- ¿Formato `INSERT INTO` (más portable, legible) o `COPY ... FROM stdin` (más rápido para restaurar)? Por defecto usaré **INSERTs**.

## Entregable

Un único archivo `dump.sql` en `/mnt/documents/`, listo para descargar y restaurar con `psql -f dump.sql` en cualquier instancia Postgres compatible.