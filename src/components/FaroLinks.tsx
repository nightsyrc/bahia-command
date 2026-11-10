"use client";
import { useState } from "react";

type Destino = { id: string; nombre: string; url: string };

/** Genera el enlace rastreado de cada destino para el canal elegido y lo copia con un toque. */
export default function FaroLinks({ destinos, canales }: { destinos: Destino[]; canales: readonly string[] }) {
  const [canal, setCanal] = useState(canales[0]);
  const [copiado, setCopiado] = useState<string | null>(null);
  const enlace = (d: Destino) => `${d.url}${d.url.includes("?") ? "&" : "?"}src=${canal}`;

  async function copiar(d: Destino) {
    try {
      await navigator.clipboard.writeText(enlace(d));
      setCopiado(d.id);
      setTimeout(() => setCopiado(null), 1500);
    } catch { /* el usuario puede copiar a mano */ }
  }

  return (
    <div className="faroLinks">
      <div className="chips" role="radiogroup" aria-label="Canal">
        {canales.map((c) => (
          <button key={c} type="button" role="radio" aria-checked={c === canal} className={`chip ${c === canal ? "on" : ""}`} onClick={() => setCanal(c)}>
            {c}
          </button>
        ))}
      </div>
      <table>
        <tbody>
          {destinos.map((d) => (
            <tr key={d.id}>
              <td>{d.nombre}<br /><code className="muted small">{enlace(d)}</code></td>
              <td className="r">
                <button type="button" className="ghost" onClick={() => copiar(d)}>{copiado === d.id ? "Copiado ✓" : "Copiar"}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
