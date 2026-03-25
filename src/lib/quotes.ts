import { cached } from "./cache";

const CACHE_TTL = 60 * 60 * 1000; // 1h

export interface QuoteData {
  price: number;
  dailyChange: number;
  dailyChangePct: number;
}

export async function fetchQuote(ticker: string): Promise<QuoteData | null> {
  const token = process.env.BRAPI_TOKEN;
  if (!token) {
    console.warn("[quotes] BRAPI_TOKEN not set — skipping live price for", ticker);
    return null;
  }
  return cached(`quote:${ticker}`, CACHE_TTL, async () => {
    try {
      const res = await fetch(
        `https://brapi.dev/api/quote/${ticker}?token=${token}&fundamental=false`,
        { cache: "no-store" }
      );
      if (!res.ok) return null;
      const data = await res.json();
      const r = data.results?.[0];
      if (!r) return null;
      return {
        price: r.regularMarketPrice as number,
        dailyChange: (r.regularMarketChange as number) ?? 0,
        dailyChangePct: (r.regularMarketChangePercent as number) ?? 0,
      };
    } catch {
      return null;
    }
  });
}

export async function fetchQuotes(tickers: string[]): Promise<Record<string, QuoteData>> {
  const unique = [...new Set(tickers.filter(Boolean))];
  const quotes = await Promise.all(unique.map(fetchQuote));
  return Object.fromEntries(
    unique.flatMap((t, i) => (quotes[i] !== null ? [[t, quotes[i]!]] : []))
  );
}
