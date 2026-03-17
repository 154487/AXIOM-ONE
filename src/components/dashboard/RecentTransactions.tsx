import Link from "next/link";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  date: Date;
  category: { name: string; color: string };
}

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">Recent Transactions</h3>
        <Link href="/transactions" className="text-axiom-primary text-sm hover:underline">
          View All
        </Link>
      </div>

      <div className="space-y-3">
        {transactions.map((tx) => (
          <div key={tx.id} className="flex items-center justify-between py-2 border-b border-axiom-border last:border-0">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: tx.category.color + "20" }}
              >
                {tx.type === "INCOME" ? (
                  <ArrowUpRight size={16} style={{ color: "#10B981" }} />
                ) : (
                  <ArrowDownLeft size={16} style={{ color: "#EF4444" }} />
                )}
              </div>
              <div>
                <p className="text-white text-sm font-medium">{tx.description}</p>
                <p className="text-axiom-muted text-xs">{tx.category.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p
                className={cn(
                  "text-sm font-semibold",
                  tx.type === "INCOME" ? "text-axiom-income" : "text-axiom-expense"
                )}
              >
                {tx.type === "INCOME" ? "+" : ""}{formatCurrency(tx.amount)}
              </p>
              <p className="text-axiom-muted text-xs">{formatDate(tx.date)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
