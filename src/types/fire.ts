// Type-only file — no server-only imports
// Shared between client components and API routes

export interface FireSettingsResponse {
  monthlyExpense: number | null;
  swr: number | null;
  targetMonthlyIncome: number | null;
  retirementYears: number | null;
  targetMonthlyContrib: number | null;
  targetInvestedAmount: number | null;
  fiNumberManual: number | null;
}

export interface FireEssentialsResponse {
  categories: {
    id: string;
    name: string;
    color: string;
    monthlyAvg: number;
  }[];
  totalEssentialMonthly: number;
  liabilityCosts: {
    wealthItemId: string;
    wealthItemName: string;
    categoryId: string;
    categoryName: string;
    categoryColor: string;
    monthlyAvg: number;
  }[];
}

export interface WealthItemSerialized {
  id: string;
  name: string;
  value: number;
  baseValue: number;
  itemType: "ASSET" | "LIABILITY";
  category: string;
  appreciationRate: number | null;
  appreciationStart: string;
  rateFrequency: "MONTHLY" | "ANNUAL";
  loanBank: string | null;
  loanInstallments: number | null;
  loanStartDate: string | null;
  loanDueDay: number | null;
  linkedCategoryId: string | null;
  linkedCategoryName: string | null;
  notes: string | null;
  createdAt: string;
}

export interface WealthItemsResponse {
  items: WealthItemSerialized[];
  totalAssets: number;
  totalLiabilities: number;
  net: number;
}

export interface FinancialGoalSerialized {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  contributionAmount: number;
  contributionFrequency: "DAILY" | "WEEKLY" | "MONTHLY";
  bank: string | null;
  notes: string | null;
  createdAt: string;
}

export interface FireScenario {
  rate: number;
  projectedMonths: number | null;
  projectedYear: number | null;
  projectionSeries: { month: number; value: number }[];
}

export interface FireResponse {
  projectable: boolean;
  reason?: string;
  fiNumber?: number;
  coastFireNumber?: number;
  scenarios?: {
    conservador: FireScenario;
    moderado: FireScenario;
    agressivo: FireScenario;
  };
  fiLine?: { month: number; value: number }[];
  // Legacy fields (alias de moderado) — backward compat
  projectedMonths?: number | null;
  projectedYear?: number | null;
  projectionSeries?: { month: number; value: number }[];
  savingsRate?: number;
  monthlyIncome?: number;
  monthlyExpenses?: number;
  monthlySurplus?: number;
}
