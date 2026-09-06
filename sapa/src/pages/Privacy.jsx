import { useState } from 'react';
import { ShieldCheck, Trash2 } from 'lucide-react';
import { useSapa } from '../hooks/useVisitor.jsx';

const POINTS = [
  ['We count visits.', 'We record how many times the app is opened and which features get used, so the builder knows whether anyone actually uses it.'],
  ['We use a random browser ID.', 'A random string is stored in your browser. It is not derived from your device, and it is not shared with anyone. It is not a fingerprint.'],
  ['Your name is optional.', 'You can skip it forever. If you skip it you appear as "Anonymous Survivor".'],
  ['We do not store your money.', 'Your balance, spending and Sapa date stay in your browser. Analytics only ever receives wide categories such as "50000-100000", never the actual figure.'],
  ['We never sell anything.', 'There is nothing to sell. No advertising, no third-party trackers, no data sharing.'],
  ['You can wipe it all.', 'The button below clears your local data, including the random ID. You become a brand new visitor.']
];

const NEVER_COLLECTED = ['BVN', 'Bank account numbers', 'Card details', 'Passwords', 'Your location', 'Phone number', 'Email address'];

export default function Privacy() {
  const { resetEverything } = useSapa();
  const [done, setDone] = useState(false);

  const reset = () => {
    resetEverything();
    setDone(true);
  };

  return (
    <div className="py-8 space-y-6 max-w-2xl">
      <div>
        <ShieldCheck className="w-6 h-6 text-hazard" aria-hidden="true" />
        <h1 className="font-display text-4xl sm:text-5xl leading-tight mt-3">PRIVACY</h1>
        <p className="text-bone-300 mt-2">
          The short version: your money stays on your device, your name is optional, and we
          count usage without identifying you.
        </p>
      </div>

      <dl className="space-y-4">
        {POINTS.map(([term, detail]) => (
          <div key={term} className="panel p-4">
            <dt className="font-semibold">{term}</dt>
            <dd className="text-sm text-bone-300 mt-1">{detail}</dd>
          </div>
        ))}
      </dl>

      <section className="panel p-5">
        <h2 className="label-tag">Never collected</h2>
        <ul className="flex flex-wrap gap-2 mt-3">
          {NEVER_COLLECTED.map((item) => (
            <li key={item} className="pill border-ash-600 text-bone-300">{item}</li>
          ))}
        </ul>
      </section>

      <section className="panel border-l-4 border-l-siren p-5">
        <h2 className="font-display text-2xl">RESET MY LOCAL DATA</h2>
        <p className="text-sm text-bone-300 mt-1.5">
          Clears your random ID, your name, your saved scenario and your battle history from
          this browser. This cannot be undone.
        </p>
        <button type="button" onClick={reset} className="btn-danger mt-4">
          <Trash2 className="w-4 h-4" aria-hidden="true" /> Reset my local data
        </button>
        {done && (
          <p className="font-mono text-sm text-allclear mt-3" role="status">
            Done. This browser is now a new anonymous visitor.
          </p>
        )}
      </section>
    </div>
  );
}
