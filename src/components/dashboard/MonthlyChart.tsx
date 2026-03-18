"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
}

interface MonthlyChartProps {
  data: MonthlyData[];
}

export function MonthlyChart({ data }: MonthlyChartProps) {
  const t = useTranslations("MonthlyChart");
  const locale = useLocale();

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-5">
      <h3 className="text-white font-semibold mb-4">{t("title")}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E2D42" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: "#AAB2BD", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#AAB2BD", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#152030",
              border: "1px solid #1E2D42",
              borderRadius: "8px",
              color: "#fff",
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) =>
              new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format(Number(value))
            }
          />
          <Legend
            wrapperStyle={{ paddingTop: "12px", color: "#AAB2BD", fontSize: "12px" }}
          />
          <Bar dataKey="income" name={t("income")} fill="#10B981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expenses" name={t("expenses")} fill="#FF6B35" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
