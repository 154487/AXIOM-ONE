/**
 * Produtos bancários brasileiros com rendimento típico em % do CDI.
 * Cada banco pode ter múltiplos produtos (caixinha vs conta corrente).
 * Valores baseados em informações públicas — sujeito a alteração.
 */

export interface BankProductInfo {
  id: string;          // ID único armazenado no banco (ex: "nubank-caixinha")
  bankName: string;    // Nome do banco — usado para agrupamento no Select
  productName: string; // Nome do produto específico (ex: "Caixinha", "Conta Corrente")
  cdiPct: number;      // % do CDI. 0 = sem rendimento automático
}

export const BANK_PRODUCTS: BankProductInfo[] = [
  // Sofisa Direto — só CDB diário (maior rendimento do mercado)
  { id: "sofisa-cdb",            bankName: "Sofisa Direto",   productName: "CDB Diário",                cdiPct: 120 },

  // Mercado Pago
  { id: "mercadopago-reservas",  bankName: "Mercado Pago",    productName: "Reservas (Caixinha)",        cdiPct: 105 },
  { id: "mercadopago-cc",        bankName: "Mercado Pago",    productName: "Conta Corrente",             cdiPct: 0   },

  // PicPay
  { id: "picpay-rendimentos",    bankName: "PicPay",          productName: "Rendimentos (Caixinha)",     cdiPct: 102 },
  { id: "picpay-cc",             bankName: "PicPay",          productName: "Conta Corrente",             cdiPct: 0   },

  // Nubank
  { id: "nubank-caixinha",       bankName: "Nubank",          productName: "Caixinha",                   cdiPct: 100 },
  { id: "nubank-cc",             bankName: "Nubank",          productName: "Conta Corrente",             cdiPct: 0   },

  // Banco Inter
  { id: "inter-turbo",           bankName: "Banco Inter",     productName: "Conta Turbo (Caixinha)",     cdiPct: 100 },
  { id: "inter-cc",              bankName: "Banco Inter",     productName: "Conta Corrente",             cdiPct: 0   },

  // C6 Bank (saldo em conta já rende automaticamente)
  { id: "c6-conta",              bankName: "C6 Bank",         productName: "Conta (rende automaticamente)", cdiPct: 100 },

  // Neon
  { id: "neon-caixinha",         bankName: "Neon",            productName: "Caixinha",                   cdiPct: 100 },
  { id: "neon-cc",               bankName: "Neon",            productName: "Conta Corrente",             cdiPct: 0   },

  // XP
  { id: "xp-conta",              bankName: "XP",              productName: "Conta XP",                   cdiPct: 100 },

  // BTG Pactual
  { id: "btg-conta",             bankName: "BTG Pactual",     productName: "BTG+",                       cdiPct: 100 },

  // PagBank
  { id: "pagbank-conta",         bankName: "PagBank",         productName: "Conta",                      cdiPct: 100 },

  // Itaú
  { id: "itau-iti",              bankName: "Itaú",            productName: "Iti (Caixinha)",              cdiPct: 100 },
  { id: "itau-cc",               bankName: "Itaú",            productName: "Conta Corrente",             cdiPct: 0   },

  // Bradesco
  { id: "bradesco-bitz",         bankName: "Bradesco",        productName: "Bitz (Caixinha)",             cdiPct: 100 },
  { id: "bradesco-cc",           bankName: "Bradesco",        productName: "Conta Corrente",             cdiPct: 0   },

  // Santander
  { id: "santander-poupanca",    bankName: "Santander",       productName: "Poupança",                   cdiPct: 70  },
  { id: "santander-cc",          bankName: "Santander",       productName: "Conta Corrente",             cdiPct: 0   },

  // Banco do Brasil
  { id: "bb-poupanca",           bankName: "Banco do Brasil", productName: "Poupança",                   cdiPct: 70  },
  { id: "bb-cc",                 bankName: "Banco do Brasil", productName: "Conta Corrente",             cdiPct: 0   },

  // Caixa Econômica
  { id: "caixa-poupanca",        bankName: "Caixa Econômica", productName: "Poupança",                   cdiPct: 70  },
  { id: "caixa-cc",              bankName: "Caixa Econômica", productName: "Conta Corrente",             cdiPct: 0   },

  // Sicoob / Sicredi
  { id: "sicoob-conta",          bankName: "Sicoob",          productName: "Conta",                      cdiPct: 100 },

  // Outro
  { id: "outro",                 bankName: "Outro",           productName: "Outro / Não informado",      cdiPct: 0   },
];

/** Agrupa produtos por banco para exibição no Select. */
export function getBankGroups(): { bankName: string; products: BankProductInfo[] }[] {
  const map = new Map<string, BankProductInfo[]>();
  for (const p of BANK_PRODUCTS) {
    if (!map.has(p.bankName)) map.set(p.bankName, []);
    map.get(p.bankName)!.push(p);
  }
  return Array.from(map.entries()).map(([bankName, products]) => ({ bankName, products }));
}

export function getBankProductById(id: string): BankProductInfo | undefined {
  return BANK_PRODUCTS.find((p) => p.id === id);
}

/** Retorna a taxa anual efetiva como fração decimal (ex: 0.1365 para 13.65% a.a.). */
export function effectiveAnnualYield(cdiPct: number, cdiAnual: number): number {
  return (cdiPct / 100) * (cdiAnual / 100);
}

/**
 * Calcula meses até atingir a meta com juros compostos.
 * Retorna null se impossível em 50 anos.
 */
export function monthsToReachGoal(
  savedAmount: number,
  targetAmount: number,
  monthlyContrib: number,
  annualYield: number // fração decimal, ex: 0.12
): number | null {
  if (savedAmount >= targetAmount) return 0;
  if (monthlyContrib <= 0 && annualYield <= 0) return null;

  const monthlyRate = Math.pow(1 + annualYield, 1 / 12) - 1;

  if (monthlyRate <= 0) {
    if (monthlyContrib <= 0) return null;
    return Math.ceil((targetAmount - savedAmount) / monthlyContrib);
  }

  let balance = savedAmount;
  for (let m = 1; m <= 600; m++) {
    balance = balance * (1 + monthlyRate) + monthlyContrib;
    if (balance >= targetAmount) return m;
  }
  return null;
}
