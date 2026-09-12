import { expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

export async function assertNoSeriousViolations(page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const serious = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact));
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
}
