"use client";

import { useState, useSyncExternalStore } from "react";
import { Eye, EyeOff, LoaderCircle, LocateFixed, Lock } from "lucide-react";
import { RadioGroup } from "radix-ui";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/i18n/provider";
import { SOCIAL_PLATFORM_SPECS } from "@/lib/qr/content/encoders";
import { formatCoordinate, utf8ByteLength } from "@/lib/qr/content/normalize";
import { SOCIAL_PLATFORMS, type LocationFormat, type SmsFormat, type SocialPlatform, type WifiEncryption } from "@/lib/qr/content/types";
import { patchContent, useEditor } from "@/lib/store/editor-store";
import { cn } from "@/lib/utils";
import { Field } from "../ui/field";
import { Segmented } from "../ui/segmented";
import { TextField, type FormErrorsProps } from "./form-kit";
import { SOCIAL_BADGES } from "./type-meta";

export function UrlForm(props: FormErrorsProps) {
  const { m } = useI18n();
  const value = useEditor((s) => s.content.url);
  return (
    <TextField
      {...props}
      field="url"
      label={m.content.url.url}
      value={value.url}
      onChange={(url) => patchContent("url", { url })}
      hint={m.content.url.urlHint}
      technical
      inputProps={{ type: "url", inputMode: "url", autoComplete: "url", placeholder: m.content.url.urlPlaceholder, autoCapitalize: "off", spellCheck: false }}
    />
  );
}

export function TextForm(props: FormErrorsProps) {
  const { m, n, t } = useI18n();
  const value = useEditor((s) => s.content.text);
  const chars = Array.from(value.text).length;
  const bytes = utf8ByteLength(value.text);
  return (
    <TextField
      {...props}
      field="text"
      label={m.content.text.text}
      value={value.text}
      onChange={(text) => patchContent("text", { text })}
      multiline
      rows={6}
      aside={
        <span className="ltr-value font-mono text-[0.6875rem] text-muted-foreground tabular-nums">
          {t(m.content.text.characters, { count: n(chars) })} · {t(m.content.text.bytes, { count: n(bytes) })}
        </span>
      }
    />
  );
}

export function EmailForm(props: FormErrorsProps) {
  const { m } = useI18n();
  const e = m.content.email;
  const value = useEditor((s) => s.content.email);
  return (
    <div className="grid gap-4">
      <TextField
        {...props}
        field="to"
        label={e.to}
        value={value.to}
        onChange={(to) => patchContent("email", { to })}
        hint={e.toHint}
        technical
        inputProps={{ type: "email", inputMode: "email", autoComplete: "email", placeholder: e.toPlaceholder, autoCapitalize: "off", spellCheck: false, multiple: true }}
      />
      <TextField {...props} field="subject" label={e.subject} value={value.subject} onChange={(subject) => patchContent("email", { subject })} optional inputProps={{ placeholder: e.subjectPlaceholder }} />
      <TextField {...props} field="body" label={e.body} value={value.body} onChange={(body) => patchContent("email", { body })} optional multiline />
    </div>
  );
}

function PhoneInput({ field, label, value, onChange, hint, placeholder, props }: { field: string; label: string; value: string; onChange: (v: string) => void; hint?: string; placeholder?: string; props: FormErrorsProps }) {
  return (
    <TextField
      {...props}
      field={field}
      label={label}
      value={value}
      onChange={onChange}
      hint={hint}
      technical
      inputProps={{ type: "tel", inputMode: "tel", autoComplete: "tel", placeholder }}
    />
  );
}

export function PhoneForm(props: FormErrorsProps) {
  const { m } = useI18n();
  const value = useEditor((s) => s.content.phone);
  return (
    <PhoneInput
      props={props}
      field="phone"
      label={m.content.phone.phone}
      value={value.phone}
      onChange={(phone) => patchContent("phone", { phone })}
      hint={m.content.phone.phoneHint}
      placeholder={m.content.phone.phonePlaceholder}
    />
  );
}

