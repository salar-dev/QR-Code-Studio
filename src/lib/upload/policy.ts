/**
 * Upload policy shared by the server route and the client UI. File types are
 * verified by their content signature ("magic bytes"), never by the declared
 * MIME type or extension alone. Active content (HTML, SVG, scripts,
 * executables, archives) is never accepted because uploaded files are served
 * publicly from the storage domain.
 */

export const DEFAULT_MAX_UPLOAD_MB = 10;

export interface AllowedFileType {
  mime: string;
  extensions: readonly string[];
  /** Human-readable label for the UI. */
  label: string;
}

export const ALLOWED_FILE_TYPES: readonly AllowedFileType[] = [
  { mime: "application/pdf", extensions: ["pdf"], label: "PDF" },
  { mime: "image/png", extensions: ["png"], label: "PNG" },
  { mime: "image/jpeg", extensions: ["jpg", "jpeg"], label: "JPEG" },
  { mime: "image/gif", extensions: ["gif"], label: "GIF" },
  { mime: "image/webp", extensions: ["webp"], label: "WebP" },
  { mime: "audio/mpeg", extensions: ["mp3"], label: "MP3" },
  { mime: "video/mp4", extensions: ["mp4"], label: "MP4" },
  { mime: "text/plain", extensions: ["txt"], label: "TXT" },
  { mime: "text/csv", extensions: ["csv"], label: "CSV" },
  {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extensions: ["docx"],
    label: "DOCX",
  },
  {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    extensions: ["xlsx"],
    label: "XLSX",
  },
  {
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    extensions: ["pptx"],
    label: "PPTX",
  },
];

export const ACCEPT_ATTRIBUTE = ALLOWED_FILE_TYPES.flatMap((t) => [t.mime, ...t.extensions.map((e) => `.${e}`)]).join(",");

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((byte, i) => bytes[offset + i] === byte);
const ascii = (text: string) => Array.from(text, (c) => c.charCodeAt(0));

export function fileExtension(name: string): string {
  const match = /\.([a-z0-9]{1,8})$/i.exec(name.trim());
  return match ? match[1].toLowerCase() : "";
}

function isUtf8Text(bytes: Uint8Array): boolean {
  const sample = bytes.subarray(0, 64 * 1024);
  if (sample.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(sample.length === bytes.length ? sample : bytes);
    return true;
  } catch {
    return false;
  }
}

export interface DetectedType {
  mime: string;
  extension: string;
}

/**
 * Returns the verified type of a file, or null when it is not allowed.
 * The declared extension is only used to pick between formats that share a
 * container (DOCX/XLSX/PPTX are ZIP files; TXT/CSV are plain text).
 */
export function detectFileType(bytes: Uint8Array, fileName: string): DetectedType | null {
  const ext = fileExtension(fileName);
  if (bytes.length === 0) return null;

  if (startsWith(bytes, ascii("%PDF-"))) return { mime: "application/pdf", extension: "pdf" };
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: "image/png", extension: "png" };
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return { mime: "image/jpeg", extension: "jpg" };
  if (startsWith(bytes, ascii("GIF87a")) || startsWith(bytes, ascii("GIF89a"))) return { mime: "image/gif", extension: "gif" };
  if (startsWith(bytes, ascii("RIFF")) && startsWith(bytes, ascii("WEBP"), 8)) return { mime: "image/webp", extension: "webp" };
  if (startsWith(bytes, ascii("ID3")) || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0 && ext === "mp3")) {
    return { mime: "audio/mpeg", extension: "mp3" };
  }
  if (startsWith(bytes, ascii("ftyp"), 4) && ext === "mp4") return { mime: "video/mp4", extension: "mp4" };

  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    const office = ALLOWED_FILE_TYPES.find((t) => ["docx", "xlsx", "pptx"].includes(t.extensions[0]) && t.extensions.includes(ext));
    return office ? { mime: office.mime, extension: ext } : null;
  }

  if ((ext === "txt" || ext === "csv") && isUtf8Text(bytes)) {
    return { mime: ext === "csv" ? "text/csv" : "text/plain", extension: ext };
  }
  return null;
}

/** Cleans a user-provided file name for display (never used as a storage path). */
export function displayFileName(name: string): string {
  return name.replace(/[\u0000-\u001f\u007f<>:"/\\|?*]+/g, "_").slice(0, 120) || "file";
}
