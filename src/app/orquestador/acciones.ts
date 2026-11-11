"use server";
import { requireAdmin } from "@/auth";
import { ordenar, type Resultado } from "@/lib/orquesta";

export async function darOrden(sistema: string, orden: string): Promise<Resultado> {
  if (!(await requireAdmin())) return { ok: false, texto: "No autorizado", ms: 0 };
  return ordenar(sistema, orden);
}
