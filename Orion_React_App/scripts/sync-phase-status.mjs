#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const appRoot = path.resolve(import.meta.dirname, '..');
const repoRoot = path.resolve(appRoot, '..');
const registryPath = path.join(repoRoot, 'Knowledge-base/engineering/phase-status.json');
const fix = process.argv.includes('--fix') || !process.argv.includes('--check');

const targets = [
  {
    file: 'Knowledge-base/engineering/phases/README.md',
    kind: 'phase-readme',
  },
  {
    file: 'Knowledge-base/engineering/implementation-status.md',
    kind: 'implementation-status',
  },
  {
    file: 'Knowledge-base/engineering/phases/r1-launch-readiness-implementation-map.md',
    kind: 'readiness-map',
  },
  {
    file: 'OrionProgressReport|09-03|to|09-13|.md',
    kind: 'progress-report',
  },
];

const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const changed = [];
const problems = [];
const managedPhaseFloor = 15;
const phaseDirectory = path.join(repoRoot, 'Knowledge-base/engineering/phases');
const phaseFiles = fs.readdirSync(phaseDirectory)
  .map((name) => name.match(/^phase-(\d+(?:\.\d+)?)-.+\.md$/)?.[1])
  .filter(Boolean)
  .filter((phase) => Number(phase) >= managedPhaseFloor);

for (const phase of phaseFiles) {
  if (!registry[phase]) problems.push(`phase-${phase}: phase document has no phase-status.json entry`);
}
for (const phase of Object.keys(registry)) {
  if (!phaseFiles.includes(phase)) problems.push(`phase-${phase}: registry entry has no phase document`);
}

function phaseForLine(line, kind) {
  for (const [phase, value] of Object.entries(registry)) {
    const progressLabels = {
      '16': 'Minor eligibility and guardian consent',
      '17': 'PayMaya payment booking',
      '18': 'Google Meet and real timing',
      '18.5': 'Direct WebRTC + TURN synthetic implementation',
    };
    if (line.includes(`phase-${phase}-`) || (kind === 'progress-report' && progressLabels[phase] && line.includes(progressLabels[phase]))) {
      return { phase, value };
    }
  }
  return null;
}

function replacement(kind, phase, value, line) {
  const cells = line.split('|');
  if (cells.length < 3) return null;
  const last = cells.length - 2;
  if (kind === 'phase-readme') {
    cells[last] = ` ${value.status} — ${value.summary}`;
  } else if (kind === 'implementation-status') {
    cells[last] = ` ${value.summary}`;
    cells[last - 1] = ` ${value.status}`;
  } else if (kind === 'readiness-map') {
    cells[last] = ` ${value.status}; ${value.summary}`;
  } else if (kind === 'progress-report') {
    cells[last] = ` ${value.summary}`;
    cells[last - 1] = ` ${value.status}`;
  } else {
    return null;
  }
  return `|${cells.slice(1, -1).map((cell) => ` ${cell.trim()} `).join('|')}|`;
}

for (const target of targets) {
  const filePath = path.join(repoRoot, target.file);
  const original = fs.readFileSync(filePath, 'utf8');
  const lines = original.split('\n');
  const next = lines.map((line) => {
    const phase = phaseForLine(line, target.kind);
    if (!phase || !line.trim().startsWith('|')) return line;
    const updated = replacement(target.kind, phase.phase, phase.value, line);
    if (updated && updated !== line) changed.push(target.file);
    return updated ?? line;
  });
  const output = next.join('\n');
  if (fix && output !== original) fs.writeFileSync(filePath, output);
}

for (const target of targets) {
  const filePath = path.join(repoRoot, target.file);
  const content = fs.readFileSync(filePath, 'utf8');
  for (const [phase, value] of Object.entries(registry)) {
    const progressLabels = {
      '16': 'Minor eligibility and guardian consent',
      '17': 'PayMaya payment booking',
      '18': 'Google Meet and real timing',
    };
    if (target.kind === 'progress-report' && !progressLabels[phase]) continue;
    const marker = target.kind === 'progress-report' ? progressLabels[phase] : `phase-${phase}-`;
    const lines = content.split('\n').filter((line) => line.includes(marker));
    const statusLines = lines.filter((line) => line.trim().startsWith('|'));
    if (!statusLines.length) {
      problems.push(`${target.file}: no indexed row found for Phase ${phase}`);
      continue;
    }
    const expected = target.kind === 'implementation-status' || target.kind === 'progress-report'
      ? value.status
      : value.status;
    if (!statusLines.some((line) => line.includes(expected))) {
      problems.push(`${target.file}: Phase ${phase} does not contain status "${expected}"`);
    }
  }
}

if (problems.length) {
  console.error('Phase-status synchronization failed:');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exitCode = 1;
} else if (fix && changed.length) {
  console.log(`Synchronized phase status indexes: ${[...new Set(changed)].join(', ')}`);
} else {
  console.log('Phase status indexes are synchronized.');
}
