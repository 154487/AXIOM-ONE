"use client";

import { useState, useEffect, useCallback } from "react";
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
import type { Period, PerformanceResponse } from "@/app/api/patrimonio/performance/route";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const PERIODS: { key: Period; label: string }[] = [
  { key: "1y", label: "1A" },
  { key: "2y", label: "2A" },
  { key: "5y", label: "5A" },
  { key: "all", label: "Tudo" },
];

export function PortfolioPerformanceChart() {
  const [period, setPeriod] = useState<Period>("all");
  const [perfData, setPerfData] = useState<PerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const fetchData = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/patrimonio/performance?period=${p}`);
      if (res.ok) setPerfData(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

  const points = perfData?.points ?? [];
  const labels = points.map((p) => p.month);

  const datasets = [];

  if (points.length > 0) {
    datasets.push({
      label: "Sua Carteira",
      data: points.map((p) => parseFloat(p.portfolio.toFixed(2))),
      borderColor: "#FF6B35",
      backgroundColor: "rgba(255,107,53,0.06)",
      borderWidth: 2.5,
      pointRadius: 0,
      tension: 0.3,
      fill: true,
      order: 1,
    });

    if (points.some((p) => p.ibov !== null)) {
      datasets.push({
        label: "IBOV",
        data: points.map((p) => (p.ibov !== null ? parseFloat(p.ibov.toFixed(2)) : null)),
        borderColor: "#3B82F6",
        backgroundColor: "transparent",
        borderWidth: 1.5,
        borderDash: [5, 4],
        pointRadius: 0,
        tension: 0.3,
        fill: false,
        order: 2,
      });
    }

    if (points.some((p) => p.cdi !== null)) {
      datasets.push({
        label: "CDI",
        data: points.map((p) => (p.cdi !== null ? parseFloat(p.cdi.toFixed(2)) : null)),
        borderColor: "#10B981",
        backgroundColor: "transparent",
        borderWidth: 1.5,
        borderDash: [5, 4],
        pointRadius: 0,
        tension: 0.3,
        fill: false,
        order: 3,
      });
    }

    if (points.some((p) => p.ipca !== null)) {
      datasets.push({
        label: "IPCA",
        data: points.map((p) => (p.ipca !== null ? parseFloat(p.ipca.toFixed(2)) : null)),
        borderColor: "#AAB2BD",
        backgroundColor: "transparent",
        borderWidth: 1.5,
        borderDash: [5, 4],
        pointRadius: 0,
        tension: 0.3,
        fill: false,
        order: 4,
      });
    }
  }

  const options = {
    responsive: true,
    animation: { duration: 800, easing: "easeOutQuart" as const },
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      legend: {
        labels: {
          color: "#AAB2BD",
          boxWidth: 12,
          font: { size: 11 },
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
          label: (item: { dataset: { label?: string }; raw: unknown }) => {
            const v = Number(item.raw);
            return `  ${item.dataset.label}: ${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
          },
        },
      },
    },
    scales: {
      y: {
        ticks: {
          color: "#AAB2BD",
          font: { size: 11 },
          callback: (v: unknown) => {
            const n = Number(v);
            return `${n >= 0 ? "+" : ""}${n.toFixed(0)}%`;
          },
        },
        grid: { color: "#1E2D42" },
      },
      x: {
        ticks: { color: "#AAB2BD", maxTicksLimit: 7, font: { size: 11 } },
        grid: { color: "#1E2D42" },
      },
    },
  };

  // Empty state
  if (!loading && points.length < 2) {
    return (
      <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Performance vs Benchmarks</h3>
          <p className="text-xs text-axiom-muted mt-0.5">
            Retorno acumulado da sua carteira vs CDI, IPCA e IBOV
          </p>
        </div>
        <div className="flex items-center justify-center min-h-[220px]">
          <p className="text-sm text-axiom-muted italic">
            Registre transações para ver a performance
          </p>
        </div>
      </div>
    );
  }

  // Latest returns summary
  const lastPoint = points[points.length - 1];

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 flex flex-col gap-4">
      {/* Header + period selector */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-white">Performance vs Benchmarks</h3>
          <p className="text-xs text-axiom-muted mt-0.5">
            Retorno acumulado da sua carteira vs CDI, IPCA e IBOV
          </p>
        </div>
        <div className="flex gap-1 bg-axiom-hover rounded-lg p-1">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                period === key
                  ? "bg-axiom-primary text-white"
                  : "text-axiom-muted hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Return badges inline */}
      {!loading && lastPoint && (
        <div className="flex flex-wrap gap-2">
          <ReturnBadge label="Sua Carteira" value={lastPoint.portfolio} color="text-axiom-primary" />
          {lastPoint.ibov !== null && (
            <ReturnBadge label="IBOV" value={lastPoint.ibov} color="text-blue-400" />
          )}
          {lastPoint.cdi !== null && (
            <ReturnBadge label="CDI" value={lastPoint.cdi} color="text-axiom-income" />
          )}
          {lastPoint.ipca !== null && (
            <ReturnBadge label="IPCA" value={lastPoint.ipca} color="text-axiom-muted" />
          )}
        </div>
      )}

      {/* Chart */}
      {loading || !mounted ? (
        <div className="animate-pulse bg-axiom-hover rounded-lg" style={{ minHeight: 180 }} />
      ) : (
        <div style={{ minHeight: 180 }}>
          <Line data={{ labels, datasets }} options={options} />
        </div>
      )}

      {!perfData?.hasIbov && !loading && (
        <p className="text-xs text-axiom-muted/50 italic">
          IBOV indisponível — configure BRAPI_TOKEN para comparar com o Ibovespa.
        </p>
      )}
    </div>
  );
}

function ReturnBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const isPositive = value >= 0;
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-axiom-hover border border-axiom-border">
      <span className="text-xs text-axiom-muted">{label}</span>
      <span className={`text-xs font-semibold ${color}`}>
        {isPositive ? "+" : ""}
        {value.toFixed(2)}%
      </span>
    </div>
  );
}