export function SmsForm(props: FormErrorsProps) {
  const { m } = useI18n();
  const s = m.content.sms;
  const value = useEditor((st) => st.content.sms);
  return (
    <div className="grid gap-4">
      <PhoneInput props={props} field="phone" label={s.phone} value={value.phone} onChange={(phone) => patchContent("sms", { phone })} placeholder={m.content.phone.phonePlaceholder} />
      <TextField {...props} field="message" label={s.message} value={value.message} onChange={(message) => patchContent("sms", { message })} optional multiline rows={3} />
      <Field label={s.format}>
        {(control) => (
          <Select value={value.format} onValueChange={(format) => patchContent("sms", { format: format as SmsFormat })}>
            <SelectTrigger id={control.id} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="smsto">{s.formatSmsto}</SelectItem>
              <SelectItem value="sms-uri">{s.formatUri}</SelectItem>
            </SelectContent>
          </Select>
        )}
      </Field>
    </div>
  );
}

export function WhatsAppForm(props: FormErrorsProps) {
  const { m } = useI18n();
  const w = m.content.whatsapp;
  const value = useEditor((s) => s.content.whatsapp);
  return (
    <div className="grid gap-4">
      <PhoneInput props={props} field="phone" label={w.phone} value={value.phone} onChange={(phone) => patchContent("whatsapp", { phone })} hint={w.phoneHint} placeholder={w.phonePlaceholder} />
      <TextField {...props} field="message" label={w.message} value={value.message} onChange={(message) => patchContent("whatsapp", { message })} optional multiline rows={3} />
    </div>
  );
}

export function WifiForm(props: FormErrorsProps) {
  const { m } = useI18n();
  const w = m.content.wifi;
  const value = useEditor((s) => s.content.wifi);
  const [visible, setVisible] = useState(false);
  return (
    <div className="grid gap-4">
      <TextField {...props} field="ssid" label={w.ssid} value={value.ssid} onChange={(ssid) => patchContent("wifi", { ssid })} inputProps={{ placeholder: w.ssidPlaceholder, autoCapitalize: "off", autoComplete: "off", spellCheck: false }} />
      <div className="grid gap-2">
        <span className="text-[0.8125rem] font-medium text-foreground/90">{w.encryption}</span>
        <Segmented<WifiEncryption>
          label={w.encryption}
          value={value.encryption}
          onChange={(encryption) => patchContent("wifi", { encryption })}
          options={[
            { value: "WPA", label: w.encryptionWpa },
            { value: "WEP", label: w.encryptionWep },
            { value: "nopass", label: w.encryptionNone },
          ]}
          size="sm"
        />
      </div>
      {value.encryption !== "nopass" ? (
        <TextField
          {...props}
          field="password"
          label={w.password}
          value={value.password}
          onChange={(password) => patchContent("wifi", { password })}
          technical
          inputProps={{ type: visible ? "text" : "password", autoComplete: "off", autoCapitalize: "off", spellCheck: false }}
          aside={
            <Button type="button" variant="ghost" size="xs" onClick={() => setVisible((v) => !v)} aria-pressed={visible}>
              {visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
              {visible ? w.hidePassword : w.showPassword}
            </Button>
          }
        />
      ) : null}
      <label className="flex items-start justify-between gap-4 rounded-xl border bg-muted/30 p-3">
        <span className="grid gap-0.5">
          <span className="text-[0.8125rem] font-medium">{w.hidden}</span>
          <span className="text-xs text-muted-foreground">{w.hiddenHint}</span>
        </span>
        <Switch checked={value.hidden} onCheckedChange={(hidden) => patchContent("wifi", { hidden })} />
      </label>
      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        {w.privacyNote}
      </p>
    </div>
  );
}

export function VCardForm(props: FormErrorsProps) {
  const { m } = useI18n();
  const v = m.content.vcard;
  const card = useEditor((s) => s.content.vcard);
  const set = (field: keyof typeof card) => (value: string) => patchContent("vcard", { [field]: value });
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField {...props} field="firstName" label={v.firstName} value={card.firstName} onChange={set("firstName")} inputProps={{ autoComplete: "given-name" }} />
        <TextField {...props} field="lastName" label={v.lastName} value={card.lastName} onChange={set("lastName")} inputProps={{ autoComplete: "family-name" }} />
        <TextField {...props} field="organization" label={v.organization} value={card.organization} onChange={set("organization")} optional inputProps={{ autoComplete: "organization" }} />
        <TextField {...props} field="title" label={v.title} value={card.title} onChange={set("title")} optional inputProps={{ autoComplete: "organization-title" }} />
        <TextField {...props} field="phone" label={v.phone} value={card.phone} onChange={set("phone")} optional technical inputProps={{ type: "tel", inputMode: "tel", autoComplete: "tel" }} />
        <TextField {...props} field="email" label={v.email} value={card.email} onChange={set("email")} optional technical inputProps={{ type: "email", inputMode: "email", autoComplete: "email", autoCapitalize: "off" }} />
      </div>
      <TextField {...props} field="website" label={v.website} value={card.website} onChange={set("website")} optional technical inputProps={{ type: "url", inputMode: "url", autoComplete: "url", autoCapitalize: "off" }} />
      <fieldset className="grid gap-3 rounded-xl border bg-muted/20 p-3">
        <legend className="px-1 text-[0.8125rem] font-medium">
          {v.address} <span className="font-normal text-muted-foreground">({m.common.optional})</span>
        </legend>
        <TextField {...props} field="street" label={v.street} value={card.street} onChange={set("street")} inputProps={{ autoComplete: "street-address" }} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField {...props} field="city" label={v.city} value={card.city} onChange={set("city")} inputProps={{ autoComplete: "address-level2" }} />
          <TextField {...props} field="region" label={v.region} value={card.region} onChange={set("region")} inputProps={{ autoComplete: "address-level1" }} />
          <TextField {...props} field="postalCode" label={v.postalCode} value={card.postalCode} onChange={set("postalCode")} technical inputProps={{ autoComplete: "postal-code" }} />
          <TextField {...props} field="country" label={v.country} value={card.country} onChange={set("country")} inputProps={{ autoComplete: "country-name" }} />
        </div>
      </fieldset>
      <TextField {...props} field="note" label={v.note} value={card.note} onChange={set("note")} optional multiline rows={3} />
    </div>
  );
}

