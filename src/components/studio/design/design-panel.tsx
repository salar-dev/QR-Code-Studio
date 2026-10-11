"use client";

import type { ReactNode } from "react";
import { Image as ImageIcon, LayoutGrid, Paintbrush, PaintBucket, Shapes, ShieldCheck, Sparkles } from "lucide-react";
import { RadioGroup } from "radix-ui";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/i18n/provider";
import { MARGIN_LIMITS } from "@/lib/qr/design/defaults";
import {
  CORNER_DOT_STYLES,
  CORNER_SQUARE_STYLES,
  DOT_STYLES,
  ERROR_CORRECTION_LEVELS,
  type BackgroundDesign,
  type ErrorCorrectionLevel,
  type Fill,
  type QRDesign,
} from "@/lib/qr/design/types";
import { setDesign, useEditor } from "@/lib/store/editor-store";
import { cn } from "@/lib/utils";
import { InfoTip } from "../ui/info-tip";
import { Segmented } from "../ui/segmented";
import { SliderField } from "../ui/slider-field";
import { ColorPicker } from "./color-picker";
import { FillEditor } from "./fill-editor";
import { LogoPanel } from "./logo-panel";
import { PresetsPanel } from "./presets-panel";
import { CornerDotIcon, CornerSquareIcon, DotStyleIcon } from "./style-icons";
import { StyleSelector } from "./style-selector";

function SectionTrigger({ icon, children, badge }: { icon: ReactNode; children: ReactNode; badge?: ReactNode }) {
  return (
    <AccordionTrigger className="items-center gap-3 px-4 py-3.5 hover:no-underline md:px-5 [&[data-state=open]]:pb-2">
      <span className="flex items-center gap-3">
        <span className="grid size-7 place-items-center rounded-lg bg-muted text-foreground/70 [&_svg]:size-4">{icon}</span>
        <span className="text-sm font-semibold">{children}</span>
        {badge}
      </span>
    </AccordionTrigger>
  );
}

const update = (fn: (d: QRDesign) => QRDesign) => setDesign(fn);

function ColorsSection() {
  const { m } = useI18n();
  const c = m.design.color;
  const dots = useEditor((s) => s.design.dots);
  const squares = useEditor((s) => s.design.cornerSquares);
  const cdots = useEditor((s) => s.design.cornerDots);

  const corner = (key: "cornerSquares" | "cornerDots", title: string, value: { useMainColor: boolean; fill: Fill }) => (
    <div className="grid gap-3 border-t pt-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.8125rem] font-medium">{title}</span>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          {c.useMainColor}
          <Switch
            size="sm"
            checked={value.useMainColor}
            onCheckedChange={(useMainColor) =>
              update((d) => ({
                ...d,
                // Seed an independent color from the current main color.
                [key]: { ...d[key], useMainColor, fill: useMainColor ? d[key].fill : { ...d.dots.fill } },
              }))
            }
          />
        </label>
      </div>
      {value.useMainColor ? null : (
        <FillEditor label={title} fill={value.fill} onChange={(fill) => update((d) => ({ ...d, [key]: { ...d[key], fill } }))} />
      )}
    </div>
  );

  return (
    <div className="grid gap-4">
      <div className="grid gap-3">
        <div className="flex items-center gap-1">
          <span className="text-[0.8125rem] font-medium">{c.main}</span>
          <InfoTip label={c.main}>{c.mainHint}</InfoTip>
        </div>
        <FillEditor label={c.main} fill={dots.fill} onChange={(fill) => update((d) => ({ ...d, dots: { ...d.dots, fill } }))} />
      </div>
      {corner("cornerSquares", c.cornerSquares, squares)}
      {corner("cornerDots", c.cornerDots, cdots)}
    </div>
  );
}

