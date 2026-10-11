import { FILE_EXTENSIONS, type ExportFormat } from "./types";

const RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)$/i;

/**
 * Produces a safe, cross-platform file name. Unicode (e.g. Arabic) is kept;
 * path separators, control and reserved characters are removed.
 */
export function sanitizeFileName(input: string, fallback = "qr-code"): string {
  let name = input
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]+/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");

  // Drop an extension the user may have typed; the format decides it.
  name = name.replace(/\.(png|svg|pdf|jpe?g|webp)$/i, "");
  if (Array.from(name).length > 80) name = Array.from(name).slice(0, 80).join("");
  if (!name || RESERVED.test(name)) return fallback;
  return name;
}

export function buildFileName(input: string, format: ExportFormat): string {
  return `${sanitizeFileName(input)}.${FILE_EXTENSIONS[format]}`;
}
