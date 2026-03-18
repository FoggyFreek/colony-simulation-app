/**
 * Temporary strategy comparison for evaluating Scenario 5 (Max USD Value).
 * Runs all current strategies + alternative build orders across multiple seeds.
 * STAR=$0.092, SOL=$95.
 *
 * Run: npx vitest run src/simulation/strategy_comparison.test.js
 */
import { describe, it } from 'vitest';
import { simulate } from './engine';
import {
  strategyMaxMetal, strategyBalanced, strategyMaxStardust,
  strategyOptimal, strategyMaxUSD,
} from './strategies';
import { getTier } from './gameConstants';

const STAR_PRICE = 0.092;
const SOL_PRICE = 95;
const SEEDS = Array.from({ length: 50 }, (_, i) => i + 1);

function calcUSD(result) {
  const tier = getTier(result.finalState.leaderboardPoints);
  const stardustUSD = result.finalState.totalStardust * STAR_PRICE;
  const solUSD = tier.sol * SOL_PRICE;
  return { total: stardustUSD + solUSD, stardustUSD, solUSD, tier: tier.name, lp: result.finalState.leaderboardPoints, stardust: result.finalState.totalStardust };
}

// --- Alternative strategies ---

// Alt A: Metal L3 → SD L1 → Metal L5 → SD L2 → Metal L7 → 2nd metal L7 → 3rd metal → SD L3 → fill
function altA_earlyStardust(hour, resources, buildings, production, totalBuildings) {
  const m = buildings.metal, sd = buildings.stardust;
  if (m.length === 0) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  if (m[0] < 3) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 0, targetLevel: m[0] + 1 }];
  if (sd.length === 0 && totalBuildings < 9) return [{ type: 'trade_and_build_stardust', targetLevel: 1 }];
  if (m[0] < 5) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 0, targetLevel: m[0] + 1 }];
  if (sd.length > 0 && sd[0] < 2) return [{ type: 'trade_and_build_stardust', targetLevel: 2, buildingIndex: 0 }];
  if (m[0] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 0, targetLevel: m[0] + 1 }];
  if (m.length < 2 && totalBuildings < 9) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  if (m.length >= 2 && m[1] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 1, targetLevel: m[1] + 1 }];
  if (m.length < 3 && totalBuildings < 9) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  if (m.length >= 3 && m[2] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 2, targetLevel: m[2] + 1 }];
  if (sd.length > 0 && sd[0] < 3) return [{ type: 'trade_and_build_stardust', targetLevel: sd[0] + 1, buildingIndex: 0 }];
  if (totalBuildings < 9) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  for (let i = 0; i < m.length; i++) if (m[i] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: i, targetLevel: m[i] + 1 }];
  return [];
}

// Alt B: Metal L3 → SD L1 → Metal L5 → SD L2 → Metal L7 → 2nd metal L3 → SD L3 → 2nd metal L7 → fill
function altB_earlySD3(hour, resources, buildings, production, totalBuildings) {
  const m = buildings.metal, sd = buildings.stardust;
  if (m.length === 0) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  if (m[0] < 3) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 0, targetLevel: m[0] + 1 }];
  if (sd.length === 0 && totalBuildings < 9) return [{ type: 'trade_and_build_stardust', targetLevel: 1 }];
  if (m[0] < 5) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 0, targetLevel: m[0] + 1 }];
  if (sd.length > 0 && sd[0] < 2) return [{ type: 'trade_and_build_stardust', targetLevel: 2, buildingIndex: 0 }];
  if (m[0] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 0, targetLevel: m[0] + 1 }];
  if (m.length < 2 && totalBuildings < 9) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  if (m.length >= 2 && m[1] < 3) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 1, targetLevel: m[1] + 1 }];
  if (sd.length > 0 && sd[0] < 3) return [{ type: 'trade_and_build_stardust', targetLevel: sd[0] + 1, buildingIndex: 0 }];
  if (m.length >= 2 && m[1] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 1, targetLevel: m[1] + 1 }];
  if (m.length < 3 && totalBuildings < 9) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  if (m.length >= 3 && m[2] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 2, targetLevel: m[2] + 1 }];
  if (totalBuildings < 9) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  for (let i = 0; i < m.length; i++) if (m[i] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: i, targetLevel: m[i] + 1 }];
  return [];
}