function BackgroundSection() {
  const { m, n } = useI18n();
  const b = m.design.bg;
  const bg = useEditor((s) => s.design.background);
  const patch = (next: Partial<BackgroundDesign>) => update((d) => ({ ...d, background: { ...d.background, ...next } }));
  const isGradient = bg.mode === "linear" || bg.mode === "radial";
  const kind: "solid" | "transparent" | "gradient" = isGradient ? "gradient" : bg.mode === "transparent" ? "transparent" : "solid";

  return (
    <div className="grid gap-4">
      <Segmented<"solid" | "transparent" | "gradient">
        label={b.mode}
        value={kind}
        onChange={(next) => {
          if (next === "gradient") {
            const flat = bg.stops.every((s) => s.color === bg.stops[0]?.color);
            patch({ mode: "linear", stops: flat ? [{ offset: 0, color: "#ffffff" }, { offset: 1, color: "#e0e7ff" }] : bg.stops });
          } else patch({ mode: next });
        }}
        options={[
          { value: "solid", label: b.solid },
          { value: "transparent", label: b.transparent },
          { value: "gradient", label: b.gradient },
        ]}
      />
      {bg.mode === "solid" ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-[0.8125rem] font-medium">{b.color}</span>
          <ColorPicker label={b.color} value={bg.color} onChange={(color) => patch({ color })} className="w-36" />
        </div>
      ) : null}
      {isGradient ? (
        <FillEditor
          label={b.color}
          fill={{ mode: bg.mode as Fill["mode"], color: bg.color, rotation: bg.rotation, stops: bg.stops }}
          onChange={(fill) => patch({ mode: fill.mode === "solid" ? "solid" : fill.mode, color: fill.color, rotation: fill.rotation, stops: fill.stops })}
        />
      ) : null}
      {bg.mode === "transparent" ? (
        <p className="rounded-xl border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">{b.transparentHint}</p>
      ) : (
        <SliderField label={b.radius} value={Math.round(bg.radius * 100)} min={0} max={100} step={1} onChange={(v) => patch({ radius: v / 100 })} format={(v) => `${n(v)}%`} />
      )}
    </div>
  );
}

function ShapesSection() {
  const { m } = useI18n();
  const s = m.design.shape;
  const dots = useEditor((st) => st.design.dots.style);
  const squares = useEditor((st) => st.design.cornerSquares.style);
  const cdots = useEditor((st) => st.design.cornerDots.style);
  return (
    <div className="grid gap-5">
      <StyleSelector
        label={s.dots}
        value={dots}
        onChange={(style) => update((d) => ({ ...d, dots: { ...d.dots, style } }))}
        options={DOT_STYLES.map((style) => ({ value: style, label: s.styles[style], icon: <DotStyleIcon style={style} /> }))}
      />
      <StyleSelector
        label={s.cornerSquares}
        value={squares}
        onChange={(style) => update((d) => ({ ...d, cornerSquares: { ...d.cornerSquares, style } }))}
        options={CORNER_SQUARE_STYLES.map((style) => ({ value: style, label: s.styles[style], icon: <CornerSquareIcon style={style} /> }))}
      />
      <StyleSelector
        label={s.cornerDots}
        value={cdots}
        onChange={(style) => update((d) => ({ ...d, cornerDots: { ...d.cornerDots, style } }))}
        options={CORNER_DOT_STYLES.map((style) => ({ value: style, label: s.styles[style], icon: <CornerDotIcon style={style} /> }))}
      />
    </div>
  );
}

function LayoutSection() {
  const { m, n, t } = useI18n();
  const margin = useEditor((s) => s.design.margin);
  const shape = useEditor((s) => s.design.shape);
  const tooSmall = margin < MARGIN_LIMITS.minimumSafe;
  return (
    <div className="grid gap-5">
      <SliderField
        label={m.design.margin.label}
        aside={<InfoTip label={m.design.margin.label}>{m.design.margin.hint}</InfoTip>}
        value={margin}
        min={MARGIN_LIMITS.min}
        max={MARGIN_LIMITS.max}
        step={1}
        onChange={(value) => update((d) => ({ ...d, margin: value }))}
        format={(v) => t(m.design.margin.modules, { value: n(v) })}
        tone={tooSmall ? "warning" : "default"}
        hint={tooSmall ? <span className="text-warning">{m.design.margin.tooSmall}</span> : m.design.margin.hint}
      />
      <div className="grid gap-2">
        <span className="text-[0.8125rem] font-medium">{m.design.shape.qrShape}</span>
        <Segmented<QRDesign["shape"]>
          label={m.design.shape.qrShape}
          value={shape}
          onChange={(next) => update((d) => ({ ...d, shape: next }))}
          options={[
            { value: "square", label: m.design.shape.square },
            { value: "circle", label: m.design.shape.circle },
          ]}
        />
        {shape === "circle" ? <p className="text-xs text-warning">{m.design.shape.circleHint}</p> : null}
      </div>
    </div>
  );
}

