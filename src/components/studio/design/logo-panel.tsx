"use client";

import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/i18n/provider";
import { DEFAULT_LOGO, LOGO_LIMITS } from "@/lib/qr/design/defaults";
import { LOGO_ACCEPT, LogoError, processLogoFile } from "@/lib/qr/design/logo";
import type { LogoDesign } from "@/lib/qr/design/types";
import { setDesign, useEditor } from "@/lib/store/editor-store";
import { cn } from "@/lib/utils";
import { SliderField } from "../ui/slider-field";
import { ColorPicker } from "./color-picker";

export function LogoPanel() {
  const { m, n } = useI18n();
  const l = m.design.logo;
  const logo = useEditor((s) => s.design.logo);
  const ecc = useEditor((s) => s.design.errorCorrection);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const patch = (next: Partial<LogoDesign>) => setDesign((d) => ({ ...d, logo: { ...d.logo, ...next } }));

  const accept = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { src, name } = await processLogoFile(file);
      patch({ src, name });
    } catch (err) {
      setError(err instanceof LogoError ? l.errors[err.code] : l.errors.decode);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const fileInput = (
    <input ref={inputRef} type="file" accept={LOGO_ACCEPT} className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => accept(e.target.files?.[0])} />
  );

  if (!logo.src) {
    return (
      <div className="grid gap-2">
        {fileInput}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void accept(e.dataTransfer.files?.[0]);
          }}
          disabled={busy}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 px-4 py-6 text-center transition-colors outline-none hover:border-foreground/30 hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50",
            dragging && "border-brand bg-brand-soft/50",
          )}
        >
          {busy ? <LoaderCircle className="size-6 animate-spin text-muted-foreground" aria-hidden /> : <ImagePlus className="size-6 text-muted-foreground" aria-hidden />}
          <span className="text-sm font-medium">{busy ? l.processing : l.upload}</span>
          <span className="text-xs text-muted-foreground">{l.dropHint}</span>
        </button>
        {error ? (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  const lowEcc = ecc !== "H";

  return (
    <div className="grid gap-4">
      {fileInput}
      <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-2.5">
        <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg border bg-checker-sm">
          {/* eslint-disable-next-line @next/next/no-img-element -- local data URL */}
          <img src={logo.src} alt="" className="max-h-full max-w-full object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" dir="auto">
            {logo.name || "logo.png"}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
              {busy ? <LoaderCircle className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />}
              {l.replace}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => patch({ ...DEFAULT_LOGO })}>
              <Trash2 aria-hidden /> {l.remove}
            </Button>
          </div>
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}

      {lowEcc ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning-soft p-3 text-xs leading-relaxed">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <div className="grid flex-1 gap-2">
            <p>{l.recommendEcc}</p>
            <Button type="button" size="sm" variant="outline" className="justify-self-start bg-card" onClick={() => setDesign((d) => ({ ...d, errorCorrection: "H" }))}>
              {l.useHigh}
            </Button>
          </div>
        </div>
      ) : null}

      <SliderField
        label={l.size}
        hint={l.sizeHint}
        value={Math.round(logo.size * 100)}
        min={LOGO_LIMITS.minSize * 100}
        max={LOGO_LIMITS.maxSize * 100}
        step={5}
        onChange={(v) => patch({ size: v / 100 })}
        format={(v) => `${n(v)}%`}
        tone={logo.size > 0.5 ? "warning" : "default"}
      />
      <SliderField
        label={l.margin}
        value={logo.margin}
        min={0}
        max={LOGO_LIMITS.maxMargin}
        step={0.25}
        onChange={(v) => patch({ margin: v })}
        format={(v) => n(v, { maximumFractionDigits: 2 })}
      />

      <label className="flex items-center justify-between gap-3 text-[0.8125rem] font-medium">
        {l.hideDots}
        <Switch checked={logo.hideBackgroundDots} onCheckedChange={(v) => patch({ hideBackgroundDots: v })} />
      </label>
      <label className="flex items-center justify-between gap-3 text-[0.8125rem] font-medium">
        {l.backdrop}
        <Switch checked={logo.backdrop} onCheckedChange={(v) => patch({ backdrop: v })} />
      </label>
      {logo.backdrop ? (
        <div className="grid gap-3 rounded-xl border bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[0.8125rem] font-medium">{l.backdropColor}</span>
            <ColorPicker label={l.backdropColor} value={logo.backdropColor} onChange={(color) => patch({ backdropColor: color })} className="w-36" />
          </div>
          <SliderField
            label={l.backdropRadius}
            value={Math.round(logo.backdropRadius * 100)}
            min={0}
            max={100}
            step={5}
            onChange={(v) => patch({ backdropRadius: v / 100 })}
            format={(v) => `${n(v)}%`}
          />
        </div>
      ) : null}
    </div>
  );
}
