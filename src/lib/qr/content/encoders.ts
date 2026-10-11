import {
  formatCoordinate,
  isValidEmail,
  normalizePhone,
  normalizeWebUrl,
  parseDecimal,
  toAsciiDigits,
  utf8ByteLength,
} from "./normalize";
import type {
  ContentState,
  EmailContent,
  EncodeResult,
  EventContent,
  FieldErrors,
  FileContent,
  LocationContent,
  PhoneContent,
  SmsContent,
  SocialContent,
  SocialPlatform,
  TextContent,
  UrlContent,
  VCardContent,
  WhatsAppContent,
  WifiContent,
} from "./types";

const EMPTY: EncodeResult = { status: "empty" };

function ok(payload: string, warnings: FieldErrors = {}): EncodeResult {
  return { status: "ok", payload, warnings };
}

function invalid(errors: FieldErrors): EncodeResult {
  return { status: "invalid", errors };
}

const isBlank = (value: string) => value.trim().length === 0;

/* ------------------------------------------------------------------ */
/* URL / Text / File                                                   */
/* ------------------------------------------------------------------ */

export function encodeUrl({ url }: UrlContent): EncodeResult {
  if (isBlank(url)) return EMPTY;
  const result = normalizeWebUrl(url);
  return result.ok ? ok(result.value) : invalid({ url: result.code });
}

export function encodeText({ text }: TextContent): EncodeResult {
  if (isBlank(text)) return EMPTY;
  // Normalize line endings so the payload is stable across platforms.
  return ok(text.replace(/\r\n?/g, "\n"));
}

export function encodeFile(content: FileContent): EncodeResult {
  if (content.mode === "upload") {
    if (isBlank(content.uploadedUrl)) return EMPTY;
    const result = normalizeWebUrl(content.uploadedUrl);
    return result.ok ? ok(result.value) : invalid({ uploadedUrl: result.code });
  }
  if (isBlank(content.linkUrl)) return EMPTY;
  const result = normalizeWebUrl(content.linkUrl);
  return result.ok ? ok(result.value) : invalid({ linkUrl: result.code });
}

/* ------------------------------------------------------------------ */
/* Email (RFC 6068 mailto:)                                            */
/* ------------------------------------------------------------------ */

function encodeMailtoAddress(address: string): string {
  // "@" is allowed unescaped in the addr-spec part of a mailto URI.
  return encodeURIComponent(address).replace(/%40/g, "@");
}

/** RFC 6068 requires CRLF line breaks in the body, percent-encoded. */
function encodeMailtoValue(value: string): string {
  return encodeURIComponent(value.replace(/\r\n?|\n/g, "\r\n"));
}

