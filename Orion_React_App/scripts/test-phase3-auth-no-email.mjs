import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceRoleKey) {
  throw new Error("Phase 3 no-email Auth tests require Supabase URL, publishable key, and service key in .env");
}

const service = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const redirectTo = "http://127.0.0.1:4173/auth/confirm";
const suffix = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
const signupEmail = `phase3-signup-${suffix}@example.invalid`;
const inviteEmail = `phase3-invite-${suffix}@example.invalid`;
const fixtureEmail = `phase3-fixture-${suffix}@example.invalid`;
const fixturePassword = "Phase3-test-password-123!";
const createdUserIds = [];
const createdPsychiatristIds = [];

async function required(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function removeFixtures() {
  if (createdPsychiatristIds.length) {
    await required(
      service.from("psychiatrists").delete().in("id", createdPsychiatristIds),
      "remove generated psychiatrist fixtures",
    );
  }
  for (const userId of createdUserIds) {
    await required(
      service.from("audit_events").delete().eq("target_id", userId),
      "remove generated audit fixtures",
    );
    const { error } = await service.auth.admin.deleteUser(userId);
    if (error) throw new Error(`remove generated Auth user: ${error.message}`);
  }
}

try {
  const signupLink = await required(
    service.auth.admin.generateLink({
      type: "signup",
      email: signupEmail,
      password: fixturePassword,
      options: { data: { full_name: "Phase 3 Signup Fixture" }, redirectTo },
    }),
    "generate signup link",
  );
  createdUserIds.push(signupLink.user.id);
  assert.equal(signupLink.properties.verification_type, "signup");
  assert.match(signupLink.properties.action_link, /^https:\/\//);

  const signupProfile = await required(
    service.from("profiles").select("role, full_name").eq("id", signupLink.user.id).single(),
    "load generated signup profile",
  );
  assert.equal(signupProfile.role, "patient");
  assert.equal(signupProfile.full_name, "Phase 3 Signup Fixture");

  const inviteLink = await required(
    service.auth.admin.generateLink({
      type: "invite",
      email: inviteEmail,
      options: { data: { full_name: "Phase 3 Invite Fixture" }, redirectTo: `${redirectTo}?mode=invite` },
    }),
    "generate invite link",
  );
  createdUserIds.push(inviteLink.user.id);
  assert.equal(inviteLink.properties.verification_type, "invite");
  assert.match(inviteLink.properties.action_link, /^https:\/\//);

  const recoveryLink = await required(
    service.auth.admin.generateLink({
      type: "recovery",
      email: "patient.one@demo.orion.invalid",
      options: { redirectTo: "http://127.0.0.1:4173/reset-password" },
    }),
    "generate recovery link",
  );
  assert.equal(recoveryLink.properties.verification_type, "recovery");
  assert.match(recoveryLink.properties.action_link, /^https:\/\//);

  const fixture = await required(
    service.auth.admin.createUser({
      email: fixtureEmail,
      password: fixturePassword,
      email_confirm: true,
      user_metadata: { full_name: "Phase 3 Confirmed Fixture", role: "admin" },
    }),
    "create confirmed fixture",
  );
  createdUserIds.push(fixture.user.id);
  const fixtureProfile = await required(
    service.from("profiles").select("role, full_name").eq("id", fixture.user.id).single(),
    "load confirmed fixture profile",
  );
  assert.equal(fixtureProfile.role, "patient");
  assert.equal(fixtureProfile.full_name, "Phase 3 Confirmed Fixture");

  const admin = await required(
    service.from("profiles").select("id").eq("role", "admin").limit(1).single(),
    "load admin actor",
  );
  const provisioned = await required(
    service.rpc("provision_psychiatrist", {
      target_user_id: inviteLink.user.id,
      target_full_name: "Phase 3 Invite Fixture",
      target_display_name: "Dr. Phase 3 Fixture",
      target_bio: "Synthetic test fixture.",
      actor_profile_id: admin.id,
    }),
    "provision generated invite fixture",
  );
  createdPsychiatristIds.push(provisioned[0].psychiatrist_id);
  const provisionedProfile = await required(
    service.from("profiles").select("role").eq("id", inviteLink.user.id).single(),
    "load provisioned profile",
  );
  const provisionedPsychiatrist = await required(
    service.from("psychiatrists").select("is_active").eq("id", provisioned[0].psychiatrist_id).single(),
    "load provisioned psychiatrist",
  );
  assert.equal(provisionedProfile.role, "psychiatrist");
  assert.equal(provisionedPsychiatrist.is_active, true);

  const anonClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const signedIn = await anonClient.auth.signInWithPassword({ email: fixtureEmail, password: fixturePassword });
  if (signedIn.error || !signedIn.data.user) throw new Error(`sign in confirmed fixture: ${signedIn.error?.message || "no user"}`);
  assert.equal(signedIn.data.user.email_confirmed_at !== null, true);
  const ownProfile = await required(
    anonClient.from("profiles").select("role").eq("id", fixture.user.id).single(),
    "read confirmed fixture profile through RLS",
  );
  assert.equal(ownProfile.role, "patient");
  await anonClient.auth.signOut();

  console.log("Phase 3 no-email Auth checks passed: generated signup/invite/recovery links, fixed patient role, confirmed fixture sign-in, and immediate admin psychiatrist provisioning.");
} finally {
  await removeFixtures();
}
