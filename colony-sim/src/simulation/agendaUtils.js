import { ENERGY_PER_HOUR, MAX_ENERGY } from './gameConstants';

/**
 * Map a simulation hour (0-168) to a real-world Date based on season start.
 */
export function mapSimHourToRealTime(simHour, seasonStart) {
  const ms = seasonStart.getTime() + simHour * 60 * 60 * 1000;
  return new Date(ms);
}

/**
 * Format a Date as "Friday 16:00 CET" style string.
 */
export function formatDateTime(date) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const day = days[date.getDay()];
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${day} ${hh}:${mm}`;
}

/**
 * Format a Date as "FRIDAY Mar 20" for day headers.
 */
export function formatDayHeader(date) {
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getDay()]} ${months[date.getMonth()]} ${date.getDate()}`;
}

/**
 * Check if a given Date falls within awake hours.
 * awakeStart/awakeEnd are integers 0-23.
 * Sleep = [awakeEnd, awakeStart) of next day.
 * e.g. awakeStart=7, awakeEnd=23: 23:00-06:59 is sleep, 07:00-22:59 is awake.
 */
export function isAwakeHour(date, awakeStart, awakeEnd) {
  const hour = date.getHours();
  if (awakeStart < awakeEnd) {
    // Normal: awake 7-23 means hour >= 7 && hour < 23
    return hour >= awakeStart && hour < awakeEnd;
  }
  // Wrapping: e.g. awakeStart=22, awakeEnd=6
  return hour >= awakeStart || hour < awakeEnd;
}

/**
 * Find the next wake-up time from a given date.
 */
export function nextWakeUp(date, awakeStart) {
  const result = new Date(date);
  // Set to awakeStart:00 of the same day
  result.setHours(awakeStart, 0, 0, 0);
  // If that's not after the current time, move to next day
  if (result <= date) {
    result.setDate(result.getDate() + 1);
  }
  return result;
}

/**
 * Build agenda entries from simulation actionLog and timeline.
 *
 * @param {Array} actionLog - [{hour, action}]
 * @param {Array} timeline - simulation timeline snapshots
 * @param {Date} seasonStart - real-world season start time
 * @param {Object} awakeConfig - {enabled, awakeStart, awakeEnd}
 * @param {Object} options - {saveEnergy: boolean}
 * @returns {Array} agenda entries
 */
