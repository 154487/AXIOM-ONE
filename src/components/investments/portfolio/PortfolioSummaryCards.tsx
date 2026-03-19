"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

const DURATION = 1000;
function easeOutQuart(t: number) { return 1 - Math.pow(1 - t, 4); }

function useCountUp(target: number) {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = null;
    function animate(ts: number) {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / DURATION, 1);
      setCurrent(target * easeOutQuart(progress));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    }
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target]);

  return current;
}

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

function AnimatedCard({ label, value, pct, icon: Icon, color, currency, locale }: {
  label: string; value: number; pct?: number; icon: React.ElementType;
  color: string; currency: string; locale: string;
}) {
  const animated = useCountUp(value);
  const animatedPct = useCountUp(pct ?? 0);

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={color} />
        <span className="text-axiom-muted text-sm">{label}</span>
      </div>
      <p className={`text-xl font-semibold tabular-nums ${color}`}>
        {formatCurrency(animated, locale, currency)}
        {pct !== undefined && ` (${animatedPct.toFixed(2)}%)`}
      </p>
    </div>
  );
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <AnimatedCard
        label={t("summary.totalInvested")}
        value={totals.totalInvested}
        icon={DollarSign}
        color="text-axiom-muted"
        currency={currency}
        locale={locale}
      />
      <AnimatedCard
        label={t("summary.currentValue")}
        value={totals.totalCurrentValue}
        icon={TrendingUp}
        color="text-axiom-primary"
        currency={currency}
        locale={locale}
      />
      <AnimatedCard
        label={t("summary.pnl")}
        value={totals.totalPnl}
        pct={totals.totalPnlPct}
        icon={pnlPositive ? TrendingUp : TrendingDown}
        color={pnlPositive ? "text-axiom-income" : "text-axiom-expense"}
        currency={currency}
        locale={locale}
      />
    </div>
  );
}
