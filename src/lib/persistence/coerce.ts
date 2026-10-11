import { DEFAULT_CONTENT } from "../qr/content/defaults";
import { CONTENT_TYPES, SOCIAL_PLATFORMS, type ContentState } from "../qr/content/types";
import { DEFAULT_DESIGN } from "../qr/design/defaults";
import {
  CORNER_DOT_STYLES,
  CORNER_SQUARE_STYLES,
  DOT_STYLES,
  ERROR_CORRECTION_LEVELS,
  type BackgroundDesign,
  type ColorStop,
  type Fill,
  type LogoDesign,
  type QRDesign,
} from "../qr/design/types";
import { DEFAULT_EXPORT, EXPORT_FORMATS, SIZE_LIMITS, type ExportSettings } from "../qr/export/types";
import { normalizeHex } from "../qr/validation/color";

/*
 * Data restored from localStorage (or imported) is untrusted: it may be from
 * an older version or hand-edited. These helpers rebuild fully valid objects,
 * falling back to defaults field by field.
 */

type Obj = Record<string, unknown>;
const isObj = (value: unknown): value is Obj => typeof value === "object" && value !== null && !Array.isArray(value);
const obj = (value: unknown): Obj => (isObj(value) ? value : {});

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function num(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

const bool = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);
const color = (value: unknown, fallback: string) => (typeof value === "string" && normalizeHex(value)) || fallback;
const str = (value: unknown, fallback: string, max = 10_000) => (typeof value === "string" ? value.slice(0, max) : fallback);

function coerceStops(value: unknown, fallback: ColorStop[]): ColorStop[] {
  if (!Array.isArray(value)) return fallback;
  const stops = value
    .filter(isObj)
    .slice(0, 6)
    .map((stop) => ({ offset: num(stop.offset, 0, 0, 1), color: color(stop.color, "#000000") }));
  return stops.length >= 2 ? stops : fallback;
}

export function coerceFill(value: unknown, fallback: Fill): Fill {
  const raw = obj(value);
  return {
    mode: oneOf(raw.mode, ["solid", "linear", "radial"] as const, fallback.mode),
    color: color(raw.color, fallback.color),
    rotation: num(raw.rotation, fallback.rotation, 0, 360),
    stops: coerceStops(raw.stops, fallback.stops),
  };
}

function coerceBackground(value: unknown, fallback: BackgroundDesign): BackgroundDesign {
  const raw = obj(value);
  return {
    mode: oneOf(raw.mode, ["solid", "transparent", "linear", "radial"] as const, fallback.mode),
    color: color(raw.color, fallback.color),
    rotation: num(raw.rotation, fallback.rotation, 0, 360),
    stops: coerceStops(raw.stops, fallback.stops),
    radius: num(raw.radius, fallback.radius, 0, 1),
  };
}

function coerceLogo(value: unknown, fallback: LogoDesign): LogoDesign {
  const raw = obj(value);
  const src = typeof raw.src === "string" && raw.src.startsWith("data:image/png;base64,") ? raw.src : null;
  return {
    src,
    name: src ? str(raw.name, "", 200) : "",
    size: num(raw.size, fallback.size, 0.1, 0.6),
    margin: num(raw.margin, fallback.margin, 0, 3),
    hideBackgroundDots: bool(raw.hideBackgroundDots, fallback.hideBackgroundDots),
    backdrop: bool(raw.backdrop, fallback.backdrop),
    backdropColor: color(raw.backdropColor, fallback.backdropColor),
    backdropRadius: num(raw.backdropRadius, fallback.backdropRadius, 0, 1),
  };
}

