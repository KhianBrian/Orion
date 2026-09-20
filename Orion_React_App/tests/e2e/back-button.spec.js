import { expect, test } from "@playwright/test";

const authBackRoutes = [
  "/confirm-email",
  "/forgot-password",
  "/reset-password",
];

test.describe("shared back button", () => {
  for (const route of authBackRoutes) {
    test(`${route} reveals its label on hover and focus`, async ({ page }) => {
      await page.goto(route);

      const backButton = page.getByRole("link", { name: "Return to sign in" });
      const label = backButton.locator(".back-button__label");

      await expect(backButton).toBeVisible();
      await expect(backButton.locator(".back-button__icon")).toBeVisible();
      await expect(label).not.toBeVisible();

      await backButton.hover();
      await expect(label).toBeVisible();
      await expect(backButton).toHaveCSS("color", "rgb(18, 48, 74)");
      await expect(backButton).toHaveCSS("text-decoration-line", "none");

      await backButton.focus();
      await expect(label).toBeVisible();
      await backButton.click();
      await expect(page).toHaveURL(/\/login$/);
    });
  }
});
