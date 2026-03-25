import { cached } from "./cache";

const PRICE_TTL = 5 * 60 * 1000; // 5min
const SEARCH_TTL = 30 * 60 * 1000; // 30min

export async function fetchCryptoPrice(coingeckoId: string): Promise<number | null> {
  return cached(`crypto:price:${coingeckoId}`, PRICE_TTL, async () => {
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=brl`,
        { cache: "no-store" }
      );
      if (!res.ok) return null;
      const data = await res.json();
      return (data[coingeckoId]?.brl as number) ?? null;
    } catch {
      return null;
    }
  });
}

export async function fetchCryptoPrices(
  coingeckoIds: string[]
): Promise<Record<string, number>> {
  if (coingeckoIds.length === 0) return {};
  return cached(`crypto:prices:${coingeckoIds.sort().join(",")}`, PRICE_TTL, async () => {
    try {
      const ids = coingeckoIds.join(",");
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=brl`,
        { cache: "no-store" }
      );
      if (!res.ok) return {};
      const data = await res.json();
      const result: Record<string, number> = {};
      for (const id of coingeckoIds) {
        if (data[id]?.brl != null) result[id] = data[id].brl as number;
      }
      return result;
    } catch {
      return {};
    }
  });
}

export async function searchCryptoBySymbol(
  query: string
): Promise<Array<{ id: string; name: string; symbol: string }>> {
  return cached(`crypto:search:${query.toLowerCase()}`, SEARCH_TTL, async () => {
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`,
        { cache: "no-store" }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return ((data.coins ?? []) as Array<{ id: string; name: string; symbol: string }>)
        .slice(0, 8)
        .map((c) => ({
          id: c.id,
          name: c.name,
          symbol: c.symbol.toUpperCase(),
        }));
    } catch {
      return [];
    }
  });
}
