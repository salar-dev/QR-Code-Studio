"use client";

import { BASE_PATH, IS_STATIC_EXPORT } from "../site";
import type { UploadErrorCode, UploadSuccess } from "./handler";

const UPLOAD_ENDPOINT = `${BASE_PATH}/api/upload`;
const DISABLED: UploadConfig = { enabled: false, maxBytes: 0, types: [] };

export interface UploadConfig {
  enabled: boolean;
  maxBytes: number;
  types: string[];
}

let configPromise: Promise<UploadConfig> | null = null;

/** Asks the server whether uploads are configured (cached per page view). */
export function getUploadConfig(): Promise<UploadConfig> {
  // Static hosting (GitHub Pages) has no server, so uploads are never available.
  if (IS_STATIC_EXPORT) return Promise.resolve(DISABLED);
  configPromise ??= fetch(UPLOAD_ENDPOINT, { cache: "no-store" })
    .then((res) => (res.ok ? (res.json() as Promise<UploadConfig>) : DISABLED))
    .catch(() => {
      configPromise = null;
      return DISABLED;
    });
  return configPromise;
}

export class UploadError extends Error {
  constructor(public readonly code: UploadErrorCode) {
    super(code);
    this.name = "UploadError";
  }
}

/** Uploads a file with progress reporting (fetch can't report upload progress). */
export function uploadFile(file: File, onProgress: (fraction: number) => void, signal?: AbortSignal): Promise<UploadSuccess> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("file", file, file.name);
    xhr.open("POST", UPLOAD_ENDPOINT);
    xhr.responseType = "json";
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      const body = xhr.response as Partial<UploadSuccess> & { error?: UploadErrorCode };
      if (xhr.status === 201 && body?.url) resolve(body as UploadSuccess);
      else reject(new UploadError(body?.error ?? "failed"));
    };
    xhr.onerror = () => reject(new UploadError("failed"));
    signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(form);
  });
}
