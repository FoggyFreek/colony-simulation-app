function formatNumber(val) {
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
  return val.toString();
}

export default function ScenarioSelector({ scenarios, active, onSelect, results }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
      {scenarios.map(s => {
        const result = results[s.id];
        const pts = result?.finalState?.leaderboardPoints;
        const sd = result?.finalState?.totalStardust;
        const isActive = active === s.id;
        return (
          <div
            key={s.id}
            className={`bg-[var(--color-surface)] rounded-xl p-4 cursor-pointer transition-all duration-200 shadow-[var(--shadow-card)] border-2 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-lg)] ${
              isActive
                ? 'border-[var(--accent-color)] shadow-[0_0_20px_rgba(45,212,191,0.15)]'
                : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
            }`}
            style={{ '--accent-color': s.color }}
            onClick={() => onSelect(s.id)}
          >
            <h3 className="text-[0.85rem] font-semibold mb-2" style={{ color: s.color }}>{s.name}</h3>
            {result ? (
              <>
                <div className="text-[1.4rem] font-bold mb-1" style={{ color: s.color }}>
                  {formatNumber(pts)} pts
                </div>
                <div className="text-xs text-[var(--color-muted)]">
                  {sd.toFixed(1)} Stardust
                </div>
              </>
            ) : (
              <div className="text-xs text-[var(--color-muted)]">Add actions to start</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
