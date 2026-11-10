import { redirect } from "next/navigation";
import { requireAdmin } from "@/auth";
import AutoRefresh from "@/components/AutoRefresh";
import SignOut from "@/components/SignOut";
import { fecha, money, num, panel, type Panel } from "@/lib/fmt";
import { ingresos } from "@/lib/stripe";
import { operacion, prospectos } from "@/lib/db";
import { despliegues } from "@/lib/vercel";

export const dynamic = "force-dynamic";

const env = (k: string) => (process.env[k] ? null : k);
// Precio del plan Condominio de Bahía Systems (MXN/mes), para estimar el potencial de los prospectos abiertos.
const PLAN_REFERENCIA_MXN = 2990;

function Aviso({ p }: { p: Panel<unknown> }) {
  return p.ok ? null : <p className="aviso">{p.motivo}</p>;
}

export default async function Command() {
  const admin = await requireAdmin();
  if (!admin) redirect("/login");

  const [ing, pros, ope, dep] = await Promise.all([
    panel(env("STRIPE_READ_KEY"), ingresos),
    panel(env("BAHIA_STATS_URL") ?? env("COMMAND_TOKEN"), prospectos),
    panel(env("ATALAYA_STATS_URL") ?? env("COMMAND_TOKEN"), operacion),
    panel(env("VERCEL_TOKEN"), despliegues),
  ]);

  const meta = Number(process.env.MONTHLY_GOAL_MXN ?? "0") * 100;
  const avance = ing.ok && meta > 0 ? Math.min(100, Math.round((ing.data.mesCalendario / meta) * 100)) : 0;
  const maxDia = ing.ok ? Math.max(1, ...ing.data.porDia.map((d) => d.total)) : 1;

  return (
    <main className="wrap">
      <AutoRefresh segundos={60} />
      <header className="top">
        <div>
          <p className="eyebrow">Bahía Systems</p>
          <h1>Command</h1>
        </div>
        <div className="who">
          <span className="muted">{admin} · actualizado {fecha(Date.now())}</span>
          <SignOut />
        </div>
      </header>

      {/* ---------------- Ingresos ---------------- */}
      <section className="card">
        <h2>Ingresos reales <span className="tag">Stripe · en vivo</span></h2>
        <Aviso p={ing} />
        {ing.ok && (
          <>
            <div className="kpis">
              <div className="kpi"><span>Hoy</span><b>{money(ing.data.hoy)}</b><small>{ing.data.ventasHoy} ventas</small></div>
              <div className="kpi"><span>Últimos 7 días</span><b>{money(ing.data.semana)}</b></div>
              <div className="kpi"><span>Este mes</span><b>{money(ing.data.mesCalendario)}</b><small>{ing.data.ventasMes} ventas</small></div>
              <div className="kpi">
                <span>Saldo Stripe</span>
                <b>{money(ing.data.disponible.find((b) => b.currency === "mxn")?.amount ?? 0)}</b>
                <small>pendiente {money(ing.data.pendiente.find((b) => b.currency === "mxn")?.amount ?? 0)}</small>
              </div>
            </div>
            {meta > 0 && (
              <div className="meta">
                <div className="metaTxt"><span>Meta del mes {money(meta)}</span><b>{avance}%</b></div>
                <div className="barra"><div style={{ width: `${avance}%` }} /></div>
              </div>
            )}
            <div className="chart" aria-label="Ventas por día, últimos 30 días, MXN">
              {ing.data.porDia.map((d) => (
                <div key={d.dia} className="col" title={`${d.dia}: ${money(d.total)}`}>
                  <div className="bar" style={{ height: `${Math.max(2, (d.total / maxDia) * 100)}%`, opacity: d.total ? 1 : 0.25 }} />
                </div>
              ))}
            </div>
            <p className="muted small">Ventas netas por día en MXN, últimos 30 días.{ing.data.fallidosMes ? ` ${ing.data.fallidosMes} pagos fallidos en el periodo.` : ""}
              {Object.keys(ing.data.otrasMonedas).length ? ` Otras monedas: ${Object.entries(ing.data.otrasMonedas).map(([c, v]) => money(v, c)).join(", ")}.` : ""}</p>
            <table>
              <thead><tr><th>Cuándo</th><th>Cliente</th><th>Concepto</th><th className="r">Monto</th><th>Estado</th></tr></thead>
              <tbody>
                {ing.data.recientes.length === 0 && <tr><td colSpan={5} className="muted">Aún no hay pagos en los últimos 30 días.</td></tr>}
                {ing.data.recientes.map((c) => (
                  <tr key={c.id}>
                    <td>{fecha(c.cuando)}</td><td>{c.quien}</td><td>{c.que}</td>
                    <td className="r">{money(c.monto, c.moneda)}</td>
                    <td><span className={`pill ${c.estado}`}>{c.estado === "succeeded" ? "pagado" : c.estado === "failed" ? "fallido" : c.estado}</span>{c.nota ? <small className="muted"> {c.nota}</small> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      <div className="grid2">
        {/* ---------------- Prospectos ---------------- */}
        <section className="card">
          <h2>Prospectos Bahía Systems</h2>
          <Aviso p={pros} />
          {pros.ok && (
            <>
              <div className="kpis">
                <div className="kpi"><span>Hoy</span><b>{num(pros.data.hoy)}</b></div>
                <div className="kpi"><span>7 días</span><b>{num(pros.data.semana)}</b></div>
                <div className="kpi"><span>Abiertos</span><b>{num(pros.data.abiertos)}</b></div>
              </div>
              <p className="muted small">
                Potencial si los {pros.data.abiertos} abiertos contratan el plan Condominio: {money(pros.data.abiertos * PLAN_REFERENCIA_MXN * 100)} al mes.
                {pros.data.bajas ? ` ${pros.data.bajas} se dieron de baja.` : ""}
              </p>
              <table>
                <thead><tr><th>Cuándo</th><th>Quién</th><th>Interés</th><th>Seguimiento</th></tr></thead>
                <tbody>
                  {pros.data.ultimos.length === 0 && <tr><td colSpan={4} className="muted">Todavía no hay prospectos.</td></tr>}
                  {pros.data.ultimos.map((l, i) => (
                    <tr key={i}>
                      <td>{fecha(l.creado_at)}</td>
                      <td>{l.nombre}{l.empresa ? ` · ${l.empresa}` : ""}<br /><small className="muted">{l.email}</small></td>
                      <td>{l.interes}</td>
                      <td>{l.estado} · paso {l.seg_paso}/2</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>

        {/* ---------------- Atalaya ---------------- */}
        <section className="card">
          <h2>Operación Atalaya</h2>
          <Aviso p={ope} />
          {ope.ok && (
            <>
              <div className="kpis">
                <div className="kpi"><span>Registros en 24 h</span><b>{num(ope.data.total24h)}</b></div>
                <div className="kpi"><span>Tablas</span><b>{num(ope.data.tablas.length)}</b></div>
              </div>
              <table>
                <thead><tr><th>Tabla</th><th className="r">24 h</th><th className="r">Total</th><th>Último registro</th></tr></thead>
                <tbody>
                  {ope.data.tablas.map((t) => (
                    <tr key={t.tabla}>
                      <td>{t.tabla}</td>
                      <td className="r">{t.ultimas24h ?? "—"}</td>
                      <td className="r">{num(t.filas)}</td>
                      <td>{t.ultima ? fecha(t.ultima) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>
      </div>

      {/* ---------------- Despliegues ---------------- */}
      <section className="card">
        <h2>Despliegues <span className="tag">Vercel</span></h2>
        <Aviso p={dep} />
        {dep.ok && (
          <table>
            <thead><tr><th>Proyecto</th><th>Estado</th><th>Rama</th><th>Cuándo</th></tr></thead>
            <tbody>
              {dep.data.map((p) => (
                <tr key={p.nombre}>
                  <td>{p.url ? <a href={p.url} target="_blank" rel="noreferrer">{p.nombre}</a> : p.nombre}</td>
                  <td><span className={`pill ${p.estado === "READY" ? "succeeded" : p.estado === "ERROR" ? "failed" : ""}`}>{p.estado}</span></td>
                  <td>{p.rama ?? "—"}</td>
                  <td>{p.cuando ? fecha(p.cuando) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <p className="muted small foot">Se actualiza solo cada 60 segundos. Solo lectura: este panel no modifica datos.</p>
    </main>
  );
}
