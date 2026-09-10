import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const appRoot = process.cwd();
const repoRoot = path.resolve(appRoot, "..");
const exampleFiles = [
  path.join(repoRoot, ".env.example"),
  path.join(appRoot, ".env.example"),
  path.join(appRoot, ".env.test.example"),
];
const allowedNonSecretExampleValues = new Map([["RUN_SCHEDULING_E2E", "1"]]);

function parseExample(filePath) {
  assert.ok(fs.existsSync(filePath), `missing environment example: ${path.relative(repoRoot, filePath)}`);

  return fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=");
      assert.ok(separator > 0, `invalid environment example line in ${filePath}: ${line}`);
      const name = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim();
      assert.match(name, /^[A-Z][A-Z0-9_]*$/, `invalid environment variable name: ${name}`);
      const expectedValue = allowedNonSecretExampleValues.get(name) || "";
      assert.equal(value, expectedValue, `${path.relative(repoRoot, filePath)} must not contain a value for ${name}`);
      return name;
    });
}

for (const filePath of exampleFiles) parseExample(filePath);

const trackedFiles = execFileSync("git", ["ls-files", "--cached", "-z"], {
  cwd: repoRoot,
  encoding: "utf8",
});
const trackedEnvFiles = trackedFiles
  .split("\0")
  .filter((filePath) => /(^|\/)\.env(?:\..*)?$/.test(filePath))
  .filter((filePath) => !/\.example$/.test(filePath));
assert.equal(trackedEnvFiles.length, 0, `credential-bearing environment files are tracked:\n${trackedEnvFiles.join("\n")}`);

console.log(`Environment example checks passed for ${exampleFiles.length} files.`);
