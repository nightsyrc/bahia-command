import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/auth";
import SignOut from "@/components/SignOut";
import Ordenes from "@/components/Ordenes";
import { fecha, money, panel } from "@/lib/fmt";
import { ingresos } from "@/lib/stripe";
import { prospectos } from "@/lib/db";
import { despliegues } from "@/lib/vercel";
import { salud, sistemas } from "@/lib/orquesta";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const env = (k: string) => (process.env[k] ? null : k);

export default async function Orquestador() {
  const admin = await requireAdmin();
  if (!admin) redirect("/login");

  const lista = sistemas();
  const [estados, ing, pros, dep] = await Promise.all([
    Promise.all(lista.map(salud)),
    panel(env("STRIPE_READ_KEY"), ingresos),
    panel(env("BAHIA_STATS_URL") ?? env("COMMAND_TOKEN"), prospectos),
    panel(env("VERCEL_TOKEN"), despliegues),
  ]);

  // Lo que pide tu atención hoy, de mayor a menor urgencia.
  const atencion: { nivel: "mal" | "ojo"; texto: string }[] = [];
  for (const e of estados) if (!e.arriba) atencion.push({ nivel: "mal", texto: `${lista.find((s) => s.id === e.id)?.nombre} no responde (${e.estado || "sin conexión"})` });
  if (dep.ok) for (const d of dep.data) if (d.estado === "ERROR" || d.estado === "CANCELED") atencion.push({ nivel: "mal", texto: `El último despliegue de ${d.nombre} falló` });
  if (ing.ok && ing.data.fallidosMes > 0) atencion.push({ nivel: "ojo", texto: `${ing.data.fallidosMes} pagos fallidos este mes: revisa quién intentó comprar` });
  if (pros.ok && pros.data.abiertos > 0) atencion.push({ nivel: "ojo", texto: `${pros.data.abiertos} prospectos abiertos esperan respuesta` });
  if (ing.ok && ing.data.ventasMes === 0) atencion.push({ nivel: "ojo", texto: "Sin ventas este mes: comparte un enlace de Caravana en un canal hoy" });

  return (
    <main className="wrap">
      <header className="top">
        <div>
          <p className="eyebrow">Bahía Systems</p>
          <h1>Orquestador</h1>
        </div>
        <div className="who">
          <Link href="/">Ver monitor</Link>
          <span className="muted">{admin} · {fecha(Date.now())}</span>
          <SignOut />
        </div>
      </header>

      <section className="card">
        <h2>Atención <span className="tag">{atencion.length || "nada pendiente"}</span></h2>
        {atencion.length === 0 ? <p className="muted">Todo responde y no hay pendientes.</p> : (
          <ul className="atencion">
            {atencion.map((a, i) => <li key={i} className={a.nivel}>{a.texto}</li>)}
          </ul>
        )}
        {ing.ok && <p className="muted small">Ingresos del mes: {money(ing.data.mesCalendario)} en {ing.data.ventasMes} ventas.</p>}
      </section>

      <div className="grid2">
        {lista.map((s) => {
          const e = estados.find((x) => x.id === s.id)!;
          const d = dep.ok ? dep.data.find((x) => s.url.includes(x.nombre) || x.nombre.includes(s.id)) : undefined;
          return (
            <section className="card" key={s.id}>
              <h2>
                {s.nombre}
                <span className={`pill ${e.arriba ? "succeeded" : "failed"}`}>{e.arriba ? `en línea · ${e.ms} ms` : "caído"}</span>
              </h2>
              <p className="muted small">
                <a href={s.url} target="_blank" rel="noreferrer">{s.url.replace("https://", "")}</a>
                {d?.cuando ? ` · desplegado ${fecha(d.cuando)}${d.rama ? ` desde ${d.rama}` : ""}` : ""}
              </p>
              <Ordenes sistema={s.id} ordenes={s.ordenes} />
            </section>
          );
        })}
      </div>
    </main>
  );
}
