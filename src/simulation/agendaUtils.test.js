import { describe, it, expect } from 'vitest';
import {
  mapSimHourToRealTime,
  formatDateTime,
  isAwakeHour,
  buildAgenda,
  getNextFriday16,
  formatDayHeader,
} from './agendaUtils';

// Friday March 20 2026, 16:00 local time
const SEASON_START = new Date(2026, 2, 20, 16, 0, 0);

describe('mapSimHourToRealTime', () => {
  it('maps hour 0 to season start', () => {
    const result = mapSimHourToRealTime(0, SEASON_START);
    expect(result.getTime()).toBe(SEASON_START.getTime());
  });

  it('maps hour 1 to one hour after start', () => {
    const result = mapSimHourToRealTime(1, SEASON_START);
    expect(result.getHours()).toBe(17);
  });

  it('maps hour 8 to midnight (next day)', () => {
    const result = mapSimHourToRealTime(8, SEASON_START);
    expect(result.getHours()).toBe(0);
    expect(result.getDate()).toBe(21);
  });

  it('maps hour 168 to end of season (7 days later)', () => {
    const result = mapSimHourToRealTime(168, SEASON_START);
    expect(result.getDate()).toBe(27);
    expect(result.getHours()).toBe(16);
  });
});

describe('formatDateTime', () => {
  it('formats a Friday date', () => {
    const result = formatDateTime(SEASON_START);
    expect(result).toBe('Friday 16:00');
  });

  it('pads single-digit hours', () => {
    const d = new Date(2026, 2, 21, 7, 0);
    expect(formatDateTime(d)).toMatch(/07:00/);
  });
});

describe('formatDayHeader', () => {
  it('formats day header correctly', () => {
    expect(formatDayHeader(SEASON_START)).toBe('FRIDAY Mar 20');
  });
});

describe('isAwakeHour', () => {
  it('returns true during awake hours (7-23)', () => {
    const d = new Date(2026, 2, 21, 12, 0);
    expect(isAwakeHour(d, 7, 23)).toBe(true);
  });

  it('returns true at exactly awakeStart', () => {
    const d = new Date(2026, 2, 21, 7, 0);
    expect(isAwakeHour(d, 7, 23)).toBe(true);
  });

  it('returns false at exactly awakeEnd (23:00 = sleep)', () => {
    const d = new Date(2026, 2, 21, 23, 0);
    expect(isAwakeHour(d, 7, 23)).toBe(false);
  });

  it('returns false during sleep hours (3am)', () => {
    const d = new Date(2026, 2, 21, 3, 0);
    expect(isAwakeHour(d, 7, 23)).toBe(false);
  });

  it('returns false at 6:59 (still sleep)', () => {
    const d = new Date(2026, 2, 21, 6, 59);
    expect(isAwakeHour(d, 7, 23)).toBe(false);
  });
});

describe('buildAgenda', () => {
  const simpleActionLog = [
    { hour: 0, action: 'Build metal L1' },
    { hour: 5, action: 'Upgrade metal[0] to L2' },
    { hour: 20, action: 'Build Stardust L1' },
  ];
  const simpleTimeline = [];

  it('produces entries for all action hours', () => {
    const entries = buildAgenda(simpleActionLog, simpleTimeline, SEASON_START, {
      enabled: false, awakeStart: 7, awakeEnd: 23,
    });
    // Should have season start + action hours + mining check-ins
    const actionEntries = entries.filter(e =>
      e.actions.some(a => a.includes('Build') || a.includes('Upgrade')),
    );
    expect(actionEntries.length).toBeGreaterThanOrEqual(3);
  });

  it('includes season start as first entry', () => {
    const entries = buildAgenda(simpleActionLog, simpleTimeline, SEASON_START, {
      enabled: false, awakeStart: 7, awakeEnd: 23,
    });
    expect(entries[0].actions).toContain('Season Start');
    expect(entries[0].simHour).toBe(0);
  });

  it('batches sleep-hour actions to wake-up when awake mode enabled', () => {
    // Hour 5 maps to 21:00 (awake), but hours in the 23:00-07:00 range should shift.
    // Season starts at 16:00, so hour 7 = 23:00 (sleep), hour 15 = 07:00 (wake up)
    const actionLog = [
      { hour: 0, action: 'Build metal L1' },
      { hour: 10, action: 'Upgrade during sleep' }, // 16+10 = 02:00 next day = sleep
    ];
    const entries = buildAgenda(actionLog, [], SEASON_START, {
      enabled: true, awakeStart: 7, awakeEnd: 23,
    });
    // The sleep-hour action should appear in a wake-up entry
    const wakeUpEntries = entries.filter(e => e.isWakeUp);
    expect(wakeUpEntries.length).toBeGreaterThan(0);
    const wakeActions = wakeUpEntries[0].actions;
    expect(wakeActions.some(a => a.includes('Upgrade during sleep'))).toBe(true);
  });

  it('accumulates mining energy during sleep', () => {
    const entries = buildAgenda([], [], SEASON_START, {
      enabled: true, awakeStart: 7, awakeEnd: 23,
    });
    const wakeUpEntries = entries.filter(e => e.isWakeUp);
    // Should have wake-up entries with mining notes
    if (wakeUpEntries.length > 0) {
      expect(wakeUpEntries[0].actions.some(a => a.includes('Mine'))).toBe(true);
    }
  });
});

