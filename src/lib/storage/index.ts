import "server-only";
import { createSupabaseStorage } from "./supabase";
import type { StorageProvider } from "./types";

let cached: StorageProvider | null | undefined;

/**
 * Returns the configured storage provider, or null when uploads are disabled.
 *
 * Supabase Storage is enabled when all of these are set (server env only):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY), SUPABASE_STORAGE_BUCKET
 */
export function getStorageProvider(): StorageProvider | null {
  if (cached !== undefined) return cached;
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  cached = url && serviceKey && bucket ? createSupabaseStorage({ url, serviceKey, bucket }) : null;
  return cached;
}

export function getMaxUploadBytes(): number {
  const mb = Number(process.env.UPLOAD_MAX_MB);
  return Math.round((Number.isFinite(mb) && mb > 0 ? Math.min(mb, 50) : 10) * 1024 * 1024);
}
