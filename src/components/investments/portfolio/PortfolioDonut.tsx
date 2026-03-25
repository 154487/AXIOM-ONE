"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Doughnut, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from "chart.js";
import { PieChart, BarChart2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { AssetType } from "@/generated/prisma/client";

ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const TYPE_COLORS: Partial<Record<AssetType, string>> = {
  // Renda Variável
  STOCK: "#FF6B35",
  FII: "#F7931E",
  ETF: "#FFB347",
  BDR: "#FF8C42",
  CRYPTO: "#A78BFA",
  STOCK_INT: "#3B82F6",
  OTHER: "#6B7280",
  // Renda Fixa
  CDB: "#10B981",
  RDB: "#059669",
  LCI: "#34D399",
  LCA: "#6EE7B7",
  TESOURO: "#0EA5E9",
  POUPANCA: "#94A3B8",
  FIXED_INCOME: "#2DD4BF",
};

interface PortfolioDonutProps {
  allocationByType: Partial<Record<AssetType, number>>;
  totalCurrentValue: number;
  loading: boolean;
  currency: string;
  locale: string;
}

export function PortfolioDonut({ allocationByType, totalCurrentValue, loading, currency, locale }: PortfolioDonutProps) {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<"donut" | "bar">("donut");
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

  const labels = entries.map(([type]) => t(`assetTypes.${type}`));
  const colors = entries.map(([type]) => TYPE_COLORS[type] ?? "#6B7280");
  const percentages = entries.map(([, pct]) => parseFloat(pct.toFixed(2)));
  const absoluteValues = entries.map(([, pct]) => (pct / 100) * totalCurrentValue);

  const donutData = {
    labels,
    datasets: [{
      data: percentages,
      backgroundColor: colors,
      borderColor: "#152030",
      borderWidth: 2,
    }],
  };

  const donutOptions = {
    animation: { duration: 1000, easing: "easeOutQuart" as const },
    plugins: {
      legend: {
        position: "right" as const,
        labels: { color: "#AAB2BD", font: { size: 12 }, padding: 16, boxWidth: 12 },
      },
      tooltip: {
        callbacks: {
          label: (ctx: { label: string; raw: unknown }) =>
            ` ${ctx.label}: ${Number(ctx.raw).toFixed(1)}%`,
        },
      },
    },
    cutout: "65%",
    maintainAspectRatio: false,
  };

  // Bar chart: horizontal, one bar per type
  // Labels include percentage: "Ações BR · 45.2%"
  const barLabels = entries.map(([type, pct]) =>
    `${t(`assetTypes.${type}`)}  ${pct.toFixed(1)}%`
  );

  const barData = {
    labels: barLabels,
    datasets: [{
      label: currency,
      data: absoluteValues,
      backgroundColor: colors,
      borderRadius: 4,
      borderSkipped: false,
    }],
  };

  const barOptions = {
    indexAxis: "y" as const,
    animation: { duration: 1000, easing: "easeOutQuart" as const },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { dataIndex: number; raw: unknown }) => {
            const val = formatCurrency(Number(ctx.raw), locale, currency);
            const pct = percentages[ctx.dataIndex];
            return ` ${val}  (${pct.toFixed(1)}%)`;
          },
          title: () => "",
        },
      },
    },
    scales: {
      x: {
        grid: { color: "#1E2D42" },
        ticks: {
          color: "#AAB2BD",
          font: { size: 11 },
          callback: (value: number | string) =>
            formatCurrency(Number(value), locale, currency),
        },
      },
      y: {
        grid: { display: false },
        ticks: { color: "#AAB2BD", font: { size: 12 } },
      },
    },
    maintainAspectRatio: false,
  };

  const barHeight = Math.max(160, entries.length * 44);

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-axiom-muted">Alocação por Tipo</h3>
        <div className="flex gap-1 bg-axiom-bg rounded-lg p-1">
          <button
            onClick={() => setView("donut")}
            className={`p-1.5 rounded-md transition-colors ${view === "donut" ? "bg-axiom-primary text-white" : "text-axiom-muted hover:text-white"}`}
          >
            <PieChart size={14} />
          </button>
          <button
            onClick={() => setView("bar")}
            className={`p-1.5 rounded-md transition-colors ${view === "bar" ? "bg-axiom-primary text-white" : "text-axiom-muted hover:text-white"}`}
          >
            <BarChart2 size={14} />
          </button>
        </div>
      </div>

      {mounted ? (
        view === "donut" ? (
          <div className="h-52">
            <Doughnut data={donutData} options={donutOptions} />
          </div>
        ) : (
          <div style={{ height: barHeight }}>
            <Bar data={barData} options={barOptions} />
          </div>
        )
      ) : (
        <div className="w-40 h-40 rounded-full bg-axiom-hover animate-pulse mx-auto" />
      )}
    </div>
  );
}
