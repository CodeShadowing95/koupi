export type Commit = { type: string; scope: string | null; description: string; breaking: boolean; hash: string };
export type Level = 'major' | 'minor' | 'patch';

export function parseCommit(subject: string, body?: string, hash?: string): Commit | null;
export function releaseLevel(commits: Commit[], currentVersion: string): Level | null;
export function parseVersion(version: string): [number, number, number];
export function nextVersion(current: string, level: Level): string;
export function compareVersions(a: string, b: string): -1 | 0 | 1;
export function renderSection(input: {
  version: string;
  previousVersion: string | null;
  date: string;
  commits: Commit[];
  repoUrl: string;
}): string;
export const CHANGELOG_HEADER: string;
export function prependSection(changelog: string | null | undefined, section: string): string;
export function extractSection(changelog: string, version: string): string | null;
export function repoUrlFromRemote(remote: string, fallback: string): string;
export function updateReadmeVersion(readme: string, version: string): string;
