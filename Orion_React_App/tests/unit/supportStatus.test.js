import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  isSensitiveTopic,
  isTicketClosed,
  nextSupportStatuses,
  supportLifecycleErrorMessage,
  supportStatusLabel,
  supportStatusOptionLabel,
} from "../../src/features/support/status.js";

test("every lifecycle status has a readable label", () => {
  for (const code of ["submitted", "in_progress", "awaiting_requester", "resolved", "closed"]) {
    assert.ok(supportStatusLabel(code).length > 0);
    assert.notEqual(supportStatusLabel(code), code);
  }
  assert.equal(supportStatusLabel("unknown"), "Submitted");
});

test("allowed moves match the approved lifecycle", () => {
  assert.deepEqual(nextSupportStatuses("submitted"), ["in_progress", "closed"]);
  assert.deepEqual(nextSupportStatuses("in_progress"), ["awaiting_requester", "resolved", "closed"]);
  assert.deepEqual(nextSupportStatuses("awaiting_requester"), ["in_progress", "resolved", "closed"]);
  assert.deepEqual(nextSupportStatuses("resolved"), ["in_progress", "closed"]);
  assert.deepEqual(nextSupportStatuses("closed"), ["in_progress"]);
  assert.deepEqual(nextSupportStatuses("nonsense"), []);
});

test("a ticket never moves back to submitted through the status control", () => {
  for (const code of ["submitted", "in_progress", "awaiting_requester", "resolved", "closed"]) {
    assert.ok(!nextSupportStatuses(code).includes("submitted"));
  }
});

test("moving a finished ticket back to in progress is labelled as a reopen", () => {
  assert.equal(supportStatusOptionLabel("resolved", "in_progress"), "Reopen (in progress)");
  assert.equal(supportStatusOptionLabel("closed", "in_progress"), "Reopen (in progress)");
  assert.equal(supportStatusOptionLabel("awaiting_requester", "in_progress"), "In progress");
});

test("only closed tickets are treated as closed", () => {
  assert.equal(isTicketClosed("closed"), true);
  assert.equal(isTicketClosed("resolved"), false);
});

test("sensitive topics are flagged for care", () => {
  assert.equal(isSensitiveTopic("clinician_or_user_concern"), true);
  assert.equal(isSensitiveTopic("privacy_or_data"), true);
  assert.equal(isSensitiveTopic("technical_issue"), false);
});

test("lifecycle errors map to generic, content-free messages", () => {
  assert.match(supportLifecycleErrorMessage({ code: "support_ticket_closed" }), /closed/);
  assert.match(supportLifecycleErrorMessage({ code: "support_ticket_transition_not_allowed" }), /not allowed/);
  assert.match(supportLifecycleErrorMessage({ code: "anything_else" }), /could not be updated/);
  assert.match(supportLifecycleErrorMessage(undefined), /could not be updated/);
});

test("the error code can come from the function response body", () => {
  assert.match(supportLifecycleErrorMessage({ context: { error: "support_ticket_closed" } }), /closed/);
});

test("the browser status list matches the database transition rules", () => {
  const sql = readFileSync(new URL("../../../supabase/migrations/20261016090100_phase19_support_ticket_lifecycle.sql", import.meta.url), "utf8");
  const body = sql.slice(sql.indexOf("create function private.support_ticket_transition_allowed"));
  const fromDatabase = {};
  for (const [, from, targets] of body.matchAll(/when '(\w+)' then next_status::text in \(([^)]*)\)/g)) {
    fromDatabase[from] = [...targets.matchAll(/'(\w+)'/g)].map((match) => match[1]);
  }
  assert.deepEqual(Object.keys(fromDatabase).sort(), ["awaiting_requester", "closed", "in_progress", "resolved", "submitted"]);
  for (const [from, targets] of Object.entries(fromDatabase)) {
    assert.deepEqual(nextSupportStatuses(from), targets, `status list drifted for ${from}`);
  }
});
