"use client";

import { useState, useEffect, useCallback } from "react";
import { NetWorthChart } from "@/components/reports/patrimonio/NetWorthChart";
import { SavingsRateChart } from "@/components/reports/patrimonio/SavingsRateChart";
import { FireProjection } from "@/components/reports/patrimonio/FireProjection";
import type { NetworthData } from "@/components/reports/types";

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/networth");
      if (res.ok) setData(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Patrimônio</h1>
        <p className="text-sm text-axiom-muted mt-0.5">
          Evolução do seu patrimônio, taxa de poupança e projeção de independência financeira
        </p>
      </div>

      {/* Content */}
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
    </div>
  );
}
