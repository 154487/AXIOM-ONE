import * as XLSX from "xlsx";
import { randomUUID } from "crypto";
import { cleanDescription } from "./cleanDescription";
import type { ParsedRow } from "./types";

// Possible column names for each field (case-insensitive checked via normalization)
const DATE_CANDIDATES = [
  "RELEASE_DATE", "Data", "data", "DATE", "date",
  "Data Lançamento", "Data Compra", "Data Transação",
];
const AMOUNT_CANDIDATES = [
  "TRANSACTION_NET_AMOUNT", "Valor", "valor", "Amount", "amount",
  "Quantia", "Crédito", "Débito", "AMOUNT",
];
const DESCRIPTION_CANDIDATES = [
  "TRANSACTION_TYPE", "Histórico", "historico", "Descrição", "descricao",
  "Memo", "Description", "Nome", "DESCRIPTION", "MEMO",
];

function findCol(headers: string[], candidates: string[]): string | null {
  const headerLower = headers.map((h) => String(h).toLowerCase().trim());
  for (const candidate of candidates) {
    const idx = headerLower.indexOf(candidate.toLowerCase().trim());
    if (idx !== -1) return headers[idx];
  }
  return null;
}

/** Detect the header row index: the row that contains the most recognized column names */
function findHeaderRowIndex(rows: unknown[][]): number {
  const allCandidates = [...DATE_CANDIDATES, ...AMOUNT_CANDIDATES, ...DESCRIPTION_CANDIDATES].map(
    (c) => c.toLowerCase().trim()
  );

  let bestIdx = 0;
  let bestScore = 0;

  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i].map((c) => String(c ?? "").toLowerCase().trim());
    const score = row.filter((cell) => allCandidates.includes(cell)).length;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  return bestScore > 0 ? bestIdx : 0;
}

function parseBrazilianAmount(raw: string): number {
  let s = String(raw).trim();
  s = s.replace(/R\$\s*/g, "").trim();
  const negative = s.startsWith("-") || (s.startsWith("(") && s.endsWith(")"));
  s = s.replace(/[()]/g, "").replace(/^-/, "").trim();

  // Brazilian format: 1.234,56 → 1234.56
  if (s.includes(",")) {
    s = s.replace(/\./g, ""); // remove thousands separator
    s = s.replace(",", "."); // decimal separator
  }

  const value = parseFloat(s);
  if (isNaN(value) || value === 0) return 0;
  return negative ? -Math.abs(value) : value;
}

function parseDate(raw: string): string {
  const s = String(raw).trim();

  // DD-MM-YYYY (e.g. "02-02-2026")
  const dashDMY = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dashDMY) return `${dashDMY[3]}-${dashDMY[2]}-${dashDMY[1]}`;

  // DD/MM/YYYY (e.g. "02/02/2026")
  const slashDMY = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashDMY) return `${slashDMY[3]}-${slashDMY[2]}-${slashDMY[1]}`;

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  // Excel serial date (number stored as string)
  const serial = parseInt(s, 10);
  if (!isNaN(serial) && serial > 40000 && serial < 60000) {
    const date = XLSX.SSF.parse_date_code(serial);
    if (date) {
      const m = String(date.m).padStart(2, "0");
      const d = String(date.d).padStart(2, "0");
      return `${date.y}-${m}-${d}`;
    }
  }

  return s.slice(0, 10);
}

export function parseXLSX(buffer: Buffer): ParsedRow[] {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];

  const ws = wb.Sheets[sheetName];

  // Read as raw 2D array to handle multi-section files (summary + transactions)
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false });
  if (!rawRows.length) return [];

  // Find which row is the real header
  const headerRowIdx = findHeaderRowIndex(rawRows);
  const headerRow = rawRows[headerRowIdx].map((c) => String(c ?? "").trim());

  // Map headers to find our columns
  const dateCol = findCol(headerRow, DATE_CANDIDATES);
  const amountCol = findCol(headerRow, AMOUNT_CANDIDATES);
  const descCol = findCol(headerRow, DESCRIPTION_CANDIDATES);

  if (!dateCol || !amountCol) return [];

  const dateIdx = headerRow.indexOf(dateCol);
  const amountIdx = headerRow.indexOf(amountCol);
  const descIdx = descCol ? headerRow.indexOf(descCol) : -1;

  const rows: ParsedRow[] = [];

  for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
    const row = rawRows[i] as unknown[];
    if (!row || row.length === 0) continue;

    const rawDate = String(row[dateIdx] ?? "").trim();
    const rawAmount = String(row[amountIdx] ?? "").trim();
    const rawDesc = descIdx >= 0 ? String(row[descIdx] ?? "").trim() : "";

    if (!rawDate || !rawAmount) continue;

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
