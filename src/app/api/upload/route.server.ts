import { connection } from "next/server";
import { getMaxUploadBytes, getStorageProvider } from "@/lib/storage";
import { handleUpload } from "@/lib/upload/handler";
import { ALLOWED_FILE_TYPES } from "@/lib/upload/policy";
import { createRateLimiter } from "@/lib/upload/rate-limit";

// 10 uploads per client per 10 minutes, per server instance.
const limiter = createRateLimiter({ limit: 10, windowMs: 10 * 60 * 1000 });

/** Reports whether uploads are available. Evaluated per request, never at build time. */
export async function GET() {
  await connection();
  return Response.json(
    {
      enabled: getStorageProvider() !== null,
      maxBytes: getMaxUploadBytes(),
      types: ALLOWED_FILE_TYPES.map((type) => type.label),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  return handleUpload(request, {
    provider: getStorageProvider(),
    limiter,
    maxBytes: getMaxUploadBytes(),
  });
}