export function buildAgenda(actionLog, timeline, seasonStart, awakeConfig, options = {}) {
  const { saveEnergy = false } = options;
  const { enabled: awakeEnabled, awakeStart = 7, awakeEnd = 23 } = awakeConfig;
  const entries = [];

  // Build a set of hours that have actions for quick lookup
  const actionsByHour = new Map();
  for (const entry of actionLog) {
    if (!actionsByHour.has(entry.hour)) {
      actionsByHour.set(entry.hour, []);
    }
    actionsByHour.get(entry.hour).push(entry.action);
  }

  // Build energy lookup from timeline for save-energy annotations
  const energyByHour = new Map();
  if (saveEnergy) {
    for (const snap of timeline) {
      // Use the first snapshot per hour (pre-action state)
      if (!energyByHour.has(snap.hour)) {
        energyByHour.set(snap.hour, snap.energy);
      }
    }
  }

  // When saveEnergy is on, find hours with metal upgrades and compute
  // a "no-mine zone" before each (up to 10 hours where energy is saved)
  const noMineHours = new Set();
  const upgradeEnergyInfo = new Map(); // hour -> {energy, isMetal}
  if (saveEnergy) {
    for (const entry of actionLog) {
      const isMetalUpgrade = /(?:Trade \+ )?(?:Upgrade|Build) metal/i.test(entry.action);
      if (!isMetalUpgrade) continue;

      // Look at energy at upgrade hour — high energy means it was saved
      const energy = energyByHour.get(entry.hour);
      if (energy !== undefined && energy > ENERGY_PER_HOUR * 2) {
        upgradeEnergyInfo.set(entry.hour, { energy, action: entry.action });
        // Mark preceding hours as no-mine (up to 10h back)
        for (let h = entry.hour - 1; h >= Math.max(0, entry.hour - 10); h--) {
          noMineHours.add(h);
        }
      }
    }
  }

  // Track energy accumulation during sleep for mining notes
  let sleepEnergyAccum = 0;
  let shiftedActions = []; // actions shifted from sleep hours
  let lastWakeUpHour = null;

  // Add season start entry
  const startActions = actionsByHour.get(0) || [];
  entries.push({
    realTime: new Date(seasonStart),
    displayTime: formatTime(seasonStart),
    simHour: 0,
    actions: ['Season Start', ...startActions],
    shiftedFrom: null,
    miningNote: null,
    isWakeUp: false,
  });

  // Process each sim hour (1-168)
  for (let h = 1; h <= 168; h++) {
    const realTime = mapSimHourToRealTime(h, seasonStart);
    const hourActions = actionsByHour.get(h) || [];
    const hasActions = hourActions.length > 0;

    if (awakeEnabled && !isAwakeHour(realTime, awakeStart, awakeEnd)) {
      // Sleep hour: accumulate energy and shift actions
      sleepEnergyAccum += ENERGY_PER_HOUR;
      if (sleepEnergyAccum > MAX_ENERGY) sleepEnergyAccum = MAX_ENERGY;
      if (hasActions) {
        for (const a of hourActions) {
          shiftedActions.push({ action: a, originalHour: h });
        }
      }
      // Reset so next day's wake-up triggers correctly
      lastWakeUpHour = null;
      continue;
    }

    // Awake hour
    const isWakeUp = awakeEnabled && lastWakeUpHour !== realTime.getHours() &&
      realTime.getHours() === awakeStart && sleepEnergyAccum > 0;

    if (isWakeUp) {
      // Wake-up block: batch shifted actions + accumulated mining
      const wakeActions = [];
      const miningCount = Math.floor(sleepEnergyAccum);
      if (miningCount > 0) {
        wakeActions.push(`Mine ${miningCount} times (${Math.round(sleepEnergyAccum)} sleep energy)`);
      }
      for (const shifted of shiftedActions) {
        wakeActions.push(`${shifted.action} (originally H${shifted.originalHour})`);
      }
      // Also add any actions scheduled for this exact hour
      wakeActions.push(...hourActions);

      entries.push({
        realTime: new Date(realTime),
        displayTime: formatTime(realTime),
        simHour: h,
        actions: wakeActions,
        shiftedFrom: shiftedActions.map(s => s.originalHour),
        miningNote: miningCount > 0 ? `${miningCount} mines from sleep energy` : null,
        isWakeUp: true,
      });

      sleepEnergyAccum = 0;
      shiftedActions = [];
      lastWakeUpHour = realTime.getHours();
      continue;
    }

    // Regular awake hour: check if we should add a mining check-in
    // Energy accumulates ~3.571/hr, so every ~4 hours we have ~14 energy
    const hoursSinceLastEntry = entries.length > 0
      ? h - entries[entries.length - 1].simHour
      : 0;

    const shouldMiningCheckin = hoursSinceLastEntry >= 4 && !hasActions;

    if (hasActions) {
      // When saveEnergy is on, annotate metal upgrades with post-upgrade mining
      const augmentedActions = [...hourActions];
      if (saveEnergy && upgradeEnergyInfo.has(h)) {
        const info = upgradeEnergyInfo.get(h);
        const mineCount = Math.floor(info.energy);
        if (mineCount > 0) {
          augmentedActions.push(`Mine ${mineCount} times after upgrade (saved energy, higher production rate)`);
        }
      }
      entries.push({
        realTime: new Date(realTime),
        displayTime: formatTime(realTime),
        simHour: h,
        actions: augmentedActions,
        shiftedFrom: null,
        miningNote: null,
        isWakeUp: false,
      });
    } else if (shouldMiningCheckin && !(saveEnergy && noMineHours.has(h))) {
      // Suppress mining check-ins during save-energy periods
      const energyAccum = Math.round(hoursSinceLastEntry * ENERGY_PER_HOUR);
      entries.push({
        realTime: new Date(realTime),
        displayTime: formatTime(realTime),
        simHour: h,
        actions: [`Mine (~${energyAccum} energy)`],
        shiftedFrom: null,
        miningNote: `~${energyAccum} energy accumulated`,
        isWakeUp: false,
      });
    } else if (saveEnergy && noMineHours.has(h) && shouldMiningCheckin) {
      // Show a "save energy" reminder instead of a mining check-in
      entries.push({
        realTime: new Date(realTime),
        displayTime: formatTime(realTime),
        simHour: h,
        actions: ['Skip mining (saving energy for upcoming metal upgrade)'],
        shiftedFrom: null,
        miningNote: null,
        isWakeUp: false,
      });
    }
  }

  return entries;
}

function formatTime(date) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Format agenda entries as a plain-text string grouped by day.
 */
export function formatAgendaAsText(entries, scenarioName, seasonStart, awakeConfig, options = {}) {
  const { saveEnergy = false } = options;
  const lines = [];
  lines.push(`=== COLONY AGENDA — Scenario: ${scenarioName} ===`);
  lines.push(`Season Start: ${formatDateTime(seasonStart)} (${seasonStart.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })})`);
  if (awakeConfig.enabled) {
    lines.push(`Awake Hours: ${String(awakeConfig.awakeStart).padStart(2, '0')}:00 – ${String(awakeConfig.awakeEnd).padStart(2, '0')}:00`);
  }
  if (saveEnergy) {
    lines.push('Energy Saving: ON — skip mining before metal upgrades, mine after at higher rate');
  }
  lines.push('');

  let currentDay = null;

  for (const entry of entries) {
    const dayKey = formatDayHeader(entry.realTime);
    if (dayKey !== currentDay) {
      currentDay = dayKey;
      lines.push(`--- ${dayKey} ---`);
    }

    const simLabel = entry.isWakeUp
      ? `[WAKE UP — H${entry.simHour}]`
      : `[H${entry.simHour}]`;

    const timeStr = entry.displayTime;

    if (entry.actions.length === 1) {
      lines.push(`${timeStr}  ${simLabel}  ${entry.actions[0]}`);
    } else {
      lines.push(`${timeStr}  ${simLabel}`);
      for (const action of entry.actions) {
        lines.push(`              → ${action}`);
      }
    }
  }

  lines.push('');
  lines.push('Generated by Colony Simulator');
  return lines.join('\n');
}

/**
 * Get the next upcoming Friday at 16:00 local time from a given date.
 */
export function getNextFriday16(fromDate = new Date()) {
  const d = new Date(fromDate);
  d.setHours(16, 0, 0, 0);
  const dayOfWeek = d.getDay();
  // Friday = 5
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  if (daysUntilFriday === 0 && fromDate.getHours() >= 16) {
    // Already past Friday 16:00, go to next Friday
    d.setDate(d.getDate() + 7);
  } else {
    d.setDate(d.getDate() + daysUntilFriday);
  }
  return d;
}
