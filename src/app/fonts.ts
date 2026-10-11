import { Geist, Geist_Mono, IBM_Plex_Sans_Arabic } from "next/font/google";

export const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });

export const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap", preload: false });

/**
 * Arabic glyphs only download when Arabic text is rendered (unicode-range),
 * so English pages don't pay for this font.
 */
export const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

export const fontVariables = `${geistSans.variable} ${geistMono.variable} ${plexArabic.variable}`;
