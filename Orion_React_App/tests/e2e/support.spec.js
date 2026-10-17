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
    await expect(page.getByRole("heading", { name: "Support", exact: true })).toBeVisible();
    await expect(page.getByText("If there is immediate danger, contact local emergency services.")).toBeVisible();
    await page.getByLabel("Tell us what happened").fill(sentinel);
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
    await expect(page.getByRole("heading", { name: "Support", exact: true })).toBeVisible();
    await page.getByLabel("Tell us what happened").fill(psychiatristSentinel);
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
  test("an administrator changes a ticket status while the requester only reads it", async ({ page, browser }, testInfo) => {
    test.setTimeout(120_000);
    await signIn(page, { email: "admin@demo.orion.invalid", password: process.env.DEMO_SHARED_PASSWORD || process.env.DEMO_ADMIN_PASSWORD });
    await page.goto("/support");
    const patientName = testInfo.project.name === "chromium" ? "Alex Reyes" : "Sam Cruz";
    await page.locator(".support-ticket-row").filter({ hasText: `Requester: ${patientName}` }).last().click();
    await expect(page.getByText(sentinel)).toBeVisible();

    // Tickets have no owner: there is nothing to take, release, or reassign.
    await expect(page.getByRole("button", { name: "Take ticket" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Release ticket" })).toHaveCount(0);
    await expect(page.getByLabel("Reassign to")).toHaveCount(0);
    await page.getByLabel("Change status").selectOption("in_progress");
    await page.getByRole("button", { name: "Update status" }).click();
    await expect(page.getByText("The ticket was updated.")).toBeVisible();
    await expect(page.locator(".support-admin__summary")).toContainText("In progress");

    const followUp = `Synthetic follow-up ${crypto.randomUUID()}`;
    await page.getByLabel("Reply to this ticket").fill(followUp);
    await page.getByRole("button", { name: "Send reply" }).click();
    await expect(page.getByText(followUp)).toBeVisible();
    await page.getByLabel("Change status").selectOption("resolved");
    await page.getByRole("button", { name: "Update status" }).click();
    await expect(page.locator(".support-admin__summary")).toContainText("Resolved");

    // The requester is notified in-app, reads the status, and has no handling controls.
    const patientPage = await browser.newPage();
    await signIn(patientPage, syntheticUsers[testInfo.project.name].patient);
    await patientPage.goto("/support");
    await expect(patientPage.getByTestId("support-notification-badge")).toBeVisible();
    await patientPage.locator(".support-ticket-row").first().click();
    await expect(patientPage.getByText(followUp)).toBeVisible();
    await expect(patientPage.locator(".support-thread__status")).toContainText("Resolved");
        await expect(patientPage.getByLabel("Change status")).toHaveCount(0);
    await expect(patientPage.getByTestId("support-notification-badge")).toHaveCount(0);

    // A closed ticket accepts no replies from either side.
    await page.getByLabel("Change status").selectOption("closed");
    await page.getByRole("button", { name: "Update status" }).click();
    await expect(page.locator(".support-admin__summary")).toContainText("Closed");
    await expect(page.getByLabel("Reply to this ticket")).toHaveCount(0);
    await patientPage.reload();
    await patientPage.locator(".support-ticket-row").first().click();
    await expect(patientPage.getByText("This ticket is closed.")).toBeVisible();
    await expect(patientPage.getByLabel("Reply to this ticket")).toHaveCount(0);
    await patientPage.close();

    // Reopening is an admin action only.
    await page.getByLabel("Change status").selectOption("in_progress");
    await page.getByRole("button", { name: "Update status" }).click();
    await expect(page.locator(".support-admin__summary")).toContainText("In progress");
    await assertNoSeriousViolations(page);
  });
  test("a patient reports a recent call on a ticket and an admin finds it by the call ID", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const projectUsers = syntheticUsers[testInfo.project.name];
    const psychiatristRow = await required(service.from("psychiatrists").select("id, display_name").eq("profile_id", psychiatristId).single(), "load the synthetic psychiatrist");
    // The first weekday at least nine days out, so the booking never depends on a weekend schedule.
    const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" });
    let manilaDay = dayFormat.format(new Date(Date.now() + 9 * 86400000));
    for (let offset = 10; [0, 6].includes(new Date(`${manilaDay}T12:00:00+08:00`).getUTCDay()) && offset < 13; offset += 1) {
      manilaDay = dayFormat.format(new Date(Date.now() + offset * 86400000));
    }
    const startsAt = new Date(`${manilaDay}T${testInfo.project.name === "chromium" ? "15:00:01" : "16:00:01"}+08:00`);
    let slotId;
    let appointmentId;
    try {
      const slot = await required(service.from("availability_slots").insert({
        psychiatrist_id: psychiatristRow.id, starts_at: startsAt.toISOString(),
        ends_at: new Date(startsAt.getTime() + 45 * 60000).toISOString(), status: "open",
      }).select("id").single(), "create a slot for the reported call");
      slotId = slot.id;
      const booked = await required(service.rpc("book_appointment_for_patient", {
        requested_slot_id: slotId, request_id: crypto.randomUUID(), actor_profile_id: patientId,
      }), "book the call");
      appointmentId = booked[0].appointment_id;
      const callStart = new Date(Date.now() - 2 * 86400000);
      await required(service.from("appointments").update({
        starts_at: callStart.toISOString(), ends_at: new Date(callStart.getTime() + 45 * 60000).toISOString(),
      }).eq("id", appointmentId), "move the call into the recent past");
      const reference = appointmentId.replaceAll("-", "").slice(0, 8).toUpperCase();

      await signIn(page, projectUsers.patient);
      await page.goto("/support");
      const picker = page.getByLabel("Is this about a recent call?");
      await expect(picker.locator("option", { hasText: `ID ${reference}` })).toHaveCount(1);
      await picker.selectOption({ value: appointmentId });
      const reportText = `Synthetic call report ${crypto.randomUUID()}`;
      await page.getByLabel("Tell us what happened").fill(reportText);
      await page.getByRole("button", { name: "Submit ticket" }).click();
      await expect(page.getByText("Your support ticket was submitted.")).toBeVisible();
      const created = await required(service.from("support_tickets").select("id").eq("requester_id", patientId).eq("related_appointment_id", appointmentId).single(), "load the ticket that references the call");
      ticketIds.push(created.id);
      await page.locator(".support-ticket-row").filter({ hasText: `Call ID ${reference}` }).first().click();
      await expect(page.getByTestId("related-call")).toContainText(`ID ${reference}`);
      await assertNoSeriousViolations(page);

      // The admin finds the ticket by the call ID and sees who was on the call.
      await signIn(page, { email: "admin@demo.orion.invalid", password: process.env.DEMO_SHARED_PASSWORD || process.env.DEMO_ADMIN_PASSWORD });
      await page.goto("/support");
      await page.getByLabel("Search by call ID").fill(reference.toLowerCase());
      const matches = page.locator(".support-ticket-row");
      await expect(matches).toHaveCount(1);
      await matches.first().click();
      await expect(page.getByText(reportText)).toBeVisible();
      await expect(page.getByTestId("related-call")).toContainText(`ID ${reference}`);
      await expect(page.getByTestId("related-call")).toContainText(psychiatristRow.display_name);
      await expect(page.getByTestId("related-call")).toContainText(appointmentId);
      await page.getByLabel("Search by call ID").fill("ZZZZZZZZ");
      await expect(page.getByText("No tickets match that call ID.")).toBeVisible();
      await assertNoSeriousViolations(page);
    } finally {
      if (appointmentId) {
        const referencing = await service.from("support_tickets").select("id").eq("related_appointment_id", appointmentId);
        for (const row of referencing.data ?? []) if (!ticketIds.includes(row.id)) ticketIds.push(row.id);
        await service.from("support_tickets").update({ related_appointment_id: null }).eq("related_appointment_id", appointmentId);
        await service.from("audit_events").delete().eq("target_id", appointmentId);
        await service.from("appointments").delete().eq("id", appointmentId);
      }
      if (slotId) await service.from("availability_slots").delete().eq("id", slotId);
    }
  });

  test("a patient who sends too many tickets is asked to wait", async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    // Earlier tests in this file already count toward the hourly limit, so seed only what is missing.
    const hourAgo = new Date(Date.now() - 3600000).toISOString();
    const existing = await required(service.from("support_tickets").select("id").eq("requester_id", patientId).gte("created_at", hourAgo), "count recent tickets");
    for (let count = existing.length; count < 5; count += 1) {
      const rows = await required(service.rpc("create_support_ticket", {
        actor_profile_id: patientId, request_id: crypto.randomUUID(), ticket_category_code: "other", message_body: `Synthetic limit seed ${crypto.randomUUID()}`,
      }), "seed a ticket toward the hourly limit");
      ticketIds.push(rows[0].ticket_id);
    }
    await signIn(page, syntheticUsers[testInfo.project.name].patient);
    await page.goto("/support");
    await page.getByLabel("Tell us what happened").fill("Synthetic ticket over the hourly limit");
    await page.getByRole("button", { name: "Submit ticket" }).click();
    await expect(page.getByText("You have sent a lot of support requests in the last hour.")).toBeVisible();
    const afterwards = await required(service.from("support_tickets").select("id").eq("requester_id", patientId).gte("created_at", hourAgo), "count tickets after the refused submission");
    expect(afterwards.length).toBe(5);
  });

  test("a signed-out visitor is sent to sign in and a patient cannot open admin pages", async ({ page }, testInfo) => {
    await page.goto("/support");
    await expect(page).toHaveURL(/\/login/);
    // After signing in, the app returns the visitor to the page they asked for.
    const patient = syntheticUsers[testInfo.project.name].patient;
    await page.getByLabel("Email address").fill(patient.email);
    await page.getByRole("textbox", { name: "Password" }).fill(patient.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/support$/);
    for (const route of ["/admin-appointments", "/admin-schedules"]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { name: "Access unavailable" })).toBeVisible();
      await expect(page.getByText("This area is not available for your account.")).toBeVisible();
    }
    await page.goto("/support");
    await expect(page.getByLabel("Search by call ID")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Update status" })).toHaveCount(0);
  });
});
