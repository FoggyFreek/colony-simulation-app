import { BUILDING_SLOTS } from './gameConstants';

/**
 * Convert an ordered action queue into a strategy function compatible with simulate().
 * The returned function is called each hour by the engine. It tracks which action
 * to attempt next by comparing current building state against expected state.
 */
export function createCustomStrategy(actionQueue) {
  let nextIdx = 0;
  let done = false;
  // Track expected building state so we can detect when an action completes
  let expectedBuildings = null;

  return function customStrategy(hour, resources, buildings, _production, _totalBuildings) {
    if (done) return [];

    // On first call, initialize expected state
    if (expectedBuildings === null) {
      expectedBuildings = JSON.parse(JSON.stringify(buildings));
    }

    // Check if the previous action completed by comparing buildings to expected post-action state
    if (nextIdx > 0) {
      const prev = actionQueue[nextIdx - 1];
      const completed = didActionComplete(prev, buildings, expectedBuildings);
      if (completed) {
        // Update expected state to match current
        expectedBuildings = JSON.parse(JSON.stringify(buildings));
        // If that was the last action, we're done
        if (nextIdx >= actionQueue.length) {
          done = true;
          return [];
        }
      } else {
        // Previous action hasn't completed yet — keep trying it
        return [buildEngineAction(actionQueue[nextIdx - 1], expectedBuildings)];
      }
    }

    // Try the next action
    if (nextIdx < actionQueue.length) {
      const action = actionQueue[nextIdx];
      const engineAction = buildEngineAction(action, expectedBuildings);
      nextIdx++;
      return [engineAction];
    }

    return [];
  };
}

function didActionComplete(queueItem, currentBuildings, expectedBuildings) {
  const { buildingType, actionType, slotIndex, targetLevel } = queueItem;
  const currentSlots = currentBuildings[buildingType];
  const expectedSlots = expectedBuildings[buildingType];

  if (actionType === 'build') {
    // A new building was added
    return currentSlots.length > expectedSlots.length;
  } else {
    // An upgrade occurred — check if the slot reached the target level
    if (slotIndex < currentSlots.length) {
      return currentSlots[slotIndex] >= targetLevel;
    }
    return false;
  }
}

function buildEngineAction(queueItem, _expectedBuildings) {
  const { buildingType, actionType, slotIndex, targetLevel } = queueItem;

  if (buildingType === 'stardust') {
    if (actionType === 'build') {
      return { type: 'trade_and_build_stardust', targetLevel: 1 };
    } else {
      return { type: 'trade_and_build_stardust', buildingIndex: slotIndex, targetLevel };
    }
  } else {
    if (actionType === 'build') {
      return { type: 'trade_and_upgrade', buildingType, targetLevel: 1 };
    } else {
      return { type: 'trade_and_upgrade', buildingType, buildingIndex: slotIndex, targetLevel };
    }
  }
}

/**
 * Validate that an action queue is internally consistent.
 * Walks the queue maintaining virtual building state.
 */
