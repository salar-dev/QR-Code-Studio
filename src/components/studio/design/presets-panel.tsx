"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Ellipsis, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n/provider";
import { BACKDROP_COLORS } from "@/lib/qr/design/backdrop";
import { DEFAULT_DESIGN } from "@/lib/qr/design/defaults";
import { DESIGN_PRESETS, type DesignPreset } from "@/lib/qr/design/presets";
import type { QRDesign } from "@/lib/qr/design/types";
import { applyDesign, applyPreset, resetDesign, useEditor } from "@/lib/store/editor-store";
import { deleteStyle, duplicateStyle, renameStyle, saveStyle, useSavedStyles, type SavedStyle } from "@/lib/store/library-store";
import { cn } from "@/lib/utils";
import { NameDialog } from "../ui/name-dialog";
import { useDesignThumbnail } from "./use-design-thumbnail";

const presetKey = (design: Pick<QRDesign, "dots" | "cornerSquares" | "cornerDots" | "background" | "shape">) =>
  JSON.stringify([design.dots, design.cornerSquares, design.cornerDots, design.background, design.shape]);

function Thumbnail({ id, design, dark }: { id: string; design: QRDesign; dark?: boolean }) {
  const url = useDesignThumbnail(id, design);
  const transparent = design.background.mode === "transparent";
  return (
    <span
      className={cn("grid aspect-square w-full place-items-center overflow-hidden rounded-lg", transparent && !dark && "bg-checker-sm")}
      style={dark ? { backgroundColor: BACKDROP_COLORS.dark } : undefined}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- generated object URL
        <img src={url} alt="" className="size-full object-contain" draggable={false} />
      ) : (
        <span className="size-3/4 animate-pulse rounded-md bg-muted" />
      )}
    </span>
  );
}

function PresetTile({ preset, active, name }: { preset: DesignPreset; active: boolean; name: string }) {
  const design = useMemo(() => ({ ...DEFAULT_DESIGN, ...preset.design }), [preset]);
  return (
    <button
      type="button"
      onClick={() => applyPreset(preset)}
      aria-pressed={active}
      className={cn(
        "group relative flex min-w-0 flex-col gap-1.5 rounded-xl border bg-card p-1.5 text-start transition-all outline-none hover:-translate-y-0.5 hover:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/50",
        active && "border-brand ring-2 ring-brand/20",
      )}
    >
      <Thumbnail id={`preset:${preset.id}`} design={design} dark={preset.backdrop === "dark"} />
      <span className="line-clamp-2 px-0.5 text-[0.6875rem] leading-tight font-medium text-foreground/80">{name}</span>
      {active ? (
        <span className="absolute top-1 end-1 grid size-4 place-items-center rounded-full bg-brand text-brand-foreground">
          <Check className="size-3" aria-hidden />
        </span>
      ) : null}
    </button>
  );
}

function SavedStyleTile({ style, onRename }: { style: SavedStyle; onRename: (style: SavedStyle) => void }) {
  const { m } = useI18n();
  return (
    <div className="group relative flex min-w-0 flex-col gap-1.5 rounded-xl border bg-card p-1.5">
      <button type="button" onClick={() => applyDesign(style.design)} className="flex flex-col gap-1.5 rounded-lg text-start outline-none focus-visible:ring-3 focus-visible:ring-ring/50" aria-label={`${m.common.apply}: ${style.name}`}>
        <Thumbnail id={`style:${style.id}:${style.createdAt}`} design={style.design} />
        <span className="truncate px-0.5 pe-6 text-[0.6875rem] font-medium text-foreground/80" dir="auto">
          {style.name}
        </span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs" className="absolute end-1 bottom-1" aria-label={`${m.header.menu}: ${style.name}`}>
            <Ellipsis aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onSelect={() => applyDesign(style.design)}>
            <Check aria-hidden /> {m.common.apply}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onRename(style)}>
            <Pencil aria-hidden /> {m.common.rename}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => duplicateStyle(style.id, m.design.copySuffix)}>
            <Copy aria-hidden /> {m.common.duplicate}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => deleteStyle(style.id)}>
            <Trash2 aria-hidden /> {m.common.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function PresetsPanel() {
  const { m, t } = useI18n();
  const design = useEditor((s) => s.design);
  const styles = useSavedStyles();
  const [saving, setSaving] = useState(false);
  const [renaming, setRenaming] = useState<SavedStyle | null>(null);
  const current = presetKey(design);

  return (
    <div className="grid gap-5">
      <div className="grid gap-2.5">
        <p className="text-xs text-muted-foreground">{m.design.presetsHint}</p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-4 2xl:grid-cols-5">
          {DESIGN_PRESETS.map((preset) => (
            <PresetTile key={preset.id} preset={preset} name={m.design.presetNames[preset.id as keyof typeof m.design.presetNames]} active={presetKey(preset.design) === current} />
          ))}
        </div>
      </div>

      <div className="grid gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-[0.8125rem] font-medium">{m.design.myStyles}</h4>
          <Button type="button" variant="outline" size="sm" onClick={() => setSaving(true)}>
            <Plus aria-hidden /> {m.design.saveStyle}
          </Button>
        </div>
        {styles.length === 0 ? (
          <p className="rounded-xl border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">{m.design.myStylesEmpty}</p>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-4 2xl:grid-cols-5">
            {styles.map((style) => (
              <SavedStyleTile key={style.id} style={style} onRename={setRenaming} />
            ))}
          </div>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="justify-self-start text-muted-foreground"
        onClick={() => {
          resetDesign();
          toast.success(m.design.designReset);
        }}
      >
        <RotateCcw aria-hidden /> {m.design.resetDesign}
      </Button>

      <NameDialog
        open={saving}
        onOpenChange={setSaving}
        title={m.design.saveStyle}
        label={m.design.styleName}
        placeholder={m.design.styleNamePlaceholder}
        initialValue={t(m.design.styleDefaultName, { n: styles.length + 1 })}
        submitLabel={m.common.save}
        onSubmit={(name) => {
          saveStyle(name, design);
          toast.success(m.design.styleSaved);
        }}
      />
      <NameDialog
        open={renaming !== null}
        onOpenChange={(open) => !open && setRenaming(null)}
        title={m.common.rename}
        label={m.design.styleName}
        initialValue={renaming?.name ?? ""}
        submitLabel={m.common.save}
        onSubmit={(name) => renaming && renameStyle(renaming.id, name)}
      />
    </div>
  );
}
