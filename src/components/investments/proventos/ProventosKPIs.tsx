"use client";

import { useEffect, useRef, useState } from "react";
import { TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { ProventosData } from "./types";

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

interface ProventosKPIsProps {
  data: Pick<ProventosData, "totalReceived" | "last6m" | "last12m" | "last24m"> | null;
  loading: boolean;
  currency: string;
  locale: string;
}

function AnimatedCard({
  label,
  value,
  currency,
  locale,
}: {
  label: string;
  value: number;
  currency: string;
  locale: string;
}) {
  const animated = useCountUp(value);
  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp size={16} className="text-axiom-income" />
        <span className="text-axiom-muted text-sm">{label}</span>
      </div>
      <p className="text-xl font-semibold tabular-nums text-axiom-income">
        {formatCurrency(animated, locale, currency)}
      </p>
    </div>
  );
}

export function ProventosKPIs({ data, loading, currency, locale }: ProventosKPIsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-axiom-card border border-axiom-border rounded-xl p-5 animate-pulse"
          >
            <div className="h-4 bg-axiom-hover rounded w-2/3 mb-3" />
            <div className="h-7 bg-axiom-hover rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-axiom-muted text-sm text-center py-8">
        Nenhum provento registrado ainda.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <AnimatedCard label="Total Recebido" value={data.totalReceived} currency={currency} locale={locale} />
      <AnimatedCard label="Últimos 6 meses" value={data.last6m} currency={currency} locale={locale} />
      <AnimatedCard label="Últimos 12 meses" value={data.last12m} currency={currency} locale={locale} />
      <AnimatedCard label="Últimos 24 meses" value={data.last24m} currency={currency} locale={locale} />
    </div>
  );
}
