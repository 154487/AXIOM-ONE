import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextRequest, NextResponse } from "next/server";
import Negotiator from "negotiator";
import { match } from "@formatjs/intl-localematcher";

const LOCALES = ["en", "pt-BR", "es", "fr", "zh", "hi", "ar"];
const DEFAULT = "en";

function detectLocale(acceptLang: string): string {
  const negotiator = new Negotiator({ headers: { "accept-language": acceptLang } });
  try {
    return match(negotiator.languages(), LOCALES, DEFAULT);
  } catch {
    return DEFAULT;
  }
}

const { auth } = NextAuth(authConfig);

export default auth(function middleware(req: NextRequest) {
  const res = NextResponse.next();
  if (!req.cookies.get("NEXT_LOCALE")) {
    const locale = detectLocale(req.headers.get("accept-language") ?? "");
    res.cookies.set("NEXT_LOCALE", locale, { path: "/" });
  }
  return res;
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/transactions/:path*",
    "/reports/:path*",
    "/import/:path*",
    "/settings/:path*",
  ],
};
