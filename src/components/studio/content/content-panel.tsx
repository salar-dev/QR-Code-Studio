"use client";

import { useMemo, type ComponentType } from "react";
import { Eraser } from "lucide-react";
import { AnimatePresence, m as motion } from "motion/react";
import { RadioGroup } from "radix-ui";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";
import { encodeContent } from "@/lib/qr/content/encoders";
import { CONTENT_TYPES, type ContentType, type FieldErrors } from "@/lib/qr/content/types";
import { clearContent, setContentType, useEditor } from "@/lib/store/editor-store";
import { cn } from "@/lib/utils";
import { EmailForm, EventForm, LocationForm, PhoneForm, SmsForm, SocialForm, TextForm, UrlForm, VCardForm, WhatsAppForm, WifiForm } from "./content-forms";
import { FileForm } from "./file-form";
import { useTouched, type FormErrorsProps } from "./form-kit";
import { CONTENT_TYPE_ICONS } from "./type-meta";

const FORMS: Record<ContentType, ComponentType<FormErrorsProps>> = {
  url: UrlForm,
  text: TextForm,
  file: FileForm,
  email: EmailForm,
  phone: PhoneForm,
  sms: SmsForm,
  whatsapp: WhatsAppForm,
  wifi: WifiForm,
  vcard: VCardForm,
  location: LocationForm,
  event: EventForm,
  social: SocialForm,
};

const EMPTY: FieldErrors = {};

function TypeSelector() {
  const { m } = useI18n();
  const type = useEditor((s) => s.content.type);
  return (
    <RadioGroup.Root
      value={type}
      onValueChange={(value) => setContentType(value as ContentType)}
      aria-label={m.content.typeLabel}
      className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-4"
    >
      {CONTENT_TYPES.map((value) => {
        const Icon = CONTENT_TYPE_ICONS[value];
        return (
          <RadioGroup.Item
            key={value}
            value={value}
            title={m.contentTypes[value].description}
            data-testid={`type-${value}`}
            className={cn(
              "group flex min-w-0 flex-col items-center gap-1.5 rounded-xl border border-transparent px-1 py-2.5 text-muted-foreground transition-all outline-none",
              "hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
              "data-[state=checked]:border-brand/40 data-[state=checked]:bg-brand-soft data-[state=checked]:text-foreground",
            )}
          >
            <Icon className="size-5 transition-transform group-data-[state=checked]:scale-110 group-data-[state=checked]:text-brand" aria-hidden />
            <span className="w-full truncate text-center text-[0.6875rem] leading-tight font-medium">{m.contentTypes[value].label}</span>
          </RadioGroup.Item>
        );
      })}
    </RadioGroup.Root>
  );
}

function ActiveForm({ type }: { type: ContentType }) {
  const content = useEditor((s) => s.content);
  const { touched, touch } = useTouched();
  // Only the active type's slice matters for its errors.
  const slice = content[type];
  const result = useMemo(() => encodeContent({ ...content, type }), [slice, type]); // eslint-disable-line react-hooks/exhaustive-deps
  const errors = result.status === "invalid" ? result.errors : EMPTY;
  const warnings = result.status === "ok" ? result.warnings : EMPTY;
  const Form = FORMS[type];
  return <Form errors={errors} warnings={warnings} touched={touched} touch={touch} />;
}

export function ContentPanel() {
  const { m } = useI18n();
  const type = useEditor((s) => s.content.type);
  return (
    <div className="grid gap-5 p-4 md:p-5">
      <div className="grid gap-3">
        <h2 className="text-sm font-semibold">{m.content.heading}</h2>
        <TypeSelector />
      </div>
      <div className="h-px bg-border" />
      <div className="grid gap-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold tracking-tight">{m.contentTypes[type].label}</h3>
            <p className="text-xs text-muted-foreground">{m.contentTypes[type].description}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => {
              clearContent(type);
              toast.success(m.content.cleared);
            }}
          >
            <Eraser aria-hidden /> {m.content.clearInput}
          </Button>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={type} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16, ease: "easeOut" }}>
            <ActiveForm type={type} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
