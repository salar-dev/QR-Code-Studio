"use client";

import { useState } from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";
import { Check, Pipette } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/i18n/provider";
import { PRESET_COLOR_PALETTE } from "@/lib/qr/design/presets";
import { readableOn } from "@/lib/qr/validation/color";
import { pushRecentColor, useRecentColors } from "@/lib/store/editor-store";
import { cn } from "@/lib/utils";

interface EyeDropperResult {
  sRGBHex: string;
}
interface EyeDropperCtor {
  new (): { open(): Promise<EyeDropperResult> };
}

function Swatch({ color, selected, onSelect, label }: { color: string; selected: boolean; onSelect: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={label}
      aria-pressed={selected}
      title={color}
      className={cn(
        "relative grid size-7 place-items-center rounded-md border border-black/10 transition-transform hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none dark:border-white/15",
        selected && "ring-2 ring-brand ring-offset-1 ring-offset-popover",
      )}
      style={{ backgroundColor: color }}
    >
      {selected ? <Check className="size-3.5" style={{ color: readableOn(color) }} aria-hidden /> : null}
    </button>
  );
}

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label: string;
  className?: string;
  /** Compact square trigger without the hex code. */
  compact?: boolean;
}

export function ColorPicker({ value, onChange, label, className, compact }: ColorPickerProps) {
  const { m } = useI18n();
  const recent = useRecentColors();
  const [open, setOpen] = useState(false);
  const eyeDropper = typeof window !== "undefined" ? (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper : undefined;

  const pickFromScreen = async () => {
    if (!eyeDropper) return;
    try {
      const result = await new eyeDropper().open();
      onChange(result.sRGBHex.toLowerCase());
    } catch {
      // Cancelled by the user.
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) pushRecentColor(value);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${label}: ${value}`}
          className={cn(
            "flex items-center gap-2 rounded-lg border border-input bg-card text-start transition-colors outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
            compact ? "size-10 justify-center p-0 md:size-9" : "h-10 w-full px-2 md:h-9",
            className,
          )}
        >
          <span className="size-6 shrink-0 rounded-md border border-black/10 shadow-inner dark:border-white/15" style={{ backgroundColor: value }} />
          {compact ? null : <span className="ltr-value font-mono text-xs uppercase text-foreground/80">{value}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 gap-3 p-3" align="start" collisionPadding={12}>
        <div dir="ltr" className="[&_.react-colorful]:h-40 [&_.react-colorful]:w-full [&_.react-colorful__hue]:mt-3 [&_.react-colorful__hue]:h-3 [&_.react-colorful__hue]:rounded-full [&_.react-colorful__pointer]:size-5 [&_.react-colorful__saturation]:rounded-lg [&_.react-colorful__saturation]:border-b-0">
          <HexColorPicker color={value} onChange={onChange} aria-label={m.design.color.pick} />
        </div>
        <div dir="ltr" className="flex items-center gap-2">
          <label className="flex h-9 flex-1 items-center gap-1 rounded-lg border border-input bg-card px-2 focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30">
            <span className="font-mono text-xs text-muted-foreground">#</span>
            <HexColorInput
              color={value}
              onChange={onChange}
              aria-label={m.design.color.hex}
              className="w-full bg-transparent font-mono text-sm uppercase outline-none"
            />
          </label>
          {eyeDropper ? (
            <button
              type="button"
              onClick={pickFromScreen}
              aria-label={m.design.color.eyedropper}
              title={m.design.color.eyedropper}
              className="grid size-9 place-items-center rounded-lg border border-input text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Pipette className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>
        <div className="grid gap-1.5">
          <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">{m.design.color.palette}</p>
          <div className="grid grid-cols-8 gap-1.5">
            {PRESET_COLOR_PALETTE.map((color) => (
              <Swatch key={color} color={color} selected={color === value} onSelect={() => onChange(color)} label={color} />
            ))}
          </div>
        </div>
        {recent.length > 0 ? (
          <div className="grid gap-1.5">
            <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">{m.design.color.recent}</p>
            <div className="grid grid-cols-8 gap-1.5">
              {recent.slice(0, 8).map((color) => (
                <Swatch key={color} color={color} selected={color === value} onSelect={() => onChange(color)} label={color} />
              ))}
            </div>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
