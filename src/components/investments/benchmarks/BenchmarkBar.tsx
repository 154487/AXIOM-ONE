"use client";

import { useState, useEffect } from "react";
import { Landmark, BarChart2, TrendingUp, DollarSign, Globe, ChevronDown } from "lucide-react";
import type { BenchmarkData } from "@/lib/benchmarks";

const LS_KEY = "axiom:benchmark:currency";

const CURRENCY_OPTIONS = [
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "Libra" },
  { code: "ARS", label: "Peso AR" },
] as const;

type CurrencyCode = (typeof CURRENCY_OPTIONS)[number]["code"];

// ── Escala de cores semântica ─────────────────────────────────────────────────

function rateColor(v: number) {
  if (v <= 8)    return "text-axiom-income";
  if (v <= 11.5) return "text-white";
  if (v <= 13.5) return "text-axiom-primary";
  return "text-axiom-expense";
}
function rateLabel(v: number) {
  if (v <= 8)    return "Estimulativo";
  if (v <= 11.5) return "Neutro";
  if (v <= 13.5) return "Restritivo";
  return "Muito alto";
}
function ipcaColor(v: number) {
  if (v <= 0.33) return "text-axiom-income";
  if (v <= 0.5)  return "text-white";
  if (v <= 0.7)  return "text-axiom-primary";
  return "text-axiom-expense";
}
function ipcaLabel(v: number) {
  if (v <= 0.33) return "Na meta";
  if (v <= 0.5)  return "Atenção";
  if (v <= 0.7)  return "Elevado";
  return "Acima da meta";
}
function changeColor(pct: number) {
  return pct >= 0 ? "text-axiom-income" : "text-axiom-expense";
}
function changeStr(pct: number) {
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-5">
      <div className="h-4 bg-axiom-hover rounded w-2/3 mb-3 animate-pulse" />
      <div className="h-7 bg-axiom-hover rounded w-3/4 animate-pulse mb-2" />
      <div className="h-3 bg-axiom-hover rounded w-1/2 animate-pulse" />
    </div>
  );
}

// ── Cards fixos ───────────────────────────────────────────────────────────────

function SelicCard({ value }: { value: number | null }) {
  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <Landmark size={16} className={value != null ? rateColor(value) : "text-axiom-muted"} />
        <span className="text-axiom-muted text-sm">SELIC</span>
      </div>
      <p className={`text-xl font-semibold tabular-nums ${value != null ? rateColor(value) : "text-axiom-muted"}`}>
        {value != null ? `${value.toFixed(2)}% a.a.` : "—"}
      </p>
      {value != null && (
        <p className={`text-xs mt-1 ${rateColor(value)} opacity-70`}>{rateLabel(value)}</p>
      )}
    </div>
  );
}

function IbovCard({ price, dayChange }: { price: number | null; dayChange: number | null }) {
  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <BarChart2 size={16} className="text-axiom-muted" />
        <span className="text-axiom-muted text-sm">Ibovespa</span>
      </div>
      <p className="text-xl font-semibold tabular-nums text-white">
        {price != null ? price.toLocaleString("pt-BR", { maximumFractionDigits: 0 }) + " pts" : "—"}
      </p>
      {dayChange != null && (
        <p className={`text-xs mt-1 font-medium ${changeColor(dayChange)}`}>
          {changeStr(dayChange)} hoje
        </p>
      )}
    </div>
  );
}

function IpcaCard({ value }: { value: number | null }) {
  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp size={16} className={value != null ? ipcaColor(value) : "text-axiom-muted"} />
        <span className="text-axiom-muted text-sm">IPCA</span>
      </div>
      <p className={`text-xl font-semibold tabular-nums ${value != null ? ipcaColor(value) : "text-axiom-muted"}`}>
        {value != null ? `${value.toFixed(2)}% /mês` : "—"}
      </p>
      {value != null && (
        <p className={`text-xs mt-1 ${ipcaColor(value)} opacity-70`}>{ipcaLabel(value)}</p>
      )}
    </div>
  );
}

function CurrencyCard({
  label,
  rate,
}: {
  label: string;
  rate: { bid: number; pctChange: number } | undefined;
}) {
  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <DollarSign size={16} className="text-axiom-muted" />
        <span className="text-axiom-muted text-sm">{label} / BRL</span>
      </div>
      <p className="text-xl font-semibold tabular-nums text-white">
        {rate ? `R$ ${rate.bid.toFixed(2)}` : "—"}
      </p>
      {rate && (
        <p className={`text-xs mt-1 font-medium ${changeColor(rate.pctChange)}`}>
          {changeStr(rate.pctChange)} hoje
        </p>
      )}
    </div>
  );
}

// ── Card editável (último) ────────────────────────────────────────────────────

function EditableCurrencyCard({
  selected,
  onSelect,
  currencies,
}: {
  selected: CurrencyCode;
  onSelect: (c: CurrencyCode) => void;
  currencies: BenchmarkData["currencies"];
}) {
  const rate = currencies[selected];
  const label = CURRENCY_OPTIONS.find((o) => o.code === selected)?.label ?? selected;

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <Globe size={16} className="text-axiom-muted" />
        <div className="relative flex items-center gap-1">
          <select
            value={selected}
            onChange={(e) => onSelect(e.target.value as CurrencyCode)}
            className="appearance-none bg-transparent text-axiom-muted text-sm pr-4 cursor-pointer focus:outline-none hover:text-white transition-colors"
          >
            {CURRENCY_OPTIONS.map((o) => (
              <option key={o.code} value={o.code} className="bg-axiom-card text-white">
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown size={12} className="text-axiom-muted pointer-events-none absolute right-0" />
        </div>
        <span className="text-axiom-muted text-sm">/ BRL</span>
      </div>
      <p className="text-xl font-semibold tabular-nums text-white">
        {rate ? `R$ ${rate.bid.toFixed(2)}` : "—"}
      </p>
      {rate && (
        <p className={`text-xs mt-1 font-medium ${changeColor(rate.pctChange)}`}>
          {changeStr(rate.pctChange)} hoje
        </p>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

interface BenchmarkBarProps {
  data: BenchmarkData | null;
  loading: boolean;
}

export function BenchmarkBar({ data, loading }: BenchmarkBarProps) {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>("EUR");

  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY) as CurrencyCode | null;
    if (saved && CURRENCY_OPTIONS.some((o) => o.code === saved)) {
      setSelectedCurrency(saved);
    }
  }, []);

  function handleCurrencyChange(code: CurrencyCode) {
    setSelectedCurrency(code);
    localStorage.setItem(LS_KEY, code);
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-axiom-muted text-xs font-semibold uppercase tracking-wider">
          Benchmarks do Mercado
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-axiom-muted text-xs font-semibold uppercase tracking-wider">
        Benchmarks do Mercado
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <SelicCard value={data?.selicAnual ?? null} />
        <IbovCard price={data?.ibovPrice ?? null} dayChange={data?.ibovDayChange ?? null} />
        <IpcaCard value={data?.ipca ?? null} />
        <CurrencyCard label="USD" rate={data?.currencies["USD"]} />
        <EditableCurrencyCard
          selected={selectedCurrency}
          onSelect={handleCurrencyChange}
          currencies={data?.currencies ?? {}}
        />
      </div>
      <p className="text-axiom-muted text-xs">
        Atualizado a cada 1h · BCB SGS · AwesomeAPI · brapi.dev
      </p>
    </div>
  );
}
