import { useMemo, useState } from 'react';
import { FlaskConical, ArrowRight } from 'lucide-react';
import { simulateRunway, applyShock, runwayDelta } from '../lib/sapaEngine.js';
import { getRiskLevel } from '../lib/riskLevels.js';
import { formatNaira, formatDate } from '../lib/formatCurrency.js';
import { recordLabScenario } from '../lib/analytics.js';

/* Every scenario is expressed as a shock the engine applies, so a Lab result
 * is computed by exactly the same simulation as the original forecast. */
export const LAB_SCENARIOS = [
  { id: 'cost-of-living', label: 'Cost of living +20%', detail: 'Everything gets more expensive.', shock: { spendMultiplier: 1.2 } },
  { id: 'weekend', label: 'A ₦15,000 weekend', detail: 'One outing, paid for today.', shock: { cashDelta: -15000 } },
  { id: 'emergency', label: 'A ₦30,000 emergency', detail: 'Unplanned and immediate.', shock: { cashDelta: -30000 } },
  { id: 'extra-income', label: 'Extra ₦50,000 income', detail: 'A gig lands this week.', shock: { cashDelta: 50000 } },
  { id: 'cut-spending', label: 'Cut spending by 20%', detail: 'Same life, tighter.', shock: { spendMultiplier: 0.8 } }
];

export default function SapaLab({ scenario }) {
  const [activeId, setActiveId] = useState(null);

  const baseline = useMemo(() => simulateRunway(scenario), [scenario]);

  const outcome = useMemo(() => {
    if (!activeId) return null;
    const chosen = LAB_SCENARIOS.find((item) => item.id === activeId);
    const applied = applyShock(scenario, chosen.shock);
    return { chosen, ...applied, delta: runwayDelta(baseline, applied.result) };
  }, [activeId, scenario, baseline]);

  const test = (item) => {
    setActiveId(item.id);
    const applied = applyShock(scenario, item.shock);
    const delta = runwayDelta(baseline, applied.result);
    // Only the scenario id and the direction leave the browser.
    recordLabScenario({
      scenarioId: item.id,
      direction: delta > 0 ? 'longer' : delta < 0 ? 'shorter' : 'unchanged'
    });
  };

  return (
    <div className="space-y-5">
      <section className="panel p-5">
        <p className="label-tag">Your baseline</p>
        <div className="flex items-end gap-3 mt-2 flex-wrap">
          <span className="stat-num text-5xl text-hazard">
            {baseline.survives ? '365+' : baseline.runwayDays}
          </span>
          <span className="font-display text-lg text-bone-300 pb-1.5">
            DAYS &middot; {getRiskLevel(baseline.runwayDays).label}
          </span>
        </div>
        <p className="font-mono text-sm text-bone-300 mt-2">
          {formatNaira(scenario.currentCash)} at {formatNaira(scenario.weeklySpending)}/week
        </p>
      </section>

      <div className="grid sm:grid-cols-2 gap-3">
        {LAB_SCENARIOS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => test(item)}
            aria-pressed={activeId === item.id}
            className={`panel p-4 text-left transition-colors ${
              activeId === item.id ? 'border-hazard bg-ash-700' : 'hover:border-ash-500'
            }`}
          >
            <span className="font-semibold block">{item.label}</span>
            <span className="text-sm text-bone-300 block mt-0.5">{item.detail}</span>
          </button>
        ))}
      </div>

      {outcome && (
        <section
          className={`panel border-l-4 p-5 ${outcome.delta > 0 ? 'border-l-allclear' : outcome.delta < 0 ? 'border-l-siren' : 'border-l-ash-500'}`}
          aria-live="polite"
        >
          <p className="label-tag flex items-center gap-2">
            <FlaskConical className="w-3.5 h-3.5 text-hazard" aria-hidden="true" />
            {outcome.chosen.label}
          </p>

          <div className="flex items-center gap-4 mt-4 flex-wrap">
            <div>
              <p className="label-tag">Before</p>
              <p className="stat-num text-4xl mt-1">
                {baseline.survives ? '365+' : baseline.runwayDays}
              </p>
            </div>
            <ArrowRight className="w-6 h-6 text-ash-500 mt-4" aria-hidden="true" />
            <div>
              <p className="label-tag">After</p>
              <p className={`stat-num text-4xl mt-1 ${outcome.delta > 0 ? 'text-allclear' : outcome.delta < 0 ? 'text-siren' : ''}`}>
                {outcome.result.survives ? '365+' : outcome.result.runwayDays}
              </p>
            </div>
          </div>

          <p className={`font-display text-2xl sm:text-3xl mt-5 ${outcome.delta > 0 ? 'text-allclear' : outcome.delta < 0 ? 'text-siren' : 'text-bone-100'}`}>
            {outcome.delta === 0
              ? 'NO CHANGE TO YOUR SAPA DATE'
              : outcome.delta > 0
                ? `SAPA RETREATS BY ${outcome.delta} DAY${outcome.delta === 1 ? '' : 'S'}`
                : `SAPA MOVES ${Math.abs(outcome.delta)} DAY${Math.abs(outcome.delta) === 1 ? '' : 'S'} CLOSER`}
          </p>

          {!outcome.result.survives && (
            <p className="font-mono text-sm text-bone-300 mt-2">
              New Sapa date: {formatDate(outcome.result.sapaDate)}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
