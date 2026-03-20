/**
 * Lista de bancos/fintechs brasileiros com rendimento típico do produto de caixinha/conta remunerada.
 * Rendimentos expressos como % do CDI (≈ SELIC).
 * Valores aproximados com base em informações públicas divulgadas pelos bancos.
 * Sujeito a alteração — use como referência estimada.
 */

export interface BankInfo {
  id: string;
  name: string;
  product: string; // Nome do produto (NuConta, Reservas, etc.)
  cdiPct: number;  // % do CDI. Ex: 100 = 100% CDI. 0 = sem rendimento automático.
}

export const BRAZILIAN_BANKS: BankInfo[] = [
  // Fintechs com rendimento acima de 100% CDI
  { id: "sofisa",      name: "Sofisa Direto",   product: "CDB Diário",       cdiPct: 120 },
  { id: "mercadopago", name: "Mercado Pago",     product: "Reservas",         cdiPct: 105 },
  { id: "picpay",      name: "PicPay",           product: "Conta",            cdiPct: 102 },

  // 100% CDI — contas digitais
  { id: "nubank",  name: "Nubank",         product: "NuConta",       cdiPct: 100 },
  { id: "inter",   name: "Banco Inter",    product: "Conta Digital", cdiPct: 100 },
  { id: "c6",      name: "C6 Bank",        product: "Conta Digital", cdiPct: 100 },
  { id: "neon",    name: "Neon",           product: "Conta",         cdiPct: 100 },
  { id: "xp",      name: "XP",             product: "Conta XP",      cdiPct: 100 },
  { id: "btg",     name: "BTG Pactual",    product: "BTG+",          cdiPct: 100 },
  { id: "pagbank", name: "PagBank",        product: "Conta",         cdiPct: 100 },
  { id: "itau",    name: "Itaú",           product: "Iti",           cdiPct: 100 },
  { id: "bradesco",name: "Bradesco",       product: "Bitz",          cdiPct: 100 },

  // Poupança tradicional (~70% CDI quando SELIC > 8,5% a.a.)
  { id: "bb",        name: "Banco do Brasil",   product: "Poupança", cdiPct: 70 },
  { id: "caixa",     name: "Caixa Econômica",   product: "Poupança", cdiPct: 70 },
  { id: "santander", name: "Santander",          product: "Poupança", cdiPct: 70 },

  // Sem rendimento automático / personalizado
  { id: "outro", name: "Outro / Não informado", product: "", cdiPct: 0 },
];

export function getBankById(id: string): BankInfo | undefined {
  return BRAZILIAN_BANKS.find((b) => b.id === id);
}

/** Retorna a taxa anual efetiva com base no % CDI e na taxa CDI atual. */
export function effectiveAnnualYield(cdiPct: number, cdiAnual: number): number {
  return (cdiPct / 100) * (cdiAnual / 100);
}

/**
 * Calcula quantos meses até atingir a meta, considerando rendimento composto.
 * Retorna null se impossível em 50 anos ou se não há aporte/rendimento.
 */
export function monthsToReachGoal(
  savedAmount: number,
  targetAmount: number,
  monthlyContrib: number,
  annualYield: number // fração decimal, ex: 0.12 para 12% a.a.
): number | null {
  if (savedAmount >= targetAmount) return 0;
  if (monthlyContrib <= 0 && annualYield <= 0) return null;

  const monthlyRate = Math.pow(1 + annualYield, 1 / 12) - 1;

  if (monthlyRate <= 0) {
    // Sem rendimento — cálculo linear simples
    if (monthlyContrib <= 0) return null;
    return Math.ceil((targetAmount - savedAmount) / monthlyContrib);
  }

  let balance = savedAmount;
  for (let m = 1; m <= 600; m++) {
    balance = balance * (1 + monthlyRate) + monthlyContrib;
    if (balance >= targetAmount) return m;
  }
  return null; // não atinge em 50 anos
}
