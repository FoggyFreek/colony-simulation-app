import { describe, it, expect } from 'vitest';
import {
  buildAgenda,
  formatAgendaAsText,
  formatAgendaAsICS,
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

// ===========================================================================
// 4. formatAgendaAsICS — validated against corrected reference output:
//
//   BEGIN:VEVENT
//   DTSTART;TZID=Europe/Amsterdam:20260320T160000
//   DTEND;TZID=Europe/Amsterdam:20260320T160500
//   DTSTAMP:20260317T120000Z
//   SUMMARY:Trade + Build metal L1
//   DESCRIPTION:H0 — Trade + Build metal L1
//   UID:colony-sim-custom-strategy-h0@colony-simulator
//   END:VEVENT
// ===========================================================================
describe('formatAgendaAsICS', () => {
  // A single entry matching the reference output scenario:
  // Season start = Friday 2026-03-20 16:00, sim hour 0, action = "Trade + Build metal L1"
  const refEntry = {
    realTime: SEASON_START,
    displayTime: '16:00',
    simHour: 0,
    actions: ['Trade + Build metal L1'],
    isWakeUp: false,
  };

  it('wraps output in VCALENDAR begin/end', () => {
    const ics = formatAgendaAsICS([refEntry], 'Custom Strategy');
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics.trimStart().startsWith('BEGIN:VCALENDAR')).toBe(true);
  });

  it('contains VERSION and PRODID headers', () => {
    const ics = formatAgendaAsICS([refEntry], 'Custom Strategy');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('PRODID:');
  });

  it('includes a VEVENT for the Trade + Build action', () => {
    const ics = formatAgendaAsICS([refEntry], 'Custom Strategy');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VEVENT');
  });

  it('DTSTART has TZID=Europe/Amsterdam and correct date-time', () => {
    const ics = formatAgendaAsICS([refEntry], 'Custom Strategy');
    expect(ics).toContain('DTSTART;TZID=Europe/Amsterdam:20260320T160000');
  });

  it('DTEND has TZID=Europe/Amsterdam and is 5 minutes after DTSTART', () => {
    const ics = formatAgendaAsICS([refEntry], 'Custom Strategy');
    expect(ics).toContain('DTEND;TZID=Europe/Amsterdam:20260320T160500');
  });

  it('DTSTAMP is present in UTC format (YYYYMMDDTHHmmssZ)', () => {
    const ics = formatAgendaAsICS([refEntry], 'Custom Strategy');
    expect(ics).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
  });

  it('field order within VEVENT: DTSTART → DTEND → DTSTAMP → SUMMARY → DESCRIPTION → UID', () => {
    const ics = formatAgendaAsICS([refEntry], 'Custom Strategy');
    const dtStart  = ics.indexOf('\r\nDTSTART');
    const dtEnd    = ics.indexOf('\r\nDTEND');
    const dtstamp  = ics.indexOf('\r\nDTSTAMP');
    const summary  = ics.indexOf('\r\nSUMMARY');
    const desc     = ics.indexOf('\r\nDESCRIPTION');
    const uid      = ics.indexOf('\r\nUID');
    expect(dtStart).toBeLessThan(dtEnd);
    expect(dtEnd).toBeLessThan(dtstamp);
    expect(dtstamp).toBeLessThan(summary);
    expect(summary).toBeLessThan(desc);
    expect(desc).toBeLessThan(uid);
  });

  it('SUMMARY contains the action text', () => {
    const ics = formatAgendaAsICS([refEntry], 'Custom Strategy');
    expect(ics).toContain('SUMMARY:Trade + Build metal L1');
  });

  it('DESCRIPTION contains simHour em-dash and action text', () => {
    const ics = formatAgendaAsICS([refEntry], 'Custom Strategy');
    expect(ics).toContain('DESCRIPTION:H0 \u2014 Trade + Build metal L1');
  });

  it('UID follows colony-sim-{scenarioName}-h{simHour}@colony-simulator', () => {
    const ics = formatAgendaAsICS([refEntry], 'Custom Strategy');
    expect(ics).toContain('UID:colony-sim-custom-strategy-h0@colony-simulator');
  });

  it('uses CRLF line endings throughout', () => {
    const ics = formatAgendaAsICS([refEntry], 'Custom Strategy');
    // Every line break should be CRLF
    const withoutCRLF = ics.replace(/\r\n/g, '');
    expect(withoutCRLF).not.toContain('\n');
    expect(withoutCRLF).not.toContain('\r');
  });

  it('excludes entries with only non-build/upgrade actions (e.g. mining check-ins)', () => {
    const miningEntry = {
      realTime: SEASON_START,
      displayTime: '16:00',
      simHour: 4,
      actions: ['Mine (~14 energy)'],
      isWakeUp: false,
    };
    const ics = formatAgendaAsICS([miningEntry], 'Custom Strategy');
    expect(ics).not.toContain('BEGIN:VEVENT');
  });

  it('excludes Season Start entry (no Build or Upgrade keyword)', () => {
    const startEntry = {
      realTime: SEASON_START,
      displayTime: '16:00',
      simHour: 0,
      actions: ['Season Start'],
      isWakeUp: false,
    };
    const ics = formatAgendaAsICS([startEntry], 'Custom Strategy');
    expect(ics).not.toContain('BEGIN:VEVENT');
  });

  it('includes Trade + Upgrade actions', () => {
    const upgradeEntry = {
      realTime: SEASON_START,
      displayTime: '16:00',
      simHour: 5,
      actions: ['Trade + Upgrade metal[0] to L2'],
      isWakeUp: false,
    };
    const ics = formatAgendaAsICS([upgradeEntry], 'Custom Strategy');
    expect(ics).toContain('SUMMARY:Trade + Upgrade metal[0] to L2');
    expect(ics).toContain('DESCRIPTION:H5 \u2014 Trade + Upgrade metal[0] to L2');
  });

  it('only the build/upgrade action appears in SUMMARY when entry has mixed actions', () => {
    const mixedEntry = {
      realTime: SEASON_START,
      displayTime: '16:00',
      simHour: 0,
      actions: ['Season Start', 'Trade + Build metal L1'],
      isWakeUp: false,
    };
    const ics = formatAgendaAsICS([mixedEntry], 'Custom Strategy');
    expect(ics).toContain('SUMMARY:Trade + Build metal L1');
    expect(ics).not.toContain('Season Start');
  });

  it('produces one VEVENT per entry that has build actions (not per action)', () => {
    const entries = [
      { ...refEntry, simHour: 0, realTime: SEASON_START },
      {
        realTime: new Date(SEASON_START.getTime() + 5 * 3600 * 1000),
        displayTime: '21:00',
        simHour: 5,
        actions: ['Upgrade metal[0] to L2'],
        isWakeUp: false,
      },
    ];
    const ics = formatAgendaAsICS(entries, 'Custom Strategy');
    const veventCount = (ics.match(/BEGIN:VEVENT/g) || []).length;
    expect(veventCount).toBe(2);
  });
});

