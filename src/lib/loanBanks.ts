export interface LoanBankInfo {
  id: string;
  bankName: string;
  productName: string;
  typicalRatePct: number;
  rateFrequency: "MONTHLY" | "ANNUAL";
}

export const LOAN_BANKS: LoanBankInfo[] = [
  // Crédito Pessoal
  { id: "caixa-pessoal",    bankName: "Caixa Econômica", productName: "Crédito Pessoal",    typicalRatePct: 2.2,  rateFrequency: "MONTHLY" },
  { id: "bb-pessoal",       bankName: "Banco do Brasil", productName: "Crédito Pessoal",    typicalRatePct: 2.8,  rateFrequency: "MONTHLY" },
  { id: "itau-pessoal",     bankName: "Itaú",            productName: "Crédito Pessoal",    typicalRatePct: 3.0,  rateFrequency: "MONTHLY" },
  { id: "bradesco-pessoal", bankName: "Bradesco",        productName: "Crédito Pessoal",    typicalRatePct: 3.2,  rateFrequency: "MONTHLY" },
  { id: "santander-pessoal",bankName: "Santander",       productName: "Crédito Pessoal",    typicalRatePct: 3.0,  rateFrequency: "MONTHLY" },
  { id: "nubank-pessoal",   bankName: "Nubank",          productName: "Crédito Pessoal",    typicalRatePct: 3.5,  rateFrequency: "MONTHLY" },
  { id: "picpay-pessoal",   bankName: "PicPay",          productName: "Crédito Pessoal",    typicalRatePct: 3.0,  rateFrequency: "MONTHLY" },
  // Consignado
  { id: "caixa-consig",     bankName: "Caixa Econômica", productName: "Consignado",         typicalRatePct: 1.8,  rateFrequency: "MONTHLY" },
  { id: "bmg-consig",       bankName: "Banco BMG",       productName: "Consignado",         typicalRatePct: 1.9,  rateFrequency: "MONTHLY" },
  { id: "creditas-consig",  bankName: "Creditas",        productName: "Consignado/Garantia",typicalRatePct: 1.5,  rateFrequency: "MONTHLY" },
  // Financiamento Imobiliário
  { id: "caixa-imovel",     bankName: "Caixa Econômica", productName: "Financ. Imobiliário",typicalRatePct: 10.5, rateFrequency: "ANNUAL"  },
  { id: "bb-imovel",        bankName: "Banco do Brasil", productName: "Financ. Imobiliário",typicalRatePct: 10.8, rateFrequency: "ANNUAL"  },
  { id: "itau-imovel",      bankName: "Itaú",            productName: "Financ. Imobiliário",typicalRatePct: 10.9, rateFrequency: "ANNUAL"  },
  { id: "bradesco-imovel",  bankName: "Bradesco",        productName: "Financ. Imobiliário",typicalRatePct: 10.8, rateFrequency: "ANNUAL"  },
  // Financiamento Veicular
  { id: "caixa-veiculo",    bankName: "Caixa Econômica", productName: "Financ. Veicular",   typicalRatePct: 1.6,  rateFrequency: "MONTHLY" },
  { id: "bb-veiculo",       bankName: "Banco do Brasil", productName: "Financ. Veicular",   typicalRatePct: 1.8,  rateFrequency: "MONTHLY" },
  { id: "itau-veiculo",     bankName: "Itaú",            productName: "Financ. Veicular",   typicalRatePct: 1.9,  rateFrequency: "MONTHLY" },
  { id: "santander-veiculo",bankName: "Santander",       productName: "Financ. Veicular",   typicalRatePct: 1.8,  rateFrequency: "MONTHLY" },
  { id: "outro-emprestimo", bankName: "Outro banco",     productName: "Empréstimo",         typicalRatePct: 0,    rateFrequency: "MONTHLY" },
];

export function getLoanBankGroups(): { productType: string; banks: LoanBankInfo[] }[] {
  const groups: Record<string, LoanBankInfo[]> = {};
  for (const bank of LOAN_BANKS) {
    if (!groups[bank.productName]) groups[bank.productName] = [];
    groups[bank.productName].push(bank);
  }
  return Object.entries(groups).map(([productType, banks]) => ({ productType, banks }));
}

export function getLoanBankById(id: string): LoanBankInfo | undefined {
  return LOAN_BANKS.find((b) => b.id === id);
}
