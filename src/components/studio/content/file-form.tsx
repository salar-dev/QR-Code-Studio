"use client";

import { useEffect, useRef, useState } from "react";
import { CircleCheck, FileUp, Info, LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";
import type { FileMode } from "@/lib/qr/content/types";
import { patchContent, useEditor } from "@/lib/store/editor-store";
import { getUploadConfig, UploadError, uploadFile, type UploadConfig } from "@/lib/upload/client";
import { ACCEPT_ATTRIBUTE, ALLOWED_FILE_TYPES, fileExtension } from "@/lib/upload/policy";
import { cn } from "@/lib/utils";
import { Segmented } from "../ui/segmented";
import { TextField, type FormErrorsProps } from "./form-kit";

function formatBytes(bytes: number, n: (v: number, o?: Intl.NumberFormatOptions) => string) {
  if (bytes >= 1024 * 1024) return `${n(bytes / 1024 / 1024, { maximumFractionDigits: 1 })} MB`;
  return `${n(Math.max(1, Math.round(bytes / 1024)))} KB`;
}

function UploadArea() {
  const { m, n, t } = useI18n();
  const f = m.content.file;
  const file = useEditor((s) => s.content.file);
  const [config, setConfig] = useState<UploadConfig | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true;
    getUploadConfig().then((value) => active && setConfig(value));
    return () => {
      active = false;
      abortRef.current?.abort();
    };
  }, []);

  if (!config) {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> {f.checking}
      </p>
    );
  }

  if (!config.enabled) {
    return (
      <div className="grid gap-3 rounded-xl border border-dashed bg-muted/30 p-4 text-sm">
        <p className="leading-relaxed text-muted-foreground">{f.notConfigured}</p>
        <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => patchContent("file", { mode: "link" })}>
          {f.modeLink}
        </Button>
      </div>
    );
  }

  const start = async (selected: File | undefined) => {
    if (!selected) return;
    setError(null);
    const ext = fileExtension(selected.name);
    if (!ALLOWED_FILE_TYPES.some((type) => type.extensions.includes(ext))) {
      setError(f.errors.type);
      return;
    }
    if (selected.size > config.maxBytes) {
      setError(t(f.errors.tooLarge, { size: formatBytes(config.maxBytes, n) }));
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setProgress(0);
    try {
      const result = await uploadFile(selected, setProgress, controller.signal);
      patchContent("file", { uploadedUrl: result.url, uploadedName: result.name, uploadedSize: result.size });
    } catch (err) {
      if (controller.signal.aborted) return;
      const code = err instanceof UploadError ? err.code : "failed";
      setError(
        code === "tooLarge"
          ? t(f.errors.tooLarge, { size: formatBytes(config.maxBytes, n) })
          : code === "type"
            ? f.errors.type
            : code === "rateLimited"
              ? f.errors.rateLimited
              : code === "disabled"
                ? f.errors.disabled
                : f.errors.failed,
      );
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const uploading = progress !== null;

  return (
    <div className="grid gap-3">
      <input ref={inputRef} type="file" accept={ACCEPT_ATTRIBUTE} className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => start(e.target.files?.[0])} />
      {file.uploadedUrl && !uploading ? (
        <div className="flex items-center gap-3 rounded-xl border bg-success-soft/50 p-3">
          <CircleCheck className="size-5 shrink-0 text-success" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium" dir="auto">
              {file.uploadedName}
            </p>
            <p className="text-xs text-muted-foreground">
              {f.uploaded} · {formatBytes(file.uploadedSize, n)}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <RefreshCw aria-hidden /> {f.replace}
          </Button>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void start(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex flex-col items-center gap-2 rounded-xl border border-dashed bg-muted/30 px-4 py-7 text-center transition-colors outline-none hover:border-foreground/30 hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50",
            dragging && "border-brand bg-brand-soft/50",
          )}
        >
          {uploading ? <LoaderCircle className="size-6 animate-spin text-muted-foreground" aria-hidden /> : <FileUp className="size-6 text-muted-foreground" aria-hidden />}
          <span className="text-sm font-medium">{uploading ? f.uploading : f.dropTitle}</span>
          <span className="text-xs text-muted-foreground">
            {t(f.dropHint, { types: config.types.join(", "), size: formatBytes(config.maxBytes, n) })}
          </span>
          {uploading ? (
            <span className="mt-1 h-1.5 w-40 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((progress ?? 0) * 100)}>
              <span className="block h-full rounded-full bg-brand transition-[width]" style={{ width: `${Math.round((progress ?? 0) * 100)}%` }} />
            </span>
          ) : null}
        </button>
      )}
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
      <p className="text-xs leading-relaxed text-muted-foreground">{f.retention}</p>
    </div>
  );
}

export function FileForm(props: FormErrorsProps) {
  const { m } = useI18n();
  const f = m.content.file;
  const file = useEditor((s) => s.content.file);
  return (
    <div className="grid gap-4">
      <p className="flex items-start gap-2 rounded-xl border bg-brand-soft/40 p-3 text-xs leading-relaxed text-foreground/80">
        <Info className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden />
        {f.explanation}
      </p>
      <Segmented<FileMode>
        label={f.modeLabel}
        value={file.mode}
        onChange={(mode) => patchContent("file", { mode })}
        options={[
          { value: "link", label: f.modeLink },
          { value: "upload", label: f.modeUpload },
        ]}
      />
      {file.mode === "link" ? (
        <TextField
          {...props}
          field="linkUrl"
          label={f.linkUrl}
          value={file.linkUrl}
          onChange={(linkUrl) => patchContent("file", { linkUrl })}
          hint={f.linkHint}
          technical
          inputProps={{ type: "url", inputMode: "url", placeholder: f.linkPlaceholder, autoCapitalize: "off", spellCheck: false }}
        />
      ) : (
        <UploadArea />
      )}
    </div>
  );
}
