import Papa from "papaparse";
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
  // Handle "R$ 1.234,56" format and plain numbers
  let s = raw.trim();
  // Remove currency symbol and spaces
  s = s.replace(/R\$\s*/g, "").trim();
  // Check if it's negative (starts with - or has parentheses like accounting)
  const negative = s.startsWith("-") || (s.startsWith("(") && s.endsWith(")"));
  s = s.replace(/[()]/g, "").replace(/^-/, "").trim();

  // Brazilian format: dots as thousands separator, comma as decimal
  if (s.includes(",")) {
    // Remove thousand separators (dots)
    s = s.replace(/\./g, "");
    // Replace decimal comma with dot
    s = s.replace(",", ".");
  }

  const value = parseFloat(s);
  if (isNaN(value)) return 0;
  return negative ? -Math.abs(value) : value;
}

function parseDate(raw: string): string {
  // Try ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  // Try DD/MM/YYYY
  const brMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  // Try MM/DD/YYYY
  const usMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (usMatch) return `${usMatch[3]}-${usMatch[1]}-${usMatch[2]}`;
  return raw.slice(0, 10);
}

export function parseCSV(text: string): ParsedRow[] {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (!result.data.length) return [];

  const headers = Object.keys(result.data[0]);
  const dateCol = detectColumn(headers, DATE_COLUMNS);
  const amountCol = detectColumn(headers, AMOUNT_COLUMNS);
  const descCol = detectColumn(headers, DESCRIPTION_COLUMNS);

  if (!dateCol || !amountCol) return [];

  const rows: ParsedRow[] = [];

  for (const row of result.data) {
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
