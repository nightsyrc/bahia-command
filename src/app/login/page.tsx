"use client";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function Entrar() {
  const error = useSearchParams().get("error");
  return (
    <main className="login">
      <div className="card loginCard">
        <p className="eyebrow">Bahía Systems</p>
        <h1>Command</h1>
        <p className="muted">Centro de control del súper administrador.</p>
        {error ? <p className="err" role="alert">Esta cuenta no tiene acceso.</p> : null}
        <button className="primary" type="button" onClick={() => signIn("google", { callbackUrl: "/" })}>
          Entrar con Google
        </button>
      </div>
    </main>
  );
}

export default function Login() {
  return (
    <Suspense>
      <Entrar />
    </Suspense>
  );
}
