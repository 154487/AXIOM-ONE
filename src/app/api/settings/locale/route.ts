import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const LOCALES = ["en", "pt-BR", "es", "fr", "zh", "hi", "ar"];

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { locale } = await req.json();
  if (!LOCALES.includes(locale)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return res;
}
