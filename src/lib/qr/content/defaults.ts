import type { ContentState, ContentType } from "./types";

export const DEFAULT_CONTENT: ContentState = {
  type: "url",
  url: { url: "" },
  text: { text: "" },
  file: { mode: "link", linkUrl: "", uploadedUrl: "", uploadedName: "", uploadedSize: 0 },
  email: { to: "", subject: "", body: "" },
  phone: { phone: "" },
  sms: { phone: "", message: "", format: "smsto" },
  whatsapp: { phone: "", message: "" },
  wifi: { ssid: "", password: "", encryption: "WPA", hidden: false },
  vcard: {
    firstName: "",
    lastName: "",
    organization: "",
    title: "",
    phone: "",
    email: "",
    website: "",
    street: "",
    city: "",
    region: "",
    postalCode: "",
    country: "",
    note: "",
  },
  location: { latitude: "", longitude: "", name: "", format: "geo" },
  event: { title: "", start: "", end: "", allDay: false, location: "", description: "" },
  social: { platform: "instagram", handle: "" },
};

/**
 * Content types whose data is considered private. Their fields are never
 * written to localStorage unless the user explicitly opts in.
 */
export const SENSITIVE_FIELDS: Partial<Record<ContentType, readonly string[]>> = {
  wifi: ["password"],
  vcard: [
    "firstName",
    "lastName",
    "organization",
    "title",
    "phone",
    "email",
    "website",
    "street",
    "city",
    "region",
    "postalCode",
    "country",
    "note",
  ],
};

/** Returns a copy of the content with sensitive fields blanked out. */
export function stripSensitiveContent(content: ContentState): ContentState {
  const copy = structuredClone(content);
  for (const [type, fields] of Object.entries(SENSITIVE_FIELDS)) {
    const section = copy[type as ContentType] as unknown as Record<string, unknown>;
    for (const field of fields ?? []) {
      if (typeof section[field] === "string") section[field] = "";
    }
  }
  return copy;
}
