import { formatDelta } from '../lib/formatCurrency.js';

const CATEGORY_LABEL = {
  unavoidable: 'Unavoidable', optional: 'Optional spend', income: 'Money in',
  emergency: 'Emergency', social: 'Social pressure', opportunity: 'Opportunity',
  shock: 'Shock', surprise: 'Surprise', tradeoff: 'Trade-off'
};

/* One decision. Option consequences are deliberately NOT shown before
 * choosing — seeing the naira figure up front turns a judgement call into
 * arithmetic and removes the game. */
export default function BattleEventCard({ event, onChoose, disabled }) {
  return (
    <div key={event.id} className="panel overflow-hidden animate-rise">
      <div className="hazard-tape h-1" aria-hidden="true" />
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="label-tag">Day {event.day}</p>
          <span className="pill border-ash-600 text-bone-300">
            {CATEGORY_LABEL[event.category] || event.category}
          </span>
        </div>

        <div className="flex items-start gap-3 mt-3">
          <span className="text-3xl leading-none shrink-0" aria-hidden="true">{event.emoji}</span>
          <div>
            <h3 className="font-display text-2xl leading-tight">{event.title.toUpperCase()}</h3>
            <p className="text-bone-300 mt-1.5">{event.prompt}</p>
          </div>
        </div>

        <div className="mt-5 space-y-2.5">
          {event.options.map((option) => (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              onClick={() => onChoose(option)}
              className="w-full text-left panel bg-ash-700 border-ash-500 hover:border-hazard
                         focus-visible:border-hazard p-4 transition-colors group
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="block font-semibold text-bone-100 group-hover:text-hazard">
                {option.label}
              </span>
              <span className="block text-sm text-bone-300 mt-0.5">{option.detail}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Shown after a choice: the deterministic consequence, before and after. */
export function BattleOutcome({ change, onContinue, isLast }) {
  const moved = change.dayShift;
  const retreat = moved > 0;
  const unchanged = moved === 0;

  return (
    <div
      className={`panel border-l-4 p-5 animate-pop ${retreat ? 'border-l-allclear' : unchanged ? 'border-l-ash-500' : 'border-l-siren'}`}
    >
      <p className="label-tag">
        {change.cashDelta === 0 ? 'No cash moved' : `${formatDelta(change.cashDelta)} recorded`}
      </p>

      <h3 className={`font-display text-3xl sm:text-4xl leading-tight mt-2 ${
        retreat ? 'text-allclear' : unchanged ? 'text-bone-100' : 'text-siren'
      }`}>
        {unchanged
          ? 'SAPA DOES NOT MOVE'
          : retreat
            ? `SAPA RETREATS BY ${moved} DAY${moved === 1 ? '' : 'S'} 🏃🏾‍♂️💨`
            : `SAPA JUST MOVED ${Math.abs(moved)} DAY${Math.abs(moved) === 1 ? '' : 'S'} CLOSER 😭`}
      </h3>

      <p className="text-sm text-bone-300 mt-2">
        You chose: <span className="text-bone-100">{change.optionLabel}</span>
      </p>

      <button type="button" onClick={onContinue} className="btn-primary w-full mt-5">
        {isLast ? 'See my result' : 'Next day'}
      </button>
    </div>
  );
}
