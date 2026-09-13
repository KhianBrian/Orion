import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { assertNoSeriousViolations } from "./helpers/accessibility.js";

const enabled = process.env.RUN_SCHEDULING_E2E === "1";
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const syntheticUsers = {
  chromium: { patient: { email: "patient.one@demo.orion.invalid", password: process.env.DEMO_SHARED_PASSWORD || process.env.DEMO_PATIENT_ONE_PASSWORD }, psychiatrist: { email: "psychiatrist.one@demo.orion.invalid", password: process.env.DEMO_SHARED_PASSWORD || process.env.DEMO_PSYCHIATRIST_ONE_PASSWORD } },
  "mobile-chrome": { patient: { email: "patient.two@demo.orion.invalid", password: process.env.DEMO_SHARED_PASSWORD || process.env.DEMO_PATIENT_TWO_PASSWORD }, psychiatrist: { email: "psychiatrist.two@demo.orion.invalid", password: process.env.DEMO_SHARED_PASSWORD || process.env.DEMO_PSYCHIATRIST_TWO_PASSWORD } },
};

if (enabled && (Object.values(syntheticUsers).some(({ patient, psychiatrist }) => !patient.password || !psychiatrist.password)
  || !(process.env.DEMO_SHARED_PASSWORD || process.env.DEMO_ADMIN_PASSWORD))) {
  throw new Error("RUN_SCHEDULING_E2E=1 requires synthetic patient passwords for support coverage");
}
if (enabled && (!supabaseUrl || !serviceRoleKey)) {
  throw new Error("RUN_SCHEDULING_E2E=1 requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for support cleanup");
}

const service = enabled ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } }) : null;
async function required(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}
async function signIn(page, user) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(user.email);
  await page.getByRole("textbox", { name: "Password" }).fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app$/);
}

test.describe("administrative support tickets", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!enabled, "requires ignored synthetic demo credentials");
  const ticketIds = [];
  let patientId;
  let psychiatristId;
  const sentinel = `Synthetic support request ${crypto.randomUUID()}`;
  const psychiatristSentinel = `Synthetic psychiatrist bug report ${crypto.randomUUID()}`;

  test.beforeAll(async ({ browser: _browser }, testInfo) => {
    void _browser;
    const user = syntheticUsers[testInfo.project.name].patient;
    const users = await required(service.auth.admin.listUsers({ page: 1, perPage: 1000 }), "load synthetic users");
    patientId = users.users.find((candidate) => candidate.email === user.email)?.id;
    psychiatristId = users.users.find((candidate) => candidate.email === syntheticUsers[testInfo.project.name].psychiatrist.email)?.id;
    if (!patientId) throw new Error(`synthetic patient missing for ${testInfo.project.name}`);
    if (!psychiatristId) throw new Error(`synthetic psychiatrist missing for ${testInfo.project.name}`);
  });

  test.afterAll(async () => {
    if (!ticketIds.length) return;
    await service.from("audit_events").delete().in("target_id", ticketIds);
    await service.from("support_ticket_reads").delete().in("ticket_id", ticketIds);
    await service.from("support_ticket_messages").delete().in("ticket_id", ticketIds);
    await service.from("support_tickets").delete().in("id", ticketIds);
  });

  test("a patient submits and reads an administrative ticket", async ({ page }, testInfo) => {
    await signIn(page, syntheticUsers[testInfo.project.name].patient);
    await page.goto("/support");
    await expect(page.getByRole("heading", { name: "Support" })).toBeVisible();
    await expect(page.getByText("Orion support is not an emergency service.")).toBeVisible();
    await page.getByLabel("How can we help?").fill(sentinel);
    await page.getByRole("button", { name: "Submit ticket" }).click();
    await expect(page.getByText("Your support ticket was submitted.")).toBeVisible();
    const tickets = await required(service.from("support_tickets").select("id").eq("requester_id", patientId).order("created_at", { ascending: false }).limit(1), "load created support ticket");
    ticketIds.push(tickets[0].id);
    await page.locator(".support-ticket-row").first().click();
    await expect(page.getByText(sentinel)).toBeVisible();
    await assertNoSeriousViolations(page);
  });

  test("a psychiatrist can submit and read a support issue", async ({ page }, testInfo) => {
    await signIn(page, syntheticUsers[testInfo.project.name].psychiatrist);
    await page.goto("/support");
    await expect(page.getByRole("heading", { name: "Support" })).toBeVisible();
    await page.getByLabel("How can we help?").fill(psychiatristSentinel);
    await page.getByRole("button", { name: "Submit ticket" }).click();
    await expect(page.getByText("Your support ticket was submitted.")).toBeVisible();
    const tickets = await required(service.from("support_tickets").select("id").eq("requester_id", psychiatristId).order("created_at", { ascending: false }).limit(1), "load created psychiatrist support ticket");
    ticketIds.push(tickets[0].id);
    await page.locator(".support-ticket-row").first().click();
    await expect(page.getByText(psychiatristSentinel)).toBeVisible();
    await assertNoSeriousViolations(page);
  });

  test("an administrator can reply and the requester receives a notification", async ({ page, browser }, testInfo) => {
    await signIn(page, { email: "admin@demo.orion.invalid", password: process.env.DEMO_SHARED_PASSWORD || process.env.DEMO_ADMIN_PASSWORD });
    await page.goto("/support");
    await expect(page.getByRole("heading", { name: "Support queue" })).toBeVisible();
    const patientName = testInfo.project.name === "chromium" ? "Alex Reyes" : "Sam Cruz";
    await page.locator(".support-ticket-row").filter({ hasText: `Requester: ${patientName}` }).last().click();
    await expect(page.getByText(sentinel)).toBeVisible();
    const adminReply = `Synthetic support response ${crypto.randomUUID()}`;
    await page.getByLabel("Reply to this ticket").fill(adminReply);
    await page.getByRole("button", { name: "Send reply" }).click();
    await expect(page.getByText("Your reply was sent.")).toBeVisible();
    await expect(page.getByText(adminReply)).toBeVisible();

    const patientPage = await browser.newPage();
    await signIn(patientPage, syntheticUsers[testInfo.project.name].patient);
    await patientPage.goto("/support");
    await expect(patientPage.locator(".support-ticket-row__unread")).toHaveText("New reply");
    await patientPage.locator(".support-ticket-row").first().click();
    await expect(patientPage.getByText(adminReply)).toBeVisible();
    await patientPage.close();
    await assertNoSeriousViolations(page);
  });
});
