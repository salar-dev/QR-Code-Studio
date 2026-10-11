import { expect, test, type Page } from "@playwright/test";
import { expectStatus, openStudio } from "./helpers";

async function expectNoHorizontalOverflow(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}

for (const locale of ["en", "ar"] as const) {
  test(`mobile layout has no horizontal overflow (${locale})`, async ({ page }) => {
    await openStudio(page, locale);
    await expectNoHorizontalOverflow(page);
    for (const tab of ["tab-design", "tab-export", "tab-content"]) {
      await page.getByTestId(tab).click();
      await expectNoHorizontalOverflow(page);
    }
    // Every content type form fits too.
    for (const type of ["vcard", "event", "social", "wifi", "location", "file"]) {
      await page.getByTestId(`type-${type}`).click();
      await expectNoHorizontalOverflow(page);
    }
  });
}

test("the dock shows the live code, opens the preview and downloads", async ({ page }) => {
  await openStudio(page);
  await page.getByLabel("Website URL").fill("example.com/mobile");
  await expectStatus(page, "ready");

  const dockButton = page.getByTestId("dock-preview");
  await expect(dockButton.locator("img")).toBeVisible();
  await dockButton.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByTestId("qr-preview-image")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();

  const [file] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download PNG" }).first().click()]);
  expect(file.suggestedFilename()).toBe("qr-code.png");
});

test("touch targets in the editor are at least 36px tall", async ({ page }) => {
  await openStudio(page);
  const small = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("main button, main input, main [role=radio], main [role=tab]")]
      .filter((el) => el.offsetParent !== null && !el.closest(".sr-only"))
      .map((el) => ({ el: el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 30), h: el.getBoundingClientRect().height }))
      .filter((item) => item.h > 0 && item.h < 36),
  );
  expect(small).toEqual([]);
});
