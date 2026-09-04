import assert from "node:assert/strict";
import test from "node:test";
import { createOrionQueryClient } from "../../src/lib/queryClient.js";

test("clearing the query client removes protected in-memory query data", () => {
  const client = createOrionQueryClient();
  const key = ["appointments", "synthetic-patient-id"];

  client.setQueryData(key, [{ id: "synthetic-appointment-id" }]);
  client.clear();

  assert.equal(client.getQueryData(key), undefined);
});
