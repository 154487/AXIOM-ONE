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
} from "chart.js";
import { Line } from "react-chartjs-2";
import { formatCurrency } from "@/lib/utils";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const RATES = { conservador: 0.06, moderado: 0.08, agressivo: 0.10 };
const COLORS = {
  conservador: "#AAB2BD",
  moderado: "#FF6B35",
  agressivo: "#10B981",
};

function calcProjection(
  currentPatrimony: number,
  pmt: number,
  annualRate: number,
  years = 30,
): { series: number[]; projectedYear: number | null } {
  const r = annualRate / 12;
  const monthlyExpenses = 0; // FI Number calculado externamente
  const series: number[] = [];
  let FV = currentPatrimony;

  for (let month = 1; month <= years * 12; month++) {
    FV = FV * (1 + r) + pmt;
    if (month % 12 === 0) series.push(Math.round(FV));
  }

  return { series, projectedYear: null }; // projectedYear calculado no componente
}

function calcFire(
  currentPatrimony: number,
  pmt: number,
  monthlyExpenses: number,
  annualRate: number,
): number | null {
  if (pmt <= 0) return null;
  const r = annualRate / 12;
  const fiNumber = monthlyExpenses * 12 * 25;
  let FV = currentPatrimony;
  for (let month = 1; month <= 600; month++) {
    FV = FV * (1 + r) + pmt;
    if (FV >= fiNumber) {
      return new Date().getFullYear() + Math.ceil(month / 12);
    }
  }
  return null;
}

interface WhatIfSimulatorProps {
  currentPatrimony: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  currency: string;
}

export function WhatIfSimulator({
  currentPatrimony,
  monthlyIncome,
  monthlyExpenses,
  currency,
}: WhatIfSimulatorProps) {
  const [mounted, setMounted] = useState(false);
  const [slider, setSlider] = useState(100);
  useEffect(() => setMounted(true), []);

  const basePMT = Math.max(0, monthlyIncome - monthlyExpenses);
  const sliderPMT = basePMT * (slider / 100);

  const projections = useMemo(() => {
    return Object.entries(RATES).map(([key, rate]) => {
      const { series } = calcProjection(currentPatrimony, sliderPMT, rate);
      const fireYear = calcFire(currentPatrimony, sliderPMT, monthlyExpenses, rate);
      return { key, rate, series, fireYear };
    });
  }, [currentPatrimony, sliderPMT, monthlyExpenses]);

  const fiNumber = monthlyExpenses * 12 * 25;
  const years = Array.from({ length: 30 }, (_, i) => `Ano ${i + 1}`);

  const chartData = {
    labels: years,
    datasets: [
      ...projections.map((p) => ({
        label: p.key.charAt(0).toUpperCase() + p.key.slice(1),
        data: p.series,
        borderColor: COLORS[p.key as keyof typeof COLORS],
        backgroundColor: "transparent",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
      })),
      {
        label: "Número FIRE",
        data: Array(30).fill(fiNumber),
        borderColor: "#5319e7",
        backgroundColor: "transparent",
        borderWidth: 1,
        borderDash: [6, 3],
        pointRadius: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    animation: { duration: 600, easing: "easeOutQuart" as const },
    plugins: {
      legend: {
        labels: { color: "#AAB2BD", boxWidth: 12, font: { size: 11 } },
      },
      tooltip: {
        callbacks: {
          label: (item: { dataset: { label?: string }; raw: unknown }) =>
            `${item.dataset.label}: ${formatCurrency(Number(item.raw), "pt-BR", currency)}`,
        },
      },
    },
    scales: {
      y: {
        ticks: {
          color: "#AAB2BD",
          callback: (v: unknown) => {
            const n = Number(v);
            if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`;
            if (n >= 1_000) return `R$ ${(n / 1_000).toFixed(0)}K`;
            return `R$ ${n}`;
          },
        },
        grid: { color: "#1E2D42" },
      },
      x: {
        ticks: { color: "#AAB2BD", maxTicksLimit: 10 },
        grid: { color: "#1E2D42" },
      },
    },
  };

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 flex flex-col gap-5">
      <div>
        <h3 className="text-sm font-semibold text-white">Simulação — E se eu aportasse mais?</h3>
        <p className="text-xs text-axiom-muted mt-0.5">Ajuste o slider para projetar diferentes cenários de aporte</p>
      </div>

      {/* Slider */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-axiom-muted">
          <span>Aporte mensal</span>
          <span className="text-white font-semibold">
            {slider}% — {formatCurrency(sliderPMT, "pt-BR", currency)}/mês
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={300}
          step={10}
          value={slider}
          onChange={(e) => setSlider(Number(e.target.value))}
          className="w-full accent-axiom-primary"
        />
        <div className="flex justify-between text-xs text-axiom-muted">
          <span>0%</span>
          <span>100% (atual)</span>
          <span>300%</span>
        </div>
      </div>

      {sliderPMT <= 0 ? (
        <div className="flex items-center justify-center min-h-[160px]">
          <p className="text-sm text-axiom-muted italic text-center">
            Aumente sua renda ou reduza gastos para projetar independência financeira.
          </p>
        </div>
      ) : (
        <>
          {mounted ? (
            <div style={{ minHeight: 260 }}>
              <Line data={chartData} options={chartOptions} />
            </div>
          ) : (
            <div className="animate-pulse bg-axiom-hover rounded-lg" style={{ minHeight: 260 }} />
          )}

          {/* Cards FIRE */}
          <div className="grid grid-cols-3 gap-3">
            {projections.map((p) => (
              <div
                key={p.key}
                className="flex flex-col gap-1 p-3 rounded-lg bg-axiom-hover border border-axiom-border"
              >
                <p className="text-xs text-axiom-muted capitalize">{p.key}</p>
                <p
                  className="text-base font-bold"
                  style={{ color: COLORS[p.key as keyof typeof COLORS] }}
                >
                  {p.fireYear ? p.fireYear : "50+ anos"}
                </p>
                <p className="text-xs text-axiom-muted">{p.rate * 100}% a.a.</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-axiom-muted italic">
            Projeção educacional baseada na regra dos 4% (FI Number = gastos anuais × 25). Não constitui assessoria financeira.
          </p>
        </>
      )}
    </div>
  );
}
