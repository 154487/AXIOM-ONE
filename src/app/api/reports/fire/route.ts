import { NextRequest, NextResponse } from "next/server";

const ANNUAL_RATES = {
  conservador: 0.06,
  moderado: 0.08,
  agressivo: 0.10,
} as const;

export interface FireScenario {
  rate: number;
  projectedMonths: number | null;
  projectedYear: number | null;
  projectionSeries: { year: number; value: number }[];
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
  fiLine?: { year: number; value: number }[];
  // Legacy fields (alias de moderado) — backward compat
  projectedMonths?: number | null;
  projectedYear?: number | null;
  projectionSeries?: { year: number; value: number }[];
}

function runScenario(
  patrimony: number,
  PMT: number,
  annualRate: number,
  fiNumber: number,
  currentYear: number
): FireScenario {
  const r = annualRate / 12;
  let FV = patrimony;
  let projectedMonths: number | null = null;
  const projectionSeries: { year: number; value: number }[] = [{ year: 0, value: FV }];

  for (let month = 1; month <= 600; month++) {
    FV = FV * (1 + r) + PMT;
    if (month % 12 === 0) {
      projectionSeries.push({ year: month / 12, value: FV });
    }
    if (FV >= fiNumber && projectedMonths === null) {
      projectedMonths = month;
    }
  }

  const projectedYear =
    projectedMonths !== null ? currentYear + Math.ceil(projectedMonths / 12) : null;

  return { rate: annualRate, projectedMonths, projectedYear, projectionSeries };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const patrimony = parseFloat(searchParams.get("patrimony") ?? "0");
  const monthlyIncome = parseFloat(searchParams.get("monthlyIncome") ?? "0");
  const monthlyExpenses = parseFloat(searchParams.get("monthlyExpenses") ?? "0");
  const retirementYears = parseInt(searchParams.get("retirementYears") ?? "30", 10);

  // targetMonthlyIncome: renda mensal desejada na aposentadoria
  // Se fornecida, usada para FI Number; caso contrário, usa regra tradicional de despesas
  const targetMonthlyIncome = parseFloat(searchParams.get("targetMonthlyIncome") ?? "0");

  // fiNumberManual: FI Number definido diretamente pelo usuário — sobrepõe cálculo automático
  const fiNumberManual = parseFloat(searchParams.get("fiNumberManual") ?? "0");

  if (monthlyIncome <= 0 || monthlyExpenses >= monthlyIncome) {
    return NextResponse.json({
      projectable: false,
      reason: "despesas_maiores_que_renda",
    } satisfies FireResponse);
  }

  const PMT = monthlyIncome - monthlyExpenses;
  const safeRetirementYears = retirementYears > 0 && retirementYears <= 60 ? retirementYears : 30;

  // FI Number: usa valor manual se definido; senão calcula pela regra 4%
  const incomeBase = targetMonthlyIncome > 0 ? targetMonthlyIncome : monthlyExpenses;
  const fiNumber = fiNumberManual > 0 ? fiNumberManual : incomeBase * 12 * 25;

  // Coast FIRE: quanto precisa ter hoje para atingir FI no horizonte definido sem aportes
  const coastFireNumber = fiNumber / Math.pow(1 + ANNUAL_RATES.moderado, safeRetirementYears);

  const currentYear = new Date().getFullYear();

  const scenarios = {
    conservador: runScenario(patrimony, PMT, ANNUAL_RATES.conservador, fiNumber, currentYear),
    moderado: runScenario(patrimony, PMT, ANNUAL_RATES.moderado, fiNumber, currentYear),
    agressivo: runScenario(patrimony, PMT, ANNUAL_RATES.agressivo, fiNumber, currentYear),
  };

  const fiLine = scenarios.moderado.projectionSeries.map((p) => ({ year: p.year, value: fiNumber }));

  return NextResponse.json({
    projectable: true,
    fiNumber,
    coastFireNumber,
    scenarios,
    fiLine,
    // Legacy fields — alias do moderado
    projectedMonths: scenarios.moderado.projectedMonths,
    projectedYear: scenarios.moderado.projectedYear,
    projectionSeries: scenarios.moderado.projectionSeries,
  } satisfies FireResponse);
}
