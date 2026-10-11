"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { localePath } from "@/lib/site";
import { HistorySheet } from "./history-sheet";
import { LanguageMenu, MoreMenu, ThemeMenu } from "./header-menus";
import { LogoMark } from "./logo";

export function AppHeader() {
  const { m, locale } = useI18n();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-[1680px] items-center justify-between gap-3 px-4 lg:px-6">
        <Link href={localePath(locale)} className="flex min-w-0 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <LogoMark className="size-8 shrink-0" />
          <span className="truncate text-[0.9375rem] font-semibold tracking-tight">{m.app.name}</span>
        </Link>
        <nav aria-label={m.header.menu} className="flex items-center gap-0.5">
          <HistorySheet />
          <LanguageMenu />
          <ThemeMenu />
          <MoreMenu />
        </nav>
      </div>
    </header>
  );
}
