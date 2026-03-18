import {
  SEASON_HOURS, STARTING_RESOURCES, BASE_PRODUCTION, BUILDING_SLOTS,
  BUILDING_PRODUCTION, STARDUST_BUILDING_PRODUCTION,
  BUILDING_COST_MAP, ENERGY_PER_HOUR,
  MINING_REWARD_RATE, MINING_JACKPOT_CHANCE, MINING_JACKPOT_MULTIPLIER, MINING_VARIANCE,
  MAX_ENERGY, STARDUST_POINTS_PER_UNIT,
  BUILDING_UPGRADE_POINTS, STARDUST_UPGRADE_POINTS,
  TRADE_RATIO_CENTER, TRADE_RATIO_AMPLITUDE,
} from './gameConstants';

// Seeded random for reproducible simulations
function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// Generate smooth trade ratios over 168 hours using layered sine waves
// with seeded random phases. Produces gradual changes, no sudden spikes.
function generateTradeRatios(seed, totalHours, amplitude = TRADE_RATIO_AMPLITUDE) {
  const rand = seededRandom(seed ^ 0xbeef); // offset seed to decouple from mining RNG
  const phases = [];
  for (let i = 0; i < 6; i++) phases.push(rand() * Math.PI * 2);

  const ratios = [];
  for (let h = 0; h <= totalHours; h++) {
    const t = h / totalHours;
    // Sum of 3 sine waves at low frequencies for smooth variation
    const gasValue =
      0.5 * Math.sin(2 * Math.PI * 1 * t + phases[0]) +
      0.3 * Math.sin(2 * Math.PI * 2 * t + phases[1]) +
      0.2 * Math.sin(2 * Math.PI * 3 * t + phases[2]);
    const crystalValue =
      0.5 * Math.sin(2 * Math.PI * 1 * t + phases[3]) +
      0.3 * Math.sin(2 * Math.PI * 2 * t + phases[4]) +
      0.2 * Math.sin(2 * Math.PI * 3 * t + phases[5]);

    ratios.push({
      metalToGas: TRADE_RATIO_CENTER + gasValue * amplitude,
      metalToCrystal: TRADE_RATIO_CENTER + crystalValue * amplitude,
    });
  }
  return ratios;
}

function cloneBuildings(buildings) {
  return {
    metal: [...buildings.metal],
    gas: [...buildings.gas],
    crystal: [...buildings.crystal],
    stardust: [...buildings.stardust],
  };
}