export function encodeEmail({ to, subject, body }: EmailContent): EncodeResult {
  if (isBlank(to) && isBlank(subject) && isBlank(body)) return EMPTY;
  const recipients = to
    .split(/[,;]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (recipients.length === 0) return invalid({ to: "required" });
  if (!recipients.every(isValidEmail)) return invalid({ to: "emailInvalid" });

  const params: string[] = [];
  if (!isBlank(subject)) params.push(`subject=${encodeMailtoValue(subject.trim())}`);
  if (!isBlank(body)) params.push(`body=${encodeMailtoValue(body)}`);

  const addresses = recipients.map(encodeMailtoAddress).join(",");
  return ok(`mailto:${addresses}${params.length ? `?${params.join("&")}` : ""}`);
}

/* ------------------------------------------------------------------ */
/* Phone (RFC 3966 tel:) / SMS / WhatsApp                              */
/* ------------------------------------------------------------------ */

export function encodePhone({ phone }: PhoneContent): EncodeResult {
  if (isBlank(phone)) return EMPTY;
  const result = normalizePhone(phone);
  return result.ok ? ok(`tel:${result.value}`) : invalid({ phone: result.code });
}

export function encodeSms({ phone, message, format }: SmsContent): EncodeResult {
  if (isBlank(phone) && isBlank(message)) return EMPTY;
  const result = normalizePhone(phone);
  if (!result.ok) return invalid({ phone: result.code });
  const text = message.replace(/\r\n?/g, "\n");

  if (format === "sms-uri") {
    // RFC 5724
    return ok(`sms:${result.value}${text ? `?body=${encodeURIComponent(text)}` : ""}`);
  }
  // SMSTO:number:message — the de-facto format read by iOS, Android and ZXing.
  return ok(`SMSTO:${result.value}:${text}`);
}

export function encodeWhatsApp({ phone, message }: WhatsAppContent): EncodeResult {
  if (isBlank(phone) && isBlank(message)) return EMPTY;
  const text = message.trim() ? `?text=${encodeURIComponent(message.replace(/\r\n?/g, "\n"))}` : "";

  if (isBlank(phone)) {
    // wa.me without a number lets the user pick the recipient.
    return ok(`https://wa.me/${text}`);
  }
  const result = normalizePhone(phone);
  if (!result.ok) return invalid({ phone: result.code });
  // wa.me requires the full international number, digits only.
  const digits = result.value.replace(/^\+/, "");
  if (digits.length < 6) return invalid({ phone: "phoneInvalid" });
  return ok(`https://wa.me/${digits}${text}`);
}

/* ------------------------------------------------------------------ */
/* Wi-Fi (ZXing "WIFI:" format)                                        */
/* ------------------------------------------------------------------ */

/** Escapes the special characters `\ ; , : "` with a backslash. */
export function escapeWifiValue(value: string): string {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

export function encodeWifi({ ssid, password, encryption, hidden }: WifiContent): EncodeResult {
  if (ssid.length === 0 && password.length === 0) return EMPTY;
  const errors: FieldErrors = {};
  if (ssid.length === 0) errors.ssid = "required";
  else if (utf8ByteLength(ssid) > 32) errors.ssid = "ssidTooLong";

  if (encryption === "WPA") {
    const isHexKey = /^[0-9a-f]{64}$/i.test(password);
    if (password.length === 0) errors.password = "required";
    else if (!isHexKey && (password.length < 8 || password.length > 63)) {
      errors.password = "wpaPasswordLength";
    }
  } else if (encryption === "WEP") {
    const validWep =
      [5, 13, 16, 29].includes(password.length) || /^([0-9a-f]{10}|[0-9a-f]{26}|[0-9a-f]{32}|[0-9a-f]{58})$/i.test(password);
    if (password.length === 0) errors.password = "required";
    else if (!validWep) errors.password = "wepPasswordLength";
  }
  if (Object.keys(errors).length > 0) return invalid(errors);

  const parts = [`T:${encryption}`, `S:${escapeWifiValue(ssid)}`];
  if (encryption !== "nopass") parts.push(`P:${escapeWifiValue(password)}`);
  if (hidden) parts.push("H:true");
  return ok(`WIFI:${parts.join(";")};;`);
}

/* ------------------------------------------------------------------ */
/* vCard 3.0 (RFC 2426)                                                */
/* ------------------------------------------------------------------ */

/** Escapes text values for vCard / iCalendar content lines. */
export function escapeContentLineText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n?|\n/g, "\\n");
}

export function encodeVCard(card: VCardContent): EncodeResult {
  const values = Object.values(card) as string[];
  if (values.every(isBlank)) return EMPTY;

  const errors: FieldErrors = {};
  const first = card.firstName.trim();
  const last = card.lastName.trim();
  const org = card.organization.trim();
  if (!first && !last && !org) errors.firstName = "nameOrOrgRequired";

  let phone: string | null = null;
  if (!isBlank(card.phone)) {
    const result = normalizePhone(card.phone);
    if (result.ok) phone = result.value;
    else errors.phone = result.code;
  }
  if (!isBlank(card.email) && !isValidEmail(card.email)) errors.email = "emailInvalid";

  let website: string | null = null;
  if (!isBlank(card.website)) {
    const result = normalizeWebUrl(card.website);
    if (result.ok) website = result.value;
    else errors.website = result.code;
  }
  if (Object.keys(errors).length > 0) return invalid(errors);

  const e = escapeContentLineText;
  const fullName = [first, last].filter(Boolean).join(" ") || org;
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `N:${e(last)};${e(first)};;;`, `FN:${e(fullName)}`];
  if (org) lines.push(`ORG:${e(org)}`);
  if (!isBlank(card.title)) lines.push(`TITLE:${e(card.title.trim())}`);
  if (phone) lines.push(`TEL;TYPE=CELL:${phone}`);
  if (!isBlank(card.email)) lines.push(`EMAIL;TYPE=INTERNET:${card.email.trim()}`);
  if (website) lines.push(`URL:${website}`);

  const address = [card.street, card.city, card.region, card.postalCode, card.country].map((v) => v.trim());
  if (address.some(Boolean)) {
    // ADR: PO box; extended; street; locality; region; postal code; country
    lines.push(`ADR;TYPE=WORK:;;${address.map(e).join(";")}`);
  }
  if (!isBlank(card.note)) lines.push(`NOTE:${e(card.note.trim())}`);
  lines.push("END:VCARD");
  return ok(lines.join("\r\n"));
}

