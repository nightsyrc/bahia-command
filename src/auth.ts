import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

/** Correos con acceso de súper administrador. Todo lo demás se rechaza. */
export function admins(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: { params: { prompt: "select_account" } },
    }),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async signIn({ profile }) {
      const p = profile as { email?: string; email_verified?: boolean } | undefined;
      const email = p?.email?.toLowerCase();
      return Boolean(email && p?.email_verified && admins().includes(email));
    },
  },
};

/** Segunda barrera: cada página vuelve a comprobar la sesión en el servidor. */
export async function requireAdmin(): Promise<string | null> {
  const s = await getServerSession(authOptions);
  const email = s?.user?.email?.toLowerCase();
  return email && admins().includes(email) ? email : null;
}
