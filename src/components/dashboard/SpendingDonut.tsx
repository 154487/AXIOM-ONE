"use client";

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { useTranslations, useLocale } from "next-intl";
import { formatCurrency } from "@/lib/utils";

ChartJS.register(ArcElement, Tooltip, Legend);

interface CategorySpending {
  name: string;
  value: number;
  color: string;
}

interface SpendingDonutProps {
  data: CategorySpending[];
  currency?: string;
}

export function SpendingDonut({ data, currency = "BRL" }: SpendingDonutProps) {
  const t = useTranslations("SpendingDonut");
  const locale = useLocale();

  const isEmpty = data.length === 0;

  const chartData = {
    labels: data.map((d) => d.name),
    datasets: [
      {
        data: isEmpty ? [1] : data.map((d) => d.value),
        backgroundColor: isEmpty ? ["#1E2D42"] : data.map((d) => d.color),
        borderWidth: 0,
        hoverOffset: isEmpty ? 0 : 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%",
    animation: {
      duration: 1000,
      easing: "easeOutQuart" as const,
    },
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
          label: (ctx: { label: string; parsed: number }) => {
            const val = new Intl.NumberFormat(locale, {
              style: "currency",
              currency,
            }).format(ctx.parsed);
            return ` ${ctx.label}: ${val}`;
          },
        },
      },
    },
  };

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-5">
      <h3 className="text-white font-semibold mb-4">{t("title")}</h3>

      <div style={{ height: 200 }}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Doughnut data={chartData} options={options as any} />
      </div>

      {/* Legend */}
      <div className="mt-4 space-y-2">
        {isEmpty ? (
          <p className="text-axiom-muted text-sm text-center">—</p>
        ) : (
          data.slice(0, 5).map((item) => (
            <div key={item.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-axiom-muted truncate max-w-[120px]">{item.name}</span>
              </div>
              <span className="text-white font-medium">{formatCurrency(item.value, locale, currency)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
