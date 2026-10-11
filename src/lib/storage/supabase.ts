import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { StorageProvider, UploadInput } from "./types";

export interface SupabaseStorageConfig {
  url: string;
  /** Service-role / secret key. Server-side only; never sent to the browser. */
  serviceKey: string;
  bucket: string;
}

/** Stores files in a public Supabase Storage bucket under random object names. */
export function createSupabaseStorage(config: SupabaseStorageConfig): StorageProvider {
  const client = createClient(config.url, config.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  return {
    name: "supabase",
    async upload({ bytes, contentType, extension }: UploadInput) {
      const now = new Date();
      const path = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}.${extension}`;
      const { error } = await client.storage.from(config.bucket).upload(path, bytes, {
        contentType,
        upsert: false,
        cacheControl: "31536000",
      });
      if (error) throw new Error(`Supabase upload failed: ${error.message}`);
      const { data } = client.storage.from(config.bucket).getPublicUrl(path);
      return { url: data.publicUrl, path };
    },
  };
}
