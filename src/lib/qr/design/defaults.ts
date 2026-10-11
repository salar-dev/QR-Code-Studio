import type { BackgroundDesign, Fill, LogoDesign, QRDesign } from "./types";

export const solidFill = (color: string): Fill => ({
  mode: "solid",
  color,
  rotation: 45,
  stops: [
    { offset: 0, color },
    { offset: 1, color },
  ],
});

export const linearFill = (from: string, to: string, rotation = 45): Fill => ({
  mode: "linear",
  color: from,
  rotation,
  stops: [
    { offset: 0, color: from },
    { offset: 1, color: to },
  ],
});

export const radialFill = (inner: string, outer: string): Fill => ({
  mode: "radial",
  color: inner,
  rotation: 0,
  stops: [
    { offset: 0, color: inner },
    { offset: 1, color: outer },
  ],
});

export const solidBackground = (color: string, radius = 0): BackgroundDesign => ({
  mode: "solid",
  color,
  rotation: 90,
  stops: [
    { offset: 0, color },
    { offset: 1, color },
  ],
  radius,
});

export const transparentBackground = (radius = 0): BackgroundDesign => ({
  ...solidBackground("#ffffff", radius),
  mode: "transparent",
});

export const DEFAULT_LOGO: LogoDesign = {
  src: null,
  name: "",
  size: 0.4,
  margin: 0.5,
  hideBackgroundDots: true,
  backdrop: false,
  backdropColor: "#ffffff",
  backdropRadius: 0.25,
};

export const DEFAULT_DESIGN: QRDesign = {
  dots: { style: "square", fill: solidFill("#000000") },
  cornerSquares: { style: "square", useMainColor: true, fill: solidFill("#000000") },
  cornerDots: { style: "square", useMainColor: true, fill: solidFill("#000000") },
  background: solidBackground("#ffffff"),
  shape: "square",
  margin: 4,
  errorCorrection: "M",
  logo: DEFAULT_LOGO,
};

export const MARGIN_LIMITS = { min: 0, max: 10, recommended: 4, minimumSafe: 2 } as const;
export const LOGO_LIMITS = { minSize: 0.1, maxSize: 0.6, maxMargin: 3 } as const;
