"use client";

import { useEffect, useState } from "react";

/**
 * Returns the newest `url` the browser has finished decoding. While a new
 * image decodes, the previous one stays visible, so swapping the preview
 * never shows a blank or partially painted frame.
 */
export function useDisplayedUrl(url: string | null): string | null {
  const [decoded, setDecoded] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    let active = true;
    const image = new Image();
    image.src = url;
    image
      .decode()
      .catch(() => undefined)
      .then(() => {
        if (active) setDecoded(url);
      });
    return () => {
      active = false;
    };
  }, [url]);

  return url ? decoded : null;
}
