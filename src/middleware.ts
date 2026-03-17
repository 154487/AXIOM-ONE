import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Usar config leve sem Prisma — compatível com Edge Runtime
export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/transactions/:path*",
    "/reports/:path*",
    "/import/:path*",
    "/settings/:path*",
  ],
};
