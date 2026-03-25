import type { AssetType } from "@/generated/prisma/client";

export interface ProventosAsset {
  id: string;
  name: string;
  ticker: string | null;
  type: AssetType;
  totalQuantity: number;
  avgCost: number;
  totalDividends: number;
  lastDividendDate: string | null;
  lastDividendAmount: number;
  yieldOnCost: number;
  dy: number | null;
}

export interface ProventosData {
  totalReceived: number;
  last6m: number;
  last12m: number;
  last24m: number;
  monthly: { month: string; amount: number }[];
  byCategory: { type: AssetType; amount: number }[];
  assets: ProventosAsset[];
}
