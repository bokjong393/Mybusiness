import { RISK_LEVELS } from '../lib/riskLevels.js';

const TONE = {
  allclear: { bar: 'bg-allclear', text: 'text-allclear', border: 'border-allclear' },
  hazard: { bar: 'bg-hazard', text: 'text-hazard', border: 'border-hazard' },
  watch: { bar: 'bg-watch', text: 'text-watch', border: 'border-watch' },
  siren: { bar: 'bg-siren', text: 'text-siren', border: 'border-siren' }
};

/* Six-segment threat gauge. The active band is filled and labelled; colour is
 * never the only signal — the label and the marker carry it too. */
export default function RiskGauge({ risk }) {
  // Rendered most-severe first, so the gauge reads left-to-right as escalating.
  const ordered = [...RISK_LEVELS].reverse();
  const activeIndex = ordered.findIndex((level) => level.id === risk.id);
  const tone = TONE[risk.tone] || TONE.hazard;

  return (
    <div>
      <div className="flex gap-1" role="img" aria-label={`Threat level: ${risk.label}`}>
        {ordered.map((level, index) => {
          const isActive = index === activeIndex;
          const isPassed = index < activeIndex;
          const levelTone = TONE[level.tone] || TONE.hazard;
          return (
            <div key={level.id} className="flex-1">
              <div
                className={`h-2.5 rounded-sm transition-colors ${
                  isActive ? levelTone.bar : isPassed ? 'bg-ash-600' : 'bg-ash-700'
                }`}
              />
              <div className={`h-3 mt-1 flex justify-center ${isActive ? '' : 'opacity-0'}`}>
                <span className={`text-[10px] leading-none ${levelTone.text}`} aria-hidden="true">▲</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-ash-500">
        <span>Safe</span>
        <span className={tone.text}>{risk.label}</span>
        <span>Located</span>
      </div>
    </div>
  );
}
