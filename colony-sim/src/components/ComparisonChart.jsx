function formatNumber(val) {
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
  return val.toString();
}

export default function ComparisonChart({ results, scenarios }) {
  const maxPoints = Math.max(...scenarios.map(s => results[s.id].finalState.leaderboardPoints));

  return (
    <div className="flex gap-4 items-end h-[200px] px-5">
      {scenarios.map(s => {
        const pts = results[s.id].finalState.leaderboardPoints;
        const pct = (pts / maxPoints) * 100;
        const sd = results[s.id].finalState.totalStardust;
        return (
          <div key={s.id} className="flex-1 flex flex-col items-center h-full justify-end">
            <div
              className="w-full max-w-[120px] rounded-t-lg transition-[height] duration-500 ease-in-out relative"
              style={{
                height: `${pct}%`,
                backgroundColor: s.color,
                opacity: 0.85,
              }}
            >
              <span
                className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold whitespace-nowrap"
                style={{ color: s.color }}
              >
                {formatNumber(pts)}
              </span>
            </div>
            <div className="text-[0.7rem] text-[var(--color-muted)] text-center mt-2 max-w-[120px]">
              {s.name.replace(/Scenario \d: /, '')}
              <br />
              <span className="text-violet-500">{sd.toFixed(1)} SD</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
