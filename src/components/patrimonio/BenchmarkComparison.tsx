"use client";

import { useEffect, useState } from "react";
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
import type { NetworthData } from "@/components/reports/types";
import { formatCurrency } from "@/lib/utils";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

interface BenchmarkComparisonProps {
  networthData: NetworthData;
  selicAnual: number | null; // % a.a.
  ipca: number | null; // % ao mês
  currency: string;
  locale: string;
}

export function BenchmarkComparison({
  networthData,
  selicAnual,
  ipca,
  currency,
  locale,
}: BenchmarkComparisonProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { months } = networthData;

  if (months.length < 2) {
    return (
      <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Comparação vs Benchmark</h3>
          <p className="text-xs text-axiom-muted mt-0.5">Patrimônio real vs CDI e IPCA projetados</p>
        </div>
        <div className="flex items-center justify-center min-h-[160px]">
          <p className="text-sm text-axiom-muted italic">Dados insuficientes para comparação</p>
        </div>
      </div>
    );
  }

  const labels = months.map((m) => m.month);
  const realSeries = months.map((m) => m.cumulativeBalance);
  const startValue = months[0].cumulativeBalance;

  // Série CDI: compõe mensalmente a partir do startValue
  let cdiSeries: number[] | null = null;
  if (selicAnual !== null) {
    const monthlyRate = Math.pow(1 + selicAnual / 100, 1 / 12) - 1;
    cdiSeries = [];
    let fv = startValue;
    for (let i = 0; i < months.length; i++) {
      cdiSeries.push(Math.round(fv));
      fv = fv * (1 + monthlyRate);
    }
  }

  // Série IPCA: compõe mensalmente com ipca/100 ao mês
  let ipcaSeries: number[] | null = null;
  if (ipca !== null) {
    ipcaSeries = [];
    let fv = startValue;
    for (let i = 0; i < months.length; i++) {
      ipcaSeries.push(Math.round(fv));
      fv = fv * (1 + ipca / 100);
    }
  }

  const noBenchmarks = cdiSeries === null && ipcaSeries === null;

  const datasets = [
    {
      label: "Patrimônio Real",
      data: realSeries,
      borderColor: "#FF6B35",
      backgroundColor: "rgba(255,107,53,0.08)",
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.3,
      fill: true,
    },
  ];

  if (cdiSeries) {
    datasets.push({
      label: "CDI projetado",
      data: cdiSeries,
      borderColor: "#10B981",
      backgroundColor: "transparent",
      borderWidth: 1.5,
      // @ts-expect-error borderDash is valid but not in types
      borderDash: [4, 4],
      pointRadius: 0,
      tension: 0.3,
      fill: false,
    });
  }

  if (ipcaSeries) {
    datasets.push({
      label: "IPCA projetado",
      data: ipcaSeries,
      borderColor: "#AAB2BD",
      backgroundColor: "transparent",
      borderWidth: 1.5,
      // @ts-expect-error borderDash is valid but not in types
      borderDash: [4, 4],
      pointRadius: 0,
      tension: 0.3,
      fill: false,
    });
  }

  const chartData = { labels, datasets };

  const options = {
    responsive: true,
    animation: { duration: 800, easing: "easeOutQuart" as const },
    plugins: {
      legend: {
        labels: { color: "#AAB2BD", boxWidth: 12, font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: "#152030",
        borderColor: "#1E2D42",
        borderWidth: 1,
        titleColor: "#AAB2BD",
        bodyColor: "#fff",
        padding: 10,
        callbacks: {
          label: (item: { dataset: { label?: string }; raw: unknown }) =>
            `${item.dataset.label}: ${formatCurrency(Number(item.raw), locale, currency)}`,
        },
      },
    },
    scales: {
      y: {
        ticks: {
          color: "#AAB2BD",
          callback: (v: unknown) => {
            const n = Number(v);
            if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
            if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
            return String(n);
          },
        },
        grid: { color: "#1E2D42" },
      },
      x: {
        ticks: { color: "#AAB2BD", maxTicksLimit: 8 },
        grid: { color: "#1E2D42" },
      },
    },
  };

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 flex flex-col gap-5">
      <div>
        <h3 className="text-sm font-semibold text-white">Comparação vs Benchmark</h3>
        <p className="text-xs text-axiom-muted mt-0.5">Patrimônio real vs CDI e IPCA projetados</p>
      </div>

      {noBenchmarks && (
        <div className="px-3 py-2 rounded-lg bg-axiom-hover border border-axiom-border">
          <p className="text-xs text-axiom-muted">
            Benchmarks indisponíveis — exibindo apenas patrimônio real.
            Verifique se BRAPI_TOKEN está configurado.
          </p>
        </div>
      )}

      {mounted ? (
        <div style={{ minHeight: 240 }}>
          <Line data={chartData} options={options} />
        </div>
      ) : (
        <div className="animate-pulse bg-axiom-hover rounded-lg" style={{ minHeight: 240 }} />
      )}

      <p className="text-xs text-axiom-muted italic">
        CDI/IPCA calculados com taxas atuais aplicadas retroativamente — estimativa educacional.
      </p>
    </div>
  );
}
