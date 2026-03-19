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
import type { NetworthData } from "../types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend
);

interface SavingsRateChartProps {
  networthData: NetworthData;
  currency: string;
  locale: string;
}

export function SavingsRateChart({ networthData, currency, locale }: SavingsRateChartProps) {
  const t = useTranslations("Reports");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { months, avgSavingsRate } = networthData;

  const barColors = months.map((m) => {
    if (m.savingsRate >= 20) return "#10B981";
    if (m.savingsRate < 0) return "#EF4444";
    return "#F59E0B";
  });

  const chartData = {
    labels: months.map((m) => m.month),
    datasets: [
      {
        type: "bar" as const,
        label: t("savingsRate"),
        data: months.map((m) => m.savingsRate),
        backgroundColor: barColors,
        borderRadius: 3,
        order: 2,
      },
      {
        type: "line" as const,
        label: "Meta 20%",
        data: Array(months.length).fill(20),
        borderColor: "#AAB2BD",
        borderDash: [4, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        backgroundColor: "transparent",
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
          font: { size: 11 },
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
            if (ctx.datasetIndex === 1) return null; // esconde tooltip da linha de meta
            const month = months[ctx.dataIndex];
            if (!month) return "";
            const saved = month.monthIncome - month.monthExpenses;
            return [
              ` Taxa: ${month.savingsRate.toFixed(1)}%`,
              ` Poupado: ${formatCurrency(saved, locale, currency)}`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#AAB2BD", font: { size: 11 }, maxTicksLimit: 12 },
        border: { display: false },
      },
      y: {
        grid: { color: "#1E2D42" },
        ticks: {
          color: "#AAB2BD",
          font: { size: 11 },
          callback: (val: number | string) => `${Number(val).toFixed(0)}%`,
        },
        border: { display: false },
      },
    },
  };

  if (months.length === 0) {
    return (
      <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 h-full flex flex-col">
        <h3 className="text-white font-semibold mb-4">{t("savingsRate")}</h3>
        <div className="flex-1 flex items-center justify-center text-axiom-muted text-sm">
          {t("noData")}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-5 h-full flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-white font-semibold">{t("savingsRate")}</h3>
        <span
          className={`text-2xl font-bold ${
            avgSavingsRate >= 20
              ? "text-axiom-income"
              : avgSavingsRate < 0
              ? "text-axiom-expense"
              : "text-yellow-400"
          }`}
        >
          {avgSavingsRate.toFixed(1)}%
        </span>
      </div>
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
