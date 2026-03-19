"use client";

import { useEffect, useState } from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { formatCurrency } from "@/lib/utils";

ChartJS.register(ArcElement, Tooltip, Legend);

const TYPE_LABELS: Record<string, string> = {
  FIXED_INCOME: "Renda Fixa",
  FII: "Fundos Imobiliários",
  STOCK: "Ações BR",
  ETF: "ETF",
  BDR: "BDR",
  CRYPTO: "Criptomoedas",
  STOCK_INT: "Ações Internacionais",
  OTHER: "Outros",
};

const TYPE_COLORS = [
  "#FF6B35",
  "#10B981",
  "#3B82F6",
  "#8B5CF6",
  "#F59E0B",
  "#EF4444",
  "#06B6D4",
  "#AAB2BD",
];

interface AssetBreakdownProps {
  allocationByType: Partial<Record<string, number>>; // % por tipo
  totalCurrentValue: number;
  currency: string;
  locale: string;
}

export function AssetBreakdown({
  allocationByType,
  totalCurrentValue,
  currency,
  locale,
}: AssetBreakdownProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const entries = Object.entries(allocationByType).filter(([, pct]) => pct != null && pct > 0);
  const isEmpty = entries.length === 0;

  const labels = entries.map(([type]) => TYPE_LABELS[type] ?? type);
  const dataValues = entries.map(([, pct]) => pct as number);
  const colors = entries.map((_, i) => TYPE_COLORS[i % TYPE_COLORS.length]);

  const chartData = {
    labels: isEmpty ? ["Sem dados"] : labels,
    datasets: [
      {
        data: isEmpty ? [1] : dataValues,
        backgroundColor: isEmpty ? ["#1E2D42"] : colors,
        borderWidth: 0,
        hoverOffset: isEmpty ? 0 : 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%",
    animation: { duration: 1000, easing: "easeOutQuart" as const },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: !isEmpty,
        backgroundColor: "#152030",
        borderColor: "#1E2D42",
        borderWidth: 1,
        titleColor: "#AAB2BD",
        bodyColor: "#fff",
        padding: 10,
        callbacks: {
          label: (ctx: { label: string; parsed: number }) =>
            ` ${ctx.label}: ${ctx.parsed.toFixed(1)}%`,
        },
      },
    },
  };

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-semibold text-white">Breakdown por Classe de Ativo</h3>
        <p className="text-xs text-axiom-muted mt-0.5">Distribuição da carteira por tipo</p>
      </div>

      {isEmpty ? (
        <div className="flex items-center justify-center min-h-[160px]">
          <p className="text-sm text-axiom-muted italic">Nenhum ativo na carteira</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          {/* Doughnut */}
          <div className="relative mx-auto" style={{ width: 200, height: 200 }}>
            {mounted ? (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              <Doughnut data={chartData} options={options as any} />
            ) : (
              <div className="w-full h-full rounded-full bg-axiom-hover animate-pulse" />
            )}
            {/* Label central */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs text-axiom-muted">Total</span>
              <span className="text-sm font-bold text-white">
                {formatCurrency(totalCurrentValue, locale, currency)}
              </span>
            </div>
          </div>

          {/* Tabela */}
          <div className="flex-1 min-w-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-axiom-muted text-xs">
                  <th className="text-left pb-2 font-medium">Tipo</th>
                  <th className="text-right pb-2 font-medium">%</th>
                  <th className="text-right pb-2 font-medium">Valor est.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-axiom-border">
                {entries.map(([type, pct], i) => (
                  <tr key={type}>
                    <td className="py-2 flex items-center gap-2">
                      <span
                        className="inline-block w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: TYPE_COLORS[i % TYPE_COLORS.length] }}
                      />
                      <span className="text-white">{TYPE_LABELS[type] ?? type}</span>
                    </td>
                    <td className="py-2 text-right text-axiom-muted">{(pct as number).toFixed(1)}%</td>
                    <td className="py-2 text-right text-white font-medium">
                      {formatCurrency((totalCurrentValue * (pct as number)) / 100, locale, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
