import { diaLocal } from "./fmt";

type Charge = {
  id: string; amount: number; amount_refunded: number; currency: string; status: string; paid: boolean;
  created: number; description: string | null; failure_message: string | null;
  billing_details: { email: string | null; name: string | null };
  receipt_email: string | null;
};

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${process.env.STRIPE_READ_KEY}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Stripe ${r.status}`);
  return (await r.json()) as T;
}

export type Ingresos = {
  disponible: { amount: number; currency: string }[];
  pendiente: { amount: number; currency: string }[];
  hoy: number; semana: number; mes: number; mesCalendario: number;
  ventasHoy: number; ventasMes: number; fallidosMes: number;
  porDia: { dia: string; total: number }[];
  recientes: { id: string; cuando: number; monto: number; moneda: string; estado: string; quien: string; que: string; nota: string }[];
  otrasMonedas: Record<string, number>;
};

/** Ventas de los últimos 30 días. Las cifras principales son en MXN; otras monedas se reportan aparte. */
export async function ingresos(): Promise<Ingresos> {
  const desde = Math.floor(Date.now() / 1000) - 30 * 86400;
  const cargos: Charge[] = [];
  let despues: string | null = null;
  for (let i = 0; i < 10; i++) {
    const q: string = `charges?limit=100&created[gte]=${desde}${despues ? `&starting_after=${despues}` : ""}`;
    const page: { data: Charge[]; has_more: boolean } = await get<{ data: Charge[]; has_more: boolean }>(q);
    cargos.push(...page.data);
    if (!page.has_more || page.data.length === 0) break;
    despues = page.data[page.data.length - 1].id;
  }
  const bal = await get<{ available: { amount: number; currency: string }[]; pending: { amount: number; currency: string }[] }>("balance");

  const hoyDia = diaLocal(Date.now());
  const mesPrefijo = hoyDia.slice(0, 7);
  const hace7 = Date.now() / 1000 - 7 * 86400;
  const buenos = cargos.filter((c) => c.status === "succeeded" && c.paid);
  const neto = (c: Charge) => c.amount - c.amount_refunded;
  const mxn = buenos.filter((c) => c.currency === "mxn");

  const otrasMonedas: Record<string, number> = {};
  for (const c of buenos) if (c.currency !== "mxn") otrasMonedas[c.currency] = (otrasMonedas[c.currency] ?? 0) + neto(c);

  const dias = new Map<string, number>();
  for (let i = 29; i >= 0; i--) dias.set(diaLocal(Date.now() - i * 86400000), 0);
  for (const c of mxn) {
    const d = diaLocal(c.created * 1000);
    if (dias.has(d)) dias.set(d, (dias.get(d) ?? 0) + neto(c));
  }

  const sum = (xs: Charge[]) => xs.reduce((a, c) => a + neto(c), 0);
  const deHoy = mxn.filter((c) => diaLocal(c.created * 1000) === hoyDia);
  const delMes = mxn.filter((c) => diaLocal(c.created * 1000).startsWith(mesPrefijo));

  return {
    disponible: bal.available, pendiente: bal.pending,
    hoy: sum(deHoy), semana: sum(mxn.filter((c) => c.created >= hace7)), mes: sum(mxn), mesCalendario: sum(delMes),
    ventasHoy: deHoy.length, ventasMes: delMes.length,
    fallidosMes: cargos.filter((c) => c.status === "failed").length,
    porDia: [...dias].map(([dia, total]) => ({ dia, total })),
    recientes: cargos.slice(0, 15).map((c) => ({
      id: c.id, cuando: c.created * 1000, monto: c.amount, moneda: c.currency, estado: c.status,
      quien: c.billing_details?.email ?? c.receipt_email ?? c.billing_details?.name ?? "—",
      que: c.description ?? "—", nota: c.status === "failed" ? c.failure_message ?? "" : c.amount_refunded ? "con reembolso" : "",
    })),
    otrasMonedas,
  };
}
