import Link from "next/link";
import { LogoMark } from "@/components/app/logo";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_META, LOCALES } from "@/i18n/config";
import en from "@/i18n/messages/en";
import { BASE_PATH, IS_STATIC_EXPORT, localePath } from "@/lib/site";

/** Mirrors the server proxy: saved language cookie first, then browser languages. */
const REDIRECT_SCRIPT = `(function(){var s=${JSON.stringify(LOCALES)},l=${JSON.stringify(DEFAULT_LOCALE)};try{var m=document.cookie.match(/(?:^|; )${LOCALE_COOKIE}=([^;]+)/);if(m&&s.indexOf(m[1])>-1){l=m[1]}else{var n=navigator.languages||[navigator.language||""];for(var i=0;i<n.length;i++){var c=String(n[i]).toLowerCase().split("-")[0];if(s.indexOf(c)>-1){l=c;break}}}}catch(e){}location.replace(${JSON.stringify(
  BASE_PATH,
)}+"/"+l+${JSON.stringify(IS_STATIC_EXPORT ? "/" : "")}+location.search+location.hash)})();`;

export default function EntryPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: REDIRECT_SCRIPT }} />
      <main className="w-full max-w-sm rounded-2xl border bg-card p-8 text-center shadow-float">
        <LogoMark className="mx-auto size-12" />
        <h1 className="mt-4 text-xl font-semibold tracking-tight">{en.app.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{en.app.tagline}</p>
        <nav aria-label={en.header.language} className="mt-6 grid grid-cols-2 gap-2">
          {LOCALES.map((locale) => (
            <Link
              key={locale}
              href={localePath(locale)}
              lang={locale}
              dir={LOCALE_META[locale].dir}
              className="inline-flex h-10 items-center justify-center rounded-lg border bg-background text-sm font-medium transition-colors hover:bg-accent"
            >
              {LOCALE_META[locale].label}
            </Link>
          ))}
        </nav>
      </main>
    </>
  );
}
