import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  throw new Error("Human-check seeding requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the ignored .env");
}

const manifestPath = path.join("playwright", ".human-check-fixtures.json");
const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const manilaDateTime = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: "Asia/Manila",
});

async function required(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

function loadPreviousFixtures() {
  if (!fs.existsSync(manifestPath)) return [];
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (!Array.isArray(manifest?.slotIds) || !manifest.slotIds.every((id) => typeof id === "string")) {
    throw new Error("The local human-check fixture manifest is invalid; remove it manually after inspecting it.");
  }
  return manifest.slotIds;
}

async function removePreviousFixtures(slotIds) {
  if (!slotIds.length) return;
  const appointments = await required(
    supabase.from("appointments").select("id").in("slot_id", slotIds),
    "load previous human-check appointments",
  );
  if (appointments.length) {
    await required(
      supabase.from("audit_events").delete().in("target_id", appointments.map(({ id }) => id)),
      "remove previous human-check audit events",
    );
    await required(supabase.from("appointments").delete().in("slot_id", slotIds), "remove previous human-check appointments");
  }
  await required(supabase.from("availability_slots").delete().in("id", slotIds), "remove previous human-check slots");
}

async function activePsychiatrist(email) {
  const { data: users, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(`load synthetic users: ${error.message}`);
  const user = users.users.find((candidate) => candidate.email === email);
  if (!user) throw new Error(`Missing synthetic psychiatrist ${email}`);
  return required(
    supabase.from("psychiatrists").select("id, display_name").eq("profile_id", user.id).eq("is_active", true).single(),
    `load active psychiatrist ${email}`,
  );
}

async function createOpenSlot(psychiatrist, initialStart, label) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const startsAt = new Date(initialStart.getTime() + attempt * 2 * 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + 45 * 60 * 1000);
    const id = crypto.randomUUID();
    const { error } = await supabase.from("availability_slots").insert({
      id,
      psychiatrist_id: psychiatrist.id,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: "open",
    });
    if (!error) return { id, startsAt, endsAt };
    if (!/overlap|exclusion|duplicate/i.test(error.message)) throw new Error(`${label} slot: ${error.message}`);
  }
  throw new Error(`Could not create an isolated ${label} slot without overlapping existing availability.`);
}

const previousSlotIds = loadPreviousFixtures();
await removePreviousFixtures(previousSlotIds);

const now = new Date();
const normalStart = new Date(now.getTime() + 48 * 60 * 60 * 1000);
normalStart.setSeconds(0, 0);
const denialStart = new Date(now.getTime() + 12 * 60 * 60 * 1000);
denialStart.setSeconds(0, 0);

const [maya, luis] = await Promise.all([
  activePsychiatrist("psychiatrist.one@demo.orion.invalid"),
  activePsychiatrist("psychiatrist.two@demo.orion.invalid"),
]);
const normal = await createOpenSlot(maya, normalStart, "normal booking and cancellation");
const denial = await createOpenSlot(luis, denialStart, "cancellation denial");

fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
fs.writeFileSync(manifestPath, JSON.stringify({ slotIds: [normal.id, denial.id] }, null, 2));

console.log("Human-check fixtures are ready (synthetic only):");
console.log(`1. Alex Reyes books ${maya.display_name} at ${manilaDateTime.format(normal.startsAt)}; then cancel it successfully.`);
console.log(`2. Sam Cruz books ${luis.display_name} at ${manilaDateTime.format(denial.startsAt)}; then verify cancellation is denied.`);
console.log("Running this command again removes only the prior recorded human-check fixtures before creating fresh ones.");
