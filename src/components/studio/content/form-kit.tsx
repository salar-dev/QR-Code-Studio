"use client";

import { useCallback, useState, type ComponentProps, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/provider";
import type { FieldErrors } from "@/lib/qr/content/types";
import { Field } from "../ui/field";

/** Tracks which fields were blurred, so errors appear only after interaction. */
export function useTouched() {
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set());
  const touch = useCallback((field: string) => setTouched((prev) => (prev.has(field) ? prev : new Set(prev).add(field))), []);
  return { touched, touch };
}

export interface FormErrorsProps {
  errors: FieldErrors;
  warnings: FieldErrors;
  touched: ReadonlySet<string>;
  touch: (field: string) => void;
}

type InputExtras = Omit<ComponentProps<"input">, "value" | "onChange" | "id">;

interface TextFieldProps extends FormErrorsProps {
  field: string;
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  hint?: ReactNode;
  optional?: boolean;
  multiline?: boolean;
  rows?: number;
  inputProps?: InputExtras;
  aside?: ReactNode;
  className?: string;
  /** Technical values (URLs, numbers) are always laid out left-to-right. */
  technical?: boolean;
}

export function TextField({
  field,
  label,
  value,
  onChange,
  hint,
  optional,
  multiline,
  rows = 4,
  inputProps,
  aside,
  className,
  technical,
  errors,
  warnings,
  touched,
  touch,
}: TextFieldProps) {
  const { m } = useI18n();
  const errorCode = touched.has(field) ? errors[field] : undefined;
  const warningCode = warnings[field];
  return (
    <Field
      label={label}
      hint={hint}
      optional={optional ? m.common.optional : undefined}
      error={errorCode ? m.validation[errorCode] : null}
      warning={warningCode ? m.validation[warningCode] : null}
      aside={aside}
      className={className}
    >
      {(control) =>
        multiline ? (
          <Textarea
            {...control}
            name={field}
            value={value}
            rows={rows}
            dir="auto"
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => touch(field)}
            className="max-h-72 min-h-24 resize-y"
          />
        ) : (
          <Input
            {...control}
            {...inputProps}
            name={field}
            value={value}
            dir={technical ? "ltr" : (inputProps?.dir ?? "auto")}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => touch(field)}
            className={technical ? "text-start" : undefined}
          />
        )
      }
    </Field>
  );
}
