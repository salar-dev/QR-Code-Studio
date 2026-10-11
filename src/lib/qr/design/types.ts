/**
 * Visual design model for a QR code. It never contains the encoded data, so
 * the same content can be rendered with any design and vice versa.
 */

export const DOT_STYLES = ["square", "rounded", "extra-rounded", "dots", "classy", "classy-rounded"] as const;
export type DotStyle = (typeof DOT_STYLES)[number];

/** `dot`, `square` and `extra-rounded` are native frame shapes; the rest draw the frame from dots. */
export const CORNER_SQUARE_STYLES = ["square", "extra-rounded", "dot", "rounded", "classy", "classy-rounded", "dots"] as const;
export type CornerSquareStyle = (typeof CORNER_SQUARE_STYLES)[number];

export const CORNER_DOT_STYLES = ["square", "dot", "rounded", "extra-rounded", "classy", "classy-rounded", "dots"] as const;
export type CornerDotStyle = (typeof CORNER_DOT_STYLES)[number];

export const ERROR_CORRECTION_LEVELS = ["L", "M", "Q", "H"] as const;
export type ErrorCorrectionLevel = (typeof ERROR_CORRECTION_LEVELS)[number];

export type QrShape = "square" | "circle";

export interface ColorStop {
  /** 0–1 */
  offset: number;
  /** `#rrggbb` */
  color: string;
}

export type FillMode = "solid" | "linear" | "radial";

/**
 * A fill keeps both its solid color and its gradient so switching modes never
 * loses the user's choices.
 */
export interface Fill {
  mode: FillMode;
  color: string;
  /** Linear gradient direction in degrees (0 = left → right). */
  rotation: number;
  stops: ColorStop[];
}

export type BackgroundMode = "solid" | "transparent" | "linear" | "radial";

export interface BackgroundDesign {
  mode: BackgroundMode;
  color: string;
  rotation: number;
  stops: ColorStop[];
  /** Corner rounding, 0 (square) – 1 (fully round). */
  radius: number;
}

export interface LogoDesign {
  /** Normalized PNG data URL, or null when no logo is set. */
  src: string | null;
  name: string;
  /**
   * Share of the error-correction budget the logo may cover (0.1–0.6).
   * The renderer converts this into a size that hides whole modules only.
   */
  size: number;
  /** Clear space around the logo, in modules. */
  margin: number;
  /** Remove the modules underneath the logo instead of drawing over them. */
  hideBackgroundDots: boolean;
  /** Draw a solid plate behind the logo. */
  backdrop: boolean;
  backdropColor: string;
  /** 0 (square) – 1 (pill/circle). */
  backdropRadius: number;
}

export interface QRDesign {
  dots: { style: DotStyle; fill: Fill };
  cornerSquares: { style: CornerSquareStyle; useMainColor: boolean; fill: Fill };
  cornerDots: { style: CornerDotStyle; useMainColor: boolean; fill: Fill };
  background: BackgroundDesign;
  shape: QrShape;
  /** Quiet zone in modules. The QR specification recommends 4. */
  margin: number;
  errorCorrection: ErrorCorrectionLevel;
  logo: LogoDesign;
}

/** Background the code will be placed on, used for previewing and validation. */
export type PreviewBackdrop = "checker" | "light" | "dark" | "custom";
