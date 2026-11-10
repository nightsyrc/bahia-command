// Bahía Command no se conecta a otras bases: pide un resumen de solo lectura a cada sistema,
// protegido con COMMAND_TOKEN. Así ninguna contraseña de base de datos sale de su proyecto.

async function pedir<T>(url: string): Promise<T> {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${process.env.COMMAND_TOKEN}` }, cache: "no-store" });
  if (!r.ok) throw new Error(`${new URL(url).host} respondió ${r.status}`);
  return (await r.json()) as T;
}

// ---------- Bahía Systems: prospectos ----------
export type Prospectos = {
  hoy: number; semana: number; mes: number; abiertos: number; bajas: number;
  porInteres: { interes: string; n: number }[];
  ultimos: { creado_at: string; nombre: string; empresa: string | null; email: string; interes: string; estado: string; seg_paso: number }[];
};

export const prospectos = () => pedir<Prospectos>(process.env.BAHIA_STATS_URL!);

// ---------- Atalaya: operación ----------
export type Operacion = {
  tablas: { tabla: string; filas: number; ultimas24h: number | null; ultima: string | null }[];
  total24h: number;
};

export const operacion = () => pedir<Operacion>(process.env.ATALAYA_STATS_URL!);
