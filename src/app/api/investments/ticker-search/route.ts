import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { AssetType } from "@/generated/prisma/client";

interface BrapiStock {
  stock: string;
  name: string;
  close: number | null;
  type: string;
}

function mapType(brapiType: string, ticker: string): AssetType {
  if (brapiType === "fund") return "FII";
  if (brapiType === "bdr") return "BDR";
  if (brapiType === "etf") return "ETF";
  if (ticker.endsWith("11")) return "FII";
  if (ticker.endsWith("34") || ticker.endsWith("33")) return "BDR";
  return "STOCK";
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json([]);

  try {
    const res = await fetch(
      `https://brapi.dev/api/quote/list?search=${encodeURIComponent(q)}&limit=8`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return NextResponse.json([]);

    const data = await res.json();
    const stocks: BrapiStock[] = data.stocks ?? [];

    return NextResponse.json(
      stocks.slice(0, 8).map((s) => ({
        ticker: s.stock,
        name: s.name,
        price: s.close,
        assetType: mapType(s.type ?? "", s.stock),
        currency: "BRL",
      }))
    );
  } catch {
    return NextResponse.json([]);
  }
}
