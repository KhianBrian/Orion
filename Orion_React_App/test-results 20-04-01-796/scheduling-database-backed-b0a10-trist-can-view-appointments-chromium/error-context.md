# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: scheduling.spec.js >> database-backed scheduling >> a patient books a slot and the assigned psychiatrist can view appointments
- Location: tests/e2e/scheduling.spec.js:31:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Your synthetic demo appointment is booked.')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Your synthetic demo appointment is booked.')

```

```yaml
- navigation:
  - link "Orion Logo":
    - /url: /home
    - img "Orion Logo"
  - link "Home":
    - /url: /home
  - link "About":
    - /url: /about
  - link "Book an appointment":
    - /url: /patient-appointment
  - link "My appointments":
    - /url: /appointments
  - link "Contact":
    - /url: /contact
  - link "Services":
    - /url: /services
  - link "Portfolio":
    - /url: /portfolio
  - link "Blog":
    - /url: /blog
  - button "Sign out Alex Reyes"
- main:
  - main:
    - paragraph: Synthetic demo
    - heading "Book an appointment" [level=1]
    - paragraph: All times are shown in Manila time. Each session is 45 minutes.
    - link "My appointments":
      - /url: /appointments
    - status: This slot is no longer available. Please choose another time.
    - region "Open appointment slots":
      - article:
        - heading "Dr. Maya Santos" [level=2]
        - paragraph: Wednesday, September 2, 2026 at 9:00 AM
        - paragraph: 45 minutes
        - button "Choose this slot"
- contentinfo:
  - paragraph: © 2025 Orion Interface Philippines, Inc. All rights reserved under Albetros Philippines, Inc.
  - paragraph: "Follow us on social media:"
  - link "Facebook":
    - /url: https://www.facebook.com/profile.php?viewas=100000686899395&id=61573787343857
    - img "Facebook"
  - link "Instagram":
    - /url: "#"
    - img "Instagram"
  - button "FAQ"
  - button "Privacy Policy"
  - button "Terms of Service"
  - button "Careers"
  - button "Support"
  - button "Sitemap"
- region "Notifications Alt+T"
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | const enabled = process.env.RUN_SCHEDULING_E2E === "1";
  4  | const syntheticUsers = {
  5  |   chromium: {
  6  |     patient: { email: "patient.one@demo.orion.invalid", password: process.env.DEMO_PATIENT_ONE_PASSWORD },
  7  |     psychiatrist: { email: "psychiatrist.one@demo.orion.invalid", password: process.env.DEMO_PSYCHIATRIST_ONE_PASSWORD },
  8  |   },
  9  |   "mobile-chrome": {
  10 |     patient: { email: "patient.two@demo.orion.invalid", password: process.env.DEMO_PATIENT_TWO_PASSWORD },
  11 |     psychiatrist: { email: "psychiatrist.two@demo.orion.invalid", password: process.env.DEMO_PSYCHIATRIST_TWO_PASSWORD },
  12 |   },
  13 | };
  14 | 
  15 | if (enabled && Object.values(syntheticUsers).some(({ patient, psychiatrist }) => !patient.password || !psychiatrist.password)) {
  16 |   throw new Error("RUN_SCHEDULING_E2E=1 requires both synthetic patient and psychiatrist passwords for desktop and mobile projects");
  17 | }
  18 | 
  19 | async function signIn(page, email, password) {
  20 |   await page.goto("/login");
  21 |   await page.getByLabel("Email address").fill(email);
  22 |   await page.getByLabel("Password").fill(password);
  23 |   await page.getByRole("button", { name: "Login" }).click();
  24 |   await expect(page).toHaveURL(/\/app$/);
  25 | }
  26 | 
  27 | test.describe("database-backed scheduling", () => {
  28 |   test.describe.configure({ mode: "serial" });
  29 |   test.skip(!enabled, "requires ignored synthetic demo credentials");
  30 | 
  31 |   test("a patient books a slot and the assigned psychiatrist can view appointments", async ({ page }, testInfo) => {
  32 |     test.setTimeout(60_000);
  33 |     const users = syntheticUsers[testInfo.project.name];
  34 |     await signIn(page, users.patient.email, users.patient.password);
  35 |     await page.getByRole("main").getByRole("link", { name: "Book an appointment" }).click();
  36 | 
  37 |     await expect(page.getByRole("heading", { name: "Book an appointment" })).toBeVisible();
  38 |     await expect(page.getByLabel("Open appointment slots").getByRole("button", { name: "Choose this slot" }).first()).toBeVisible();
  39 |     await page.getByRole("button", { name: "Choose this slot" }).first().click();
  40 |     await page.getByRole("button", { name: "Confirm booking" }).click();
> 41 |     await expect(page.getByText("Your synthetic demo appointment is booked.")).toBeVisible();
     |                                                                                ^ Error: expect(locator).toBeVisible() failed
  42 | 
  43 |     await signIn(page, users.psychiatrist.email, users.psychiatrist.password);
  44 |     await page.getByRole("main").getByRole("link", { name: "My appointments" }).click();
  45 |     await expect(page.getByRole("heading", { name: "Assigned appointments" })).toBeVisible();
  46 |     await expect(page.getByLabel("Appointments").getByText("Assigned patient appointment").first()).toBeVisible();
  47 |   });
  48 | 
  49 |   test("a patient can cancel a booked appointment", async ({ page }, testInfo) => {
  50 |     test.setTimeout(60_000);
  51 |     const users = syntheticUsers[testInfo.project.name];
  52 |     await signIn(page, users.patient.email, users.patient.password);
  53 |     await page.getByRole("main").getByRole("link", { name: "My appointments" }).click();
  54 |     await expect(page.getByRole("heading", { name: "My appointments" })).toBeVisible();
  55 | 
  56 |     const bookedAppointment = page.getByLabel("Appointments").locator("article").filter({ hasText: "booked" }).first();
  57 |     await expect(bookedAppointment.getByRole("button", { name: "Cancel appointment" })).toBeVisible();
  58 |     await bookedAppointment.getByRole("button", { name: "Cancel appointment" }).click();
  59 |     await expect(page.getByRole("heading", { name: "Cancel this appointment?" })).toBeVisible();
  60 |     await page.getByRole("button", { name: "Confirm cancellation" }).click();
  61 |     await expect(page.getByText("Your appointment has been cancelled.")).toBeVisible();
  62 |     await expect(page.getByLabel("Appointments").getByText(/cancelled/).first()).toBeVisible();
  63 |   });
  64 | });
  65 | 
```