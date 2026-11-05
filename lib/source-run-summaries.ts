// Résumé de chaque compte rendu de lecture pour le journal des passages (lib/source-runs.ts).
import type { CategorySearchReport } from './category-code-search';
import type { PodcastReadReport } from './podcast-read';
import type { RunSummary } from './source-runs';
import type { ChannelReadReport } from './youtube-channel-read';

export const searchSummary = (report: CategorySearchReport): RunSummary | null => report.tools === 0 && report.searches === 0 && report.failed.length === 0 ? null : ({
  scope: report.scope, items: report.videos, codes: report.found.length, suggested: report.suggested.length, units: report.units, failed: report.failed, attempted: report.searches + report.failed.length,
});

export const channelSummary = (report: ChannelReadReport): RunSummary | null => report.channels === 0 ? null : ({
  items: report.videos, codes: report.found.length, suggested: report.suggested.length, units: report.units, failed: report.failed, attempted: report.channels,
});

export const podcastSummary = (report: PodcastReadReport): RunSummary | null => report.podcasts === 0 ? null : ({
  items: report.episodes, codes: report.found.length, suggested: report.suggested.length, units: 0, failed: report.failed, attempted: report.podcasts,
});
