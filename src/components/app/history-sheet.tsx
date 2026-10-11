"use client";

import { History, QrCode, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useI18n } from "@/i18n/provider";
import { loadSnapshot, setContentType } from "@/lib/store/editor-store";
import { clearHistory, deleteHistoryEntry, useHistory, type HistoryEntry } from "@/lib/store/library-store";
import { CONTENT_TYPE_ICONS } from "../studio/content/type-meta";

function relativeTime(timestamp: number, locale: string): string {
  const diff = (timestamp - Date.now()) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [unit, seconds] of units) {
    if (Math.abs(diff) >= seconds) return format.format(Math.round(diff / seconds), unit);
  }
  return format.format(Math.round(diff), "second");
}

function HistoryItem({ entry }: { entry: HistoryEntry }) {
  const { m, locale } = useI18n();
  const Icon = CONTENT_TYPE_ICONS[entry.contentType];
  return (
    <li className="flex items-center gap-3 rounded-xl border bg-card p-2.5">
      <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg border bg-checker-sm">
        {entry.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element -- stored data URL
          <img src={entry.thumbnail} alt="" className="size-full object-contain" />
        ) : (
          <QrCode className="size-6 text-muted-foreground" aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <Icon className="size-3.5 text-muted-foreground" aria-hidden />
          {m.contentTypes[entry.contentType].label}
          <span className="rounded bg-muted px-1 font-mono text-[0.625rem] text-muted-foreground uppercase">{entry.format}</span>
        </p>
        <p className="ltr-value truncate font-mono text-[0.6875rem] text-muted-foreground">{entry.label || m.history.hiddenContent}</p>
        <p className="text-[0.6875rem] text-muted-foreground">{relativeTime(entry.createdAt, locale)}</p>
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            loadSnapshot({ content: entry.content ?? undefined, design: entry.design });
            // Private content wasn't stored: open the matching (empty) form instead.
            if (!entry.content) setContentType(entry.contentType);
            toast.success(m.history.restored);
          }}
        >
          {m.history.open}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => deleteHistoryEntry(entry.id)} aria-label={`${m.history.delete}`}>
          <Trash2 aria-hidden />
        </Button>
      </div>
    </li>
  );
}

export function HistorySheet() {
  const { m, dir } = useI18n();
  const history = useHistory();
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={m.header.history} className="gap-1.5">
          <History aria-hidden />
          <span className="hidden sm:inline">{m.header.history}</span>
        </Button>
      </SheetTrigger>
      <SheetContent side={dir === "rtl" ? "left" : "right"} closeLabel={m.common.close} className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>{m.history.title}</SheetTitle>
          <SheetDescription>{m.history.description}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          {history.length === 0 ? (
            <div className="grid place-items-center gap-3 py-16 text-center">
              <History className="size-8 text-muted-foreground/60" aria-hidden />
              <p className="max-w-56 text-sm text-muted-foreground">{m.history.empty}</p>
            </div>
          ) : (
            <ul className="grid gap-2">
              {history.map((entry) => (
                <HistoryItem key={entry.id} entry={entry} />
              ))}
            </ul>
          )}
        </div>
        {history.length > 0 ? (
          <div className="border-t p-4">
            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={clearHistory}>
              <Trash2 aria-hidden /> {m.history.clear}
            </Button>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