export function simulate(strategy, seed = 42, options = {}) {
  const { saveEnergyBeforeUpgrade = false, tradeRatioAmplitude = TRADE_RATIO_AMPLITUDE, saveEnergyThreshold = 10 } = options;
  const rand = seededRandom(seed);
  const tradeRatios = generateTradeRatios(seed, SEASON_HOURS, tradeRatioAmplitude);
  const timeline = [];

  // State
  let resources = { ...STARTING_RESOURCES };
  let buildings = { metal: [], gas: [], crystal: [], stardust: [] };
  let production = { ...BASE_PRODUCTION };
  let energy = MAX_ENERGY;
  let leaderboardPoints = 0;
  let productionPoints = 0;
  let miningPoints = 0;
  let stardustPoints = 0;
  let buildingBuiltPoints = 0;
  let buildingUpgradePoints = 0;
  let totalResourcesProduced = { metals: 0, gas: 0, crystal: 0, stardust: 0 };
  let totalMiningRewards = { metals: 0, gas: 0, crystal: 0 };
  const actionLog = [];
  const miningByHour = [];
  let hourMiningMetals = 0;
  let hourMiningGas = 0;
  let hourMiningCrystal = 0;
  let hourMiningResource = null;
  let hourMiningActions = 0;

  function recalcProduction() {
    let metalProd = BASE_PRODUCTION.metals;
    let gasProd = BASE_PRODUCTION.gas;
    let crystalProd = BASE_PRODUCTION.crystal;
    let stardustProd = BASE_PRODUCTION.stardust;

    for (const lvl of buildings.metal) metalProd += BUILDING_PRODUCTION[lvl];
    for (const lvl of buildings.gas) gasProd += BUILDING_PRODUCTION[lvl];
    for (const lvl of buildings.crystal) crystalProd += BUILDING_PRODUCTION[lvl];
    for (const lvl of buildings.stardust) stardustProd += STARDUST_BUILDING_PRODUCTION[lvl];

    production = { metals: metalProd, gas: gasProd, crystal: crystalProd, stardust: stardustProd };
  }

  function getTotalBuildingCount() {
    return buildings.metal.length + buildings.gas.length + buildings.crystal.length + buildings.stardust.length;
  }

  function canAfford(cost) {
    return (cost.metals || 0) <= resources.metals &&
           (cost.gas || 0) <= resources.gas &&
           (cost.crystal || 0) <= resources.crystal;
  }

  function payCost(cost) {
    resources.metals -= (cost.metals || 0);
    resources.gas -= (cost.gas || 0);
    resources.crystal -= (cost.crystal || 0);
  }

  function tryUpgradeBuilding(type, buildingIndex) {
    const currentLevel = buildings[type][buildingIndex];
    const maxLevel = type === 'stardust' ? 3 : 7;
    if (currentLevel >= maxLevel) return false;

    const nextLevel = currentLevel + 1;
    const cost = BUILDING_COST_MAP[type][nextLevel];
    if (!canAfford(cost)) return false;

    payCost(cost);
    buildings[type][buildingIndex] = nextLevel;
    recalcProduction();

    const pts = type === 'stardust' ? STARDUST_UPGRADE_POINTS[nextLevel] : BUILDING_UPGRADE_POINTS[nextLevel];
    leaderboardPoints += pts;
    buildingUpgradePoints += pts;

    return true;
  }

  function tryBuildNew(type) {
    if (getTotalBuildingCount() >= BUILDING_SLOTS) return false;
    if (type === 'stardust' && buildings.stardust.length >= 1) return false;
    const cost = BUILDING_COST_MAP[type][1];
    if (!canAfford(cost)) return false;

    payCost(cost);
    buildings[type].push(1);
    recalcProduction();

    const pts = type === 'stardust' ? STARDUST_UPGRADE_POINTS[1] : BUILDING_UPGRADE_POINTS[1];
    leaderboardPoints += pts;
    buildingBuiltPoints += pts;
    return true;
  }

  // Trade: convert surplus resources to needed ones using current trade ratios.
  // Conversions use metal as the numeraire:
  //   metal->gas: 1 metal = metalToGas gas
  //   gas->metal: 1 gas = 1/metalToGas metal (inverse)
  // Returns { ok: false } if unaffordable, or { ok: true, description: string|null }
  // where description is a human-readable trade summary (null if no trade was needed).
  function tradeForUpgrade(type, targetLevel, hour) {
    const cost = BUILDING_COST_MAP[type][targetLevel];
    if (!cost) return { ok: false };

    const { metalToGas, metalToCrystal } = tradeRatios[hour];

    const needed = {
      metals: Math.max(0, (cost.metals || 0) - resources.metals),
      gas: Math.max(0, (cost.gas || 0) - resources.gas),
      crystal: Math.max(0, (cost.crystal || 0) - resources.crystal),
    };
    const totalNeeded = needed.metals + needed.gas + needed.crystal;
    if (totalNeeded === 0) return { ok: true, description: null };

    const surplus = {
      metals: Math.max(0, resources.metals - (cost.metals || 0)),
      gas: Math.max(0, resources.gas - (cost.gas || 0)),
      crystal: Math.max(0, resources.crystal - (cost.crystal || 0)),
    };

    // Convert to metal-equivalent using trade ratios
    const surplusMeq = surplus.metals
      + surplus.gas * (1 / metalToGas)
      + surplus.crystal * (1 / metalToCrystal);
    const neededMeq = needed.metals
      + needed.gas * (1 / metalToGas)
      + needed.crystal * (1 / metalToCrystal);

    if (surplusMeq < neededMeq) return { ok: false };

    // Build trade description before executing
    const ratio = neededMeq / surplusMeq;
    const soldParts = [];
    if (surplus.metals * ratio > 1) soldParts.push(`${fmtRes(surplus.metals * ratio)} metals`);
    if (surplus.gas    * ratio > 1) soldParts.push(`${fmtRes(surplus.gas    * ratio)} gas`);
    if (surplus.crystal * ratio > 1) soldParts.push(`${fmtRes(surplus.crystal * ratio)} crystal`);
    const boughtParts = [];
    if (needed.metals  > 1) boughtParts.push(`${fmtRes(needed.metals)}  metals`);
    if (needed.gas     > 1) boughtParts.push(`${fmtRes(needed.gas)}  gas`);
    if (needed.crystal > 1) boughtParts.push(`${fmtRes(needed.crystal)}  crystal`);
    const description = soldParts.length > 0 && boughtParts.length > 0
      ? `Trade: sell ${soldParts.join(' + ')} → buy ${boughtParts.join(' + ')}`
      : null;

    // Execute trade: deduct surplus proportionally, add exactly what's needed
    resources.metals  -= surplus.metals  * ratio;
    resources.gas     -= surplus.gas     * ratio;
    resources.crystal -= surplus.crystal * ratio;
    resources.metals  += needed.metals;
    resources.gas     += needed.gas;
    resources.crystal += needed.crystal;

    return { ok: true, description };
  }

  function fmtRes(n) {
    if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
    if (n >= 1e3) return `${Math.round(n / 1e3)}K`;
    return `${Math.round(n)}`;
  }

  function doMining(hour) {
    const miningActions = Math.floor(energy);
    if (miningActions <= 0) return;
    hourMiningActions = miningActions;

    const { metalToGas, metalToCrystal } = tradeRatios[hour];

    // MEQ reward per mine action for each resource (0.2% of daily production)
    const dailyFactor = 24 * MINING_REWARD_RATE;
    const meqPerMine = {
      metals: production.metals * dailyFactor,
      gas:    production.gas    * dailyFactor / metalToGas,
      crystal: production.crystal * dailyFactor / metalToCrystal,
    };

    // Pick resource with highest MEQ reward
    const bestResource = Object.entries(meqPerMine)
      .reduce((best, [res, val]) => val > best.val ? { res, val } : best,
              { res: 'metals', val: -Infinity }).res;

    const baseRewardPerMine = production[bestResource] * dailyFactor;
    let totalReward = 0;
    for (let i = 0; i < miningActions; i++) {
      const variance = 1 + (rand() * 2 - 1) * MINING_VARIANCE;
      const isJackpot = rand() < MINING_JACKPOT_CHANCE;
      let reward = baseRewardPerMine * variance;
      if (isJackpot) reward *= MINING_JACKPOT_MULTIPLIER;
      totalReward += reward;
    }

    resources[bestResource]          += totalReward;
    totalMiningRewards[bestResource] += totalReward;
    leaderboardPoints                += totalReward;
    miningPoints                     += totalReward;
    energy                           -= miningActions;

    if (bestResource === 'metals')       hourMiningMetals  += totalReward;
    else if (bestResource === 'gas')     hourMiningGas     += totalReward;
    else if (bestResource === 'crystal') hourMiningCrystal += totalReward;

    hourMiningResource = bestResource;
  }

  function snapshot(hour, action = '') {
    const { metalToGas, metalToCrystal } = tradeRatios[hour];
    timeline.push({
      hour,
      action,
      metals: Math.round(resources.metals * 10) / 10,
      gas: Math.round(resources.gas * 10) / 10,
      crystal: Math.round(resources.crystal * 10) / 10,
      stardust: Math.round(resources.stardust * 100) / 100,
      metalProd: production.metals,
      gasProd: production.gas,
      crystalProd: production.crystal,
      stardustProd: production.stardust,
      energy: Math.round(energy * 10) / 10,
      leaderboardPoints: Math.round(leaderboardPoints),
      productionPoints: Math.round(productionPoints),
      miningPoints: Math.round(miningPoints),
      stardustPoints: Math.round(stardustPoints),
      buildingBuiltPoints: Math.round(buildingBuiltPoints),
      buildingUpgradePoints: Math.round(buildingUpgradePoints),
      buildings: cloneBuildings(buildings),
      totalBuildingCount: getTotalBuildingCount(),
      metalToGas: Math.round(metalToGas * 1000) / 1000,
      metalToCrystal: Math.round(metalToCrystal * 1000) / 1000,
    });
  }

  // Decide whether to skip mining this hour to save energy for post-upgrade mining
  function shouldSaveEnergy(actions, res, prod) {
    if (!actions || actions.length === 0) return false;
    const action = actions[0];

    // Save energy only before utility building upgrades (any resource type)
    if (!['metal', 'gas', 'crystal'].includes(action.buildingType)) return false;
    const cost = BUILDING_COST_MAP[action.buildingType][action.targetLevel];
    if (!cost) return false;

    const totalRes = res.metals + res.gas + res.crystal;
    const totalCost = (cost.metals || 0) + (cost.gas || 0) + (cost.crystal || 0);

    // Can afford now — proceed with upgrade first, then mine at higher rate
    if (totalRes >= totalCost) return false;

    // How many hours until we can afford?
    const hourlyIncome = prod.metals + prod.gas + prod.crystal;
    const deficit = totalCost - totalRes;
    const hoursToAfford = Math.ceil(deficit / hourlyIncome);

    // Save energy if upgrade is within threshold (energy caps at 50, regen ~3.571/hr)
    return hoursToAfford <= saveEnergyThreshold;
  }

  // Try to trade (if needed) then build or upgrade a building. Returns true on success.
  function tradeAndBuildOrUpgrade(type, targetLevel, buildingIndex, hour) {
    const traded = tradeForUpgrade(type, targetLevel, hour);
    if (!traded.ok) return false;

    const isNewBuild = buildingIndex === undefined || buildingIndex >= (buildings[type]?.length ?? 0);

    if (isNewBuild) {
      const success = tryBuildNew(type);
      if (success) {
        if (traded.description) actionLog.push({ hour, action: traded.description });
        actionLog.push({ hour, action: `Build ${type} L1` });
        snapshot(hour, `Build ${type} L1`);
      }
      return success;
    }

    const success = tryUpgradeBuilding(type, buildingIndex);
    if (success) {
      const newLvl = buildings[type][buildingIndex];
      if (traded.description) actionLog.push({ hour, action: traded.description });
      actionLog.push({ hour, action: `Upgrade ${type}[${buildingIndex}] to L${newLvl}` });
      snapshot(hour, `Upgrade ${type}[${buildingIndex}] to L${newLvl}`);
    }
    return success;
  }

  function executeActions(actions, hour) {
    if (!actions) return;
    for (const action of actions) {
      if (action.type === 'build') {
        const success = tryBuildNew(action.buildingType);
        if (success) {
          actionLog.push({ hour, action: `Build ${action.buildingType} L1` });
          snapshot(hour, `Build ${action.buildingType} L1`);
        }
      } else if (action.type === 'upgrade') {
        const idx = action.buildingIndex;
        const success = tryUpgradeBuilding(action.buildingType, idx);
        if (success) {
          const newLvl = buildings[action.buildingType][idx];
          actionLog.push({ hour, action: `Upgrade ${action.buildingType}[${idx}] to L${newLvl}` });
          snapshot(hour, `Upgrade ${action.buildingType}[${idx}] to L${newLvl}`);
        }
      } else if (action.type === 'trade_and_upgrade') {
        tradeAndBuildOrUpgrade(action.buildingType, action.targetLevel, action.buildingIndex, hour);
      } else if (action.type === 'trade_and_build_stardust') {
        const traded = tradeForUpgrade('stardust', action.targetLevel, hour);
        if (traded.ok) {
          if (action.targetLevel === 1) {
            if (tryBuildNew('stardust')) {
              if (traded.description) actionLog.push({ hour, action: traded.description });
              actionLog.push({ hour, action: `Build Stardust L1` });
              snapshot(hour, `Build Stardust L1`);
            }
          } else {
            const idx = action.buildingIndex ?? 0;
            if (tryUpgradeBuilding('stardust', idx)) {
              if (traded.description) actionLog.push({ hour, action: traded.description });
              actionLog.push({ hour, action: `Upgrade Stardust to L${action.targetLevel}` });
              snapshot(hour, `Upgrade Stardust to L${action.targetLevel}`);
            }
          }
        }
      }
    }
  }

  // Initial snapshot
  snapshot(0, 'Season Start');

  // Execute strategy actions at hour 0 (before production starts)
  const initialActions = strategy(0, { ...resources }, cloneBuildings(buildings), production, getTotalBuildingCount());
  executeActions(initialActions, 0);

  // Simulate each hour
  for (let hour = 1; hour <= SEASON_HOURS; hour++) {
    hourMiningMetals = 0;
    hourMiningGas = 0;
    hourMiningCrystal = 0;
    hourMiningResource = null;
    hourMiningActions = 0;
    // 1. Produce resources
    resources.metals += production.metals;
    resources.gas += production.gas;
    resources.crystal += production.crystal;
    resources.stardust += production.stardust;

    totalResourcesProduced.metals += production.metals;
    totalResourcesProduced.gas += production.gas;
    totalResourcesProduced.crystal += production.crystal;
    totalResourcesProduced.stardust += production.stardust;

    // Award resource production points
    const hourlyResourcePts = production.metals + production.gas + production.crystal;
    const hourlyStardustPts = production.stardust * STARDUST_POINTS_PER_UNIT;
    leaderboardPoints += hourlyResourcePts + hourlyStardustPts;
    productionPoints += hourlyResourcePts;
    stardustPoints += hourlyStardustPts;

    // 2. Regenerate energy
    energy = Math.min(MAX_ENERGY, energy + ENERGY_PER_HOUR);

    // 3 & 4. Mining + Strategy (order depends on saveEnergyBeforeUpgrade mode)
    if (saveEnergyBeforeUpgrade) {
      // Strategy FIRST so upgrades happen before mining (higher production = better mining)
      const stratActions = strategy(hour, { ...resources }, cloneBuildings(buildings), production, getTotalBuildingCount());
      const shouldSkipMining = shouldSaveEnergy(stratActions, resources, production);
      executeActions(stratActions, hour);
      if (!shouldSkipMining) {
        doMining(hour);
      }
    } else {
      doMining(hour);
      const stratActions = strategy(hour, { ...resources }, cloneBuildings(buildings), production, getTotalBuildingCount());
      executeActions(stratActions, hour);
    }

    miningByHour.push({
      hour,
      resource: hourMiningResource, // null if no mining this hour
      actions:  hourMiningActions,
      metals:   Math.round(hourMiningMetals  * 10) / 10,
      gas:      Math.round(hourMiningGas     * 10) / 10,
      crystal:  Math.round(hourMiningCrystal * 10) / 10,
    });
    snapshot(hour);
  }

  return {
    timeline,
    actionLog,
    miningByHour,
    finalState: {
      resources: { ...resources },
      production: { ...production },
      buildings: cloneBuildings(buildings),
      leaderboardPoints: Math.round(leaderboardPoints),
      totalResourcesProduced,
      totalMiningRewards,
      totalStardust: Math.round(resources.stardust * 100) / 100,
    },
  };
}
