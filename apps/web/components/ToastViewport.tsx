"use client";

import { useToastStore } from "@/lib/toastStore";
import { CheckCircle2, XCircle, Info, X, type LucideIcon } from "lucide-react";

const STYLES: Record<string, string> = {
  success: "border-emerald-800 bg-emerald-950/80 text-emerald-200",
  error: "border-red-800 bg-red-950/80 text-red-200",
  info: "border-neutral-700 bg-neutral-900/90 text-neutral-200",
};

const ICONS: Record<string, LucideIcon> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

export default function ToastViewport() {
  const { toasts, dismiss } = useToastStore();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
      {toasts.map((t) => {
        const Icon = ICONS[t.kind];
        return (
          <div
            key={t.id}
            className={`flex items-start gap-2 border rounded-md px-3 py-2.5 text-[13px] shadow-lg ${STYLES[t.kind]}`}
          >
            <Icon size={15} className="shrink-0 mt-0.5" />
            <span className="flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="opacity-60 hover:opacity-100">
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
