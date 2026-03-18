import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getLocale, getTranslations } from "next-intl/server";
import { KPICard } from "@/components/dashboard/KPICard";
import { MonthlyChart } from "@/components/dashboard/MonthlyChart";
import { SpendingDonut } from "@/components/dashboard/SpendingDonut";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { Wallet, ArrowUpRight, ArrowDownRight, Scale } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toNumber(val: any): number {
  return parseFloat(String(val));
}

async function getDashboardData(userId: string, locale: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [allTransactions, thisMonthTx, lastMonthTx, recentTx, categoryTx] =
    await Promise.all([
      // All-time for total balance
      prisma.transaction.findMany({ where: { userId } }),
      // This month
      prisma.transaction.findMany({
        where: { userId, date: { gte: startOfMonth } },
      }),
      // Last month
      prisma.transaction.findMany({
        where: { userId, date: { gte: startOfLastMonth, lte: endOfLastMonth } },
      }),
      // Recent 6 transactions
      prisma.transaction.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 6,
        include: { category: true },
      }),
      // Spending by category (this month, expenses only)
      prisma.transaction.findMany({
        where: { userId, type: "EXPENSE", date: { gte: startOfMonth } },
        include: { category: true },
      }),
    ]);

  // KPI calculations
  const totalBalance =
    allTransactions.reduce((acc, tx) => {
      return tx.type === "INCOME"
        ? acc + toNumber(tx.amount)
        : acc - toNumber(tx.amount);
    }, 0);

  const income = thisMonthTx
    .filter((t) => t.type === "INCOME")
    .reduce((acc, t) => acc + toNumber(t.amount), 0);

  const expenses = thisMonthTx
    .filter((t) => t.type === "EXPENSE")
    .reduce((acc, t) => acc + toNumber(t.amount), 0);

  const netDifference = income - expenses;

  const lastMonthIncome = lastMonthTx
    .filter((t) => t.type === "INCOME")
    .reduce((acc, t) => acc + toNumber(t.amount), 0);
  const lastMonthExpenses = lastMonthTx
    .filter((t) => t.type === "EXPENSE")
    .reduce((acc, t) => acc + toNumber(t.amount), 0);

  const incomeChange = lastMonthIncome > 0 ? ((income - lastMonthIncome) / lastMonthIncome) * 100 : 0;
  const expensesChange = lastMonthExpenses > 0 ? ((expenses - lastMonthExpenses) / lastMonthExpenses) * 100 : 0;
  const netChange = lastMonthTx.reduce((acc, t) =>
    t.type === "INCOME" ? acc + toNumber(t.amount) : acc - toNumber(t.amount), 0);
  const netDiffChange = netChange !== 0 ? ((netDifference - netChange) / Math.abs(netChange)) * 100 : 0;

  // Monthly chart (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const monthTx = allTransactions.filter(
      (t) => t.date >= d && t.date <= end
    );
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

  // Spending by category
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

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations("Dashboard"),
  ]);
  const data = await getDashboardData(session.user.id, locale);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          title={t("totalBalance")}
          value={data.totalBalance}
          icon={<Wallet size={20} />}
          type="neutral"
        />
        <KPICard
          title={t("income")}
          value={data.income}
          change={data.incomeChange}
          icon={<ArrowUpRight size={20} />}
          type="income"
        />
        <KPICard
          title={t("expenses")}
          value={data.expenses}
          change={data.expensesChange}
          icon={<ArrowDownRight size={20} />}
          type="expense"
        />
        <KPICard
          title={t("netDifference")}
          value={data.netDifference}
          change={data.netDiffChange}
          icon={<Scale size={20} />}
          type={data.netDifference >= 0 ? "income" : "expense"}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <MonthlyChart data={data.monthlyData} />
        </div>
        <SpendingDonut data={data.categorySpending} />
      </div>

      {/* Recent Transactions */}
      <RecentTransactions transactions={data.recentTransactions} />
    </div>
  );
}
