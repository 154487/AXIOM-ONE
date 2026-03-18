export function cleanDescription(raw: string): string {
  let s = raw.trim();

  // Remove PIX/TED/DOC codes with numbers
  s = s.replace(/\bPIX\s+\d+/gi, "");
  s = s.replace(/\bTED\s+\d+/gi, "");
  s = s.replace(/\bDOC\s+\d+/gi, "");

  // Remove common prefixes
  const prefixes = [
    "PIX ENVIADO",
    "PIX RECEBIDO",
    "TED ENVIADA",
    "TRANSFERENCIA ENVIADA",
    "PAGAMENTO BOLETO",
    "COMPRA CARTAO",
    "DEBITO AUTOMATICO",
  ];
  for (const prefix of prefixes) {
    const re = new RegExp(`^${prefix}\\s*`, "i");
    s = s.replace(re, "");
  }

  // Remove leading/trailing long digit sequences (e.g. bank codes)
  s = s.replace(/^\d{5,}\s*/g, "");
  s = s.replace(/\s*\d{5,}$/g, "");

  // Remove multiple spaces
  s = s.replace(/\s+/g, " ").trim();

  // Title-case
  s = s
    .toLowerCase()
    .replace(/(?:^|\s)\S/g, (char) => char.toUpperCase());

  // Max 50 chars
  if (s.length > 50) {
    s = s.slice(0, 50).trim();
  }

  return s;
}
