"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface SeasonalMonth {
  monthIndex: number;
  name: string;
  avg: number;
  variationPct: number;
  topCategories: { name: string; color: string }[];
}

export function SeasonalAnalysis() {
  const t = useTranslations("Reports");
  const [data, setData] = useState<SeasonalMonth[]>([]);
  const [hasEnoughData, setHasEnoughData] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports/seasonal")
      .then((res) => (res.ok ? res.json() : { hasEnoughData: false, months: [] }))
      .then((json) => {
        setHasEnoughData(json.hasEnoughData);
        setData(json.months ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const currentMonth = new Date().getMonth(); // 0-11

  if (loading) {
    return (
      <div className="bg-axiom-card border border-axiom-border rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4">{t("seasonal")}</h3>
        <div className="grid grid-cols-4 md:grid-cols-6 xl:grid-cols-12 gap-2">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="h-24 bg-axiom-hover rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!hasEnoughData) {
    return (
      <div className="bg-axiom-card border border-axiom-border rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4">{t("seasonal")}</h3>
        <div className="flex items-center justify-center py-8">
          <p className="text-axiom-muted text-sm text-center">{t("insufficientHistory")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-6">
      <h3 className="text-white font-semibold mb-4">{t("seasonal")}</h3>
      <div className="grid grid-cols-4 md:grid-cols-6 xl:grid-cols-12 gap-2">
        {data.map((m) => {
          const isHigh = m.variationPct > 20;
          const isLow = m.variationPct < -10;
          const isCurrent = m.monthIndex === currentMonth;

          const cardClass = isHigh
            ? "bg-axiom-expense/10 border-axiom-expense/30"
            : isLow
            ? "bg-axiom-income/10 border-axiom-income/30"
            : "bg-axiom-hover border-axiom-border";

          const varClass = isHigh
            ? "text-axiom-expense"
            : isLow
            ? "text-axiom-income"
            : "text-axiom-muted";

          return (
            <div
              key={m.monthIndex}
              className={`border rounded-lg p-2 flex flex-col gap-1 ${cardClass} ${
                isCurrent ? "ring-2 ring-axiom-primary" : ""
              }`}
            >
              <p className="text-white text-xs font-semibold">{m.name}</p>
              <p className={`text-xs font-bold ${varClass}`}>
                {m.variationPct >= 0 ? "+" : ""}
                {m.variationPct.toFixed(0)}%
              </p>
              <div className="flex flex-wrap gap-1 mt-auto">
                {m.topCategories.map((cat) => (
                  <span
                    key={cat.name}
                    className="text-[9px] px-1 py-0.5 rounded font-medium truncate max-w-full"
                    style={{
                      backgroundColor: `${cat.color}30`,
                      color: cat.color,
                    }}
                  >
                    {cat.name}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
