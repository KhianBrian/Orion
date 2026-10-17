// Pure helpers for the appointment history view; the database does the actual filtering. All dates are compared as Asia/Manila calendar days.
const manilaDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" });
const manilaMonthLabel = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", month: "long", year: "numeric" });

export const PAGE_SIZE = 25;
export const rangePresets = [
  { id: "all", label: "All time", days: null },
  { id: "7", label: "Last 7 days", days: 7 },
  { id: "30", label: "Last 30 days", days: 30 },
  { id: "90", label: "Last 90 days", days: 90 },
  { id: "custom", label: "Custom", days: null },
];

export function manilaDateKey(value) {
  return manilaDay.format(new Date(value));
}

export function presetStartKey(days, now = new Date()) {
  return manilaDateKey(new Date(new Date(now).getTime() - days * 86400000));
}

export function emptyFilters() {
  return { search: "", range: "all", from: "", to: "", status: "all" };
}

export function hasActiveFilters(filters) {
  return filters.search.trim() !== "" || filters.range !== "all" || filters.status !== "all";
}

export function resolveRange(filters, now = new Date()) {
  if (filters.range === "custom") return { from: filters.from || "", to: filters.to || "" };
  const preset = rangePresets.find((item) => item.id === filters.range);
  if (preset?.days) return { from: presetStartKey(preset.days, now), to: manilaDateKey(now) };
  return { from: "", to: "" };
}

// Arguments for get_my_appointment_history_page. Dates are Asia/Manila calendar days, inclusive.
export function historyQueryArgs(filters, now = new Date()) {
  const { from, to } = resolveRange(filters, now);
  return {
    searchText: filters.search.trim(),
    fromDate: from,
    toDate: to,
    status: filters.status === "all" ? "" : filters.status,
  };
}

// Groups a newest-first list into month sections, keeping order.
export function groupByMonth(appointments) {
  const groups = [];
  for (const appointment of appointments) {
    const key = manilaDateKey(appointment.starts_at).slice(0, 7);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(appointment);
    else groups.push({ key, label: manilaMonthLabel.format(new Date(appointment.starts_at)), items: [appointment] });
  }
  return groups;
}
