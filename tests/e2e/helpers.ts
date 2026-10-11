import { readFile } from "node:fs/promises";
import { expect, type Download, type Locator, type Page } from "@playwright/test";
import { decodeLuminance } from "../../src/lib/qr/validation/decode";

export type Status = "empty" | "invalid" | "checking" | "ready" | "lowContrast" | "difficult" | "failed";

export async function openStudio(page: Page, locale: "en" | "ar" = "en") {
  await page.goto(`/${locale}`);
  await expect(page.locator("main#editor")).toBeVisible();
}

export function visibleStatus(page: Page): Locator {
  return page.locator("[data-testid=qr-status]:visible").first();
}

export async function expectStatus(page: Page, status: Status | Status[]) {
  const allowed = Array.isArray(status) ? status : [status];
  await expect(visibleStatus(page)).toHaveAttribute("data-status", new RegExp(`^(${allowed.join("|")})$`));
}

export async function payloadText(page: Page): Promise<string> {
  return (await page.locator("[data-testid=payload]:visible").first().textContent()) ?? "";
}

export async function download(page: Page, trigger: Locator): Promise<{ download: Download; bytes: Buffer }> {
  const [file] = await Promise.all([page.waitForEvent("download"), trigger.click()]);
  const path = await file.path();
  return { download: file, bytes: await readFile(path) };
}

/**
 * Draws an exported image in the browser (optionally over a background color),
 * then decodes it in Node with the same ZXing decoder the app uses.
 */
export async function decodeImage(page: Page, bytes: Buffer, mime: string, background = "#ffffff") {
  const { size, data } = await page.evaluate(
    async ({ b64, mime, background }) => {
      const blob = await (await fetch(`data:${mime};base64,${b64}`)).blob();
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.src = url;
      await image.decode();
      const size = 640;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(image, 0, 0, size, size);
      const rgba = ctx.getImageData(0, 0, size, size).data;
      URL.revokeObjectURL(url);
      let binary = "";
      for (let i = 0, p = 0; i < size * size; i++, p += 4) {
        binary += String.fromCharCode((rgba[p] * 306 + rgba[p + 1] * 601 + rgba[p + 2] * 117) >> 10);
      }
      return { size, data: btoa(binary) };
    },
    { b64: bytes.toString("base64"), mime, background },
  );
  return decodeLuminance(new Uint8ClampedArray(Buffer.from(data, "base64")), size, size);
}

/** Reads RGBA of a pixel from an image without compositing (to inspect alpha). */
export async function pixelAt(page: Page, bytes: Buffer, mime: string, x: number, y: number) {
  return page.evaluate(
    async ({ b64, mime, x, y }) => {
      const blob = await (await fetch(`data:${mime};base64,${b64}`)).blob();
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0);
      return { width: bitmap.width, height: bitmap.height, rgba: Array.from(ctx.getImageData(x, y, 1, 1).data) };
    },
    { b64: bytes.toString("base64"), mime, x, y },
  );
}

export function pngInfo(bytes: Buffer) {
  expect(bytes.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), colorType: bytes[25] };
}
