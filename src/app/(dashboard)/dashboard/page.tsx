export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getLocale, getTranslations } from "next-intl/server";
import { KPICard } from "@/components/dashboard/KPICard";
import { MonthlyChart } from "@/components/dashboard/MonthlyChart";
import { SpendingDonut } from "@/components/dashboard/SpendingDonut";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { PeriodFilter } from "@/components/shared/PeriodFilter";
import { Wallet, ArrowUpRight, ArrowDownRight, Scale } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toNumber(val: any): number {
  return parseFloat(String(val));
}

function parsePeriod(
  tipo: string,
  valor: string,
  de: string,
  ate: string
): { start: Date; end: Date } {
  const now = new Date();

  if (tipo === "dia" && valor) {
    return {
      start: new Date(`${valor}T00:00:00`),
      end: new Date(`${valor}T23:59:59.999`),
    };
  }

  if (tipo === "ano" && valor) {
    const year = parseInt(valor);
    return {
      start: new Date(year, 0, 1),
      end: new Date(year, 11, 31, 23, 59, 59, 999),
    };
  }

  if (tipo === "periodo" && de && ate) {
    return {
      start: new Date(`${de}T00:00:00`),
      end: new Date(`${ate}T23:59:59.999`),
    };
  }

  // mes (default)
  if (valor) {
    const [year, month] = valor.split("-").map(Number);
    return {
      start: new Date(year, month - 1, 1),
      end: new Date(year, month, 0, 23, 59, 59, 999),
    };
  }

  // fallback: mês atual
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
  };
}

async function getDashboardData(
  userId: string,
  locale: string,
  start: Date,
  end: Date
) {
  // Período anterior com a mesma duração
  const duration = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - duration - 1);
  const prevEnd = new Date(start.getTime() - 1);

  // 6 meses terminando no mês de `end` para o MonthlyChart
  const endMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0);

  const [allTransactions, periodTx, prevTx, recentTx, categoryTx, defaultCurrency] =
    await Promise.all([
      // All-time para saldo total
      prisma.transaction.findMany({ where: { userId } }),
      // Período selecionado
      prisma.transaction.findMany({
        where: { userId, date: { gte: start, lte: end } },
      }),
      // Período anterior (para comparação)
      prisma.transaction.findMany({
        where: { userId, date: { gte: prevStart, lte: prevEnd } },
      }),
      // Últimas 6 transações (recentes absolutas, não filtradas por período)
      prisma.transaction.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 6,
        include: { category: true },
      }),
      // Despesas do período por categoria (para o donut)
      prisma.transaction.findMany({
        where: { userId, type: "EXPENSE", date: { gte: start, lte: end } },
        include: { category: true },
      }),
      // Moeda padrão
      prisma.userCurrency.findFirst({
        where: { userId, isDefault: true },
      }),
    ]);

  // KPIs do período
  const totalBalance = allTransactions.reduce((acc, tx) => {
    return tx.type === "INCOME"
      ? acc + toNumber(tx.amount)
      : acc - toNumber(tx.amount);
  }, 0);

  const income = periodTx
    .filter((t) => t.type === "INCOME")
    .reduce((acc, t) => acc + toNumber(t.amount), 0);

  const expenses = periodTx
    .filter((t) => t.type === "EXPENSE")
    .reduce((acc, t) => acc + toNumber(t.amount), 0);

  const netDifference = income - expenses;

  // Comparações com período anterior
  const prevIncome = prevTx
    .filter((t) => t.type === "INCOME")
    .reduce((acc, t) => acc + toNumber(t.amount), 0);
  const prevExpenses = prevTx
    .filter((t) => t.type === "EXPENSE")
    .reduce((acc, t) => acc + toNumber(t.amount), 0);
  const prevNet = prevIncome - prevExpenses;

  const incomeChange = prevIncome > 0 ? ((income - prevIncome) / prevIncome) * 100 : 0;
  const expensesChange = prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : 0;
  const netDiffChange = prevNet !== 0 ? ((netDifference - prevNet) / Math.abs(prevNet)) * 100 : 0;

  // MonthlyChart: 6 meses terminando em `endMonth`
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(endMonth.getFullYear(), endMonth.getMonth() - (5 - i), 1);
    const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthTx = allTransactions.filter((t) => t.date >= d && t.date <= mEnd);
    return {
      month: d.toLocaleString(locale, { month: "short" }),
      income: monthTx
        .filter((t) => t.type === "INCOME")
        .reduce((acc, t) => acc + toNumber(t.amount), 0),
      expenses: monthTx
        .filter((t) => t.type === "EXPENSE")
        .reduce((acc, t) => acc + toNumber(t.amount), 0),
    };
  });

  // Donut: despesas por categoria no período
  const categoryMap = new Map<string, { name: string; value: number; color: string }>();
  for (const tx of categoryTx) {
    const key = tx.category.name;
    const existing = categoryMap.get(key);
    if (existing) {
      existing.value += toNumber(tx.amount);
    } else {
      categoryMap.set(key, {
        name: tx.category.name,
        value: toNumber(tx.amount),
        color: tx.category.color,
      });
    }
  }
  const categorySpending = Array.from(categoryMap.values()).sort(
    (a, b) => b.value - a.value
  );

  const currency = defaultCurrency?.code ?? "BRL";

  return {
    totalBalance,
    income,
    expenses,
    netDifference,
    incomeChange,
    expensesChange,
    netDiffChange,
    monthlyData,
    categorySpending,
    currency,
    recentTransactions: recentTx.map((tx) => ({
      id: tx.id,
      description: tx.description,
      amount: toNumber(tx.amount),
      type: tx.type,
      date: tx.date,
      category: { name: tx.category.name, color: tx.category.color },
    })),
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; valor?: string; de?: string; ate?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [locale, t, sp] = await Promise.all([
    getLocale(),
    getTranslations("Dashboard"),
    searchParams,
  ]);

  const { start, end } = parsePeriod(
    sp.tipo ?? "mes",
    sp.valor ?? "",
    sp.de ?? "",
    sp.ate ?? ""
  );

  const data = await getDashboardData(session.user.id, locale, start, end);

  return (
    <div className="space-y-6">
      {/* Filtro de período */}
      <PeriodFilter />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          title={t("totalBalance")}
          value={data.totalBalance}
          icon={<Wallet size={20} />}
          type="neutral"
          locale={locale}
          currency={data.currency}
        />
        <KPICard
          title={t("income")}
          value={data.income}
          change={data.incomeChange}
          icon={<ArrowUpRight size={20} />}
          type="income"
          locale={locale}
          currency={data.currency}
        />
        <KPICard
          title={t("expenses")}
          value={data.expenses}
          change={data.expensesChange}
          icon={<ArrowDownRight size={20} />}
          type="expense"
          locale={locale}
          currency={data.currency}
        />
        <KPICard
          title={t("netDifference")}
          value={data.netDifference}
          change={data.netDiffChange}
          icon={<Scale size={20} />}
          type={data.netDifference >= 0 ? "income" : "expense"}
          locale={locale}
          currency={data.currency}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch">
        <div className="xl:col-span-2">
          <MonthlyChart data={data.monthlyData} currency={data.currency} />
        </div>
        <SpendingDonut data={data.categorySpending} currency={data.currency} />
      </div>

      {/* Recent Transactions */}
      <RecentTransactions transactions={data.recentTransactions} currency={data.currency} />
    </div>
  );
}