// ===========================================================================
// 5. RFC 5545 compliance — AC1–AC21
// ===========================================================================
describe('formatAgendaAsICS — RFC 5545 compliance', () => {
  // Helpers
  // Unfold RFC 5545 folded lines so assertions can match full field values
  function unfoldICS(ics) {
    return ics.replace(/\r\n[ \t]/g, '');
  }

  function getAllFieldValues(ics, fieldName) {
    const unfolded = unfoldICS(ics);
    const re = new RegExp(`^${fieldName}(?:;[^:]+)?:(.+)$`, 'gm');
    return [...unfolded.matchAll(re)].map(m => m[1]);
  }

  const makeEntry = (simHour, actions) => ({
    realTime: new Date(SEASON_START.getTime() + simHour * 3600 * 1000),
    displayTime: String(simHour),
    simHour,
    actions,
    isWakeUp: false,
  });

  const refEntry = makeEntry(0, ['Trade + Build metal L1']);

  // A long action that forces line-folding (> 75 octets in SUMMARY/DESCRIPTION)
  const LONG_ACTION = 'Trade + Upgrade metal[0] to L2 (originally H82, shifted from sleep to next wake-up window)';
  const longEntry = makeEntry(0, [LONG_ACTION]);

  // Scenario name with chars that are illegal in UIDs
  const SPECIAL_SCENARIO = 'Scenario 4: Optimal (Recommended)';

  // --- AC3: calendar-level metadata ---
  it('includes CALSCALE:GREGORIAN (AC3)', () => {
    expect(formatAgendaAsICS([refEntry], 'Test')).toContain('CALSCALE:GREGORIAN');
  });

  it('includes METHOD:PUBLISH (AC3)', () => {
    expect(formatAgendaAsICS([refEntry], 'Test')).toContain('METHOD:PUBLISH');
  });

  it('CALSCALE and METHOD appear before the first VEVENT (AC3)', () => {
    const ics = formatAgendaAsICS([refEntry], 'Test');
    const calscalePos = ics.indexOf('CALSCALE');
    const veventPos   = ics.indexOf('BEGIN:VEVENT');
    expect(calscalePos).toBeGreaterThan(0);
    expect(calscalePos).toBeLessThan(veventPos);
  });

  // --- AC9: UID uniqueness ---
  it('each UID is unique within the file (AC9)', () => {
    const entries = [
      makeEntry(0,  ['Build metal L1']),
      makeEntry(5,  ['Upgrade metal[0] to L2']),
      makeEntry(20, ['Trade + Build Stardust L1']),
    ];
    const uids = getAllFieldValues(formatAgendaAsICS(entries, 'Test'), 'UID');
    expect(uids.length).toBe(3);
    expect(new Set(uids).size).toBe(3);
  });

  // --- AC10: UID allowed characters ---
  it('UIDs only contain letters, digits, -, _, ., @ (AC10)', () => {
    const uids = getAllFieldValues(formatAgendaAsICS([refEntry], SPECIAL_SCENARIO), 'UID');
    expect(uids.length).toBeGreaterThan(0);
    for (const uid of uids) {
      expect(uid, `UID "${uid}" contains disallowed chars`).toMatch(/^[A-Za-z0-9\-_.@]+$/);
    }
  });

  // --- AC11: UID disallowed characters ---
  it('UIDs do not contain :, (, ), comma, or spaces (AC11)', () => {
    const uids = getAllFieldValues(formatAgendaAsICS([refEntry], SPECIAL_SCENARIO), 'UID');
    for (const uid of uids) {
      expect(uid).not.toMatch(/[:()\s,]/);
    }
  });

  it('colons from scenario name like "Scenario 4: Optimal" are removed from UID (AC11)', () => {
    const uids = getAllFieldValues(formatAgendaAsICS([refEntry], SPECIAL_SCENARIO), 'UID');
    expect(uids[0]).not.toContain(':');
  });

  // --- AC12: Text escaping ---
  it('commas in action text are escaped as \\, in SUMMARY (AC12)', () => {
    const entry = makeEntry(0, ['Build metal L1, crystal L1']);
    const unfolded = unfoldICS(formatAgendaAsICS([entry], 'Test'));
    const line = unfolded.split('\r\n').find(l => l.startsWith('SUMMARY:'));
    expect(line).toContain('\\,');
  });

  it('commas in action text are escaped as \\, in DESCRIPTION (AC12)', () => {
    const entry = makeEntry(0, ['Build metal L1, crystal L1']);
    const unfolded = unfoldICS(formatAgendaAsICS([entry], 'Test'));
    const line = unfolded.split('\r\n').find(l => l.startsWith('DESCRIPTION:'));
    expect(line).toContain('\\,');
  });

  it('semicolons in action text are escaped as \\; (AC12)', () => {
    const entry = makeEntry(0, ['Build metal L1; upgrade stardust']);
    const unfolded = unfoldICS(formatAgendaAsICS([entry], 'Test'));
    const summary = unfolded.split('\r\n').find(l => l.startsWith('SUMMARY:'));
    expect(summary).toContain('\\;');
  });

  it('backslashes in action text are doubled to \\\\ (AC12)', () => {
    const entry = makeEntry(0, ['Build metal\\crystal']);
    const unfolded = unfoldICS(formatAgendaAsICS([entry], 'Test'));
    const summary = unfolded.split('\r\n').find(l => l.startsWith('SUMMARY:'));
    expect(summary).toContain('\\\\');
  });

  // --- AC14: Line length ---
  it('no line exceeds 75 octets (AC14)', () => {
    const ics = formatAgendaAsICS([longEntry], SPECIAL_SCENARIO);
    const encoder = new TextEncoder();
    for (const line of ics.split('\r\n')) {
      expect(
        encoder.encode(line).length,
        `line exceeds 75 octets: "${line}"`,
      ).toBeLessThanOrEqual(75);
    }
  });

  // --- AC15: Line folding ---
  it('lines longer than 75 octets are folded with a leading space (AC15)', () => {
    const ics = formatAgendaAsICS([longEntry], 'Test');
    const lines = ics.split('\r\n');
    const continuationLines = lines.filter(l => l.startsWith(' '));
    expect(continuationLines.length, 'expected at least one folded continuation line').toBeGreaterThan(0);
  });

  it('unfolding a folded ICS restores the full field value intact (AC15)', () => {
    const ics = formatAgendaAsICS([longEntry], 'Test');
    const unfolded = unfoldICS(ics);
    // The comma in the action should be escaped, and the full escaped text present after unfolding
    const summary = unfolded.split('\r\n').find(l => l.startsWith('SUMMARY:'));
    expect(summary).toBeDefined();
    expect(summary).toContain('originally H82\\,');
    expect(summary).toContain('next wake-up window');
  });

  // --- AC16: Multiline descriptions ---
  it('multiple build actions in DESCRIPTION use \\n as line separator (AC16)', () => {
    const entry = makeEntry(0, ['Build metal L1', 'Upgrade stardust to L2']);
    const unfolded = unfoldICS(formatAgendaAsICS([entry], 'Test'));
    const desc = unfolded.split('\r\n').find(l => l.startsWith('DESCRIPTION:'));
    expect(desc).toContain('\\n');
  });

  // --- AC17: Multi-action SUMMARY ---
  it('multiple build actions in SUMMARY are all present (AC17)', () => {
    const entry = makeEntry(0, ['Build metal L1', 'Upgrade stardust to L2']);
    const unfolded = unfoldICS(formatAgendaAsICS([entry], 'Test'));
    const summary = unfolded.split('\r\n').find(l => l.startsWith('SUMMARY:'));
    expect(summary).toContain('Build metal L1');
    expect(summary).toContain('Upgrade stardust to L2');
  });

  // --- AC21: Required fields are non-empty ---
  it('required event fields UID, DTSTAMP, SUMMARY are non-empty (AC21)', () => {
    const ics = formatAgendaAsICS([refEntry], 'Test');
    const unfolded = unfoldICS(ics);
    for (const field of ['UID', 'DTSTAMP', 'SUMMARY']) {
      const vals = getAllFieldValues(ics, field);
      expect(vals.length, `${field} should be present`).toBeGreaterThan(0);
      expect(vals[0].trim(), `${field} should not be empty`).not.toBe('');
    }
    // DTSTART / DTEND use property parameters — check via regex
    expect(unfolded).toMatch(/DTSTART;[^:]+:\S/);
    expect(unfolded).toMatch(/DTEND;[^:]+:\S/);
  });
});
