import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { theme } = await req.json();
  if (theme !== "dark" && theme !== "light") {
    return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("AXIOM_THEME", theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return res;
}
