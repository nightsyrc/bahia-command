export const money = (centavos: number, currency = "mxn") =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: currency.toUpperCase(), maximumFractionDigits: 2 }).format(centavos / 100);

export const num = (n: number) => new Intl.NumberFormat("es-MX").format(n);

const TZ = "America/Mexico_City";
export const fecha = (d: Date | number | string) =>
  new Intl.DateTimeFormat("es-MX", { timeZone: TZ, dateStyle: "medium", timeStyle: "short" }).format(new Date(d));

/** Día calendario en Puerto Vallarta (YYYY-MM-DD) para agrupar ventas. */
export const diaLocal = (d: Date | number) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));

/** Resultado de un panel: datos, o la razón por la que no hay datos. */
export type Panel<T> = { ok: true; data: T } | { ok: false; motivo: string };

export async function panel<T>(falta: string | null, fn: () => Promise<T>): Promise<Panel<T>> {
  if (falta) return { ok: false, motivo: `Sin conectar: agrega ${falta} en Vercel.` };
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    const m = e instanceof Error ? e.message : "error desconocido";
    return { ok: false, motivo: `No se pudo leer: ${m.slice(0, 160)}` };
  }
}
