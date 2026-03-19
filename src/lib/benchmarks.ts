import { cached } from "./cache";

const BCB_CACHE_TTL = 60 * 60 * 1000; // 1h

export interface BenchmarkData {
  selicAnual: number | null; // % ao ano ex: 13.65
  cdi: number | null;        // % ao ano ex: 14.90
  ipca: number | null;       // % no mês ex: 0.70
  usdBrl: number | null;     // ex: 5.73
  eurBrl: number | null;     // ex: 6.21
  updatedAt: string;         // ISO timestamp
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

export async function fetchBenchmarks(): Promise<BenchmarkData> {
  return cached("benchmarks", BCB_CACHE_TTL, async () => {
    const [selicR, cdiR, ipcaR, awesomeR] = await Promise.allSettled([
      fetchBcbSeries(12),    // SELIC diária
      fetchBcbSeries(4389),  // CDI anual
      fetchBcbSeries(433),   // IPCA mensal
      fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL", {
        cache: "no-store",
      }).then((r) => r.json()),
    ]);

    // série 12 retorna taxa diária decimal (ex: 0.052345 = 0.052345% ao dia)
    const selicDaily = selicR.status === "fulfilled" ? selicR.value : null;
    const selicAnual =
      selicDaily !== null ? ((1 + selicDaily / 100) ** 252 - 1) * 100 : null;

    const awesome = awesomeR.status === "fulfilled" ? awesomeR.value : null;

    return {
      selicAnual,
      cdi:    cdiR.status === "fulfilled" ? cdiR.value : null,
      ipca:   ipcaR.status === "fulfilled" ? ipcaR.value : null,
      usdBrl: awesome ? parseFloat(awesome.USDBRL?.bid) || null : null,
      eurBrl: awesome ? parseFloat(awesome.EURBRL?.bid) || null : null,
      updatedAt: new Date().toISOString(),
    };
  });
}
