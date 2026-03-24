"use client";

import { useState, useEffect, useMemo } from "react";
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
import type { FireScenario } from "@/types/fire";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

// Plugin inline: desenha linha vertical verde no mês em que o cenário moderado atinge a meta
const verticalLinePlugin = {
  id: "fireTargetLine",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  afterDraw(chart: any) {
    const targetMonth: number | undefined = chart.options.plugins?.fireTargetLine?.targetMonth;
    if (!targetMonth) return;

    const meta = chart.getDatasetMeta(1); // dataset moderado
    if (!meta?.data?.[targetMonth]) return;

    const x = meta.data[targetMonth].x;
    const { top, bottom } = chart.chartArea;
    const ctx: CanvasRenderingContext2D = chart.ctx;

    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#10B981";
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();

    ctx.restore();
  },
};
ChartJS.register(verticalLinePlugin);

const HORIZONS: { label: string; value: number }[] = [
  { label: "1a", value: 1 },
  { label: "5a", value: 5 },
  { label: "10a", value: 10 },
  { label: "15a", value: 15 },
  { label: "50a", value: 50 },
];

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

  // Horizonte padrão: farthest projected year + buffer, arredondado para a opção mais próxima
  const defaultHorizon = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const maxYear = Math.max(
      scenarios.conservador.projectedYear ?? currentYear + 50,
      scenarios.moderado.projectedYear ?? currentYear + 50,
      scenarios.agressivo.projectedYear ?? currentYear + 50
    );
    const yearsNeeded = maxYear - currentYear + 5;
    const found = HORIZONS.find((h) => h.value >= yearsNeeded);
    return found?.value ?? 50;
  }, [scenarios]);

  const [horizon, setHorizon] = useState(defaultHorizon);

  useEffect(() => setMounted(true), []);
  useEffect(() => setHorizon(defaultHorizon), [defaultHorizon]);

  // Filtrar série pelo horizonte em meses
  const maxMonths = horizon * 12;
  const slice = (series: { month: number; value: number }[]) =>
    series.filter((p) => p.month <= maxMonths);

  // Índice do mês em que o moderado atinge a meta (dentro da janela visível)
  const targetMonthIndex = scenarios.moderado.projectedMonths !== null &&
    scenarios.moderado.projectedMonths <= maxMonths
    ? scenarios.moderado.projectedMonths
    : null;

  const base = slice(scenarios.moderado.projectionSeries);
  // Label visível só nos múltiplos de 12 (1 por ano) — eixo X limpo
  const labels = base.map((p) =>
    p.month % 12 === 0 ? `${p.month / 12}a` : ""
  );

  const datasets = [
    {
      label: `Pessimista (${(scenarios.conservador.rate * 100).toFixed(1)}%)`,
      data: slice(scenarios.conservador.projectionSeries).map((p) => p.value),
      borderColor: "#3B82F6",
      backgroundColor: "rgba(59,130,246,0.06)",
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.3,
      fill: false,
    },
    {
      label: `Base (${(scenarios.moderado.rate * 100).toFixed(1)}%)`,
      data: base.map((p) => p.value),
      borderColor: "#10B981",
      backgroundColor: "rgba(16,185,129,0.06)",
      borderWidth: 2.5,
      pointRadius: 0,
      tension: 0.3,
      fill: false,
    },
    {
      label: `Otimista (${(scenarios.agressivo.rate * 100).toFixed(1)}%)`,
      data: slice(scenarios.agressivo.projectionSeries).map((p) => p.value),
      borderColor: "#FF6B35",
      backgroundColor: "rgba(255,107,53,0.06)",
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.3,
      fill: false,
    },
    {
      label: "Meta",
      data: base.map(() => fiNumber),
      borderColor: "rgba(255,255,255,0.4)",
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
      fireTargetLine: { targetMonth: targetMonthIndex },
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        backgroundColor: (ctx: any) =>
          ctx.tooltip?.dataPoints?.[0]?.dataIndex === targetMonthIndex
            ? "#10B981"
            : "#152030",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        borderColor: (ctx: any) =>
          ctx.tooltip?.dataPoints?.[0]?.dataIndex === targetMonthIndex
            ? "#10B981"
            : "#1E2D42",
        borderWidth: 1,
        titleColor: "#fff",
        bodyColor: "#fff",
        padding: 10,
        callbacks: {
          title: (items: { dataIndex: number }[]) => {
            const month = items[0]?.dataIndex ?? 0;
            const isTarget = month === targetMonthIndex;
            if (month === 0) return "Hoje";
            const years = Math.floor(month / 12);
            const remainingMonths = month % 12;
            let base: string;
            if (years === 0) base = `Mês ${month}`;
            else if (remainingMonths === 0) base = `Mês ${month} · Ano ${years}`;
            else base = `Mês ${month} · ${years}a ${remainingMonths}m`;
            return isTarget ? `${base} · Meta atingida 🎉` : base;
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (ctx: any) =>
            `  ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y, locale, currency)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: "#AAB2BD",
          font: { size: 10 },
          maxRotation: 0,
          autoSkip: false,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          callback: (_: any, index: number) => labels[index] ?? "",
        },
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Projeção de Crescimento</h3>
          <p className="text-xs text-axiom-muted mt-0.5">3 cenários simultâneos até a independência financeira</p>
        </div>
        {/* Seletor de horizonte */}
        <div className="flex gap-0.5 shrink-0">
          {HORIZONS.map((h) => (
            <button
              key={h.value}
              onClick={() => setHorizon(h.value)}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                horizon === h.value
                  ? "bg-axiom-primary text-white"
                  : "text-axiom-muted hover:text-white"
              }`}
            >
              {h.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ano projetado por cenário */}
      <div className="flex flex-wrap gap-2">
        <ScenarioBadge label={`Pessimista ${(scenarios.conservador.rate * 100).toFixed(1)}%`} year={scenarios.conservador.projectedYear} color="text-blue-400" />
        <ScenarioBadge label={`Base ${(scenarios.moderado.rate * 100).toFixed(1)}%`} year={scenarios.moderado.projectedYear} color="text-axiom-income" />
        <ScenarioBadge label={`Otimista ${(scenarios.agressivo.rate * 100).toFixed(1)}%`} year={scenarios.agressivo.projectedYear} color="text-axiom-primary" />
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
