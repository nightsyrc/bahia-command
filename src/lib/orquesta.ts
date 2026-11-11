// El orquestador dirige los sistemas desde un solo lugar. Cada sistema expone /api/command/orden,
// protegido con COMMAND_TOKEN, con una lista cerrada de órdenes; Command no guarda claves de nadie más.

export type Orden = { id: string; titulo: string; detalle: string; envia?: boolean };
export type Sistema = { id: string; nombre: string; url: string; salud: string; ordenes: Orden[] };

const origen = (u: string | undefined, respaldo: string) => {
  try { return new URL(u ?? respaldo).origin; } catch { return respaldo; }
};

export function sistemas(): Sistema[] {
  const nightsyrc = origen(process.env.NIGHTSYRC_URL, "https://nightsyrc.vercel.app");
  const bahia = origen(process.env.BAHIA_URL, "https://bahia-systems.vercel.app");
  const lista: Sistema[] = [
    {
      id: "nightsyrc", nombre: "Nightsyrc", url: nightsyrc, salud: "/",
      ordenes: [
        { id: "contenido", titulo: "Traer contenido nuevo", detalle: "Lee los videos recientes de YouTube y los publica en el sitio." },
        { id: "clan", titulo: "Actualizar clan NGTMX", detalle: "Toma ELO y partidas de cada miembro y busca miembros nuevos." },
        { id: "torneos", titulo: "Abrir torneos próximos", detalle: "Crea los torneos que falten para cada categoría de ELO." },
      ],
    },
    {
      id: "bahia", nombre: "Bahía Systems", url: bahia, salud: "/",
      ordenes: [
        { id: "agentes", titulo: "Vuelta de agentes", detalle: "Propone prospectos, redacta borradores y envía solo los correos que ya aprobaste.", envia: true },
        { id: "seguimiento", titulo: "Seguimiento a interesados", detalle: "Envía el siguiente correo a quien pidió información y no respondió (máximo 25).", envia: true },
      ],
    },
  ];
  if (process.env.ATALAYA_STATS_URL) {
    // Atalaya opera una caseta real: desde aquí solo se vigila, no se le dan órdenes.
    lista.push({ id: "atalaya", nombre: "Atalaya", url: origen(process.env.ATALAYA_STATS_URL, ""), salud: "/api/health", ordenes: [] });
  }
  return lista;
}

export type Salud = { id: string; arriba: boolean; estado: number; ms: number };

export async function salud(s: Sistema): Promise<Salud> {
  const inicio = Date.now();
  try {
    const r = await fetch(s.url + s.salud, { cache: "no-store", redirect: "follow", signal: AbortSignal.timeout(8000) });
    return { id: s.id, arriba: r.status < 500, estado: r.status, ms: Date.now() - inicio };
  } catch {
    return { id: s.id, arriba: false, estado: 0, ms: Date.now() - inicio };
  }
}

export type Resultado = { ok: boolean; texto: string; ms: number };

/** Da una orden a un sistema. Solo acepta pares sistema/orden del catálogo. */
export async function ordenar(sistemaId: string, ordenId: string): Promise<Resultado> {
  const s = sistemas().find((x) => x.id === sistemaId);
  if (!s || !s.ordenes.some((o) => o.id === ordenId)) return { ok: false, texto: "Orden desconocida", ms: 0 };
  if (!process.env.COMMAND_TOKEN) return { ok: false, texto: "Falta COMMAND_TOKEN", ms: 0 };
  const inicio = Date.now();
  try {
    const r = await fetch(`${s.url}/api/command/orden`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.COMMAND_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ orden: ordenId }),
      cache: "no-store",
      signal: AbortSignal.timeout(280000),
    });
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; resultado?: unknown };
    const texto = r.status === 404 ? "Este sistema aún no tiene desplegado el receptor de órdenes"
      : j.error ?? JSON.stringify(j.resultado ?? j).slice(0, 400);
    return { ok: r.ok && j.ok !== false, texto, ms: Date.now() - inicio };
  } catch (e) {
    return { ok: false, texto: e instanceof Error ? e.message : String(e), ms: Date.now() - inicio };
  }
}
