import "server-only";
import { prisma } from "@/lib/prisma";

export interface HealthSnapshot {
  healthScore: number | null;
  sustainableSurplus: number | null;
  month: string; // "2026-03"
}

export async function getHealthSnapshot(userId: string): Promise<HealthSnapshot> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const txs = await prisma.transaction.findMany({
    where: { userId, date: { gte: monthStart, lte: monthEnd } },
  });

  const income   = txs.filter((t) => t.type === "INCOME") .reduce((a, t) => a + parseFloat(String(t.amount)), 0);
  const expenses = txs.filter((t) => t.type === "EXPENSE").reduce((a, t) => a + parseFloat(String(t.amount)), 0);

  if (income === 0) return { healthScore: null, sustainableSurplus: null, month };

  const savingsRate   = (income - expenses) / income;
  const savingsPoints = Math.min(40, Math.max(0, savingsRate * 200));
  const trendPoints   = income - expenses >= 0 ? 30 : 0;
  // Pilar 4 (Controle, 10pts) omitido intencionalmente — requer query de
  // 3 meses de histórico. healthScore máximo aqui é 90 (vs 100 em Reports).
  const healthScore        = Math.round(savingsPoints + trendPoints + 20);
  const sustainableSurplus = income - expenses;

  return { healthScore, sustainableSurplus, month };
}
