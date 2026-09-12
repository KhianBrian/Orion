import { expect, test } from "@playwright/test";
import { assertNoSeriousViolations } from "./helpers/accessibility.js";

test.describe("accessibility — public routes", () => {
  for (const path of [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/confirm-email",
    "/home",
    "/about",
    "/contact",
    "/services",
    "/blog",
  ]) {
    test(`${path} has no serious or critical accessibility violations`, async ({ page }) => {
      // Scan the settled state: entrance animations (e.g. the home hero fade-in) otherwise let axe
      // sample a transient, low-contrast in-between frame and report a false low-contrast violation.
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(path);
      await assertNoSeriousViolations(page);
    });
  }

  test("the 404 page renders and has no serious or critical accessibility violations", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/this-route-does-not-exist");
    await expect(page.getByRole("heading")).toBeVisible();
    await assertNoSeriousViolations(page);
  });
});

test.describe("accessibility — reduced motion", () => {
  test("prefers-reduced-motion collapses animation and transition duration globally", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/login");
    const durations = await page.evaluate(() => {
      const style = getComputedStyle(document.body);
      return { animation: parseFloat(style.animationDuration), transition: parseFloat(style.transitionDuration) };
    });
    expect(durations.animation).toBeLessThan(0.001);
    expect(durations.transition).toBeLessThan(0.001);
  });
});

// Authenticated-route accessibility coverage lives in scheduling.spec.js: it reuses that file's
// serial sign-in flow instead of signing in again here, which would race the same shared synthetic
// patient account from a second parallel worker (fullyParallel runs separate files concurrently).
