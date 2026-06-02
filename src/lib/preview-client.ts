// Vista multi-rol deshabilitada en modo sin base de datos.
// Se restaurará cuando exista conexión a SQL Server.

export function getPreviewClient(_slot: string) {
  return null;
}

export const DEMO_CREDENTIALS: Array<{ email: string; password: string; label: string }> = [
  { email: "admin", password: "admin", label: "Admin" },
];
