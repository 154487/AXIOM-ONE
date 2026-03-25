import { cached } from "./cache";

const CACHE_TTL = 6 * 60 * 60 * 1000; // 6h

export interface CashDividend {
  paymentDate: string;
  rate: number;
  label: string; // "DIVIDENDO" | "JCP" | "RENDIMENTO"
  lastDatePrior: string;
}

export async function fetchDividends(ticker: string): Promise<CashDividend[] | null> {
  const token = process.env.BRAPI_TOKEN;
  if (!token) return null;
  return cached(`dividends:${ticker}`, CACHE_TTL, async () => {
    try {
      const res = await fetch(
        `https://brapi.dev/api/quote/${ticker}?dividends=true&token=${token}`,
        { cache: "no-store" }
      );
      if (!res.ok) return null;
      const data = await res.json();
      return (data.results?.[0]?.dividendsData?.cashDividends ?? null) as CashDividend[] | null;
    } catch {
      return null;
    }
  });
}
