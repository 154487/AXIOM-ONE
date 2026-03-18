import { randomUUID } from "crypto";
import { cleanDescription } from "./cleanDescription";
import type { ParsedRow } from "./types";

function parseOFXDate(raw: string): string {
  // Format: YYYYMMDDHHMMSS or YYYYMMDD
  const d = raw.slice(0, 8);
  const year = d.slice(0, 4);
  const month = d.slice(4, 6);
  const day = d.slice(6, 8);
  return `${year}-${month}-${day}`;
}

export function parseOFX(text: string): ParsedRow[] {
  const rows: ParsedRow[] = [];

  // Split on STMTTRN blocks
  const blocks = text.split(/<STMTTRN>/i);
  // First block is header, skip it
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];

    const dateMatch = block.match(/<DTPOSTED>(\d+)/i);
    const amountMatch = block.match(/<TRNAMT>([-\d.]+)/i);
    const memoMatch = block.match(/<MEMO>([^<]+)/i);
    const nameMatch = block.match(/<NAME>([^<]+)/i);

    if (!dateMatch || !amountMatch) continue;

    const rawAmount = parseFloat(amountMatch[1]);
    if (isNaN(rawAmount) || rawAmount === 0) continue;

    const rawDescription = (memoMatch?.[1] ?? nameMatch?.[1] ?? "").trim();

    rows.push({
      id: randomUUID(),
      date: parseOFXDate(dateMatch[1]),
      rawDescription,
      cleanDescription: cleanDescription(rawDescription),
      amount: Math.abs(rawAmount),
      type: rawAmount < 0 ? "EXPENSE" : "INCOME",
    });
  }

  return rows;
}