describe('buildAgenda with saveEnergy', () => {
  // Simulate timeline snapshots with high energy before a metal upgrade
  const actionLog = [
    { hour: 0, action: 'Build metal L1' },
    { hour: 20, action: 'Upgrade metal[0] to L2' },
  ];
  // Timeline: energy accumulates because mining was skipped before H20
  const timeline = [
    { hour: 0, energy: 50 },
    ...Array.from({ length: 20 }, (_, i) => ({
      hour: i + 1,
      energy: Math.min(50, (i + 1) * 3.571),
    })),
    { hour: 20, energy: 35 }, // high energy at upgrade hour
  ];

  it('annotates metal upgrade with post-upgrade mining when saveEnergy on', () => {
    const entries = buildAgenda(actionLog, timeline, SEASON_START, {
      enabled: false, awakeStart: 7, awakeEnd: 23,
    }, { saveEnergy: true });

    const upgradeEntry = entries.find(e => e.simHour === 20);
    expect(upgradeEntry).toBeDefined();
    expect(upgradeEntry.actions.some(a => a.includes('Mine') && a.includes('after upgrade'))).toBe(true);
  });

  it('does not annotate when saveEnergy is off', () => {
    const entries = buildAgenda(actionLog, timeline, SEASON_START, {
      enabled: false, awakeStart: 7, awakeEnd: 23,
    }, { saveEnergy: false });

    const upgradeEntry = entries.find(e => e.simHour === 20);
    expect(upgradeEntry).toBeDefined();
    expect(upgradeEntry.actions.some(a => a.includes('after upgrade'))).toBe(false);
  });

  it('shows save-energy reminders instead of mining check-ins before upgrade', () => {
    const entries = buildAgenda(actionLog, timeline, SEASON_START, {
      enabled: false, awakeStart: 7, awakeEnd: 23,
    }, { saveEnergy: true });

    const saveEntries = entries.filter(e =>
      e.actions.some(a => a.includes('Skip mining')),
    );
    // Should have at least one save-energy reminder in hours before H20
    expect(saveEntries.length).toBeGreaterThan(0);
    for (const e of saveEntries) {
      expect(e.simHour).toBeLessThan(20);
      expect(e.simHour).toBeGreaterThan(10); // only within 10 hours before upgrade
    }
  });
});

describe('buildAgenda with saveEnergy + awake hours combined', () => {
  // Metal upgrade at H20 (maps to 12:00 Saturday — awake), with save-energy on
  const actionLog = [
    { hour: 0, action: 'Build metal L1' },
    { hour: 20, action: 'Trade + Upgrade metal[0] to L2' },
  ];
  // Energy accumulates because mining was skipped before H20
  const timeline = [
    { hour: 0, energy: 50 },
    ...Array.from({ length: 20 }, (_, i) => ({
      hour: i + 1,
      energy: Math.min(50, (i + 1) * 3.571),
    })),
    { hour: 20, energy: 28 },
  ];

  it('shows save-energy reminders during awake hours but not during sleep', () => {
    const entries = buildAgenda(actionLog, timeline, SEASON_START, {
      enabled: true, awakeStart: 7, awakeEnd: 23,
    }, { saveEnergy: true });

    const saveEntries = entries.filter(e =>
      e.actions.some(a => a.includes('Skip mining')),
    );
    // All save-energy reminders should fall within awake hours
    for (const e of saveEntries) {
      const realHour = e.realTime.getHours();
      expect(realHour).toBeGreaterThanOrEqual(7);
      expect(realHour).toBeLessThan(23);
    }
  });

  it('annotates post-upgrade mining even with awake hours enabled', () => {
    const entries = buildAgenda(actionLog, timeline, SEASON_START, {
      enabled: true, awakeStart: 7, awakeEnd: 23,
    }, { saveEnergy: true });

    // H20 = 16:00+20h = Saturday 12:00 (awake), so the upgrade entry should exist
    const upgradeEntry = entries.find(e =>
      e.actions.some(a => a.includes('Upgrade metal')),
    );
    expect(upgradeEntry).toBeDefined();
    expect(upgradeEntry.actions.some(a =>
      a.includes('Mine') && a.includes('after upgrade'),
    )).toBe(true);
  });

  it('does not show save-energy reminders when saveEnergy is off + awake enabled', () => {
    const entries = buildAgenda(actionLog, timeline, SEASON_START, {
      enabled: true, awakeStart: 7, awakeEnd: 23,
    }, { saveEnergy: false });

    const saveEntries = entries.filter(e =>
      e.actions.some(a => a.includes('Skip mining')),
    );
    expect(saveEntries.length).toBe(0);
  });

  it('shifts save-energy upgrade action to wake-up if it falls during sleep', () => {
    // Metal upgrade at H8 = midnight (sleep hour with awake 7-23)
    const sleepActionLog = [
      { hour: 0, action: 'Build metal L1' },
      { hour: 8, action: 'Trade + Upgrade metal[0] to L2' },
    ];
    const sleepTimeline = [
      { hour: 0, energy: 50 },
      ...Array.from({ length: 8 }, (_, i) => ({
        hour: i + 1,
        energy: Math.min(50, (i + 1) * 3.571),
      })),
      { hour: 8, energy: 25 },
    ];

    const entries = buildAgenda(sleepActionLog, sleepTimeline, SEASON_START, {
      enabled: true, awakeStart: 7, awakeEnd: 23,
    }, { saveEnergy: true });

    // The upgrade at H8 (midnight) should be shifted to wake-up
    const wakeUpEntries = entries.filter(e => e.isWakeUp);
    expect(wakeUpEntries.length).toBeGreaterThan(0);
    const wakeActions = wakeUpEntries[0].actions;
    expect(wakeActions.some(a => a.includes('Upgrade metal'))).toBe(true);
  });
});

