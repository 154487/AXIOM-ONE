import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchQuotes } from "@/lib/quotes";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tickers = searchParams.get("tickers")?.split(",").filter(Boolean) ?? [];

  if (tickers.length === 0) return NextResponse.json({ quotes: {} });

  const quotes = await fetchQuotes(tickers);
  return NextResponse.json({ quotes });
}
