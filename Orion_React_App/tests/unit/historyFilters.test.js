import assert from "node:assert/strict";
import test from "node:test";
import { emptyFilters, filterHistory, groupByMonth, hasActiveFilters } from "../../src/features/appointments/historyFilters.js";

const make = (id, startsAt, status, name) => ({ id, starts_at: startsAt, status, counterpart_display_name: name });
const now = new Date("2026-10-17T04:00:00Z");
const rows = [
  make("a", "2026-10-16T01:00:00Z", "completed", "Ana Reyes"),
  make("b", "2026-09-02T02:00:00Z", "cancelled", "Ben Cruz"),
  make("c", "2026-10-10T02:00:00Z", "no_show", "ana lim"),
  make("d", "2026-07-01T02:00:00Z", "completed", "Carlo Diaz"),
];

test("history is sorted newest first", () => {
  assert.deepEqual(filterHistory(rows, emptyFilters(), now).map((row) => row.id), ["a", "c", "b", "d"]);
});

test("search matches the counterpart name case-insensitively", () => {
  assert.deepEqual(filterHistory(rows, { ...emptyFilters(), search: "ANA" }, now).map((row) => row.id), ["a", "c"]);
});

test("status and preset ranges narrow the list", () => {
  assert.deepEqual(filterHistory(rows, { ...emptyFilters(), status: "completed" }, now).map((row) => row.id), ["a", "d"]);
  assert.deepEqual(filterHistory(rows, { ...emptyFilters(), range: "30" }, now).map((row) => row.id), ["a", "c"]);
});

test("custom range uses Manila calendar days and includes both ends", () => {
  const filters = { ...emptyFilters(), range: "custom", from: "2026-09-02", to: "2026-10-10" };
  assert.deepEqual(filterHistory(rows, filters, now).map((row) => row.id), ["c", "b"]);
});

test("months are grouped in order and clear-filters state is detected", () => {
  const groups = groupByMonth(filterHistory(rows, emptyFilters(), now));
  assert.deepEqual(groups.map((group) => [group.key, group.items.length]), [["2026-10", 2], ["2026-09", 1], ["2026-07", 1]]);
  assert.equal(hasActiveFilters(emptyFilters()), false);
  assert.equal(hasActiveFilters({ ...emptyFilters(), status: "cancelled" }), true);
});
