import { format } from "@/i18n/format";
import type { Messages } from "@/i18n/messages/en";
import { DEVELOPER } from "@/lib/site";
import { GitHubIcon } from "./github-icon";

export function SiteFooter({ m }: { m: Messages }) {
  const profileLabel = format(m.footer.githubProfile, { name: DEVELOPER.name });
  return (
    <footer className="mt-8 flex flex-col items-center gap-4 border-t pt-6 text-center text-xs text-muted-foreground md:flex-row md:justify-between md:text-start">
      <p className="flex items-center gap-2">
        <span>{m.footer.developedBy}</span>
        <a
          href={DEVELOPER.github}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-sm font-medium text-foreground transition-colors outline-none hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/50"
          dir="ltr"
        >
          {DEVELOPER.name}
        </a>
        <a
          href={DEVELOPER.github}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={profileLabel}
          title={profileLabel}
          className="grid size-8 place-items-center rounded-full border bg-card text-foreground/80 transition-colors outline-none hover:border-foreground/20 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <GitHubIcon className="size-4" />
        </a>
      </p>
      <div className="grid gap-1 md:justify-items-end">
        <p>{m.footer.privacy}</p>
        <p>{m.footer.note}</p>
      </div>
    </footer>
  );
}
