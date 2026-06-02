import sql from "mssql";
import { readFileSync } from "fs";

// Leer .env manualmente (sin dotenv)
const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const [k, ...v] = l.split("=");
      return [k.trim(), v.join("=").trim()];
    })
);

const config = {
  server:   env.DB_SERVER,
  port:     parseInt(env.DB_PORT ?? "1433"),
  database: env.DB_DATABASE,
  user:     env.DB_USER,
  password: env.DB_PASSWORD,
  options: {
    encrypt:              env.DB_ENCRYPT === "true",
    trustServerCertificate: env.DB_TRUST_SERVER_CERT === "true",
    connectTimeout: 10000,
  },
};

console.log("──────────────────────────────────────");
console.log("Test de conexión a SQL Server");
console.log(`  Servidor : ${config.server}:${config.port}`);
console.log(`  Base de datos: ${config.database}`);
console.log(`  Usuario  : ${config.user}`);
console.log("──────────────────────────────────────");

try {
  const pool = await sql.connect(config);
  console.log("✓ Conexión establecida correctamente\n");

  // 1) Versión del servidor
  const ver = await pool.request().query("SELECT @@VERSION AS version");
  console.log("Versión SQL Server:");
  console.log(" ", ver.recordset[0].version.split("\n")[0]);

  // 2) Tablas en la base de datos
  const tablas = await pool.request().query(`
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_NAME
  `);
  const lista = tablas.recordset.map((r) => r.TABLE_NAME);
  if (lista.length > 0) {
    console.log(`\nTablas encontradas en [${config.database}] (${lista.length}):`);
    lista.forEach((t) => console.log("  •", t));
  } else {
    console.log(`\nLa base de datos [${config.database}] está vacía (sin tablas todavía).`);
  }

  await pool.close();
  console.log("\n✓ Conexión cerrada correctamente.");
} catch (err) {
  console.error("\n✗ Error de conexión:");
  console.error(" ", err.message);
  if (err.code) console.error("  Código:", err.code);
  process.exit(1);
}
