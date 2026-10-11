"use client";

import { useId, type ReactNode } from "react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface SliderFieldProps {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** Called when the user releases the thumb. */
  onCommit?: (value: number) => void;
  format?: (value: number) => string;
  hint?: ReactNode;
  aside?: ReactNode;
  className?: string;
  tone?: "default" | "warning";
}

export function SliderField({ label, value, min, max, step = 1, onChange, onCommit, format, hint, aside, className, tone = "default" }: SliderFieldProps) {
  const id = useId();
  const display = format ? format(value) : String(value);
  return (
    <div className={cn("grid gap-2.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <span id={`${id}-label`} className="text-[0.8125rem] font-medium text-foreground/90">
            {label}
          </span>
          {aside}
        </div>
        <output
          htmlFor={id}
          className={cn(
            "ltr-value min-w-12 rounded-md bg-muted px-1.5 py-0.5 text-center font-mono text-xs tabular-nums",
            tone === "warning" ? "text-warning" : "text-muted-foreground",
          )}
        >
          {display}
        </output>
      </div>
      <Slider
        id={id}
        aria-labelledby={`${id}-label`}
        aria-valuetext={display}
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([next]) => onChange(next)}
        onValueCommit={onCommit ? ([next]) => onCommit(next) : undefined}
        className="py-1.5 [&_[data-slot=slider-thumb]]:size-4 [&_[data-slot=slider-track]]:h-1.5"
      />
      {hint ? <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
