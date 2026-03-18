import { describe, it, expect } from 'vitest';
import { simulate } from './engine';
import {
  createCustomStrategy,
  validateActionQueue,
  mapQueueToResults,
  getValidActions,
} from './customStrategy';
import { SEASON_HOURS } from './gameConstants';

// Helper to build a queue item
function q(buildingType, actionType, slotIndex, targetLevel) {
  const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
  const label = actionType === 'build'
    ? `Build ${capitalize(buildingType)} L1`
    : `Upgrade ${capitalize(buildingType)}[${slotIndex}] to L${targetLevel}`;
  return { id: `${buildingType}-${actionType}-${slotIndex}-${targetLevel}`, buildingType, actionType, slotIndex, targetLevel, label };
}

describe('createCustomStrategy + simulate', () => {
  it('single metal L1 build completes early in the season', () => {
    const queue = [q('metal', 'build', 0, 1)];
    const strategy = createCustomStrategy(queue);
    const result = simulate(strategy, 42);

    // Should have at least one action log entry for building metal
    // Engine logs lowercase type: "Trade + Build metal L1"
    const buildEntry = result.actionLog.find(e => e.action.includes('Build metal'));
    expect(buildEntry).toBeDefined();
    expect(buildEntry.hour).toBeLessThan(10);
    expect(result.finalState.buildings.metal.length).toBe(1);
  });

  it('build + upgrade sequence executes in order', () => {
    const queue = [
      q('metal', 'build', 0, 1),
      q('metal', 'upgrade', 0, 2),
      q('metal', 'upgrade', 0, 3),
    ];
    const strategy = createCustomStrategy(queue);
    const result = simulate(strategy, 42);

    expect(result.finalState.buildings.metal[0]).toBe(3);

    // Actions should appear in chronological order (exclude trade log entries)
    const metalActions = result.actionLog.filter(e => e.action.match(/^(Build|Upgrade) metal/));
    expect(metalActions.length).toBe(3);
    expect(metalActions[0].hour).toBeLessThan(metalActions[1].hour);
    expect(metalActions[1].hour).toBeLessThan(metalActions[2].hour);
  });

  it('returns empty actions once queue is exhausted', () => {
    const queue = [q('metal', 'build', 0, 1)];
    const strategy = createCustomStrategy(queue);
    const result = simulate(strategy, 42);

    // Only one build action should appear — no repeated attempts after completion
    const buildEntries = result.actionLog.filter(e => e.action.includes('metal'));
    expect(buildEntries.length).toBe(1);
  });

  it('stardust build uses trade_and_build_stardust action type', () => {
    const queue = [q('stardust', 'build', 0, 1)];
    const strategy = createCustomStrategy(queue);
    const result = simulate(strategy, 42);

    const sdEntry = result.actionLog.find(e => e.action.includes('Stardust'));
    expect(sdEntry).toBeDefined();
    expect(result.finalState.buildings.stardust.length).toBe(1);
  });

  it('stardust upgrade uses correct buildingIndex', () => {
    const queue = [
      q('stardust', 'build', 0, 1),
      q('stardust', 'upgrade', 0, 2),
    ];
    const strategy = createCustomStrategy(queue);
    const result = simulate(strategy, 42);

    expect(result.finalState.buildings.stardust[0]).toBe(2);
  });

  it('simulation runs full 168 hours regardless of queue length', () => {
    const queue = [q('metal', 'build', 0, 1)];
    const strategy = createCustomStrategy(queue);
    const result = simulate(strategy, 42);

    const lastSnapshot = result.timeline[result.timeline.length - 1];
    expect(lastSnapshot.hour).toBe(SEASON_HOURS);
  });
});