// Alt C: Metal L3 → SD L1 → Metal L5 → SD L2 → Metal L7 → 2nd metal L5 → SD L3 → 2nd metal L7 → fill
function altC_optimalPlusSD(hour, resources, buildings, production, totalBuildings) {
  const m = buildings.metal, sd = buildings.stardust;
  if (m.length === 0) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  if (m[0] < 3) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 0, targetLevel: m[0] + 1 }];
  if (sd.length === 0 && totalBuildings < 9) return [{ type: 'trade_and_build_stardust', targetLevel: 1 }];
  if (m[0] < 5) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 0, targetLevel: m[0] + 1 }];
  if (sd.length > 0 && sd[0] < 2) return [{ type: 'trade_and_build_stardust', targetLevel: 2, buildingIndex: 0 }];
  if (m[0] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 0, targetLevel: m[0] + 1 }];
  if (m.length < 2 && totalBuildings < 9) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  if (m.length >= 2 && m[1] < 5) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 1, targetLevel: m[1] + 1 }];
  if (sd.length > 0 && sd[0] < 3) return [{ type: 'trade_and_build_stardust', targetLevel: sd[0] + 1, buildingIndex: 0 }];
  if (m.length >= 2 && m[1] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 1, targetLevel: m[1] + 1 }];
  if (m.length < 3 && totalBuildings < 9) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  if (m.length >= 3 && m[2] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 2, targetLevel: m[2] + 1 }];
  if (totalBuildings < 9) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  for (let i = 0; i < m.length; i++) if (m[i] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: i, targetLevel: m[i] + 1 }];
  return [];
}

// Alt D: Pure Explorer — no stardust, all metal
function altD_pureExplorer(hour, resources, buildings, production, totalBuildings) {
  const m = buildings.metal;
  if (m.length === 0) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  if (m[0] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 0, targetLevel: m[0] + 1 }];
  if (m.length < 2 && totalBuildings < 9) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  if (m.length >= 2 && m[1] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 1, targetLevel: m[1] + 1 }];
  if (m.length < 3 && totalBuildings < 9) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  if (m.length >= 3 && m[2] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 2, targetLevel: m[2] + 1 }];
  if (totalBuildings < 9) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  for (let i = 0; i < m.length; i++) if (m[i] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: i, targetLevel: m[i] + 1 }];
  return [];
}

// Alt E: Metal L3 → SD L1 → Metal L7 → SD L2 → 2nd metal L4 → SD L3 → 2nd metal L7 → fill
function altE_sdRushWithEconomy(hour, resources, buildings, production, totalBuildings) {
  const m = buildings.metal, sd = buildings.stardust;
  if (m.length === 0) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  if (m[0] < 3) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 0, targetLevel: m[0] + 1 }];
  if (sd.length === 0 && totalBuildings < 9) return [{ type: 'trade_and_build_stardust', targetLevel: 1 }];
  if (m[0] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 0, targetLevel: m[0] + 1 }];
  if (sd.length > 0 && sd[0] < 2) return [{ type: 'trade_and_build_stardust', targetLevel: 2, buildingIndex: 0 }];
  if (m.length < 2 && totalBuildings < 9) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  if (m.length >= 2 && m[1] < 4) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 1, targetLevel: m[1] + 1 }];
  if (sd.length > 0 && sd[0] < 3) return [{ type: 'trade_and_build_stardust', targetLevel: sd[0] + 1, buildingIndex: 0 }];
  if (m.length >= 2 && m[1] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 1, targetLevel: m[1] + 1 }];
  if (m.length < 3 && totalBuildings < 9) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  if (m.length >= 3 && m[2] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 2, targetLevel: m[2] + 1 }];
  if (totalBuildings < 9) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  for (let i = 0; i < m.length; i++) if (m[i] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: i, targetLevel: m[i] + 1 }];
  return [];
}

