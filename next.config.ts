import type { NextConfig } from "next";

/**
 * Two build targets share this codebase:
 *
 * - Server (default: `npm run build`): full Next.js server with the locale
 *   proxy and the optional file-upload API.
 * - GitHub Pages (`npm run build:pages`): fully static export served from a
 *   sub-path (https://<user>.github.io/<repo>/). Server-only files use the
 *   `.server.ts` extension and are left out of this build.
 */
const isPagesBuild = process.env.DEPLOY_TARGET === "github-pages" || process.env.npm_lifecycle_event === "build:pages";

const basePath = isPagesBuild ? (process.env.PAGES_BASE_PATH ?? "/QR-Code-Studio").replace(/\/+$/, "") : "";
const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || (isPagesBuild ? `https://salar-dev.github.io${basePath}` : "http://localhost:3000")
).replace(/\/+$/, "");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  // Only directives that don't restrict scripts, so pages stay statically prerendered.
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=(), geolocation=(self)" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    globalNotFound: true,
  },
  // `*.server.ts` route files (proxy, upload API) exist only in the server build.
  pageExtensions: isPagesBuild ? ["tsx", "ts"] : ["tsx", "ts", "server.ts"],
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_SITE_URL: siteUrl,
    NEXT_PUBLIC_STATIC_EXPORT: isPagesBuild ? "true" : "false",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  ...(isPagesBuild
    ? {
        output: "export" as const,
        basePath,
        // `/en/` → `en/index.html`, which every static host resolves.
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {
        // Static hosts (GitHub Pages) can't send custom headers.
        async headers() {
          return [{ source: "/:path*", headers: securityHeaders }];
        },
      }),
};

export default nextConfig;
