/* The weather panel. Numbers here are game/product metrics, never presented
 * as a probability or a forecast of real events — the copy says so. */
export default function FinancialWeather({ risk, dailyBurn, runwayDays, survives }) {
  const TONE = {
    allclear: 'border-allclear text-allclear',
    hazard: 'border-hazard text-hazard',
    watch: 'border-watch text-watch',
    siren: 'border-siren text-siren'
  }[risk.tone] || 'border-hazard text-hazard';

  return (
    <section className={`panel border-l-4 ${TONE.split(' ')[0]} p-5`} aria-labelledby="weather-title">
      <p className="label-tag">Financial weather</p>
      <div className="flex items-start gap-4 mt-3">
        <span className="text-5xl leading-none shrink-0" aria-hidden="true">{risk.weatherIcon}</span>
        <div className="min-w-0">
          <h3 id="weather-title" className={`font-display text-2xl sm:text-3xl leading-tight ${TONE.split(' ')[1]}`}>
            {risk.weather}
          </h3>
          <p className="text-sm text-bone-300 mt-1.5">{risk.blurb}</p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-ash-600">
        <div>
          <dt className="label-tag">Burn rate</dt>
          <dd className="font-mono text-base mt-1">
            ₦{Math.round(dailyBurn).toLocaleString('en-NG')}<span className="text-ash-500"> / day</span>
          </dd>
        </div>
        <div>
          <dt className="label-tag">Outlook</dt>
          <dd className="font-mono text-base mt-1">
            {survives ? 'Beyond 1 year' : `${runwayDays} day${runwayDays === 1 ? '' : 's'}`}
          </dd>
        </div>
      </dl>

      <p className="mt-4 text-[11px] text-ash-500 leading-relaxed">
        A weather-style reading of your own numbers. Not a probability, not a prediction,
        and not related to any real forecast service.
      </p>
    </section>
  );
}
