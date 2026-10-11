"use client";

import { useState } from "react";
import { Check, Copy, Download, LoaderCircle, Minus, Plus, QrCode, ScanLine, ShieldCheck } from "lucide-react";
import { AnimatePresence, m as motion } from "motion/react";
import { RadioGroup } from "radix-ui";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/i18n/provider";
import { BACKDROP_COLORS } from "@/lib/qr/design/backdrop";
import type { PreviewBackdrop } from "@/lib/qr/design/types";
import { retryRender, useRender } from "@/lib/qr/render/render-store";
import type { IssueSeverity } from "@/lib/qr/validation/analyze";
import { setPreview, useEditor } from "@/lib/store/editor-store";
import { cn } from "@/lib/utils";
import { ColorPicker } from "../design/color-picker";
import { useExporter } from "../export/use-exporter";
import { StatusBadge, STATUS_STYLES, useQrStatus } from "./status";
import { useDisplayedUrl } from "./use-displayed-url";

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

function BackdropPicker() {
  const { m } = useI18n();
  const backdrop = useEditor((s) => s.preview.backdrop);
  const custom = useEditor((s) => s.preview.customBackdrop);
  const swatch: Record<PreviewBackdrop, string> = {
    checker: "bg-checker-sm",
    light: "bg-white",
    dark: "",
    custom: "",
  };
  return (
    <div className="flex items-center gap-2">
      <RadioGroup.Root
        value={backdrop}
        onValueChange={(value) => setPreview({ backdrop: value as PreviewBackdrop })}
        aria-label={m.preview.backdrop}
        className="flex items-center gap-1 rounded-full border bg-card p-1"
      >
        {(["checker", "light", "dark", "custom"] as const).map((value) => (
          <Tooltip key={value}>
            <TooltipTrigger asChild>
              <RadioGroup.Item
                value={value}
                aria-label={m.preview.backdrops[value]}
                className={cn(
                  "size-6 rounded-full border border-black/15 transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:border-white/20",
                  "data-[state=checked]:ring-2 data-[state=checked]:ring-brand data-[state=checked]:ring-offset-1 data-[state=checked]:ring-offset-card",
                  swatch[value],
                )}
                style={
                  value === "dark"
                    ? { backgroundColor: BACKDROP_COLORS.dark }
                    : value === "custom"
                      ? { background: `conic-gradient(from 0deg, #f43f5e, #f59e0b, #22c55e, #3b82f6, #a855f7, #f43f5e)` }
                      : undefined
                }
              />
            </TooltipTrigger>
            <TooltipContent>{m.preview.backdrops[value]}</TooltipContent>
          </Tooltip>
        ))}
      </RadioGroup.Root>
      {backdrop === "custom" ? <ColorPicker compact label={m.preview.customBackdrop} value={custom} onChange={(color) => setPreview({ customBackdrop: color })} /> : null}
    </div>
  );
}