export function coerceDesign(value: unknown, fallback: QRDesign = DEFAULT_DESIGN): QRDesign {
  const raw = obj(value);
  const dots = obj(raw.dots);
  const squares = obj(raw.cornerSquares);
  const cdots = obj(raw.cornerDots);
  return {
    dots: { style: oneOf(dots.style, DOT_STYLES, fallback.dots.style), fill: coerceFill(dots.fill, fallback.dots.fill) },
    cornerSquares: {
      style: oneOf(squares.style, CORNER_SQUARE_STYLES, fallback.cornerSquares.style),
      useMainColor: bool(squares.useMainColor, fallback.cornerSquares.useMainColor),
      fill: coerceFill(squares.fill, fallback.cornerSquares.fill),
    },
    cornerDots: {
      style: oneOf(cdots.style, CORNER_DOT_STYLES, fallback.cornerDots.style),
      useMainColor: bool(cdots.useMainColor, fallback.cornerDots.useMainColor),
      fill: coerceFill(cdots.fill, fallback.cornerDots.fill),
    },
    background: coerceBackground(raw.background, fallback.background),
    shape: oneOf(raw.shape, ["square", "circle"] as const, fallback.shape),
    margin: Math.round(num(raw.margin, fallback.margin, 0, 10)),
    errorCorrection: oneOf(raw.errorCorrection, ERROR_CORRECTION_LEVELS, fallback.errorCorrection),
    logo: coerceLogo(raw.logo, fallback.logo),
  };
}

/** Copies fields whose type matches the default; enums are validated separately. */
function mergeTyped<T extends object>(defaults: T, value: unknown): T {
  const raw = obj(value);
  const out = { ...defaults } as Record<string, unknown>;
  for (const [key, def] of Object.entries(defaults)) {
    const candidate = raw[key];
    if (typeof def === "string") out[key] = str(candidate, def);
    else if (typeof def === "boolean") out[key] = bool(candidate, def);
    else if (typeof def === "number") out[key] = num(candidate, def, 0, Number.MAX_SAFE_INTEGER);
  }
  return out as T;
}

export function coerceContent(value: unknown): ContentState {
  const raw = obj(value);
  const d = DEFAULT_CONTENT;
  const file = mergeTyped(d.file, raw.file);
  const sms = mergeTyped(d.sms, raw.sms);
  const wifi = mergeTyped(d.wifi, raw.wifi);
  const location = mergeTyped(d.location, raw.location);
  const social = mergeTyped(d.social, raw.social);
  return {
    type: oneOf(raw.type, CONTENT_TYPES, d.type),
    url: mergeTyped(d.url, raw.url),
    text: mergeTyped(d.text, raw.text),
    file: { ...file, mode: oneOf(file.mode, ["link", "upload"] as const, d.file.mode) },
    email: mergeTyped(d.email, raw.email),
    phone: mergeTyped(d.phone, raw.phone),
    sms: { ...sms, format: oneOf(sms.format, ["smsto", "sms-uri"] as const, d.sms.format) },
    whatsapp: mergeTyped(d.whatsapp, raw.whatsapp),
    wifi: { ...wifi, encryption: oneOf(wifi.encryption, ["WPA", "WEP", "nopass"] as const, d.wifi.encryption) },
    vcard: mergeTyped(d.vcard, raw.vcard),
    location: { ...location, format: oneOf(location.format, ["geo", "google", "apple"] as const, d.location.format) },
    event: mergeTyped(d.event, raw.event),
    social: { ...social, platform: oneOf(social.platform, SOCIAL_PLATFORMS, d.social.platform) },
  };
}

export function coerceExport(value: unknown): ExportSettings {
  const raw = obj(value);
  const d = DEFAULT_EXPORT;
  return {
    format: oneOf(raw.format, EXPORT_FORMATS, d.format),
    size: Math.round(num(raw.size, d.size, SIZE_LIMITS.min, SIZE_LIMITS.max)),
    fileName: str(raw.fileName, d.fileName, 120),
    quality: num(raw.quality, d.quality, 0.5, 1),
    jpegBackground: color(raw.jpegBackground, d.jpegBackground),
    pdfPage: oneOf(raw.pdfPage, ["fit", "a4", "letter"] as const, d.pdfPage),
    pdfSizeMm: num(raw.pdfSizeMm, d.pdfSizeMm, 10, 500),
  };
}
