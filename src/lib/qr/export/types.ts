export const EXPORT_FORMATS = ["png", "svg", "pdf", "jpeg", "webp"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const SIZE_PRESETS = [256, 512, 1024, 2048, 4096] as const;
export const SIZE_LIMITS = { min: 128, max: 4096 } as const;

export type PdfPageSize = "fit" | "a4" | "letter";

export interface ExportSettings {
  format: ExportFormat;
  /** Output width/height in pixels (raster) or user units (SVG). */
  size: number;
  fileName: string;
  /** 0.5–1, used by JPEG and WebP. */
  quality: number;
  /** Fill used where JPEG would otherwise need transparency. */
  jpegBackground: string;
  pdfPage: PdfPageSize;
  /** Printed QR width in millimetres for PDF output. */
  pdfSizeMm: number;
}

export const DEFAULT_EXPORT: ExportSettings = {
  format: "png",
  size: 1024,
  fileName: "qr-code",
  quality: 0.92,
  jpegBackground: "#ffffff",
  pdfPage: "fit",
  pdfSizeMm: 50,
};

export const MIME_TYPES: Record<ExportFormat, string> = {
  png: "image/png",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export const FILE_EXTENSIONS: Record<ExportFormat, string> = {
  png: "png",
  svg: "svg",
  pdf: "pdf",
  jpeg: "jpg",
  webp: "webp",
};

export const RASTER_FORMATS: readonly ExportFormat[] = ["png", "jpeg", "webp"];
export const supportsTransparency = (format: ExportFormat) => format !== "jpeg" && format !== "pdf";
export const supportsQuality = (format: ExportFormat) => format === "jpeg" || format === "webp";
