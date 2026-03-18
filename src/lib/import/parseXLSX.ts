import * as XLSX from "xlsx";
import { randomUUID } from "crypto";
import { cleanDescription } from "./cleanDescription";
import type { ParsedRow } from "./types";

const DATE_COLUMNS = ["Data", "data", "DATE", "date", "Data Lançamento", "Data Compra"];
const AMOUNT_COLUMNS = ["Valor", "valor", "Amount", "Quantia", "Crédito", "Débito"];
const DESCRIPTION_COLUMNS = ["Histórico", "historico", "Descrição", "descricao", "Memo", "Description", "Nome"];

function detectColumn(headers: string[], candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (headers.includes(candidate)) return candidate;
  }
  return null;
}

function parseBrazilianAmount(raw: string): number {
  let s = String(raw).trim();
  s = s.replace(/R\$\s*/g, "").trim();
  const negative = s.startsWith("-") || (s.startsWith("(") && s.endsWith(")"));
  s = s.replace(/[()]/g, "").replace(/^-/, "").trim();

  if (s.includes(",")) {
    s = s.replace(/\./g, "");
    s = s.replace(",", ".");
  }

  const value = parseFloat(s);
  if (isNaN(value)) return 0;
  return negative ? -Math.abs(value) : value;
}

function parseDate(raw: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const brMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  return raw.slice(0, 10);
}

export function parseXLSX(buffer: Buffer): ParsedRow[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];

  const ws = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { raw: false });

  if (!data.length) return [];

  const headers = Object.keys(data[0]);
  const dateCol = detectColumn(headers, DATE_COLUMNS);
  const amountCol = detectColumn(headers, AMOUNT_COLUMNS);
  const descCol = detectColumn(headers, DESCRIPTION_COLUMNS);

  if (!dateCol || !amountCol) return [];

  const rows: ParsedRow[] = [];

  for (const row of data) {
    const rawDate = row[dateCol] ?? "";
    const rawAmount = row[amountCol] ?? "";
    const rawDesc = descCol ? (row[descCol] ?? "") : "";

    const amount = parseBrazilianAmount(rawAmount);
    if (amount === 0) continue;

    rows.push({
      id: randomUUID(),
      date: parseDate(rawDate),
      rawDescription: rawDesc,
      cleanDescription: cleanDescription(rawDesc),
      amount: Math.abs(amount),
      type: amount < 0 ? "EXPENSE" : "INCOME",
    });
  }

  return rows;
}
