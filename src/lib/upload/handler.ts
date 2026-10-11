import type { StorageProvider } from "../storage/types";
import { detectFileType, displayFileName } from "./policy";
import type { RateLimiter } from "./rate-limit";

export type UploadErrorCode = "disabled" | "forbidden" | "lengthRequired" | "tooLarge" | "rateLimited" | "invalid" | "type" | "failed";

export interface UploadSuccess {
  url: string;
  name: string;
  size: number;
  contentType: string;
}

export interface UploadDeps {
  provider: StorageProvider | null;
  limiter: RateLimiter;
  maxBytes: number;
  log?: (message: string, error?: unknown) => void;
}

const json = (body: unknown, status: number, headers?: Record<string, string>) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

const fail = (code: UploadErrorCode, status: number, headers?: Record<string, string>) => json({ error: code }, status, headers);

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "anonymous";
}

/** Rejects cross-site browser requests (simple CSRF / hot-linking protection). */
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // Non-browser clients; still rate limited.
  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Multipart overhead allowance on top of the file itself. */
const FORM_OVERHEAD_BYTES = 16 * 1024;

export async function handleUpload(request: Request, deps: UploadDeps): Promise<Response> {
  const { provider, limiter, maxBytes, log = console.error } = deps;
  if (!provider) return fail("disabled", 503);
  if (!isSameOrigin(request)) return fail("forbidden", 403);

  const length = Number(request.headers.get("content-length"));
  if (!Number.isFinite(length) || length <= 0) return fail("lengthRequired", 411);
  if (length > maxBytes + FORM_OVERHEAD_BYTES) return fail("tooLarge", 413);

  const rate = limiter.check(clientKey(request));
  if (!rate.allowed) return fail("rateLimited", 429, { "Retry-After": String(rate.retryAfterSeconds) });

  let file: File;
  try {
    const form = await request.formData();
    const entry = form.get("file");
    if (!(entry instanceof File)) return fail("invalid", 400);
    file = entry;
  } catch {
    return fail("invalid", 400);
  }

  if (file.size === 0) return fail("invalid", 400);
  if (file.size > maxBytes) return fail("tooLarge", 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectFileType(bytes, file.name);
  if (!detected) return fail("type", 415);

  try {
    const stored = await provider.upload({ bytes, contentType: detected.mime, extension: detected.extension });
    const body: UploadSuccess = {
      url: stored.url,
      name: displayFileName(file.name),
      size: file.size,
      contentType: detected.mime,
    };
    return json(body, 201);
  } catch (error) {
    log("[upload] storage provider failed", error);
    return fail("failed", 502);
  }
}
