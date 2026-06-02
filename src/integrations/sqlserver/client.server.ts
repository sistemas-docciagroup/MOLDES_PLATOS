import sql from "mssql";
import { readFileSync } from "fs";
import { resolve } from "path";

// Leer .env manualmente — igual que test-db.mjs.
// Necesario porque Vite no inyecta variables no-VITE_ en process.env
// durante la ejecución de server functions en desarrollo.
function loadEnvFile() {
  try {
    const content = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (key && !process.env[key]) process.env[key] = val;
    }
  } catch { /* .env no encontrado — usar process.env tal cual */ }
}

loadEnvFile();

function e(key: string): string {
  return (process.env[key] ?? "").trim();
}

function getConfig(): sql.config {
  return {
    server:   e("DB_SERVER"),
    port:     parseInt(e("DB_PORT") || "1433"),
    database: e("DB_DATABASE"),
    user:     e("DB_USER"),
    password: e("DB_PASSWORD"),
    options: {
      encrypt:                e("DB_ENCRYPT") === "true",
      trustServerCertificate: e("DB_TRUST_SERVER_CERT") === "true",
      connectTimeout: 15000,
      requestTimeout: 15000,
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  };
}

let _pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (_pool?.connected) return _pool;
  if (_pool) { try { await _pool.close(); } catch {} }
  _pool = await sql.connect(getConfig());
  return _pool;
}

export { sql };
