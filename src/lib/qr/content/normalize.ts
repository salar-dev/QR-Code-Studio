import type { ValidationCode } from "./types";

/**
 * Converts Arabic-Indic (U+0660–U+0669) and Extended Arabic-Indic / Persian
 * (U+06F0–U+06F9) digits to ASCII, and the Arabic decimal separator to ".".
 * Users typing on Arabic keyboards often produce these characters, but QR
 * payloads (tel:, geo:, wa.me) require ASCII digits.
 */
export function toAsciiDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, ".")
    .replace(/٬/g, ",");
}

export type NormalizeResult =
  | { ok: true; value: string }
  | { ok: false; code: ValidationCode };

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;
const HTTP_SCHEME = /^https?:\/\//i;
const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

function isValidHostname(hostname: string): boolean {
  if (!hostname) return false;
  if (hostname === "localhost") return true;
  if (hostname.startsWith("[") && hostname.endsWith("]")) return true; // IPv6
  const ipv4 = IPV4.exec(hostname);
  if (ipv4) return ipv4.slice(1).every((part) => Number(part) <= 255);
  const labels = hostname.split(".");
  if (labels.length < 2 || labels.some((label) => label.length === 0)) return false;
  const tld = labels[labels.length - 1];
  // Hostnames reach us already punycode-encoded by the URL parser.
  return /^(xn--[a-z0-9-]+|[a-z]{2,63})$/i.test(tld);
}

/**
 * Validates and normalizes a website URL. A missing scheme defaults to
 * `https://`. Only http(s) URLs are accepted. The result is the WHATWG
 * serialized form (punycode hosts, percent-encoded paths), which is the most
 * widely compatible representation for QR scanners.
 */
export function normalizeWebUrl(input: string): NormalizeResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, code: "required" };

  let candidate = trimmed;
  if (!HTTP_SCHEME.test(candidate)) {
    if (HAS_SCHEME.test(candidate)) return { ok: false, code: "urlProtocol" };
    if (/^(javascript|data|vbscript|file):/i.test(candidate)) {
      return { ok: false, code: "urlProtocol" };
    }
    candidate = `https://${candidate.replace(/^\/+/, "")}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, code: "urlInvalid" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, code: "urlProtocol" };
  }
  if (parsed.username || parsed.password) return { ok: false, code: "urlInvalid" };
  if (!isValidHostname(parsed.hostname)) return { ok: false, code: "urlHost" };

  return { ok: true, value: parsed.href };
}

/** Normalizes a phone number to `+` followed by digits. */
export function normalizePhone(input: string): NormalizeResult {
  const ascii = toAsciiDigits(input).trim();
  if (!ascii) return { ok: false, code: "required" };
  let compact = ascii.replace(/[\s\-().‎‏‪-‮]/g, "");
  if (compact.startsWith("00")) compact = `+${compact.slice(2)}`;
  if (!/^\+?\d{3,15}$/.test(compact)) return { ok: false, code: "phoneInvalid" };
  return { ok: true, value: compact };
}

const EMAIL = /^[^\s@,;<>()[\]\\"]+@[^\s@,;<>()[\]\\"]+\.[^\s@,;<>()[\]\\".]{2,}$/u;

export function isValidEmail(value: string): boolean {
  return EMAIL.test(value.trim());
}

/** Parses a decimal coordinate, accepting Arabic digits and separators. */
export function parseDecimal(input: string): number | null {
  const ascii = toAsciiDigits(input).trim().replace(/\s+/g, "").replace(/,/g, ".");
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(ascii)) return null;
  const value = Number(ascii);
  return Number.isFinite(value) ? value : null;
}

/** Formats a coordinate with at most 6 decimals (~11 cm precision). */
export function formatCoordinate(value: number): string {
  return String(Number(value.toFixed(6)));
}

export function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}
