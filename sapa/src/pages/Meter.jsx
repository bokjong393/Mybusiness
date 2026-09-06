import { useState } from 'react';
import SapaForm from '../components/SapaForm.jsx';
import SapaForecast from '../components/SapaForecast.jsx';
import { simulateRunway } from '../lib/sapaEngine.js';
import { getRiskLevel } from '../lib/riskLevels.js';
import { useSapa } from '../hooks/useVisitor.jsx';
import { recordMeterCompleted } from '../lib/analytics.js';

export default function Meter() {
  const { scenario, setScenario, result, setResult } = useSapa();
  const [view, setView] = useState(() => (result ? 'result' : 'form'));

  const handleCalculate = (input) => {
    const nextScenario = {
      currentCash: input.currentCash,
      weeklySpending: input.weeklySpending,
      income: input.income,
      expenses: input.expenses,
      raw: input.raw
    };
    // Dates arrive as ISO strings; the engine normalises them internally.
    const computed = simulateRunway({ ...nextScenario, startDate: new Date() });

    setScenario(nextScenario);
    // Dates do not survive JSON round-tripping, so store what we need as
    // primitives and rebuild the Date on read.
    setResult({
      runwayDays: computed.runwayDays,
      survives: computed.survives,
      dailyBurn: computed.dailyBurn,
      sapaDateISO: computed.sapaDate ? computed.sapaDate.toISOString() : null
    });
    setView('result');

    recordMeterCompleted({
      currentCash: input.currentCash,
      weeklySpending: input.weeklySpending,
      runwayDays: computed.runwayDays,
      riskId: getRiskLevel(computed.runwayDays).id,
      hasIncome: input.income.length > 0,
      hasExpense: input.expenses.length > 0
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showResult = view === 'result' && scenario && result;

  return (
    <div className="py-8 space-y-6">
      <div>
        <h1 className="font-display text-4xl sm:text-5xl leading-tight">
          HOW FAR IS SAPA FROM YOU?
        </h1>
        <p className="text-bone-300 mt-2 max-w-xl">
          Give us your current financial situation. We&rsquo;ll estimate when your available
          cash runs out. Nothing you type leaves your browser.
        </p>
      </div>

      {showResult ? (
        <>
          <SapaForecast
            scenario={scenario}
            result={{ ...result, sapaDate: result.sapaDateISO ? new Date(result.sapaDateISO) : null }}
          />
          <button type="button" onClick={() => setView('form')} className="btn-ghost w-full">
            Change my numbers
          </button>
        </>
      ) : (
        <SapaForm initial={scenario?.raw} onCalculate={handleCalculate} />
      )}
    </div>
  );
}
