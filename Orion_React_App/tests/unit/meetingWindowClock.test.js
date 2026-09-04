import assert from "node:assert/strict";
import test from "node:test";
import { nextMeetingWindowBoundary } from "../../src/lib/meetingWindowClock.js";

const appointment = {
  status: "booked",
  starts_at: "2026-09-02T10:00:00.000Z",
  ends_at: "2026-09-02T10:45:00.000Z",
};

test("schedules the earliest upcoming join or session-end boundary", () => {
  assert.equal(
    nextMeetingWindowBoundary([appointment], new Date("2026-09-02T09:30:00.000Z").getTime()),
    new Date("2026-09-02T09:45:00.000Z").getTime(),
  );
  assert.equal(
    nextMeetingWindowBoundary([appointment], new Date("2026-09-02T09:45:00.000Z").getTime()),
    new Date("2026-09-02T10:45:00.000Z").getTime(),
  );
});

test("does not schedule boundaries for non-booked or completed appointments", () => {
  assert.equal(nextMeetingWindowBoundary([{ ...appointment, status: "cancelled" }]), null);
  assert.equal(nextMeetingWindowBoundary([appointment], new Date("2026-09-02T10:45:00.000Z").getTime()), null);
});