export function LocationForm(props: FormErrorsProps) {
  const { m } = useI18n();
  const l = m.content.location;
  const value = useEditor((s) => s.content.location);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const locate = () => {
    if (!("geolocation" in navigator)) {
      setGeoError(l.locationError);
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        patchContent("location", {
          latitude: formatCoordinate(position.coords.latitude),
          longitude: formatCoordinate(position.coords.longitude),
        });
      },
      (error) => {
        setLocating(false);
        setGeoError(error.code === error.PERMISSION_DENIED ? l.locationDenied : l.locationError);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  };

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3">
        <TextField {...props} field="latitude" label={l.latitude} value={value.latitude} onChange={(latitude) => patchContent("location", { latitude })} technical inputProps={{ inputMode: "decimal", placeholder: "25.197197" }} />
        <TextField {...props} field="longitude" label={l.longitude} value={value.longitude} onChange={(longitude) => patchContent("location", { longitude })} technical inputProps={{ inputMode: "decimal", placeholder: "55.274376" }} />
      </div>
      <div className="grid gap-1.5">
        <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={locate} disabled={locating}>
          {locating ? <LoaderCircle className="animate-spin" aria-hidden /> : <LocateFixed aria-hidden />}
          {locating ? l.locating : l.useMyLocation}
        </Button>
        {geoError ? (
          <p role="alert" className="text-xs text-danger">
            {geoError}
          </p>
        ) : null}
      </div>
      <TextField {...props} field="name" label={l.name} value={value.name} onChange={(name) => patchContent("location", { name })} optional inputProps={{ placeholder: l.namePlaceholder }} />
      <Field label={l.format} hint={l.formatHint}>
        {(control) => (
          <Select value={value.format} onValueChange={(format) => patchContent("location", { format: format as LocationFormat })}>
            <SelectTrigger id={control.id} aria-describedby={control["aria-describedby"]} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="geo">{l.formatGeo}</SelectItem>
              <SelectItem value="google">{l.formatGoogle}</SelectItem>
              <SelectItem value="apple">{l.formatApple}</SelectItem>
            </SelectContent>
          </Select>
        )}
      </Field>
    </div>
  );
}

