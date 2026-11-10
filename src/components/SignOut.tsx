"use client";
import { signOut } from "next-auth/react";

export default function SignOut() {
  return (
    <button className="ghost" type="button" onClick={() => signOut({ callbackUrl: "/login" })}>
      Salir
    </button>
  );
}
