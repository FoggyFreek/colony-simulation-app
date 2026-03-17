import { describe, it, expect } from 'vitest';
import {
  buildAgenda,
  formatAgendaAsText,
  mapSimHourToRealTime,
  isAwakeHour,
} from './agendaUtils';
import { simulate } from './engine';
import { SCENARIOS } from './strategies';
import { SEASON_HOURS, ENERGY_PER_HOUR, MAX_ENERGY } from './gameConstants';

// Friday March 20 2026, 16:00 local time
const SEASON_START = new Date(2026, 2, 20, 16, 0, 0);
const AWAKE_OFF = { enabled: false, awakeStart: 7, awakeEnd: 23 };
const AWAKE_ON = { enabled: true, awakeStart: 7, awakeEnd: 23 };

// ---------------------------------------------------------------------------
// Helper: build a synthetic actionLog with actions spread across the season
// ---------------------------------------------------------------------------
function makeActionLog(actions) {
  // actions: [{hour, action}]
  return actions.map(a => ({ hour: a.hour, action: a.action }));
}

// ===========================================================================
// 1. Actions as input — all actions appear in order in the agenda
// ===========================================================================
describe('buildAgenda preserves all actions in order', () => {
  const actionLog = makeActionLog([
    { hour: 0, action: 'Build metal L1' },
    { hour: 5, action: 'Upgrade metal[0] to L2' },
    { hour: 14, action: 'Trade + Upgrade metal[0] to L3' },
    { hour: 30, action: 'Build Stardust L1' },
    { hour: 60, action: 'Trade + Build metal L1' },
    { hour: 100, action: 'Trade + Upgrade Stardust to L2' },
    { hour: 150, action: 'Upgrade metal[1] to L4' },
  ]);

  it('every action from the log appears exactly once in the agenda entries', () => {
    const entries = buildAgenda(actionLog, [], SEASON_START, AWAKE_OFF);

    // Flatten all actions from all entries
    const allAgendaActions = entries.flatMap(e => e.actions);

    for (const logEntry of actionLog) {
      const found = allAgendaActions.filter(a => a === logEntry.action);
      expect(found.length, `action "${logEntry.action}" at H${logEntry.hour}`).toBe(1);
    }
  });

  it('actions appear in chronological order by simHour', () => {
    const entries = buildAgenda(actionLog, [], SEASON_START, AWAKE_OFF);

    // Filter to entries that contain at least one of our original actions
    const actionStrings = new Set(actionLog.map(a => a.action));
    const relevantEntries = entries.filter(e =>
      e.actions.some(a => actionStrings.has(a)),
    );

    for (let i = 1; i < relevantEntries.length; i++) {
      expect(relevantEntries[i].simHour).toBeGreaterThanOrEqual(
        relevantEntries[i - 1].simHour,
      );
    }
  });

  it('simHour in each entry matches the corresponding real time', () => {
    const entries = buildAgenda(actionLog, [], SEASON_START, AWAKE_OFF);

    for (const entry of entries) {
      const expectedRealTime = mapSimHourToRealTime(entry.simHour, SEASON_START);
      expect(entry.realTime.getTime()).toBe(expectedRealTime.getTime());
    }
  });

  it('multiple actions at the same hour appear in a single entry', () => {
    const sameHourLog = makeActionLog([
      { hour: 10, action: 'Build metal L1' },
      { hour: 10, action: 'Build Stardust L1' },
    ]);
    const entries = buildAgenda(sameHourLog, [], SEASON_START, AWAKE_OFF);

    const h10Entry = entries.find(e => e.simHour === 10);
    expect(h10Entry).toBeDefined();
    expect(h10Entry.actions).toContain('Build metal L1');
    expect(h10Entry.actions).toContain('Build Stardust L1');
  });

  it('formatAgendaAsText includes every action string', () => {
    const entries = buildAgenda(actionLog, [], SEASON_START, AWAKE_OFF);
    const text = formatAgendaAsText(entries, 'Test Scenario', SEASON_START, AWAKE_OFF);

    for (const logEntry of actionLog) {
      expect(text).toContain(logEntry.action);
    }
  });
});