function PreviewCanvas({ zoom, compact }: { zoom: number; compact?: boolean }) {
  const { m } = useI18n();
  const phase = useRender((s) => s.phase);
  const url = useRender((s) => s.url);
  const displayed = useDisplayedUrl(url);
  const backdrop = useEditor((s) => s.preview.backdrop);
  const custom = useEditor((s) => s.preview.customBackdrop);
  const transparent = useEditor((s) => s.design.background.mode === "transparent");

  const blocked = phase === "invalid" || phase === "too-long" || phase === "too-small" || phase === "error";
  const message =
    phase === "invalid"
      ? { title: m.preview.invalidTitle, body: m.preview.invalidDescription }
      : phase === "too-long"
        ? { title: m.preview.tooLongTitle, body: m.preview.tooLongDescription }
        : phase === "too-small"
          ? { title: m.preview.tooSmallTitle, body: m.preview.tooSmallDescription }
          : phase === "error"
            ? { title: m.preview.errorTitle, body: "" }
            : null;
  const empty = phase === "empty" || (!displayed && !blocked);

  return (
    <div
      className={cn(
        "relative grid aspect-square w-full place-items-center overflow-auto rounded-2xl border transition-colors scrollbar-thin",
        backdrop === "checker" && "bg-checker",
        backdrop === "light" && "bg-white",
      )}
      style={backdrop === "dark" ? { backgroundColor: BACKDROP_COLORS.dark } : backdrop === "custom" ? { backgroundColor: custom } : undefined}
      data-testid="preview-canvas"
    >
      <div className="relative grid aspect-square place-items-center" style={{ width: `${Math.round(zoom * 84)}%` }}>
        <AnimatePresence initial={false}>
          {displayed && phase !== "empty" ? (
            <motion.img
              key={displayed}
              src={displayed}
              alt={m.preview.alt}
              data-testid="qr-preview-image"
              draggable={false}
              initial={{ opacity: 0 }}
              animate={{ opacity: blocked ? 0.12 : 1, filter: blocked ? "blur(3px)" : "blur(0px)" }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className={cn("absolute inset-0 size-full select-none", !transparent && "drop-shadow-[0_18px_30px_rgba(15,15,30,0.16)]")}
            />
          ) : null}
        </AnimatePresence>
      </div>

      {phase === "rendering" && displayed ? (
        <LoaderCircle className="absolute top-3 end-3 size-4 animate-spin text-muted-foreground" aria-hidden />
      ) : null}

      {empty && !blocked ? (
        <div className="absolute inset-0 grid place-items-center p-6">
          <div className="grid max-w-60 justify-items-center gap-3 text-center">
            <span className="grid size-14 place-items-center rounded-2xl border bg-card/90 text-muted-foreground shadow-sm backdrop-blur">
              <QrCode className="size-7" aria-hidden />
            </span>
            <p className="text-sm font-semibold text-foreground">{m.preview.emptyTitle}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{compact ? m.preview.emptyDescriptionMobile : m.preview.emptyDescription}</p>
          </div>
        </div>
      ) : null}

      {blocked && message ? (
        <div className="absolute inset-0 grid place-items-center p-6">
          <div className="grid max-w-64 justify-items-center gap-2 rounded-2xl border bg-card/95 p-5 text-center shadow-float backdrop-blur" role="alert">
            <ScanLine className="size-6 text-danger" aria-hidden />
            <p className="text-sm font-semibold">{message.title}</p>
            {message.body ? <p className="text-xs leading-relaxed text-muted-foreground">{message.body}</p> : null}
            {phase === "error" ? (
              <Button type="button" variant="outline" size="sm" className="mt-1" onClick={retryRender}>
                {m.preview.retry}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const SEVERITY_DOT: Record<IssueSeverity, string> = {
  error: "bg-danger",
  warning: "bg-warning",
  notice: "bg-muted-foreground/50",
};

function ScanReport() {
  const { m, t, n } = useI18n();
  const status = useQrStatus();
  const issues = useRender((s) => s.issues);
  const decode = useRender((s) => s.decode);
  const phase = useRender((s) => s.phase);
  const { icon: Icon, tone } = STATUS_STYLES[status];
  const description =
    phase === "error" ? m.preview.errorTitle : decode.state === "mismatch" ? m.status.descriptions.mismatch : m.status.descriptions[status];
  const showIssues = phase === "ready" && issues.length > 0;

  return (
    <div className="grid gap-3 rounded-2xl border bg-card p-4" data-testid="scan-report">
      <div className="flex items-start gap-3">
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg border", tone)}>
          <Icon className={cn("size-4", status === "checking" && "animate-spin")} aria-hidden />
        </span>
        <div className="grid gap-0.5">
          <p className="text-sm font-semibold">{m.status[status]}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
          {"inverted" in decode && decode.inverted ? <p className="text-xs text-muted-foreground">{m.status.decodedInverted}</p> : null}
        </div>
      </div>
      {showIssues ? (
        <ul className="grid gap-2 border-t pt-3" aria-label={m.status.issuesTitle}>
          {issues.map((issue) => (
            <li key={issue.code} className="flex items-start gap-2.5 text-xs leading-relaxed" data-issue={issue.code}>
              <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", SEVERITY_DOT[issue.severity])} aria-hidden />
              <span className={cn(issue.severity === "notice" ? "text-muted-foreground" : "text-foreground/90")}>
                {t(
                  m.issues[issue.code],
                  Object.fromEntries(Object.entries(issue.params ?? {}).map(([k, v]) => [k, typeof v === "number" ? n(v, { maximumFractionDigits: 1 }) : v])),
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="flex items-start gap-1.5 border-t pt-3 text-[0.6875rem] leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-px size-3.5 shrink-0" aria-hidden />
        {m.status.disclaimer}
      </p>
    </div>
  );
}

function PayloadBox() {
  const { m, t, n } = useI18n();
  const payload = useRender((s) => s.payload);
  const phase = useRender((s) => s.phase);
  const layout = useRender((s) => s.layout);
  const version = useRender((s) => s.version);
  const [copied, setCopied] = useState(false);
  if (!payload || phase === "empty") return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      toast.success(m.preview.contentCopied);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error(m.preview.copyFailed);
    }
  };

  return (
    <div className="grid gap-2 rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground/80">{m.preview.encodedContent}</p>
        <Button type="button" variant="ghost" size="xs" onClick={copy} aria-label={m.preview.copyContent}>
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied ? m.common.copied : m.common.copy}
        </Button>
      </div>
      <pre dir="ltr" data-testid="payload" className="max-h-28 overflow-auto rounded-lg bg-muted/60 p-2.5 font-mono text-[0.6875rem] leading-relaxed break-all whitespace-pre-wrap text-foreground/80 scrollbar-thin">
        {payload}
      </pre>
      {layout ? (
        <p className="ltr-value text-end font-mono text-[0.6875rem] text-muted-foreground tabular-nums">
          {t(m.preview.details, {
            version: t(m.preview.version, { value: n(version) }),
            modules: n(layout.count),
            size: n(layout.size),
          })}
        </p>
      ) : null}
    </div>
  );
}

/** Download shortcut shown with the preview when the export column isn't on screen. */
function PreviewDownload() {
  const { m, n } = useI18n();
  const format = useEditor((s) => s.exportSettings.format);
  const size = useEditor((s) => s.exportSettings.size);
  const { exportAs, busy } = useExporter();
  const name = m.export.formats[format].name;
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-3 xl:hidden">
      <span className="ltr-value font-mono text-xs text-muted-foreground" dir="ltr">
        {name} · {n(size, { useGrouping: false })}px
      </span>
      <Button type="button" onClick={() => exportAs()} disabled={busy !== null}>
        {busy ? <LoaderCircle className="animate-spin" aria-hidden /> : <Download aria-hidden />}
        {busy ? m.export.downloading : m.export.download.replace("{format}", name)}
      </Button>
    </div>
  );
}

export function PreviewStage({ compact = false }: { compact?: boolean }) {
  const { m } = useI18n();
  const [zoomIndex, setZoomIndex] = useState(2);
  const zoom = ZOOM_STEPS[zoomIndex];

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {compact ? null : <h2 className="text-sm font-semibold">{m.preview.title}</h2>}
          <StatusBadge />
        </div>
        <div className="flex items-center gap-2">
          <BackdropPicker />
          <div className="flex items-center rounded-full border bg-card p-0.5">
            <Button type="button" variant="ghost" size="icon-xs" className="rounded-full" onClick={() => setZoomIndex((i) => Math.max(0, i - 1))} disabled={zoomIndex === 0} aria-label={m.preview.zoomOut}>
              <Minus aria-hidden />
            </Button>
            <button
              type="button"
              onClick={() => setZoomIndex(2)}
              className="ltr-value min-w-11 rounded-full px-1 font-mono text-[0.6875rem] text-muted-foreground tabular-nums hover:text-foreground"
              aria-label={m.preview.zoomReset}
            >
              {Math.round(zoom * 100)}%
            </button>
            <Button type="button" variant="ghost" size="icon-xs" className="rounded-full" onClick={() => setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))} disabled={zoomIndex === ZOOM_STEPS.length - 1} aria-label={m.preview.zoomIn}>
              <Plus aria-hidden />
            </Button>
          </div>
        </div>
      </div>
      <div className={cn("mx-auto w-full", compact ? "max-w-[min(100%,46dvh)]" : "max-w-[min(100%,calc(100dvh-21rem))] min-[1800px]:max-w-[min(100%,calc(100dvh-19rem))]")}>
        <PreviewCanvas zoom={zoom} compact={compact} />
      </div>
      {compact ? null : <PreviewDownload />}
      <ScanReport />
      <PayloadBox />
      <p className="text-center text-[0.6875rem] text-muted-foreground">{m.preview.staticNote}</p>
    </div>
  );
}
