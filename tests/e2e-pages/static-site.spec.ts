import { expect, test } from "@playwright/test";
import { decodeImage, download, expectStatus, payloadText, pngInfo } from "../e2e/helpers";

const BASE = "/qr-code-studio";

test("the root URL sends visitors to their language", async ({ browser, baseURL }) => {
  const english = await browser.newContext({ baseURL, locale: "en-US" });
  const page = await english.newPage();
  await page.goto("./");
  await expect(page).toHaveURL(new RegExp(`${BASE}/en/$`));
  await english.close();

  const arabic = await browser.newContext({ baseURL, locale: "ar-SA" });
  const arPage = await arabic.newPage();
  await arPage.goto("./");
  await expect(arPage).toHaveURL(new RegExp(`${BASE}/ar/$`));
  await expect(arPage.locator("html")).toHaveAttribute("dir", "rtl");
  await arabic.close();
});

test("every asset loads from the base path and the code is generated, verified and exported", async ({ page }) => {
  const failed: string[] = [];
  page.on("response", (response) => {
    if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`);
  });
  await page.goto("en/");
  await page.getByLabel("Website URL").fill("example.com/pages");
  await expectStatus(page, "ready");
  expect(await payloadText(page)).toBe("https://example.com/pages");

  const png = await download(page, page.getByTestId("quick-png"));
  expect(pngInfo(png.bytes).width).toBe(1024);
  expect((await decodeImage(page, png.bytes, "image/png"))?.text).toBe("https://example.com/pages");

  const svg = await download(page, page.getByTestId("quick-svg"));
  expect((await decodeImage(page, svg.bytes, "image/svg+xml"))?.text).toBe("https://example.com/pages");

  // jsPDF/svg2pdf chunks must load from the base path too.
  const pdf = await download(page, page.getByTestId("quick-pdf"));
  expect(pdf.bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");

  // The design panel chunk and preset thumbnails load lazily.
  await page.getByTestId("tab-design").click();
  await page.getByRole("button", { name: "Ocean Blue" }).click();
  await expectStatus(page, "ready");

  expect(failed).toEqual([]);
});

test("file uploads are reported as unavailable without calling a server", async ({ page }) => {
  const apiCalls: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/")) apiCalls.push(request.url());
  });
  await page.goto("en/");
  await page.getByTestId("type-file").click();
  await page.getByRole("radio", { name: "Upload file" }).click();
  await expect(page.getByText("File uploads aren't enabled on this deployment.")).toBeVisible();
  // Linking to a hosted file still works.
  await page.getByRole("button", { name: "File link" }).click();
  await page.getByLabel("Public file URL").fill("https://example.com/menu.pdf");
  await expectStatus(page, "ready");
  expect(apiCalls).toEqual([]);
});

test("language switching stays inside the base path and is remembered", async ({ page }) => {
  await page.goto("en/");
  await page.getByRole("button", { name: "Language" }).click();
  await page.getByRole("menuitem", { name: "العربية" }).click();
  await expect(page).toHaveURL(new RegExp(`${BASE}/ar/$`));
  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name === "NEXT_LOCALE")).toMatchObject({ value: "ar", path: `${BASE}/` });
  await page.goto("./");
  await expect(page).toHaveURL(new RegExp(`${BASE}/ar/$`));
});

test("unknown pages show the custom 404 page", async ({ page }) => {
  const response = await page.goto("does-not-exist/");
  expect(response?.status()).toBe(404);
  await expect(page.getByText("Page not found")).toBeVisible();
  await page.getByRole("link", { name: "Back to the studio" }).click();
  await expect(page).toHaveURL(new RegExp(`${BASE}/(en|ar)/$`));
});

test("SEO files and the social image are published", async ({ page, request }) => {
  await page.goto("en/");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", "https://salar-dev.github.io/qr-code-studio/og.png");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://salar-dev.github.io/qr-code-studio/en/");

  const og = await request.get("og.png");
  expect(og.headers()["content-type"]).toBe("image/png");
  expect(pngInfo(await og.body())).toMatchObject({ width: 1200, height: 630 });
  expect(await (await request.get("robots.txt")).text()).toContain("https://salar-dev.github.io/qr-code-studio/sitemap.xml");
  expect(await (await request.get("sitemap.xml")).text()).toContain("https://salar-dev.github.io/qr-code-studio/ar/");
  expect(await (await request.get("manifest.webmanifest")).json()).toMatchObject({ start_url: `${BASE}/` });
});

test("footer credits the developer", async ({ page }) => {
  await page.goto("en/");
  const footer = page.locator("footer");
  await expect(footer.getByRole("link", { name: "Wasalat Developer", exact: true })).toHaveAttribute("href", "https://github.com/salar-dev");
  await expect(footer.getByRole("link", { name: "Wasalat Developer on GitHub" })).toHaveAttribute("href", "https://github.com/salar-dev");
});
