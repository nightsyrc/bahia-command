import { neon } from "@neondatabase/serverless";

type Fila = Record<string, unknown>;
const q = (url: string) => neon(url, { fullResults: false });
const IDENT = /^[a-z_][a-z0-9_]*$/;

// ---------- Bahía Systems: prospectos ----------
export type Prospectos = {
  hoy: number; semana: number; mes: number; abiertos: number; bajas: number;
  porInteres: { interes: string; n: number }[];
  ultimos: { creado_at: string; nombre: string; empresa: string | null; email: string; interes: string; estado: string; seg_paso: number }[];
};

export async function prospectos(): Promise<Prospectos> {
  const sql = q(process.env.BAHIA_DATABASE_URL!);
  const existe = (await sql`SELECT to_regclass('public.leads') IS NOT NULL AS ok`) as Fila[];
  if (!existe[0]?.ok) return { hoy: 0, semana: 0, mes: 0, abiertos: 0, bajas: 0, porInteres: [], ultimos: [] };
  const [c] = (await sql`SELECT
      COUNT(*) FILTER (WHERE (creado_at AT TIME ZONE 'America/Mexico_City')::date = (NOW() AT TIME ZONE 'America/Mexico_City')::date)::int AS hoy,
      COUNT(*) FILTER (WHERE creado_at > NOW() - INTERVAL '7 days')::int AS semana,
      COUNT(*) FILTER (WHERE creado_at > NOW() - INTERVAL '30 days')::int AS mes,
      COUNT(*) FILTER (WHERE baja = FALSE AND estado = 'nuevo')::int AS abiertos,
      COUNT(*) FILTER (WHERE baja)::int AS bajas
    FROM leads`) as Fila[];
  const porInteres = (await sql`SELECT interes, COUNT(*)::int AS n FROM leads GROUP BY interes ORDER BY n DESC`) as Prospectos["porInteres"];
  const ultimos = (await sql`SELECT creado_at, nombre, empresa, email, interes, estado, seg_paso FROM leads ORDER BY creado_at DESC LIMIT 10`) as Prospectos["ultimos"];
  return { hoy: c.hoy as number, semana: c.semana as number, mes: c.mes as number, abiertos: c.abiertos as number, bajas: c.bajas as number, porInteres, ultimos };
}

// ---------- Atalaya: operación ----------
export type Operacion = {
  tablas: { tabla: string; filas: number; ultimas24h: number | null; ultima: string | null }[];
  total24h: number;
};

/**
 * Lee la actividad de Atalaya sin depender de su esquema: cuenta filas por tabla y,
 * cuando la tabla tiene una columna de fecha, cuántas se registraron en las últimas 24 horas.
 */
export async function operacion(): Promise<Operacion> {
  const sql = q(process.env.ATALAYA_DATABASE_URL!);
  const tablas = (await sql`SELECT relname AS tabla, n_live_tup::int AS filas FROM pg_stat_user_tables WHERE schemaname = 'public' ORDER BY relname`) as { tabla: string; filas: number }[];
  const cols = (await sql`SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND data_type LIKE 'timestamp%'
    ORDER BY table_name, CASE WHEN column_name ~* '^(creado|created|fecha|inicio|registr)' THEN 0 ELSE 1 END, ordinal_position`) as { table_name: string; column_name: string }[];
  const colDe = new Map<string, string>();
  for (const c of cols) if (!colDe.has(c.table_name)) colDe.set(c.table_name, c.column_name);

  const salida: Operacion["tablas"] = [];
  for (const t of tablas) {
    const col = colDe.get(t.tabla);
    if (!col || !IDENT.test(t.tabla) || !IDENT.test(col)) { salida.push({ ...t, ultimas24h: null, ultima: null }); continue; }
    const r = (await sql(`SELECT COUNT(*) FILTER (WHERE "${col}" > NOW() - INTERVAL '24 hours')::int AS n, MAX("${col}") AS ultima FROM "${t.tabla}"`)) as Fila[];
    salida.push({ ...t, ultimas24h: r[0].n as number, ultima: r[0].ultima ? String(r[0].ultima) : null });
  }
  salida.sort((a, b) => (b.ultimas24h ?? -1) - (a.ultimas24h ?? -1));
  return { tablas: salida, total24h: salida.reduce((a, t) => a + (t.ultimas24h ?? 0), 0) };
}
