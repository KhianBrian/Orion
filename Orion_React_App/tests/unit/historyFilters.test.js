import assert from "node:assert/strict";
import test from "node:test";
import { emptyFilters, groupByMonth, hasActiveFilters, historyQueryArgs } from "../../src/features/appointments/historyFilters.js";

const now = new Date("2026-10-17T04:00:00Z");

test("no filters send empty arguments", () => {
  assert.deepEqual(historyQueryArgs(emptyFilters(), now), { searchText: "", fromDate: "", toDate: "", status: "" });
});

test("search text is trimmed and status all means no status filter", () => {
  const args = historyQueryArgs({ ...emptyFilters(), search: "  Ana  ", status: "completed" }, now);
  assert.equal(args.searchText, "Ana");
  assert.equal(args.status, "completed");
  assert.equal(historyQueryArgs({ ...emptyFilters(), status: "all" }, now).status, "");
});

test("preset ranges end today and start N Manila days back", () => {
  const args = historyQueryArgs({ ...emptyFilters(), range: "30" }, now);
  assert.equal(args.toDate, "2026-10-17");
  assert.equal(args.fromDate, "2026-09-17");
});

test("custom range passes the chosen dates through", () => {
  const args = historyQueryArgs({ ...emptyFilters(), range: "custom", from: "2026-09-02", to: "" }, now);
  assert.deepEqual([args.fromDate, args.toDate], ["2026-09-02", ""]);
});

test("months are grouped in order and active filters are detected", () => {
  const rows = [
    { id: "a", starts_at: "2026-10-16T01:00:00Z" }, { id: "c", starts_at: "2026-10-10T02:00:00Z" },
    { id: "b", starts_at: "2026-09-02T02:00:00Z" }, { id: "d", starts_at: "2026-07-01T02:00:00Z" },
  ];
  assert.deepEqual(groupByMonth(rows).map((group) => [group.key, group.items.length]), [["2026-10", 2], ["2026-09", 1], ["2026-07", 1]]);
  assert.equal(hasActiveFilters(emptyFilters()), false);
  assert.equal(hasActiveFilters({ ...emptyFilters(), status: "cancelled" }), true);
});
