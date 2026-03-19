import {
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Info,
} from "lucide-react";

export type InsightType = "warning" | "success" | "positive" | "negative" | "neutral";

export interface DashboardInsight {
  type: InsightType;
  title: string;
  message: string;
}

export const INSIGHT_CONFIGS: Record<InsightType, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  warning:  { icon: AlertTriangle,  color: "text-axiom-primary",  bg: "bg-axiom-primary/10",  border: "border-axiom-primary/30"  },
  success:  { icon: CheckCircle2,   color: "text-axiom-income",   bg: "bg-axiom-income/10",   border: "border-axiom-income/30"   },
  positive: { icon: TrendingUp,     color: "text-axiom-income",   bg: "bg-axiom-income/10",   border: "border-axiom-income/30"   },
  negative: { icon: TrendingDown,   color: "text-axiom-expense",  bg: "bg-axiom-expense/10",  border: "border-axiom-expense/30"  },
  neutral:  { icon: Info,           color: "text-axiom-muted",    bg: "bg-axiom-hover",       border: "border-axiom-border"      },
};

export function InsightCard({ insight }: { insight: DashboardInsight }) {
  const cfg = INSIGHT_CONFIGS[insight.type];
  const Icon = cfg.icon;
  return (
    <div className={`bg-axiom-card border ${cfg.border} rounded-xl p-4 flex flex-col gap-2`}>
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
          <Icon size={14} className={cfg.color} />
        </div>
        <p className={`text-sm font-semibold ${cfg.color}`}>{insight.title}</p>
      </div>
      <p className="text-axiom-muted text-xs leading-relaxed">{insight.message}</p>
    </div>
  );
}

interface DashboardInsightsProps {
  insights: DashboardInsight[];
}

export function DashboardInsights({ insights }: DashboardInsightsProps) {
  if (insights.length === 0) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {insights.map((insight, i) => <InsightCard key={i} insight={insight} />)}
    </div>
  );
}
