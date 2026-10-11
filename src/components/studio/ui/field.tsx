"use client";

import { useId, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export interface FieldControlProps {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  warning?: string | null;
  optional?: string;
  /** Extra element aligned to the end of the label row. */
  aside?: ReactNode;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
}

/** Label + control + hint/error wiring with correct ARIA relationships. */
export function Field({ label, hint, error, warning, optional, aside, className, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const messageId = `${id}-msg`;
  const describedBy = [hint ? hintId : null, error || warning ? messageId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("grid gap-1.5", className)}>
      <div className="flex min-h-5 items-center justify-between gap-2">
        <Label htmlFor={id} className="text-[0.8125rem] font-medium text-foreground/90">
          {label}
          {optional ? <span className="font-normal text-muted-foreground">({optional})</span> : null}
        </Label>
        {aside}
      </div>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {error ? (
        <p id={messageId} role="alert" className="flex items-start gap-1.5 text-xs text-danger">
          <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : warning ? (
        <p id={messageId} className="flex items-start gap-1.5 text-xs text-warning">
          <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
          {warning}
        </p>
      ) : null}
      {hint ? (
        <p id={hintId} className="text-xs leading-relaxed text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
