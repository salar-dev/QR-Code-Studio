import { expect, test } from "@playwright/test";
import { expectStatus, openStudio, payloadText } from "./helpers";

test.describe("content types", () => {
  test("Wi-Fi network payload", async ({ page }) => {
    await openStudio(page);
    await page.getByTestId("type-wifi").click();
    await page.getByLabel("Network name (SSID)").fill("Home;Net");
    await page.getByLabel("Password").fill("pa:ss word");
    await page.getByRole("switch", { name: "Hidden network" }).click();
    await expectStatus(page, "ready");
    expect(await payloadText(page)).toBe("WIFI:T:WPA;S:Home\\;Net;P:pa\\:ss word;H:true;;");
  });

  test("contact card payload", async ({ page }) => {
    await openStudio(page);
    await page.getByTestId("type-vcard").click();
    await page.getByLabel("First name").fill("Jane");
    await page.getByLabel("Last name").fill("Doe");
    await page.getByLabel("Email").fill("jane@example.com");
    await expectStatus(page, "ready");
    expect(await payloadText(page)).toBe(
      ["BEGIN:VCARD", "VERSION:3.0", "N:Doe;Jane;;;", "FN:Jane Doe", "EMAIL;TYPE=INTERNET:jane@example.com", "END:VCARD"].join("\r\n"),
    );
  });

  test("invalid input shows a field error and an invalid status", async ({ page }) => {
    await openStudio(page);
    await page.getByTestId("type-email").click();
    const to = page.getByLabel("Recipient email");
    await to.fill("not-an-email");
    await to.blur();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    await expectStatus(page, "invalid");
    await to.fill("hello@example.com");
    await expectStatus(page, "ready");
    expect(await payloadText(page)).toBe("mailto:hello@example.com");
  });

  test("very long content reports that it doesn't fit", async ({ page }) => {
    await openStudio(page);
    await page.getByTestId("type-text").click();
    await page.getByLabel("Text").fill("x".repeat(3200));
    await expect(page.getByText("Too much content")).toBeVisible();
    await expectStatus(page, "invalid");
  });
});

test.describe("localization", () => {
  test("Arabic is right-to-left and Arabic content round-trips through the decoder", async ({ page }) => {
    await openStudio(page, "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.getByTestId("tab-content")).toHaveText(/المحتوى/);

    // Technical fields stay left-to-right.
    await expect(page.locator('input[name="url"]')).toHaveAttribute("dir", "ltr");

    await page.getByTestId("type-text").click();
    const text = "مرحبا بالعالم — رمز QR ✓";
    await page.locator('textarea[name="text"]').fill(text);
    // "ready" means the rendered code was decoded and matched the UTF-8 text exactly.
    await expectStatus(page, "ready");
    expect(await payloadText(page)).toBe(text);
  });

  test("the language switcher navigates and remembers the choice", async ({ page }) => {
    await openStudio(page);
    await page.getByRole("button", { name: "Language" }).click();
    await page.getByRole("menuitem", { name: "العربية" }).click();
    await expect(page).toHaveURL(/\/ar$/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await page.goto("/");
    await expect(page).toHaveURL(/\/ar$/);
  });

  test("the root path follows the browser language", async ({ browser }) => {
    const context = await browser.newContext({ locale: "ar-SA", extraHTTPHeaders: { "accept-language": "ar-SA,ar;q=0.9" } });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/ar$/);
    await context.close();
  });
});

test.describe("persistence and preferences", () => {
  test("restores the session but never stores Wi-Fi passwords by default", async ({ page }) => {
    await openStudio(page);
    await page.getByLabel("Website URL").fill("example.com/persist");
    await page.getByTestId("type-wifi").click();
    await page.getByLabel("Network name (SSID)").fill("Office");
    await page.getByLabel("Password").fill("supersecret");
    await page.waitForTimeout(700); // autosave debounce
    const stored = await page.evaluate(() => localStorage.getItem("qrstudio:session:v1") ?? "");
    expect(stored).toContain("Office");
    expect(stored).not.toContain("supersecret");

    await page.reload();
    await expect(page.getByLabel("Network name (SSID)")).toHaveValue("Office");
    await expect(page.getByLabel("Password")).toHaveValue("");
    await page.getByTestId("type-url").click();
    await expect(page.getByLabel("Website URL")).toHaveValue("example.com/persist");
  });

  test("theme preference applies and persists", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await openStudio(page);
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await page.getByRole("button", { name: "Theme" }).click();
    await page.getByRole("menuitemradio", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("saved styles can be applied and duplicated", async ({ page }) => {
    await openStudio(page);
    await page.getByLabel("Website URL").fill("example.com");
    await page.getByTestId("tab-design").click();
    await page.getByRole("button", { name: "Ocean Blue" }).click();
    await page.getByRole("button", { name: "Save current style" }).click();
    await page.getByLabel("Style name").fill("Brand");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("button", { name: "Apply: Brand" })).toBeVisible();
    await page.getByRole("button", { name: "More actions: Brand" }).click();
    await page.getByRole("menuitem", { name: "Duplicate" }).click();
    await expect(page.getByRole("button", { name: "Apply: Brand copy" })).toBeVisible();
  });

  test("downloads are listed in history and can be reopened", async ({ page }) => {
    await openStudio(page);
    await page.getByLabel("Website URL").fill("example.com/history");
    await expectStatus(page, "ready");
    await Promise.all([page.waitForEvent("download"), page.getByTestId("download-button").click()]);
    await page.getByLabel("Website URL").fill("example.com/other");
    await page.getByRole("button", { name: "History" }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByText("https://example.com/history")).toBeVisible();
    await sheet.getByRole("button", { name: "Open", exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByLabel("Website URL")).toHaveValue("example.com/history");
  });
});

test.describe("footer", () => {
  for (const [locale, label] of [
    ["en", "Salar Dev on GitHub"],
    ["ar", "Salar Dev على GitHub"],
  ] as const) {
    test(`credits the developer with links to GitHub (${locale})`, async ({ page }) => {
      await openStudio(page, locale);
      const footer = page.locator("footer");
      const name = footer.getByRole("link", { name: "Salar Dev", exact: true });
      await expect(name).toHaveAttribute("href", "https://github.com/salar-dev");
      await expect(name).toHaveAttribute("target", "_blank");
      await expect(name).toHaveAttribute("rel", /noopener/);
      await expect(footer.getByRole("link", { name: label })).toHaveAttribute("href", "https://github.com/salar-dev");
    });
  }
});

test.describe("server routes", () => {
  test("upload endpoint reports uploads as disabled without storage credentials", async ({ request }) => {
    const config = await request.get("/api/upload");
    expect(config.ok()).toBe(true);
    expect(await config.json()).toMatchObject({ enabled: false });
    const upload = await request.post("/api/upload", { multipart: { file: { name: "a.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") } } });
    expect(upload.status()).toBe(503);
  });

  test("unknown routes return a 404 page", async ({ page }) => {
    const response = await page.goto("/does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByText("Page not found")).toBeVisible();
  });

  test("pages expose SEO metadata", async ({ page }) => {
    await page.goto("/en");
    await expect(page).toHaveTitle(/QR Code Studio/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /QR codes/);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /QR Code Studio/);
    await expect(page.locator('link[rel="alternate"][hreflang="ar"]')).toHaveAttribute("href", /\/ar$/);
    await expect(page.locator('link[rel="icon"]').first()).toHaveAttribute("href", /icon/);
  });
});