// ===========================================================================
// 2. Restrict to wake hours
// ===========================================================================
describe('restrict to awake hours', () => {
  // Season starts Friday 16:00. Hour 7 = 23:00 (sleep start).
  // Sleep hours: 23:00-06:59. Wake at 07:00 = sim hour 15.
  const actionLog = makeActionLog([
    { hour: 0, action: 'Build metal L1' },          // Fri 16:00 — awake
    { hour: 5, action: 'Upgrade metal[0] to L2' },  // Fri 21:00 — awake
    { hour: 8, action: 'Trade + Build gas L1' },     // Sat 00:00 — SLEEP
    { hour: 10, action: 'Build Stardust L1' },       // Sat 02:00 — SLEEP
    { hour: 15, action: 'Upgrade metal[0] to L3' },  // Sat 07:00 — WAKE UP
    { hour: 20, action: 'Build crystal L1' },        // Sat 12:00 — awake
  ]);

  it('sleep-hour actions are shifted to wake-up entries', () => {
    const entries = buildAgenda(actionLog, [], SEASON_START, AWAKE_ON);

    // There should be no entries with simHour 8 or 10 directly
    const directSleepEntries = entries.filter(e => e.simHour === 8 || e.simHour === 10);
    expect(directSleepEntries.length).toBe(0);

    // The shifted actions should appear in a wake-up entry
    const wakeUpEntries = entries.filter(e => e.isWakeUp);
    expect(wakeUpEntries.length).toBeGreaterThan(0);

    const firstWake = wakeUpEntries[0];
    const wakeActions = firstWake.actions.join(' | ');
    expect(wakeActions).toContain('Trade + Build gas L1');
    expect(wakeActions).toContain('Build Stardust L1');
  });

  it('awake-hour actions remain at their original time', () => {
    const entries = buildAgenda(actionLog, [], SEASON_START, AWAKE_ON);

    const h5Entry = entries.find(e => e.simHour === 5);
    expect(h5Entry).toBeDefined();
    expect(h5Entry.actions).toContain('Upgrade metal[0] to L2');
    expect(h5Entry.isWakeUp).toBe(false);

    const h20Entry = entries.find(e => e.simHour === 20);
    expect(h20Entry).toBeDefined();
    expect(h20Entry.actions).toContain('Build crystal L1');
  });

  it('wake-up entries include accumulated mining energy', () => {
    const entries = buildAgenda(actionLog, [], SEASON_START, AWAKE_ON);
    const wakeUpEntries = entries.filter(e => e.isWakeUp);
    expect(wakeUpEntries.length).toBeGreaterThan(0);

    const firstWake = wakeUpEntries[0];
    const mineAction = firstWake.actions.find(a => a.includes('Mine'));
    expect(mineAction).toBeDefined();
    // Sleep from 23:00 to 07:00 = 8 hours. Energy ~8 * 3.571 = 28.57
    expect(mineAction).toMatch(/Mine \d+ times/);
  });

  it('shifted actions note their original hour', () => {
    const entries = buildAgenda(actionLog, [], SEASON_START, AWAKE_ON);
    const wakeUpEntries = entries.filter(e => e.isWakeUp);
    const firstWake = wakeUpEntries[0];

    // Shifted actions should mention original hour
    const shiftedGas = firstWake.actions.find(a => a.includes('Trade + Build gas L1'));
    expect(shiftedGas).toContain('H8');
    const shiftedStardust = firstWake.actions.find(a => a.includes('Build Stardust L1'));
    expect(shiftedStardust).toContain('H10');
  });

  it('shiftedFrom array contains original hours of shifted actions', () => {
    const entries = buildAgenda(actionLog, [], SEASON_START, AWAKE_ON);
    const wakeUpEntries = entries.filter(e => e.isWakeUp);
    const firstWake = wakeUpEntries[0];

    expect(firstWake.shiftedFrom).toContain(8);
    expect(firstWake.shiftedFrom).toContain(10);
  });

  it('no agenda entries fall in sleep hours when awake mode is on', () => {
    const entries = buildAgenda(actionLog, [], SEASON_START, AWAKE_ON);

    for (const entry of entries) {
      if (entry.simHour === 0) continue; // Season start is always included
      const awake = isAwakeHour(entry.realTime, 7, 23);
      expect(awake, `entry at simHour ${entry.simHour} (${entry.displayTime}) should be in awake hours`).toBe(true);
    }
  });

  it('all actions are preserved even when restrict to wake hours is on', () => {
    const entries = buildAgenda(actionLog, [], SEASON_START, AWAKE_ON);
    const allAgendaActions = entries.flatMap(e => e.actions).join(' | ');

    for (const logEntry of actionLog) {
      expect(allAgendaActions, `action "${logEntry.action}" should be present`).toContain(logEntry.action);
    }
  });

  it('handles wrapping awake config (e.g. awakeStart=22, awakeEnd=6)', () => {
    const wrappedAwake = { enabled: true, awakeStart: 22, awakeEnd: 6 };
    // Season starts Fri 16:00. Hour 0=16:00 (sleep for 22-6 config since 16 < 22)
    // awake: 22:00-05:59
    const log = makeActionLog([
      { hour: 0, action: 'Build metal L1' },   // 16:00 — sleep (16 < 22)
      { hour: 6, action: 'Upgrade metal[0] to L2' }, // 22:00 — awake
      { hour: 14, action: 'Build Stardust L1' }, // 06:00 — sleep (6 >= 6)
    ]);
    const entries = buildAgenda(log, [], SEASON_START, wrappedAwake);

    // Should not crash; actions should still be present somewhere
    const allActions = entries.flatMap(e => e.actions).join(' | ');
    expect(allActions).toContain('Build metal L1');
    expect(allActions).toContain('Upgrade metal[0] to L2');
    expect(allActions).toContain('Build Stardust L1');
  });
});

