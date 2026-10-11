import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectStatus, openStudio } from "./helpers";

for (const locale of ["en", "ar"] as const) {
  for (const scheme of ["light", "dark"] as const) {
    test(`no serious accessibility violations (${locale}, ${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await openStudio(page, locale);
      await page.locator('input[name="url"]').fill("example.com");
      await expectStatus(page, "ready");

      for (const tab of ["tab-content", "tab-design"]) {
        await page.getByTestId(tab).click();
        await page.waitForTimeout(400);
        const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
        const serious = results.violations
          .filter((v) => v.impact === "serious" || v.impact === "critical")
          .map((v) => ({ id: v.id, help: v.help, targets: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) }));
        expect(serious, `${tab}`).toEqual([]);
      }
    });
  }
}
