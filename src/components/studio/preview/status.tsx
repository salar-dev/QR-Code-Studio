"use client";

import { CircleAlert, CircleCheck, CircleDashed, LoaderCircle, OctagonX, TriangleAlert } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { deriveStatus, useRender, type QrStatus } from "@/lib/qr/render/render-store";
import { cn } from "@/lib/utils";

export const STATUS_STYLES: Record<QrStatus, { tone: string; icon: typeof CircleCheck }> = {
  ready: { tone: "bg-success-soft text-success border-success/25", icon: CircleCheck },
  checking: { tone: "bg-muted text-muted-foreground border-border", icon: LoaderCircle },
  lowContrast: { tone: "bg-warning-soft text-warning border-warning/30", icon: TriangleAlert },
  difficult: { tone: "bg-warning-soft text-warning border-warning/30", icon: CircleAlert },
  invalid: { tone: "bg-danger-soft text-danger border-danger/25", icon: OctagonX },
  failed: { tone: "bg-danger-soft text-danger border-danger/25", icon: OctagonX },
  empty: { tone: "bg-muted text-muted-foreground border-border", icon: CircleDashed },
};

export function useQrStatus(): QrStatus {
  return useRender(deriveStatus);
}

export function StatusBadge({ className, compact }: { className?: string; compact?: boolean }) {
  const { m } = useI18n();
  const status = useQrStatus();
  const { tone, icon: Icon } = STATUS_STYLES[status];
  return (
    <span
      role="status"
      aria-live="polite"
      data-testid="qr-status"
      data-status={status}
      className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap", tone, className)}
    >
      <Icon className={cn("size-3.5 shrink-0", status === "checking" && "animate-spin")} aria-hidden />
      <span className={cn(compact && "max-w-36 truncate")}>{m.status[status]}</span>
    </span>
  );
}