function ErrorCorrectionSection() {
  const { m } = useI18n();
  const e = m.design.ecc;
  const level = useEditor((s) => s.design.errorCorrection);
  const hasLogo = useEditor((s) => Boolean(s.design.logo.src));
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-1">
        <span className="text-[0.8125rem] font-medium">{e.label}</span>
        <InfoTip label={e.label}>{e.tooltip}</InfoTip>
      </div>
      <RadioGroup.Root
        value={level}
        onValueChange={(value) => update((d) => ({ ...d, errorCorrection: value as ErrorCorrectionLevel }))}
        aria-label={e.label}
        className="grid grid-cols-2 gap-2"
      >
        {ERROR_CORRECTION_LEVELS.map((value) => (
          <RadioGroup.Item
            key={value}
            value={value}
            className={cn(
              "flex flex-col items-start gap-0.5 rounded-xl border bg-card p-3 text-start transition-all outline-none hover:border-foreground/20 focus-visible:ring-3 focus-visible:ring-ring/50",
              "data-[state=checked]:border-brand data-[state=checked]:bg-brand-soft/60",
            )}
          >
            <span className="flex w-full items-center justify-between gap-2 text-sm font-semibold">
              {e.levels[value].name}
              <span className="rounded-md bg-muted px-1.5 font-mono text-[0.6875rem] text-muted-foreground">{value}</span>
            </span>
            <span className="text-xs text-muted-foreground">{e.levels[value].description}</span>
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
      {hasLogo && level !== "H" ? <p className="text-xs text-warning">{m.design.logo.recommendEcc}</p> : null}
    </div>
  );
}

export function DesignPanel() {
  const { m } = useI18n();
  const hasLogo = useEditor((s) => Boolean(s.design.logo.src));
  return (
    <Accordion type="multiple" defaultValue={["presets", "colors"]} className="divide-y">
      <AccordionItem value="presets" className="border-none">
        <SectionTrigger icon={<Sparkles />}>{m.design.presets}</SectionTrigger>
        <AccordionContent className="px-4 pt-1 pb-5 md:px-5">
          <PresetsPanel />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="colors" className="border-none">
        <SectionTrigger icon={<Paintbrush />}>{m.design.colors}</SectionTrigger>
        <AccordionContent className="px-4 pt-1 pb-5 md:px-5">
          <ColorsSection />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="background" className="border-none">
        <SectionTrigger icon={<PaintBucket />}>{m.design.background}</SectionTrigger>
        <AccordionContent className="px-4 pt-1 pb-5 md:px-5">
          <BackgroundSection />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="shapes" className="border-none">
        <SectionTrigger icon={<Shapes />}>{m.design.shapes}</SectionTrigger>
        <AccordionContent className="px-4 pt-1 pb-5 md:px-5">
          <ShapesSection />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="logo" className="border-none">
        <SectionTrigger
          icon={<ImageIcon />}
          badge={hasLogo ? <span className="size-1.5 rounded-full bg-brand" aria-hidden /> : null}
        >
          {m.design.logoSection}
        </SectionTrigger>
        <AccordionContent className="px-4 pt-1 pb-5 md:px-5">
          <LogoPanel />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="layout" className="border-none">
        <SectionTrigger icon={<LayoutGrid />}>{m.design.layout}</SectionTrigger>
        <AccordionContent className="px-4 pt-1 pb-5 md:px-5">
          <LayoutSection />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="ecc" className="border-none">
        <SectionTrigger icon={<ShieldCheck />}>{m.design.errorCorrection}</SectionTrigger>
        <AccordionContent className="px-4 pt-1 pb-5 md:px-5">
          <ErrorCorrectionSection />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
