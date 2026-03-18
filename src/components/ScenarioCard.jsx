function formatNumber(val) {
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
  return val.toString();
}

import { getTier } from '../simulation/gameConstants';

export default function ScenarioCard({ scenario, isActive, result, maxPoints, maxStardust, maxSol, maxUsd, maxActions, starPrice, solPrice, onClick }) {
  const pts = result?.finalState?.leaderboardPoints;
  const sd = result?.finalState?.totalStardust;
  const pct = (pts && maxPoints) ? (pts / maxPoints) * 100 : 0;
  const sdPct = (sd && maxStardust) ? (sd / maxStardust) * 100 : 0;
  const tier = pts ? getTier(pts) : null;
  const sol = tier ? tier.sol : 0;
  const solPct = (sol && maxSol) ? (sol / maxSol) * 100 : 0;

  const starPriceNum = starPrice !== '' && !isNaN(Number(starPrice)) ? Number(starPrice) : 0;
  const solPriceNum = solPrice !== '' && !isNaN(Number(solPrice)) ? Number(solPrice) : 0;
  const totalUsd = pts ? (getTier(pts).sol * solPriceNum + (sd || 0) * starPriceNum) : 0;
  const usdPct = (totalUsd && maxUsd) ? (totalUsd / maxUsd) * 100 : 0;
  const showUsd = (starPriceNum > 0 || solPriceNum > 0) && result;

  return (
    <div
      className={`bg-[var(--color-surface)] rounded-xl p-4 cursor-pointer transition-all duration-200 shadow-[var(--shadow-card)] border-2 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-lg)] ${
        isActive
          ? 'border-[var(--accent-color)] shadow-[0_0_20px_rgba(45,212,191,0.15)]'
          : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
      }`}
      style={{ '--accent-color': scenario.color }}
      onClick={onClick}
    >
      <div className="h-24">
      <h3 className="text-[0.85rem] font-semibold mb-2 min-h-[2.4em] line-clamp-2" style={{ color: scenario.color }}>{scenario.name}</h3>
      </div>
      {result ? (
        <>
          {result.actionLog && (
            <>
              <div className="text-[1.4rem] font-bold mb-1" style={{ color: scenario.color }}>
                {result.actionLog.length} <span className="text-[0.75rem] font-semibold">actions</span>
              </div>
              <div className="h-1.5 bg-[var(--color-inset)] rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full transition-[width] duration-500 ease-in-out"
                  style={{ width: `${maxActions ? (result.actionLog.length / maxActions) * 100 : 0}%`, backgroundColor: scenario.color, opacity: 0.85 }}
                />
              </div>
            </>
          )}
          <div className="text-[1.4rem] font-bold mb-1" style={{ color: scenario.color }}>
            {formatNumber(pts)} pts
          </div>
          <div className="h-1.5 bg-[var(--color-inset)] rounded-full overflow-hidden mb-2">
            <div
              className="h-full rounded-full transition-[width] duration-500 ease-in-out"
              style={{ width: `${pct}%`, backgroundColor: scenario.color, opacity: 0.85 }}
            />
          </div>
          <div className="text-[1.4rem] font-bold mb-1" style={{ color: scenario.color }}>
            {sd.toFixed(1)} <span className="text-[0.75rem] font-semibold">STAR</span>
          </div>
          <div className="h-1.5 bg-[var(--color-inset)] rounded-full overflow-hidden mb-2">
            <div
              className="h-full rounded-full transition-[width] duration-500 ease-in-out"
              style={{ width: `${sdPct}%`, backgroundColor: scenario.color, opacity: 0.85 }}
            />
          </div>
          <div className="text-[1.4rem] font-bold mb-1" style={{ color: scenario.color }}>
            {sol} <span className="text-[0.75rem] font-semibold">SOL</span>
          </div>
          <div className="h-1.5 bg-[var(--color-inset)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-500 ease-in-out"
              style={{ width: `${solPct}%`, backgroundColor: scenario.color, opacity: 0.85 }}
            />
          </div>
          {showUsd && (
            <>
              <div className="text-[1.4rem] font-bold mt-2 mb-1" style={{ color: scenario.color }}>
                ${totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[0.75rem] font-semibold">USD</span>
              </div>
              <div className="h-1.5 bg-[var(--color-inset)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-500 ease-in-out"
                  style={{ width: `${usdPct}%`, backgroundColor: scenario.color, opacity: 0.85 }}
                />
              </div>
            </>
          )}
          {tier && (
            <div className="mt-3 flex justify-end">
              <span className={`${tier.cls} inline-block px-2.5 py-0.5 rounded-full text-xs font-bold`}>{tier.name}</span>
            </div>
          )}
        </>
      ) : (
        <div className="text-xs text-[var(--color-muted)]">Add actions to start</div>
      )}
    </div>
  );
}
