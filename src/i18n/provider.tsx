"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { Direction } from "radix-ui";
import { LOCALE_META, type Locale } from "./config";
import { format } from "./format";
import type { Messages } from "./messages/en";

interface I18nValue {
  locale: Locale;
  dir: "ltr" | "rtl";
  m: Messages;
  t: typeof format;
  /** Locale-aware number formatting. */
  n: (value: number, options?: Intl.NumberFormatOptions) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ locale, messages, children }: { locale: Locale; messages: Messages; children: ReactNode }) {
  const value = useMemo<I18nValue>(() => {
    const numberLocale = locale === "ar" ? "ar-u-nu-latn" : locale;
    return {
      locale,
      dir: LOCALE_META[locale].dir,
      m: messages,
      t: format,
      n: (num, options) => new Intl.NumberFormat(numberLocale, options).format(num),
    };
  }, [locale, messages]);

  return (
    <I18nContext.Provider value={value}>
      <Direction.Provider dir={value.dir}>{children}</Direction.Provider>
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside <I18nProvider>.");
  return value;
}
