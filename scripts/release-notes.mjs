#!/usr/bin/env node
// Prints the CHANGELOG.md section of one version (used by the release workflows).
// Usage: node scripts/release-notes.mjs 0.2.0

import { readFileSync, existsSync } from 'node:fs';
import { extractSection } from './release-lib.mjs';

const version = process.argv[2]?.replace(/^v/, '');
if (!version) {
  console.error('Usage: node scripts/release-notes.mjs <version>');
  process.exit(1);
}

const changelog = existsSync('CHANGELOG.md') ? readFileSync('CHANGELOG.md', 'utf8') : '';
console.log(extractSection(changelog, version) ?? `Version ${version}.`);
