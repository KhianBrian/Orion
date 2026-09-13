export function nextWeekdayStart({ daysAhead = 3, hour = 9, minute = 0, second = 1 } = {}) {
  const candidate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(candidate).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  const localDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  while ([0, 6].includes(localDate.getUTCDay())) localDate.setUTCDate(localDate.getUTCDate() + 1);
  return new Date(Date.UTC(localDate.getUTCFullYear(), localDate.getUTCMonth(), localDate.getUTCDate(), hour, minute, second) - 8 * 60 * 60 * 1000);
}
