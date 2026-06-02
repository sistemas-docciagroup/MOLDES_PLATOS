CREATE POLICY "admin/preparacion delete moldes_maestro"
ON public.moldes_maestro
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'administrador'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.puesto = 'preparacion_molde'::puesto_trabajo
  )
);