// Alt F: Metal L5 → SD L1 → Metal L7 → 2nd metal L3 → SD L2 → 2nd metal L7 → SD L3 → fill
function altF_sdAfterL5(hour, resources, buildings, production, totalBuildings) {
  const m = buildings.metal, sd = buildings.stardust;
  if (m.length === 0) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  if (m[0] < 5) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 0, targetLevel: m[0] + 1 }];
  if (sd.length === 0 && totalBuildings < 9) return [{ type: 'trade_and_build_stardust', targetLevel: 1 }];
  if (m[0] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 0, targetLevel: m[0] + 1 }];
  if (m.length < 2 && totalBuildings < 9) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  if (m.length >= 2 && m[1] < 3) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 1, targetLevel: m[1] + 1 }];
  if (sd.length > 0 && sd[0] < 2) return [{ type: 'trade_and_build_stardust', targetLevel: 2, buildingIndex: 0 }];
  if (m.length >= 2 && m[1] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 1, targetLevel: m[1] + 1 }];
  if (sd.length > 0 && sd[0] < 3) return [{ type: 'trade_and_build_stardust', targetLevel: sd[0] + 1, buildingIndex: 0 }];
  if (m.length < 3 && totalBuildings < 9) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  if (m.length >= 3 && m[2] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 2, targetLevel: m[2] + 1 }];
  if (totalBuildings < 9) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  for (let i = 0; i < m.length; i++) if (m[i] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: i, targetLevel: m[i] + 1 }];
  return [];
}

// Alt G: Metal L3 → SD L1 → Metal L7 → 2nd metal L7 → SD L2 → 3rd metal L7 → SD L3 → fill
function altG_lateSD(hour, resources, buildings, production, totalBuildings) {
  const m = buildings.metal, sd = buildings.stardust;
  if (m.length === 0) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  if (m[0] < 3) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 0, targetLevel: m[0] + 1 }];
  if (sd.length === 0 && totalBuildings < 9) return [{ type: 'trade_and_build_stardust', targetLevel: 1 }];
  if (m[0] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 0, targetLevel: m[0] + 1 }];
  if (m.length < 2 && totalBuildings < 9) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  if (m.length >= 2 && m[1] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 1, targetLevel: m[1] + 1 }];
  if (sd.length > 0 && sd[0] < 2) return [{ type: 'trade_and_build_stardust', targetLevel: 2, buildingIndex: 0 }];
  if (m.length < 3 && totalBuildings < 9) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  if (m.length >= 3 && m[2] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 2, targetLevel: m[2] + 1 }];
  if (sd.length > 0 && sd[0] < 3) return [{ type: 'trade_and_build_stardust', targetLevel: sd[0] + 1, buildingIndex: 0 }];
  if (totalBuildings < 9) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  for (let i = 0; i < m.length; i++) if (m[i] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: i, targetLevel: m[i] + 1 }];
  return [];
}

// Alt H: S1 build order but squeeze SD L1 after 3rd metal is done (late SD L1 only)
// M7 → 2M7 → 3M7 → SD1 → 4M7 → 5M...
function altH_explorerPlusSD1(hour, resources, buildings, production, totalBuildings) {
  const m = buildings.metal, sd = buildings.stardust;
  // Rush first 3 metals to L7 (same as S1)
  if (m.length === 0) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  if (m[0] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 0, targetLevel: m[0] + 1 }];
  if (m.length < 2 && totalBuildings < 9) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  if (m.length >= 2 && m[1] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 1, targetLevel: m[1] + 1 }];
  if (m.length < 3 && totalBuildings < 9) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  if (m.length >= 3 && m[2] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 2, targetLevel: m[2] + 1 }];
  // After 3 metals at L7, build SD L1
  if (sd.length === 0 && totalBuildings < 9) return [{ type: 'trade_and_build_stardust', targetLevel: 1 }];
  // Continue filling metal
  if (totalBuildings < 9) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  for (let i = 0; i < m.length; i++) if (m[i] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: i, targetLevel: m[i] + 1 }];
  // SD L2 only after all metal is done
  if (sd.length > 0 && sd[0] < 3) return [{ type: 'trade_and_build_stardust', targetLevel: sd[0] + 1, buildingIndex: 0 }];
  return [];
}

// Alt I: S1 but SD L1 after 2nd metal L7 (earlier stardust, still aiming Explorer)
function altI_explorerEarlySD1(hour, resources, buildings, production, totalBuildings) {
  const m = buildings.metal, sd = buildings.stardust;
  if (m.length === 0) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  if (m[0] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 0, targetLevel: m[0] + 1 }];
  if (m.length < 2 && totalBuildings < 9) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  if (m.length >= 2 && m[1] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 1, targetLevel: m[1] + 1 }];
  // SD L1 after 2nd metal L7
  if (sd.length === 0 && totalBuildings < 9) return [{ type: 'trade_and_build_stardust', targetLevel: 1 }];
  // 3rd metal to L7
  if (m.length < 3 && totalBuildings < 9) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  if (m.length >= 3 && m[2] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 2, targetLevel: m[2] + 1 }];
  // Fill remaining metal
  if (totalBuildings < 9) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  for (let i = 0; i < m.length; i++) if (m[i] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: i, targetLevel: m[i] + 1 }];
  if (sd.length > 0 && sd[0] < 3) return [{ type: 'trade_and_build_stardust', targetLevel: sd[0] + 1, buildingIndex: 0 }];
  return [];
}

