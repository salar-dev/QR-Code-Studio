"use client";

import type { ReactNode } from "react";
import { RadioGroup } from "radix-ui";
import { cn } from "@/lib/utils";

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  title?: string;
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentOption<T>[];
  label: string;
  size?: "sm" | "md";
  className?: string;
}

/** Segmented control built on a radio group (arrow keys, RTL aware). */
export function Segmented<T extends string>({ value, onChange, options, label, size = "md", className }: SegmentedProps<T>) {
  return (
    <RadioGroup.Root
      value={value}
      onValueChange={(next) => onChange(next as T)}
      aria-label={label}
      className={cn("flex w-full gap-1 rounded-xl bg-muted p-1", className)}
    >
      {options.map((option) => (
        <RadioGroup.Item
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          title={option.title}
          className={cn(
            "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 font-medium text-muted-foreground transition-all outline-none",
            "hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-40",
            "data-[state=checked]:bg-card data-[state=checked]:text-foreground data-[state=checked]:shadow-sm dark:data-[state=checked]:bg-accent",
            size === "sm" ? "h-8 text-xs" : "h-9 text-[0.8125rem] md:h-8",
          )}
        >
          {option.icon}
          <span className="truncate">{option.label}</span>
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
