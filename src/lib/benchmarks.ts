import { cached } from "./cache";

const BCB_CACHE_TTL = 60 * 60 * 1000; // 1h

export interface CurrencyRate {
  bid: number;        // cotação (compra)
  pctChange: number;  // variação % vs. dia anterior
}

export interface BenchmarkData {
  selicAnual: number | null;    // % ao ano
  ibovPrice: number | null;     // pontos ex: 125430
  ibovDayChange: number | null; // variação % do dia ex: +1.23
  ipca: number | null;          // % no mês
  currencies: Partial<Record<string, CurrencyRate>>; // USD, EUR, GBP, ARS
  updatedAt: string;
}

async function fetchBcbSeries(series: number): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${series}/dados/ultimos/1?formato=json`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return parseFloat(data[0]?.valor) ?? null;
  } catch {
    return null;
  }
}

async function fetchIbov(): Promise<{ price: number | null; dayChange: number | null }> {
  const token = process.env.BRAPI_TOKEN;
  if (!token) return { price: null, dayChange: null };
  try {
    const res = await fetch(
      `https://brapi.dev/api/quote/%5EBVSP?token=${token}&fundamental=false`,
      { cache: "no-store" }
    );
    if (!res.ok) return { price: null, dayChange: null };
    const data = await res.json();
    const r = data.results?.[0];
    return {
      price:     (r?.regularMarketPrice as number) ?? null,
      dayChange: (r?.regularMarketChangePercent as number) ?? null,
    };
  } catch {
    return { price: null, dayChange: null };
  }
}

export async function fetchBenchmarks(): Promise<BenchmarkData> {
  return cached("benchmarks", BCB_CACHE_TTL, async () => {
    const [selicR, ibovR, ipcaR, awesomeR] = await Promise.allSettled([
      fetchBcbSeries(12),   // SELIC diária
      fetchIbov(),          // Ibovespa preço + variação
      fetchBcbSeries(433),  // IPCA mensal
      fetch(
        "https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,GBP-BRL,ARS-BRL",
        { cache: "no-store" }
      ).then((r) => r.json()),
    ]);

    // série 12: taxa diária decimal → anualizar com 252 dias úteis
    const selicDaily = selicR.status === "fulfilled" ? selicR.value : null;
    const selicAnual =
      selicDaily !== null ? ((1 + selicDaily / 100) ** 252 - 1) * 100 : null;

    const ibov = ibovR.status === "fulfilled" ? ibovR.value : { price: null, dayChange: null };

    const aw = awesomeR.status === "fulfilled" ? awesomeR.value : null;
    const currencies: Partial<Record<string, CurrencyRate>> = {};
    if (aw) {
      for (const [awKey, code] of [
        ["USDBRL", "USD"],
        ["EURBRL", "EUR"],
        ["GBPBRL", "GBP"],
        ["ARSBRL", "ARS"],
      ] as [string, string][]) {
        const entry = aw[awKey];
        if (entry) {
          currencies[code] = {
            bid:       parseFloat(entry.bid)       || 0,
            pctChange: parseFloat(entry.pctChange) || 0,
          };
        }
      }
    }

    return {
      selicAnual,
      ibovPrice:     ibov.price,
      ibovDayChange: ibov.dayChange,
      ipca:          ipcaR.status === "fulfilled" ? ipcaR.value : null,
      currencies,
      updatedAt: new Date().toISOString(),
    };
  });
}
