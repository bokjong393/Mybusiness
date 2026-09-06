import { useEffect, useRef, useState } from 'react';
import { useSapa } from '../hooks/useVisitor.jsx';
import { MAX_NAME_LENGTH } from '../lib/visitor.js';

/* First-visit prompt. Deliberately skippable — a name is never required, and
 * skipping is presented as an equal choice rather than a lesser one. */
export default function NamePrompt() {
  const { needsNamePrompt, submitName, dismissNamePrompt } = useSapa();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (needsNamePrompt) inputRef.current?.focus();
  }, [needsNamePrompt]);

  useEffect(() => {
    if (!needsNamePrompt) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') dismissNamePrompt(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [needsNamePrompt, dismissNamePrompt]);

  if (!needsNamePrompt) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!value.trim()) return dismissNamePrompt();
    setBusy(true);
    await submitName(value);
    setBusy(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="name-prompt-title"
    >
      <form onSubmit={handleSubmit} className="panel w-full max-w-md p-6 space-y-4">
        <div className="hazard-tape h-1 -mt-6 -mx-6 mb-2" aria-hidden="true" />

        <h2 id="name-prompt-title" className="font-display text-3xl leading-tight">
          WHAT SHOULD SAPA CALL YOU?
        </h2>

        <label className="block">
          <span className="label-tag">Your name or nickname</span>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            maxLength={MAX_NAME_LENGTH}
            placeholder="Peace"
            className="field-input mt-2"
            autoComplete="given-name"
          />
        </label>

        <p className="text-sm text-bone-300">
          Optional. This is only used to personalise your experience and your Sapa report.
        </p>

        <p className="text-xs text-ash-500 border-l-2 border-ash-600 pl-3">
          We use a random anonymous ID to count app visits and feature usage. Your name is
          optional. We don&rsquo;t collect bank details or passwords.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button type="submit" className="btn-primary flex-1" disabled={busy}>
            {busy ? 'Saving…' : 'Continue'}
          </button>
          <button type="button" onClick={dismissNamePrompt} className="btn-ghost flex-1">
            Skip for now
          </button>
        </div>
      </form>
    </div>
  );
}