export function validateActionQueue(actionQueue) {
  const errors = [];
  const virtualBuildings = { metal: [], gas: [], crystal: [], stardust: [] };
  // { item, queueIndex } — upgrades whose prerequisite slot hasn't been built yet
  const deferred = [];

  function flushDeferred(buildingType) {
    for (let i = 0; i < deferred.length; i++) {
      const { item, queueIndex } = deferred[i];
      if (item.buildingType !== buildingType) continue;
      const maxLevel = buildingType === 'stardust' ? 3 : 7;
      const slots = virtualBuildings[buildingType];
      if (item.slotIndex >= slots.length) continue; // slot still not ready
      const currentLevel = slots[item.slotIndex];
      if (currentLevel >= maxLevel) {
        errors.push({ index: queueIndex, message: `${buildingType}[${item.slotIndex}] already at max level ${maxLevel}` });
        deferred.splice(i--, 1);
        continue;
      }
      if (item.targetLevel !== currentLevel + 1) {
        errors.push({ index: queueIndex, message: `Expected target L${currentLevel + 1}, got L${item.targetLevel}` });
        deferred.splice(i--, 1);
        continue;
      }
      slots[item.slotIndex] = item.targetLevel;
      deferred.splice(i--, 1);
    }
  }

  for (let i = 0; i < actionQueue.length; i++) {
    const item = actionQueue[i];
    const { buildingType, actionType, slotIndex, targetLevel } = item;
    const maxLevel = buildingType === 'stardust' ? 3 : 7;
    const totalSlots = Object.values(virtualBuildings).reduce((s, arr) => s + arr.length, 0);

    if (actionType === 'build') {
      if (totalSlots >= BUILDING_SLOTS) {
        errors.push({ index: i, message: `No slots available (max ${BUILDING_SLOTS})` });
        continue;
      }
      if (buildingType === 'stardust' && virtualBuildings.stardust.length >= 1) {
        errors.push({ index: i, message: `Only one stardust building is allowed — upgrade it to L3 for more production` });
        continue;
      }
      virtualBuildings[buildingType].push(1);
      flushDeferred(buildingType);
    } else if (actionType === 'upgrade') {
      if (slotIndex >= virtualBuildings[buildingType].length) {
        // Slot doesn't exist yet — defer until after the prerequisite build
        deferred.push({ item, queueIndex: i });
        continue;
      }
      const currentLevel = virtualBuildings[buildingType][slotIndex];
      if (currentLevel >= maxLevel) {
        errors.push({ index: i, message: `${buildingType}[${slotIndex}] already at max level ${maxLevel}` });
        continue;
      }
      if (targetLevel !== currentLevel + 1) {
        errors.push({ index: i, message: `Expected target L${currentLevel + 1}, got L${targetLevel}` });
        continue;
      }
      virtualBuildings[buildingType][slotIndex] = targetLevel;
    }
  }

  // Any still-deferred upgrades have no matching build anywhere in the queue
  for (const { item, queueIndex } of deferred) {
    errors.push({ index: queueIndex, message: `${item.buildingType}[${item.slotIndex}] is never built` });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Match each queue item to actionLog entries to determine completion status and hour.
 */
export function mapQueueToResults(actionQueue, actionLog) {
  let logIdx = 0;
  return actionQueue.map(item => {
    // Find the next matching action log entry
    while (logIdx < actionLog.length) {
      const entry = actionLog[logIdx];
      if (actionMatchesLog(item, entry)) {
        logIdx++;
        return { completed: true, hour: entry.hour };
      }
      logIdx++;
    }
    return { completed: false, hour: null };
  });
}

function actionMatchesLog(queueItem, logEntry) {
  const { buildingType, actionType, slotIndex, targetLevel } = queueItem;
  const log = logEntry.action;

  // Engine logs non-stardust types lowercase (e.g. "metal"), stardust as "Stardust"
  if (actionType === 'build') {
    if (buildingType === 'stardust') {
      return log === 'Trade + Build Stardust L1' || log === 'Build Stardust L1';
    }
    return (
      log === `Trade + Build ${buildingType} L1` ||
      log === `Build ${buildingType} L1`
    );
  } else {
    if (buildingType === 'stardust') {
      return log === `Trade + Upgrade Stardust to L${targetLevel}` ||
             log === `Upgrade Stardust to L${targetLevel}`;
    }
    return (
      log === `Trade + Upgrade ${buildingType}[${slotIndex}] to L${targetLevel}` ||
      log === `Upgrade ${buildingType}[${slotIndex}] to L${targetLevel}`
    );
  }
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Get valid next actions given the current queue state.
 * Used by the UI to populate the action dropdown.
 */
export function getValidActions(actionQueue) {
  // Build virtual state from queue
  const virtualBuildings = { metal: [], gas: [], crystal: [], stardust: [] };
  for (const item of actionQueue) {
    if (item.actionType === 'build') {
      virtualBuildings[item.buildingType].push(1);
    } else if (item.actionType === 'upgrade') {
      if (item.slotIndex < virtualBuildings[item.buildingType].length) {
        virtualBuildings[item.buildingType][item.slotIndex] = item.targetLevel;
      }
    }
  }

  const totalSlots = Object.values(virtualBuildings).reduce((s, arr) => s + arr.length, 0);
  const actions = [];

  for (const type of ['metal', 'gas', 'crystal', 'stardust']) {
    const maxLevel = type === 'stardust' ? 3 : 7;
    const slots = virtualBuildings[type];

    // Build new (stardust is limited to one building per planet)
    if (totalSlots < BUILDING_SLOTS && !(type === 'stardust' && slots.length >= 1)) {
      actions.push({
        buildingType: type,
        actionType: 'build',
        slotIndex: slots.length,
        targetLevel: 1,
        label: `Build ${capitalize(type)} L1`,
      });
    }

    // Upgrade existing
    for (let i = 0; i < slots.length; i++) {
      if (slots[i] < maxLevel) {
        const nextLvl = slots[i] + 1;
        actions.push({
          buildingType: type,
          actionType: 'upgrade',
          slotIndex: i,
          targetLevel: nextLvl,
          label: `Upgrade ${capitalize(type)}[${i}] to L${nextLvl}`,
        });
      }
    }
  }

  return actions;
}
