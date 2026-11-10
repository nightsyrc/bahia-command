// Caravana: embudo de ventas por canal. La fuente de verdad es Stripe (sesiones de pago y su metadata.src)
// y los prospectos de Bahía (columna origen). No guarda nada propio.

type Sesion = {
  id: string; created: number; status: "open" | "complete" | "expired"; payment_status: string;
  amount_total: number | null; currency: string; metadata: Record<string, string> | null;
};

export type FilaCanal = { canal: string; iniciadas: number; pagadas: number; ingresos: number };
export type FilaProducto = { producto: string; iniciadas: number; pagadas: number; ingresos: number; canales: FilaCanal[] };
export type Embudo = { productos: FilaProducto[]; iniciadas: number; pagadas: number; ingresos: number; sinPermiso: boolean };

const NOMBRES: Record<string, string> = {
  "nightsyrc-guitar-academy-beta1": "Libro Nightsyrc Guitar Academy",
  tournament_entry: "Inscripción a torneos AoE2",
};

/** Sesiones de pago de los últimos 30 días, agrupadas por producto y por canal (metadata.src). */
export async function embudo(): Promise<Embudo> {
  const desde = Math.floor(Date.now() / 1000) - 30 * 86400;
  const sesiones: Sesion[] = [];
  let despues: string | null = null;
  for (let i = 0; i < 10; i++) {
    const url: string = `https://api.stripe.com/v1/checkout/sessions?limit=100&created[gte]=${desde}${despues ? `&starting_after=${despues}` : ""}`;
    const r: Response = await fetch(url, { headers: { Authorization: `Bearer ${process.env.STRIPE_READ_KEY}` }, cache: "no-store" });
    if (r.status === 401 || r.status === 403) return { productos: [], iniciadas: 0, pagadas: 0, ingresos: 0, sinPermiso: true };
    if (!r.ok) throw new Error(`Stripe ${r.status}`);
    const page = (await r.json()) as { data: Sesion[]; has_more: boolean };
    sesiones.push(...page.data);
    if (!page.has_more || page.data.length === 0) break;
    despues = page.data[page.data.length - 1].id;
  }

  const porProducto = new Map<string, Map<string, FilaCanal>>();
  for (const s of sesiones) {
    const m = s.metadata ?? {};
    const producto = NOMBRES[m.product ?? m.type ?? ""] ?? m.product ?? m.type ?? "Otro";
    const canal = m.src || "sin rastrear";
    const canales = porProducto.get(producto) ?? new Map<string, FilaCanal>();
    const fila = canales.get(canal) ?? { canal, iniciadas: 0, pagadas: 0, ingresos: 0 };
    fila.iniciadas++;
    if (s.payment_status === "paid") { fila.pagadas++; fila.ingresos += s.amount_total ?? 0; }
    canales.set(canal, fila);
    porProducto.set(producto, canales);
  }

  const productos: FilaProducto[] = [...porProducto].map(([producto, canales]) => {
    const lista = [...canales.values()].sort((a, b) => b.ingresos - a.ingresos || b.iniciadas - a.iniciadas);
    return {
      producto,
      iniciadas: lista.reduce((a, c) => a + c.iniciadas, 0),
      pagadas: lista.reduce((a, c) => a + c.pagadas, 0),
      ingresos: lista.reduce((a, c) => a + c.ingresos, 0),
      canales: lista,
    };
  }).sort((a, b) => b.ingresos - a.ingresos || b.iniciadas - a.iniciadas);

  return {
    productos,
    iniciadas: productos.reduce((a, p) => a + p.iniciadas, 0),
    pagadas: productos.reduce((a, p) => a + p.pagadas, 0),
    ingresos: productos.reduce((a, p) => a + p.ingresos, 0),
    sinPermiso: false,
  };
}

// ---------- Enlaces rastreados ----------
export const CANALES = ["facebook", "instagram", "tiktok", "youtube", "whatsapp", "twitch", "kick"] as const;

export function destinos() {
  const nightsyrc = process.env.NIGHTSYRC_URL ?? "https://nightsyrc.vercel.app";
  const bahia = process.env.BAHIA_URL ?? "https://bahia-systems.vercel.app";
  return [
    { id: "libro-es", nombre: "Libro de guitarra (español)", url: `${nightsyrc}/es/nightsyrcGuitarAcademy` },
    { id: "libro-en", nombre: "Guitar book (English)", url: `${nightsyrc}/nightsyrcGuitarAcademy` },
    { id: "bahia", nombre: "Bahía Systems: demo de Atalaya", url: `${bahia}/` },
  ];
}
