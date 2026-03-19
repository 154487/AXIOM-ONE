"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { formatCurrency } from "@/lib/utils";
import type { NetworthData } from "../types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend
);

interface FireData {
  projectable: boolean;
  reason?: string;
  fiNumber?: number;
  projectedMonths?: number;
  projectedYear?: number | null;
  projectionSeries?: { year: number; value: number }[];
  fiLine?: { year: number; value: number }[];
}

interface FireProjectionProps {
  networthData: NetworthData;
  currency: string;
}

type RateKey = "conservador" | "moderado" | "agressivo";

export function FireProjection({ networthData, currency }: FireProjectionProps) {
  const t = useTranslations("Reports");
  const locale = useLocale();
  const [mounted, setMounted] = useState(false);
  const [extraSavings, setExtraSavings] = useState(0);
  const [rate, setRate] = useState<RateKey>("moderado");
  const [fireData, setFireData] = useState<FireData | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);

  // Calcular médias de income/expense a partir do networthData
  const months = networthData.months;
  const monthsWithIncome = months.filter((m) => m.monthIncome > 0);
  const avgIncome =
    monthsWithIncome.length > 0
      ? monthsWithIncome.reduce((acc, m) => acc + m.monthIncome, 0) /
        monthsWithIncome.length
      : 0;
  const avgExpenses =
    months.length > 0
      ? months.reduce((acc, m) => acc + m.monthExpenses, 0) / months.length
      : 0;

  const monthlyIncome = avgIncome * (1 + extraSavings / 100);
  const patrimony = networthData.currentNetWorth;

  const fetchFire = useCallback(
    async (incomeOverride: number, rateKey: RateKey) => {
      if (avgIncome === 0) return;
      setLoading(true);
      try {
        const params = new URLSearchParams({
          patrimony: String(Math.max(0, patrimony)),
          monthlyIncome: String(incomeOverride),
          monthlyExpenses: String(avgExpenses),
          rate: rateKey,
        });
        const res = await fetch(`/api/reports/fire?${params}`);
        if (res.ok) {
          const data = await res.json();
          setFireData(data);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    },
    [avgIncome, avgExpenses, patrimony]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchFire(monthlyIncome, rate);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [extraSavings, rate, fetchFire, monthlyIncome]);

  const chartData =
    fireData?.projectable && fireData.projectionSeries
      ? {
          labels: fireData.projectionSeries.map((p) => `Ano ${p.year}`),
          datasets: [
            {
              label: "Patrimônio projetado",
              data: fireData.projectionSeries.map((p) => p.value),
              borderColor: "#10B981",
              backgroundColor: "transparent",
              borderWidth: 2,
              pointRadius: 2,
              tension: 0.3,
            },
            {
              label: `FI Number (${formatCurrency(fireData.fiNumber ?? 0, locale, currency)})`,
              data: (fireData.fiLine ?? []).map((p) => p.value),
              borderColor: "#FF6B35",
              borderDash: [4, 4],
              borderWidth: 1.5,
              backgroundColor: "transparent",
              pointRadius: 0,
            },
          ],
        }
      : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 800, easing: "easeOutQuart" as const },
    plugins: {
      legend: {
        labels: { color: "#AAB2BD", font: { size: 11 }, boxWidth: 12, boxHeight: 12 },
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
            ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y, locale, currency)}`,
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

  if (avgIncome === 0) {
    return (
      <div className="bg-axiom-card border border-axiom-border rounded-xl p-6">
        <h3 className="text-white font-semibold mb-2">{t("fire")}</h3>
        <p className="text-axiom-muted text-sm">{t("noData")}</p>
      </div>
    );
  }

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 flex flex-col gap-6">
      <h3 className="text-white font-semibold">{t("fire")}</h3>

      {/* Controles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Slider de poupança extra */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-axiom-muted">Economia adicional</span>
            <span className="text-axiom-primary font-semibold">+{extraSavings}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="20"
            step="1"
            value={extraSavings}
            onChange={(e) => setExtraSavings(Number(e.target.value))}
            className="w-full accent-axiom-primary"
          />
          <div className="flex justify-between text-xs text-axiom-muted mt-1">
            <span>0%</span>
            <span>20%</span>
          </div>
        </div>

        {/* Select de taxa */}
        <div>
          <label className="text-axiom-muted text-sm block mb-2">Cenário de retorno</label>
          <select
            value={rate}
            onChange={(e) => setRate(e.target.value as RateKey)}
            className="w-full bg-axiom-hover border border-axiom-border text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-axiom-primary"
          >
            <option value="conservador">Conservador (6% a.a.)</option>
            <option value="moderado">Moderado (8% a.a.)</option>
            <option value="agressivo">Agressivo (10% a.a.)</option>
          </select>
        </div>
      </div>

      {/* Resultado */}
      {loading ? (
        <div className="h-32 bg-axiom-hover rounded-lg animate-pulse" />
      ) : fireData?.projectable === false ? (
        <div className="bg-axiom-expense/10 border border-axiom-expense/30 rounded-lg p-4">
          <p className="text-axiom-expense text-sm">{t("fireNotProjectable")}</p>
        </div>
      ) : fireData?.projectable ? (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-axiom-hover rounded-lg p-3 text-center">
              <p className="text-axiom-muted text-xs mb-1">FI Number</p>
              <p className="text-white font-bold text-sm">
                {formatCurrency(fireData.fiNumber ?? 0, locale, currency)}
              </p>
            </div>
            <div className="bg-axiom-hover rounded-lg p-3 text-center">
              <p className="text-axiom-muted text-xs mb-1">Ano projetado</p>
              <p className="text-axiom-income font-bold text-sm">
                {fireData.projectedYear ?? "50+ anos"}
              </p>
            </div>
            <div className="bg-axiom-hover rounded-lg p-3 text-center">
              <p className="text-axiom-muted text-xs mb-1">Meses até IF</p>
              <p className="text-axiom-primary font-bold text-sm">
                {fireData.projectedMonths
                  ? fireData.projectedMonths > 599
                    ? "600+"
                    : fireData.projectedMonths
                  : "—"}
              </p>
            </div>
          </div>

          {/* Gráfico */}
          {chartData && (
            <div style={{ minHeight: 220 }}>
              {mounted ? (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                <Line data={chartData} options={chartOptions as any} />
              ) : (
                <div className="w-full h-full rounded-lg bg-axiom-hover animate-pulse" />
              )}
            </div>
          )}
        </>
      ) : null}

      {/* Nota legal */}
      <p className="text-axiom-muted text-xs text-center">{t("fireDisclaimer")}</p>
    </div>
  );
}
