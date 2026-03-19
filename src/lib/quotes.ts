import { cached } from "./cache";

const CACHE_TTL = 60 * 60 * 1000; // 1h

export async function fetchQuote(ticker: string): Promise<number | null> {
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
      return (data.results?.[0]?.regularMarketPrice as number) ?? null;
    } catch {
      return null;
    }
  });
}

export async function fetchQuotes(tickers: string[]): Promise<Record<string, number>> {
  const unique = [...new Set(tickers.filter(Boolean))];
  const prices = await Promise.all(unique.map(fetchQuote));
  return Object.fromEntries(
    unique.flatMap((t, i) => (prices[i] !== null ? [[t, prices[i]!]] : []))
  );
}
