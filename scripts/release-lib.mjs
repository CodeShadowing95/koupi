// Pure helpers for the release flow (no git, no file system).
// Used by scripts/release.mjs, scripts/release-notes.mjs and the release workflows.

const HEADER = /^(\w+)(?:\(([^)]+)\))?(!)?: (.+)$/;

/** Parses a Conventional Commits message. Returns null when the subject does not follow the format. */
export function parseCommit(subject, body = '', hash = '') {
  const match = HEADER.exec(subject.trim());
  if (!match) return null;
  const [, type, scope, bang, description] = match;
  const breaking = Boolean(bang) || /^BREAKING[ -]CHANGE:/m.test(body);
  return { type: type.toLowerCase(), scope: scope ?? null, description: description.trim(), breaking, hash };
}

/** Which part of the version the commits call for: 'major', 'minor', 'patch' or null (nothing to release). */
export function releaseLevel(commits, currentVersion) {
  const [major] = parseVersion(currentVersion);
  if (commits.some((c) => c.breaking)) return major === 0 ? 'minor' : 'major';
  if (commits.some((c) => c.type === 'feat')) return 'minor';
  if (commits.some((c) => ['fix', 'perf', 'revert'].includes(c.type))) return 'patch';
  return null;
}

export function parseVersion(version) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  if (!match) throw new Error(`Version invalide : ${version}`);
  return match.slice(1).map(Number);
}

export function nextVersion(current, level) {
  const [major, minor, patch] = parseVersion(current);
  if (level === 'major') return `${major + 1}.0.0`;
  if (level === 'minor') return `${major}.${minor + 1}.0`;
  if (level === 'patch') return `${major}.${minor}.${patch + 1}`;
  throw new Error(`Niveau de version inconnu : ${level}`);
}

/** -1, 0 or 1, like a sort comparator. */
export function compareVersions(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
  }
  return 0;
}

const SECTIONS = [
  { title: 'Nouveautés', match: (c) => c.type === 'feat' },
  { title: 'Corrections', match: (c) => c.type === 'fix' },
  { title: 'Performances', match: (c) => c.type === 'perf' },
  { title: 'Annulations', match: (c) => c.type === 'revert' },
];

function line(commit, repoUrl) {
  const scope = commit.scope ? `**${commit.scope}:** ` : '';
  const short = commit.hash.slice(0, 7);
  const link = short ? ` ([${short}](${repoUrl}/commit/${commit.hash}))` : '';
  return `- ${scope}${commit.description}${link}`;
}

/** The CHANGELOG.md section for one version, newest commits first as given. */
export function renderSection({ version, previousVersion, date, commits, repoUrl }) {
  const title = previousVersion
    ? `## [${version}](${repoUrl}/compare/v${previousVersion}...v${version}) (${date})`
    : `## ${version} (${date})`;
  const parts = [title];
  const breaking = commits.filter((c) => c.breaking);
  if (breaking.length) parts.push(`### Changements cassants\n\n${breaking.map((c) => line(c, repoUrl)).join('\n')}`);
  for (const section of SECTIONS) {
    const items = commits.filter(section.match);
    if (items.length) parts.push(`### ${section.title}\n\n${items.map((c) => line(c, repoUrl)).join('\n')}`);
  }
  if (parts.length === 1) parts.push('Maintenance uniquement, aucun changement visible.');
  return `${parts.join('\n\n')}\n`;
}

export const CHANGELOG_HEADER =
  '# Changelog\n\nToutes les versions de Koupi. Ce fichier est mis à jour par `npm run release` à partir des commits (voir `docs/release.md`).\n';

/** Adds a section at the top of the changelog, under its header. */
export function prependSection(changelog, section) {
  const existing = changelog?.trim() ? changelog : CHANGELOG_HEADER;
  const firstVersion = existing.search(/^## /m);
  if (firstVersion === -1) return `${existing.trimEnd()}\n\n${section}`;
  return `${existing.slice(0, firstVersion)}${section}\n${existing.slice(firstVersion)}`;
}

/** The body of one version's section (without its "## " title), or null if absent. */
export function extractSection(changelog, version) {
  const lines = changelog.split('\n');
  const start = lines.findIndex((l) => /^## /.test(l) && (l.includes(`[${version}]`) || l.startsWith(`## ${version} `)));
  if (start === -1) return null;
  let end = lines.findIndex((l, i) => i > start && /^## /.test(l));
  if (end === -1) end = lines.length;
  return lines.slice(start + 1, end).join('\n').trim();
}

/** Turns any GitHub remote URL into https://github.com/owner/repo, or returns the fallback. */
export function repoUrlFromRemote(remote, fallback) {
  const match = /github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?\/?$/.exec(remote.trim());
  return match ? `https://github.com/${match[1]}/${match[2]}` : fallback;
}

/** Writes the version into the README: the version badge and the text between the koupi:version markers. */
export function updateReadmeVersion(readme, version) {
  return readme
    .replace(/(img\.shields\.io\/badge\/version-)\d+\.\d+\.\d+(-)/g, `$1${version}$2`)
    .replace(/(<!-- koupi:version -->)[^<]*(<!-- \/koupi:version -->)/g, `$1${version}$2`);
}
