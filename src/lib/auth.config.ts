import type { NextAuthConfig } from "next-auth";

// Config sem dependências do Node.js — compatível com Edge Runtime (middleware)
export const authConfig: NextAuthConfig = {
  providers: [],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const protectedPaths = ["/dashboard", "/transactions", "/reports", "/import", "/settings"];
      const isProtected = protectedPaths.some((p) => nextUrl.pathname.startsWith(p));

      if (isProtected && !isLoggedIn) return false;
      return true;
    },
  },
};
