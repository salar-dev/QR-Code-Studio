import { describe, expect, it } from "vitest";
import {
  encodeEmail,
  encodeEvent,
  encodeFile,
  encodeLocation,
  encodePhone,
  encodeSms,
  encodeSocial,
  encodeText,
  encodeUrl,
  encodeVCard,
  encodeWhatsApp,
  encodeWifi,
  escapeWifiValue,
} from "@/lib/qr/content/encoders";
import { DEFAULT_CONTENT } from "@/lib/qr/content/defaults";
import { normalizePhone, normalizeWebUrl, parseDecimal, toAsciiDigits } from "@/lib/qr/content/normalize";

const payload = (result: ReturnType<typeof encodeUrl>) => {
  if (result.status !== "ok") throw new Error(`Expected ok, got ${JSON.stringify(result)}`);
  return result.payload;
};

describe("URL validation and normalization", () => {
  it("adds https:// when the scheme is missing", () => {
    expect(normalizeWebUrl("example.com")).toEqual({ ok: true, value: "https://example.com/" });
    expect(normalizeWebUrl("  www.example.com/path?q=1  ")).toEqual({ ok: true, value: "https://www.example.com/path?q=1" });
  });

  it("keeps http and https and lower-cases the host", () => {
    expect(normalizeWebUrl("http://Example.COM/A")).toEqual({ ok: true, value: "http://example.com/A" });
  });

  it("accepts ports, localhost and IP addresses", () => {
    expect(normalizeWebUrl("example.com:8080/x")).toEqual({ ok: true, value: "https://example.com:8080/x" });
    expect(normalizeWebUrl("http://localhost:3000")).toEqual({ ok: true, value: "http://localhost:3000/" });
    expect(normalizeWebUrl("192.168.1.10")).toEqual({ ok: true, value: "https://192.168.1.10/" });
  });

  it("converts internationalized domains to punycode and percent-encodes paths", () => {
    const result = normalizeWebUrl("https://مثال.إختبار/صفحة");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.startsWith("https://xn--")).toBe(true);
      expect(result.value).toContain("/%D8%B5");
    }
  });

  it("rejects dangerous or unsupported schemes", () => {
    expect(normalizeWebUrl("javascript:alert(1)")).toEqual({ ok: false, code: "urlProtocol" });
    expect(normalizeWebUrl("ftp://example.com")).toEqual({ ok: false, code: "urlProtocol" });
    expect(normalizeWebUrl("data:text/html,hi")).toEqual({ ok: false, code: "urlProtocol" });
  });

  it("rejects hosts without a valid TLD and credentials in URLs", () => {
    expect(normalizeWebUrl("example")).toEqual({ ok: false, code: "urlHost" });
    expect(normalizeWebUrl("https://exa mple.com")).toEqual({ ok: false, code: "urlInvalid" });
    expect(normalizeWebUrl("https://user:pass@example.com")).toEqual({ ok: false, code: "urlInvalid" });
    expect(normalizeWebUrl("999.1.1.1")).toEqual({ ok: false, code: "urlInvalid" });
  });

  it("encodeUrl reports empty input as empty, not invalid", () => {
    expect(encodeUrl({ url: "   " })).toEqual({ status: "empty" });
    expect(encodeUrl({ url: "nope" })).toEqual({ status: "invalid", errors: { url: "urlHost" } });
  });
});

describe("text", () => {
  it("keeps Unicode and normalizes line endings", () => {
    expect(payload(encodeText({ text: "مرحبا\r\nبالعالم 👋" }))).toBe("مرحبا\nبالعالم 👋");
  });
});

describe("file links", () => {
  it("encodes link and uploaded URLs", () => {
    expect(payload(encodeFile({ ...DEFAULT_CONTENT.file, linkUrl: "files.example.com/a.pdf" }))).toBe(
      "https://files.example.com/a.pdf",
    );
    expect(encodeFile({ ...DEFAULT_CONTENT.file, mode: "upload" })).toEqual({ status: "empty" });
  });
});

describe("email (mailto)", () => {
  it("encodes subject and body with RFC 6068 escaping", () => {
    const result = encodeEmail({ to: "hello@example.com", subject: "Hi & welcome", body: "Line 1\nLine 2" });
    expect(payload(result)).toBe("mailto:hello@example.com?subject=Hi%20%26%20welcome&body=Line%201%0D%0ALine%202");
  });

  it("supports multiple recipients and plus addressing", () => {
    expect(payload(encodeEmail({ to: "a+b@x.io, c@y.co", subject: "", body: "" }))).toBe("mailto:a%2Bb@x.io,c@y.co");
  });

  it("validates addresses", () => {
    expect(encodeEmail({ to: "not-an-email", subject: "", body: "" })).toEqual({ status: "invalid", errors: { to: "emailInvalid" } });
    expect(encodeEmail({ to: "", subject: "Hi", body: "" })).toEqual({ status: "invalid", errors: { to: "required" } });
  });
});

