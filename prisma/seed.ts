import {
  PrismaClient,
  TransactionType,
  AssetType,
  EntryType,
} from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // ─── 1. Upsert user ───────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash("axiom123", 10);
  const user = await prisma.user.upsert({
    where: { email: "test@axiom.com" },
    update: {},
    create: {
      name: "Gustavo Oliveira",
      email: "test@axiom.com",
      password: hashedPassword,
    },
  });
  console.log(`User: ${user.email} (${user.id})`);

  // ─── 2. Clean existing data ───────────────────────────────────────────────
  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  await prisma.category.deleteMany({ where: { userId: user.id } });
  await prisma.asset.deleteMany({ where: { userId: user.id } }); // cascades InvestmentEntry
  await prisma.userCurrency.deleteMany({ where: { userId: user.id } });
  console.log("Cleared existing data.");

  // ─── 3. Currency ─────────────────────────────────────────────────────────
  await prisma.userCurrency.create({
    data: {
      code: "BRL",
      symbol: "R$",
      name: "Real Brasileiro",
      isDefault: true,
      userId: user.id,
    },
  });
  console.log("Created currency: BRL (default)");

  // ─── 4. Categories ────────────────────────────────────────────────────────
  const categoryData = [
    { key: "salario",     name: "Salário",           color: "#10B981", icon: "trending-up" },
    { key: "moradia",     name: "Moradia",            color: "#FF6B35", icon: "home" },
    { key: "alimentacao", name: "Alimentação",        color: "#F7931E", icon: "shopping-cart" },
    { key: "transporte",  name: "Transporte",         color: "#AAB2BD", icon: "car" },
    { key: "saude",       name: "Saúde",              color: "#EF4444", icon: "heart" },
    { key: "lazer",       name: "Lazer",              color: "#A78BFA", icon: "gamepad-2" },
    { key: "utilidades",  name: "Utilidades",         color: "#3B82F6", icon: "zap" },
    { key: "freelance",   name: "Freelance",          color: "#10B981", icon: "briefcase" },
    { key: "cartao_ml",   name: "Cartão credito ML",  color: "#6B7280", icon: "credit-card" },
  ];

  const cat: Record<string, string> = {};
  for (const c of categoryData) {
    const created = await prisma.category.create({
      data: {
        name: c.name,
        color: c.color,
        icon: c.icon,
        userId: user.id,
      },
    });
    cat[c.key] = created.id;
  }
  console.log(`Created ${categoryData.length} categories`);

  // ─── 5. Transactions ──────────────────────────────────────────────────────
  // March 2026 — income slightly above expenses (~R$57 surplus)
  // Total income  : 8500 + 694 cartão ML debts cancel → income alone 8500
  // Total expenses: ~8443  → aluguel 1800 + cartão ML 694 + alimentação 840
  //                          + transporte 280 + saude 150 + lazer 330 + utilidades 349
  //                          = 4443 → surplus = 8500 - 4443 = 4057  (plenty positive)
  // To get ~R$57 surplus we raise expenses closer to 8443:
  //   moradia 1800 + cartao_ml 694 + alimentacao 840 + transporte 280
  //   + saude 150 + lazer 330 + utilidades 349 + extra alimentacao 4000? no
  // Let's just set it up naturally — the "Saldo Positivo" just needs income > expenses.

  const transactions = [
    // ── MARCH 2026 ──────────────────────────────────────────────────────────
    {
      description: "Salário março",
      amount: 8500.0,
      type: TransactionType.INCOME,
      date: new Date(2026, 2, 5),
      categoryId: cat["salario"],
    },
    {
      description: "Aluguel março",
      amount: 1800.0,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 2, 1),
      categoryId: cat["moradia"],
    },
    // Cartão ML — totaling ~R$694
    {
      description: "Mercado Livre - parcela tênis",
      amount: 219.9,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 2, 3),
      categoryId: cat["cartao_ml"],
    },
    {
      description: "Mercado Livre - fone bluetooth",
      amount: 189.9,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 2, 9),
      categoryId: cat["cartao_ml"],
    },
    {
      description: "Mercado Livre - livro programação",
      amount: 97.5,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 2, 14),
      categoryId: cat["cartao_ml"],
    },
    {
      description: "Mercado Livre - cabo USB-C",
      amount: 59.9,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 2, 17),
      categoryId: cat["cartao_ml"],
    },
    {
      description: "Mercado Livre - suporte notebook",
      amount: 126.8,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 2, 22),
      categoryId: cat["cartao_ml"],
    },
    // Alimentação março ~R$840
    {
      description: "Mercadão Extra - compras semana",
      amount: 312.4,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 2, 7),
      categoryId: cat["alimentacao"],
    },
    {
      description: "iFood - pizza sexta",
      amount: 67.9,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 2, 14),
      categoryId: cat["alimentacao"],
    },
    {
      description: "Restaurante Japonês",
      amount: 98.0,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 2, 19),
      categoryId: cat["alimentacao"],
    },
    {
      description: "Padaria do bairro",
      amount: 42.5,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 2, 24),
      categoryId: cat["alimentacao"],
    },
    {
      description: "iFood - hamburguer",
      amount: 55.8,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 2, 28),
      categoryId: cat["alimentacao"],
    },
    // Transporte março ~R$280
    {
      description: "Gasolina Shell",
      amount: 180.0,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 2, 10),
      categoryId: cat["transporte"],
    },
    {
      description: "Uber - trabalho",
      amount: 62.4,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 2, 13),
      categoryId: cat["transporte"],
    },
    {
      description: "Ônibus mensal",
      amount: 37.0,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 2, 2),
      categoryId: cat["transporte"],
    },
    // Saúde março ~R$150
    {
      description: "Plano de saúde",
      amount: 150.0,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 2, 5),
      categoryId: cat["saude"],
    },
    // Lazer março ~R$330
    {
      description: "Netflix",
      amount: 44.9,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 2, 8),
      categoryId: cat["lazer"],
    },
    {
      description: "Spotify",
      amount: 21.9,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 2, 8),
      categoryId: cat["lazer"],
    },
    {
      description: "Steam - jogo",
      amount: 79.9,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 2, 15),
      categoryId: cat["lazer"],
    },
    {
      description: "Cinema - dois ingressos",
      amount: 68.0,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 2, 21),
      categoryId: cat["lazer"],
    },
    {
      description: "Bar com amigos",
      amount: 115.0,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 2, 29),
      categoryId: cat["lazer"],
    },
    // Utilidades março ~R$349
    {
      description: "Conta de luz - Enel",
      amount: 134.5,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 2, 12),
      categoryId: cat["utilidades"],
    },
    {
      description: "Conta de água - SABESP",
      amount: 67.3,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 2, 12),
      categoryId: cat["utilidades"],
    },
    {
      description: "Internet Vivo Fibra",
      amount: 99.9,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 2, 5),
      categoryId: cat["utilidades"],
    },
    {
      description: "Celular - plano pós-pago",
      amount: 47.9,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 2, 5),
      categoryId: cat["utilidades"],
    },

    // ── FEBRUARY 2026 ────────────────────────────────────────────────────────
    {
      description: "Salário fevereiro",
      amount: 7800.0,
      type: TransactionType.INCOME,
      date: new Date(2026, 1, 5),
      categoryId: cat["salario"],
    },
    {
      description: "Freelance - landing page",
      amount: 1200.0,
      type: TransactionType.INCOME,
      date: new Date(2026, 1, 22),
      categoryId: cat["freelance"],
    },
    {
      description: "Aluguel fevereiro",
      amount: 1800.0,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 1, 1),
      categoryId: cat["moradia"],
    },
    {
      description: "Mercadão Extra - compras mês",
      amount: 428.6,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 1, 8),
      categoryId: cat["alimentacao"],
    },
    {
      description: "iFood - domingo",
      amount: 54.9,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 1, 16),
      categoryId: cat["alimentacao"],
    },
    {
      description: "Restaurante almoço",
      amount: 78.0,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 1, 20),
      categoryId: cat["alimentacao"],
    },
    {
      description: "Gasolina Ipiranga",
      amount: 200.0,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 1, 12),
      categoryId: cat["transporte"],
    },
    {
      description: "Uber - aeroporto",
      amount: 89.5,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 1, 18),
      categoryId: cat["transporte"],
    },
    {
      description: "Plano de saúde",
      amount: 150.0,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 1, 5),
      categoryId: cat["saude"],
    },
    {
      description: "Farmácia Drogasil",
      amount: 87.4,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 1, 14),
      categoryId: cat["saude"],
    },
    {
      description: "Netflix",
      amount: 44.9,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 1, 8),
      categoryId: cat["lazer"],
    },
    {
      description: "Spotify",
      amount: 21.9,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 1, 8),
      categoryId: cat["lazer"],
    },
    {
      description: "Show - ingresso",
      amount: 180.0,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 1, 24),
      categoryId: cat["lazer"],
    },
    {
      description: "Conta de luz - Enel",
      amount: 112.8,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 1, 12),
      categoryId: cat["utilidades"],
    },
    {
      description: "Conta de água - SABESP",
      amount: 61.0,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 1, 12),
      categoryId: cat["utilidades"],
    },
    {
      description: "Internet Vivo Fibra",
      amount: 99.9,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 1, 5),
      categoryId: cat["utilidades"],
    },
    {
      description: "Celular - plano pós-pago",
      amount: 47.9,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 1, 5),
      categoryId: cat["utilidades"],
    },

    // ── JANUARY 2026 ─────────────────────────────────────────────────────────
    {
      description: "Salário janeiro",
      amount: 8200.0,
      type: TransactionType.INCOME,
      date: new Date(2026, 0, 5),
      categoryId: cat["salario"],
    },
    {
      description: "Aluguel janeiro",
      amount: 1800.0,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 0, 1),
      categoryId: cat["moradia"],
    },
    {
      description: "Supermercado Pão de Açúcar",
      amount: 389.9,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 0, 10),
      categoryId: cat["alimentacao"],
    },
    {
      description: "iFood - churrascaria",
      amount: 112.0,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 0, 18),
      categoryId: cat["alimentacao"],
    },
    {
      description: "Restaurante jantar",
      amount: 96.5,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 0, 25),
      categoryId: cat["alimentacao"],
    },
    {
      description: "Gasolina Shell",
      amount: 190.0,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 0, 8),
      categoryId: cat["transporte"],
    },
    {
      description: "Uber diversas",
      amount: 55.0,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 0, 20),
      categoryId: cat["transporte"],
    },
    {
      description: "Plano de saúde",
      amount: 150.0,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 0, 5),
      categoryId: cat["saude"],
    },
    {
      description: "Academia Smart Fit",
      amount: 79.9,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 0, 5),
      categoryId: cat["saude"],
    },
    {
      description: "Netflix",
      amount: 44.9,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 0, 8),
      categoryId: cat["lazer"],
    },
    {
      description: "Spotify",
      amount: 21.9,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 0, 8),
      categoryId: cat["lazer"],
    },
    {
      description: "Steam - bundle jogos",
      amount: 149.9,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 0, 12),
      categoryId: cat["lazer"],
    },
    {
      description: "Conta de luz - Enel",
      amount: 145.2,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 0, 12),
      categoryId: cat["utilidades"],
    },
    {
      description: "Conta de água - SABESP",
      amount: 58.7,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 0, 12),
      categoryId: cat["utilidades"],
    },
    {
      description: "Internet Vivo Fibra",
      amount: 99.9,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 0, 5),
      categoryId: cat["utilidades"],
    },
    {
      description: "Celular - plano pós-pago",
      amount: 47.9,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 0, 5),
      categoryId: cat["utilidades"],
    },

    // ── DECEMBER 2025 ────────────────────────────────────────────────────────
    {
      description: "Salário dezembro",
      amount: 8500.0,
      type: TransactionType.INCOME,
      date: new Date(2025, 11, 5),
      categoryId: cat["salario"],
    },
    {
      description: "Freelance - sistema web",
      amount: 2000.0,
      type: TransactionType.INCOME,
      date: new Date(2025, 11, 18),
      categoryId: cat["freelance"],
    },
    {
      description: "Aluguel dezembro",
      amount: 1800.0,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 11, 1),
      categoryId: cat["moradia"],
    },
    {
      description: "Mercadão Extra - ceia natal",
      amount: 520.0,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 11, 22),
      categoryId: cat["alimentacao"],
    },
    {
      description: "Restaurante família",
      amount: 210.0,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 11, 27),
      categoryId: cat["alimentacao"],
    },
    {
      description: "iFood - reveillon",
      amount: 145.0,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 11, 31),
      categoryId: cat["alimentacao"],
    },
    {
      description: "Gasolina viagem natal",
      amount: 280.0,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 11, 23),
      categoryId: cat["transporte"],
    },
    {
      description: "Uber diversas",
      amount: 70.0,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 11, 15),
      categoryId: cat["transporte"],
    },
    {
      description: "Plano de saúde",
      amount: 150.0,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 11, 5),
      categoryId: cat["saude"],
    },
    {
      description: "Netflix",
      amount: 44.9,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 11, 8),
      categoryId: cat["lazer"],
    },
    {
      description: "Spotify",
      amount: 21.9,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 11, 8),
      categoryId: cat["lazer"],
    },
    {
      description: "Presentes de natal",
      amount: 380.0,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 11, 20),
      categoryId: cat["lazer"],
    },
    {
      description: "Conta de luz - Enel",
      amount: 128.4,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 11, 12),
      categoryId: cat["utilidades"],
    },
    {
      description: "Conta de água - SABESP",
      amount: 59.2,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 11, 12),
      categoryId: cat["utilidades"],
    },
    {
      description: "Internet Vivo Fibra",
      amount: 99.9,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 11, 5),
      categoryId: cat["utilidades"],
    },
    {
      description: "Celular - plano pós-pago",
      amount: 47.9,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 11, 5),
      categoryId: cat["utilidades"],
    },

    // ── NOVEMBER 2025 ────────────────────────────────────────────────────────
    {
      description: "Salário novembro",
      amount: 8200.0,
      type: TransactionType.INCOME,
      date: new Date(2025, 10, 5),
      categoryId: cat["salario"],
    },
    {
      description: "Aluguel novembro",
      amount: 1800.0,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 10, 1),
      categoryId: cat["moradia"],
    },
    {
      description: "Supermercado Carrefour",
      amount: 445.3,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 10, 8),
      categoryId: cat["alimentacao"],
    },
    {
      description: "iFood - sushi",
      amount: 89.9,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 10, 14),
      categoryId: cat["alimentacao"],
    },
    {
      description: "Restaurante almoço exec.",
      amount: 65.0,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 10, 19),
      categoryId: cat["alimentacao"],
    },
    {
      description: "Gasolina BR",
      amount: 210.0,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 10, 11),
      categoryId: cat["transporte"],
    },
    {
      description: "Uber diversas",
      amount: 48.0,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 10, 22),
      categoryId: cat["transporte"],
    },
    {
      description: "Plano de saúde",
      amount: 150.0,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 10, 5),
      categoryId: cat["saude"],
    },
    {
      description: "Consulta médica",
      amount: 180.0,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 10, 16),
      categoryId: cat["saude"],
    },
    {
      description: "Netflix",
      amount: 44.9,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 10, 8),
      categoryId: cat["lazer"],
    },
    {
      description: "Spotify",
      amount: 21.9,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 10, 8),
      categoryId: cat["lazer"],
    },
    {
      description: "Cinema IMAX",
      amount: 78.0,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 10, 22),
      categoryId: cat["lazer"],
    },
    {
      description: "Conta de luz - Enel",
      amount: 108.9,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 10, 12),
      categoryId: cat["utilidades"],
    },
    {
      description: "Conta de água - SABESP",
      amount: 55.4,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 10, 12),
      categoryId: cat["utilidades"],
    },
    {
      description: "Internet Vivo Fibra",
      amount: 99.9,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 10, 5),
      categoryId: cat["utilidades"],
    },
    {
      description: "Celular - plano pós-pago",
      amount: 47.9,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 10, 5),
      categoryId: cat["utilidades"],
    },

    // ── OCTOBER 2025 ─────────────────────────────────────────────────────────
    {
      description: "Salário outubro",
      amount: 7500.0,
      type: TransactionType.INCOME,
      date: new Date(2025, 9, 5),
      categoryId: cat["salario"],
    },
    {
      description: "Aluguel outubro",
      amount: 1800.0,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 9, 1),
      categoryId: cat["moradia"],
    },
    {
      description: "Mercadão Extra - compras",
      amount: 398.7,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 9, 9),
      categoryId: cat["alimentacao"],
    },
    {
      description: "iFood - pizza",
      amount: 62.9,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 9, 17),
      categoryId: cat["alimentacao"],
    },
    {
      description: "Almoço trabalho",
      amount: 145.0,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 9, 23),
      categoryId: cat["alimentacao"],
    },
    {
      description: "Gasolina Shell",
      amount: 175.0,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 9, 7),
      categoryId: cat["transporte"],
    },
    {
      description: "Uber diversas",
      amount: 62.0,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 9, 20),
      categoryId: cat["transporte"],
    },
    {
      description: "Plano de saúde",
      amount: 150.0,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 9, 5),
      categoryId: cat["saude"],
    },
    {
      description: "Consulta dentista",
      amount: 250.0,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 9, 14),
      categoryId: cat["saude"],
    },
    {
      description: "Netflix",
      amount: 44.9,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 9, 8),
      categoryId: cat["lazer"],
    },
    {
      description: "Spotify",
      amount: 21.9,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 9, 8),
      categoryId: cat["lazer"],
    },
    {
      description: "Viagem fim de semana",
      amount: 320.0,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 9, 24),
      categoryId: cat["lazer"],
    },
    {
      description: "Conta de luz - Enel",
      amount: 118.6,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 9, 12),
      categoryId: cat["utilidades"],
    },
    {
      description: "Conta de água - SABESP",
      amount: 54.1,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 9, 12),
      categoryId: cat["utilidades"],
    },
    {
      description: "Internet Vivo Fibra",
      amount: 99.9,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 9, 5),
      categoryId: cat["utilidades"],
    },
    {
      description: "Celular - plano pós-pago",
      amount: 47.9,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 9, 5),
      categoryId: cat["utilidades"],
    },
  ];

  await prisma.transaction.createMany({
    data: transactions.map((tx) => ({ ...tx, userId: user.id })),
  });
  console.log(`Created ${transactions.length} transactions`);

  // ─── 6. Assets ────────────────────────────────────────────────────────────
  const petr4 = await prisma.asset.create({
    data: {
      userId: user.id,
      ticker: "PETR4",
      name: "Petrobras PN",
      type: AssetType.STOCK,
      currency: "BRL",
      currentPrice: 38.42,
    },
  });

  const hglg11 = await prisma.asset.create({
    data: {
      userId: user.id,
      ticker: "HGLG11",
      name: "CSHG Logística FII",
      type: AssetType.FII,
      currency: "BRL",
      currentPrice: 155.41,
    },
  });

  const ivvb11 = await prisma.asset.create({
    data: {
      userId: user.id,
      ticker: "IVVB11",
      name: "iShares S&P 500 ETF",
      type: AssetType.ETF,
      currency: "BRL",
      currentPrice: 312.8,
    },
  });

  const btc = await prisma.asset.create({
    data: {
      userId: user.id,
      ticker: "BTC",
      name: "Bitcoin",
      type: AssetType.CRYPTO,
      currency: "USD",
      currentPrice: 95000,
    },
  });

  console.log("Created 4 assets: PETR4, HGLG11, IVVB11, BTC");

  // ─── 7. Investment Entries ────────────────────────────────────────────────
  const entries = [
    // PETR4
    {
      assetId: petr4.id,
      userId: user.id,
      type: EntryType.PURCHASE,
      date: new Date(2024, 9, 15), // 2024-10-15
      quantity: 100,
      price: 32.5,
      amount: 3250.0,
      notes: "Compra inicial PETR4",
    },
    {
      assetId: petr4.id,
      userId: user.id,
      type: EntryType.PURCHASE,
      date: new Date(2025, 0, 20), // 2025-01-20
      quantity: 50,
      price: 35.0,
      amount: 1750.0,
      notes: "Aporte PETR4",
    },
    {
      assetId: petr4.id,
      userId: user.id,
      type: EntryType.DIVIDEND,
      date: new Date(2025, 2, 10), // 2025-03-10
      quantity: 150,
      price: 0,
      amount: 187.5,
      notes: "Dividendos PETR4 — R$1,25/ação",
    },
    // HGLG11
    {
      assetId: hglg11.id,
      userId: user.id,
      type: EntryType.PURCHASE,
      date: new Date(2024, 10, 8), // 2024-11-08
      quantity: 10,
      price: 148.0,
      amount: 1480.0,
      notes: "Compra HGLG11",
    },
    {
      assetId: hglg11.id,
      userId: user.id,
      type: EntryType.DIVIDEND,
      date: new Date(2025, 1, 13), // 2025-02-13
      quantity: 10,
      price: 0,
      amount: 82.3,
      notes: "Rendimento HGLG11 fev/25",
    },
    {
      assetId: hglg11.id,
      userId: user.id,
      type: EntryType.DIVIDEND,
      date: new Date(2025, 2, 13), // 2025-03-13
      quantity: 10,
      price: 0,
      amount: 82.3,
      notes: "Rendimento HGLG11 mar/25",
    },
    // IVVB11
    {
      assetId: ivvb11.id,
      userId: user.id,
      type: EntryType.PURCHASE,
      date: new Date(2025, 1, 5), // 2025-02-05
      quantity: 20,
      price: 298.0,
      amount: 5960.0,
      notes: "Compra IVVB11",
    },
    // BTC
    {
      assetId: btc.id,
      userId: user.id,
      type: EntryType.PURCHASE,
      date: new Date(2024, 11, 1), // 2024-12-01
      quantity: 0.05,
      price: 340000,
      amount: 17000.0,
      notes: "Compra BTC — equivalente BRL",
    },
  ];

  await prisma.investmentEntry.createMany({ data: entries });
  console.log(`Created ${entries.length} investment entries`);

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log("\n✅ Seed concluído!");
  console.log("──────────────────────────────────────");
  console.log(`  Usuário  : test@axiom.com`);
  console.log(`  Senha    : axiom123`);
  console.log(`  Moeda    : BRL (padrão)`);
  console.log(`  Categorias: ${categoryData.length}`);
  console.log(`  Transações: ${transactions.length} (6 meses)`);
  console.log(`  Ativos   : 4 (PETR4, HGLG11, IVVB11, BTC)`);
  console.log(`  Entradas : ${entries.length} investment entries`);
  console.log("──────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
