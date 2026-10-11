import { describe, expect, it, vi } from "vitest";
import type { StorageProvider } from "@/lib/storage/types";
import { handleUpload } from "@/lib/upload/handler";
import { detectFileType } from "@/lib/upload/policy";
import { createRateLimiter } from "@/lib/upload/rate-limit";

const bytes = (...values: number[]) => new Uint8Array(values);
const ascii = (text: string) => new TextEncoder().encode(text);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13);
const PDF = ascii("%PDF-1.7\n%âãÏÓ\n1 0 obj");

describe("file type detection (magic bytes)", () => {
  it("accepts allowed formats by content", () => {
    expect(detectFileType(PDF, "doc.pdf")).toEqual({ mime: "application/pdf", extension: "pdf" });
    expect(detectFileType(PNG, "anything.bin")).toEqual({ mime: "image/png", extension: "png" });
    expect(detectFileType(bytes(0xff, 0xd8, 0xff, 0xe0), "photo.jpeg")).toEqual({ mime: "image/jpeg", extension: "jpg" });
    expect(detectFileType(ascii("RIFF\0\0\0\0WEBPVP8 "), "a.webp")).toEqual({ mime: "image/webp", extension: "webp" });
    expect(detectFileType(ascii("hello,world\n1,2\n"), "data.csv")).toEqual({ mime: "text/csv", extension: "csv" });
    expect(detectFileType(ascii("PK\u0003\u0004rest"), "report.docx")?.extension).toBe("docx");
  });

  it("rejects active content and spoofed extensions", () => {
    expect(detectFileType(ascii("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>"), "logo.svg")).toBeNull();
    expect(detectFileType(ascii("<!doctype html><script>x</script>"), "page.html")).toBeNull();
    expect(detectFileType(ascii("<html>"), "notes.txt.html")).toBeNull();
    expect(detectFileType(ascii("MZ\u0090\u0000"), "invoice.pdf")).toBeNull(); // Windows executable renamed
    expect(detectFileType(ascii("PK\u0003\u0004"), "archive.zip")).toBeNull();
    expect(detectFileType(bytes(0x00, 0x01, 0x02), "binary.txt")).toBeNull();
    expect(detectFileType(new Uint8Array(), "empty.pdf")).toBeNull();
  });
});

describe("rate limiter", () => {
  it("allows a fixed number of hits per window", () => {
    let now = 0;
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000, now: () => now });
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a")).toEqual({ allowed: false, retryAfterSeconds: 1 });
    expect(limiter.check("b").allowed).toBe(true);
    now = 1001;
    expect(limiter.check("a").allowed).toBe(true);
  });
});

function uploadRequest(file: File | null, headers: Record<string, string> = {}) {
  const form = new FormData();
  if (file) form.append("file", file);
  const body = new Response(form);
  return body.arrayBuffer().then(
    (buffer) =>
      new Request("http://localhost:3000/api/upload", {
        method: "POST",
        body: buffer,
        headers: {
          "content-type": body.headers.get("content-type") ?? "",
          "content-length": String(buffer.byteLength),
          host: "localhost:3000",
          ...headers,
        },
      }),
  );
}

function fakeProvider(): StorageProvider & { upload: ReturnType<typeof vi.fn> } {
  return {
    name: "fake",
    upload: vi.fn(async ({ extension }: { extension: string }) => ({ url: `https://cdn.example.com/abc.${extension}`, path: `abc.${extension}` })),
  };
}

const deps = (provider: StorageProvider | null, limit = 10) => ({
  provider,
  limiter: createRateLimiter({ limit, windowMs: 60_000 }),
  maxBytes: 1024,
  log: () => undefined,
});

describe("upload handler", () => {
  it("is disabled without a storage provider", async () => {
    const response = await handleUpload(await uploadRequest(new File([PDF], "a.pdf")), deps(null));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "disabled" });
  });

  it("stores verified files and returns their public URL", async () => {
    const provider = fakeProvider();
    const response = await handleUpload(await uploadRequest(new File([PDF], "Menu <final>.pdf", { type: "text/html" })), deps(provider));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      url: "https://cdn.example.com/abc.pdf",
      name: "Menu _final_.pdf",
      size: PDF.length,
      contentType: "application/pdf",
    });
    // The declared MIME type is ignored; the sniffed one is stored.
    expect(provider.upload).toHaveBeenCalledWith(expect.objectContaining({ contentType: "application/pdf", extension: "pdf" }));
  });

  it("rejects disallowed types, oversized files and cross-site requests", async () => {
    const provider = fakeProvider();
    const svg = new File(["<svg xmlns='http://www.w3.org/2000/svg'/>"], "x.svg", { type: "image/svg+xml" });
    expect((await handleUpload(await uploadRequest(svg), deps(provider))).status).toBe(415);
    const big = new File([new Uint8Array(4096)], "big.pdf");
    expect((await handleUpload(await uploadRequest(big), deps(provider))).status).toBe(413);
    const crossSite = await uploadRequest(new File([PDF], "a.pdf"), { origin: "https://evil.example" });
    expect((await handleUpload(crossSite, deps(provider))).status).toBe(403);
    expect((await handleUpload(await uploadRequest(null), deps(provider))).status).toBe(400);
    expect(provider.upload).not.toHaveBeenCalled();
  });

  it("rate limits clients", async () => {
    const shared = deps(fakeProvider(), 1);
    expect((await handleUpload(await uploadRequest(new File([PDF], "a.pdf")), shared)).status).toBe(201);
    const limited = await handleUpload(await uploadRequest(new File([PDF], "a.pdf")), shared);
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBeTruthy();
  });

  it("reports storage failures without leaking details", async () => {
    const provider = fakeProvider();
    provider.upload.mockRejectedValueOnce(new Error("secret internal error"));
    const response = await handleUpload(await uploadRequest(new File([PDF], "a.pdf")), deps(provider));
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("secret");
  });
});
