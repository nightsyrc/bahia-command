"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Vuelve a pedir los datos al servidor cada `segundos` mientras la pestaña está visible. */
export default function AutoRefresh({ segundos = 60 }: { segundos?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, segundos * 1000);
    return () => clearInterval(id);
  }, [router, segundos]);
  return null;
}
