#!/usr/bin/env node
// npm run release (alias: npm run bump)
//
// Prepares a release from the latest origin/develop:
//   1. reads the commits since the last tag (vX.Y.Z),
//   2. computes the next version from their Conventional Commits types,
//   3. writes package.json, package-lock.json and CHANGELOG.md on a new branch dev-release-vX.Y.Z,
//   4. commits "chore(release): vX.Y.Z", pushes and opens the PR to develop (gh CLI) or prints its link.
// The tag and the GitHub Release are created later by .github/workflows/release.yml, once main receives the version.
//
// Options:
//   --dry-run            show the version and the changelog, change nothing
//   --patch|--minor|--major or X.Y.Z   force the version
//   --base main          hotfix: start from main and open the PR to main
// See docs/release.md.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import {
  parseCommit,
  releaseLevel,
  nextVersion,
  compareVersions,
  renderSection,
  prependSection,
  repoUrlFromRemote,
} from './release-lib.mjs';

const FALLBACK_REPO = 'https://github.com/CodeShadowing95/koupi';
const SEP = '\u001f';
const END = '\u001e';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const baseIndex = args.indexOf('--base');
const base = baseIndex === -1 ? 'develop' : args[baseIndex + 1];
const forcedLevel = ['major', 'minor', 'patch'].find((l) => args.includes(`--${l}`));
const forcedVersion = args.find((a) => /^v?\d+\.\d+\.\d+$/.test(a))?.replace(/^v/, '');

function git(...gitArgs) {
  return execFileSync('git', gitArgs, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function hasGh() {
  try {
    execFileSync('gh', ['auth', 'status'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

if (!['develop', 'main'].includes(base)) fail(`--base doit valoir develop ou main (reçu : ${base}).`);

if (!dryRun && git('status', '--porcelain')) {
  fail('Des fichiers sont modifiés. Commite ou mets de côté (git stash) avant de lancer la release.');
}

console.log(`→ Récupération de origin/${base}, origin/main et des tags…`);
git('fetch', '--quiet', '--tags', 'origin', base, 'main');

const ref = `origin/${base}`;
const pkgOnBase = JSON.parse(git('show', `${ref}:package.json`));
const currentVersion = pkgOnBase.version;
const tags = git('tag', '--list', 'v*', '--sort=-v:refname').split('\n').filter(Boolean);
const lastTag = tags[0] ?? null;
const lastReleased = lastTag ? lastTag.slice(1) : null;

const mainVersion = JSON.parse(git('show', 'origin/main:package.json')).version;
const released = [mainVersion, lastReleased].filter(Boolean).sort(compareVersions).at(-1);

if (compareVersions(currentVersion, released) > 0) {
  fail(
    `${ref} est déjà en version ${currentVersion}, qui n'est pas encore en production (prod : ${released}).\n` +
      '  Merge d\'abord la PR de release vers main, ou corrige package.json.',
  );
}

const range = lastTag ? `${lastTag}..${ref}` : ref;
const raw = git('log', '--no-merges', `--format=%H${SEP}%s${SEP}%b${END}`, range);
const commits = raw
  .split(END)
  .map((entry) => entry.trim())
  .filter(Boolean)
  .map((entry) => {
    const [hash, subject, body] = entry.split(SEP);
    return parseCommit(subject, body, hash);
  })
  .filter(Boolean)
  .filter((c) => !(c.type === 'chore' && c.scope === 'release'));

if (!raw) fail(`Aucun nouveau commit sur ${ref} depuis ${lastTag}. Rien à publier.`);

let version;
if (forcedVersion) {
  version = forcedVersion;
} else {
  const level = forcedLevel ?? releaseLevel(commits, currentVersion);
  if (!level) {
    fail(
      'Les commits depuis la dernière version ne contiennent ni feat, ni fix, ni perf, ni changement cassant.\n' +
        '  Pour publier quand même : npm run release -- --patch',
    );
  }
  version = nextVersion(currentVersion, level);
}

if (compareVersions(version, currentVersion) <= 0) {
  fail(`La nouvelle version (${version}) doit être plus grande que la version actuelle (${currentVersion}).`);
}
if (tags.includes(`v${version}`)) fail(`Le tag v${version} existe déjà.`);

const repoUrl = repoUrlFromRemote(git('remote', 'get-url', 'origin'), FALLBACK_REPO);
const date = new Date().toISOString().slice(0, 10);
const section = renderSection({ version, previousVersion: lastReleased, date, commits, repoUrl });

console.log(`\nVersion : ${currentVersion} → ${version} (${commits.length} commits conventionnels depuis ${lastTag ?? 'le début'})\n`);
console.log(section);

if (dryRun) {
  console.log('(--dry-run : rien n\'a été modifié)');
  process.exit(0);
}

const branch = `dev-release-v${version}`;
const startBranch = git('rev-parse', '--abbrev-ref', 'HEAD');
git('switch', '--quiet', '-c', branch, ref);

const pkgText = readFileSync('package.json', 'utf8');
writeFileSync('package.json', pkgText.replace(/("version":\s*")[^"]+(")/, `$1${version}$2`));

if (existsSync('package-lock.json')) {
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
  lock.version = version;
  if (lock.packages?.['']) lock.packages[''].version = version;
  writeFileSync('package-lock.json', `${JSON.stringify(lock, null, 2)}\n`);
}

const changelog = existsSync('CHANGELOG.md') ? readFileSync('CHANGELOG.md', 'utf8') : '';
writeFileSync('CHANGELOG.md', prependSection(changelog, section));

const title = `chore(release): v${version}`;
git('add', 'package.json', 'package-lock.json', 'CHANGELOG.md');
git('commit', '--quiet', '-m', title);
console.log(`→ Commit « ${title} » sur ${branch}`);

git('push', '--quiet', '-u', 'origin', branch);
console.log(`→ Branche ${branch} poussée`);

const body = [
  `Prépare la version **${version}** (précédente : ${lastReleased ?? 'aucune'}).`,
  '',
  `Relis le changelog ci-dessous. Après le merge dans \`${base}\`, ${
    base === 'develop'
      ? 'la PR de release `develop` → `main` s\'ouvre automatiquement.'
      : 'le tag et la GitHub Release sont créés automatiquement. Pense ensuite à la PR `main` → `develop`.'
  }`,
  '',
  section.replace(/^## .*\n/, ''),
].join('\n');

if (hasGh()) {
  const url = execFileSync('gh', ['pr', 'create', '--base', base, '--head', branch, '--title', title, '--body', body], {
    encoding: 'utf8',
  }).trim();
  console.log(`\n✔ PR ouverte : ${url}`);
} else {
  // Long bodies do not fit in a URL: the changelog stays readable in the PR diff anyway.
  const shortBody = body.length > 4000 ? `${body.split('\n\n').slice(0, 2).join('\n\n')}\n\nVoir CHANGELOG.md dans le diff.` : body;
  const query = new URLSearchParams({ expand: '1', title, body: shortBody });
  console.log(`\n✔ Ouvre la PR ici (gh n'est pas installé ou pas connecté) :\n  ${repoUrl}/compare/${base}...${branch}?${query}`);
}

git('switch', '--quiet', startBranch);
console.log(`→ Retour sur ${startBranch}`);
