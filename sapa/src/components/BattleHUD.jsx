import { formatNaira, formatShortDate } from '../lib/formatCurrency.js';
import { getRiskLevel } from '../lib/riskLevels.js';
import { BATTLE_DAYS } from '../data/battleEvents.js';

const TONE = {
  allclear: 'text-allclear', hazard: 'text-hazard',
  watch: 'text-watch', siren: 'text-siren'
};

/* Compact status bar, sticky under the header for the whole battle. */
export default function BattleHUD({ state, runway }) {
  const risk = getRiskLevel(runway?.runwayDays);
  const progress = Math.min(100, (state.day / BATTLE_DAYS) * 100);

  return (
    <div className="panel sticky top-[86px] z-30 overflow-hidden">
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-ash-600">
        <Cell label="Day" value={`${state.day} / ${BATTLE_DAYS}`} />
        <Cell label="Balance" value={formatNaira(state.balance, { compact: true })} />
        <Cell
          label="Original Sapa"
          value={state.originalSapaDate ? formatShortDate(state.originalSapaDate) : 'None'}
          muted
        />
        <Cell
          label="Runway now"
          value={runway?.survives ? '60+ d' : `${runway?.runwayDays ?? 0} d`}
          tone={TONE[risk.tone]}
        />
      </div>
      <div className="h-1 bg-ash-700">
        <div className="h-full bg-hazard transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function Cell({ label, value, tone, muted }) {
  return (
    <div className="px-3 py-2.5">
      <p className="label-tag text-[10px]">{label}</p>
      <p className={`font-mono text-sm sm:text-base mt-0.5 ${tone || (muted ? 'text-bone-300' : 'text-bone-100')}`}>
        {value}
      </p>
    </div>
  );
}
