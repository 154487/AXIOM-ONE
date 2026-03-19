"use client";

import { useState, useEffect, useCallback } from "react";
import { NetWorthChart } from "@/components/reports/patrimonio/NetWorthChart";
import { SavingsRateChart } from "@/components/reports/patrimonio/SavingsRateChart";
import { FireProjection } from "@/components/reports/patrimonio/FireProjection";
import { AssetBreakdown } from "./AssetBreakdown";
import { BenchmarkComparison } from "./BenchmarkComparison";
import { PatrimonioGoal } from "./PatrimonioGoal";
import type { NetworthData } from "@/components/reports/types";
import type { BenchmarkData } from "@/lib/benchmarks";

interface PortfolioTotals {
  totalCurrentValue: number;
}

interface PortfolioForPatrimonio {
  totals: PortfolioTotals;
  allocationByType: Partial<Record<string, number>>;
}

function SkeletonCard({ label }: { label: string }) {
  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 flex flex-col gap-4">
      <p className="text-axiom-muted text-sm font-medium">{label}</p>
      <div className="flex-1 animate-pulse bg-axiom-hover rounded-lg h-32" />
    </div>
  );
}

interface PatrimonioShellProps {
  initialCurrency: string;
  initialLocale: string;
}

export function PatrimonioShell({ initialCurrency, initialLocale }: PatrimonioShellProps) {
  const [data, setData] = useState<NetworthData | null>(null);
  const [loading, setLoading] = useState(false);

  const [portfolioData, setPortfolioData] = useState<PortfolioForPatrimonio | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);

  const [benchmarksData, setBenchmarksData] = useState<BenchmarkData | null>(null);
  const [benchmarksLoading, setBenchmarksLoading] = useState(false);

  const [goalData, setGoalData] = useState<{ goal: number | null } | null>(null);
  const [goalLoading, setGoalLoading] = useState(false);

  const fetchGoal = useCallback(async () => {
    setGoalLoading(true);
    try {
      const res = await fetch("/api/patrimonio/goal");
      if (res.ok) setGoalData(await res.json());
    } catch {
      // silent
    } finally {
      setGoalLoading(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setPortfolioLoading(true);
    setBenchmarksLoading(true);
    setGoalLoading(true);

    const [networthRes, portfolioRes, benchmarksRes, goalRes] = await Promise.allSettled([
      fetch("/api/reports/networth"),
      fetch("/api/investments/portfolio"),
      fetch("/api/investments/benchmarks"),
      fetch("/api/patrimonio/goal"),
    ]);

    if (networthRes.status === "fulfilled" && networthRes.value.ok) {
      setData(await networthRes.value.json());
    }
    setLoading(false);

    if (portfolioRes.status === "fulfilled" && portfolioRes.value.ok) {
      setPortfolioData(await portfolioRes.value.json());
    }
    setPortfolioLoading(false);

    if (benchmarksRes.status === "fulfilled" && benchmarksRes.value.ok) {
      setBenchmarksData(await benchmarksRes.value.json());
    }
    setBenchmarksLoading(false);

    if (goalRes.status === "fulfilled" && goalRes.value.ok) {
      setGoalData(await goalRes.value.json());
    }
    setGoalLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // avgMonthlySavings calculado a partir dos meses históricos
  const avgMonthlySavings =
    data && data.months.length > 0
      ? data.months.reduce((acc, m) => acc + (m.monthIncome - m.monthExpenses), 0) /
        data.months.length
      : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Patrimônio</h1>
        <p className="text-sm text-axiom-muted mt-0.5">
          Evolução do seu patrimônio, taxa de poupança e projeção de independência financeira
        </p>
      </div>

      {/* Componentes existentes */}
      {loading || !data ? (
        <div className="grid grid-cols-1 gap-4">
          <SkeletonCard label="Evolução do Patrimônio" />
          <SkeletonCard label="Taxa de Poupança" />
          <SkeletonCard label="Projeção de Independência Financeira" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <div style={{ minHeight: 320 }}>
            <NetWorthChart networthData={data} currency={initialCurrency} locale={initialLocale} />
          </div>
          <div style={{ minHeight: 280 }}>
            <SavingsRateChart networthData={data} currency={initialCurrency} locale={initialLocale} />
          </div>
          <FireProjection networthData={data} currency={initialCurrency} />
        </div>
      )}

      {/* Novos componentes v1.1 */}
      {portfolioLoading ? (
        <SkeletonCard label="Breakdown por Classe de Ativo" />
      ) : (
        <AssetBreakdown
          allocationByType={portfolioData?.allocationByType ?? {}}
          totalCurrentValue={portfolioData?.totals.totalCurrentValue ?? 0}
          currency={initialCurrency}
          locale={initialLocale}
        />
      )}

      {(loading || benchmarksLoading) ? (
        <SkeletonCard label="Comparação vs Benchmark" />
      ) : data ? (
        <BenchmarkComparison
          networthData={data}
          selicAnual={benchmarksData?.selicAnual ?? null}
          ipca={benchmarksData?.ipca ?? null}
          currency={initialCurrency}
          locale={initialLocale}
        />
      ) : null}

      {goalLoading ? (
        <SkeletonCard label="Meta de Patrimônio" />
      ) : (
        <PatrimonioGoal
          currentNetWorth={data?.currentNetWorth ?? 0}
          goal={goalData?.goal ?? null}
          avgMonthlySavings={avgMonthlySavings}
          currency={initialCurrency}
          locale={initialLocale}
          onGoalSaved={fetchGoal}
        />
      )}
    </div>
  );
}
