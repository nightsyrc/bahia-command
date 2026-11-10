import { withAuth } from "next-auth/middleware";

export default withAuth({ pages: { signIn: "/login" } });

// Todo queda protegido excepto el login y las rutas internas de NextAuth.
export const config = { matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"] };
