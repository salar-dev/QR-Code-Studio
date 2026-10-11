"use client";

import { useState, useSyncExternalStore } from "react";
import { Download, FileCode2, FileImage, FileText, LoaderCircle } from "lucide-react";
import { RadioGroup } from "radix-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/i18n/provider";
import { canEncodeWebp } from "@/lib/qr/export/export";
import { FILE_EXTENSIONS, EXPORT_FORMATS, SIZE_LIMITS, SIZE_PRESETS, supportsQuality, type ExportFormat, type PdfPageSize } from "@/lib/qr/export/types";
import { setExportSettings, useEditor } from "@/lib/store/editor-store";
import { cn } from "@/lib/utils";
import { ColorPicker } from "../design/color-picker";
import { Field } from "../ui/field";
import { SliderField } from "../ui/slider-field";
import { useExporter } from "./use-exporter";

const FORMAT_ICONS: Record<ExportFormat, typeof FileImage> = {
  png: FileImage,
  svg: FileCode2,
  pdf: FileText,
  jpeg: FileImage,
  webp: FileImage,
};

const subscribeNoop = () => () => undefined;
const useWebpSupport = () => useSyncExternalStore(subscribeNoop, canEncodeWebp, () => true);

function SizeControl() {
  const { m, n, t } = useI18n();
  const size = useEditor((s) => s.exportSettings.size);
  // While typing, the field shows the draft; otherwise the stored size.
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const value = Number.parseInt(draft, 10);
    if (Number.isFinite(value)) setExportSettings({ size: Math.min(SIZE_LIMITS.max, Math.max(SIZE_LIMITS.min, value)) });
    setDraft(null);
  };

  return (
    <div className="grid gap-2">
      <span className="text-[0.8125rem] font-medium text-foreground/90">{m.export.size}</span>
      <div className="grid grid-cols-5 gap-1">
        {SIZE_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setExportSettings({ size: preset })}
            aria-pressed={size === preset}
            className={cn(
              "ltr-value h-9 rounded-lg border bg-card font-mono text-xs tabular-nums transition-all outline-none hover:border-foreground/20 focus-visible:ring-3 focus-visible:ring-ring/50 md:h-8",
              size === preset && "border-brand bg-brand-soft/60 font-semibold",
            )}
          >
            {n(preset, { useGrouping: false })}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2">
        <span className="sr-only">{m.export.sizeCustom}</span>
        <Input
          type="number"
          inputMode="numeric"
          min={SIZE_LIMITS.min}
          max={SIZE_LIMITS.max}
          step={1}
          dir="ltr"
          value={draft ?? String(size)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          aria-label={m.export.sizeCustom}
          className="font-mono tabular-nums"
        />
        <span className="shrink-0 text-xs text-muted-foreground">{m.export.sizeUnit}</span>
      </label>
      <p className="text-xs text-muted-foreground">{t(m.export.sizeRange, { min: n(SIZE_LIMITS.min), max: n(SIZE_LIMITS.max, { useGrouping: false }) })}</p>
    </div>
  );
}

