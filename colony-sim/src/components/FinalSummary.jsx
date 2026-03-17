function formatNumber(val) {
  if (val >= 1000000) return `${(val / 1000000).toFixed(2)}M`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
  return val.toFixed(1);
}

function getTier(points) {
  if (points >= 15000000) return { name: 'Explorer', cls: 'tier-explorer', pct: 'Top 1%' };
  if (points >= 10000000) return { name: 'Diamond', cls: 'tier-diamond', pct: 'Top 5%' };
  if (points >= 7000000) return { name: 'Platinum', cls: 'tier-platinum', pct: 'Top 10%' };
  if (points >= 4000000) return { name: 'Gold', cls: 'tier-gold', pct: 'Top 30%' };
  if (points >= 2500000) return { name: 'Silver', cls: 'tier-silver', pct: 'Top 50%' };
  return { name: 'Bronze', cls: 'tier-bronze', pct: 'Top 70%' };
}

export default function FinalSummary({ result, scenario }) {
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
      </div>
      <div className={cardBase}>
        <div className="text-xs text-[var(--color-muted)] uppercase tracking-wide mb-1">Stardust Earned</div>
        <div className="text-2xl font-bold text-violet-500">
          {finalState.totalStardust.toFixed(1)}
        </div>
        <div className="text-xs text-[var(--color-faint)] mt-0.5">+{(finalState.totalStardust * 5000).toFixed(0)} LP from stardust</div>
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
          SD: {finalState.production.stardust}/hr | Buildings: {finalState.buildings.metal.length + finalState.buildings.gas.length + finalState.buildings.crystal.length + finalState.buildings.stardust.length}/9
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