// Alt J: S1 but SD L1 after 1st metal L7, then continue metal rush (earliest possible SD with Explorer target)
function altJ_explorerVeryEarlySD1(hour, resources, buildings, production, totalBuildings) {
  const m = buildings.metal, sd = buildings.stardust;
  if (m.length === 0) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  if (m[0] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 0, targetLevel: m[0] + 1 }];
  // SD L1 right after first metal L7
  if (sd.length === 0 && totalBuildings < 9) return [{ type: 'trade_and_build_stardust', targetLevel: 1 }];
  // 2nd metal to L7
  if (m.length < 2 && totalBuildings < 9) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  if (m.length >= 2 && m[1] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 1, targetLevel: m[1] + 1 }];
  // 3rd metal to L7
  if (m.length < 3 && totalBuildings < 9) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  if (m.length >= 3 && m[2] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 2, targetLevel: m[2] + 1 }];
  // Fill remaining metal
  if (totalBuildings < 9) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  for (let i = 0; i < m.length; i++) if (m[i] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: i, targetLevel: m[i] + 1 }];
  if (sd.length > 0 && sd[0] < 3) return [{ type: 'trade_and_build_stardust', targetLevel: sd[0] + 1, buildingIndex: 0 }];
  return [];
}

// Alt K: S1 but SD L1 after 1st metal L7, SD L2 after 2nd metal L7, then continue
function altK_explorerSD2(hour, resources, buildings, production, totalBuildings) {
  const m = buildings.metal, sd = buildings.stardust;
  if (m.length === 0) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  if (m[0] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 0, targetLevel: m[0] + 1 }];
  if (sd.length === 0 && totalBuildings < 9) return [{ type: 'trade_and_build_stardust', targetLevel: 1 }];
  if (m.length < 2 && totalBuildings < 9) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  if (m.length >= 2 && m[1] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 1, targetLevel: m[1] + 1 }];
  // SD L2 after 2nd metal L7
  if (sd.length > 0 && sd[0] < 2) return [{ type: 'trade_and_build_stardust', targetLevel: 2, buildingIndex: 0 }];
  if (m.length < 3 && totalBuildings < 9) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  if (m.length >= 3 && m[2] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: 2, targetLevel: m[2] + 1 }];
  if (totalBuildings < 9) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  for (let i = 0; i < m.length; i++) if (m[i] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: i, targetLevel: m[i] + 1 }];
  if (sd.length > 0 && sd[0] < 3) return [{ type: 'trade_and_build_stardust', targetLevel: sd[0] + 1, buildingIndex: 0 }];
  return [];
}

