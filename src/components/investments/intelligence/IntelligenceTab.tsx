"use client";

import { useState, useEffect, useCallback } from "react";
import { PatternMapping } from "./PatternMapping";
import { AllocationSuggestion } from "./AllocationSuggestion";
import { WhatIfSimulator } from "./WhatIfSimulator";
import type { PatternsResponse } from "@/app/api/intelligence/patterns/route";
import type { AllocationResponse } from "@/app/api/intelligence/allocation/route";

function SkeletonCard({ height = 240 }: { height?: number }) {
  return <div className="animate-pulse bg-axiom-hover rounded-xl" style={{ minHeight: height }} />;
}

interface IntelligenceTabProps {
  portfolioTotalValue: number;
  currency: string;
}

export function IntelligenceTab({ portfolioTotalValue, currency }: IntelligenceTabProps) {
  const [patternsData, setPatternsData] = useState<PatternsResponse | null>(null);
  const [patternsLoading, setPatternsLoading] = useState(true);
  const [patternsError, setPatternsError] = useState(false);

  const [allocationData, setAllocationData] = useState<AllocationResponse | null>(null);
  const [allocationLoading, setAllocationLoading] = useState(true);
  const [allocationError, setAllocationError] = useState(false);

  const fetchData = useCallback(async () => {
    const [pRes, aRes] = await Promise.allSettled([
      fetch("/api/intelligence/patterns"),
      fetch("/api/intelligence/allocation"),
    ]);

    if (pRes.status === "fulfilled" && pRes.value.ok) {
      setPatternsData(await pRes.value.json());
    } else {
      setPatternsError(true);
    }
    setPatternsLoading(false);

    if (aRes.status === "fulfilled" && aRes.value.ok) {
      setAllocationData(await aRes.value.json());
    } else {
      setAllocationError(true);
    }
    setAllocationLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="flex flex-col gap-6">
      {/* Pattern Mapping */}
      {patternsLoading ? (
        <SkeletonCard height={300} />
      ) : patternsError ? (
        <ErrorCard />
      ) : (
        <PatternMapping
          points={patternsData?.points ?? []}
          insight={patternsData?.insight ?? null}
        />
      )}

      {/* Allocation Suggestion */}
      {allocationLoading ? (
        <SkeletonCard height={200} />
      ) : allocationError ? (
        <ErrorCard />
      ) : allocationData ? (
        <AllocationSuggestion data={allocationData} currency={currency} />
      ) : null}

      {/* What-If Simulator — não precisa de loading separado, usa dados de allocation */}
      {!allocationLoading && !allocationError && allocationData && (
        <WhatIfSimulator
          currentPatrimony={portfolioTotalValue}
          monthlyIncome={allocationData.monthlyIncome}
          monthlyExpenses={allocationData.monthlyExpenses}
          currency={currency}
        />
      )}
    </div>
  );
}

function ErrorCard() {
  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 flex items-center justify-center min-h-[100px]">
      <p className="text-sm text-axiom-muted italic">Não foi possível carregar os dados. Tente novamente.</p>
    </div>
  );
}
