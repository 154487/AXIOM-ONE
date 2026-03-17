import { PrismaClient, TransactionType } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Create test user
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

  console.log(`Created user: ${user.email}`);

  // Create default categories
  const categoryData = [
    { name: "Housing", color: "#0D1B2A", icon: "home" },
    { name: "Food", color: "#FF6B35", icon: "shopping-cart" },
    { name: "Transport", color: "#AAB2BD", icon: "car" },
    { name: "Shopping", color: "#10B981", icon: "tag" },
    { name: "Health", color: "#EF4444", icon: "heart" },
    { name: "Utilities", color: "#5319e7", icon: "zap" },
    { name: "Income", color: "#10B981", icon: "trending-up" },
  ];

  const categories: Record<string, string> = {};
  for (const cat of categoryData) {
    const created = await prisma.category.upsert({
      where: {
        id: `${user.id}-${cat.name.toLowerCase()}`,
      },
      update: {},
      create: {
        id: `${user.id}-${cat.name.toLowerCase()}`,
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
        userId: user.id,
      },
    });
    categories[cat.name] = created.id;
  }

  console.log(`Created ${categoryData.length} categories`);

  // Create mock transactions spanning the last 6 months
  const now = new Date();
  const transactions = [
    // March 2026
    {
      description: "Monthly Salary",
      amount: 8420.0,
      type: TransactionType.INCOME,
      date: new Date(2026, 2, 5),
      categoryId: categories["Income"],
    },
    {
      description: "Grocery Shopping - Whole Foods",
      amount: 142.5,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 2, 8),
      categoryId: categories["Food"],
    },
    {
      description: "Rent Payment",
      amount: 1800.0,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 2, 1),
      categoryId: categories["Housing"],
    },
    // February 2026
    {
      description: "Monthly Salary",
      amount: 7800.0,
      type: TransactionType.INCOME,
      date: new Date(2026, 1, 5),
      categoryId: categories["Income"],
    },
    {
      description: "Gas Station - Shell",
      amount: 65.8,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 1, 12),
      categoryId: categories["Transport"],
    },
    {
      description: "Coffee Shop - Starbucks",
      amount: 12.4,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 1, 14),
      categoryId: categories["Food"],
    },
    {
      description: "Rent Payment",
      amount: 1800.0,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 1, 1),
      categoryId: categories["Housing"],
    },
    // January 2026
    {
      description: "Monthly Salary",
      amount: 7200.0,
      type: TransactionType.INCOME,
      date: new Date(2026, 0, 5),
      categoryId: categories["Income"],
    },
    {
      description: "Gym Membership",
      amount: 45.0,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 0, 10),
      categoryId: categories["Health"],
    },
    {
      description: "Electricity Bill",
      amount: 85.3,
      type: TransactionType.EXPENSE,
      date: new Date(2026, 0, 15),
      categoryId: categories["Utilities"],
    },
    // December 2025
    {
      description: "Freelance Project Payment",
      amount: 850.0,
      type: TransactionType.INCOME,
      date: new Date(2025, 11, 20),
      categoryId: categories["Income"],
    },
    {
      description: "Monthly Salary",
      amount: 7800.0,
      type: TransactionType.INCOME,
      date: new Date(2025, 11, 5),
      categoryId: categories["Income"],
    },
    {
      description: "Restaurant - Italian Bistro",
      amount: 85.6,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 11, 22),
      categoryId: categories["Food"],
    },
    {
      description: "Rent Payment",
      amount: 1800.0,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 11, 1),
      categoryId: categories["Housing"],
    },
    // November 2025
    {
      description: "Monthly Salary",
      amount: 8200.0,
      type: TransactionType.INCOME,
      date: new Date(2025, 10, 5),
      categoryId: categories["Income"],
    },
    {
      description: "Shopping - Clothing Store",
      amount: 230.0,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 10, 18),
      categoryId: categories["Shopping"],
    },
    {
      description: "Internet Bill",
      amount: 89.9,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 10, 10),
      categoryId: categories["Utilities"],
    },
    // October 2025
    {
      description: "Monthly Salary",
      amount: 7500.0,
      type: TransactionType.INCOME,
      date: new Date(2025, 9, 5),
      categoryId: categories["Income"],
    },
    {
      description: "Doctor Appointment",
      amount: 120.0,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 9, 12),
      categoryId: categories["Health"],
    },
    {
      description: "Gas Station",
      amount: 58.4,
      type: TransactionType.EXPENSE,
      date: new Date(2025, 9, 20),
      categoryId: categories["Transport"],
    },
  ];

  await prisma.transaction.deleteMany({ where: { userId: user.id } });

  for (const tx of transactions) {
    await prisma.transaction.create({
      data: {
        ...tx,
        userId: user.id,
      },
    });
  }

  console.log(`Created ${transactions.length} transactions`);
  console.log("\nSeed completed!");
  console.log("Test credentials:");
  console.log("  Email: test@axiom.com");
  console.log("  Password: axiom123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
