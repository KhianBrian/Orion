import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const enabled = process.env.RUN_DIRECT_WEBRTC_E2E === "1";
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.DEMO_SHARED_PASSWORD;

if (enabled && (!supabaseUrl || !serviceRoleKey || !password)) {
  throw new Error("RUN_DIRECT_WEBRTC_E2E=1 requires local Supabase and the ignored shared synthetic password");
}

const service = enabled
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

test.use({
  permissions: ["camera", "microphone"],
  launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] },
});

async function required(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function signIn(page, email) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app$/);
}

test.describe("Direct WebRTC synthetic boundary", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!enabled, "requires ignored synthetic demo credentials and local signaling/TURN configuration");

  let appointmentId;
  let slotId;
  let adminId;
  let patientEmail;
  let psychiatristEmail;

  test.beforeAll(async ({ browser }, workerInfo) => {
    void browser;
    const { data: users, error: usersError } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersError) throw usersError;
    const findUser = (email) => users.users.find((user) => user.email === email);
    patientEmail = workerInfo.project.name === "mobile-chrome" ? "patient.two@demo.orion.invalid" : "patient.one@demo.orion.invalid";
    psychiatristEmail = workerInfo.project.name === "mobile-chrome" ? "psychiatrist.two@demo.orion.invalid" : "psychiatrist.one@demo.orion.invalid";
    const patient = findUser(patientEmail);
    const psychiatristUser = findUser(psychiatristEmail);
    const admin = findUser("admin@demo.orion.invalid");
    if (!patient || !psychiatristUser || !admin) throw new Error("Direct WebRTC synthetic accounts are missing");
    adminId = admin.id;
    const psychiatrist = await required(service.from("psychiatrists").select("id").eq("profile_id", psychiatristUser.id).single(), "load psychiatrist");
    const startsAt = new Date(Date.now() + 5 * 60 * 1000);
    slotId = crypto.randomUUID();
    await required(service.from("availability_slots").insert({
      id: slotId,
      psychiatrist_id: psychiatrist.id,
      starts_at: startsAt.toISOString(),
      ends_at: new Date(startsAt.getTime() + 45 * 60 * 1000).toISOString(),
      status: "booked",
    }), "create slot");
    appointmentId = crypto.randomUUID();
    await required(service.from("appointments").insert({
      id: appointmentId,
      patient_id: patient.id,
      psychiatrist_id: psychiatrist.id,
      slot_id: slotId,
      starts_at: startsAt.toISOString(),
      ends_at: new Date(startsAt.getTime() + 45 * 60 * 1000).toISOString(),
      status: "booked",
      idempotency_key: crypto.randomUUID(),
    }), "create appointment");
    await required(service.rpc("set_direct_webrtc_enabled", { next_enabled: true, actor_profile_id: adminId, request_id: crypto.randomUUID() }), "enable Direct WebRTC");
  });

  test.afterAll(async () => {
    if (!service || !appointmentId) return;
    await service.rpc("set_direct_webrtc_enabled", { next_enabled: false, actor_profile_id: adminId, request_id: crypto.randomUUID() });
    await service.from("audit_events").delete().eq("target_id", appointmentId);
    await service.from("video_sessions").delete().eq("appointment_id", appointmentId);
    await service.from("appointments").delete().eq("id", appointmentId);
    await service.from("availability_slots").delete().eq("id", slotId);
  });

  test("patient and assigned psychiatrist establish a two-party call", async ({ browser }) => {
    const patientContext = await browser.newContext({ permissions: ["camera", "microphone"] });
    const psychiatristContext = await browser.newContext({ permissions: ["camera", "microphone"] });
    const patientPage = await patientContext.newPage();
    const psychiatristPage = await psychiatristContext.newPage();
    try {
      await Promise.all([
        signIn(patientPage, patientEmail),
        signIn(psychiatristPage, psychiatristEmail),
      ]);
      await Promise.all([
        patientPage.goto(`/appointments/${appointmentId}/direct-meeting`),
        psychiatristPage.goto(`/appointments/${appointmentId}/direct-meeting`),
      ]);
      await expect(patientPage.getByRole("heading", { name: "Ready to join" })).toBeVisible();
      await expect(psychiatristPage.getByRole("heading", { name: "Ready to join" })).toBeVisible();
      await patientPage.getByRole("button", { name: "Continue with camera and microphone" }).click();
      await psychiatristPage.getByRole("button", { name: "Continue with camera and microphone" }).click();
      await expect(patientPage.getByRole("status")).toHaveText("Connected directly or through the approved relay.", { timeout: 30_000 });
      await expect(psychiatristPage.getByRole("status")).toHaveText("Connected directly or through the approved relay.", { timeout: 30_000 });
    } finally {
      await patientContext.close();
      await psychiatristContext.close();
    }
  });
});
