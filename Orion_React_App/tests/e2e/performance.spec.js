import { expect, test } from "@playwright/test";

const publicRoutes = ["/login", "/home", "/about", "/contact", "/services", "/blog"];

test.describe("frontend acceptance performance and layout", () => {
  test("public routes do not request third-party fonts or meeting/admin chunks initially", async ({ page }) => {
    const requests = [];
    page.on("request", (request) => requests.push(request.url()));

    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Sign in to Orion" })).toBeVisible();

    expect(requests.filter((url) => /fonts\.(googleapis|gstatic)\.com/i.test(url))).toEqual([]);
    expect(requests.some((url) => /DemoMeeting-|ProvisionPsychiatrist-/.test(url))).toBe(false);
  });

  for (const route of publicRoutes) {
    test(`${route} has no horizontal overflow at the active viewport`, async ({ page }) => {
      await page.goto(route);
      const dimensions = await page.evaluate(() => ({
        viewport: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
      }));
      expect(dimensions.documentWidth, `${route} overflows horizontally`).toBeLessThanOrEqual(dimensions.viewport);
    });
  }
});
