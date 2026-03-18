import ScenarioCard from './ScenarioCard';
import { getTier } from '../simulation/gameConstants';

const GRID = "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3";

export default function ScenarioSelector({ scenarios, active, onSelect, results, starPrice, solPrice }) {
  const validScenarios = scenarios.filter(s => results[s.id]);
  const maxPoints = validScenarios.length
    ? Math.max(...validScenarios.map(s => results[s.id].finalState.leaderboardPoints))
    : 1;
  const maxStardust = validScenarios.length
    ? Math.max(...validScenarios.map(s => results[s.id].finalState.totalStardust))
    : 1;

  const maxSol = validScenarios.length
    ? Math.max(...validScenarios.map(s => getTier(results[s.id].finalState.leaderboardPoints).sol))
    : 1;

  const starPriceNum = starPrice !== '' && !isNaN(Number(starPrice)) ? Number(starPrice) : 0;
  const solPriceNum = solPrice !== '' && !isNaN(Number(solPrice)) ? Number(solPrice) : 0;
  const maxActions = validScenarios.length
    ? Math.max(...validScenarios.map(s => results[s.id].actionLog.length))
    : 1;

  const maxUsd = validScenarios.length
    ? Math.max(...validScenarios.map(s => {
        const pts = s.id !== undefined ? results[s.id].finalState.leaderboardPoints : 0;
        const sd = results[s.id].finalState.totalStardust;
        return getTier(pts).sol * solPriceNum + sd * starPriceNum;
      }))
    : 1;

  return (
    <div className="mb-8">
      <div className={GRID}>
        {scenarios.map(s => (
          <ScenarioCard
            key={s.id}
            scenario={s}
            isActive={active === s.id}
            result={results[s.id]}
            maxPoints={maxPoints}
            maxStardust={maxStardust}
            maxSol={maxSol}
            maxUsd={maxUsd}
            maxActions={maxActions}
            starPrice={starPrice}
            solPrice={solPrice}
            onClick={() => onSelect(s.id)}
          />
        ))}
      </div>
    </div>
  );
}
