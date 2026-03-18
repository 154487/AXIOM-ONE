"use client";

import { useEffect, useRef, useState } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

const DURATION = 1000;

function easeOutQuart(t: number) {
  return 1 - Math.pow(1 - t, 4);
}

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
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target]);

  return current;
}

interface KPICardProps {
  title: string;
  value: number;
  change?: number;
  icon: React.ReactNode;
  type?: "income" | "expense" | "neutral";
  locale?: string;
  currency?: string;
}

export function KPICard({
  title,
  value,
  change,
  icon,
  type = "neutral",
  locale = "pt-BR",
  currency = "BRL",
}: KPICardProps) {
  const animated = useCountUp(value);
  const isPositive = (change ?? 0) >= 0;

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-5 relative overflow-hidden">
      {/* Change badge */}
      {change !== undefined && (
        <div
          className={cn(
            "absolute top-3 right-3 flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
            isPositive
              ? "text-axiom-income bg-axiom-income/10"
              : "text-axiom-expense bg-axiom-expense/10"
          )}
        >
          {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {isPositive ? "+" : ""}
          {change?.toFixed(1)}%
        </div>
      )}

      {/* Icon */}
      <div
        className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center mb-4",
          type === "income" && "bg-axiom-income/20 text-axiom-income",
          type === "expense" && "bg-axiom-expense/20 text-axiom-expense",
          type === "neutral" && "bg-axiom-primary/20 text-axiom-primary"
        )}
      >
        {icon}
      </div>

      <p className="text-axiom-muted text-sm mb-1">{title}</p>
      <p className="text-white text-2xl font-bold tabular-nums">
        {formatCurrency(animated, locale, currency)}
      </p>
    </div>
  );
}
