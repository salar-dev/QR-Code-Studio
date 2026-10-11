/**
 * QR content model.
 *
 * Every content type keeps its own form state so that switching between
 * types never discards what the user already typed. Content is completely
 * independent from the visual design (see `../design/types.ts`).
 */

export const CONTENT_TYPES = [
  "url",
  "text",
  "file",
  "email",
  "phone",
  "sms",
  "whatsapp",
  "wifi",
  "vcard",
  "location",
  "event",
  "social",
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

export interface UrlContent {
  url: string;
}

export interface TextContent {
  text: string;
}

export type FileMode = "link" | "upload";

export interface FileContent {
  mode: FileMode;
  /** Public URL of an externally hosted file. */
  linkUrl: string;
  /** Public URL returned by the upload endpoint. */
  uploadedUrl: string;
  uploadedName: string;
  uploadedSize: number;
}

export interface EmailContent {
  to: string;
  subject: string;
  body: string;
}

export interface PhoneContent {
  phone: string;
}

export type SmsFormat = "smsto" | "sms-uri";

export interface SmsContent {
  phone: string;
  message: string;
  format: SmsFormat;
}

export interface WhatsAppContent {
  phone: string;
  message: string;
}

export type WifiEncryption = "WPA" | "WEP" | "nopass";

export interface WifiContent {
  ssid: string;
  password: string;
  encryption: WifiEncryption;
  hidden: boolean;
}

export interface VCardContent {
  firstName: string;
  lastName: string;
  organization: string;
  title: string;
  phone: string;
  email: string;
  website: string;
  street: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  note: string;
}

export type LocationFormat = "geo" | "google" | "apple";

export interface LocationContent {
  latitude: string;
  longitude: string;
  name: string;
  format: LocationFormat;
}

export interface EventContent {
  title: string;
  /** `YYYY-MM-DDTHH:mm` (local time) or `YYYY-MM-DD` when `allDay`. */
  start: string;
  end: string;
  allDay: boolean;
  location: string;
  description: string;
}

export const SOCIAL_PLATFORMS = [
  "instagram",
  "facebook",
  "tiktok",
  "youtube",
  "x",
  "linkedin",
  "telegram",
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export interface SocialContent {
  platform: SocialPlatform;
  /** Username/handle or a full profile URL. */
  handle: string;
}

export interface ContentState {
  type: ContentType;
  url: UrlContent;
  text: TextContent;
  file: FileContent;
  email: EmailContent;
  phone: PhoneContent;
  sms: SmsContent;
  whatsapp: WhatsAppContent;
  wifi: WifiContent;
  vcard: VCardContent;
  location: LocationContent;
  event: EventContent;
  social: SocialContent;
}

/** Machine-readable validation codes. UI maps them to localized messages. */
export type ValidationCode =
  | "required"
  | "urlInvalid"
  | "urlProtocol"
  | "urlHost"
  | "emailInvalid"
  | "phoneInvalid"
  | "ssidTooLong"
  | "wpaPasswordLength"
  | "wepPasswordLength"
  | "latitudeRange"
  | "longitudeRange"
  | "numberInvalid"
  | "dateInvalid"
  | "endBeforeStart"
  | "socialHandleInvalid"
  | "socialDomainMismatch"
  | "nameOrOrgRequired";

export type FieldErrors = Partial<Record<string, ValidationCode>>;

export type EncodeResult =
  | { status: "empty" }
  | { status: "invalid"; errors: FieldErrors }
  | { status: "ok"; payload: string; warnings: FieldErrors };
