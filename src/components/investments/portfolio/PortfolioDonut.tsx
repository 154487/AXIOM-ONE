"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import type { AssetType } from "@/generated/prisma/client";

ChartJS.register(ArcElement, Tooltip, Legend);

const TYPE_COLORS: Partial<Record<AssetType, string>> = {
  STOCK: "#FF6B35",
  FII: "#F7931E",
  ETF: "#FFB347",
  BDR: "#FF8C42",
  CRYPTO: "#A78BFA",
  FIXED_INCOME: "#10B981",
  STOCK_INT: "#3B82F6",
  OTHER: "#6B7280",
};

interface PortfolioDonutProps {
  allocationByType: Partial<Record<AssetType, number>>;
  loading: boolean;
}

export function PortfolioDonut({ allocationByType, loading }: PortfolioDonutProps) {
  const [mounted, setMounted] = useState(false);
  const t = useTranslations("Investments");

  useEffect(() => setMounted(true), []);

  const entries = Object.entries(allocationByType) as [AssetType, number][];

  if (loading || entries.length === 0) {
    return (
      <div className="bg-axiom-card border border-axiom-border rounded-xl p-5 h-64 flex items-center justify-center">
        {loading ? (
          <div className="w-40 h-40 rounded-full bg-axiom-hover animate-pulse" />
        ) : (
          <p className="text-axiom-muted text-sm">{t("empty")}</p>
        )}
      </div>
    );
  }

  const chartData = {
    labels: entries.map(([type]) => t(`assetTypes.${type}`)),
    datasets: [
      {
        data: entries.map(([, pct]) => parseFloat(pct.toFixed(2))),
        backgroundColor: entries.map(([type]) => TYPE_COLORS[type] ?? "#6B7280"),
        borderColor: "#152030",
        borderWidth: 2,
      },
    ],
  };

  const options = {
    animation: { duration: 1000, easing: "easeOutQuart" as const },
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: { color: "#AAB2BD", font: { size: 12 }, padding: 12 },
      },
      tooltip: {
        callbacks: {
          label: (ctx: { label: string; raw: unknown }) =>
            ` ${ctx.label}: ${Number(ctx.raw).toFixed(1)}%`,
        },
      },
    },
    cutout: "65%",
  };

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-5">
      <h3 className="text-sm font-medium text-axiom-muted mb-4">Alocação por Tipo</h3>
      {mounted ? (
        <Doughnut data={chartData} options={options} />
      ) : (
        <div className="w-40 h-40 rounded-full bg-axiom-hover animate-pulse mx-auto" />
      )}
    </div>
  );
}
