"use client";

import { useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Info icon with a tooltip that opens on hover/focus (desktop) and on tap
 * (touch screens, where hover tooltips are otherwise unreachable).
 */
export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => setOpen((value) => !value)}
        >
          <Info className="size-3.5" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 text-pretty leading-relaxed" sideOffset={6}>
        {children}
      </TooltipContent>
    </Tooltip>
  );
}
