"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/provider";
import { stripSensitiveContent } from "@/lib/qr/content/defaults";
import { encodeContent } from "@/lib/qr/content/encoders";
import { createExportBlob, createThumbnail, downloadBlob, ExportError } from "@/lib/qr/export/export";
import { buildFileName } from "@/lib/qr/export/filename";
import type { ExportFormat } from "@/lib/qr/export/types";
import { QrCapacityError } from "@/lib/qr/render/matrix";
import { renderQrSvg } from "@/lib/qr/render/renderer";
import { editorStore, preferencesStore } from "@/lib/store/editor-store";
import { addHistoryEntry, isPrivateType } from "@/lib/store/library-store";

/** Short, non-sensitive summary of the content for the history list. */
function summarize(payload: string, privateType: boolean): string {
  if (privateType) return "";
  return payload.replace(/\s+/g, " ").slice(0, 120);
}

export function useExporter() {
  const { m, t } = useI18n();
  const [busy, setBusy] = useState<ExportFormat | null>(null);

  const exportAs = useCallback(
    async (formatOverride?: ExportFormat) => {
      const state = editorStore.getState();
      const settings = { ...state.exportSettings, format: formatOverride ?? state.exportSettings.format };
      const formatName = m.export.formats[settings.format].name;
      const encoded = encodeContent(state.content);
      if (encoded.status !== "ok") {
        toast.error(m.export.errors.notReady);
        return false;
      }

      setBusy(settings.format);
      try {
        // Render at the export size from the current state so the file always
        // matches the preview, even if a debounced preview render is pending.
        const { svg } = await renderQrSvg({ payload: encoded.payload, design: state.design, size: settings.size, title: m.app.name });
        const blob = await createExportBlob(svg, settings, settings.fileName || m.app.name);
        const fileName = buildFileName(settings.fileName, settings.format);
        downloadBlob(blob, fileName);
        toast.success(t(m.export.success, { file: fileName }));

        // Local history (private content only if the user opted in).
        const rememberSensitive = preferencesStore.getState().rememberSensitive;
        const hidePrivate = isPrivateType(state.content.type) && !rememberSensitive;
        // A thumbnail of a private code is itself scannable, so it is not kept either.
        const thumbnail = hidePrivate ? "" : await createThumbnail(svg).catch(() => "");
        addHistoryEntry({
          contentType: state.content.type,
          label: summarize(encoded.payload, hidePrivate),
          // Other content types may hold private fields too (e.g. a Wi-Fi password typed earlier).
          content: hidePrivate ? null : rememberSensitive ? state.content : stripSensitiveContent(state.content),
          design: state.design,
          format: settings.format,
          thumbnail,
        });
        return true;
      } catch (error) {
        if (error instanceof ExportError) {
          toast.error(t(m.export.errors[error.code], { format: formatName }));
        } else if (error instanceof QrCapacityError) {
          toast.error(m.preview.tooLongDescription);
        } else {
          console.error(error);
          toast.error(m.export.errors.generic);
        }
        return false;
      } finally {
        setBusy(null);
      }
    },
    [m, t],
  );

  return { exportAs, busy };
}
