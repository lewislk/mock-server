"use client";

/**
 * 极简 toast 组件：客户端通过 useToast() 触发，无需 Provider 包裹。
 * 内部维护一个固定队列并在 3 秒后自动消失。
 */

import * as React from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { cn, shortUuid } from "@/lib/utils";

type ToastVariant = "default" | "success" | "destructive";

export interface ToastItem {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastContextValue {
  toast: (item: Omit<ToastItem, "id">) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastHost>");
  return ctx;
}

export function ToastHost({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const remove = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    (item: Omit<ToastItem, "id">) => {
      const id = shortUuid();
      setItems((prev) => [...prev, { ...item, id }]);
      setTimeout(() => remove(id), 3000);
    },
    [remove],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "rounded-md border border-border bg-background shadow-lg p-3 flex items-start gap-2 animate-in slide-in-from-bottom-2",
              t.variant === "destructive" && "border-destructive/40",
              t.variant === "success" && "border-success/40",
            )}
          >
            {t.variant === "success" && <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />}
            {t.variant === "destructive" && <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />}
            {!t.variant || t.variant === "default" ? (
              <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            ) : null}
            <div className="flex-1 min-w-0">
              {t.title && <div className="text-sm font-medium">{t.title}</div>}
              {t.description && <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>}
            </div>
            <button
              onClick={() => remove(t.id)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="关闭"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}