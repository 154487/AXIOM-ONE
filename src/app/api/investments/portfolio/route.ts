import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AssetType } from "@/generated/prisma/client";

export interface AssetPosition {
  id: string;
  name: string;
  ticker: string | null;
  type: AssetType;
  currency: string;
  totalQuantity: number;
  avgCost: number;
  currentPrice: number;
  totalInvested: number;
  currentValue: number;
  pnl: number;
  pnlPct: number;
  totalDividends: number;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assets = await prisma.asset.findMany({
    where: { userId: session.user.id },
    include: { entries: { orderBy: { date: "asc" } } },
  });

  const positions: AssetPosition[] = assets.map((asset) => {
    let totalQty = 0;
    let totalCost = 0;
    let totalDividends = 0;

    for (const e of asset.entries) {
      const qty = parseFloat(String(e.quantity));
      const price = parseFloat(String(e.price));
      const amount = parseFloat(String(e.amount));

      if (e.type === "PURCHASE") {
        totalCost += qty * price;
        totalQty += qty;
      } else if (e.type === "SALE") {
        // Reduce position proportionally
        if (totalQty > 0) {
          const avgCostNow = totalCost / totalQty;
          totalCost -= qty * avgCostNow;
        }
        totalQty -= qty;
      } else if (e.type === "DIVIDEND") {
        totalDividends += amount;
      } else if (e.type === "SPLIT") {
        // SPLIT: new quantity = qty field (absolute new total)
        // We just add the extra shares at 0 cost
        const extra = qty - totalQty;
        totalQty = qty;
        // cost stays the same, avg cost decreases
        void extra;
      }
    }

    // Clamp to avoid floating point negatives near zero
    if (totalQty < 0.000001) totalQty = 0;

    const avgCost = totalQty > 0 ? totalCost / totalQty : 0;
    const currentPrice = asset.currentPrice ? parseFloat(String(asset.currentPrice)) : avgCost;
    const totalInvested = totalQty * avgCost;
    const currentValue = totalQty * currentPrice;
    const pnl = currentValue - totalInvested;
    const pnlPct = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

    return {
      id: asset.id,
      name: asset.name,
      ticker: asset.ticker,
      type: asset.type,
      currency: asset.currency,
      totalQuantity: totalQty,
      avgCost,
      currentPrice,
      totalInvested,
      currentValue,
      pnl,
      pnlPct,
      totalDividends,
    };
  });

  // Filter out zero-position assets (fully sold)
  const activePositions = positions.filter((p) => p.totalQuantity > 0);

  const totalInvested = activePositions.reduce((acc, p) => acc + p.totalInvested, 0);
  const totalCurrentValue = activePositions.reduce((acc, p) => acc + p.currentValue, 0);
  const totalPnl = totalCurrentValue - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  // Allocation by type
  const allocationByType: Partial<Record<AssetType, number>> = {};
  for (const p of activePositions) {
    allocationByType[p.type] = (allocationByType[p.type] ?? 0) + p.currentValue;
  }
  // Convert to percentages
  if (totalCurrentValue > 0) {
    for (const key of Object.keys(allocationByType) as AssetType[]) {
      allocationByType[key] = ((allocationByType[key] ?? 0) / totalCurrentValue) * 100;
    }
  }

  return NextResponse.json({
    assets: activePositions,
    totals: { totalInvested, totalCurrentValue, totalPnl, totalPnlPct },
    allocationByType,
  });
}