// --- Run comparison ---
describe('Strategy USD Comparison', () => {
  it('compare all strategies across 50 seeds', () => {
    const strategies = [
      { name: 'S1: Max Metal',                     fn: strategyMaxMetal },
      { name: 'S2: Balanced',                      fn: strategyBalanced },
      { name: 'S3: Max Stardust',                  fn: strategyMaxStardust },
      { name: 'S4: Optimal',                       fn: strategyOptimal },
      { name: 'S5: Max USD (current)',              fn: strategyMaxUSD },
      { name: 'Alt A: M3→SD1→M5→SD2→M7→fill',     fn: altA_earlyStardust },
      { name: 'Alt B: M3→SD1→M5→SD2→M7→2M3→SD3',  fn: altB_earlySD3 },
      { name: 'Alt C: M3→SD1→M5→SD2→M7→2M5→SD3',  fn: altC_optimalPlusSD },
      { name: 'Alt D: Pure Explorer (no SD)',       fn: altD_pureExplorer },
      { name: 'Alt E: M3→SD1→M7→SD2→2M4→SD3→fill', fn: altE_sdRushWithEconomy },
      { name: 'Alt F: M5→SD1→M7→2M3→SD2→2M7→SD3', fn: altF_sdAfterL5 },
      { name: 'Alt G: M3→SD1→M7→2M7→SD2→3M7→SD3', fn: altG_lateSD },
      { name: 'Alt H: 3×M7→SD1→fill metal→SD2+',  fn: altH_explorerPlusSD1 },
      { name: 'Alt I: 2×M7→SD1→3M7→fill metal',   fn: altI_explorerEarlySD1 },
      { name: 'Alt J: M7→SD1→2M7→3M7→fill metal',  fn: altJ_explorerVeryEarlySD1 },
      { name: 'Alt K: M7→SD1→2M7→SD2→3M7→fill',    fn: altK_explorerSD2 },
    ];

    const results = [];

    for (const strat of strategies) {
      const seedResults = SEEDS.map(seed => {
        const result = simulate(strat.fn, seed);
        return calcUSD(result);
      });

      const avgUSD = seedResults.reduce((s, r) => s + r.total, 0) / seedResults.length;
      const avgStardustUSD = seedResults.reduce((s, r) => s + r.stardustUSD, 0) / seedResults.length;
      const avgSolUSD = seedResults.reduce((s, r) => s + r.solUSD, 0) / seedResults.length;
      const avgLP = seedResults.reduce((s, r) => s + r.lp, 0) / seedResults.length;
      const avgSD = seedResults.reduce((s, r) => s + r.stardust, 0) / seedResults.length;
      const minUSD = Math.min(...seedResults.map(r => r.total));
      const maxUSD = Math.max(...seedResults.map(r => r.total));

      const tierCounts = {};
      for (const r of seedResults) tierCounts[r.tier] = (tierCounts[r.tier] || 0) + 1;
      const tierStr = Object.entries(tierCounts).map(([t, c]) => `${t}:${c}`).join(' ');

      results.push({ name: strat.name, avgUSD, avgStardustUSD, avgSolUSD, avgLP, avgSD, minUSD, maxUSD, tierStr });
    }

    results.sort((a, b) => b.avgUSD - a.avgUSD);

    console.log(`\nStrategy Comparison — STAR=$${STAR_PRICE}, SOL=$${SOL_PRICE}, Seeds: 1-${SEEDS.length}\n`);
    console.log(
      'Rank'.padEnd(5) +
      'Strategy'.padEnd(45) +
      'Avg$'.padStart(9) +
      'SD$'.padStart(9) +
      'SOL$'.padStart(9) +
      'AvgLP'.padStart(10) +
      'AvgSD'.padStart(8) +
      'Min$'.padStart(9) +
      'Max$'.padStart(9) +
      '  Tiers'
    );
    console.log('-'.repeat(115));

    results.forEach((r, i) => {
      console.log(
        `#${i + 1}`.padEnd(5) +
        r.name.padEnd(45) +
        `$${r.avgUSD.toFixed(2)}`.padStart(9) +
        `$${r.avgStardustUSD.toFixed(2)}`.padStart(9) +
        `$${r.avgSolUSD.toFixed(2)}`.padStart(9) +
        `${(r.avgLP / 1e6).toFixed(2)}M`.padStart(10) +
        r.avgSD.toFixed(1).padStart(8) +
        `$${r.minUSD.toFixed(2)}`.padStart(9) +
        `$${r.maxUSD.toFixed(2)}`.padStart(9) +
        `  ${r.tierStr}`
      );
    });

    // Detailed for top 3
    console.log('\n--- Top 3 detail (seed 42) ---\n');
    for (const r of results.slice(0, 3)) {
      const strat = strategies.find(s => s.name === r.name);
      const result = simulate(strat.fn, 42);
      const usd = calcUSD(result);
      const fs = result.finalState;
      const buildStr = Object.entries(fs.buildings)
        .filter(([, arr]) => arr.length > 0)
        .map(([type, arr]) => `${type}: ${arr.map(l => `L${l}`).join(', ')}`)
        .join(' | ');

      const sdBuild = result.actionLog.find(a => a.action.includes('Stardust'));
      console.log(`${r.name}`);
      console.log(`  USD: $${usd.total.toFixed(2)} (SD:$${usd.stardustUSD.toFixed(2)} + SOL:$${usd.solUSD.toFixed(2)}) | LP:${(usd.lp/1e6).toFixed(2)}M ${usd.tier} | SD:${usd.stardust.toFixed(1)}`);
      console.log(`  Buildings: ${buildStr}`);
      console.log(`  First SD: ${sdBuild ? `h${sdBuild.hour} ${sdBuild.action}` : 'never'}`);
      console.log(`  Build order:`);
      result.actionLog.forEach(a => console.log(`    h${String(a.hour).padStart(3)}: ${a.action}`));
      console.log();
    }
  });
});
