import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2, FlaskConical, Sparkles } from 'lucide-react';
import { formatNaira, formatDate } from '../lib/formatCurrency.js';
import { getRiskLevel, getEdgeCaseHeadline } from '../lib/riskLevels.js';
import { getCommentary } from '../lib/prophecy.js';
import RiskGauge from './RiskGauge.jsx';
import FinancialWeather from './FinancialWeather.jsx';

/* The forecast screen. Every figure shown here came from sapaEngine.js before
 * this component rendered; the AI commentary is decoration on top of it. */
export default function SapaForecast({ scenario, result }) {
  const risk = getRiskLevel(result.runwayDays);
  const edgeHeadline = getEdgeCaseHeadline({
    currentCash: scenario.currentCash,
    weeklySpending: scenario.weeklySpending,
    result
  });

  const [commentary, setCommentary] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const seed = `${risk.id}-${result.runwayDays}-${Math.round(scenario.currentCash)}`;
    getCommentary({
      riskId: risk.id,
      riskLabel: risk.label,
      runwayDays: result.runwayDays,
      survives: result.survives,
      seed
    }).then((data) => { if (!cancelled) setCommentary(data); });
    return () => { cancelled = true; };
  }, [risk.id, risk.label, result.runwayDays, result.survives, scenario.currentCash]);

  const days = result.survives ? null : result.runwayDays;

  return (
    <div className="space-y-5">
      <section className="panel overflow-hidden" aria-labelledby="forecast-title">
        <div className="hazard-tape h-1.5" aria-hidden="true" />
        <div className="p-5 sm:p-7">
          <p className="label-tag">Sapa forecast</p>

          <h2 id="forecast-title" className="sr-only">Your Sapa forecast</h2>

          {edgeHeadline ? (
            <p className="font-display text-3xl sm:text-4xl leading-tight mt-3 text-shadow-hard">
              {edgeHeadline}
            </p>
          ) : (
            <div className="mt-3 flex items-end gap-4 flex-wrap">
              <div>
                <span className="stat-num text-7xl sm:text-8xl text-hazard text-shadow-hard">{days}</span>
                <span className="font-display text-2xl ml-2 text-bone-300">
                  DAY{days === 1 ? '' : 'S'}
                </span>
              </div>
              <p className="font-mono text-sm text-bone-300 pb-3">
                Estimated Sapa date<br />
                <span className="text-bone-100 text-base">{formatDate(result.sapaDate)}</span>
              </p>
            </div>
          )}

          <p className="font-display text-xl sm:text-2xl mt-4">
            <span aria-hidden="true">{risk.emoji} </span>{risk.label}
          </p>

          <div className="mt-6">
            <RiskGauge risk={risk} />
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-7 pt-5 border-t border-ash-600">
            <Figure label="Current cash" value={formatNaira(scenario.currentCash)} />
            <Figure label="Weekly burn" value={formatNaira(scenario.weeklySpending)} />
            <Figure label="Daily burn" value={formatNaira(result.dailyBurn)} />
            <Figure label="Runway" value={result.survives ? '365+ days' : `${result.runwayDays} days`} />
          </dl>
        </div>
      </section>

      <FinancialWeather
        risk={risk}
        dailyBurn={result.dailyBurn}
        runwayDays={result.runwayDays}
        survives={result.survives}
      />

      {commentary && (
        <section className="panel p-5" aria-labelledby="reading-title">
          <p className="label-tag flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-hazard" aria-hidden="true" />
            <span id="reading-title">The reading</span>
            <span className="text-ash-500 normal-case tracking-normal">
              {commentary.source === 'ai' ? '· written by AI' : '· built in'}
            </span>
          </p>
          <p className="text-lg mt-3 leading-snug">{commentary.diagnosis}</p>
          <div className="mt-4 pt-4 border-t border-ash-600">
            <p className="label-tag">One thing to do</p>
            <p className="text-bone-100 mt-1.5">{commentary.suggestion}</p>
          </div>
        </section>
      )}

      <section className="panel-lit p-5 sm:p-7">
        <h3 className="font-display text-2xl sm:text-3xl leading-tight">
          THINK YOU CAN BEAT THE FORECAST?
        </h3>
        <p className="mt-2 text-ash-700">
          {result.survives
            ? 'Your habits say you are safe. A month of real decisions is a different test.'
            : `Your current habits predict Sapa in ${result.runwayDays} day${result.runwayDays === 1 ? '' : 's'}. Let's see if your decisions can push it farther away.`}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-5">
          <Link to="/battle" className="btn bg-ash-900 border-ash-900 text-bone-100 hover:bg-siren hover:border-siren flex-1">
            <Gamepad2 className="w-4 h-4" aria-hidden="true" /> Enter Battle Royale
          </Link>
          <Link to="/lab" className="btn bg-transparent border-ash-900 text-ash-900 hover:bg-ash-900 hover:text-bone-100 sm:w-auto">
            <FlaskConical className="w-4 h-4" aria-hidden="true" /> Open Sapa Lab
          </Link>
        </div>
      </section>
    </div>
  );
}

function Figure({ label, value }) {
  return (
    <div>
      <dt className="label-tag">{label}</dt>
      <dd className="font-mono text-base sm:text-lg mt-1 text-bone-100">{value}</dd>
    </div>
  );
}
