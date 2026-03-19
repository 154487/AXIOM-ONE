"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/utils";
import type { CashflowData } from "../types";

const LABELS = {
  income: "Receitas",
  expenses: "Despesas",
  net: "Saldo Líquido",
};

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend
);

interface CashFlowChartProps {
  cashflowData: CashflowData;
  currency: string;
  locale: string;
}

export function CashFlowChart({ cashflowData, currency, locale }: CashFlowChartProps) {
  const t = useTranslations("Reports");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { monthlyBars } = cashflowData;

  const chartData = {
    labels: monthlyBars.map((d) => d.month),
    datasets: [
      {
        label: LABELS.income,
        data: monthlyBars.map((d) => d.income),
        borderColor: "#10B981",
        backgroundColor: "rgba(16, 185, 129, 0.15)",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: "#10B981",
        pointBorderColor: "#152030",
        pointBorderWidth: 2,
        pointHoverRadius: 6,
        order: 2,
      },
      {
        label: LABELS.expenses,
        data: monthlyBars.map((d) => d.expenses),
        borderColor: "#EF4444",
        backgroundColor: "rgba(239, 68, 68, 0.15)",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: "#EF4444",
        pointBorderColor: "#152030",
        pointBorderWidth: 2,
        pointHoverRadius: 6,
        order: 3,
      },
      {
        label: LABELS.net,
        data: monthlyBars.map((d) => d.net),
        borderColor: "#FF6B35",
        backgroundColor: "transparent",
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: monthlyBars.map((d) =>
          d.net >= 0 ? "#10B981" : "#EF4444"
        ),
        pointBorderColor: "#152030",
        pointBorderWidth: 2,
        pointHoverRadius: 6,
        borderDash: [],
        order: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1000,
      easing: "easeOutQuart" as const,
    },
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: "top" as const,
        align: "end" as const,
        labels: {
          color: "#AAB2BD",
          font: { size: 12 },
          boxWidth: 10,
          boxHeight: 10,
          borderRadius: 5,
          usePointStyle: true,
          pointStyle: "circle",
        },
      },
      tooltip: {
        backgroundColor: "#0D1B2A",
        borderColor: "#1E2D42",
        borderWidth: 1,
        titleColor: "#ffffff",
        bodyColor: "#AAB2BD",
        padding: 12,
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (ctx: any) => {
            const color = ctx.dataset.borderColor as string;
            const label = ctx.dataset.label ?? "";
            const val = formatCurrency(ctx.parsed.y, locale, currency);
            return `  ${label}: ${val}`;
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          labelColor: (ctx: any) => ({
            borderColor: "transparent",
            backgroundColor: ctx.dataset.borderColor,
            borderRadius: 4,
          }),
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#AAB2BD", font: { size: 11 } },
        border: { display: false },
      },
      y: {
        grid: {
          color: "#1E2D42",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          borderDash: [4, 4] as any,
        },
        ticks: {
          color: "#AAB2BD",
          font: { size: 11 },
          callback: (val: number | string) => {
            const n = Number(val);
            if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
            if (n <= -1000) return `${(n / 1000).toFixed(0)}k`;
            return String(n);
          },
        },
        border: { display: false },
      },
    },
  };

  if (monthlyBars.length === 0) {
    return (
      <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 h-full flex flex-col">
        <h3 className="text-white font-semibold mb-4">{t("cashFlow")}</h3>
        <div className="flex-1 flex items-center justify-center text-axiom-muted text-sm">
          {t("noData")}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-5 h-full flex flex-col">
      <h3 className="text-white font-semibold mb-4">{t("cashFlow")}</h3>
      <div className="flex-1 min-h-0">
        {mounted ? (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <Line data={chartData} options={options as any} />
        ) : (
          <div className="w-full h-full rounded-lg bg-axiom-hover animate-pulse" />
        )}
      </div>
    </div>
  );
}