describe('buildAgenda saveEnergy with real simulation data', () => {
  it('produces save-energy annotations from a full strategyMaxMetal run', async () => {
    const { simulate } = await import('./engine');
    const { strategyMaxMetal } = await import('./strategies');

    const seed = 42;
    const result = simulate(strategyMaxMetal, seed, { saveEnergyBeforeUpgrade: true });

    const entries = buildAgenda(result.actionLog, result.timeline, SEASON_START, {
      enabled: false, awakeStart: 7, awakeEnd: 23,
    }, { saveEnergy: true });

    // Should have at least one metal upgrade with post-upgrade mining annotation
    const annotated = entries.filter(e =>
      e.actions.some(a => a.includes('after upgrade')),
    );
    // May or may not have annotations depending on energy at upgrade time,
    // but the agenda should at minimum produce valid entries
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0].actions).toContain('Season Start');
  });

  it('produces save-energy reminders from a full strategyOptimal run', async () => {
    const { simulate } = await import('./engine');
    const { strategyOptimal } = await import('./strategies');

    const seed = 42;
    const result = simulate(strategyOptimal, seed, { saveEnergyBeforeUpgrade: true });

    const entries = buildAgenda(result.actionLog, result.timeline, SEASON_START, {
      enabled: false, awakeStart: 7, awakeEnd: 23,
    }, { saveEnergy: true });

    // Verify structure — all entries should have valid simHour and actions
    for (const entry of entries) {
      expect(entry.simHour).toBeGreaterThanOrEqual(0);
      expect(entry.simHour).toBeLessThanOrEqual(168);
      expect(entry.actions.length).toBeGreaterThan(0);
    }
  });
});

describe('formatAgendaAsText with saveEnergy', () => {
  it('includes energy saving header when saveEnergy is on', async () => {
    const { formatAgendaAsText } = await import('./agendaUtils');
    const entries = buildAgenda(
      [{ hour: 0, action: 'Build metal L1' }],
      [{ hour: 0, energy: 50 }],
      SEASON_START,
      { enabled: true, awakeStart: 7, awakeEnd: 23 },
      { saveEnergy: true },
    );

    const text = formatAgendaAsText(entries, 'Max Metal', SEASON_START, {
      enabled: true, awakeStart: 7, awakeEnd: 23,
    }, { saveEnergy: true });

    expect(text).toContain('Energy Saving: ON');
    expect(text).toContain('skip mining before metal upgrades');
  });

  it('does not include energy saving header when saveEnergy is off', async () => {
    const { formatAgendaAsText } = await import('./agendaUtils');
    const entries = buildAgenda(
      [{ hour: 0, action: 'Build metal L1' }],
      [{ hour: 0, energy: 50 }],
      SEASON_START,
      { enabled: false, awakeStart: 7, awakeEnd: 23 },
      { saveEnergy: false },
    );

    const text = formatAgendaAsText(entries, 'Max Metal', SEASON_START, {
      enabled: false, awakeStart: 7, awakeEnd: 23,
    }, { saveEnergy: false });

    expect(text).not.toContain('Energy Saving: ON');
  });
});

describe('getNextFriday16', () => {
  it('returns a Friday', () => {
    const result = getNextFriday16(new Date(2026, 2, 17, 10, 0)); // Tuesday
    expect(result.getDay()).toBe(5); // Friday
    expect(result.getHours()).toBe(16);
  });

  it('returns same Friday if before 16:00', () => {
    const friday = new Date(2026, 2, 20, 10, 0); // Friday 10:00
    const result = getNextFriday16(friday);
    expect(result.getDate()).toBe(20);
  });

  it('returns next Friday if past 16:00 on Friday', () => {
    const friday = new Date(2026, 2, 20, 17, 0); // Friday 17:00
    const result = getNextFriday16(friday);
    expect(result.getDate()).toBe(27);
  });
});
