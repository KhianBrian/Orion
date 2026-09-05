import { expect, test } from "@playwright/test";

test.describe("public navigation", () => {
  test("a visitor can open the approved public pages and sign-in route", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Sign in to Orion" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Public navigation" })).toHaveText(/Home.*About.*Contact.*Services.*Blog/);
    await expect(page.getByRole("link", { name: "Sign in", exact: true })).toHaveCount(0);
    await page.goto("/home");
    await page.getByRole("link", { name: "About", exact: true }).click();

    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByRole("heading", { name: "About Orion Interface Philippines" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  });

  test("an invalid login receives a safe error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill("patient@example.com");
    await page.getByLabel("Password", { exact: true }).fill("test-password");
    await page.getByRole("button", { name: "Sign in" }).click();

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

  test("the signed-out navigation contains only approved public destinations", async ({ page }) => {
    for (const [path, heading] of [["/contact", "We are here to help"], ["/services", "Guidance for your next step"], ["/blog", "Experiences and reflections"]]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    }

    await page.goto("/home");
    await expect(page.getByRole("navigation", { name: "Public navigation" })).toHaveText(/Home.*About.*Contact.*Services.*Blog.*Sign in/);
    await expect(page.getByRole("link", { name: "Portfolio", exact: true })).toHaveCount(0);
  });

  test("password visibility changes presentation without changing the value", async ({ page }) => {
    await page.goto("/login");
    const password = page.getByLabel("Password", { exact: true });
    await password.fill("test-password");
    await page.getByRole("button", { name: "Show password" }).click();
    await expect(password).toHaveAttribute("type", "text");
    await expect(password).toHaveValue("test-password");
    await expect(page.getByRole("button", { name: "Hide password" })).toHaveAttribute("aria-pressed", "true");
  });
});
