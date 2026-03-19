"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { OverviewData } from "../types";

const DURATION = 1000;

function easeOutQuart(t: number) {
  return 1 - Math.pow(1 - t, 4);
}

function useCountUp(target: number | null) {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === null) return;
    startRef.current = null;

    function animate(ts: number) {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / DURATION, 1);
      setCurrent(Math.round(target! * easeOutQuart(progress)));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target]);

  return current;
}

interface HealthScoreCardProps {
  overviewData: OverviewData;
}

export function HealthScoreCard({ overviewData }: HealthScoreCardProps) {
  const t = useTranslations("Reports");
  const score = useCountUp(overviewData.healthScore);

  const scoreColorClass =
    overviewData.healthScore === null
      ? "text-axiom-muted"
      : overviewData.healthScore >= 70
      ? "text-axiom-income"
      : overviewData.healthScore >= 40
      ? "text-yellow-400"
      : "text-axiom-expense";

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 h-full flex flex-col">
      <h3 className="text-white font-semibold mb-4">{t("healthScore")}</h3>

      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        {overviewData.healthScore === null ? (
          <div className="text-center">
            <p className="text-axiom-muted text-3xl font-bold">N/A</p>
            <p className="text-axiom-muted text-sm mt-2">Sem renda no período</p>
          </div>
        ) : (
          <div className="text-center">
            <span className={`text-7xl font-bold tabular-nums ${scoreColorClass}`}>
              {score}
            </span>
            <p className="text-axiom-muted text-sm mt-1">/ 100</p>
          </div>
        )}

        {/* Pilares */}
        <div className="w-full space-y-3">
          {overviewData.pillars.map((p) => (
            <div key={p.label}>
              <div className="flex justify-between text-xs text-axiom-muted mb-1">
                <span>{p.label}</span>
                <span className="font-medium">
                  {p.earnedPoints}/{p.maxPoints}pts
                </span>
              </div>
              <div className="w-full h-1.5 bg-axiom-hover rounded-full">
                <div
                  className={`h-1.5 rounded-full transition-all duration-700 ${
                    p.earnedPoints === p.maxPoints
                      ? "bg-axiom-income"
                      : p.earnedPoints === 0
                      ? "bg-axiom-expense"
                      : "bg-axiom-primary"
                  }`}
                  style={{ width: `${p.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
