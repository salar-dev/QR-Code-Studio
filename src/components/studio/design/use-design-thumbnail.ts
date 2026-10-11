"use client";

import { useEffect, useReducer } from "react";
import type { QRDesign } from "@/lib/qr/design/types";
import { renderQrSvg } from "@/lib/qr/render/renderer";

const SAMPLE_PAYLOAD = "https://qr.studio";
const THUMB_SIZE = 168;
const cache = new Map<string, string>();
let queue: Promise<unknown> = Promise.resolve();

/** Renders a small preview of a design with the real renderer (cached, serialized). */
export function useDesignThumbnail(key: string, design: QRDesign): string | null {
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    if (cache.has(key)) return;
    let active = true;
    queue = queue
      .then(async () => {
        if (cache.has(key)) return;
        // Thumbnails use a slim quiet zone so the pattern stays legible at small sizes.
        const { svg } = await renderQrSvg({ payload: SAMPLE_PAYLOAD, design: { ...design, margin: 2 }, size: THUMB_SIZE });
        cache.set(key, URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })));
      })
      .catch(() => undefined)
      .then(() => {
        if (active) rerender();
      });
    return () => {
      active = false;
    };
  }, [key, design]);

  return cache.get(key) ?? null;
}
