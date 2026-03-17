import { cn, formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface KPICardProps {
  title: string;
  value: number;
  change?: number;
  icon: React.ReactNode;
  type?: "income" | "expense" | "neutral";
}

export function KPICard({ title, value, change, icon, type = "neutral" }: KPICardProps) {
  const isPositive = (change ?? 0) >= 0;

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-5 relative overflow-hidden">
      {/* Change badge */}
      {change !== undefined && (
        <div
          className={cn(
            "absolute top-3 right-3 flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
            isPositive
              ? "text-axiom-income bg-axiom-income/10"
              : "text-axiom-expense bg-axiom-expense/10"
          )}
        >
          {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {isPositive ? "+" : ""}{change?.toFixed(1)}%
        </div>
      )}

      {/* Icon */}
      <div
        className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center mb-4",
          type === "income" && "bg-axiom-income/20 text-axiom-income",
          type === "expense" && "bg-axiom-expense/20 text-axiom-expense",
          type === "neutral" && "bg-axiom-primary/20 text-axiom-primary"
        )}
      >
        {icon}
      </div>

      <p className="text-axiom-muted text-sm mb-1">{title}</p>
      <p className="text-white text-2xl font-bold">{formatCurrency(value)}</p>
    </div>
  );
}
