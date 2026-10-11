import { canvasToBlob, rasterizeSvg } from "../render/rasterize";
import { MIME_TYPES, type ExportSettings } from "./types";

export type ExportErrorCode = "unsupportedFormat" | "emptyFile" | "pdfFailed" | "rasterFailed";

export class ExportError extends Error {
  constructor(
    public readonly code: ExportErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ExportError";
  }
}

let webpSupport: boolean | null = null;

/** Safari < 17 and some embedded browsers silently fall back to PNG for WebP. */
export function canEncodeWebp(): boolean {
  if (webpSupport !== null) return webpSupport;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    webpSupport = canvas.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    webpSupport = false;
  }
  return webpSupport;
}

async function rasterExport(svg: string, settings: ExportSettings, background?: string): Promise<Blob> {
  const mime = MIME_TYPES[settings.format];
  let canvas: HTMLCanvasElement;
  try {
    canvas = await rasterizeSvg(svg, settings.size, background);
  } catch (error) {
    throw new ExportError("rasterFailed", error instanceof Error ? error.message : String(error));
  }
  const quality = settings.format === "png" ? undefined : Math.min(1, Math.max(0.5, settings.quality));
  const blob = await canvasToBlob(canvas, mime, quality);
  // Release the backing store of large canvases promptly.
  canvas.width = canvas.height = 0;
  if (!blob || blob.size === 0) throw new ExportError("emptyFile", "The browser produced an empty file.");
  if (blob.type !== mime) {
    throw new ExportError("unsupportedFormat", `This browser cannot encode ${settings.format.toUpperCase()} images.`);
  }
  return blob;
}

const MM_PER_INCH = 25.4;

async function pdfExport(svg: string, settings: ExportSettings, title: string): Promise<Blob> {
  const [{ jsPDF }, { svg2pdf }] = await Promise.all([import("jspdf"), import("svg2pdf.js")]);
  const pageFormat = settings.pdfPage === "fit" ? undefined : settings.pdfPage;

  // Keep a 10 mm margin on standard pages.
  const pageLimit = settings.pdfPage === "letter" ? 8.5 * MM_PER_INCH - 20 : settings.pdfPage === "a4" ? 190 : 1000;
  const sizeMm = Math.min(Math.max(10, settings.pdfSizeMm), pageLimit);

  const pdf = new jsPDF({
    unit: "mm",
    format: pageFormat ?? [sizeMm, sizeMm],
    orientation: "portrait",
    compress: true,
  });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const x = (pageWidth - sizeMm) / 2;
  const y = pageFormat ? Math.min(30, (pageHeight - sizeMm) / 2) : 0;

  const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
  if (parsed.querySelector("parsererror")) throw new ExportError("pdfFailed", "The QR SVG could not be parsed.");

  // svg2pdf resolves references (gradients, clip paths) through the DOM.
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:fixed;left:-10000px;top:0;width:0;height:0;overflow:hidden;";
  const element = document.importNode(parsed.documentElement, true);
  host.appendChild(element);
  document.body.appendChild(host);
  try {
    await svg2pdf(element, pdf, { x, y, width: sizeMm, height: sizeMm });
  } catch (error) {
    throw new ExportError("pdfFailed", error instanceof Error ? error.message : String(error));
  } finally {
    host.remove();
  }

  pdf.setProperties({ title, subject: "QR code", creator: "QR Code Studio" });
  const blob = pdf.output("blob");
  if (!blob || blob.size === 0) throw new ExportError("emptyFile", "The PDF is empty.");
  return blob;
}

/**
 * Converts the rendered SVG into the requested file format. The SVG must have
 * been rendered at `settings.size` so geometry matches the preview exactly.
 */
export async function createExportBlob(svg: string, settings: ExportSettings, title = "QR code"): Promise<Blob> {
  switch (settings.format) {
    case "svg": {
      const blob = new Blob([svg], { type: MIME_TYPES.svg });
      if (blob.size === 0) throw new ExportError("emptyFile", "The SVG is empty.");
      return blob;
    }
    case "png":
    case "webp":
      return rasterExport(svg, settings);
    case "jpeg":
      // JPEG has no alpha channel: transparent areas get the chosen fill.
      return rasterExport(svg, settings, settings.jpegBackground);
    case "pdf":
      return pdfExport(svg, settings, title);
  }
}

/** Triggers a browser download and releases the object URL afterwards. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Safari may still be reading the URL right after click().
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Small PNG data URL used for local design thumbnails. */
export async function createThumbnail(svg: string, size = 96): Promise<string> {
  const canvas = await rasterizeSvg(svg, size);
  const url = canvas.toDataURL("image/png");
  canvas.width = canvas.height = 0;
  return url;
}