const subscribeNoop = () => () => undefined;
function useTimeZone(): string {
  return useSyncExternalStore(
    subscribeNoop,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => "",
  );
}

export function EventForm(props: FormErrorsProps) {
  const { m, t } = useI18n();
  const e = m.content.event;
  const value = useEditor((s) => s.content.event);
  const zone = useTimeZone();

  const toggleAllDay = (allDay: boolean) => {
    const convert = (v: string) => (!v ? v : allDay ? v.slice(0, 10) : v.length === 10 ? `${v}T09:00` : v);
    patchContent("event", { allDay, start: convert(value.start), end: convert(value.end) });
  };
  const inputType = value.allDay ? "date" : "datetime-local";

  return (
    <div className="grid gap-4">
      <TextField {...props} field="title" label={e.title} value={value.title} onChange={(title) => patchContent("event", { title })} inputProps={{ placeholder: e.titlePlaceholder }} />
      <label className="flex items-center justify-between gap-3 text-[0.8125rem] font-medium">
        {e.allDay}
        <Switch checked={value.allDay} onCheckedChange={toggleAllDay} />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField {...props} field="start" label={e.start} value={value.start} onChange={(start) => patchContent("event", { start })} technical inputProps={{ type: inputType }} />
        <TextField {...props} field="end" label={e.end} value={value.end} onChange={(end) => patchContent("event", { end })} optional technical inputProps={{ type: inputType, min: value.start || undefined }} />
      </div>
      <TextField {...props} field="location" label={e.location} value={value.location} onChange={(location) => patchContent("event", { location })} optional />
      <TextField {...props} field="description" label={e.description} value={value.description} onChange={(description) => patchContent("event", { description })} optional multiline rows={3} />
      {!value.allDay && zone ? <p className="text-xs text-muted-foreground">{t(e.timezoneHint, { zone })}</p> : null}
    </div>
  );
}

export function SocialForm(props: FormErrorsProps) {
  const { m } = useI18n();
  const s = m.content.social;
  const value = useEditor((st) => st.content.social);
  const example = SOCIAL_PLATFORM_SPECS[value.platform].profileUrl("username");
  return (
    <div className="grid gap-4">
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-[0.8125rem] font-medium text-foreground/90">{s.platform}</legend>
        <RadioGroup.Root
          value={value.platform}
          onValueChange={(platform) => patchContent("social", { platform: platform as SocialPlatform })}
          aria-label={s.platform}
          className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {SOCIAL_PLATFORMS.map((platform) => {
            const badge = SOCIAL_BADGES[platform];
            return (
              <RadioGroup.Item
                key={platform}
                value={platform}
                className={cn(
                  "flex min-w-0 items-center gap-2 rounded-xl border bg-card p-2 text-start text-[0.8125rem] font-medium transition-all outline-none hover:border-foreground/20 focus-visible:ring-3 focus-visible:ring-ring/50",
                  "data-[state=checked]:border-brand data-[state=checked]:bg-brand-soft/60",
                )}
              >
                <span
                  className="grid size-6 shrink-0 place-items-center rounded-md text-[0.625rem] font-bold"
                  style={{ background: badge.background, color: badge.color }}
                  aria-hidden
                >
                  {badge.mark}
                </span>
                <span className="truncate">{s.platforms[platform]}</span>
              </RadioGroup.Item>
            );
          })}
        </RadioGroup.Root>
      </fieldset>
      <TextField
        {...props}
        field="handle"
        label={s.handle}
        value={value.handle}
        onChange={(handle) => patchContent("social", { handle })}
        hint={<span className="ltr-value inline-block font-mono">{example}</span>}
        technical
        inputProps={{ placeholder: s.handlePlaceholder, autoCapitalize: "off", autoComplete: "off", spellCheck: false }}
      />
    </div>
  );
}
