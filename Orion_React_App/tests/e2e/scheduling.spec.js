import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const enabled = process.env.RUN_SCHEDULING_E2E === "1";
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const syntheticUsers = {
  chromium: {
    patient: { email: "patient.one@demo.orion.invalid", password: process.env.DEMO_PATIENT_ONE_PASSWORD },
    psychiatrist: { email: "psychiatrist.one@demo.orion.invalid", password: process.env.DEMO_PSYCHIATRIST_ONE_PASSWORD, displayName: "Dr. Maya Santos" },
  },
  "mobile-chrome": {
    patient: { email: "patient.two@demo.orion.invalid", password: process.env.DEMO_PATIENT_TWO_PASSWORD },
    psychiatrist: { email: "psychiatrist.two@demo.orion.invalid", password: process.env.DEMO_PSYCHIATRIST_TWO_PASSWORD, displayName: "Dr. Luis Navarro" },
  },
};

if (enabled && Object.values(syntheticUsers).some(({ patient, psychiatrist }) => !patient.password || !psychiatrist.password)) {
  throw new Error("RUN_SCHEDULING_E2E=1 requires both synthetic patient and psychiatrist passwords for desktop and mobile projects");
}

if (enabled && (!supabaseUrl || !serviceRoleKey)) {
  throw new Error("RUN_SCHEDULING_E2E=1 requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for isolated synthetic test slots");
}

const service = enabled
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

async function required(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function createIsolatedSlot(psychiatristEmail, projectName) {
  const { data: users, error: usersError } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError) throw new Error(`load synthetic users: ${usersError.message}`);
  const psychiatristUser = users.users.find((user) => user.email === psychiatristEmail);
  if (!psychiatristUser) throw new Error(`synthetic psychiatrist missing for ${projectName}`);
  const psychiatrist = await required(
    service.from("psychiatrists").select("id").eq("profile_id", psychiatristUser.id).eq("is_active", true).single(),
    "load active synthetic psychiatrist",
  );

  const start = new Date(Date.now() + 75 * 24 * 60 * 60 * 1000);
  start.setUTCMinutes(0, 0, 0);
  start.setUTCHours(projectName === "chromium" ? 1 : 3);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const startsAt = new Date(start.getTime() + attempt * 2 * 60 * 60 * 1000);
    const id = crypto.randomUUID();
    const { error } = await service.from("availability_slots").insert({
      id,
      psychiatrist_id: psychiatrist.id,
      starts_at: startsAt.toISOString(),
      ends_at: new Date(startsAt.getTime() + 45 * 60 * 1000).toISOString(),
      status: "open",
    });
    if (!error) return id;
    if (!/overlap|exclusion|duplicate/i.test(error.message)) throw new Error(`create isolated slot: ${error.message}`);
  }
  throw new Error(`could not create an isolated synthetic slot for ${projectName}`);
}

async function removeIsolatedSlot(slotId) {
  if (!slotId) return;
  const appointments = await required(service.from("appointments").select("id").eq("slot_id", slotId), "load isolated test appointments");
  if (appointments.length) {
    await required(service.from("audit_events").delete().in("target_id", appointments.map(({ id }) => id)), "remove isolated test audit events");
    await required(service.from("appointments").delete().eq("slot_id", slotId), "remove isolated test appointments");
  }
  await required(service.from("availability_slots").delete().eq("id", slotId), "remove isolated test slot");
}

async function signIn(page, email, password) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/app$/);
}

test.describe("database-backed scheduling", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!enabled, "requires ignored synthetic demo credentials");
  let isolatedSlotId;

  test.beforeAll(async ({ browser: _browser }, testInfo) => {
    void _browser;
    const users = syntheticUsers[testInfo.project.name];
    isolatedSlotId = await createIsolatedSlot(users.psychiatrist.email, testInfo.project.name);
  });

  test.afterAll(async () => {
    await removeIsolatedSlot(isolatedSlotId);
  });

  test("a synthetic session survives refresh and protected navigation is cleared on sign-out", async ({ page }, testInfo) => {
    const users = syntheticUsers[testInfo.project.name];
    await signIn(page, users.patient.email, users.patient.password);
    await page.getByRole("main").getByRole("link", { name: "My appointments" }).click();
    await expect(page.getByTestId("authenticated-shell")).toBeVisible();
    await expect(page.getByRole("heading", { name: "My appointments" })).toBeVisible();

    await page.getByRole("main").getByRole("link", { name: "Book an appointment" }).click();
    await expect(page).toHaveURL(/\/patient-appointment$/);
    await expect(page.getByTestId("authenticated-shell")).toBeVisible();
    await page.getByRole("main").getByRole("link", { name: "My appointments" }).click();

    await page.reload();
    await expect(page).toHaveURL(/\/appointments$/);
    await expect(page.getByTestId("authenticated-shell")).toBeVisible();
    await expect(page.getByRole("heading", { name: "My appointments" })).toBeVisible();

    await page.getByRole("button", { name: /^Sign out/ }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/appointments");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("a patient books a slot and the assigned psychiatrist can view appointments", async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    const users = syntheticUsers[testInfo.project.name];
    await signIn(page, users.patient.email, users.patient.password);
    await page.getByRole("main").getByRole("link", { name: "Book an appointment" }).click();

    await expect(page.getByRole("heading", { name: "Book an appointment" })).toBeVisible();
    const psychiatristSlot = page.getByLabel("Open appointment slots").locator("article").filter({ hasText: users.psychiatrist.displayName }).last();
    await expect(psychiatristSlot.getByRole("button", { name: "Choose this slot" })).toBeVisible();
    await psychiatristSlot.getByRole("button", { name: "Choose this slot" }).click();
    await page.getByRole("button", { name: "Confirm booking" }).click();
    await expect(page.getByText("Your synthetic demo appointment is booked.")).toBeVisible();

    await signIn(page, users.psychiatrist.email, users.psychiatrist.password);
    await page.getByRole("main").getByRole("link", { name: "My appointments" }).click();
    await expect(page.getByRole("heading", { name: "Assigned appointments" })).toBeVisible();
    await expect(page.getByLabel("Appointments").getByText("Assigned patient appointment").first()).toBeVisible();
  });

  test("a patient can cancel a booked appointment", async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    const users = syntheticUsers[testInfo.project.name];
    await signIn(page, users.patient.email, users.patient.password);
    await page.getByRole("main").getByRole("link", { name: "My appointments" }).click();
    await expect(page.getByRole("heading", { name: "My appointments" })).toBeVisible();

    const bookedAppointment = page.getByLabel("Appointments").locator("article").filter({ hasText: users.psychiatrist.displayName }).last();
    await expect(bookedAppointment.getByRole("button", { name: "Cancel appointment" })).toBeVisible();
    await bookedAppointment.getByRole("button", { name: "Cancel appointment" }).click();
    await expect(page.getByRole("heading", { name: "Cancel this appointment?" })).toBeVisible();
    await page.getByRole("button", { name: "Confirm cancellation" }).click();
    await expect(page.getByText("Your appointment has been cancelled.")).toBeVisible();
    await expect(page.getByLabel("Appointments").getByText(/cancelled/).first()).toBeVisible();
  });
});
