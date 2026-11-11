"use client";
import { useState, useTransition } from "react";
import { darOrden } from "@/app/orquestador/acciones";

type Orden = { id: string; titulo: string; detalle: string; envia?: boolean };
type Res = { ok: boolean; texto: string; ms: number };

/** Botones de orden de un sistema. Las órdenes que envían correo piden un segundo toque para confirmar. */
export default function Ordenes({ sistema, ordenes }: { sistema: string; ordenes: Orden[] }) {
  const [res, setRes] = useState<Record<string, Res>>({});
  const [confirma, setConfirma] = useState<string | null>(null);
  const [activa, setActiva] = useState<string | null>(null);
  const [, iniciar] = useTransition();

  function tocar(o: Orden) {
    if (o.envia && confirma !== o.id) { setConfirma(o.id); return; }
    setConfirma(null);
    setActiva(o.id);
    iniciar(async () => {
      const r = await darOrden(sistema, o.id);
      setRes((p) => ({ ...p, [o.id]: r }));
      setActiva(null);
    });
  }

  if (ordenes.length === 0) return <p className="muted small">Solo vigilancia. Este sistema no recibe órdenes desde aquí.</p>;
  return (
    <ul className="ordenes">
      {ordenes.map((o) => {
        const r = res[o.id];
        return (
          <li key={o.id}>
            <div>
              <b>{o.titulo}</b>
              <p className="muted small">{o.detalle}</p>
              {r && <p className={`small ${r.ok ? "bien" : "err"}`} role="status">{r.ok ? "Hecho" : "Falló"} en {(r.ms / 1000).toFixed(1)} s: {r.texto}</p>}
            </div>
            <button type="button" className={confirma === o.id ? "ghost confirma" : "ghost"} disabled={activa !== null} onClick={() => tocar(o)}>
              {activa === o.id ? "Corriendo…" : confirma === o.id ? "Confirmar envío" : "Ejecutar"}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
