"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils";

interface CategorySpending {
  name: string;
  value: number;
  color: string;
}

interface SpendingDonutProps {
  data: CategorySpending[];
}

export function SpendingDonut({ data }: SpendingDonutProps) {

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-5">
      <h3 className="text-white font-semibold mb-4">Spending by Category</h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#152030",
              border: "1px solid #1E2D42",
              borderRadius: "8px",
              color: "#fff",
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) => formatCurrency(Number(value))}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-3 space-y-2">
        {data.slice(0, 4).map((item) => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-axiom-muted">{item.name}</span>
            </div>
            <span className="text-white font-medium">{formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
