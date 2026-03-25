"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  ArcElement,
  type TooltipItem,
} from "chart.js";
import { formatCurrency } from "@/lib/utils";
import type { AssetType } from "@/generated/prisma/client";
import type { ProventosData } from "./types";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, ArcElement);

const TYPE_COLORS: Partial<Record<AssetType, string>> = {
  STOCK: "#FF6B35",
  FII: "#F7931E",
  ETF: "#FFB347",
  BDR: "#FF8C42",
  CRYPTO: "#A78BFA",
  STOCK_INT: "#3B82F6",
  OTHER: "#6B7280",
  CDB: "#10B981",
  RDB: "#059669",
  LCI: "#34D399",
  LCA: "#6EE7B7",
  TESOURO: "#0EA5E9",
  POUPANCA: "#94A3B8",
  FIXED_INCOME: "#2DD4BF",
};

interface ProventosChartProps {
  monthly: ProventosData["monthly"];
  byCategory: ProventosData["byCategory"];
  loading: boolean;
  currency: string;
  locale: string;
}

export function ProventosChart({ monthly, byCategory, loading, currency, locale }: ProventosChartProps) {
  const [mounted, setMounted] = useState(false);
  const t = useTranslations("Investments");

  useEffect(() => setMounted(true), []);

  if (loading || !mounted) {
    return (
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-axiom-card border border-axiom-border rounded-xl p-5 animate-pulse">
          <div className="h-4 bg-axiom-hover rounded w-1/3 mb-4" />
          <div className="h-48 bg-axiom-hover rounded" />
        </div>
        <div className="bg-axiom-card border border-axiom-border rounded-xl p-5 animate-pulse">
          <div className="h-4 bg-axiom-hover rounded w-1/3 mb-4" />
          <div className="h-48 bg-axiom-hover rounded" />
        </div>
      </div>
    );
  }

  const barData = {
    labels: monthly.map((m) => {
      const [year, month] = m.month.split("-");
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(locale, {
        month: "short",
        year: "2-digit",
      });
    }),
    datasets: [
      {
        label: t("proventos.monthlyChart"),
        data: monthly.map((m) => m.amount),
        backgroundColor: "#FF6B35cc",
        borderColor: "#FF6B35",
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    animation: { duration: 1000, easing: "easeOutQuart" as const },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<"bar">) =>
            formatCurrency(ctx.parsed.y ?? 0, locale, currency),
        },
      },
    },
    scales: {
      x: {
        ticks: { color: "#AAB2BD", font: { size: 11 } },
        grid: { color: "#1E2D42" },
      },
      y: {
        ticks: {
          color: "#AAB2BD",
          font: { size: 11 },
          callback: (value: number | string) =>
            typeof value === "number" ? formatCurrency(value, locale, currency) : value,
        },
        grid: { color: "#1E2D42" },
      },
    },
  };

  const donutLabels = byCategory.map((c) => {
    try {
      return t(`assetTypes.${c.type}`);
    } catch {
      return c.type;
    }
  });

  const donutData = {
    labels: donutLabels,
    datasets: [
      {
        data: byCategory.map((c) => c.amount),
        backgroundColor: byCategory.map((c) => `${TYPE_COLORS[c.type] ?? "#6B7280"}cc`),
        borderColor: byCategory.map((c) => TYPE_COLORS[c.type] ?? "#6B7280"),
        borderWidth: 1,
      },
    ],
  };

  const donutOptions = {
    responsive: true,
    animation: { duration: 1000, easing: "easeOutQuart" as const },
    plugins: {
      legend: {
        position: "right" as const,
        labels: { color: "#AAB2BD", font: { size: 12 }, padding: 12 },
      },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<"doughnut">) =>
            formatCurrency(ctx.parsed, locale, currency),
        },
      },
    },
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="bg-axiom-card border border-axiom-border rounded-xl p-5">
        <p className="text-sm font-medium text-white mb-4">{t("proventos.monthlyChart")}</p>
        {monthly.length > 0 ? (
          <Bar data={barData} options={barOptions} />
        ) : (
          <p className="text-axiom-muted text-sm text-center py-8">Sem dados mensais.</p>
        )}
      </div>
      <div className="bg-axiom-card border border-axiom-border rounded-xl p-5">
        <p className="text-sm font-medium text-white mb-4">{t("proventos.byCategoryChart")}</p>
        {byCategory.length > 0 ? (
          <Doughnut data={donutData} options={donutOptions} />
        ) : (
          <p className="text-axiom-muted text-sm text-center py-8">Sem dados por categoria.</p>
        )}
      </div>
    </div>
  );
}
