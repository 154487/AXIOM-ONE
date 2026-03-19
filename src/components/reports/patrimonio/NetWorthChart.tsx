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
import type { NetworthData } from "../types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend
);

interface NetWorthChartProps {
  networthData: NetworthData;
  currency: string;
  locale: string;
}

export function NetWorthChart({ networthData, currency, locale }: NetWorthChartProps) {
  const t = useTranslations("Reports");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { months } = networthData;
  const lastValue = months.length > 0 ? months[months.length - 1].cumulativeBalance : 0;
  const isPositive = lastValue >= 0;

  const lineColor = isPositive ? "#10B981" : "#EF4444";
  const fillColor = isPositive ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)";

  const chartData = {
    labels: months.map((m) => m.month),
    datasets: [
      {
        label: t("netWorth"),
        data: months.map((m) => m.cumulativeBalance),
        borderColor: lineColor,
        backgroundColor: fillColor,
        borderWidth: 2,
        fill: "origin",
        tension: 0.3,
        pointRadius: months.length > 24 ? 0 : 3,
        pointBackgroundColor: lineColor,
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
      legend: { display: false },
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
            const month = months[ctx.dataIndex];
            const net = formatCurrency(ctx.parsed.y, locale, currency);
            const rate = month ? `${month.savingsRate.toFixed(1)}%` : "";
            return [` Patrimônio: ${net}`, rate ? ` Poupança: ${rate}` : ""];
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
          callback: (val: number | string) => {
            const n = Number(val);
            return n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n);
          },
        },
        border: { display: false },
      },
    },
  };

  if (months.length === 0) {
    return (
      <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 h-full flex flex-col">
        <h3 className="text-white font-semibold mb-4">{t("netWorth")}</h3>
        <div className="flex-1 flex items-center justify-center text-axiom-muted text-sm">
          {t("noData")}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-5 h-full flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-white font-semibold">{t("netWorth")}</h3>
        <span
          className={`text-2xl font-bold ${isPositive ? "text-axiom-income" : "text-axiom-expense"}`}
        >
          {formatCurrency(lastValue, locale, currency)}
        </span>
      </div>
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