export function ExportPanel({ className }: { className?: string }) {
  const { m, n } = useI18n();
  const e = m.export;
  const settings = useEditor((s) => s.exportSettings);
  const transparent = useEditor((s) => s.design.background.mode === "transparent");
  const webp = useWebpSupport();
  const { exportAs, busy } = useExporter();
  const format = settings.format;
  const formatName = e.formats[format].name;

  return (
    <div className={cn("grid gap-5 p-4 md:p-5", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{e.title}</h2>
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-[0.8125rem] font-medium text-foreground/90">{e.format}</legend>
        <RadioGroup.Root value={format} onValueChange={(value) => setExportSettings({ format: value as ExportFormat })} aria-label={e.format} className="grid grid-cols-5 gap-1.5">
          {EXPORT_FORMATS.map((value) => {
            const Icon = FORMAT_ICONS[value];
            const disabled = value === "webp" && !webp;
            return (
              <RadioGroup.Item
                key={value}
                value={value}
                disabled={disabled}
                title={disabled ? e.webpUnsupported : e.formats[value].description}
                data-testid={`format-${value}`}
                className={cn(
                  "flex min-w-0 flex-col items-center gap-1 rounded-xl border bg-card px-1 py-2 text-muted-foreground transition-all outline-none hover:border-foreground/20 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-40",
                  "data-[state=checked]:border-brand data-[state=checked]:bg-brand-soft/60 data-[state=checked]:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
                <span className="text-[0.6875rem] font-semibold">{e.formats[value].name}</span>
              </RadioGroup.Item>
            );
          })}
        </RadioGroup.Root>
        <p className="text-xs text-muted-foreground">{e.formats[format].description}</p>
      </fieldset>

      <SizeControl />
      {format === "svg" || format === "pdf" ? <p className="-mt-3 text-xs text-muted-foreground">{e.vectorSizeNote}</p> : null}

      {format === "pdf" ? (
        <div className="grid gap-4 rounded-xl border bg-muted/30 p-3">
          <Field label={e.pdfPage}>
            {(control) => (
              <Select value={settings.pdfPage} onValueChange={(value) => setExportSettings({ pdfPage: value as PdfPageSize })}>
                <SelectTrigger id={control.id} className="w-full bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fit">{e.pdfPages.fit}</SelectItem>
                  <SelectItem value="a4">{e.pdfPages.a4}</SelectItem>
                  <SelectItem value="letter">{e.pdfPages.letter}</SelectItem>
                </SelectContent>
              </Select>
            )}
          </Field>
          <SliderField
            label={e.pdfSize}
            value={settings.pdfSizeMm}
            min={10}
            max={settings.pdfPage === "fit" ? 300 : 190}
            step={5}
            onChange={(pdfSizeMm) => setExportSettings({ pdfSizeMm })}
            format={(v) => `${n(v)} ${e.pdfSizeUnit}`}
          />
          <p className="text-xs leading-relaxed text-muted-foreground">{e.pdfNote}</p>
        </div>
      ) : null}

      {supportsQuality(format) ? (
        <SliderField
          label={e.quality}
          value={Math.round(settings.quality * 100)}
          min={50}
          max={100}
          step={1}
          onChange={(v) => setExportSettings({ quality: v / 100 })}
          format={(v) => `${n(v)}%`}
        />
      ) : null}

      {format === "jpeg" ? (
        <div className="grid gap-2 rounded-xl border bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[0.8125rem] font-medium">{e.jpegBackground}</span>
            <ColorPicker label={e.jpegBackground} value={settings.jpegBackground} onChange={(jpegBackground) => setExportSettings({ jpegBackground })} className="w-32" />
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">{e.jpegNote}</p>
        </div>
      ) : transparent && format !== "pdf" ? (
        <p className="text-xs text-success">{e.transparencyKept}</p>
      ) : null}

      <Field label={e.fileName}>
        {(control) => (
          <div dir="ltr" className="flex items-center rounded-lg border border-input bg-card focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30">
            <input
              {...control}
              value={settings.fileName}
              maxLength={80}
              dir="auto"
              onChange={(event) => setExportSettings({ fileName: event.target.value })}
              className="h-10 min-w-0 flex-1 bg-transparent px-3 text-base outline-none md:h-9 md:text-sm"
              spellCheck={false}
            />
            <span className="ltr-value shrink-0 pe-3 font-mono text-xs text-muted-foreground">.{FILE_EXTENSIONS[format]}</span>
          </div>
        )}
      </Field>

      <div className="grid gap-2">
        <Button type="button" size="lg" className="w-full" onClick={() => exportAs()} disabled={busy !== null} data-testid="download-button">
          {busy === format ? <LoaderCircle className="animate-spin" aria-hidden /> : <Download aria-hidden />}
          {busy === format ? e.downloading : m.export.download.replace("{format}", formatName)}
        </Button>
        <div className="grid gap-1.5">
          <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">{e.quick}</p>
          <div className="grid grid-cols-5 gap-1">
            {EXPORT_FORMATS.map((value) => (
              <Button
                key={value}
                type="button"
                variant="outline"
                size="sm"
                className="px-0 text-[0.6875rem]"
                disabled={busy !== null || (value === "webp" && !webp)}
                onClick={() => exportAs(value)}
                aria-label={m.export.download.replace("{format}", e.formats[value].name)}
                data-testid={`quick-${value}`}
              >
                {busy === value ? <LoaderCircle className="animate-spin" aria-hidden /> : e.formats[value].name}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
