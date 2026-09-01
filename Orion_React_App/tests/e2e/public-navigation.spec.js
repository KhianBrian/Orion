import { expect, test } from "@playwright/test";

test.describe("public navigation", () => {
  test("a visitor can open login, request a reset, and return to login", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "LOGIN" })).toBeVisible();
    await page.getByRole("link", { name: "Forgot Password?" }).click();

    await expect(page).toHaveURL(/\/forgot-password$/);
    await expect(page.getByRole("heading", { name: "Forgot Password?" })).toBeVisible();

    await page.getByRole("link", { name: "Back to Login" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("an invalid login receives a safe error", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[placeholder="email id"]').fill("patient@example.com");
    await page.locator('input[placeholder="password"]').fill("test-password");
    await page.getByRole("button", { name: "Login" }).click();

    await expect(page.getByRole("alert")).toHaveText("The email or password is incorrect.");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("a visitor is redirected to login before reaching an account route", async ({ page }) => {
    await page.goto("/patient-appointment");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("a visitor is redirected before reaching the protected meeting route", async ({ page }) => {
    await page.goto("/appointments/00000000-0000-4000-8000-000000000000/meeting");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("primary public links reach their destination pages", async ({ page }) => {
    await page.goto("/home");

    for (const [label, heading] of [
      ["About", "About Orion Interface Philippines"],
      ["Contact", "We are here to help"],
      ["Services", "Guidance for your next step"],
      ["Portfolio", "Programs built around people"],
      ["Blog", "Experiences and reflections"],
    ]) {
      await page.getByRole("link", { name: label, exact: true }).click();
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    }
  });
});
