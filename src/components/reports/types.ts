export interface HealthPillar {
  label: string;
  value: number; // 0-100 within pillar
  maxPoints: number;
  earnedPoints: number;
}

export interface Insight {
  type: "positive" | "negative" | "warning";
  text: string;
  badgeText: string;
}

export interface SpendingVelocity {
  budget: number;
  spent: number;
  dayOfMonth: number;
  daysInMonth: number;
  projectedEnd: number;
  projectedOverrun: number; // percentage
}

export interface OverviewData {
  healthScore: number | null;
  pillars: HealthPillar[];
  insights: Insight[];
  velocity: SpendingVelocity | null;
}

export interface CashflowBar {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export interface SankeyNode {
  id: string;
  label: string;
}

export interface SankeyLink {
  from: string;
  to: string;
  value: number;
}

export interface CashflowData {
  monthlyBars: CashflowBar[];
  sankeyNodes: SankeyNode[];
  sankeyLinks: SankeyLink[];
}

export interface NetworthMonth {
  month: string;
  netWorth: number;
  income: number;
  expenses: number;
}

export interface NetworthData {
  months: NetworthMonth[];
  currentNetWorth: number;
  avgSavingsRate: number; // percentage
}
