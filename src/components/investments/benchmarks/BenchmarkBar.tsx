import type { BenchmarkData } from "@/lib/benchmarks";

interface BenchmarkItemProps {
  label: string;
  value: number | null;
  format: (v: number) => string;
  colorClass: string;
  loading: boolean;
}

function BenchmarkItem({ label, value, format, colorClass, loading }: BenchmarkItemProps) {
  return (
    <div className="flex flex-col gap-1 min-w-[80px]">
      <span className="text-axiom-muted text-xs uppercase font-medium">{label}</span>
      {loading ? (
        <div className="w-20 h-5 rounded bg-axiom-hover animate-pulse" />
      ) : (
        <span className={`font-semibold text-sm ${colorClass}`}>
          {value !== null && !isNaN(value) ? format(value) : "—"}
        </span>
      )}
    </div>
  );
}

interface BenchmarkBarProps {
  data: BenchmarkData | null;
  loading: boolean;
}

export function BenchmarkBar({ data, loading }: BenchmarkBarProps) {
  const items: BenchmarkItemProps[] = [
    {
      label: "SELIC",
      value: data?.selicAnual ?? null,
      format: (v) => `${v.toFixed(2)}% a.a.`,
      colorClass: "text-axiom-primary",
      loading,
    },
    {
      label: "CDI",
      value: data?.cdi ?? null,
      format: (v) => `${v.toFixed(2)}% a.a.`,
      colorClass: "text-axiom-primary",
      loading,
    },
    {
      label: "IPCA",
      value: data?.ipca ?? null,
      format: (v) => `${v.toFixed(2)}% /mês`,
      colorClass: "text-axiom-expense",
      loading,
    },
    {
      label: "USD/BRL",
      value: data?.usdBrl ?? null,
      format: (v) => `R$ ${v.toFixed(2)}`,
      colorClass: "text-white",
      loading,
    },
    {
      label: "EUR/BRL",
      value: data?.eurBrl ?? null,
      format: (v) => `R$ ${v.toFixed(2)}`,
      colorClass: "text-white",
      loading,
    },
  ];

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-4">
      <p className="text-axiom-muted text-xs font-semibold uppercase mb-3">Benchmarks</p>
      <div className="flex flex-wrap gap-6">
        {items.map((item) => (
          <BenchmarkItem key={item.label} {...item} />
        ))}
      </div>
      <p className="text-axiom-muted text-xs mt-3">Atualizado a cada 1h</p>
    </div>
  );
}
