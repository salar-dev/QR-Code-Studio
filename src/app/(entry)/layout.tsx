import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { THEME_SCRIPT } from "@/components/theme/theme-script";
import { DEFAULT_LOCALE } from "@/i18n/config";
import en from "@/i18n/messages/en";
import { DEVELOPER, localePath, SITE_URL } from "@/lib/site";
import { fontVariables } from "../fonts";
import "../globals.css";

/*
 * Root entry ("/"). On a Node server the proxy redirects "/" before this
 * renders; on static hosting (GitHub Pages) this page picks the language in
 * the browser. It carries full metadata so links to the root URL get a
 * proper search/social preview.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: en.app.metaTitle,
  description: en.app.metaDescription,
  applicationName: en.app.name,
  authors: [{ name: DEVELOPER.name, url: DEVELOPER.github }],
  creator: DEVELOPER.name,
  alternates: {
    canonical: localePath(DEFAULT_LOCALE),
    languages: { en: localePath("en"), ar: localePath("ar"), "x-default": localePath("en") },
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: en.app.name,
    title: en.app.metaTitle,
    description: en.app.metaDescription,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: en.app.tagline }],
  },
  twitter: { card: "summary_large_image", title: en.app.metaTitle, description: en.app.metaDescription, images: ["/og.png"] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbfd" },
    { media: "(prefers-color-scheme: dark)", color: "#141417" },
  ],
};

export default function EntryLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="grid min-h-dvh place-items-center bg-dot-grid px-4">{children}</body>
    </html>
  );
}
