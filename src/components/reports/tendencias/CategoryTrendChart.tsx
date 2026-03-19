"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/utils";

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend
);

interface Category {
  id: string;
  name: string;
  color: string;
}

interface MonthPoint {
  month: string;
  value: number;
  mean: number;
  stdDev: number;
}

interface TrendSeries {
  categoryId: string;
  categoryName: string;
  color: string;
  monthly: MonthPoint[];
}

interface CategoryTrendChartProps {
  currency: string;
  locale: string;
  period: { start: string; end: string };
}

export function CategoryTrendChart({ currency, locale, period }: CategoryTrendChartProps) {
  const t = useTranslations("Reports");
  const [mounted, setMounted] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [series, setSeries] = useState<TrendSeries[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => setMounted(true), []);

  // Fetch categorias disponíveis ao montar
  useEffect(() => {
    fetch(`/api/reports/trends?start=${period.start}&end=${period.end}`)
      .then((res) => (res.ok ? res.json() : { categories: [], series: [] }))
      .then((data) => {
        setCategories(data.categories ?? []);
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch séries quando categorias selecionadas ou período mudam
  const fetchSeries = useCallback(
    async (cats: string[]) => {
      if (cats.length === 0) {
        setSeries([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `/api/reports/trends?cats=${cats.join(",")}&start=${period.start}&end=${period.end}`
        );
        if (res.ok) {
          const data = await res.json();
          setSeries(data.series ?? []);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    },
    [period.start, period.end]
  );

  useEffect(() => {
    fetchSeries(selectedCats);
  }, [selectedCats, fetchSeries]);

  function toggleCategory(id: string) {
    setSelectedCats((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      if (prev.length >= 3) return prev; // max 3
      return [...prev, id];
    });
  }

  const labels = series[0]?.monthly.map((m) => m.month) ?? [];

  const datasets = series.flatMap((s) => {
    const hex = s.color.startsWith("#") ? s.color : "#FF6B35";
    return [
      // Área de desvio padrão (mean ± stdDev)
      {
        label: `${s.categoryName} (banda)`,
        data: s.monthly.map((m) => m.mean + m.stdDev),
        borderWidth: 0,
        backgroundColor: `${hex}22`,
        fill: "+1" as const,
        pointRadius: 0,
        tension: 0.3,
      },
      {
        label: `${s.categoryName} (banda baixa)`,
        data: s.monthly.map((m) => Math.max(0, m.mean - m.stdDev)),
        borderWidth: 0,
        backgroundColor: `${hex}22`,
        fill: false as const,
        pointRadius: 0,
        tension: 0.3,
      },
      // Média histórica (pontilhada)
      {
        label: `${s.categoryName} (média)`,
        data: s.monthly.map((m) => m.mean),
        borderColor: `${hex}88`,
        borderDash: [4, 4],
        borderWidth: 1.5,
        backgroundColor: "transparent",
        fill: false as const,
        pointRadius: 0,
        tension: 0,
      },
      // Linha principal
      {
        label: s.categoryName,
        data: s.monthly.map((m) => m.value),
        borderColor: hex,
        backgroundColor: "transparent",
        borderWidth: 2,
        fill: false as const,
        tension: 0.3,
        pointRadius: s.monthly.map((m) =>
          m.value > m.mean + m.stdDev ? 5 : 3
        ),
        pointBackgroundColor: s.monthly.map((m) =>
          m.value > m.mean + m.stdDev ? "#EF4444" : hex
        ),
      },
    ];
  });

  const chartData = { labels, datasets };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 1000, easing: "easeOutQuart" as const },
    plugins: {
      legend: {
        labels: {
          color: "#AAB2BD",
          font: { size: 11 },
          filter: (item: { text: string }) => !item.text.includes("banda") && !item.text.includes("média"),
        },
      },
      tooltip: {
        backgroundColor: "#152030",
        borderColor: "#1E2D42",
        borderWidth: 1,
        titleColor: "#AAB2BD",
        bodyColor: "#fff",
        padding: 10,
        filter: (item: { dataset: { label: string } }) =>
          !item.dataset.label.includes("banda") && !item.dataset.label.includes("média"),
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (ctx: any) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y, locale, currency)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#AAB2BD", font: { size: 11 } },
        border: { display: false },
      },
      y: {
        grid: { color: "#1E2D42" },
        ticks: {
          color: "#AAB2BD",
          font: { size: 11 },
          callback: (val: number | string) => {
            const n = Number(val);
            return n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n);
          },
        },
        border: { display: false },
      },
    },
  };

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 h-full flex flex-col">
      <h3 className="text-white font-semibold mb-4">{t("categoryTrend")}</h3>

      {/* Seleção de categorias */}
      <div className="flex flex-wrap gap-2 mb-4">
        {categories.map((cat) => {
          const selected = selectedCats.includes(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => toggleCategory(cat.id)}
              disabled={!selected && selectedCats.length >= 3}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selected
                  ? "text-white"
                  : "text-axiom-muted hover:text-white disabled:opacity-40"
              }`}
              style={selected ? { backgroundColor: cat.color } : { backgroundColor: "#1A2840" }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
              {cat.name}
            </button>
          );
        })}
        {categories.length === 0 && (
          <p className="text-axiom-muted text-sm">Nenhuma categoria cadastrada</p>
        )}
      </div>

      <div className="flex-1 min-h-0" style={{ minHeight: 220 }}>
        {loading ? (
          <div className="w-full h-full rounded-lg bg-axiom-hover animate-pulse" />
        ) : selectedCats.length === 0 ? (
          <div className="flex items-center justify-center h-full text-axiom-muted text-sm">
            Selecione até 3 categorias para visualizar a tendência
          </div>
        ) : mounted ? (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <Line data={chartData} options={options as any} />
        ) : (
          <div className="w-full h-full rounded-lg bg-axiom-hover animate-pulse" />
        )}
      </div>
    </div>
  );
}
