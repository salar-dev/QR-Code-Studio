import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { THEME_SCRIPT } from "@/components/theme/theme-script";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isLocale, LOCALE_META, LOCALES } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { I18nProvider } from "@/i18n/provider";
import { DEVELOPER, localePath, SITE_URL } from "@/lib/site";
import { fontVariables } from "../fonts";
import "../globals.css";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const m = await getMessages(locale);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: m.app.metaTitle, template: `%s · ${m.app.name}` },
    description: m.app.metaDescription,
    applicationName: m.app.name,
    keywords: ["QR code generator", "QR code designer", "custom QR code", "QR code with logo", "SVG QR code", "Wi-Fi QR code", "vCard QR code"],
    authors: [{ name: DEVELOPER.name, url: DEVELOPER.github }],
    creator: DEVELOPER.name,
    alternates: {
      canonical: localePath(locale),
      languages: { en: localePath("en"), ar: localePath("ar"), "x-default": localePath("en") },
    },
    openGraph: {
      type: "website",
      url: localePath(locale),
      siteName: m.app.name,
      title: m.app.metaTitle,
      description: m.app.metaDescription,
      locale: locale === "ar" ? "ar_AR" : "en_US",
      alternateLocale: locale === "ar" ? ["en_US"] : ["ar_AR"],
      images: [{ url: "/og.png", width: 1200, height: 630, alt: m.app.tagline }],
    },
    twitter: {
      card: "summary_large_image",
      title: m.app.metaTitle,
      description: m.app.metaDescription,
      images: ["/og.png"],
    },
    formatDetection: { telephone: false, email: false, address: false },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbfd" },
    { media: "(prefers-color-scheme: dark)", color: "#141417" },
  ],
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = await getMessages(locale);
  const { dir, htmlLang } = LOCALE_META[locale];

  return (
    <html lang={htmlLang} dir={dir} className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        <I18nProvider locale={locale} messages={messages}>
          <TooltipProvider delayDuration={300}>
            {children}
            <Toaster position={dir === "rtl" ? "bottom-left" : "bottom-right"} dir={dir} />
          </TooltipProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
