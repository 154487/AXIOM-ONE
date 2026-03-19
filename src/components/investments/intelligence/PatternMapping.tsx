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
} from "chart.js";
import { Line } from "react-chartjs-2";
import type { PatternPoint } from "@/app/api/intelligence/patterns/route";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const ENTRY_COLORS: Record<string, string> = {
  APORTE: "#10B981",
  RESGATE: "#EF4444",
};
const DEFAULT_COLOR = "#FF6B35";

function pointColor(entryType: string): string {
  return ENTRY_COLORS[entryType] ?? DEFAULT_COLOR;
}

interface PatternMappingProps {
  points: PatternPoint[];
  insight: string | null;
}

export function PatternMapping({ points, insight }: PatternMappingProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (points.length < 2) {
    return (
      <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-white">Histórico — Diário × Health Score</h3>
        <div className="flex items-center justify-center min-h-[160px]">
          <p className="text-sm text-axiom-muted italic text-center">
            Crie entradas no Diário para visualizar seu histórico de score ao longo do tempo.
          </p>
        </div>
      </div>
    );
  }

  const labels = points.map((p) => {
    const [y, m, d] = p.date.split("-");
    return `${d}/${m}/${y.slice(2)}`;
  });

  const data = {
    labels,
    datasets: [
      {
        label: "Health Score",
        data: points.map((p) => p.score),
        borderColor: "#FF6B35",
        backgroundColor: points.map((p) => pointColor(p.entryType)),
        pointBackgroundColor: points.map((p) => pointColor(p.entryType)),
        pointBorderColor: points.map((p) => pointColor(p.entryType)),
        pointRadius: 6,
        pointHoverRadius: 8,
        borderWidth: 2,
        tension: 0.3,
        fill: false,
      },
    ],
  };

  const options = {
    responsive: true,
    animation: { duration: 1000, easing: "easeOutQuart" as const },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items: { dataIndex: number }[]) => {
            const idx = items[0]?.dataIndex ?? 0;
            return points[idx]?.title ?? "";
          },
          label: (item: { dataIndex: number; raw: unknown }) => {
            const idx = item.dataIndex;
            const p = points[idx];
            return [`Score: ${item.raw}`, `Tipo: ${p?.entryType ?? ""}`];
          },
        },
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: { color: "#AAB2BD", stepSize: 20 },
        grid: { color: "#1E2D42" },
      },
      x: {
        ticks: { color: "#AAB2BD", maxRotation: 45 },
        grid: { color: "#1E2D42" },
      },
    },
  };

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Histórico — Diário × Health Score</h3>
        <div className="flex items-center gap-3 text-xs text-axiom-muted">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-axiom-income inline-block" /> Aporte</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-axiom-expense inline-block" /> Resgate</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-axiom-primary inline-block" /> Outros</span>
        </div>
      </div>

      {mounted ? (
        <div style={{ minHeight: 240 }}>
          <Line data={data} options={options} />
        </div>
      ) : (
        <div className="animate-pulse bg-axiom-hover rounded-lg" style={{ minHeight: 240 }} />
      )}

      {insight && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-axiom-primary/10 border border-axiom-primary/20">
          <span className="text-axiom-primary text-xs">💡</span>
          <p className="text-xs text-white">{insight}</p>
        </div>
      )}
    </div>
  );
}