describe("phone, SMS and WhatsApp", () => {
  it("normalizes phone numbers including Arabic-Indic digits", () => {
    expect(normalizePhone("+1 (555) 123-4567")).toEqual({ ok: true, value: "+15551234567" });
    expect(normalizePhone("٠٠٩٧١٥٠١٢٣٤٥٦٧")).toEqual({ ok: true, value: "+971501234567" });
    expect(normalizePhone("12")).toEqual({ ok: false, code: "phoneInvalid" });
    expect(normalizePhone("+1 555 abc")).toEqual({ ok: false, code: "phoneInvalid" });
  });

  it("builds tel: URIs", () => {
    expect(payload(encodePhone({ phone: "+44 20 7946 0958" }))).toBe("tel:+442079460958");
  });

  it("builds SMSTO and sms: payloads", () => {
    expect(payload(encodeSms({ phone: "+15551234567", message: "Hi: there", format: "smsto" }))).toBe(
      "SMSTO:+15551234567:Hi: there",
    );
    expect(payload(encodeSms({ phone: "+15551234567", message: "Hi there?", format: "sms-uri" }))).toBe(
      "sms:+15551234567?body=Hi%20there%3F",
    );
  });

  it("builds wa.me links with digits only and encoded text", () => {
    expect(payload(encodeWhatsApp({ phone: "+971 50 123 4567", message: "مرحبا & hi" }))).toBe(
      "https://wa.me/971501234567?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%20%26%20hi",
    );
    expect(payload(encodeWhatsApp({ phone: "", message: "Hello" }))).toBe("https://wa.me/?text=Hello");
  });
});

describe("Wi-Fi", () => {
  it("escapes special characters", () => {
    expect(escapeWifiValue('a;b,c:d\\e"f')).toBe('a\\;b\\,c\\:d\\\\e\\"f');
  });

  it("formats WPA networks", () => {
    expect(payload(encodeWifi({ ssid: "Home;Net", password: "p@ss:word", encryption: "WPA", hidden: false }))).toBe(
      "WIFI:T:WPA;S:Home\\;Net;P:p@ss\\:word;;",
    );
  });

  it("formats hidden and open networks", () => {
    expect(payload(encodeWifi({ ssid: "Cafe", password: "ignored", encryption: "nopass", hidden: true }))).toBe(
      "WIFI:T:nopass;S:Cafe;H:true;;",
    );
  });

  it("validates password lengths and SSID size", () => {
    expect(encodeWifi({ ssid: "Net", password: "short", encryption: "WPA", hidden: false })).toEqual({
      status: "invalid",
      errors: { password: "wpaPasswordLength" },
    });
    expect(encodeWifi({ ssid: "Net", password: "abcde", encryption: "WEP", hidden: false }).status).toBe("ok");
    expect(encodeWifi({ ssid: "شبكة".repeat(5), password: "", encryption: "nopass", hidden: false })).toEqual({
      status: "invalid",
      errors: { ssid: "ssidTooLong" },
    });
  });
});

describe("vCard 3.0", () => {
  it("produces a standards-compliant card with CRLF line endings and escaping", () => {
    const result = encodeVCard({
      ...DEFAULT_CONTENT.vcard,
      firstName: "Jane",
      lastName: "Doe",
      organization: "Acme, Inc.",
      title: "CTO",
      phone: "+1 555 010 9999",
      email: "jane@acme.com",
      website: "acme.com",
      street: "1 Main St; Suite 2",
      city: "Springfield",
      country: "USA",
      note: "Line1\nLine2",
    });
    expect(payload(result)).toBe(
      [
        "BEGIN:VCARD",
        "VERSION:3.0",
        "N:Doe;Jane;;;",
        "FN:Jane Doe",
        "ORG:Acme\\, Inc.",
        "TITLE:CTO",
        "TEL;TYPE=CELL:+15550109999",
        "EMAIL;TYPE=INTERNET:jane@acme.com",
        "URL:https://acme.com/",
        "ADR;TYPE=WORK:;;1 Main St\\; Suite 2;Springfield;;;USA",
        "NOTE:Line1\\nLine2",
        "END:VCARD",
      ].join("\r\n"),
    );
  });

  it("uses the organization as FN when no name is given and supports Arabic", () => {
    const text = payload(encodeVCard({ ...DEFAULT_CONTENT.vcard, organization: "شركة الأمل" }));
    expect(text).toContain("FN:شركة الأمل");
  });

  it("requires a name or organization and validates fields", () => {
    expect(encodeVCard({ ...DEFAULT_CONTENT.vcard, email: "jane@acme.com" })).toEqual({
      status: "invalid",
      errors: { firstName: "nameOrOrgRequired" },
    });
    expect(encodeVCard({ ...DEFAULT_CONTENT.vcard, firstName: "J", email: "bad" })).toEqual({
      status: "invalid",
      errors: { email: "emailInvalid" },
    });
  });
});

