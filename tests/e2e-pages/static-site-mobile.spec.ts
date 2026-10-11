import { expect, test } from "@playwright/test";
import { expectStatus } from "../e2e/helpers";

for (const locale of ["en", "ar"] as const) {
  test(`static mobile site works without horizontal overflow (${locale})`, async ({ page }) => {
    await page.goto(`${locale}/`);
    await page.locator('input[name="url"]').fill("example.com");
    await expectStatus(page, "ready");
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
    await expect(page.locator("footer").getByRole("link", { name: "Salar Dev", exact: true })).toBeVisible();
  });
}
