import { expect, test } from "@playwright/test";

const enabled = process.env.RUN_SCHEDULING_E2E === "1";
const patientPassword = process.env.DEMO_PATIENT_ONE_PASSWORD;
const psychiatristPassword = process.env.DEMO_PSYCHIATRIST_ONE_PASSWORD;

async function signIn(page, email, password) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/app$/);
}

test.describe("database-backed scheduling", () => {
  test.skip(!enabled || !patientPassword || !psychiatristPassword, "requires ignored synthetic demo credentials");

  test("a patient books a slot and the assigned psychiatrist can view appointments", async ({ page }) => {
    test.setTimeout(60_000);
    await signIn(page, "patient.one@demo.orion.invalid", patientPassword);
    await page.getByRole("main").getByRole("link", { name: "Book an appointment" }).click();

    await expect(page.getByRole("heading", { name: "Book an appointment" })).toBeVisible();
    await expect(page.getByLabel("Open appointment slots").getByRole("button", { name: "Choose this slot" })).toHaveCount(2);
    await page.getByRole("button", { name: "Choose this slot" }).first().click();
    await page.getByRole("button", { name: "Confirm booking" }).click();
    await expect(page.getByText("Your synthetic demo appointment is booked.")).toBeVisible();

    await signIn(page, "psychiatrist.one@demo.orion.invalid", psychiatristPassword);
    await page.getByRole("main").getByRole("link", { name: "My appointments" }).click();
    await expect(page.getByRole("heading", { name: "Assigned appointments" })).toBeVisible();
    await expect(page.getByLabel("Appointments").getByText("Assigned patient appointment").first()).toBeVisible();
  });
});
