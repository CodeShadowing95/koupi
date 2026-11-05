import { describe, expect, it } from 'vitest';
import { urgentAlerts } from './admin-urgent';

const now = new Date('2026-11-05T12:00:00Z');
const code = (value: string, expiresOn: string | null, status: 'verified' | 'to_test' | 'pending' = 'verified') => ({ code: value, tool: 'NordVPN', status, expiresOn });
const none = { codes: [], failedSources: [], gauges: [], now };

describe('urgentAlerts', () => {
  it('rien d’urgent', () => {
    expect(urgentAlerts(none)).toEqual([]);
  });

  it('compte les codes publics qui expirent dans la semaine, le plus proche d’abord', () => {
    const [alert] = urgentAlerts({ ...none, codes: [code('LOIN', '2026-12-30'), code('B', '2026-11-09'), code('A', '2026-11-07'), code('CACHE', '2026-11-06', 'pending'), code('PASSE', '2026-11-01')] });
    expect(alert).toMatchObject({ id: 'expiring', tone: 'warn', title: '2 codes expirent d’ici 7 jours', href: '/admin/codes?status=expiring' });
    expect(alert.detail).toContain('A (NordVPN) expire dans 2 jours');
  });

  it('un code qui expire aujourd’hui est rouge', () => {
    expect(urgentAlerts({ ...none, codes: [code('X', '2026-11-05')] })[0]).toMatchObject({ tone: 'bad', title: '1 code expire d’ici 7 jours' });
  });

  it('signale une source en échec et les jauges presque pleines, les rouges d’abord', () => {
    const alerts = urgentAlerts({
      ...none,
      codes: [code('A', '2026-11-08')],
      failedSources: [{ label: 'Podcasts suivis', error: 'flux cassé' }],
      gauges: [
        { key: 'youtube', label: 'YouTube', ratio: 0.85, detail: '8 500 / 10 000 unités aujourd’hui (85 %)' },
        { key: 'ai', label: 'IA', ratio: 0.5, detail: '50 % du plafond du mois' },
      ],
    });
    expect(alerts.map(alert => alert.id)).toEqual(['source-Podcasts suivis', 'expiring', 'gauge-youtube']);
    expect(alerts[0].detail).toBe('Erreur : flux cassé');
    expect(alerts[2].title).toBe('Quota YouTube presque atteint : 85 %');
  });
});
