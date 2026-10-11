import { MARGIN_LIMITS } from "../design/defaults";
import type { Fill, QRDesign } from "../design/types";
import type { QrLayout } from "../render/matrix";
import { contrastRatio, relativeLuminance } from "./color";

export type IssueSeverity = "error" | "warning" | "notice";

export type IssueCode =
  | "contrastVeryLow"
  | "contrastLow"
  | "contrastModerate"
  | "inverted"
  | "quietZoneTooSmall"
  | "quietZoneBelowRecommended"
  | "logoLarge"
  | "logoLowErrorCorrection"
  | "logoNotHidingDots"
  | "decorativeFinder"
  | "decorativeDots"
  | "circleShape"
  | "highDensity"
  | "moderateDensity"
  | "smallModules"
  | "transparentBackdrop";

export interface ScanIssue {
  code: IssueCode;
  severity: IssueSeverity;
  /** Values interpolated into the localized message. */
  params?: Record<string, string | number>;
}

export interface AnalysisInput {
  design: QRDesign;
  layout: QrLayout;
  version: number;
  /** Color the code will be scanned on when the background is transparent. */
  scanBackground: string;
  /** Raster formats are affected by module pixel size. */
  rasterExport: boolean;
}

function fillColors(fill: Fill): string[] {
  return fill.mode === "solid" ? [fill.color] : fill.stops.map((stop) => stop.color);
}

/** Every color used for dark modules (dots, frames and their inner dots). */
export function foregroundColors(design: QRDesign): string[] {
  const colors = new Set(fillColors(design.dots.fill));
  if (!design.cornerSquares.useMainColor) fillColors(design.cornerSquares.fill).forEach((c) => colors.add(c));
  if (!design.cornerDots.useMainColor) fillColors(design.cornerDots.fill).forEach((c) => colors.add(c));
  return [...colors];
}

/** Colors the light modules will effectively have. */
export function backgroundColors(design: QRDesign, scanBackground: string): string[] {
  const { background } = design;
  if (background.mode === "transparent") return [scanBackground];
  if (background.mode === "solid") return [background.color];
  return background.stops.map((stop) => stop.color);
}

/** Worst-case contrast between any foreground and background color. */
export function worstContrast(design: QRDesign, scanBackground: string): number {
  let worst = 21;
  for (const fg of foregroundColors(design)) {
    for (const bg of backgroundColors(design, scanBackground)) {
      worst = Math.min(worst, contrastRatio(fg, bg));
    }
  }
  return worst;
}

/** True when the dark modules are lighter than the background (a "negative" code). */
export function isInverted(design: QRDesign, scanBackground: string): boolean {
  const avg = (colors: string[]) => colors.reduce((sum, c) => sum + relativeLuminance(c), 0) / colors.length;
  return avg(foregroundColors(design)) > avg(backgroundColors(design, scanBackground));
}

export const CONTRAST_THRESHOLDS = { veryLow: 2, low: 3, good: 4.5 } as const;

/**
 * Heuristic, design-level scannability checks. These complement (never
 * replace) the decode round-trip performed in the browser.
 */
export function analyzeDesign({ design, layout, version, scanBackground, rasterExport }: AnalysisInput): ScanIssue[] {
  const issues: ScanIssue[] = [];
  const ratio = worstContrast(design, scanBackground);
  const rounded = Math.round(ratio * 10) / 10;

  if (ratio < CONTRAST_THRESHOLDS.veryLow) issues.push({ code: "contrastVeryLow", severity: "error", params: { ratio: rounded } });
  else if (ratio < CONTRAST_THRESHOLDS.low) issues.push({ code: "contrastLow", severity: "warning", params: { ratio: rounded } });
  else if (ratio < CONTRAST_THRESHOLDS.good) issues.push({ code: "contrastModerate", severity: "notice", params: { ratio: rounded } });

  if (isInverted(design, scanBackground)) issues.push({ code: "inverted", severity: "notice" });
  if (design.background.mode === "transparent") issues.push({ code: "transparentBackdrop", severity: "notice" });

  const quiet = Math.round(layout.quietZone * 10) / 10;
  if (design.shape === "circle") {
    issues.push({ code: "circleShape", severity: "warning" });
  } else if (layout.quietZone < MARGIN_LIMITS.minimumSafe) {
    issues.push({ code: "quietZoneTooSmall", severity: "warning", params: { modules: quiet } });
  } else if (layout.quietZone < MARGIN_LIMITS.recommended - 0.01) {
    issues.push({ code: "quietZoneBelowRecommended", severity: "notice", params: { modules: quiet } });
  }

  if (design.logo.src) {
    if (design.logo.size > 0.5) issues.push({ code: "logoLarge", severity: "warning" });
    if (design.errorCorrection === "L" || design.errorCorrection === "M") {
      issues.push({ code: "logoLowErrorCorrection", severity: "warning" });
    }
    if (!design.logo.hideBackgroundDots && !design.logo.backdrop) {
      issues.push({ code: "logoNotHidingDots", severity: "notice" });
    }
  }

  const decorativeFinder =
    ["dots", "classy", "classy-rounded"].includes(design.cornerSquares.style) ||
    ["dots", "classy", "classy-rounded"].includes(design.cornerDots.style);
  if (decorativeFinder) issues.push({ code: "decorativeFinder", severity: "warning" });
  if (design.dots.style === "dots" || design.dots.style === "classy") {
    issues.push({ code: "decorativeDots", severity: "notice" });
  }

  if (version >= 25) issues.push({ code: "highDensity", severity: "warning", params: { version } });
  else if (version >= 15) issues.push({ code: "moderateDensity", severity: "notice", params: { version } });

  if (rasterExport && layout.modulePx < 3) {
    issues.push({ code: "smallModules", severity: "warning", params: { px: layout.modulePx } });
  }

  return issues;
}
