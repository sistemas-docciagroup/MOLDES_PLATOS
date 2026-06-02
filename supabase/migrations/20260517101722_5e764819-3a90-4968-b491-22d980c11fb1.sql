CREATE POLICY "Staff delete incidencias"
ON public.incidencias
FOR DELETE
TO authenticated
USING (is_staff(auth.uid()));

CREATE POLICY "Users delete own incidencias"
ON public.incidencias
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);