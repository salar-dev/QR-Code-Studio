"use client";

import { ArrowLeftRight, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useI18n } from "@/i18n/provider";
import { changeFillMode, cssFill, mixColors } from "@/lib/qr/design/color-utils";
import type { ColorStop, Fill, FillMode } from "@/lib/qr/design/types";
import { Segmented } from "../ui/segmented";
import { SliderField } from "../ui/slider-field";
import { ColorPicker } from "./color-picker";

const MAX_STOPS = 5;

interface FillEditorProps {
  fill: Fill;
  onChange: (fill: Fill) => void;
  label: string;
}

/** Edits a solid color or a linear/radial gradient with up to five stops. */
export function FillEditor({ fill, onChange, label }: FillEditorProps) {
  const { m, n } = useI18n();
  const c = m.design.color;

  const setStops = (stops: ColorStop[]) => onChange({ ...fill, stops, color: stops[0]?.color ?? fill.color });
  const updateStop = (index: number, patch: Partial<ColorStop>) => setStops(fill.stops.map((stop, i) => (i === index ? { ...stop, ...patch } : stop)));

  const addStop = () => {
    const sorted = [...fill.stops].sort((a, b) => a.offset - b.offset);
    // Insert in the widest gap, with the interpolated color.
    let gapIndex = 0;
    for (let i = 1; i < sorted.length - 1; i++) {
      if (sorted[i + 1].offset - sorted[i].offset > sorted[gapIndex + 1].offset - sorted[gapIndex].offset) gapIndex = i;
    }
    const a = sorted[gapIndex];
    const b = sorted[gapIndex + 1] ?? a;
    const stop = { offset: (a.offset + b.offset) / 2, color: mixColors(a.color, b.color, 0.5) };
    setStops([...sorted.slice(0, gapIndex + 1), stop, ...sorted.slice(gapIndex + 1)]);
  };

  const swap = () => setStops(fill.stops.map((stop, i, all) => ({ ...stop, color: all[all.length - 1 - i].color })));

  const stopLabel = (index: number) => (index === 0 ? c.main : index === 1 ? c.secondary : `${c.stops} ${index + 1}`);

  return (
    <div className="grid gap-3">
      <Segmented<FillMode>
        label={`${label} · ${c.fillType}`}
        size="sm"
        value={fill.mode}
        onChange={(mode) => onChange(changeFillMode(fill, mode))}
        options={[
          { value: "solid", label: c.solid },
          { value: "linear", label: c.linear },
          { value: "radial", label: c.radial },
        ]}
      />

      {fill.mode === "solid" ? (
        <ColorPicker label={label} value={fill.color} onChange={(color) => onChange({ ...fill, color, stops: fill.stops.map((s, i) => (i === 0 ? { ...s, color } : s)) })} />
      ) : (
        <div className="grid gap-3 rounded-xl border bg-muted/40 p-3">
          <div className="h-6 rounded-md border border-black/10 dark:border-white/10" style={{ background: cssFill(fill) }} aria-hidden />
          <ul className="grid gap-2">
            {fill.stops.map((stop, index) => (
              <li key={index} className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_auto] items-center gap-2">
                <ColorPicker label={stopLabel(index)} value={stop.color} onChange={(color) => updateStop(index, { color })} />
                <Slider
                  value={[Math.round(stop.offset * 100)]}
                  min={0}
                  max={100}
                  onValueChange={([value]) => updateStop(index, { offset: value / 100 })}
                  aria-label={`${stopLabel(index)} · ${c.stopPosition}`}
                  aria-valuetext={`${Math.round(stop.offset * 100)}%`}
                  className="py-2 [&_[data-slot=slider-thumb]]:size-4"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={fill.stops.length <= 2}
                  onClick={() => setStops(fill.stops.filter((_, i) => i !== index))}
                  aria-label={`${c.removeStop}: ${stopLabel(index)}`}
                >
                  <X aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={addStop} disabled={fill.stops.length >= MAX_STOPS}>
              <Plus aria-hidden /> {c.addStop}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={swap}>
              <ArrowLeftRight aria-hidden /> {c.swap}
            </Button>
          </div>
          {fill.mode === "linear" ? (
            <SliderField label={c.angle} value={fill.rotation} min={0} max={360} step={5} onChange={(rotation) => onChange({ ...fill, rotation })} format={(v) => `${n(v)}°`} />
          ) : null}
        </div>
      )}
    </div>
  );
}
