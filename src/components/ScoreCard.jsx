const CARD = "bg-[var(--color-surface)] rounded-xl p-5 border border-[var(--color-border)] shadow-[var(--shadow-card)]";

const resourceRows = [
  { label: 'Metals / Gas / Crystal', points: '1 pt per resource' },
  { label: 'Stardust', points: '3,000 pts per resource' },
];

const utilityRows = [
  { level: 1, points: '20,000' },
  { level: 2, points: '50,000' },
  { level: 3, points: '100,000' },
  { level: 4, points: '200,000' },
  { level: 5, points: '300,000' },
  { level: 6, points: '500,000' },
  { level: 7, points: '800,000' },
];

const stardustRows = [
  { level: 1, points: '50,000' },
  { level: 2, points: '100,000' },
  { level: 3, points: '300,000' },
];

const tierRows = [
  { tier: 'Explorer', pct: 'Top 1%', mult: '8×', cls: 'tier-explorer' },
  { tier: 'Diamond', pct: 'Top 5%', mult: '3×', cls: 'tier-diamond' },
  { tier: 'Platinum', pct: 'Top 10%', mult: '1.6×', cls: 'tier-platinum' },
  { tier: 'Gold', pct: 'Top 30%', mult: '1.2×', cls: 'tier-gold' },
  { tier: 'Silver', pct: 'Top 50%', mult: '0.6×', cls: 'tier-silver' },
  { tier: 'Bronze', pct: 'Top 70%', mult: '0.3×', cls: 'tier-bronze' },
];

function MiniTable({ headers, children }) {
  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr>
          {headers.map(h => (
            <th key={h} className="text-left text-[var(--color-muted)] font-medium pb-1.5 px-1">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

function Cell({ children, className = '' }) {
  return <td className={`px-1 py-[3px] text-[var(--color-text)] ${className}`}>{children}</td>;
}

export default function ScoreCard() {
  return (
    <div className={`${CARD} mb-6`}>
      <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">Leaderboard Scoring Reference</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {/* Resource Production */}
        <div>
          <div className="text-xs font-medium text-[var(--color-muted)] mb-2">Resource Production</div>
          <MiniTable headers={['Resource', 'Points']}>
            {resourceRows.map(r => (
              <tr key={r.label}>
                <Cell>{r.label}</Cell>
                <Cell className="font-mono text-[var(--color-accent)]">{r.points}</Cell>
              </tr>
            ))}
          </MiniTable>
          <p className="text-[10px] text-[var(--color-faint)] mt-1.5 px-1">Awarded every hour based on production rate</p>
        </div>

        {/* Utility Building Upgrades */}
        <div>
          <div className="text-xs font-medium text-[var(--color-muted)] mb-2">Utility Buildings</div>
          <MiniTable headers={['Level', 'Points']}>
            {utilityRows.map(r => (
              <tr key={r.level}>
                <Cell>L{r.level}</Cell>
                <Cell className="font-mono text-[var(--color-accent)]">{r.points}</Cell>
              </tr>
            ))}
          </MiniTable>
        </div>

        {/* Stardust Building */}
        <div>
          <div className="text-xs font-medium text-[var(--color-muted)] mb-2">Stardust Building</div>
          <MiniTable headers={['Level', 'Points']}>
            {stardustRows.map(r => (
              <tr key={r.level}>
                <Cell>L{r.level}</Cell>
                <Cell className="font-mono text-[var(--color-accent)]">{r.points}</Cell>
              </tr>
            ))}
          </MiniTable>
          <p className="text-[10px] text-[var(--color-faint)] mt-1.5 px-1">Building + upgrade points are awarded immediately</p>
        </div>

        {/* Tier Rewards */}
        <div>
          <div className="text-xs font-medium text-[var(--color-muted)] mb-2">Tier Rewards</div>
          <MiniTable headers={['Tier', 'Percentile', 'Reward']}>
            {tierRows.map(r => (
              <tr key={r.tier}>
                <Cell><span className={`${r.cls} text-[10px] px-1.5 py-0.5 rounded font-medium`}>{r.tier}</span></Cell>
                <Cell>{r.pct}</Cell>
                <Cell className="font-mono text-[var(--color-accent)]">{r.mult}</Cell>
              </tr>
            ))}
          </MiniTable>
          <p className="text-[10px] text-[var(--color-faint)] mt-1.5 px-1">Multiplier × 0.1 SOL mint fee</p>
        </div>

        {/* Restrictions */}
        <div>
          <div className="text-xs font-medium text-[var(--color-muted)] mb-2">Restrictions</div>
          <ul className="text-xs text-[var(--color-text)] space-y-2 px-1">
            <li className="flex items-start gap-1.5">
              <span className="text-[var(--color-accent)] mt-px">•</span>
              <span>Max <span className="font-mono font-medium text-[var(--color-accent)]">9</span> building slots per planet</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-[var(--color-accent)] mt-px">•</span>
              <span>Max <span className="font-mono font-medium text-[var(--color-accent)]">1</span> Stardust building</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
