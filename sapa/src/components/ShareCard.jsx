import { forwardRef } from 'react';
import { formatNaira } from '../lib/formatCurrency.js';

/* The downloadable survival report.
 *
 * Rendered as a real DOM node (html-to-image rasterises it on export) at a
 * fixed 1080x1350 logical size so the exported PNG is identical on every
 * device rather than reflowing with the viewport. */
const ShareCard = forwardRef(function ShareCard({ summary, name, prophecy }, ref) {
  const survived = summary.status === 'survived';
  const beyond = summary.daysBeyond;

  /* Three outcomes, not two. Beating your own forecast while still running out
   * of money is a real result, but painting it all-clear green on a card that
   * says "Sapa located you" reads as a victory the player did not have. */
  const verdict = beyond < 0
    ? { tone: 'bg-siren text-white', caption: 'Versus your own forecast', headline: `${Math.abs(beyond)} DAYS SHORT` }
    : survived
      ? { tone: 'bg-allclear text-ash-900', caption: 'Versus your own forecast', headline: `+${beyond} DAYS BEYOND` }
      : { tone: 'bg-hazard text-ash-900', caption: 'Beat your forecast, still went broke', headline: `+${beyond} DAYS BEYOND` };

  return (
    <div
      ref={ref}
      style={{ width: 1080, height: 1350 }}
      className="bg-ash-900 text-bone-100 flex flex-col"
    >
      <div className="hazard-tape" style={{ height: 16 }} aria-hidden="true" />

      <div className="flex-1 px-16 py-14 flex flex-col">
        <div className="flex items-center justify-between">
          <p className="font-display text-5xl tracking-wide">SAPA</p>
          <p className="font-mono text-lg uppercase tracking-[0.22em] text-bone-300">
            Survival Report
          </p>
        </div>

        <div className="h-1 bg-ash-600 my-10" />

        <p className="font-display text-6xl leading-none">
          {(name || 'ANONYMOUS SURVIVOR').toUpperCase()}
        </p>
        <p className="font-display text-7xl leading-none mt-4 text-hazard">
          {survived ? `SURVIVED ${summary.survivedDays} DAYS` : `LASTED ${summary.survivedDays} DAYS`}
        </p>

        <div className="grid grid-cols-2 gap-8 mt-12">
          <Block label="Original forecast" value={`${summary.originalRunway} days`} />
          <Block label="Actual survival" value={`${summary.survivedDays} days`} />
        </div>

        <div className={`mt-10 px-10 py-8 ${verdict.tone}`}>
          <p className="font-mono text-lg uppercase tracking-[0.2em] opacity-80">{verdict.caption}</p>
          <p className="font-display text-7xl leading-none mt-2">{verdict.headline}</p>
        </div>

        <div className="grid grid-cols-3 gap-8 mt-11">
          <Meter label="Discipline" value={summary.scores.discipline} />
          <Meter label="Risk mgmt" value={summary.scores.risk} />
          <Meter label="Impulse ctrl" value={summary.scores.impulse} />
        </div>

        <div className="grid grid-cols-2 gap-8 mt-10">
          <Block label="Final balance" value={formatNaira(summary.finalBalance)} />
          <Block
            label="Biggest shock"
            value={summary.biggestShock ? summary.biggestShock.eventTitle : 'None survived'}
            small
          />
        </div>

        <div className="mt-auto pt-10">
          <p className="font-mono text-lg uppercase tracking-[0.2em] text-bone-300">Rank</p>
          <p className="font-display text-5xl leading-tight mt-1">
            {summary.rank.emoji} {summary.rank.label}
          </p>
          {prophecy && (
            <p className="font-mono text-2xl text-hazard mt-6">&ldquo;{prophecy}&rdquo;</p>
          )}
        </div>
      </div>

      <div className="px-16 py-6 bg-ash-800 flex items-center justify-between">
        <p className="font-mono text-base uppercase tracking-[0.18em] text-bone-300">
          SAPA — Nigeria&rsquo;s Financial Survival Simulator
        </p>
        <p className="font-mono text-base text-ash-500">Game result, not financial advice</p>
      </div>
    </div>
  );
});

function Block({ label, value, small }) {
  return (
    <div>
      <p className="font-mono text-lg uppercase tracking-[0.18em] text-bone-300">{label}</p>
      <p className={`font-display leading-none mt-2 ${small ? 'text-3xl' : 'text-5xl'}`}>{value}</p>
    </div>
  );
}

function Meter({ label, value }) {
  return (
    <div>
      <p className="font-mono text-base uppercase tracking-[0.16em] text-bone-300">{label}</p>
      <p className="font-display text-5xl leading-none mt-1">{value}</p>
      <div className="h-3 bg-ash-700 mt-3">
        <div className="h-full bg-hazard" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default ShareCard;
