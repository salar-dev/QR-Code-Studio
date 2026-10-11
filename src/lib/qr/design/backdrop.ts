import type { PreviewBackdrop } from "./types";

export const BACKDROP_COLORS = { light: "#ffffff", dark: "#111114" } as const;

/**
 * Color the code is assumed to be scanned on. Used for validating codes with
 * a transparent (or rounded) background. The checkerboard implies "unknown",
 * so we assume white paper, the most common case.
 */
export function resolveScanBackground(backdrop: PreviewBackdrop, custom: string): string {
  switch (backdrop) {
    case "dark":
      return BACKDROP_COLORS.dark;
    case "custom":
      return custom;
    case "light":
    case "checker":
    default:
      return BACKDROP_COLORS.light;
  }
}
