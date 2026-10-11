/*
 * Deployment-dependent values. They are inlined at build time from
 * `next.config.ts` (the `env` block), so they work in both server and
 * browser code.
 */

/** Public origin plus base path, e.g. https://salar-dev.github.io/QR-Code-Studio */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

/** Path prefix when served from a sub-path (GitHub Pages project site), otherwise "". */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** True for the static GitHub Pages build, which has no server features (e.g. uploads). */
export const IS_STATIC_EXPORT = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";

/** Route path of a locale's home page (the static build uses trailing slashes). */
export function localePath(locale: string): string {
  return `/${locale}${IS_STATIC_EXPORT ? "/" : ""}`;
}

export const DEVELOPER = {
  name: "Salar Dev",
  github: "https://github.com/salar-dev",
} as const;

export const REPOSITORY_URL = "https://github.com/salar-dev/QR-Code-Studio";
