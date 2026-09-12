import fs from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

const assetsDir = path.resolve("dist/assets");
const initialScripts = fs.existsSync(assetsDir)
  ? fs.readdirSync(assetsDir).filter((file) => /^index-[^/]+\.js$/.test(file))
  : [];

if (initialScripts.length !== 1) {
  throw new Error(`Expected exactly one initial JavaScript bundle in ${assetsDir}; found ${initialScripts.length}`);
}

const filePath = path.join(assetsDir, initialScripts[0]);
const source = fs.readFileSync(filePath);
const gzipKilobytes = gzipSync(source).byteLength / 1024;
const budgetKilobytes = 180;

if (gzipKilobytes > budgetKilobytes) {
  throw new Error(`Initial JavaScript bundle is ${gzipKilobytes.toFixed(2)} kB gzipped; budget is ${budgetKilobytes} kB`);
}

console.log(`Initial JavaScript bundle: ${gzipKilobytes.toFixed(2)} kB gzipped (budget: ${budgetKilobytes} kB)`);