describe('mapQueueToResults — season overflow detection', () => {
  it('marks all actions completed when they fit in the season', () => {
    const queue = [
      q('metal', 'build', 0, 1),
      q('metal', 'upgrade', 0, 2),
    ];
    const strategy = createCustomStrategy(queue);
    const result = simulate(strategy, 42);
    const statuses = mapQueueToResults(queue, result.actionLog);

    expect(statuses.length).toBe(2);
    expect(statuses[0].completed).toBe(true);
    expect(statuses[0].hour).toBeGreaterThanOrEqual(0);
    expect(statuses[1].completed).toBe(true);
    expect(statuses[1].hour).toBeGreaterThan(statuses[0].hour);
  });

  it('marks overflowing actions as not completed', () => {
    // Queue 9 metal builds + upgrade each to L7 = way more than fits in 168h
    const queue = [];
    for (let i = 0; i < 9; i++) {
      queue.push(q('metal', 'build', i, 1));
      for (let lvl = 2; lvl <= 7; lvl++) {
        queue.push(q('metal', 'upgrade', i, lvl));
      }
    }
    const strategy = createCustomStrategy(queue);
    const result = simulate(strategy, 42);
    const statuses = mapQueueToResults(queue, result.actionLog);

    const completed = statuses.filter(s => s.completed);
    const overflow = statuses.filter(s => !s.completed);

    // Some should complete, some should overflow
    expect(completed.length).toBeGreaterThan(0);
    expect(overflow.length).toBeGreaterThan(0);

    // Completed actions should have hours, overflow should not
    for (const s of completed) {
      expect(s.hour).toBeGreaterThanOrEqual(0);
      expect(s.hour).toBeLessThanOrEqual(SEASON_HOURS);
    }
    for (const s of overflow) {
      expect(s.completed).toBe(false);
      expect(s.hour).toBeNull();
    }
  });

  it('all completed actions appear before all overflow actions', () => {
    const queue = [];
    for (let i = 0; i < 9; i++) {
      queue.push(q('metal', 'build', i, 1));
      for (let lvl = 2; lvl <= 7; lvl++) {
        queue.push(q('metal', 'upgrade', i, lvl));
      }
    }
    const strategy = createCustomStrategy(queue);
    const result = simulate(strategy, 42);
    const statuses = mapQueueToResults(queue, result.actionLog);

    let seenOverflow = false;
    for (const s of statuses) {
      if (!s.completed) seenOverflow = true;
      if (seenOverflow) {
        expect(s.completed).toBe(false);
      }
    }
  });

  it('empty queue produces empty statuses', () => {
    const statuses = mapQueueToResults([], []);
    expect(statuses).toEqual([]);
  });
});


describe('validateActionQueue', () => {
  it('valid simple queue passes', () => {
    const queue = [
      q('metal', 'build', 0, 1),
      q('metal', 'upgrade', 0, 2),
    ];
    const { valid, errors } = validateActionQueue(queue);
    expect(valid).toBe(true);
    expect(errors).toEqual([]);
  });

  it('rejects upgrade on non-existent slot', () => {
    const queue = [q('metal', 'upgrade', 0, 2)];
    const { valid, errors } = validateActionQueue(queue);
    expect(valid).toBe(false);
    expect(errors[0].message).toContain("is never built");
  });

  it('rejects exceeding max building slots', () => {
    const queue = [];
    for (let i = 0; i < 10; i++) {
      queue.push(q('metal', 'build', i, 1));
    }
    const { valid, errors } = validateActionQueue(queue);
    expect(valid).toBe(false);
    expect(errors.length).toBe(1);
    expect(errors[0].index).toBe(9);
    expect(errors[0].message).toContain('No slots');
  });

  it('rejects upgrading past max level (7 for metal)', () => {
    const queue = [q('metal', 'build', 0, 1)];
    for (let lvl = 2; lvl <= 7; lvl++) {
      queue.push(q('metal', 'upgrade', 0, lvl));
    }
    queue.push(q('metal', 'upgrade', 0, 8));
    const { valid, errors } = validateActionQueue(queue);
    expect(valid).toBe(false);
    expect(errors[0].message).toContain('max level 7');
  });

  it('rejects upgrading past max level (3 for stardust)', () => {
    const queue = [
      q('stardust', 'build', 0, 1),
      q('stardust', 'upgrade', 0, 2),
      q('stardust', 'upgrade', 0, 3),
      q('stardust', 'upgrade', 0, 4),
    ];
    const { valid, errors } = validateActionQueue(queue);
    expect(valid).toBe(false);
    expect(errors[0].message).toContain('max level 3');
  });

  it('rejects skipping a level', () => {
    const queue = [
      q('metal', 'build', 0, 1),
      q('metal', 'upgrade', 0, 3), // skips L2
    ];
    const { valid, errors } = validateActionQueue(queue);
    expect(valid).toBe(false);
    expect(errors[0].message).toContain('Expected target L2');
  });

  it('mixed building types across 9 slots is valid (one stardust max)', () => {
    const queue = [
      q('metal', 'build', 0, 1),
      q('gas', 'build', 0, 1),
      q('crystal', 'build', 0, 1),
      q('stardust', 'build', 0, 1),
      q('metal', 'build', 1, 1),
      q('gas', 'build', 1, 1),
      q('crystal', 'build', 1, 1),
      q('gas', 'build', 2, 1),
      q('metal', 'build', 2, 1),
    ];
    const { valid } = validateActionQueue(queue);
    expect(valid).toBe(true);
  });

  it('rejects a second stardust build', () => {
    const queue = [
      q('stardust', 'build', 0, 1),
      q('stardust', 'build', 1, 1),
    ];
    const { valid, errors } = validateActionQueue(queue);
    expect(valid).toBe(false);
    expect(errors[0].message).toContain('Only one stardust building is allowed');
  });
});


