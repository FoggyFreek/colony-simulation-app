import stardustIcon from '../assets/stardust.png';
import { getTier } from '../simulation/gameConstants';

function formatNumber(val) {
  if (val >= 1000000) return `${(val / 1000000).toFixed(2)}M`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
  return val.toFixed(1);
}


export default function FinalSummary({ result, scenario, starPrice, solPrice, sleepPenalty }) {
  const { finalState } = result;
  const tier = getTier(finalState.leaderboardPoints);
  const buildingSummary = Object.entries(finalState.buildings)
    .filter(([, arr]) => arr.length > 0)
    .map(([type, arr]) => `${type}: ${arr.map(l => `L${l}`).join(', ')}`)
    .join(' | ');

  const cardBase = "bg-[var(--color-surface)] rounded-[10px] p-4 border border-[var(--color-border)] shadow-[var(--shadow-card)]";

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3 mb-6">
      <div className={cardBase}>
        <div className="text-xs text-[var(--color-muted)] uppercase tracking-wide mb-1">Leaderboard Points</div>
        <div className="text-2xl font-bold" style={{ color: scenario.color }}>
          {formatNumber(finalState.leaderboardPoints)}
          <span className={`${tier.cls} inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ml-2`}>{tier.name}</span>
        </div>
        <div className="text-xs text-[var(--color-faint)] mt-0.5">{tier.pct}</div>
        {sleepPenalty != null && sleepPenalty !== 0 && (
          <div className={`text-xs font-semibold mt-1 ${sleepPenalty < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
            {sleepPenalty < 0 ? '' : '+'}{formatNumber(sleepPenalty)} LP from sleep ({((sleepPenalty / (finalState.leaderboardPoints - sleepPenalty)) * 100).toFixed(1)}%)
          </div>
        )}
      </div>
      <div className={cardBase}>
        <div className="text-xs text-[var(--color-muted)] uppercase tracking-wide mb-1">Stardust Earned</div>
        <div className="text-2xl font-bold text-violet-500">
          {finalState.totalStardust.toFixed(1)}
        </div>
        <div className="text-xs text-[var(--color-faint)] mt-0.5">+{(finalState.totalStardust * 5000).toFixed(0)} LP from stardust</div>
        {starPrice !== '' && !isNaN(Number(starPrice)) && Number(starPrice) > 0 && (
          <div className="text-xs text-emerald-500 font-semibold mt-1">
            ≈ ${(finalState.totalStardust * Number(starPrice)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
          </div>
        )}
      </div>
      <div className={cardBase}>
        <div className="text-xs text-[var(--color-muted)] uppercase tracking-wide mb-1">SOL Reward</div>
        <div className="text-2xl font-bold text-[#9945FF]">
          {tier.sol} SOL
        </div>
        <div className="text-xs text-[var(--color-faint)] mt-0.5">{tier.name} tier payout</div>
        {solPrice !== '' && !isNaN(Number(solPrice)) && Number(solPrice) > 0 && (
          <div className="text-xs text-emerald-500 font-semibold mt-1">
            ≈ ${(tier.sol * Number(solPrice)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
          </div>
        )}
      </div>
      <div className={cardBase}>
        <div className="text-xs text-[var(--color-muted)] uppercase tracking-wide mb-1">Final Resources</div>
        <div className="text-base font-bold text-amber-500">
          M: {formatNumber(finalState.resources.metals)}
        </div>
        <div className="text-xs text-[var(--color-faint)] mt-0.5">
          G: {formatNumber(finalState.resources.gas)} | C: {formatNumber(finalState.resources.crystal)}
        </div>
      </div>
      <div className={cardBase}>
        <div className="text-xs text-[var(--color-muted)] uppercase tracking-wide mb-1">Final Production</div>
        <div className="text-base font-bold">
          {formatNumber(finalState.production.metals)}/hr
        </div>
        <div className="text-xs text-[var(--color-faint)] mt-0.5">
          <img src={stardustIcon} alt="Stardust" className="w-3 h-3 inline-block mr-0.5" />{finalState.production.stardust}/hr | Buildings: {finalState.buildings.metal.length + finalState.buildings.gas.length + finalState.buildings.crystal.length + finalState.buildings.stardust.length}/9
        </div>
      </div>
      <div className={`${cardBase} col-span-full`}>
        <div className="text-xs text-[var(--color-muted)] uppercase tracking-wide mb-1">Buildings</div>
        <div className="text-sm font-bold">
          {buildingSummary || 'None'}
        </div>
      </div>
    </div>
  );
}
