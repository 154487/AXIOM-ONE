"use client";

import { useState, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { formatCurrency } from "@/lib/utils";
import type { FireScenario } from "@/app/api/reports/fire/route";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

interface FireProjectionChartProps {
  scenarios: {
    conservador: FireScenario;
    moderado: FireScenario;
    agressivo: FireScenario;
  };
  fiNumber: number;
  currency: string;
  locale: string;
}

export function FireProjectionChart({
  scenarios,
  fiNumber,
  currency,
  locale,
}: FireProjectionChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const labels = scenarios.moderado.projectionSeries.map((p) => `Ano ${p.year}`);

  const datasets = [
    {
      label: "Conservador (6%)",
      data: scenarios.conservador.projectionSeries.map((p) => p.value),
      borderColor: "#3B82F6",
      backgroundColor: "rgba(59,130,246,0.06)",
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.3,
      fill: false,
    },
    {
      label: "Moderado (8%)",
      data: scenarios.moderado.projectionSeries.map((p) => p.value),
      borderColor: "#10B981",
      backgroundColor: "rgba(16,185,129,0.06)",
      borderWidth: 2.5,
      pointRadius: 0,
      tension: 0.3,
      fill: false,
    },
    {
      label: "Agressivo (10%)",
      data: scenarios.agressivo.projectionSeries.map((p) => p.value),
      borderColor: "#FF6B35",
      backgroundColor: "rgba(255,107,53,0.06)",
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.3,
      fill: false,
    },
    {
      label: "FI Number",
      data: scenarios.moderado.projectionSeries.map(() => fiNumber),
      borderColor: "#FFFFFF",
      backgroundColor: "transparent",
      borderWidth: 1.5,
      borderDash: [4, 4],
      pointRadius: 0,
      tension: 0,
      fill: false,
    },
  ];

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 800, easing: "easeOutQuart" as const },
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      legend: {
        labels: {
          color: "#AAB2BD",
          font: { size: 11 },
          boxWidth: 12,
          boxHeight: 12,
          usePointStyle: true,
          pointStyleWidth: 16,
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
          label: (ctx: any) =>
            `  ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y, locale, currency)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#AAB2BD", font: { size: 10 }, maxTicksLimit: 10 },
        border: { display: false },
      },
      y: {
        grid: { color: "#1E2D42" },
        ticks: {
          color: "#AAB2BD",
          font: { size: 10 },
          callback: (val: number | string) => {
            const n = Number(val);
            if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
            if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
            return String(n);
          },
        },
        border: { display: false },
      },
    },
  };

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-white">Projeção de Crescimento</h3>
        <p className="text-xs text-axiom-muted mt-0.5">3 cenários simultâneos até a independência financeira</p>
      </div>

      {/* Ano projetado por cenário */}
      <div className="flex flex-wrap gap-2">
        <ScenarioBadge label="Conservador" year={scenarios.conservador.projectedYear} color="text-blue-400" />
        <ScenarioBadge label="Moderado" year={scenarios.moderado.projectedYear} color="text-axiom-income" />
        <ScenarioBadge label="Agressivo" year={scenarios.agressivo.projectedYear} color="text-axiom-primary" />
      </div>

      {mounted ? (
        <div style={{ minHeight: 220 }}>
          <Line data={{ labels, datasets }} options={options} />
        </div>
      ) : (
        <div className="animate-pulse bg-axiom-hover rounded-lg" style={{ minHeight: 220 }} />
      )}
    </div>
  );
}

function ScenarioBadge({
  label,
  year,
  color,
}: {
  label: string;
  year: number | null;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-axiom-hover border border-axiom-border">
      <span className="text-xs text-axiom-muted">{label}</span>
      <span className={`text-xs font-semibold ${color}`}>
        {year ? year : "50a+"}
      </span>
    </div>
  );
}