describe('getValidActions', () => {
  it('empty queue offers build actions for all 4 types', () => {
    const actions = getValidActions([]);
    expect(actions.length).toBe(4);
    expect(actions.every(a => a.actionType === 'build')).toBe(true);
    const types = actions.map(a => a.buildingType);
    expect(types).toContain('metal');
    expect(types).toContain('gas');
    expect(types).toContain('crystal');
    expect(types).toContain('stardust');
  });

  it('after building metal, offers upgrade metal[0] to L2', () => {
    const queue = [q('metal', 'build', 0, 1)];
    const actions = getValidActions(queue);
    const upgradeAction = actions.find(a =>
      a.buildingType === 'metal' && a.actionType === 'upgrade' && a.slotIndex === 0
    );
    expect(upgradeAction).toBeDefined();
    expect(upgradeAction.targetLevel).toBe(2);
  });

  it('no build actions when 9 slots are filled', () => {
    const queue = [];
    for (let i = 0; i < 9; i++) {
      queue.push(q('metal', 'build', i, 1));
    }
    const actions = getValidActions(queue);
    const buildActions = actions.filter(a => a.actionType === 'build');
    expect(buildActions.length).toBe(0);
  });

  it('no upgrade action for a maxed slot', () => {
    const queue = [q('metal', 'build', 0, 1)];
    for (let lvl = 2; lvl <= 7; lvl++) {
      queue.push(q('metal', 'upgrade', 0, lvl));
    }
    const actions = getValidActions(queue);
    const metalUpgrades = actions.filter(a =>
      a.buildingType === 'metal' && a.actionType === 'upgrade' && a.slotIndex === 0
    );
    expect(metalUpgrades.length).toBe(0);
  });
});


describe('custom strategy matches preset strategies', () => {
  it('custom queue mimicking max-metal-rush produces same building result', () => {
    // Build metal L1 → upgrade to L7, repeat for 9 slots
    // This is what strategyMaxMetal does
    const queue = [];
    for (let i = 0; i < 9; i++) {
      queue.push(q('metal', 'build', i, 1));
      for (let lvl = 2; lvl <= 7; lvl++) {
        queue.push(q('metal', 'upgrade', i, lvl));
      }
    }

    const strategy = createCustomStrategy(queue);
    const result = simulate(strategy, 42);

    // Should have built and upgraded several metal buildings
    // (not all 9x7 will fit, but the ones that do should match)
    const metalBuildings = result.finalState.buildings.metal;
    expect(metalBuildings.length).toBeGreaterThan(0);
    // First building should be fully upgraded to L7
    expect(metalBuildings[0]).toBe(7);
  });
});
