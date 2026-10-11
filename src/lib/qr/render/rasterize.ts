/**
 * Browser-only helpers that rasterize the rendered SVG. Every raster output
 * (preview checks, PNG/JPEG/WebP export, validation) goes through the same SVG,
 * so exports always match the preview.
 */

async function loadSvgImage(svg: string): Promise<{ image: HTMLImageElement; release: () => void }> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  const image = new Image();
  image.decoding = "async";
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("The QR image could not be rasterized."));
      image.src = url;
    });
    // Ensure nested images (logos) are decoded before drawing (WebKit quirk).
    await image.decode().catch(() => undefined);
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
  return { image, release: () => URL.revokeObjectURL(url) };
}

/** Largest canvas edge accepted. iOS Safari limits canvases to ~16.7 MP. */
export const MAX_CANVAS_EDGE = 4096;

/**
 * Draws the SVG on a canvas of `size` × `size`. A `background` color is
 * painted first only when given; otherwise transparent pixels stay
 * transparent (real alpha channel).
 */
export async function rasterizeSvg(svg: string, size: number, background?: string): Promise<HTMLCanvasElement> {
  const edge = Math.min(Math.max(1, Math.round(size)), MAX_CANVAS_EDGE);
  const { image, release } = await loadSvgImage(svg);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = edge;
    canvas.height = edge;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context is unavailable.");
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, edge, edge);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, 0, 0, edge, edge);
    return canvas;
  } finally {
    release();
  }
}

export function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
}
