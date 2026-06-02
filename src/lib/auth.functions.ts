import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getPool, sql } from "@/integrations/sqlserver/client.server";
import type { Puesto, Rol } from "./constants";

export type UsuarioSession = {
  id: string;
  username: string;
  nombre: string;
  puesto: Puesto | null;
  rol: Rol;
  activo: boolean;
  puede_ver_moldes: boolean;
  puede_ver_historial: boolean;
  puede_crear_incidencias: boolean;
  flujo_picar: "moldes" | "producto";
};

export const signInFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ username: z.string().min(1), password: z.string().min(1) }).parse(input)
  )
  .handler(async ({ data }): Promise<UsuarioSession> => {
    const pool = await getPool();

    const result = await pool
      .request()
      .input("username", sql.NVarChar, data.username.trim())
      .query(`
        SELECT id, username, password_hash, nombre, puesto, rol, activo,
               puede_ver_moldes, puede_ver_historial, puede_crear_incidencias, flujo_picar
        FROM   usuarios
        WHERE  username = @username
      `);

    const row = result.recordset[0];
    if (!row) throw new Error("Usuario o contraseña incorrectos");
    if (!row.activo) throw new Error("Tu usuario está desactivado");

    const valid = await bcrypt.compare(data.password, row.password_hash);
    if (!valid) throw new Error("Usuario o contraseña incorrectos");

    return {
      id:                       String(row.id),
      username:                 row.username,
      nombre:                   row.nombre,
      puesto:                   (row.puesto as Puesto) ?? null,
      rol:                      row.rol as Rol,
      activo:                   Boolean(row.activo),
      puede_ver_moldes:         Boolean(row.puede_ver_moldes),
      puede_ver_historial:      Boolean(row.puede_ver_historial),
      puede_crear_incidencias:  Boolean(row.puede_crear_incidencias),
      flujo_picar:              row.flujo_picar === "producto" ? "producto" : "moldes",
    };
  });
