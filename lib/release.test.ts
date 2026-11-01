import { describe, expect, it } from 'vitest';
import {
  compareVersions,
  extractSection,
  nextVersion,
  parseCommit,
  prependSection,
  releaseLevel,
  renderSection,
  repoUrlFromRemote,
  updateReadmeVersion,
  CHANGELOG_HEADER,
  type Commit,
} from '../scripts/release-lib.mjs';

const repoUrl = 'https://github.com/CodeShadowing95/koupi';
const c = (subject: string, body = '', hash = 'abcdef1234567890'): Commit => parseCommit(subject, body, hash)!;

describe('parseCommit', () => {
  it('reads type, scope and description', () => {
    expect(c('feat(hero): add a fourth coupon')).toMatchObject({
      type: 'feat',
      scope: 'hero',
      description: 'add a fourth coupon',
      breaking: false,
    });
  });

  it('accepts a commit without scope', () => {
    expect(c('fix: ignore .next')).toMatchObject({ type: 'fix', scope: null });
  });

  it('detects breaking changes from ! or the body', () => {
    expect(c('feat(api)!: drop v1').breaking).toBe(true);
    expect(c('feat(api): drop v1', 'BREAKING CHANGE: v1 is gone').breaking).toBe(true);
  });

  it('returns null for messages outside the format', () => {
    expect(parseCommit('Merge pull request #22 from x/dev-y')).toBeNull();
    expect(parseCommit('Initial commit')).toBeNull();
  });
});

describe('releaseLevel and nextVersion', () => {
  it('feat gives a minor, fix a patch', () => {
    expect(releaseLevel([c('fix(a): b'), c('feat(a): b')], '1.2.3')).toBe('minor');
    expect(releaseLevel([c('fix(a): b'), c('docs(a): b')], '1.2.3')).toBe('patch');
    expect(releaseLevel([c('perf(a): b')], '1.2.3')).toBe('patch');
  });

  it('a breaking change gives a major, but only a minor before 1.0.0', () => {
    expect(releaseLevel([c('feat(a)!: b')], '1.2.3')).toBe('major');
    expect(releaseLevel([c('feat(a)!: b')], '0.4.1')).toBe('minor');
  });

  it('returns null when nothing user-facing changed', () => {
    expect(releaseLevel([c('chore(deps): bump'), c('docs(readme): typo')], '0.1.0')).toBeNull();
    expect(releaseLevel([], '0.1.0')).toBeNull();
  });

  it('bumps the right part and resets the lower ones', () => {
    expect(nextVersion('0.1.0', 'minor')).toBe('0.2.0');
    expect(nextVersion('0.2.3', 'patch')).toBe('0.2.4');
    expect(nextVersion('1.2.3', 'major')).toBe('2.0.0');
    expect(nextVersion('1.2.3', 'minor')).toBe('1.3.0');
  });

  it('compares versions numerically', () => {
    expect(compareVersions('0.10.0', '0.9.9')).toBe(1);
    expect(compareVersions('v1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
  });
});

describe('changelog', () => {
  const commits = [
    c('feat(hero): add a fourth coupon', '', '1111111aaaa'),
    c('fix(search): keep suggestions visible', '', '2222222bbbb'),
    c('chore(deps): bump next', '', '3333333cccc'),
    c('feat(api)!: rename routes', '', '4444444dddd'),
  ];

  it('renders a section grouped by type with commit links', () => {
    const section = renderSection({ version: '0.2.0', previousVersion: '0.1.0', date: '2026-11-01', commits, repoUrl });
    expect(section).toContain(`## [0.2.0](${repoUrl}/compare/v0.1.0...v0.2.0) (2026-11-01)`);
    expect(section).toContain('### Changements cassants\n\n- **api:** rename routes');
    expect(section).toContain(`- **hero:** add a fourth coupon ([1111111](${repoUrl}/commit/1111111aaaa))`);
    expect(section).toContain('### Corrections\n\n- **search:** keep suggestions visible');
    expect(section).not.toContain('bump next');
  });

  it('renders a first release without compare link', () => {
    const section = renderSection({ version: '0.2.0', previousVersion: null, date: '2026-11-01', commits, repoUrl });
    expect(section.startsWith('## 0.2.0 (2026-11-01)')).toBe(true);
  });

  it('puts new sections on top and extracts them back', () => {
    const first = prependSection('', renderSection({ version: '0.2.0', previousVersion: null, date: '2026-11-01', commits, repoUrl }));
    expect(first.startsWith(CHANGELOG_HEADER)).toBe(true);
    const second = prependSection(
      first,
      renderSection({ version: '0.2.1', previousVersion: '0.2.0', date: '2026-11-02', commits: [c('fix(a): later')], repoUrl }),
    );
    expect(second.indexOf('[0.2.1]')).toBeLessThan(second.indexOf('## 0.2.0'));
    expect(extractSection(second, '0.2.1')).toContain('later');
    expect(extractSection(second, '0.2.1')).not.toContain('fourth coupon');
    expect(extractSection(second, '0.2.0')).toContain('fourth coupon');
    expect(extractSection(second, '9.9.9')).toBeNull();
  });
});

describe('repoUrlFromRemote', () => {
  it('normalises https and ssh remotes', () => {
    expect(repoUrlFromRemote('git@github.com:CodeShadowing95/koupi.git', 'x')).toBe(repoUrl);
    expect(repoUrlFromRemote('https://github.com/CodeShadowing95/koupi', 'x')).toBe(repoUrl);
    expect(repoUrlFromRemote('http://proxy/local/koupi', 'fallback')).toBe('fallback');
  });
});

describe('updateReadmeVersion', () => {
  it('updates the badge and the marked text, nothing else', () => {
    const readme = [
      '[![Version](https://img.shields.io/badge/version-0.1.0-2f3fe0)](CHANGELOG.md)',
      '**Version actuelle : <!-- koupi:version -->0.1.0<!-- /koupi:version -->**',
      'Node.js 22, Next.js 15.5, exemple 0.1.0',
    ].join('\n');
    const out = updateReadmeVersion(readme, '0.2.0');
    expect(out).toContain('badge/version-0.2.0-2f3fe0');
    expect(out).toContain('<!-- koupi:version -->0.2.0<!-- /koupi:version -->');
    expect(out).toContain('exemple 0.1.0');
  });
});
