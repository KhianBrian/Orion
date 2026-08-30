import { createClient } from "@supabase/supabase-js";

const required = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DEMO_ADMIN_PASSWORD",
  "DEMO_PATIENT_ONE_PASSWORD",
  "DEMO_PATIENT_TWO_PASSWORD",
  "DEMO_PSYCHIATRIST_ONE_PASSWORD",
  "DEMO_PSYCHIATRIST_TWO_PASSWORD",
];

const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const accounts = [
  {
    email: "admin@demo.orion.invalid",
    password: process.env.DEMO_ADMIN_PASSWORD,
    fullName: "Orion Demo Administrator",
    role: "admin",
  },
  {
    email: "patient.one@demo.orion.invalid",
    password: process.env.DEMO_PATIENT_ONE_PASSWORD,
    fullName: "Alex Reyes",
    role: "patient",
  },
  {
    email: "patient.two@demo.orion.invalid",
    password: process.env.DEMO_PATIENT_TWO_PASSWORD,
    fullName: "Sam Cruz",
    role: "patient",
  },
  {
    email: "psychiatrist.one@demo.orion.invalid",
    password: process.env.DEMO_PSYCHIATRIST_ONE_PASSWORD,
    fullName: "Dr. Maya Santos",
    role: "psychiatrist",
    displayName: "Dr. Maya Santos",
  },
  {
    email: "psychiatrist.two@demo.orion.invalid",
    password: process.env.DEMO_PSYCHIATRIST_TWO_PASSWORD,
    fullName: "Dr. Luis Navarro",
    role: "psychiatrist",
    displayName: "Dr. Luis Navarro",
  },
];

async function createOrGetUser(account) {
  const { data: existing, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) throw listError;

  const found = existing.users.find((user) => user.email === account.email);
  if (found) return found;

  const { data, error } = await supabase.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user;
}

async function provision() {
  const users = new Map();
  for (const account of accounts) {
    users.set(account.email, await createOrGetUser(account));
  }

  const adminId = users.get("admin@demo.orion.invalid").id;
  for (const account of accounts) {
    const user = users.get(account.email);
    const { error } = await supabase.rpc("provision_demo_profile", {
      target_profile_id: user.id,
      target_role: account.role,
      target_full_name: account.fullName,
      actor_profile_id: account.role === "admin" ? null : adminId,
    });
    if (error) throw error;
  }

  const psychiatrists = accounts.filter((account) => account.role === "psychiatrist");
  for (const account of psychiatrists) {
    const { data, error } = await supabase
      .from("psychiatrists")
      .upsert(
        {
          profile_id: users.get(account.email).id,
          display_name: account.displayName,
          bio: "Synthetic demo psychiatrist profile.",
          is_active: true,
        },
        { onConflict: "profile_id" },
      )
      .select("id")
      .single();
    if (error) throw error;

    const start = new Date();
    start.setUTCDate(start.getUTCDate() + 3);
    start.setUTCHours(account.email.includes("one") ? 1 : 3, 0, 0, 0);
    const end = new Date(start.getTime() + 45 * 60 * 1000);
    const { error: slotError } = await supabase
      .from("availability_slots")
      .upsert(
        {
          psychiatrist_id: data.id,
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
          status: "open",
        },
        { onConflict: "psychiatrist_id,starts_at" },
      );
    if (slotError) throw slotError;
  }
}

await provision();
console.log("Provisioned Orion's five synthetic demo accounts and open slots.");
