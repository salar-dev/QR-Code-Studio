import { linearFill, radialFill, solidBackground, solidFill, transparentBackground } from "./defaults";
import type { PreviewBackdrop, QRDesign } from "./types";

/** The parts of a design a preset controls. Logo, margin and error correction stay untouched. */
export type PresetDesign = Pick<QRDesign, "dots" | "cornerSquares" | "cornerDots" | "background" | "shape">;

export interface DesignPreset {
  id: string;
  design: PresetDesign;
  /** Backdrop that best shows off the preset (e.g. dark for a white code). */
  backdrop?: PreviewBackdrop;
}

export const DESIGN_PRESETS: readonly DesignPreset[] = [
  {
    id: "classic",
    design: {
      dots: { style: "square", fill: solidFill("#000000") },
      cornerSquares: { style: "square", useMainColor: true, fill: solidFill("#000000") },
      cornerDots: { style: "square", useMainColor: true, fill: solidFill("#000000") },
      background: solidBackground("#ffffff"),
      shape: "square",
    },
  },
  {
    id: "minimalWhite",
    backdrop: "dark",
    design: {
      dots: { style: "rounded", fill: solidFill("#ffffff") },
      cornerSquares: { style: "extra-rounded", useMainColor: true, fill: solidFill("#ffffff") },
      cornerDots: { style: "dot", useMainColor: true, fill: solidFill("#ffffff") },
      background: transparentBackground(),
      shape: "square",
    },
  },
  {
    id: "midnight",
    design: {
      dots: { style: "rounded", fill: solidFill("#f8fafc") },
      cornerSquares: { style: "extra-rounded", useMainColor: false, fill: solidFill("#38bdf8") },
      cornerDots: { style: "dot", useMainColor: false, fill: solidFill("#38bdf8") },
      background: solidBackground("#0f172a", 0.08),
      shape: "square",
    },
  },
  {
    id: "ocean",
    design: {
      dots: { style: "rounded", fill: linearFill("#0369a1", "#1e3a8a", 45) },
      cornerSquares: { style: "extra-rounded", useMainColor: false, fill: solidFill("#0c4a6e") },
      cornerDots: { style: "dot", useMainColor: false, fill: solidFill("#0369a1") },
      background: solidBackground("#ffffff"),
      shape: "square",
    },
  },
  {
    id: "forest",
    design: {
      dots: { style: "classy-rounded", fill: solidFill("#166534") },
      cornerSquares: { style: "extra-rounded", useMainColor: false, fill: solidFill("#14532d") },
      cornerDots: { style: "dot", useMainColor: false, fill: solidFill("#15803d") },
      background: solidBackground("#f0fdf4"),
      shape: "square",
    },
  },
  {
    id: "purpleGradient",
    design: {
      dots: { style: "dots", fill: linearFill("#9333ea", "#4f46e5", 135) },
      cornerSquares: { style: "extra-rounded", useMainColor: true, fill: solidFill("#7c3aed") },
      cornerDots: { style: "dot", useMainColor: true, fill: solidFill("#7c3aed") },
      background: solidBackground("#ffffff"),
      shape: "square",
    },
  },
  {
    id: "modernRounded",
    design: {
      dots: { style: "extra-rounded", fill: solidFill("#111827") },
      cornerSquares: { style: "extra-rounded", useMainColor: true, fill: solidFill("#111827") },
      cornerDots: { style: "dot", useMainColor: true, fill: solidFill("#111827") },
      background: solidBackground("#f9fafb", 0.12),
      shape: "square",
    },
  },
  {
    id: "corporate",
    design: {
      dots: { style: "square", fill: solidFill("#1f2937") },
      cornerSquares: { style: "square", useMainColor: false, fill: solidFill("#2563eb") },
      cornerDots: { style: "square", useMainColor: false, fill: solidFill("#2563eb") },
      background: solidBackground("#ffffff"),
      shape: "square",
    },
  },
  {
    id: "vibrant",
    design: {
      dots: { style: "rounded", fill: radialFill("#e11d48", "#c2410c") },
      cornerSquares: { style: "extra-rounded", useMainColor: false, fill: solidFill("#be185d") },
      cornerDots: { style: "dot", useMainColor: false, fill: solidFill("#ea580c") },
      background: solidBackground("#fff7ed"),
      shape: "square",
    },
  },
  {
    id: "monochrome",
    design: {
      dots: { style: "classy", fill: solidFill("#3f3f46") },
      cornerSquares: { style: "square", useMainColor: false, fill: solidFill("#18181b") },
      cornerDots: { style: "square", useMainColor: false, fill: solidFill("#18181b") },
      background: solidBackground("#f4f4f5"),
      shape: "square",
    },
  },
];

export const PRESET_COLOR_PALETTE = [
  "#000000",
  "#ffffff",
  "#111827",
  "#374151",
  "#1e3a8a",
  "#2563eb",
  "#0369a1",
  "#0f766e",
  "#166534",
  "#65a30d",
  "#ca8a04",
  "#c2410c",
  "#dc2626",
  "#be185d",
  "#9333ea",
  "#4f46e5",
] as const;
