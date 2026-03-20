export function calcCurrentValue(
  baseValue: number,
  rate: number | null,
  frequency: "MONTHLY" | "ANNUAL",
  start: Date
): number {
  if (!rate) return baseValue;
  if (frequency === "MONTHLY") {
    const months = (Date.now() - start.getTime()) / (30.4375 * 24 * 60 * 60 * 1000);
    return baseValue * Math.pow(1 + rate / 100, months);
  }
  const years = (Date.now() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return baseValue * Math.pow(1 + rate / 100, years);
}

export function calcLateFees(
  installmentValue: number,
  overdueMonthsCount: number
): { fine: number; mora: number; total: number } {
  const fine = installmentValue * 0.02;
  const mora = installmentValue * 0.01 * overdueMonthsCount;
  return { fine, mora, total: installmentValue + fine + mora };
}

export function overdueMonths(month: number, year: number): number {
  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1; // 1-12
  return Math.max(0, (nowYear - year) * 12 + (nowMonth - month));
}
