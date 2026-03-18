"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ImportDropzone } from "./ImportDropzone";
import { ImportPreviewTable } from "./ImportPreviewTable";
import type { ParsedRow, ReviewedRow } from "@/lib/import/types";
import type { Category } from "@/generated/prisma/client";

type Step = "upload" | "preview" | "success";

interface ImportWizardProps {
  categories: Category[];
}

export function ImportWizard({ categories: initialCategories }: ImportWizardProps) {
  const t = useTranslations("Import");
  const [step, setStep] = useState<Step>("upload");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  async function handleConfirm(rows: ReviewedRow[]) {
    setImportError(null);
    setImporting(true);
    try {
      const res = await fetch("/api/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error ?? t("uploadError"));
        return;
      }
      setImportedCount(data.imported);
      setStep("success");
    } catch {
      setImportError(t("uploadError"));
    } finally {
      setImporting(false);
    }
  }

  function handleReset() {
    setParsedRows([]);
    setImportedCount(0);
    setImportError(null);
    setStep("upload");
  }

  if (step === "upload") {
    return (
      <div className="max-w-2xl mx-auto">
        <ImportDropzone
          onParsed={(rows) => {
            setParsedRows(rows);
            setStep("preview");
          }}
        />
      </div>
    );
  }

  if (step === "preview") {
    return (
      <div className="space-y-4">
        {importError && (
          <p className="text-axiom-expense text-sm text-center">{importError}</p>
        )}
        <ImportPreviewTable
          rows={parsedRows}
          categories={initialCategories}
          onBack={() => setStep("upload")}
          onConfirm={handleConfirm}
          isImporting={importing}
        />
      </div>
    );
  }

  // success
  return (
    <div className="max-w-md mx-auto flex flex-col items-center gap-6 py-16 text-center">
      <div className="w-20 h-20 rounded-full bg-axiom-income/20 flex items-center justify-center">
        <CheckCircle2 size={48} className="text-axiom-income" />
      </div>
      <div className="space-y-2">
        <h2 className="text-white text-2xl font-semibold">{t("successTitle")}</h2>
        <p className="text-axiom-muted">{t("successSubtitle", { count: importedCount })}</p>
      </div>
      <div className="flex items-center gap-3 flex-wrap justify-center">
        <Link href="/transactions">
          <Button className="bg-axiom-primary hover:bg-axiom-primary/90 text-white">
            {t("viewTransactions")}
          </Button>
        </Link>
        <Button
          variant="outline"
          onClick={handleReset}
          className="border-axiom-border text-axiom-muted hover:text-white hover:bg-axiom-hover"
        >
          {t("importMore")}
        </Button>
      </div>
    </div>
  );
}
