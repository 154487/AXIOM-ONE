"use client";

import { useState, useEffect, KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { JournalEntry } from "./JournalShell";

const ENTRY_TYPE_LABELS: Record<string, string> = {
  NOTE: "Nota livre",
  APORTE: "Aporte",
  RESGATE: "Resgate",
  REFLEXAO: "Reflexão",
  META: "Meta",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

interface JournalEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: JournalEntry | null;
  onSaved: (entry: JournalEntry) => void;
}

export function JournalEditor({ open, onOpenChange, entry, onSaved }: JournalEditorProps) {
  const isEdit = Boolean(entry);

  const [title, setTitle] = useState("");
  const [entryType, setEntryType] = useState("NOTE");
  const [date, setDate] = useState(todayISO());
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when editing
  useEffect(() => {
    if (open) {
      if (entry) {
        setTitle(entry.title);
        setEntryType(entry.entryType);
        setDate(entry.date.slice(0, 10));
        setTags(entry.tags);
        setContent(entry.content);
      } else {
        setTitle("");
        setEntryType("NOTE");
        setDate(todayISO());
        setTags([]);
        setContent("");
      }
      setTagInput("");
      setError(null);
    }
  }, [open, entry]);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  const handleSave = async () => {
    if (!title.trim()) { setError("Título é obrigatório."); return; }
    if (!content.trim()) { setError("Conteúdo é obrigatório."); return; }

    setSaving(true);
    setError(null);
    try {
      const url = isEdit ? `/api/journal/${entry!.id}` : "/api/journal";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, entryType, tags, date }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Erro ao salvar. Tente novamente.");
        return;
      }
      const saved: JournalEntry = await res.json();
      onSaved(saved);
      onOpenChange(false);
    } catch {
      setError("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-axiom-card border-axiom-border text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar entrada" : "Nova entrada"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="je-title">Título</Label>
            <Input
              id="je-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da entrada..."
              className="bg-axiom-hover border-axiom-border text-white"
            />
          </div>

          {/* Type + Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="je-type">Tipo</Label>
              <select
                id="je-type"
                value={entryType}
                onChange={(e) => setEntryType(e.target.value)}
                className="bg-axiom-hover border border-axiom-border text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-axiom-primary"
              >
                {Object.entries(ENTRY_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="je-date">Data</Label>
              <input
                id="je-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-axiom-hover border border-axiom-border text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-axiom-primary"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="je-tags">Tags</Label>
            <div className="flex flex-wrap gap-1.5 items-center p-2 bg-axiom-hover border border-axiom-border rounded-md min-h-[40px]">
              {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 text-xs bg-axiom-border text-white px-2 py-0.5 rounded-full">
                  #{tag}
                  <button type="button" onClick={() => setTags((p) => p.filter((t) => t !== tag))}>
                    <X size={10} />
                  </button>
                </span>
              ))}
              <input
                id="je-tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={addTag}
                placeholder="Tag + Enter"
                className="bg-transparent text-sm text-white outline-none flex-1 min-w-[100px] placeholder:text-axiom-muted"
              />
            </div>
          </div>

          {/* Content with tabs */}
          <div className="flex flex-col gap-1.5">
            <Label>Conteúdo (Markdown)</Label>
            <Tabs defaultValue="write">
              <TabsList className="bg-axiom-hover border border-axiom-border">
                <TabsTrigger value="write" className="text-xs">Escrever</TabsTrigger>
                <TabsTrigger value="preview" className="text-xs">Visualizar</TabsTrigger>
              </TabsList>
              <TabsContent value="write">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={10}
                  placeholder="Escreva em Markdown..."
                  className="w-full bg-axiom-hover border border-axiom-border text-white text-sm font-mono rounded-md px-3 py-2 resize-y focus:outline-none focus:border-axiom-primary placeholder:text-axiom-muted"
                />
              </TabsContent>
              <TabsContent value="preview">
                <div className="min-h-[200px] bg-axiom-hover border border-axiom-border rounded-md px-4 py-3 text-sm text-white leading-relaxed prose-like overflow-auto">
                  {content ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-3">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-base font-semibold mb-2 mt-3">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2">{children}</h3>,
                        p: ({ children }) => <p className="mb-2">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                        li: ({ children }) => <li className="text-axiom-muted">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                        em: ({ children }) => <em className="italic text-axiom-muted">{children}</em>,
                        code: ({ children }) => <code className="bg-axiom-border px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                        blockquote: ({ children }) => <blockquote className="border-l-2 border-axiom-primary pl-3 my-2 text-axiom-muted italic">{children}</blockquote>,
                        hr: () => <hr className="border-axiom-border my-3" />,
                      }}
                    >
                      {content}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-axiom-muted italic">Nada para visualizar ainda.</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Edit note */}
          {isEdit && (
            <p className="text-xs text-axiom-muted italic">
              Health score snapshot preservado — não recalculado ao editar.
            </p>
          )}

          {/* Error */}
          {error && <p className="text-sm text-axiom-expense">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-axiom-primary hover:bg-axiom-primary/90 text-white"
          >
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
