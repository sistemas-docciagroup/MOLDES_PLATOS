
CREATE TABLE public.permisos_puesto_botones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  button_id text NOT NULL,
  button_name text NOT NULL,
  categoria text NOT NULL,
  visible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope, button_id)
);

ALTER TABLE public.permisos_puesto_botones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read permisos"
  ON public.permisos_puesto_botones FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins insert permisos"
  ON public.permisos_puesto_botones FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Admins update permisos"
  ON public.permisos_puesto_botones FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Admins delete permisos"
  ON public.permisos_puesto_botones FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'administrador'::app_role));

CREATE TRIGGER trg_permisos_updated_at
  BEFORE UPDATE ON public.permisos_puesto_botones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed: catálogo de botones × scopes con visible = false por defecto
WITH buttons(button_id, button_name, categoria) AS (
  VALUES
    ('btn_registrar_incidencia','Registrar incidencia','incidencia'),
    ('btn_grabar_voz','Grabar voz','incidencia'),
    ('btn_anadir_foto','Añadir foto','incidencia'),
    ('btn_estado_moldes','Estado moldes','moldes'),
    ('btn_buscar_molde','Buscar molde','moldes'),
    ('btn_historial_molde','Historial molde','moldes'),
    ('btn_mandar_reparacion','Mandar a reparación','reparacion'),
    ('btn_moldes_reparacion','Moldes en reparación','reparacion'),
    ('btn_validar_reparacion','Validar reparación','reparacion'),
    ('btn_cambiar_estado','Cambiar estado','acciones'),
    ('btn_panel_admin','Panel admin','admin'),
    ('btn_usuarios','Usuarios','admin'),
    ('btn_estadisticas','Estadísticas','admin'),
    ('btn_permisos_puesto','Permisos por puesto','admin'),
    ('btn_exportar','Exportar','acciones'),
    ('btn_filtros','Filtros','acciones'),
    ('btn_ver_foto','Ver foto','acciones'),
    ('btn_eliminar_incidencia','Eliminar incidencia','acciones'),
    ('btn_editar_incidencia','Editar incidencia','acciones')
),
scopes(scope) AS (
  VALUES ('preparacion_molde'),('desmoldeo'),('repaso'),('valvula'),
         ('empaquetado'),('reparacion_moldes'),('encargado')
),
visibles(scope, button_id) AS (
  VALUES
    -- Preparación molde
    ('preparacion_molde','btn_registrar_incidencia'),
    ('preparacion_molde','btn_grabar_voz'),
    ('preparacion_molde','btn_anadir_foto'),
    ('preparacion_molde','btn_estado_moldes'),
    ('preparacion_molde','btn_buscar_molde'),
    ('preparacion_molde','btn_historial_molde'),
    ('preparacion_molde','btn_mandar_reparacion'),
    -- Desmoldeo
    ('desmoldeo','btn_registrar_incidencia'),
    ('desmoldeo','btn_grabar_voz'),
    ('desmoldeo','btn_anadir_foto'),
    ('desmoldeo','btn_buscar_molde'),
    ('desmoldeo','btn_historial_molde'),
    -- Repaso
    ('repaso','btn_registrar_incidencia'),
    ('repaso','btn_grabar_voz'),
    ('repaso','btn_anadir_foto'),
    ('repaso','btn_buscar_molde'),
    ('repaso','btn_historial_molde'),
    -- Válvula
    ('valvula','btn_registrar_incidencia'),
    ('valvula','btn_grabar_voz'),
    ('valvula','btn_anadir_foto'),
    ('valvula','btn_buscar_molde'),
    ('valvula','btn_historial_molde'),
    -- Empaquetado
    ('empaquetado','btn_registrar_incidencia'),
    ('empaquetado','btn_grabar_voz'),
    ('empaquetado','btn_anadir_foto'),
    ('empaquetado','btn_buscar_molde'),
    ('empaquetado','btn_historial_molde'),
    -- Reparación moldes
    ('reparacion_moldes','btn_moldes_reparacion'),
    ('reparacion_moldes','btn_buscar_molde'),
    ('reparacion_moldes','btn_historial_molde'),
    ('reparacion_moldes','btn_validar_reparacion'),
    ('reparacion_moldes','btn_cambiar_estado'),
    ('reparacion_moldes','btn_anadir_foto'),
    -- Encargado
    ('encargado','btn_estado_moldes'),
    ('encargado','btn_buscar_molde'),
    ('encargado','btn_historial_molde'),
    ('encargado','btn_moldes_reparacion'),
    ('encargado','btn_cambiar_estado'),
    ('encargado','btn_estadisticas'),
    ('encargado','btn_filtros'),
    ('encargado','btn_exportar')
)
INSERT INTO public.permisos_puesto_botones (scope, button_id, button_name, categoria, visible)
SELECT s.scope, b.button_id, b.button_name, b.categoria,
       EXISTS (SELECT 1 FROM visibles v WHERE v.scope = s.scope AND v.button_id = b.button_id)
FROM scopes s CROSS JOIN buttons b;
