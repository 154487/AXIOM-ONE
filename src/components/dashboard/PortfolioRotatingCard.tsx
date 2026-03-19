"use client";

import { useState, useEffect } from "react";
import { PieChart } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface AllocationItem {
  type: string;
  label: string;
  pct: number;
  value: number;
}

interface PortfolioRotatingCardProps {
  allocations: AllocationItem[];
  currency: string;
  locale: string;
}

const TYPE_STYLES: Record<string, { text: string; bg: string; border: string }> = {
  STOCK:        { text: "text-axiom-primary",  bg: "bg-axiom-primary/10",  border: "border-axiom-primary/30"  },
  FII:          { text: "text-yellow-500",      bg: "bg-yellow-500/10",     border: "border-yellow-500/30"     },
  ETF:          { text: "text-amber-400",       bg: "bg-amber-400/10",      border: "border-amber-400/30"      },
  BDR:          { text: "text-orange-400",      bg: "bg-orange-400/10",     border: "border-orange-400/30"     },
  CRYPTO:       { text: "text-violet-400",      bg: "bg-violet-400/10",     border: "border-violet-400/30"     },
  FIXED_INCOME: { text: "text-axiom-income",    bg: "bg-axiom-income/10",   border: "border-axiom-income/30"   },
  STOCK_INT:    { text: "text-blue-400",        bg: "bg-blue-400/10",       border: "border-blue-400/30"       },
  OTHER:        { text: "text-axiom-muted",     bg: "bg-axiom-hover",       border: "border-axiom-border"      },
};

export function PortfolioRotatingCard({ allocations, currency, locale }: PortfolioRotatingCardProps) {
  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (allocations.length <= 1) return;
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setIndex((i) => (i + 1) % allocations.length);
        setFading(false);
      }, 250);
    }, 8000);
    return () => clearInterval(interval);
  }, [allocations.length]);

  if (allocations.length === 0) return null;

  const current = allocations[index];
  const style = TYPE_STYLES[current.type] ?? TYPE_STYLES.OTHER;

  return (
    <div className={`bg-axiom-card border ${style.border} rounded-xl p-4 flex flex-col gap-2`}>
      <div className={`flex items-center justify-between transition-opacity duration-250 ${fading ? "opacity-0" : "opacity-100"}`}>
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg ${style.bg} flex items-center justify-center shrink-0`}>
            <PieChart size={14} className={style.text} />
          </div>
          <p className={`text-sm font-semibold ${style.text}`}>{current.label}</p>
        </div>
        <span className={`text-xs font-bold tabular-nums ${style.text}`}>{current.pct.toFixed(1)}%</span>
      </div>
      <p className={`text-axiom-muted text-xs leading-relaxed transition-opacity duration-250 ${fading ? "opacity-0" : "opacity-100"}`}>
        {formatCurrency(current.value, locale, currency)} alocado em {current.label.toLowerCase()}.
      </p>
      {allocations.length > 1 && (
        <div className="flex gap-1 mt-1">
          {allocations.map((_, i) => (
            <div
              key={i}
              className={`h-0.5 flex-1 rounded-full transition-colors duration-300 ${i === index ? style.text.replace("text-", "bg-") : "bg-axiom-hover"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
