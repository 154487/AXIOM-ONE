export interface ParsedRow {
  id: string;
  date: string; // "YYYY-MM-DD"
  rawDescription: string;
  cleanDescription: string;
  amount: number; // always positive
  type: "INCOME" | "EXPENSE";
}

export interface ReviewedRow extends ParsedRow {
  description: string;
  categoryId: string | null;
  skip: boolean;
}
