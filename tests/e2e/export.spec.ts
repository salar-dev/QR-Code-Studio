import { expect, test } from "@playwright/test";
import { decodeImage, download, expectStatus, openStudio, payloadText, pixelAt, pngInfo } from "./helpers";

const EXPECTED = "https://example.com/export-test";

test.describe("export system", () => {
  test("every format is valid, correctly sized and decodes back to the content", async ({ page }) => {
    await openStudio(page);
    await page.getByLabel("Website URL").fill("example.com/export-test");
    await expectStatus(page, "ready");
    expect(await payloadText(page)).toBe(EXPECTED);

    // PNG: real 1024×1024 RGBA image.
    const png = await download(page, page.getByTestId("quick-png"));
    expect(png.download.suggestedFilename()).toBe("qr-code.png");
    expect(pngInfo(png.bytes)).toEqual({ width: 1024, height: 1024, colorType: 6 });
    expect((await decodeImage(page, png.bytes, "image/png"))?.text).toBe(EXPECTED);

    // SVG: true vector output, no embedded raster.
    const svg = await download(page, page.getByTestId("quick-svg"));
    expect(svg.download.suggestedFilename()).toBe("qr-code.svg");
    const svgText = svg.bytes.toString("utf8");
    expect(svgText).not.toContain("<image");
    const structure = await page.evaluate((source) => {
      const doc = new DOMParser().parseFromString(source, "image/svg+xml");
      return {
        error: Boolean(doc.querySelector("parsererror")),
        root: doc.documentElement.localName,
        width: doc.documentElement.getAttribute("width"),
        viewBox: doc.documentElement.getAttribute("viewBox"),
        shapes: doc.querySelectorAll("rect, path, circle").length,
      };
    }, svgText);
    expect(structure).toMatchObject({ error: false, root: "svg", width: "1024", viewBox: "0 0 1024 1024" });
    expect(structure.shapes).toBeGreaterThan(50);
    expect((await decodeImage(page, svg.bytes, "image/svg+xml"))?.text).toBe(EXPECTED);

    // PDF: valid vector document sized to the code (default 50 mm = 141.73 pt).
    const pdf = await download(page, page.getByTestId("quick-pdf"));
    expect(pdf.download.suggestedFilename()).toBe("qr-code.pdf");
    const pdfText = pdf.bytes.toString("latin1");
    expect(pdfText.startsWith("%PDF-")).toBe(true);
    expect(pdfText.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(pdfText).toMatch(/\/MediaBox \[0 0 141\.73\d* 141\.73\d*\]/);
    expect(pdfText).not.toContain("/Subtype /Image");

    // JPEG
    const jpeg = await download(page, page.getByTestId("quick-jpeg"));
    expect(jpeg.download.suggestedFilename()).toBe("qr-code.jpg");
    expect([...jpeg.bytes.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
    expect((await decodeImage(page, jpeg.bytes, "image/jpeg"))?.text).toBe(EXPECTED);

    // WebP (some browsers, e.g. Safari, cannot encode it: the option is then disabled).
    const webpButton = page.getByTestId("quick-webp");
    if (await webpButton.isEnabled()) {
      const webp = await download(page, webpButton);
      expect(webp.download.suggestedFilename()).toBe("qr-code.webp");
      expect(webp.bytes.subarray(0, 4).toString("latin1")).toBe("RIFF");
      expect(webp.bytes.subarray(8, 12).toString("latin1")).toBe("WEBP");
      expect((await decodeImage(page, webp.bytes, "image/webp"))?.text).toBe(EXPECTED);
    } else {
      test.info().annotations.push({ type: "note", description: "WebP encoding unsupported in this browser; option disabled." });
    }
  });

  test("custom size and file name are applied", async ({ page }) => {
    await openStudio(page);
    await page.getByLabel("Website URL").fill("example.com");
    await page.getByRole("button", { name: "512", exact: true }).click();
    await page.getByLabel("File name").fill("Café menu: table 4");
    await expectStatus(page, "ready");
    const png = await download(page, page.getByTestId("download-button"));
    // macOS/WebKit may report the name in NFD; compare canonically.
    expect(png.download.suggestedFilename().normalize("NFC")).toBe("Café-menu-table-4.png");
    expect(pngInfo(png.bytes).width).toBe(512);
  });

  test("a white QR on a transparent background keeps a real alpha channel", async ({ page }) => {
    await openStudio(page);
    await page.getByLabel("Website URL").fill("example.com/white");
    await page.getByTestId("tab-design").click();
    await page.getByRole("button", { name: "Minimal White" }).click();
    await expectStatus(page, ["ready", "difficult"]);

    const png = await download(page, page.getByTestId("quick-png"));
    // Corner pixel: fully transparent, no white rectangle was added.
    expect((await pixelAt(page, png.bytes, "image/png", 2, 2)).rgba[3]).toBe(0);
    // Composited on dark the white code decodes (as an inverted code).
    const decoded = await decodeImage(page, png.bytes, "image/png", "#111114");
    expect(decoded).toEqual({ text: "https://example.com/white", inverted: true });

    const svg = await download(page, page.getByTestId("quick-svg"));
    const fills = await page.evaluate((source) => {
      const doc = new DOMParser().parseFromString(source, "image/svg+xml");
      return [...doc.querySelectorAll("rect[fill]")].map((r) => r.getAttribute("fill"));
    }, svg.bytes.toString("utf8"));
    expect(new Set(fills)).toEqual(new Set(["#ffffff"]));

    const webpButton = page.getByTestId("quick-webp");
    if (await webpButton.isEnabled()) {
      const webp = await download(page, webpButton);
      expect((await pixelAt(page, webp.bytes, "image/webp", 2, 2)).rgba[3]).toBe(0);
    }
  });

  test("gradients and logos are exported and stay scannable", async ({ page }) => {
    await openStudio(page);
    await page.getByLabel("Website URL").fill("example.com/brand");
    await page.getByTestId("tab-design").click();
    await page.getByRole("radiogroup", { name: "Main color · Fill type" }).getByRole("radio", { name: "Linear" }).click();
    await expectStatus(page, "ready");

    // Upload a generated PNG logo.
    const logo = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#e11d48";
      ctx.beginPath();
      ctx.arc(64, 64, 60, 0, Math.PI * 2);
      ctx.fill();
      return canvas.toDataURL("image/png").split(",")[1];
    });
    await page.getByRole("button", { name: "Logo" }).click();
    await page.locator('input[type=file][accept*="image/svg+xml"]').setInputFiles({ name: "brand.png", mimeType: "image/png", buffer: Buffer.from(logo, "base64") });
    await expect(page.getByText("brand.png")).toBeVisible();

    // Medium error correction + logo → recommendation, then switch to High.
    await expectStatus(page, ["difficult", "ready"]);
    await page.getByRole("button", { name: "Use High" }).click();
    await expectStatus(page, "ready");

    const svg = await download(page, page.getByTestId("quick-svg"));
    const text = svg.bytes.toString("utf8");
    expect(text).toContain("linearGradient");
    expect(text).toMatch(/<image[^>]+xlink:href="data:image\/png;base64,/);
    expect((await decodeImage(page, svg.bytes, "image/svg+xml"))?.text).toBe("https://example.com/brand");

    const png = await download(page, page.getByTestId("quick-png"));
    expect((await decodeImage(page, png.bytes, "image/png"))?.text).toBe("https://example.com/brand");

    const pdf = await download(page, page.getByTestId("quick-pdf"));
    const pdfText = pdf.bytes.toString("latin1");
    expect(pdfText.startsWith("%PDF-")).toBe(true);
    expect(pdfText).toContain("/Subtype /Image"); // the logo
  });
});
