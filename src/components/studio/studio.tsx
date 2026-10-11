"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Download, Palette, Type } from "lucide-react";
import { domAnimation, LazyMotion, MotionConfig } from "motion/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useI18n } from "@/i18n/provider";
import { initEditorPersistence } from "@/lib/store/editor-store";
import { initLibraryPersistence } from "@/lib/store/library-store";
import { ContentPanel } from "./content/content-panel";
import { ExportPanel } from "./export/export-panel";
import { MobileDock } from "./mobile-dock";
import { PreviewStage } from "./preview/preview-stage";
import { useQrPipeline } from "./use-qr-pipeline";

type EditorTab = "content" | "design" | "export";

const loadDesignPanel = () => import("./design/design-panel");

// The design tools aren't visible on first load: split them into their own chunk.
const DesignPanel = dynamic(() => loadDesignPanel().then((mod) => mod.DesignPanel), {
  loading: () => (
    <div className="grid gap-3 p-5" aria-busy="true">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  ),
});

const panel = "rounded-2xl border bg-card shadow-panel";

export function Studio() {
  const { m } = useI18n();
  const [tab, setTab] = useState<EditorTab>("content");
  const isWide = useMediaQuery("(min-width: 1280px)");

  // Restore the previous session before the first paint after hydration.
  useLayoutEffect(() => {
    initEditorPersistence();
    initLibraryPersistence();
  }, []);

  useQrPipeline(m.app.name);

  // Warm the design chunk once the browser is idle so opening the tab is instant.
  useEffect(() => {
    const prefetch = () => void loadDesignPanel();
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(prefetch, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(prefetch, 2000);
    return () => window.clearTimeout(id);
  }, []);

  // The export tab only exists below the three-column breakpoint.
  const activeTab: EditorTab = isWide && tab === "export" ? "content" : tab;

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <div className="mx-auto grid max-w-[1680px] items-start gap-4 px-3 pt-3 pb-8 sm:px-4 md:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] md:pb-10 lg:gap-6 lg:px-6 lg:pt-6 xl:grid-cols-[25rem_minmax(0,1fr)_21rem] 2xl:grid-cols-[27rem_minmax(0,1fr)_22rem]">
          <section aria-label={m.tabs.content} className="min-w-0">
            <Tabs value={activeTab} onValueChange={(value) => setTab(value as EditorTab)} className="gap-3">
              <TabsList className="sticky top-[3.75rem] z-30 h-12 w-full group-data-horizontal/tabs:h-12 md:group-data-horizontal/tabs:h-11 rounded-xl border bg-card/90 p-1 shadow-panel backdrop-blur-xl md:static md:z-auto md:bg-muted md:shadow-none md:backdrop-blur-none">
                <TabsTrigger value="content" className="h-full rounded-lg" data-testid="tab-content">
                  <Type aria-hidden /> {m.tabs.content}
                </TabsTrigger>
                <TabsTrigger value="design" className="h-full rounded-lg" data-testid="tab-design">
                  <Palette aria-hidden /> {m.tabs.design}
                </TabsTrigger>
                <TabsTrigger value="export" className="h-full rounded-lg xl:hidden" data-testid="tab-export">
                  <Download aria-hidden /> {m.tabs.export}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="content" className={panel}>
                <ContentPanel />
              </TabsContent>
              <TabsContent value="design" className={`${panel} overflow-hidden`}>
                <DesignPanel />
              </TabsContent>
              <TabsContent value="export" className={`${panel} xl:hidden`}>
                <ExportPanel />
              </TabsContent>
            </Tabs>
          </section>

          <section aria-label={m.preview.title} className="hidden min-w-0 md:sticky md:top-[4.75rem] md:block">
            <div className={`${panel} bg-dot-grid p-4 md:max-h-[calc(100dvh-6rem)] md:overflow-y-auto md:scrollbar-thin lg:p-5`}>
              <PreviewStage />
            </div>
          </section>

          <aside aria-label={m.export.title} className="hidden min-w-0 xl:sticky xl:top-[4.75rem] xl:block">
            <div className={`${panel} max-h-[calc(100dvh-6rem)] overflow-y-auto scrollbar-thin`}>
              <ExportPanel />
            </div>
          </aside>
        </div>
        <MobileDock />
      </MotionConfig>
    </LazyMotion>
  );
}
