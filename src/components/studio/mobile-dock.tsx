"use client";

import { useState } from "react";
import { Download, LoaderCircle, Maximize2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useI18n } from "@/i18n/provider";
import { BACKDROP_COLORS } from "@/lib/qr/design/backdrop";
import { useRender } from "@/lib/qr/render/render-store";
import { useEditor } from "@/lib/store/editor-store";
import { cn } from "@/lib/utils";
import { useExporter } from "./export/use-exporter";
import { PreviewStage } from "./preview/preview-stage";
import { StatusBadge } from "./preview/status";
import { useDisplayedUrl } from "./preview/use-displayed-url";

/** Touch-first bottom bar: live thumbnail, status and one-tap download. */
export function MobileDock() {
  const { m, n } = useI18n();
  const [open, setOpen] = useState(false);
  const url = useDisplayedUrl(useRender((s) => s.url));
  const phase = useRender((s) => s.phase);
  const format = useEditor((s) => s.exportSettings.format);
  const size = useEditor((s) => s.exportSettings.size);
  const backdrop = useEditor((s) => s.preview.backdrop);
  const customBackdrop = useEditor((s) => s.preview.customBackdrop);
  const backdropColor = backdrop === "dark" ? BACKDROP_COLORS.dark : backdrop === "custom" ? customBackdrop : backdrop === "light" ? "#ffffff" : undefined;
  const { exportAs, busy } = useExporter();
  const formatName = m.export.formats[format].name;
  const showImage = url && phase !== "empty";

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-safe md:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3 rounded-2xl border bg-card/95 p-2 shadow-float backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              "relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              !backdropColor && "bg-checker-sm",
            )}
            style={backdropColor ? { backgroundColor: backdropColor } : undefined}
            aria-label={m.preview.openPreview}
            data-testid="dock-preview"
          >
            {showImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- generated object URL
              <img src={url} alt="" className="size-full object-contain" />
            ) : (
              <QrCode className="size-6 text-muted-foreground" aria-hidden />
            )}
            <span className="absolute end-0.5 bottom-0.5 grid size-4 place-items-center rounded bg-background/90 text-foreground">
              <Maximize2 className="size-2.5" aria-hidden />
            </span>
          </button>
          <div className="grid min-w-0 flex-1 gap-1">
            <StatusBadge compact className="justify-self-start" />
            <p className="ltr-value truncate ps-0.5 font-mono text-[0.6875rem] text-muted-foreground" dir="ltr">
              {formatName} · {n(size, { useGrouping: false })}px
            </p>
          </div>
          <Button type="button" size="lg" onClick={() => exportAs()} disabled={busy !== null} aria-label={m.export.download.replace("{format}", formatName)}>
            {busy ? <LoaderCircle className="animate-spin" aria-hidden /> : <Download aria-hidden />}
            <span>{formatName}</span>
          </Button>
        </div>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          closeLabel={m.common.close}
          // Focus the sheet itself rather than the first control (which would pop its tooltip).
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            (event.currentTarget as HTMLElement | null)?.focus();
          }}
          className="max-h-[94dvh] gap-0 overflow-y-auto rounded-t-3xl pb-safe scrollbar-thin">
          <SheetHeader className="pb-2">
            <SheetTitle>{m.preview.title}</SheetTitle>
          </SheetHeader>
          <div className="grid gap-3 px-4 pb-4">
            <PreviewStage compact />
            <Button type="button" size="lg" className="w-full" onClick={() => exportAs()} disabled={busy !== null}>
              {busy ? <LoaderCircle className="animate-spin" aria-hidden /> : <Download aria-hidden />}
              {busy ? m.export.downloading : m.export.download.replace("{format}", formatName)}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
