import { Swords } from 'lucide-react';
import { formatNaira, formatDate } from '../lib/formatCurrency.js';
import { DEFAULT_START_CASH, DEFAULT_WEEKLY_BURN } from '../lib/battleEngine.js';
import { BATTLE_DAYS } from '../data/battleEvents.js';

export default function BattleIntro({ preview, hasScenario, challengeDays, onStart }) {
  return (
    <div className="space-y-5">
      <section className="panel overflow-hidden">
        <div className="hazard-tape h-1.5" aria-hidden="true" />
        <div className="p-5 sm:p-7">
          <h1 className="font-display text-4xl sm:text-5xl leading-tight">SAPA BATTLE ROYALE</h1>
          <p className="text-bone-300 mt-2">
            Can you survive the month without Sapa locating you?
          </p>

          {challengeDays !== null && (
            <p className="pill border-hazard text-hazard mt-4">
              Challenge accepted: beat {challengeDays} days
            </p>
          )}

          {!hasScenario && (
            <p className="text-sm text-bone-300 mt-4 border-l-2 border-ash-600 pl-3">
              You haven&rsquo;t run the Meter, so we&rsquo;ll start you on{' '}
              {formatNaira(DEFAULT_START_CASH)} with a {formatNaira(DEFAULT_WEEKLY_BURN)} weekly
              burn. Run the Meter first to play with your own numbers.
            </p>
          )}

          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-5 border-t border-ash-600">
            <div>
              <dt className="label-tag">Starting balance</dt>
              <dd className="font-mono text-lg mt-1">{formatNaira(preview.scenario.currentCash)}</dd>
            </div>
            <div>
              <dt className="label-tag">Financial runway</dt>
              <dd className="font-mono text-lg mt-1">{preview.originalRunway} days</dd>
            </div>
            <div>
              <dt className="label-tag">Current Sapa date</dt>
              <dd className="font-mono text-lg mt-1">
                {preview.originalSapaDate ? formatDate(preview.originalSapaDate) : 'None'}
              </dd>
            </div>
          </dl>

          <div className="mt-6 pt-5 border-t border-ash-600 space-y-1.5">
            <p className="font-display text-2xl">MISSION: SURVIVE {BATTLE_DAYS} DAYS</p>
            <p className="font-mono text-sm text-bone-300">
              Bonus: beat your original Sapa forecast of {preview.originalRunway} days.
            </p>
          </div>

          <button type="button" onClick={onStart} className="btn-primary w-full mt-6 text-base py-4">
            <Swords className="w-4 h-4" aria-hidden="true" /> Start the month
          </button>
        </div>
      </section>

      <p className="text-xs text-ash-500">
        Ten decisions across thirty days. Every consequence is calculated, not random —
        the same engine that produced your forecast.
      </p>
    </div>
  );
}
