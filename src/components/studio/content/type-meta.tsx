import {
  AtSign,
  CalendarDays,
  Contact,
  FileText,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Phone,
  Type,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import type { ContentType, SocialPlatform } from "@/lib/qr/content/types";

export const CONTENT_TYPE_ICONS: Record<ContentType, LucideIcon> = {
  url: Globe,
  text: Type,
  file: FileText,
  email: Mail,
  phone: Phone,
  sms: MessageSquareText,
  whatsapp: MessageCircle,
  wifi: Wifi,
  vcard: Contact,
  location: MapPin,
  event: CalendarDays,
  social: AtSign,
};

/** Monogram badges (brand colors) used instead of trademarked logos. */
export const SOCIAL_BADGES: Record<SocialPlatform, { mark: string; background: string; color: string }> = {
  instagram: { mark: "IG", background: "linear-gradient(135deg,#f58529,#dd2a7b 50%,#8134af)", color: "#fff" },
  facebook: { mark: "f", background: "#1877f2", color: "#fff" },
  tiktok: { mark: "TT", background: "#000000", color: "#fff" },
  youtube: { mark: "▶", background: "#ff0000", color: "#fff" },
  x: { mark: "X", background: "#0f1419", color: "#fff" },
  linkedin: { mark: "in", background: "#0a66c2", color: "#fff" },
  telegram: { mark: "➤", background: "#229ed9", color: "#fff" },
};
