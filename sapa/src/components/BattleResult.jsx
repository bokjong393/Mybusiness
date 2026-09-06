import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Share2, Swords, Link2 } from 'lucide-react';
import ShareCard from './ShareCard.jsx';
import { formatNaira } from '../lib/formatCurrency.js';
import { downloadNodeAsPng, shareNode, copyToClipboard, buildChallengeUrl } from '../lib/shareUtils.js';
import { getFallbackCommentary } from '../lib/fallbackProphecies.js';
import { getRiskLevel } from '../lib/riskLevels.js';
import * as analytics from '../lib/analytics.js';

export default function BattleResult({ summary, name, onPlayAgain }) {
  const cardRef = useRef(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const survived = summary.status === 'survived';

  const prophecy = getFallbackCommentary(
    getRiskLevel(summary.survivedDays).id,
    `${summary.rank.id}-${summary.survivedDays}`
  ).prophecy;

  useEffect(() => {
    if (survived) {
      analytics.recordBattleCompleted({
        rankId: summary.rank.id,
        survivedDays: summary.survivedDays,
        daysBeyond: summary.daysBeyond
      });
    } else {
      analytics.recordBattleFailed({ rankId: summary.rank.id, survivedDays: summary.survivedDays });
    }
    // Records the finished battle exactly once, on mount.
  }, [survived, summary.rank.id, summary.survivedDays, summary.daysBeyond]);

  const filename = `sapa-report-${summary.survivedDays}-days.png`;

  const handleDownload = async () => {
    setBusy(true);
    setStatus('Rendering your report…');
    try {
      await downloadNodeAsPng(cardRef.current, filename);
      analytics.recordDownload({ surface: 'battle' });
      setStatus(`Saved as ${filename}`);
    } catch {
      setStatus('Could not save the image. Try the share button instead.');
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    setBusy(true);
    setStatus('Preparing…');
    try {
      const outcome = await shareNode(cardRef.current, {
        filename,
        title: 'My SAPA survival report',
        text: `I survived ${summary.survivedDays} days before Sapa found me. Can you beat that?`,
        url: buildChallengeUrl(summary.survivedDays)
      });
      if (outcome === 'shared') analytics.recordShare({ surface: 'battle' });
      if (outcome === 'downloaded') analytics.recordDownload({ surface: 'battle' });
      setStatus(outcome === 'cancelled' ? '' : outcome === 'shared' ? 'Shared.' : `Saved as ${filename}`);
    } catch {
      setStatus('Sharing is not available here — use Download instead.');
    } finally {
      setBusy(false);
    }
  };

  const handleChallenge = async () => {
    const url = buildChallengeUrl(summary.survivedDays);
    const copied = await copyToClipboard(url);
    analytics.recordChallengeCreated({ days: summary.survivedDays });
    setStatus(copied ? 'Challenge link copied — send it to someone.' : url);
  };

  return (
    <div className="space-y-5">
      <section className="panel overflow-hidden">
        <div className={`h-1.5 ${survived ? 'bg-allclear' : 'bg-siren'}`} aria-hidden="true" />
        <div className="p-5 sm:p-7">
          <p className="label-tag">Battle complete</p>
          <h2 className={`font-display text-4xl sm:text-5xl leading-tight mt-2 ${survived ? 'text-allclear' : 'text-siren'}`}>
            {survived ? 'YOU SURVIVED SAPA 🎉' : 'SAPA HAS LOCATED YOU ☠️'}
          </h2>
          <p className="text-bone-300 mt-2">
            {survived
              ? 'For now.'
              : summary.daysBeyond >= 0
                ? `You went down on day ${summary.survivedDays} of 30 — but you still lasted ${summary.daysBeyond} day${summary.daysBeyond === 1 ? '' : 's'} longer than your own forecast.`
                : `You went down on day ${summary.survivedDays} of 30.`}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-ash-600">
            <Figure label="Survived" value={`${summary.survivedDays} days`} />
            <Figure label="Your forecast" value={`${summary.originalRunway} days`} />
            <Figure
              label="Vs forecast"
              value={`${summary.daysBeyond >= 0 ? '+' : '−'}${Math.abs(summary.daysBeyond)} days`}
              // Green is reserved for actually surviving; beating the forecast
              // and still going broke is amber, not a win.
              tone={summary.daysBeyond < 0 ? 'text-siren' : survived ? 'text-allclear' : 'text-hazard'}
            />
            <Figure label="Final balance" value={formatNaira(summary.finalBalance)} />
          </div>

          <div className="mt-6 pt-5 border-t border-ash-600">
            <p className="label-tag">Rank</p>
            <p className="font-display text-2xl sm:text-3xl mt-1">
              {summary.rank.emoji} {summary.rank.label}
            </p>
            <p className="text-sm text-bone-300 mt-1">{summary.rank.note}</p>
          </div>

          {(summary.bestDecision || summary.worstDecision) && (
            <dl className="grid sm:grid-cols-2 gap-4 mt-6 pt-5 border-t border-ash-600">
              {summary.bestDecision && (
                <div>
                  <dt className="label-tag">Best decision</dt>
                  <dd className="mt-1">
                    {summary.bestDecision.optionLabel}
                    <span className="text-allclear font-mono text-sm ml-2">
                      +{summary.bestDecision.dayShift}d
                    </span>
                  </dd>
                </div>
              )}
              {summary.worstDecision && (
                <div>
                  <dt className="label-tag">Worst decision</dt>
                  <dd className="mt-1">
                    {summary.worstDecision.optionLabel}
                    <span className="text-siren font-mono text-sm ml-2">
                      {summary.worstDecision.dayShift}d
                    </span>
                  </dd>
                </div>
              )}
            </dl>
          )}
        </div>
      </section>

      {/* Live preview of the exported card, scaled to fit the column. */}
      <section aria-labelledby="card-title">
        <p id="card-title" className="label-tag mb-2">Your shareable report</p>
        <div className="overflow-hidden rounded-sm border border-ash-600">
          <div
            className="origin-top-left"
            style={{ width: 1080, transform: 'scale(var(--card-scale))', height: 'calc(1350px * var(--card-scale))' }}
            ref={(node) => {
              if (!node) return;
              const parentWidth = node.parentElement.clientWidth;
              node.style.setProperty('--card-scale', String(parentWidth / 1080));
            }}
          >
            <ShareCard ref={cardRef} summary={summary} name={name} prophecy={prophecy} />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={handleShare} className="btn-primary flex-1" disabled={busy}>
          <Share2 className="w-4 h-4" aria-hidden="true" /> Share my result
        </button>
        <button type="button" onClick={handleDownload} className="btn-ghost" disabled={busy}>
          <Download className="w-4 h-4" aria-hidden="true" /> Download card
        </button>
        <button type="button" onClick={handleChallenge} className="btn-ghost" disabled={busy}>
          <Link2 className="w-4 h-4" aria-hidden="true" /> Challenge a friend
        </button>
        <button type="button" onClick={onPlayAgain} className="btn-ghost" disabled={busy}>
          <Swords className="w-4 h-4" aria-hidden="true" /> Play again
        </button>
      </div>

      <p className="font-mono text-xs text-bone-300 min-h-[1.2em]" role="status" aria-live="polite">
        {status}
      </p>

      <p className="text-xs text-ash-500">
        Challenge links carry only a day count — never your balance, spending or name.{' '}
        <Link to="/lab" className="underline hover:text-hazard">Try the Lab</Link> to see what
        would have changed your result.
      </p>
    </div>
  );
}

function Figure({ label, value, tone }) {
  return (
    <div>
      <p className="label-tag">{label}</p>
      <p className={`font-mono text-base mt-1 ${tone || 'text-bone-100'}`}>{value}</p>
    </div>
  );
}
