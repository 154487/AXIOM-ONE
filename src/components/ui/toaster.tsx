"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { toast as toastLib, type ToastItem } from "@/lib/toast";
import { cn } from "@/lib/utils";

const DURATION = 4000;

interface ActiveToast extends ToastItem {
  removing: boolean;
}

export function Toaster() {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);

  useEffect(() => {
    return toastLib.subscribe((item) => {
      setToasts((prev) => [...prev, { ...item, removing: false }]);

      setTimeout(() => {
        setToasts((prev) =>
          prev.map((t) => (t.id === item.id ? { ...t, removing: true } : t))
        );
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== item.id));
        }, 300);
      }, DURATION);
    });
  }, []);

  function dismiss(id: number) {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, removing: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-80">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "relative overflow-hidden rounded-xl border border-axiom-border bg-axiom-card shadow-2xl",
            "transition-all duration-300",
            t.removing
              ? "opacity-0 translate-x-4"
              : "opacity-100 translate-x-0",
            t.type === "success"
              ? "border-l-4 border-l-axiom-income"
              : "border-l-4 border-l-axiom-expense"
          )}
        >
          {/* Content */}
          <div className="flex items-start gap-3 px-4 py-3 pr-10">
            {t.type === "success" ? (
              <CheckCircle2 size={18} className="text-axiom-income shrink-0 mt-0.5" />
            ) : (
              <XCircle size={18} className="text-axiom-expense shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold leading-tight">{t.title}</p>
              {t.message && (
                <p className="text-axiom-muted text-xs mt-0.5 leading-snug">{t.message}</p>
              )}
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={() => dismiss(t.id)}
            className="absolute top-2.5 right-2.5 text-axiom-muted hover:text-white transition-colors"
          >
            <X size={14} />
          </button>

          {/* Progress bar */}
          <div
            className={cn(
              "absolute bottom-0 left-0 h-0.5",
              t.type === "success" ? "bg-axiom-income" : "bg-axiom-expense"
            )}
            style={{
              animation: `toast-shrink ${DURATION}ms linear forwards`,
            }}
          />
        </div>
      ))}
    </div>
  );
}
