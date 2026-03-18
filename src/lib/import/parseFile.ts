import { parseOFX } from "./parseOFX";
import { parseCSV } from "./parseCSV";
import { parseXLSX } from "./parseXLSX";
import type { ParsedRow } from "./types";

export async function parseFile(buffer: Buffer, filename: string): Promise<ParsedRow[]> {
  const ext = filename.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "ofx":
      return parseOFX(buffer.toString("utf-8"));
    case "csv":
      return parseCSV(buffer.toString("utf-8"));
    case "xlsx":
    case "xls":
      return parseXLSX(buffer);
    default:
      throw new Error(`Formato não suportado: .${ext}. Use OFX, CSV ou XLSX.`);
  }
}