/* ------------------------------------------------------------------ */
/* Location (RFC 5870 geo: or map links)                               */
/* ------------------------------------------------------------------ */

export function encodeLocation({ latitude, longitude, name, format }: LocationContent): EncodeResult {
  if (isBlank(latitude) && isBlank(longitude)) return EMPTY;
  const errors: FieldErrors = {};
  const lat = parseDecimal(latitude);
  const lng = parseDecimal(longitude);

  if (isBlank(latitude)) errors.latitude = "required";
  else if (lat === null) errors.latitude = "numberInvalid";
  else if (lat < -90 || lat > 90) errors.latitude = "latitudeRange";

  if (isBlank(longitude)) errors.longitude = "required";
  else if (lng === null) errors.longitude = "numberInvalid";
  else if (lng < -180 || lng > 180) errors.longitude = "longitudeRange";

  if (Object.keys(errors).length > 0 || lat === null || lng === null) return invalid(errors);

  const coords = `${formatCoordinate(lat)},${formatCoordinate(lng)}`;
  const label = name.trim();

  switch (format) {
    case "google":
      return ok(`https://www.google.com/maps/search/?api=1&query=${coords}`);
    case "apple":
      return ok(`https://maps.apple.com/?ll=${coords}&q=${encodeURIComponent(label || coords)}`);
    case "geo":
    default:
      return ok(label ? `geo:${coords}?q=${coords}(${encodeURIComponent(label)})` : `geo:${coords}`);
  }
}

/* ------------------------------------------------------------------ */
/* Calendar event (RFC 5545 iCalendar)                                 */
/* ------------------------------------------------------------------ */

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

/** Parses a `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm[:ss]` string as LOCAL time. */
export function parseLocalDateTime(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(toAsciiDigits(value.trim()));
  if (!match) return null;
  const [, y, mo, d, h = "0", mi = "0", s = "0"] = match;
  const date = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
  // Reject overflowed dates such as 2026-02-31.
  if (date.getFullYear() !== Number(y) || date.getMonth() !== Number(mo) - 1 || date.getDate() !== Number(d)) {
    return null;
  }
  return date;
}

