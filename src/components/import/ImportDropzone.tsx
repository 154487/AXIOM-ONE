"use client";

import { useRef, useState, DragEvent } from "react";
import { useTranslations } from "next-intl";
import { FileUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ParsedRow } from "@/lib/import/types";

interface ImportDropzoneProps {
  onParsed: (rows: ParsedRow[]) => void;
}

export function ImportDropzone({ onParsed }: ImportDropzoneProps) {
  const t = useTranslations("Import");
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/import/parse", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("uploadError"));
        return;
      }
      onParsed(data as ParsedRow[]);
    } catch {
      setError(t("uploadError"));
    } finally {
      setUploading(false);
    }
  }

  function handleDragEnter(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so same file can be selected again
    e.target.value = "";
  }

  return (
    <div
      onClick={() => !uploading && inputRef.current?.click()}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-16 cursor-pointer transition-all select-none",
        dragging
          ? "border-axiom-primary bg-axiom-primary/5"
          : "border-axiom-border bg-axiom-card hover:border-axiom-primary/50 hover:bg-axiom-hover",
        uploading && "pointer-events-none opacity-80"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".ofx,.csv,.xlsx,.xls"
        className="hidden"
        onChange={handleChange}
      />

      {uploading ? (
        <>
          <Loader2 size={48} className="text-axiom-primary animate-spin" />
          <p className="text-white font-medium text-lg">{t("uploading")}</p>
        </>
      ) : (
        <>
          <div
            className={cn(
              "flex items-center justify-center w-20 h-20 rounded-2xl transition-colors",
              dragging ? "bg-axiom-primary/20" : "bg-axiom-hover"
            )}
          >
            <FileUp size={40} className={cn("transition-colors", dragging ? "text-axiom-primary" : "text-axiom-muted")} />
          </div>
          <div className="text-center space-y-1">
            <p className="text-white font-semibold text-xl">{t("dropzoneTitle")}</p>
            <p className="text-axiom-muted text-sm">{t("dropzoneSubtitle")}</p>
          </div>
          <p className="text-axiom-primary text-sm font-medium">{t("dropzoneCta")}</p>
        </>
      )}

      {error && (
        <p className="absolute bottom-4 text-axiom-expense text-sm text-center px-4">{error}</p>
      )}
    </div>
  );
}
