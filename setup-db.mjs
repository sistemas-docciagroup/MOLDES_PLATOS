import sql from "mssql";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const [k, ...v] = l.split("="); return [k.trim(), v.join("=").trim()]; })
);

const config = {
  server: env.DB_SERVER, port: parseInt(env.DB_PORT ?? "1433"),
  database: env.DB_DATABASE, user: env.DB_USER, password: env.DB_PASSWORD,
  options: { encrypt: env.DB_ENCRYPT === "true", trustServerCertificate: env.DB_TRUST_SERVER_CERT === "true", connectTimeout: 10000 },
};

console.log("Conectando a SQL Server...");
const pool = await sql.connect(config);
console.log("✓ Conectado\n");

// ── 1. Crear tabla usuarios ────────────────────────────────────────────────
console.log("Creando tabla [usuarios]...");
await pool.request().query(`
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_NAME = 'usuarios'
  )
  BEGIN
    CREATE TABLE usuarios (
      id                      UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_usuarios_id      DEFAULT NEWID(),
      username                NVARCHAR(100)    NOT NULL,
      password_hash           NVARCHAR(255)    NOT NULL,
      nombre                  NVARCHAR(120)    NOT NULL,
      puesto                  NVARCHAR(60)     NULL,
      rol                     NVARCHAR(20)     NOT NULL CONSTRAINT DF_usuarios_rol     DEFAULT 'operario',
      activo                  BIT              NOT NULL CONSTRAINT DF_usuarios_activo  DEFAULT 1,
      puede_ver_moldes        BIT              NOT NULL CONSTRAINT DF_usuarios_pvm     DEFAULT 0,
      puede_ver_historial     BIT              NOT NULL CONSTRAINT DF_usuarios_pvh     DEFAULT 0,
      puede_crear_incidencias BIT              NOT NULL CONSTRAINT DF_usuarios_pci     DEFAULT 1,
      flujo_picar             NVARCHAR(10)     NOT NULL CONSTRAINT DF_usuarios_fp      DEFAULT 'moldes',
      created_at              DATETIME2        NOT NULL CONSTRAINT DF_usuarios_cat     DEFAULT GETDATE(),
      updated_at              DATETIME2        NOT NULL CONSTRAINT DF_usuarios_uat     DEFAULT GETDATE(),
      CONSTRAINT PK_usuarios PRIMARY KEY (id),
      CONSTRAINT UQ_usuarios_username UNIQUE (username)
    );
    PRINT 'Tabla usuarios creada.';
  END
  ELSE
    PRINT 'Tabla usuarios ya existía.';
`);
console.log("✓ Tabla [usuarios] lista\n");

// ── 2. Insertar usuario admin si no existe ─────────────────────────────────
console.log("Comprobando usuario admin...");
const exists = await pool.request()
  .input("username", sql.NVarChar, "admin")
  .query("SELECT id FROM usuarios WHERE username = @username");

if (exists.recordset.length === 0) {
  const hash = await bcrypt.hash("admin", 12);
  await pool.request()
    .input("username",                sql.NVarChar,        "admin")
    .input("password_hash",           sql.NVarChar,        hash)
    .input("nombre",                  sql.NVarChar,        "Administrador")
    .input("puesto",                  sql.NVarChar,        null)
    .input("rol",                     sql.NVarChar,        "administrador")
    .input("activo",                  sql.Bit,             1)
    .input("puede_ver_moldes",        sql.Bit,             1)
    .input("puede_ver_historial",     sql.Bit,             1)
    .input("puede_crear_incidencias", sql.Bit,             1)
    .input("flujo_picar",             sql.NVarChar,        "moldes")
    .query(`
      INSERT INTO usuarios
        (username, password_hash, nombre, puesto, rol, activo,
         puede_ver_moldes, puede_ver_historial, puede_crear_incidencias, flujo_picar)
      VALUES
        (@username, @password_hash, @nombre, @puesto, @rol, @activo,
         @puede_ver_moldes, @puede_ver_historial, @puede_crear_incidencias, @flujo_picar)
    `);
  console.log("✓ Usuario admin creado (contraseña: admin)\n");
} else {
  console.log("✓ Usuario admin ya existía\n");
}

// ── 3. Verificar resultado ─────────────────────────────────────────────────
const users = await pool.request().query(`
  SELECT username, nombre, rol, activo,
         puede_ver_moldes, puede_ver_historial, puede_crear_incidencias,
         flujo_picar, created_at
  FROM usuarios
  ORDER BY created_at
`);
console.log(`Usuarios en la tabla (${users.recordset.length}):`);
for (const u of users.recordset) {
  console.log(`  • ${u.username.padEnd(15)} | ${u.rol.padEnd(14)} | ${u.nombre}`);
}

await pool.close();
console.log("\n✓ Completado.");