describe("location", () => {
  it("parses Arabic digits and decimal separators", () => {
    expect(toAsciiDigits("٢٥٫٢٠٤٨")).toBe("25.2048");
    expect(parseDecimal("٢٥٫٢٠٤٨")).toBe(25.2048);
    expect(parseDecimal("12,5")).toBe(12.5);
    expect(parseDecimal("abc")).toBeNull();
  });

  it("builds geo:, Google and Apple Maps payloads", () => {
    const base = { latitude: "25.1972", longitude: "55.27437", name: "" };
    expect(payload(encodeLocation({ ...base, format: "geo" }))).toBe("geo:25.1972,55.27437");
    expect(payload(encodeLocation({ ...base, name: "Burj Khalifa", format: "geo" }))).toBe(
      "geo:25.1972,55.27437?q=25.1972,55.27437(Burj%20Khalifa)",
    );
    expect(payload(encodeLocation({ ...base, format: "google" }))).toBe(
      "https://www.google.com/maps/search/?api=1&query=25.1972,55.27437",
    );
    expect(payload(encodeLocation({ ...base, name: "Home", format: "apple" }))).toBe(
      "https://maps.apple.com/?ll=25.1972,55.27437&q=Home",
    );
  });

  it("validates ranges", () => {
    expect(encodeLocation({ latitude: "91", longitude: "0", name: "", format: "geo" })).toEqual({
      status: "invalid",
      errors: { latitude: "latitudeRange" },
    });
  });
});

describe("calendar events", () => {
  it("encodes timed events in UTC", () => {
    const result = encodeEvent({
      title: "Launch, v2; final",
      start: "2026-10-11T10:00",
      end: "2026-10-11T11:30",
      allDay: false,
      location: "HQ",
      description: "Bring\nlaptops",
    });
    expect(payload(result)).toBe(
      [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        "SUMMARY:Launch\\, v2\\; final",
        "DTSTART:20261011T100000Z",
        "DTEND:20261011T113000Z",
        "LOCATION:HQ",
        "DESCRIPTION:Bring\\nlaptops",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n"),
    );
  });

  it("encodes all-day events with an exclusive end date", () => {
    const text = payload(encodeEvent({ title: "Holiday", start: "2026-12-31", end: "2027-01-01", allDay: true, location: "", description: "" }));
    expect(text).toContain("DTSTART;VALUE=DATE:20261231");
    expect(text).toContain("DTEND;VALUE=DATE:20270102");
  });

  it("validates dates", () => {
    expect(encodeEvent({ title: "X", start: "2026-02-31T10:00", end: "", allDay: false, location: "", description: "" })).toEqual({
      status: "invalid",
      errors: { start: "dateInvalid" },
    });
    expect(
      encodeEvent({ title: "X", start: "2026-10-11T10:00", end: "2026-10-11T09:00", allDay: false, location: "", description: "" }),
    ).toEqual({ status: "invalid", errors: { end: "endBeforeStart" } });
  });
});

describe("social profiles", () => {
  it("builds profile URLs from handles", () => {
    expect(payload(encodeSocial({ platform: "instagram", handle: "@nasa" }))).toBe("https://www.instagram.com/nasa");
    expect(payload(encodeSocial({ platform: "tiktok", handle: "nasa" }))).toBe("https://www.tiktok.com/@nasa");
    expect(payload(encodeSocial({ platform: "youtube", handle: "@NASA" }))).toBe("https://www.youtube.com/@NASA");
    expect(payload(encodeSocial({ platform: "x", handle: "nasa" }))).toBe("https://x.com/nasa");
    expect(payload(encodeSocial({ platform: "linkedin", handle: "jane-doe" }))).toBe("https://www.linkedin.com/in/jane-doe");
    expect(payload(encodeSocial({ platform: "telegram", handle: "durov" }))).toBe("https://t.me/durov");
    expect(payload(encodeSocial({ platform: "facebook", handle: "nasa" }))).toBe("https://www.facebook.com/nasa");
  });

  it("accepts profile URLs and warns on mismatched platforms", () => {
    expect(encodeSocial({ platform: "x", handle: "twitter.com/nasa" })).toEqual({
      status: "ok",
      payload: "https://twitter.com/nasa",
      warnings: {},
    });
    expect(encodeSocial({ platform: "instagram", handle: "https://example.com/me" })).toEqual({
      status: "ok",
      payload: "https://example.com/me",
      warnings: { handle: "socialDomainMismatch" },
    });
  });

  it("rejects invalid handles", () => {
    expect(encodeSocial({ platform: "x", handle: "this handle is invalid" })).toEqual({
      status: "invalid",
      errors: { handle: "socialHandleInvalid" },
    });
  });
});
