"use client";

import { useTranslations } from "next-intl";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import type { OverviewData } from "../types";

interface InsightsCardProps {
  overviewData: OverviewData;
}

function InsightIcon({ type }: { type: "positive" | "negative" | "warning" }) {
  if (type === "positive") return <TrendingUp size={16} className="text-axiom-income shrink-0" />;
  if (type === "negative") return <TrendingDown size={16} className="text-axiom-expense shrink-0" />;
  return <AlertTriangle size={16} className="text-yellow-400 shrink-0" />;
}

export function InsightsCard({ overviewData }: InsightsCardProps) {
  const t = useTranslations("Reports");

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 h-full flex flex-col">
      <h3 className="text-white font-semibold mb-4">{t("insights")}</h3>

      <div className="flex-1 flex flex-col gap-3">
        {overviewData.insights.length === 0 ? (
          <p className="text-axiom-muted text-sm">{t("noData")}</p>
        ) : (
          overviewData.insights.map((insight, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 bg-axiom-hover rounded-lg"
            >
              <div className="mt-0.5">
                <InsightIcon type={insight.type} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm leading-snug">{insight.text}</p>
              </div>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                  insight.type === "positive"
                    ? "bg-axiom-income/20 text-axiom-income"
                    : insight.type === "negative"
                    ? "bg-axiom-expense/20 text-axiom-expense"
                    : "bg-yellow-400/20 text-yellow-400"
                }`}
              >
                {insight.badgeText}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