/** `YYYYMMDDTHHMMSSZ` in UTC. */
export function formatICalUtc(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/** `YYYYMMDD` from local calendar fields. */
export function formatICalDate(date: Date): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

export function encodeEvent(event: EventContent): EncodeResult {
  const { title, start, end, allDay, location, description } = event;
  if ([title, start, end, location, description].every(isBlank)) return EMPTY;

  const errors: FieldErrors = {};
  if (isBlank(title)) errors.title = "required";

  const startDate = isBlank(start) ? null : parseLocalDateTime(allDay ? start.slice(0, 10) : start);
  if (isBlank(start)) errors.start = "required";
  else if (!startDate) errors.start = "dateInvalid";

  let endDate: Date | null = null;
  if (!isBlank(end)) {
    endDate = parseLocalDateTime(allDay ? end.slice(0, 10) : end);
    if (!endDate) errors.end = "dateInvalid";
    else if (startDate && endDate.getTime() < startDate.getTime()) errors.end = "endBeforeStart";
  }
  if (Object.keys(errors).length > 0 || !startDate) return invalid(errors);

  const e = escapeContentLineText;
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT", `SUMMARY:${e(title.trim())}`];

  if (allDay) {
    // DTEND is exclusive for all-day events: the day after the last day.
    const lastDay = endDate ?? startDate;
    const exclusiveEnd = new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate() + 1);
    lines.push(`DTSTART;VALUE=DATE:${formatICalDate(startDate)}`);
    lines.push(`DTEND;VALUE=DATE:${formatICalDate(exclusiveEnd)}`);
  } else {
    lines.push(`DTSTART:${formatICalUtc(startDate)}`);
    if (endDate) lines.push(`DTEND:${formatICalUtc(endDate)}`);
  }
  if (!isBlank(location)) lines.push(`LOCATION:${e(location.trim())}`);
  if (!isBlank(description)) lines.push(`DESCRIPTION:${e(description.trim())}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return ok(lines.join("\r\n"));
}

/* ------------------------------------------------------------------ */
/* Social profiles                                                     */
/* ------------------------------------------------------------------ */

interface PlatformSpec {
  hosts: string[];
  profileUrl: (handle: string) => string;
  handlePattern: RegExp;
}

export const SOCIAL_PLATFORM_SPECS: Record<SocialPlatform, PlatformSpec> = {
  instagram: {
    hosts: ["instagram.com", "instagr.am"],
    profileUrl: (h) => `https://www.instagram.com/${h}`,
    handlePattern: /^[A-Za-z0-9._]{1,30}$/,
  },
  facebook: {
    hosts: ["facebook.com", "fb.com", "fb.me", "m.facebook.com"],
    profileUrl: (h) => `https://www.facebook.com/${h}`,
    handlePattern: /^[A-Za-z0-9.\-]{1,80}$/,
  },
  tiktok: {
    hosts: ["tiktok.com"],
    profileUrl: (h) => `https://www.tiktok.com/@${h}`,
    handlePattern: /^[A-Za-z0-9._]{1,24}$/,
  },
  youtube: {
    hosts: ["youtube.com", "youtu.be", "m.youtube.com"],
    profileUrl: (h) => `https://www.youtube.com/@${h}`,
    handlePattern: /^[A-Za-z0-9._\-]{1,100}$/,
  },
  x: {
    hosts: ["x.com", "twitter.com"],
    profileUrl: (h) => `https://x.com/${h}`,
    handlePattern: /^[A-Za-z0-9_]{1,15}$/,
  },
  linkedin: {
    hosts: ["linkedin.com"],
    profileUrl: (h) => `https://www.linkedin.com/in/${h}`,
    handlePattern: /^[A-Za-z0-9\-_%]{3,100}$/,
  },
  telegram: {
    hosts: ["t.me", "telegram.me"],
    profileUrl: (h) => `https://t.me/${h}`,
    handlePattern: /^[A-Za-z0-9_]{4,32}$/,
  },
};

function looksLikeUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || /^[\w-]+(\.[\w-]+)+\//.test(value) || /^(www\.)?[\w-]+\.[a-z]{2,}(\/|$)/i.test(value);
}

export function encodeSocial({ platform, handle }: SocialContent): EncodeResult {
  const value = handle.trim();
  if (!value) return EMPTY;
  const spec = SOCIAL_PLATFORM_SPECS[platform];

  if (looksLikeUrl(value)) {
    const result = normalizeWebUrl(value);
    if (!result.ok) return invalid({ handle: result.code });
    const host = new URL(result.value).hostname.replace(/^www\./, "");
    const matches = spec.hosts.some((h) => host === h || host.endsWith(`.${h}`));
    return ok(result.value, matches ? {} : { handle: "socialDomainMismatch" });
  }

  const username = value.replace(/^@/, "");
  if (!spec.handlePattern.test(username)) return invalid({ handle: "socialHandleInvalid" });
  return ok(spec.profileUrl(username));
}

/* ------------------------------------------------------------------ */

/** Encodes the active content type into the exact string stored in the QR code. */
export function encodeContent(state: ContentState): EncodeResult {
  switch (state.type) {
    case "url":
      return encodeUrl(state.url);
    case "text":
      return encodeText(state.text);
    case "file":
      return encodeFile(state.file);
    case "email":
      return encodeEmail(state.email);
    case "phone":
      return encodePhone(state.phone);
    case "sms":
      return encodeSms(state.sms);
    case "whatsapp":
      return encodeWhatsApp(state.whatsapp);
    case "wifi":
      return encodeWifi(state.wifi);
    case "vcard":
      return encodeVCard(state.vcard);
    case "location":
      return encodeLocation(state.location);
    case "event":
      return encodeEvent(state.event);
    case "social":
      return encodeSocial(state.social);
  }
}
