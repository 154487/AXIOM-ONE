"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { PeriodFilter } from "@/components/shared/PeriodFilter";
import { CashFlowChart } from "./fluxo-caixa/CashFlowChart";
import { NetWorthChart } from "./patrimonio/NetWorthChart";
import { SavingsRateChart } from "./patrimonio/SavingsRateChart";
import type { OverviewData, CashflowData, NetworthData } from "./types";

type TabKey = "overview" | "cashflow" | "trends" | "patrimonio";

interface TabData<T> {
  data: T | null;
  loading: boolean;
}

interface ReportsShellProps {
  initialCurrency: string;
  initialLocale: string;
}

function getCurrentMonthISO(): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();
  const m = String(month).padStart(2, "0");
  return { start: `${year}-${m}-01`, end: `${year}-${m}-${String(lastDay).padStart(2, "0")}` };
}

export function ReportsShell({ initialCurrency, initialLocale }: ReportsShellProps) {
  const t = useTranslations("Reports");
  const { start: defaultStart, end: defaultEnd } = getCurrentMonthISO();

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [period, setPeriod] = useState({ start: defaultStart, end: defaultEnd });

  const [overviewState, setOverviewState] = useState<TabData<OverviewData>>({ data: null, loading: false });
  const [cashflowState, setCashflowState] = useState<TabData<CashflowData>>({ data: null, loading: false });
  const [networthState, setNetworthState] = useState<TabData<NetworthData>>({ data: null, loading: false });

  const fetchOverview = useCallback(async (start: string, end: string) => {
    setOverviewState((s) => ({ ...s, loading: true }));
    try {
      const res = await fetch(`/api/reports/overview?start=${start}&end=${end}`);
      if (res.ok) {
        const data = await res.json();
        setOverviewState({ data, loading: false });
      } else {
        setOverviewState({ data: null, loading: false });
      }
    } catch {
      setOverviewState({ data: null, loading: false });
    }
  }, []);

  const fetchCashflow = useCallback(async (start: string, end: string) => {
    setCashflowState((s) => ({ ...s, loading: true }));
    try {
      const res = await fetch(`/api/reports/cashflow?start=${start}&end=${end}`);
      if (res.ok) {
        const data = await res.json();
        setCashflowState({ data, loading: false });
      } else {
        setCashflowState({ data: null, loading: false });
      }
    } catch {
      setCashflowState({ data: null, loading: false });
    }
  }, []);

  const fetchNetworth = useCallback(async () => {
    setNetworthState((s) => ({ ...s, loading: true }));
    try {
      const res = await fetch(`/api/reports/networth`);
      if (res.ok) {
        const data = await res.json();
        setNetworthState({ data, loading: false });
      } else {
        setNetworthState({ data: null, loading: false });
      }
    } catch {
      setNetworthState({ data: null, loading: false });
    }
  }, []);

  // Fetch quando aba muda ou período muda
  useEffect(() => {
    if (activeTab === "overview") {
      fetchOverview(period.start, period.end);
    } else if (activeTab === "cashflow") {
      fetchCashflow(period.start, period.end);
    } else if (activeTab === "patrimonio") {
      fetchNetworth();
    }
    // trends: cada componente filho faz seu próprio fetch
  }, [activeTab, period, fetchOverview, fetchCashflow, fetchNetworth]);

  function handlePeriodChange(start: string, end: string) {
    setPeriod({ start, end });
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: "overview", label: t("tabOverview") },
    { key: "cashflow", label: t("tabCashflow") },
    { key: "trends", label: t("tabTrends") },
    { key: "patrimonio", label: t("tabPatrimonio") },
  ];

  return (
    <div className="space-y-6">
      {/* Filtro de período */}
      <PeriodFilter onChange={handlePeriodChange} />

      {/* Tabs */}
      <div className="flex bg-axiom-hover rounded-lg p-1 gap-1 w-fit">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === key
                ? "bg-axiom-primary text-white"
                : "text-axiom-muted hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Conteúdo da aba ativa */}
      {activeTab === "overview" && (
        <OverviewTab
          data={overviewState.data}
          loading={overviewState.loading}
          currency={initialCurrency}
          locale={initialLocale}
          periodStart={period.start}
        />
      )}

      {activeTab === "cashflow" && (
        <CashflowTab
          data={cashflowState.data}
          loading={cashflowState.loading}
          currency={initialCurrency}
          locale={initialLocale}
        />
      )}

      {activeTab === "trends" && (
        <TrendsTab
          currency={initialCurrency}
          locale={initialLocale}
          period={period}
        />
      )}

      {activeTab === "patrimonio" && (
        <PatrimonioTab
          data={networthState.data}
          loading={networthState.loading}
          currency={initialCurrency}
          locale={initialLocale}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Placeholder de aba — será substituído pelos componentes reais nas issues 2-11
// ---------------------------------------------------------------------------

function SkeletonCard({ label }: { label: string }) {
  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 flex flex-col gap-4">
      <p className="text-axiom-muted text-sm font-medium">{label}</p>
      <div className="flex-1 animate-pulse bg-axiom-hover rounded-lg h-32" />
    </div>
  );
}

function OverviewTab({
  data,
  loading,
  currency: _currency,
  locale: _locale,
  periodStart: _periodStart,
}: {
  data: OverviewData | null;
  loading: boolean;
  currency: string;
  locale: string;
  periodStart: string;
}) {
  const t = useTranslations("Reports");

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <SkeletonCard label={t("healthScore")} />
        <SkeletonCard label={t("insights")} />
        <SkeletonCard label={t("spendingVelocity")} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      {/* HealthScoreCard — Issue #34 */}
      <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 h-full flex flex-col">
        <p className="text-axiom-muted text-sm font-medium mb-4">{t("healthScore")}</p>
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <span
            className={`text-6xl font-bold ${
              data.healthScore === null
                ? "text-axiom-muted"
                : data.healthScore >= 70
                ? "text-axiom-income"
                : data.healthScore >= 40
                ? "text-yellow-400"
                : "text-axiom-expense"
            }`}
          >
            {data.healthScore === null ? "N/A" : data.healthScore}
          </span>
          <div className="w-full space-y-2">
            {data.pillars.map((p) => (
              <div key={p.label}>
                <div className="flex justify-between text-xs text-axiom-muted mb-1">
                  <span>{p.label}</span>
                  <span>{p.earnedPoints}/{p.maxPoints}pts</span>
                </div>
                <div className="w-full h-1.5 bg-axiom-hover rounded-full">
                  <div
                    className="h-1.5 bg-axiom-primary rounded-full transition-all"
                    style={{ width: `${p.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* InsightsCard — Issue #34 */}
      <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 h-full flex flex-col">
        <p className="text-axiom-muted text-sm font-medium mb-4">{t("insights")}</p>
        <div className="flex-1 flex flex-col gap-3">
          {data.insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-axiom-hover rounded-lg">
              <div className="flex-1">
                <p className="text-white text-sm">{insight.text}</p>
              </div>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                  insight.type === "positive"
                    ? "bg-axiom-income/20 text-axiom-income"
                    : insight.type === "negative"
                    ? "bg-axiom-expense/20 text-axiom-expense"
                    : "bg-yellow-400/20 text-yellow-400"
                }`}
              >
                {insight.badgeText}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* SpendingVelocityCard — Issue #35 */}
      <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 h-full flex flex-col">
        <p className="text-axiom-muted text-sm font-medium mb-4">{t("spendingVelocity")}</p>
        {data.velocity === null ? (
          <p className="text-axiom-muted text-sm flex-1 flex items-center">
            Velocidade disponível apenas para o mês atual.
          </p>
        ) : (
          <div className="flex-1 flex flex-col gap-4 justify-center">
            <div>
              <div className="flex justify-between text-xs text-axiom-muted mb-1">
                <span>Dia {data.velocity.dayOfMonth} de {data.velocity.daysInMonth}</span>
                <span>{Math.round(data.velocity.spent / data.velocity.budget * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-axiom-hover rounded-full">
                <div
                  className={`h-2 rounded-full transition-all ${
                    data.velocity.spent / data.velocity.budget < 0.7
                      ? "bg-axiom-income"
                      : data.velocity.spent / data.velocity.budget < 0.9
                      ? "bg-yellow-400"
                      : "bg-axiom-expense"
                  }`}
                  style={{
                    width: `${Math.min(100, (data.velocity.spent / data.velocity.budget) * 100)}%`,
                  }}
                />
              </div>
            </div>
            <p className="text-axiom-muted text-sm">
              {data.velocity.projectedOverrun >= 0
                ? `No ritmo atual, terminará ${Math.round(data.velocity.projectedOverrun)}% acima do estimado.`
                : `No ritmo atual, terminará ${Math.abs(Math.round(data.velocity.projectedOverrun))}% abaixo do estimado.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function CashflowTab({
  data,
  loading,
  currency,
  locale,
}: {
  data: CashflowData | null;
  loading: boolean;
  currency: string;
  locale: string;
}) {
  const t = useTranslations("Reports");

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SkeletonCard label={t("cashFlow")} />
        <SkeletonCard label={t("recurring")} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <div style={{ minHeight: 360 }}>
        <CashFlowChart cashflowData={data} currency={currency} locale={locale} />
      </div>
      {/* RecurringList — Issue #36 */}
      <SkeletonCard label={t("recurring")} />
    </div>
  );
}

function TrendsTab({
  currency: _currency,
  locale: _locale,
  period: _period,
}: {
  currency: string;
  locale: string;
  period: { start: string; end: string };
}) {
  const t = useTranslations("Reports");
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <SkeletonCard label={t("categoryTrend")} />
      <SkeletonCard label={t("merchantSpotlight")} />
      <div className="xl:col-span-2">
        <SkeletonCard label={t("seasonal")} />
      </div>
    </div>
  );
}

function PatrimonioTab({
  data,
  loading,
  currency,
  locale,
}: {
  data: NetworthData | null;
  loading: boolean;
  currency: string;
  locale: string;
}) {
  const t = useTranslations("Reports");

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <SkeletonCard label={t("netWorth")} />
        </div>
        <SkeletonCard label={t("savingsRate")} />
        <div className="xl:col-span-3">
          <SkeletonCard label={t("fire")} />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <div style={{ minHeight: 320 }}>
        <NetWorthChart networthData={data} currency={currency} locale={locale} />
      </div>
      <div style={{ minHeight: 280 }}>
        <SavingsRateChart networthData={data} currency={currency} locale={locale} />
      </div>
      {/* FireProjection — Issue #41 */}
      <SkeletonCard label={t("fire")} />
    </div>
  );
}
