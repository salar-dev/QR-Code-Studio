"use client";

import type { ReactNode } from "react";
import { RadioGroup } from "radix-ui";
import { cn } from "@/lib/utils";

export interface StyleOption<T extends string> {
  value: T;
  label: string;
  icon: ReactNode;
}

interface StyleSelectorProps<T extends string> {
  label: string;
  value: T;
  options: readonly StyleOption<T>[];
  onChange: (value: T) => void;
}

/** Grid of visual shape choices (radio semantics, keyboard navigable). */
export function StyleSelector<T extends string>({ label, value, options, onChange }: StyleSelectorProps<T>) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-[0.8125rem] font-medium text-foreground/90">{label}</legend>
      <RadioGroup.Root value={value} onValueChange={(next) => onChange(next as T)} aria-label={label} className="grid grid-cols-4 gap-2 sm:grid-cols-7 md:grid-cols-4">
        {options.map((option) => (
          <RadioGroup.Item
            key={option.value}
            value={option.value}
            title={option.label}
            className={cn(
              "group flex min-w-0 flex-col items-center gap-1 rounded-xl border bg-card px-1 pt-2 pb-1.5 text-foreground/70 transition-all outline-none",
              "hover:border-foreground/20 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
              "data-[state=checked]:border-brand data-[state=checked]:bg-brand-soft/60 data-[state=checked]:text-foreground data-[state=checked]:shadow-sm",
            )}
          >
            {option.icon}
            <span className="w-full truncate text-center text-[0.6875rem] leading-tight">{option.label}</span>
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
    </fieldset>
  );
}
