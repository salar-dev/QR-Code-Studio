"use client";

import { useEffect, useMemo, useRef } from "react";
import { encodeContent } from "@/lib/qr/content/encoders";
import { resolveScanBackground } from "@/lib/qr/design/backdrop";
import { RASTER_FORMATS } from "@/lib/qr/export/types";
import { QrCapacityError } from "@/lib/qr/render/matrix";
import { renderStore, retryRender, useRender } from "@/lib/qr/render/render-store";
import { QrSizeError, renderQrSvg } from "@/lib/qr/render/renderer";
import { analyzeDesign } from "@/lib/qr/validation/analyze";
import { useEditor } from "@/lib/store/editor-store";

const RENDER_DEBOUNCE_MS = 110;
const VERIFY_DELAY_MS = 250;
const URL_RELEASE_DELAY_MS = 4000;
const AUTO_RETRY_LIMIT = 2;
const AUTO_RETRY_DELAY_MS = 1500;

function onIdle(callback: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(callback, { timeout: 800 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(callback, 16);
  return () => window.clearTimeout(id);
}

/**
 * Drives live rendering: encodes content, renders the SVG (debounced),
 * runs design checks and verifies the result by decoding it. Mount once.
 */
export function useQrPipeline(title: string) {
  const content = useEditor((s) => s.content);
  const design = useEditor((s) => s.design);
  const size = useEditor((s) => s.exportSettings.size);
  const format = useEditor((s) => s.exportSettings.format);
  const backdrop = useEditor((s) => s.preview.backdrop);
  const customBackdrop = useEditor((s) => s.preview.customBackdrop);

  const retryToken = useRender((s) => s.retryToken);
  const encoded = useMemo(() => encodeContent(content), [content]);
  const scanBackground = resolveScanBackground(backdrop, customBackdrop);
  const tokenRef = useRef(0);
  const autoRetriesRef = useRef(0);

  // 1. Render whenever the payload, design or size changes.
  useEffect(() => {
    const token = ++tokenRef.current;
    if (encoded.status !== "ok") {
      renderStore.setState((s) => ({
        ...s,
        phase: encoded.status === "empty" ? "empty" : "invalid",
        encode: encoded,
        error: null,
      }));
      return;
    }

    renderStore.setState((s) => ({ ...s, phase: "rendering", encode: encoded }));
    const timer = window.setTimeout(async () => {
      try {
        const result = await renderQrSvg({ payload: encoded.payload, design, size, title });
        if (token !== tokenRef.current) return;
        autoRetriesRef.current = 0;
        const url = URL.createObjectURL(new Blob([result.svg], { type: "image/svg+xml" }));
        const previousUrl = renderStore.getState().url;
        renderStore.setState((s) => ({
          ...s,
          phase: "ready",
          svg: result.svg,
          url,
          layout: result.layout,
          version: result.version,
          payload: encoded.payload,
          decode: { state: "pending" },
          error: null,
        }));
        if (previousUrl) window.setTimeout(() => URL.revokeObjectURL(previousUrl), URL_RELEASE_DELAY_MS);
      } catch (error) {
        if (token !== tokenRef.current) return;
        const phase = error instanceof QrCapacityError ? "too-long" : error instanceof QrSizeError ? "too-small" : "error";
        if (phase === "error") {
          console.error("[qr] render failed", error);
          // Transient failures (e.g. a chunk that failed to load) heal on retry.
          if (autoRetriesRef.current < AUTO_RETRY_LIMIT) {
            autoRetriesRef.current += 1;
            window.setTimeout(retryRender, AUTO_RETRY_DELAY_MS);
          }
        }
        renderStore.setState((s) => ({
          ...s,
          phase,
          error: error instanceof Error ? error.message : String(error),
        }));
      }
    }, RENDER_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [encoded, design, size, title, retryToken]);

  // 2. Static design analysis (cheap, synchronous). Re-runs on new renders
  //    and when settings that only affect the checks change.
  useEffect(() => {
    const update = () => {
      const state = renderStore.getState();
      if (state.phase !== "ready" || !state.layout) return;
      const issues = analyzeDesign({
        design,
        layout: state.layout,
        version: state.version,
        scanBackground,
        rasterExport: RASTER_FORMATS.includes(format),
      });
      renderStore.setState((s) => ({ ...s, issues }));
    };
    update();
    let lastSvg = renderStore.getState().svg;
    return renderStore.subscribe(() => {
      const next = renderStore.getState().svg;
      if (next !== lastSvg) {
        lastSvg = next;
        update();
      }
    });
  }, [design, scanBackground, format]);

  // 3. Decode verification, scheduled when the main thread is idle.
  useEffect(() => {
    let cancelIdle: (() => void) | undefined;
    let timer: number | undefined;
    let cancelled = false;

    const schedule = () => {
      window.clearTimeout(timer);
      cancelIdle?.();
      const state = renderStore.getState();
      if (state.phase !== "ready" || !state.svg || !state.layout) return;
      const { svg: currentSvg, layout, payload } = state;
      renderStore.setState((s) => ({ ...s, decode: { state: "pending" } }));
      timer = window.setTimeout(() => {
        cancelIdle = onIdle(async () => {
          try {
            // The decoder is sizeable, so it loads on first use rather than with the page.
            const { verifyRenderedQr } = await import("@/lib/qr/validation/verify");
            const result = await verifyRenderedQr(currentSvg, layout, payload, scanBackground);
            if (cancelled || renderStore.getState().svg !== currentSvg) return;
            renderStore.setState((s) => ({ ...s, decode: result }));
          } catch {
            if (cancelled || renderStore.getState().svg !== currentSvg) return;
            renderStore.setState((s) => ({ ...s, decode: { state: "unreadable" } }));
          }
        });
      }, VERIFY_DELAY_MS);
    };

    schedule();
    let lastSvg = renderStore.getState().svg;
    const unsubscribe = renderStore.subscribe(() => {
      const next = renderStore.getState().svg;
      if (next !== lastSvg) {
        lastSvg = next;
        schedule();
      }
    });
    return () => {
      cancelled = true;
      unsubscribe();
      window.clearTimeout(timer);
      cancelIdle?.();
    };
  }, [scanBackground]);
}
