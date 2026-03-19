import { Landmark, Percent, TrendingUp, DollarSign, Globe } from "lucide-react";
import type { BenchmarkData } from "@/lib/benchmarks";

// ── Escala de cores semântica ─────────────────────────────────────────────────

// SELIC / CDI: juros altos = ruim para economia e crédito
function rateColor(v: number): string {
  if (v <= 8)    return "text-axiom-income";   // verde  — estimulativo, ótimo
  if (v <= 11.5) return "text-white";           // branco — neutro, aceitável
  if (v <= 13.5) return "text-axiom-primary";  // laranja — restritivo
  return "text-axiom-expense";                 // vermelho — muito alto
}
function rateLabel(v: number): string {
  if (v <= 8)    return "Estimulativo";
  if (v <= 11.5) return "Neutro";
  if (v <= 13.5) return "Restritivo";
  return "Muito alto";
}

// IPCA: inflação mensal — meta BCB ≈ 0.33%/mês (4% ao ano)
function ipcaColor(v: number): string {
  if (v <= 0.33) return "text-axiom-income";
  if (v <= 0.5)  return "text-white";
  if (v <= 0.7)  return "text-axiom-primary";
  return "text-axiom-expense";
}
function ipcaLabel(v: number): string {
  if (v <= 0.33) return "Na meta";
  if (v <= 0.5)  return "Atenção";
  if (v <= 0.7)  return "Elevado";
  return "Acima da meta";
}

// ── Componente de card individual ─────────────────────────────────────────────

function BenchmarkCard({
  icon: Icon,
  label,
  value,
  format,
  color,
  sublabel,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: number | null;
  format: (v: number) => string;
  color: string;
  sublabel: string | null;
  loading: boolean;
}) {
  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={loading || value === null ? "text-axiom-muted" : color} />
        <span className="text-axiom-muted text-sm">{label}</span>
      </div>
      {loading ? (
        <>
          <div className="h-7 bg-axiom-hover rounded w-3/4 animate-pulse mb-1" />
          <div className="h-3 bg-axiom-hover rounded w-1/2 animate-pulse" />
        </>
      ) : (
        <>
          <p className={`text-xl font-semibold tabular-nums ${value !== null ? color : "text-axiom-muted"}`}>
            {value !== null && !isNaN(value) ? format(value) : "—"}
          </p>
          {sublabel && value !== null && (
            <p className={`text-xs mt-1 ${color} opacity-70`}>{sublabel}</p>
          )}
        </>
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
  const cards = [
    {
      icon: Landmark,
      label: "SELIC",
      value: data?.selicAnual ?? null,
      format: (v: number) => `${v.toFixed(2)}% a.a.`,
      color: data?.selicAnual != null ? rateColor(data.selicAnual) : "text-axiom-muted",
      sublabel: data?.selicAnual != null ? rateLabel(data.selicAnual) : null,
    },
    {
      icon: Percent,
      label: "CDI",
      value: data?.cdi ?? null,
      format: (v: number) => `${v.toFixed(2)}% a.a.`,
      color: data?.cdi != null ? rateColor(data.cdi) : "text-axiom-muted",
      sublabel: data?.cdi != null ? rateLabel(data.cdi) : null,
    },
    {
      icon: TrendingUp,
      label: "IPCA",
      value: data?.ipca ?? null,
      format: (v: number) => `${v.toFixed(2)}% /mês`,
      color: data?.ipca != null ? ipcaColor(data.ipca) : "text-axiom-muted",
      sublabel: data?.ipca != null ? ipcaLabel(data.ipca) : null,
    },
    {
      icon: DollarSign,
      label: "USD / BRL",
      value: data?.usdBrl ?? null,
      format: (v: number) => `R$ ${v.toFixed(2)}`,
      color: "text-white",
      sublabel: null,
    },
    {
      icon: Globe,
      label: "EUR / BRL",
      value: data?.eurBrl ?? null,
      format: (v: number) => `R$ ${v.toFixed(2)}`,
      color: "text-white",
      sublabel: null,
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <p className="text-axiom-muted text-xs font-semibold uppercase tracking-wider">
        Benchmarks do Mercado
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((card) => (
          <BenchmarkCard key={card.label} {...card} loading={loading} />
        ))}
      </div>
      <p className="text-axiom-muted text-xs">
        Atualizado a cada 1h · BCB SGS · AwesomeAPI
      </p>
    </div>
  );
}
