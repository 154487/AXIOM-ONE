"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/utils";
import type { CashflowData } from "../types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
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
        type: "bar" as const,
        label: "Receitas",
        data: monthlyBars.map((d) => d.income),
        backgroundColor: "#10B981",
        borderRadius: 4,
        borderSkipped: false,
        order: 2,
      },
      {
        type: "bar" as const,
        label: "Despesas",
        data: monthlyBars.map((d) => d.expenses),
        backgroundColor: "#EF4444",
        borderRadius: 4,
        borderSkipped: false,
        order: 2,
      },
      {
        type: "line" as const,
        label: "Saldo Líquido",
        data: monthlyBars.map((d) => d.net),
        borderColor: monthlyBars.every((d) => d.net >= 0) ? "#10B981" : "#FF6B35",
        backgroundColor: "transparent",
        borderWidth: 2,
        pointBackgroundColor: monthlyBars.map((d) =>
          d.net >= 0 ? "#10B981" : "#EF4444"
        ),
        pointRadius: 4,
        tension: 0.3,
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
    plugins: {
      legend: {
        labels: {
          color: "#AAB2BD",
          font: { size: 12 },
          boxWidth: 12,
          boxHeight: 12,
        },
      },
      tooltip: {
        backgroundColor: "#152030",
        borderColor: "#1E2D42",
        borderWidth: 1,
        titleColor: "#AAB2BD",
        bodyColor: "#fff",
        padding: 10,
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (ctx: any) => {
            return ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y, locale, currency)}`;
          },
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
        grid: { color: "#1E2D42" },
        ticks: {
          color: "#AAB2BD",
          font: { size: 11 },
          callback: (val: number | string) => {
            const n = Number(val);
            return n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n);
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
          <Chart type="bar" data={chartData} options={options as any} />
        ) : (
          <div className="w-full h-full rounded-lg bg-axiom-hover animate-pulse" />
        )}
      </div>
    </div>
  );
}
