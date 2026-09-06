import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import SapaLab from '../components/SapaLab.jsx';
import { useSapa } from '../hooks/useVisitor.jsx';
import { recordLabOpened } from '../lib/analytics.js';
import { DEFAULT_START_CASH, DEFAULT_WEEKLY_BURN } from '../lib/battleEngine.js';

export default function Lab() {
  const { scenario } = useSapa();

  useEffect(() => { recordLabOpened(); }, []);

  const working = scenario || {
    currentCash: DEFAULT_START_CASH,
    weeklySpending: DEFAULT_WEEKLY_BURN,
    income: [],
    expenses: []
  };

  return (
    <div className="py-8 space-y-6">
      <div>
        <h1 className="font-display text-4xl sm:text-5xl leading-tight">SAPA LAB 🧪</h1>
        <p className="text-bone-300 mt-2 max-w-xl">
          Stress-test your finances before real life does. Each scenario re-runs the same
          simulation that produced your forecast.
        </p>
      </div>

      {!scenario && (
        <p className="panel p-4 text-sm text-bone-300">
          You haven&rsquo;t run the Meter yet, so the Lab is using example figures.{' '}
          <Link to="/meter" className="text-hazard underline">Run the Meter</Link> to test
          your own numbers.
        </p>
      )}

      <SapaLab scenario={{ ...working, startDate: new Date() }} />
    </div>
  );
}
