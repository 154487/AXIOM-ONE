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
import { formatCurrency } from "@/lib/utils";
import type { NetworthData } from "@/components/reports/types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend
);

interface PatrimonioEvolutionChartProps {
  networthData: NetworthData;
  itemsNet: number;
  currency: string;
  locale: string;
}

function makeGradient(
  ctx: CanvasRenderingContext2D,
  top: number,
  bottom: number,
  colorStart: string,
  colorEnd: string
) {
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, colorStart);
  g.addColorStop(1, colorEnd);
  return g;
}

export function PatrimonioEvolutionChart({
  networthData,
  itemsNet,
  currency,
  locale,
}: PatrimonioEvolutionChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { months } = networthData;
  const lastMonth = months.length > 0 ? months[months.length - 1] : null;
  const totalAdjusted = (lastMonth?.cumulativeBalance ?? 0) + itemsNet;
  const isPositive = totalAdjusted >= 0;
  const showPoints = months.length <= 24;

  const chartData = {
    labels: months.map((m) => m.month),
    datasets: [
      {
        label: "Receitas",
        data: months.map((m) => m.monthIncome),
        borderColor: "#10B981",
        borderWidth: 1.5,
        backgroundColor: (ctx: any) => {
          const chart = ctx.chart;
          if (!chart.chartArea) return "rgba(16,185,129,0)";
          const { top, bottom } = chart.chartArea;
          return makeGradient(
            chart.ctx,
            top,
            bottom,
            "rgba(16,185,129,0.35)",
            "rgba(16,185,129,0)"
          );
        },
        fill: "origin",
        tension: 0.4,
        pointRadius: showPoints ? 2 : 0,
        pointBackgroundColor: "#10B981",
        order: 3,
      },
      {
        label: "Despesas",
        data: months.map((m) => m.monthExpenses),
        borderColor: "#EF4444",
        borderWidth: 1.5,
        backgroundColor: (ctx: any) => {
          const chart = ctx.chart;
          if (!chart.chartArea) return "rgba(239,68,68,0)";
          const { top, bottom } = chart.chartArea;
          return makeGradient(
            chart.ctx,
            top,
            bottom,
            "rgba(239,68,68,0.25)",
            "rgba(239,68,68,0)"
          );
        },
        fill: "origin",
        tension: 0.4,
        pointRadius: showPoints ? 2 : 0,
        pointBackgroundColor: "#EF4444",
        order: 4,
      },
      {
        label: "Net Mensal",
        data: months.map((m) => m.monthIncome - m.monthExpenses),
        borderColor: "#FF6B35",
        borderWidth: 1.5,
        backgroundColor: "transparent",
        fill: false,
        tension: 0.4,
        pointRadius: showPoints ? 2 : 0,
        pointBackgroundColor: "#FF6B35",
        order: 2,
      },
      {
        label: "Patrimônio",
        data: months.map((m) => m.cumulativeBalance + itemsNet),
        borderColor: "#FFFFFF",
        borderWidth: 2,
        backgroundColor: "transparent",
        fill: false,
        tension: 0.4,
        pointRadius: showPoints ? 3 : 0,
        pointBackgroundColor: "#FFFFFF",
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
        display: true,
        labels: {
          color: "#AAB2BD",
          font: { size: 11 },
          boxWidth: 12,
          boxHeight: 2,
        },
      },
      tooltip: {
        backgroundColor: "#152030",
        borderColor: "#1E2D42",
        borderWidth: 1,
        titleColor: "#AAB2BD",
        bodyColor: "#fff",
        padding: 12,
        callbacks: {
          title: (items: any[]) => months[items[0]?.dataIndex]?.month ?? "",
          label: (ctx: any) => {
            const m = months[ctx.dataIndex];
            if (!m) return "";
            if (ctx.datasetIndex === 0)
              return ` income : ${formatCurrency(m.monthIncome, locale, currency)}`;
            if (ctx.datasetIndex === 1)
              return ` expenses : ${formatCurrency(m.monthExpenses, locale, currency)}`;
            if (ctx.datasetIndex === 2)
              return ` net : ${formatCurrency(m.monthIncome - m.monthExpenses, locale, currency)}`;
            if (ctx.datasetIndex === 3)
              return ` patrimônio : ${formatCurrency(m.cumulativeBalance + itemsNet, locale, currency)} (+ bens atuais)`;
            return "";
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: "#AAB2BD",
          font: { size: 11 },
          maxTicksLimit: 12,
        },
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
            if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
            if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
            return String(n);
          },
        },
        border: { display: false },
      },
    },
  };

  if (months.length === 0) {
    return (
      <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 h-full flex flex-col">
        <h3 className="text-white font-semibold mb-4">Evolução do Patrimônio</h3>
        <div className="flex-1 flex items-center justify-center text-axiom-muted text-sm">
          Sem dados suficientes para exibir o gráfico
        </div>
      </div>
    );
  }

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-5 h-full flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-white font-semibold">Evolução do Patrimônio</h3>
        <span
          className={`text-2xl font-bold ${
            isPositive ? "text-axiom-income" : "text-axiom-expense"
          }`}
        >
          {formatCurrency(totalAdjusted, locale, currency)}
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
