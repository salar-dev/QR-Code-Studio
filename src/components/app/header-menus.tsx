"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, Ellipsis, Languages, Monitor, Moon, RotateCcw, ShieldCheck, Sun, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTheme, type ThemePreference } from "@/components/theme/theme";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { LOCALE_COOKIE, LOCALE_META, LOCALES, type Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import { BASE_PATH, localePath } from "@/lib/site";
import { clearSavedData, resetAll, setPreferences, usePreferences } from "@/lib/store/editor-store";

function rememberLocale(locale: Locale) {
  // Scoped to the app's base path (GitHub Pages hosts several sites per domain).
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=${BASE_PATH || ""}/; max-age=31536000; samesite=lax`;
}

export function LanguageMenu() {
  const { m, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();

  const switchTo = (next: Locale) => {
    if (next === locale) return;
    rememberLocale(next);
    const rest = pathname.replace(/^\/(en|ar)(?=\/|$)/, "");
    router.push(rest && rest !== "/" ? `/${next}${rest}` : localePath(next));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={m.header.language} className="gap-1.5">
          <Languages aria-hidden />
          <span className="hidden sm:inline">{LOCALE_META[locale].label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{m.header.language}</DropdownMenuLabel>
        {LOCALES.map((value) => (
          <DropdownMenuItem key={value} onSelect={() => switchTo(value)} lang={value} dir={LOCALE_META[value].dir}>
            <span className="flex-1">{LOCALE_META[value].label}</span>
            {value === locale ? <Check aria-hidden /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ThemeMenu() {
  const { m } = useI18n();
  const { preference, resolved, setTheme } = useTheme();
  const Icon = resolved === "dark" ? Moon : Sun;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={m.header.theme}>
          <Icon aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>{m.header.theme}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={preference} onValueChange={(value) => setTheme(value as ThemePreference)}>
          <DropdownMenuRadioItem value="light">
            <Sun aria-hidden /> {m.header.light}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon aria-hidden /> {m.header.dark}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor aria-hidden /> {m.header.system}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PrivacyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { m } = useI18n();
  const p = m.privacy;
  const prefs = usePreferences();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={m.common.close} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{p.title}</DialogTitle>
          <DialogDescription className="leading-relaxed">{p.description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <label className="flex items-start justify-between gap-4 rounded-xl border p-3">
            <span className="grid gap-0.5">
              <span className="text-sm font-medium">{p.rememberSession}</span>
              <span className="text-xs text-muted-foreground">{p.rememberSessionHint}</span>
            </span>
            <Switch checked={prefs.rememberSession} onCheckedChange={(rememberSession) => setPreferences({ rememberSession })} />
          </label>
          <label className="flex items-start justify-between gap-4 rounded-xl border p-3">
            <span className="grid gap-0.5">
              <span className="text-sm font-medium">{p.rememberSensitive}</span>
              <span className="text-xs text-muted-foreground">{p.rememberSensitiveHint}</span>
            </span>
            <Switch checked={prefs.rememberSensitive} disabled={!prefs.rememberSession} onCheckedChange={(rememberSensitive) => setPreferences({ rememberSensitive })} />
          </label>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              clearSavedData();
              toast.success(p.dataCleared);
              onOpenChange(false);
              // Reload so in-memory copies are discarded as well.
              window.setTimeout(() => window.location.reload(), 600);
            }}
          >
            <Trash2 aria-hidden /> {p.clearData}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { m } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={m.common.close}>
        <DialogHeader>
          <DialogTitle>{m.header.resetAll}</DialogTitle>
          <DialogDescription>{m.header.resetConfirm}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {m.common.cancel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              resetAll();
              toast.success(m.header.resetDone);
              onOpenChange(false);
            }}
          >
            <RotateCcw aria-hidden /> {m.common.reset}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MoreMenu() {
  const { m } = useI18n();
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={m.header.menu}>
            <Ellipsis aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onSelect={() => setPrivacyOpen(true)}>
            <ShieldCheck aria-hidden /> {m.header.privacy}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setResetOpen(true)}>
            <RotateCcw aria-hidden /> {m.header.resetAll}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <PrivacyDialog open={privacyOpen} onOpenChange={setPrivacyOpen} />
      <ResetDialog open={resetOpen} onOpenChange={setResetOpen} />
    </>
  );
}
