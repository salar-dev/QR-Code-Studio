import type { Metadata } from "next";
import Link from "next/link";
import { THEME_SCRIPT } from "@/components/theme/theme-script";
import en from "@/i18n/messages/en";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: `404 · ${en.app.name}`,
  description: en.notFound.description,
};

export default function GlobalNotFound() {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="grid min-h-dvh place-items-center bg-dot-grid px-4">
        <main className="w-full max-w-sm rounded-2xl border bg-card p-8 text-center shadow-float">
          <p className="font-mono text-sm text-muted-foreground">404</p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">{en.notFound.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{en.notFound.description}</p>
          <Link
            href="/"
            className="mt-6 inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            {en.notFound.back}
          </Link>
        </main>
      </body>
    </html>
  );
}