// ===========================================================================
// 3. Overall impact / feasibility — run real scenarios through agenda export
// ===========================================================================
describe('scenario feasibility through agenda export', () => {
  const SEED = 42;

  for (const scenario of SCENARIOS) {
    describe(`${scenario.name}`, () => {
      const result = simulate(scenario.strategy, SEED);
      const { actionLog, timeline, finalState } = result;

      it('simulation produces a non-empty action log', () => {
        expect(actionLog.length).toBeGreaterThan(0);
      });

      it('all action hours are within [0, 168]', () => {
        for (const entry of actionLog) {
          expect(entry.hour).toBeGreaterThanOrEqual(0);
          expect(entry.hour).toBeLessThanOrEqual(SEASON_HOURS);
        }
      });

      it('action log is in chronological order', () => {
        for (let i = 1; i < actionLog.length; i++) {
          expect(actionLog[i].hour).toBeGreaterThanOrEqual(actionLog[i - 1].hour);
        }
      });

      it('agenda (no awake restriction) includes every action from the log', () => {
        const entries = buildAgenda(actionLog, timeline, SEASON_START, AWAKE_OFF);
        const allAgendaActions = entries.flatMap(e => e.actions);

        for (const logEntry of actionLog) {
          const found = allAgendaActions.includes(logEntry.action);
          expect(found, `missing: "${logEntry.action}" at H${logEntry.hour}`).toBe(true);
        }
      });

      it('agenda (with awake restriction) still includes every action', () => {
        const entries = buildAgenda(actionLog, timeline, SEASON_START, AWAKE_ON);
        const allAgendaActions = entries.flatMap(e => e.actions).join('\n');

        for (const logEntry of actionLog) {
          expect(allAgendaActions, `missing: "${logEntry.action}" at H${logEntry.hour}`).toContain(logEntry.action);
        }
      });

      it('agenda entries with awake restriction never fall in sleep hours', () => {
        const entries = buildAgenda(actionLog, timeline, SEASON_START, AWAKE_ON);

        for (const entry of entries) {
          if (entry.simHour === 0) continue;
          expect(
            isAwakeHour(entry.realTime, 7, 23),
            `H${entry.simHour} at ${entry.displayTime} is during sleep`,
          ).toBe(true);
        }
      });

      it('scenario produces positive leaderboard points', () => {
        expect(finalState.leaderboardPoints).toBeGreaterThan(0);
      });

      it('final resources are non-negative (no overdraft)', () => {
        expect(finalState.resources.metals).toBeGreaterThanOrEqual(0);
        expect(finalState.resources.gas).toBeGreaterThanOrEqual(0);
        expect(finalState.resources.crystal).toBeGreaterThanOrEqual(0);
        expect(finalState.resources.stardust).toBeGreaterThanOrEqual(0);
      });

      it('formatted text output is well-formed', () => {
        const entries = buildAgenda(actionLog, timeline, SEASON_START, AWAKE_ON);
        const text = formatAgendaAsText(entries, scenario.name, SEASON_START, AWAKE_ON);

        expect(text).toContain(`Scenario: ${scenario.name}`);
        expect(text).toContain('Season Start');
        expect(text).toContain('Awake Hours');
        expect(text).toContain('Generated by Colony Simulator');
        // Should have day headers
        expect(text).toMatch(/--- [A-Z]+ [A-Za-z]+ \d+ ---/);
      });

      it('agenda covers multiple days of the 7-day season', () => {
        const entries = buildAgenda(actionLog, timeline, SEASON_START, AWAKE_OFF);
        const uniqueDays = new Set(entries.map(e => e.realTime.getDate()));
        // A 168-hour season should span at least 3 different calendar days
        expect(uniqueDays.size).toBeGreaterThanOrEqual(3);
      });
    });
  }
});
