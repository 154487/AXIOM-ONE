import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchCryptoBySymbol } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.length < 2) return NextResponse.json([]);
  const results = await searchCryptoBySymbol(q);
  return NextResponse.json(results);
}
