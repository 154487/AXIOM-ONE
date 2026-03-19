import {
  PrismaClient,
  TransactionType,
  AssetType,
  EntryType,
} from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ─── Helpers ──────────────────────────────────────────────────────────────────
const d = (year: number, month: number, day: number) =>
  new Date(year, month - 1, day);

type TxRow = {
  desc: string;
  amount: number;
  cat: string;
  day: number;
  type?: "INCOME" | "EXPENSE";
};

async function main() {
  console.log("🌱  Iniciando seed...");

  // ── 1. Usuário ───────────────────────────────────────────────────────────────
  const hash = await bcrypt.hash("axiom123", 10);
  const user = await prisma.user.upsert({
    where: { email: "test@axiom.com" },
    update: { name: "Carlos Silva" },
    create: { name: "Carlos Silva", email: "test@axiom.com", password: hash },
  });

  // ── 2. Limpar dados existentes ───────────────────────────────────────────────
  await prisma.asset.deleteMany({ where: { userId: user.id } }); // cascade entries
  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  await prisma.category.deleteMany({ where: { userId: user.id } });
  await prisma.userCurrency.deleteMany({ where: { userId: user.id } });
  console.log("   Dados anteriores removidos.");

  // ── 3. Moeda ─────────────────────────────────────────────────────────────────
  await prisma.userCurrency.create({
    data: { code: "BRL", symbol: "R$", name: "Real Brasileiro", isDefault: true, userId: user.id },
  });

  // ── 4. Categorias ────────────────────────────────────────────────────────────
  const catDefs = [
    { key: "salario",     name: "Salário",       color: "#10B981", icon: "trending-up"   },
    { key: "freelance",   name: "Freelance",      color: "#06B6D4", icon: "briefcase"     },
    { key: "moradia",     name: "Moradia",        color: "#FF6B35", icon: "home"          },
    { key: "alimentacao", name: "Alimentação",    color: "#F59E0B", icon: "shopping-cart" },
    { key: "transporte",  name: "Transporte",     color: "#64748B", icon: "bus"           },
    { key: "saude",       name: "Saúde",          color: "#EF4444", icon: "heart"         },
    { key: "lazer",       name: "Lazer",          color: "#A78BFA", icon: "tv"            },
    { key: "utilidades",  name: "Utilidades",     color: "#3B82F6", icon: "zap"           },
    { key: "educacao",    name: "Educação",       color: "#0EA5E9", icon: "book-open"     },
  ];
  const cat: Record<string, string> = {};
  for (const c of catDefs) {
    const created = await prisma.category.create({
      data: { name: c.name, color: c.color, icon: c.icon, userId: user.id },
    });
    cat[c.key] = created.id;
  }
  console.log(`   ${catDefs.length} categorias criadas.`);

  // ── 5. Transações — 13 meses (mar/25 → mar/26) ───────────────────────────────
  //
  //  Perfil: CLT, R$1.650/mês, divide kitnet (aluguel R$550),
  //          usa transporte público, faz freelance esporádico,
  //          investe R$210/mês (MXRF11 + BOVA11).
  //
  //  Estrutura mensal:
  //    Receita fixa:   R$1.650 (salário)
  //    Fixos:          aluguel 550 + ônibus 138 + internet 89.90 + Netflix 29.90 + Spotify 21.90
  //    Variáveis:      energia, supermercado, feira, iFood, farmácia, lazer, educação (esporádico)
  //    Meta de gasto:  R$1.230–1.380 → sobra R$270–420 → R$210 p/ investimento

  type MonthDef = {
    year: number; month: number; // mês calendário (1-based)
    extraIncome?: { desc: string; amount: number; cat: string; day: number }[];
    energia: number;
    super1: { desc: string; amount: number; day: number };
    super2: { desc: string; amount: number; day: number };
    feira: number;
    ifood: number;
    farmacia?: number;
    lazerExtra?: { desc: string; amount: number; day: number };
    educacao?: number;
  };

  const months: MonthDef[] = [
    // ── mar/25 ────────────────────────────────────────────────────────────────
    {
      year: 2025, month: 3,
      energia: 68.40,
      super1: { desc: "Supermercado Atacadão", amount: 187.50, day: 8 },
      super2: { desc: "Mercadinho do Bairro",  amount:  91.20, day: 22 },
      feira: 54.00, ifood: 32.90,
      farmacia: 42.80,
    },
    // ── abr/25 ────────────────────────────────────────────────────────────────
    {
      year: 2025, month: 4,
      extraIncome: [{ desc: "Freelance - site loja", amount: 280.00, cat: "freelance", day: 18 }],
      energia: 74.20,
      super1: { desc: "Supermercado BH",          amount: 196.30, day: 9 },
      super2: { desc: "Mercadinho do Bairro",      amount:  88.70, day: 24 },
      feira: 58.00, ifood: 44.50,
      lazerExtra: { desc: "Cinema - ingresso", amount: 32.00, day: 13 },
      educacao: 39.90,
    },
    // ── mai/25 ────────────────────────────────────────────────────────────────
    {
      year: 2025, month: 5,
      energia: 71.80,
      super1: { desc: "Supermercado Atacadão", amount: 182.00, day: 7 },
      super2: { desc: "Mercadinho do Bairro",  amount:  79.40, day: 20 },
      feira: 51.00, ifood: 28.40,
      farmacia: 25.90,
    },
    // ── jun/25 ────────────────────────────────────────────────────────────────
    {
      year: 2025, month: 6,
      energia: 65.10,
      super1: { desc: "Supermercado Extra",     amount: 201.80, day: 6 },
      super2: { desc: "Mercadinho do Bairro",   amount:  94.30, day: 21 },
      feira: 56.00, ifood: 37.80,
      educacao: 39.90,
    },
    // ── jul/25 ────────────────────────────────────────────────────────────────
    {
      year: 2025, month: 7,
      extraIncome: [{ desc: "Freelance - identidade visual", amount: 350.00, cat: "freelance", day: 22 }],
      energia: 63.50,
      super1: { desc: "Supermercado BH",        amount: 178.90, day: 5 },
      super2: { desc: "Mercadinho do Bairro",   amount:  85.60, day: 19 },
      feira: 49.00, ifood: 42.00,
      lazerExtra: { desc: "Churrasco com amigos - contribuição", amount: 45.00, day: 20 },
    },
    // ── ago/25 ────────────────────────────────────────────────────────────────
    {
      year: 2025, month: 8,
      energia: 78.90,
      super1: { desc: "Supermercado Atacadão", amount: 209.40, day: 10 },
      super2: { desc: "Mercadinho do Bairro",  amount:  97.80, day: 25 },
      feira: 60.00, ifood: 35.20,
      farmacia: 58.40,
      educacao: 39.90,
    },
    // ── set/25 ────────────────────────────────────────────────────────────────
    {
      year: 2025, month: 9,
      energia: 72.60,
      super1: { desc: "Supermercado Extra",    amount: 193.70, day: 6 },
      super2: { desc: "Mercadinho do Bairro",  amount:  86.40, day: 20 },
      feira: 53.00, ifood: 31.90,
    },
    // ── out/25 ────────────────────────────────────────────────────────────────
    {
      year: 2025, month: 10,
      energia: 69.80,
      super1: { desc: "Supermercado BH",       amount: 185.20, day: 8 },
      super2: { desc: "Mercadinho do Bairro",  amount:  92.50, day: 23 },
      feira: 57.00, ifood: 38.60,
      educacao: 39.90,
    },
    // ── nov/25 ─── (1ª parcela 13º = R$825) ─────────────────────────────────
    {
      year: 2025, month: 11,
      extraIncome: [
        { desc: "Freelance - app cardápio",      amount: 200.00, cat: "freelance", day: 20 },
        { desc: "13º salário - 1ª parcela",      amount: 825.00, cat: "salario",   day: 20 },
      ],
      energia: 76.30,
      super1: { desc: "Supermercado Atacadão", amount: 218.60, day: 9 },
      super2: { desc: "Mercadinho do Bairro",  amount: 104.30, day: 24 },
      feira: 62.00, ifood: 46.90,
      lazerExtra: { desc: "Presente amigo secreto", amount: 60.00, day: 28 },
      farmacia: 35.00,
    },
    // ── dez/25 ─── (2ª parcela 13º) ─────────────────────────────────────────
    {
      year: 2025, month: 12,
      extraIncome: [
        { desc: "13º salário - 2ª parcela", amount: 825.00, cat: "salario", day: 20 },
      ],
      energia: 82.50,
      super1: { desc: "Supermercado Extra",    amount: 243.80, day: 7 },
      super2: { desc: "Mercadinho do Bairro",  amount: 118.40, day: 22 },
      feira: 68.00, ifood: 55.30,
      lazerExtra: { desc: "Ceia de Natal - contribuição", amount: 80.00, day: 23 },
      farmacia: 29.90,
    },
    // ── jan/26 ────────────────────────────────────────────────────────────────
    {
      year: 2026, month: 1,
      energia: 88.20, // verão — ar condicionado
      super1: { desc: "Supermercado Atacadão", amount: 198.90, day: 8 },
      super2: { desc: "Mercadinho do Bairro",  amount:  93.40, day: 23 },
      feira: 55.00, ifood: 42.10,
      farmacia: 48.70, // início do ano — consulta
      educacao: 39.90,
    },
    // ── fev/26 ────────────────────────────────────────────────────────────────
    {
      year: 2026, month: 2,
      energia: 91.40, // verão ainda quente
      super1: { desc: "Supermercado BH",       amount: 191.60, day: 6 },
      super2: { desc: "Mercadinho do Bairro",  amount:  88.20, day: 20 },
      feira: 52.00, ifood: 38.70,
      lazerExtra: { desc: "Saída de carnaval", amount: 55.00, day: 3 },
    },
    // ── mar/26 ────────────────────────────────────────────────────────────────
    {
      year: 2026, month: 3,
      energia: 79.60,
      super1: { desc: "Supermercado Atacadão", amount: 204.30, day: 7 },
      super2: { desc: "Mercadinho do Bairro",  amount:  96.80, day: 21 },
      feira: 58.00, ifood: 34.20,
      educacao: 39.90,
    },
  ];

  const txRows: {
    description: string;
    amount: number;
    type: TransactionType;
    date: Date;
    categoryId: string;
    userId: string;
  }[] = [];

  for (const m of months) {
    const y = m.year;
    const mo = m.month;

    // Salário (todo dia 5)
    txRows.push({
      description: `Salário - ${mo.toString().padStart(2, "0")}/${String(y).slice(2)}`,
      amount: 1650.00,
      type: TransactionType.INCOME,
      date: d(y, mo, 5),
      categoryId: cat["salario"],
      userId: user.id,
    });

    // Renda extra (freelance, 13º etc.)
    for (const ei of m.extraIncome ?? []) {
      txRows.push({
        description: ei.desc,
        amount: ei.amount,
        type: TransactionType.INCOME,
        date: d(y, mo, ei.day),
        categoryId: cat[ei.cat],
        userId: user.id,
      });
    }

    // ── Fixos mensais ──────────────────────────────────────────────────────
    txRows.push({ description: `Aluguel ${mo.toString().padStart(2,"0")}/${String(y).slice(2)}`, amount: 550.00, type: TransactionType.EXPENSE, date: d(y, mo, 5),  categoryId: cat["moradia"],     userId: user.id });
    txRows.push({ description: "Passagem ônibus mensal",   amount: 138.00, type: TransactionType.EXPENSE, date: d(y, mo, 2),  categoryId: cat["transporte"],  userId: user.id });
    txRows.push({ description: "Internet Claro Fibra",     amount:  89.90, type: TransactionType.EXPENSE, date: d(y, mo, 10), categoryId: cat["utilidades"],  userId: user.id });
    txRows.push({ description: "Energia elétrica",         amount: m.energia, type: TransactionType.EXPENSE, date: d(y, mo, 15), categoryId: cat["utilidades"], userId: user.id });
    txRows.push({ description: "Água",                     amount:  35.00, type: TransactionType.EXPENSE, date: d(y, mo, 15), categoryId: cat["utilidades"],  userId: user.id });
    txRows.push({ description: "Netflix",                  amount:  29.90, type: TransactionType.EXPENSE, date: d(y, mo, 14), categoryId: cat["lazer"],       userId: user.id });
    txRows.push({ description: "Spotify",                  amount:  21.90, type: TransactionType.EXPENSE, date: d(y, mo, 14), categoryId: cat["lazer"],       userId: user.id });

    // ── Variáveis ─────────────────────────────────────────────────────────
    txRows.push({ description: m.super1.desc, amount: m.super1.amount, type: TransactionType.EXPENSE, date: d(y, mo, m.super1.day), categoryId: cat["alimentacao"], userId: user.id });
    txRows.push({ description: m.super2.desc, amount: m.super2.amount, type: TransactionType.EXPENSE, date: d(y, mo, m.super2.day), categoryId: cat["alimentacao"], userId: user.id });
    txRows.push({ description: "Feira livre",   amount: m.feira, type: TransactionType.EXPENSE, date: d(y, mo, Math.floor(mo % 2 === 0 ? 13 : 11)), categoryId: cat["alimentacao"], userId: user.id });
    txRows.push({ description: "iFood",         amount: m.ifood, type: TransactionType.EXPENSE, date: d(y, mo, 18),               categoryId: cat["alimentacao"], userId: user.id });

    if (m.farmacia) {
      txRows.push({ description: "Farmácia Droga Raia", amount: m.farmacia, type: TransactionType.EXPENSE, date: d(y, mo, 12), categoryId: cat["saude"], userId: user.id });
    }
    if (m.lazerExtra) {
      txRows.push({ description: m.lazerExtra.desc, amount: m.lazerExtra.amount, type: TransactionType.EXPENSE, date: d(y, mo, m.lazerExtra.day), categoryId: cat["lazer"], userId: user.id });
    }
    if (m.educacao) {
      txRows.push({ description: "Alura - assinatura", amount: m.educacao, type: TransactionType.EXPENSE, date: d(y, mo, 20), categoryId: cat["educacao"], userId: user.id });
    }
  }

  await prisma.transaction.createMany({ data: txRows });
  console.log(`   ${txRows.length} transações criadas (13 meses).`);

  // ── 6. Investimentos ─────────────────────────────────────────────────────────
  //
  //  MXRF11 (FII Maxi Renda): compra 10 cotas/mês ≈ R$100
  //  BOVA11 (ETF Ibovespa):   compra 1 cota/mês  ≈ R$110
  //  Total investido/mês: ≈ R$210
  //
  //  MXRF11 paga dividendos mensais (~R$0.095/cota), creditado no dia 15.

  const mxrf11 = await prisma.asset.create({
    data: {
      userId: user.id, ticker: "MXRF11", name: "Maxi Renda FII",
      type: AssetType.FII, currency: "BRL", currentPrice: 10.35,
    },
  });

  const bova11 = await prisma.asset.create({
    data: {
      userId: user.id, ticker: "BOVA11", name: "iShares Ibovespa ETF",
      type: AssetType.ETF, currency: "BRL", currentPrice: 118.90,
    },
  });

  console.log("   2 ativos criados: MXRF11 (FII), BOVA11 (ETF).");

  // MXRF11 — preços de compra por mês (mar/25 → mar/26)
  const mxrf11Prices = [
    9.87, 9.92, 10.05, 9.98, 10.12, 10.08, 10.20, 10.15, 10.22, 10.18, 10.25, 10.30, 10.35,
  ];
  // BOVA11 — preços de compra por mês
  const bova11Prices = [
    107.50, 104.20, 108.90, 111.30, 109.50, 113.20, 110.80, 108.60, 112.40, 115.80, 113.20, 116.50, 118.90,
  ];

  // Estrutura dos 13 meses na mesma ordem de `months`
  const investMonths = months.map((m) => ({ year: m.year, month: m.month }));

  const entryRows: Parameters<typeof prisma.investmentEntry.create>[0]["data"][] = [];

  let mxrf11Units = 0; // acumulado para calcular dividendo correto

  for (let i = 0; i < investMonths.length; i++) {
    const { year, month } = investMonths[i];
    const mxrfPrice = mxrf11Prices[i];
    const bovaPrice = bova11Prices[i];

    // Compra MXRF11 — dia 5 (junto com salário)
    entryRows.push({
      assetId: mxrf11.id, userId: user.id,
      type: EntryType.PURCHASE,
      date: d(year, month, 5),
      quantity: 10, price: mxrfPrice, amount: +(10 * mxrfPrice).toFixed(2),
      notes: `Compra mensal ${month.toString().padStart(2,"0")}/${String(year).slice(2)}`,
    });
    mxrf11Units += 10;

    // Compra BOVA11 — dia 5
    entryRows.push({
      assetId: bova11.id, userId: user.id,
      type: EntryType.PURCHASE,
      date: d(year, month, 5),
      quantity: 1, price: bovaPrice, amount: +bovaPrice.toFixed(2),
      notes: `Compra mensal ${month.toString().padStart(2,"0")}/${String(year).slice(2)}`,
    });

    // Dividendo MXRF11 — creditado no mês seguinte, dia 15
    // (começa em abr/25, com base nas cotas de mar/25)
    if (i < investMonths.length - 1) {
      const nextM = investMonths[i + 1];
      const dividendPerUnit = 0.095 + (i % 3 === 0 ? 0.005 : 0); // leve variação
      const dividendTotal = +(mxrf11Units * dividendPerUnit).toFixed(2);
      entryRows.push({
        assetId: mxrf11.id, userId: user.id,
        type: EntryType.DIVIDEND,
        date: d(nextM.year, nextM.month, 15),
        quantity: mxrf11Units, price: dividendPerUnit, amount: dividendTotal,
        notes: `Provento ref. ${month.toString().padStart(2,"0")}/${String(year).slice(2)}`,
      });
    }
  }

  for (const entry of entryRows) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.investmentEntry.create({ data: entry as any });
  }

  console.log(`   ${entryRows.length} lançamentos de investimento criados.`);
  console.log("");
  console.log("✅  Seed concluído!");
  console.log("──────────────────────────────────────────────────────────");
  console.log(`  Usuário    : test@axiom.com`);
  console.log(`  Senha      : axiom123`);
  console.log(`  Período    : mar/2025 → mar/2026 (13 meses)`);
  console.log(`  Renda      : R$1.650/mês + freelance esporádico + 13º`);
  console.log(`  Categorias : ${catDefs.length}`);
  console.log(`  Transações : ${txRows.length}`);
  console.log(`  Ativos     : MXRF11 (FII) · BOVA11 (ETF)`);
  console.log(`  Aportes    : ~R$210/mês · ${investMonths.length} meses`);
  console.log(`  Proventos  : ${investMonths.length - 1} pagamentos de dividendo MXRF11`);
  console.log("──────────────────────────────────────────────────────────");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
