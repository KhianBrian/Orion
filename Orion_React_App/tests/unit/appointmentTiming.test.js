import assert from "node:assert/strict";
import test from "node:test";
import {
  canPatientCancel,
  deriveAppointmentEnd,
  isInDemoMeetingWindow,
} from "../../src/lib/appointmentTiming.js";

test("derives an appointment end exactly 45 minutes after its start", () => {
  const start = new Date("2026-09-02T01:30:00.000Z");

  assert.equal(deriveAppointmentEnd(start).toISOString(), "2026-09-02T02:15:00.000Z");
});

test("allows patient cancellation only strictly more than 24 hours before start", () => {
  const now = new Date("2026-09-02T00:00:00.000Z");

  assert.equal(canPatientCancel("2026-09-03T00:00:00.001Z", now), true);
  assert.equal(canPatientCancel("2026-09-03T00:00:00.000Z", now), false);
  assert.equal(canPatientCancel("2026-09-02T23:59:59.999Z", now), false);
});

test("opens the demo meeting at the early-join boundary and closes it at session end", () => {
  const startsAt = "2026-09-02T10:00:00.000Z";
  const endsAt = "2026-09-02T10:45:00.000Z";

  assert.equal(isInDemoMeetingWindow(startsAt, endsAt, "2026-09-02T09:44:59.999Z"), false);
  assert.equal(isInDemoMeetingWindow(startsAt, endsAt, "2026-09-02T09:45:00.000Z"), true);
  assert.equal(isInDemoMeetingWindow(startsAt, endsAt, "2026-09-02T10:44:59.999Z"), true);
  assert.equal(isInDemoMeetingWindow(startsAt, endsAt, "2026-09-02T10:45:00.000Z"), false);
});
