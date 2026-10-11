import type { MetadataRoute } from "next";
import { LOCALES } from "@/i18n/config";
import { localePath, SITE_URL } from "@/lib/site";

// Generated once at build time (also required by the static export).
export const dynamic = "force-static";


export default function sitemap(): MetadataRoute.Sitemap {
  return LOCALES.map((locale) => ({
    url: `${SITE_URL}${localePath(locale)}`,
    changeFrequency: "monthly",
    priority: locale === "en" ? 1 : 0.9,
    alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `${SITE_URL}${localePath(l)}`])) },
  }));
}
