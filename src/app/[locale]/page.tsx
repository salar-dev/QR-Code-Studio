import { notFound } from "next/navigation";
import { BadgeCheck, FileDown, Layers, Palette } from "lucide-react";
import { AppHeader } from "@/components/app/app-header";
import { SiteFooter } from "@/components/app/site-footer";
import { Studio } from "@/components/studio/studio";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { DEVELOPER, localePath, REPOSITORY_URL, SITE_URL } from "@/lib/site";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const m = await getMessages(locale);

  const features = [
    { icon: Layers, ...m.intro.features.types },
    { icon: Palette, ...m.intro.features.design },
    { icon: BadgeCheck, ...m.intro.features.verify },
    { icon: FileDown, ...m.intro.features.export },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: m.app.name,
    description: m.app.metaDescription,
    url: `${SITE_URL}${localePath(locale)}`,
    applicationCategory: "DesignApplication",
    operatingSystem: "Any",
    inLanguage: locale,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    author: { "@type": "Person", name: DEVELOPER.name, url: DEVELOPER.github },
    codeRepository: REPOSITORY_URL,
  };

  return (
    <>
      <a
        href="#editor"
        className="sr-only z-50 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:start-2"
      >
        {m.app.skipToEditor}
      </a>
      <AppHeader />
      <main id="editor" tabIndex={-1} className="outline-none">
        <h1 className="sr-only">{m.app.metaTitle}</h1>
        <Studio />
        <section aria-labelledby="intro-title" className="mx-auto max-w-[1680px] px-4 pb-32 md:pb-16 lg:px-6">
          <div className="rounded-3xl border bg-card px-5 py-10 shadow-panel md:px-10 md:py-12">
            <div className="max-w-2xl">
              <p className="text-xs font-medium tracking-wide text-brand uppercase">{m.intro.eyebrow}</p>
              <h2 id="intro-title" className="mt-3 text-2xl font-semibold tracking-tight text-balance md:text-3xl">
                {m.intro.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-pretty text-muted-foreground md:text-base">{m.intro.description}</p>
            </div>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map(({ icon: Icon, title, description }) => (
                <li key={title} className="rounded-2xl border bg-background/60 p-4">
                  <span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand">
                    <Icon className="size-4.5" aria-hidden />
                  </span>
                  <h3 className="mt-3 text-sm font-semibold">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
                </li>
              ))}
            </ul>
          </div>
          <SiteFooter m={m} />
        </section>
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </>
  );
}
