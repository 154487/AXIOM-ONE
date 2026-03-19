import { NextRequest, NextResponse } from "next/server";

const ANNUAL_RATES: Record<string, number> = {
  conservador: 0.06,
  moderado: 0.08,
  agressivo: 0.10,
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const patrimony = parseFloat(searchParams.get("patrimony") ?? "0");
  const monthlyIncome = parseFloat(searchParams.get("monthlyIncome") ?? "0");
  const monthlyExpenses = parseFloat(searchParams.get("monthlyExpenses") ?? "0");
  const rateKey = searchParams.get("rate") ?? "moderado";

  if (monthlyIncome <= 0 || monthlyExpenses >= monthlyIncome) {
    return NextResponse.json({
      projectable: false,
      reason: "despesas_maiores_que_renda",
    });
  }

  const annualRate = ANNUAL_RATES[rateKey] ?? ANNUAL_RATES.moderado;
  const r = annualRate / 12; // taxa mensal
  const PMT = monthlyIncome - monthlyExpenses; // aporte mensal

  // FI Number = regra dos 4%: gastos anuais × 25
  const fiNumber = monthlyExpenses * 12 * 25;

  // Projeção mês a mês (max 600 = 50 anos)
  let FV = patrimony;
  let projectedMonths = 0;
  const projectionSeries: { year: number; value: number }[] = [
    { year: 0, value: FV },
  ];

  for (let month = 1; month <= 600; month++) {
    FV = FV * (1 + r) + PMT;
    if (month % 12 === 0) {
      projectionSeries.push({ year: month / 12, value: FV });
    }
    if (FV >= fiNumber && projectedMonths === 0) {
      projectedMonths = month;
    }
  }

  const currentYear = new Date().getFullYear();
  const projectedYear =
    projectedMonths > 0
      ? currentYear + Math.ceil(projectedMonths / 12)
      : null;

  // Adicionar linha do FI Number para o chart
  const fiLine = projectionSeries.map((p) => ({ year: p.year, value: fiNumber }));

  return NextResponse.json({
    projectable: true,
    fiNumber,
    projectedMonths,
    projectedYear,
    projectionSeries,
    fiLine,
  });
}
