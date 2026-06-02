// Datos demo de OF mientras no exista conexión real con SQL Server.
// Solo se sirve a este usuario:
export const DEMO_EMAIL = "preparacion@moldguardian.com";

export type OfDemo = {
  numero_of: string;
  modelo: string;
  medida: string;
  color: string;
  molde_sugerido: string;
};

export const OF_DEMO_DATA: OfDemo[] = [
  { numero_of: "OF-PRUEBA-001", modelo: "PIZARRA",          medida: "70x120", color: "Antracita", molde_sugerido: "514" },
  { numero_of: "OF-PRUEBA-002", modelo: "PIZARRA",          medida: "80x140", color: "Beige",     molde_sugerido: "132" },
  { numero_of: "OF-PRUEBA-003", modelo: "LISO",             medida: "70x100", color: "Blanco",    molde_sugerido: "69"  },
  { numero_of: "OF-PRUEBA-004", modelo: "LISO",             medida: "80x120", color: "Negro",     molde_sugerido: "89"  },
  { numero_of: "OF-PRUEBA-005", modelo: "SEMI PIZARRA",     medida: "90x90",  color: "Blanco",    molde_sugerido: "101" },
  { numero_of: "OF-PRUEBA-006", modelo: "CUADRADO PIZARRA", medida: "90x90",  color: "Gris",      molde_sugerido: "218" },
];

/** Resuelve la OF: si coincide literalmente con OF-PRUEBA-00X usa esa,
 *  si no, rota por hash determinista del string introducido. */
export function resolveDemoOf(input: string): OfDemo {
  const norm = input.trim().toUpperCase();
  const match = OF_DEMO_DATA.find((o) => o.numero_of === norm);
  if (match) return { ...match };
  let h = 0;
  for (let i = 0; i < norm.length; i++) h = (h * 31 + norm.charCodeAt(i)) >>> 0;
  const picked = OF_DEMO_DATA[h % OF_DEMO_DATA.length];
  return { ...picked, numero_of: norm || picked.numero_of };
}
