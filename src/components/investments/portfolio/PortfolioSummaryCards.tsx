"use client";

import { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

interface Totals {
  totalInvested: number;
  totalCurrentValue: number;
  totalPnl: number;
  totalPnlPct: number;
}

interface PortfolioSummaryCardsProps {
  totals: Totals | null;
  loading: boolean;
  currency: string;
  locale: string;
}

export function PortfolioSummaryCards({ totals, loading, currency, locale }: PortfolioSummaryCardsProps) {
  const t = useTranslations("Investments");

  if (loading || !totals) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-axiom-card border border-axiom-border rounded-xl p-5 animate-pulse">
            <div className="h-4 bg-axiom-hover rounded w-2/3 mb-3" />
            <div className="h-7 bg-axiom-hover rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  const pnlPositive = totals.totalPnl >= 0;

  const cards = [
    {
      label: t("summary.totalInvested"),
      value: formatCurrency(totals.totalInvested, locale, currency),
      icon: DollarSign,
      color: "text-axiom-muted",
    },
    {
      label: t("summary.currentValue"),
      value: formatCurrency(totals.totalCurrentValue, locale, currency),
      icon: TrendingUp,
      color: "text-axiom-primary",
    },
    {
      label: t("summary.pnl"),
      value: `${formatCurrency(totals.totalPnl, locale, currency)} (${totals.totalPnlPct.toFixed(2)}%)`,
      icon: pnlPositive ? TrendingUp : TrendingDown,
      color: pnlPositive ? "text-axiom-income" : "text-axiom-expense",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="bg-axiom-card border border-axiom-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Icon size={16} className={color} />
            <span className="text-axiom-muted text-sm">{label}</span>
          </div>
          <p className={`text-xl font-semibold ${color}`}>{value}</p>
        </div>
      ))}
    </div>
  );
}
