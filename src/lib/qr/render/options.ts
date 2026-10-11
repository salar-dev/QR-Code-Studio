import type { Gradient, Options } from "qr-code-styling";
import type { BackgroundDesign, Fill, QRDesign } from "../design/types";
import type { QrLayout } from "./matrix";

const DEG_TO_RAD = Math.PI / 180;

/** Converts a design fill into qr-code-styling's color/gradient pair. */
export function toStylingColor(fill: Fill): { color?: string; gradient?: Gradient } {
  if (fill.mode === "solid") return { color: fill.color, gradient: undefined };
  const stops = [...fill.stops]
    .sort((a, b) => a.offset - b.offset)
    .map((stop) => ({ offset: Math.min(1, Math.max(0, stop.offset)), color: stop.color }));
  return {
    color: undefined,
    gradient: {
      type: fill.mode === "radial" ? "radial" : "linear",
      rotation: fill.mode === "linear" ? fill.rotation * DEG_TO_RAD : 0,
      colorStops: stops,
    },
  };
}

/**
 * A transparent background must produce NO background element at all
 * (an empty color makes the renderer skip the rect), so exported PNG, WebP
 * and SVG files keep a real alpha channel.
 */
export function toStylingBackground(background: BackgroundDesign): Options["backgroundOptions"] {
  const round = Math.min(1, Math.max(0, background.radius));
  if (background.mode === "transparent") return { color: "", gradient: undefined, round };
  if (background.mode === "solid") return { color: background.color, gradient: undefined, round };
  return { ...toStylingColor({ ...background, mode: background.mode }), round };
}

export interface BuildOptionsInput {
  /** Payload already converted with `toQrByteString`. */
  data: string;
  design: QRDesign;
  layout: QrLayout;
}

export function buildStylingOptions({ data, design, layout }: BuildOptionsInput): Options {
  const dotsColor = toStylingColor(design.dots.fill);

  // When corners follow the main color we omit their color entirely, letting
  // the renderer paint them with the same (continuous) gradient as the dots.
  const cornerSquareColor = design.cornerSquares.useMainColor ? {} : toStylingColor(design.cornerSquares.fill);
  const cornerDotFill = design.cornerDots.useMainColor
    ? design.cornerSquares.useMainColor
      ? null
      : design.dots.fill // otherwise the renderer would inherit the corner square color
    : design.cornerDots.fill;
  const cornerDotColor = cornerDotFill ? toStylingColor(cornerDotFill) : {};

  const hasLogo = Boolean(design.logo.src);

  return {
    type: "svg",
    shape: design.shape,
    width: layout.size,
    height: layout.size,
    margin: layout.marginPx,
    data,
    image: hasLogo ? (design.logo.src ?? undefined) : undefined,
    qrOptions: {
      typeNumber: 0,
      errorCorrectionLevel: design.errorCorrection,
    },
    imageOptions: {
      saveAsBlob: true,
      hideBackgroundDots: design.logo.hideBackgroundDots,
      imageSize: design.logo.size,
      margin: Math.round(design.logo.margin * layout.modulePx),
      crossOrigin: "anonymous",
    },
    dotsOptions: {
      type: design.dots.style,
      roundSize: true,
      ...dotsColor,
    },
    cornersSquareOptions: {
      type: design.cornerSquares.style,
      ...cornerSquareColor,
    },
    cornersDotOptions: {
      type: design.cornerDots.style,
      ...cornerDotColor,
    },
    backgroundOptions: toStylingBackground(design.background),
  };
}
