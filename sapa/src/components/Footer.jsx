import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-ash-600">
      <div className="hazard-tape h-1" aria-hidden="true" />
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-3">
        <p className="font-display text-xl">SAPA</p>
        <p className="text-sm text-bone-300 max-w-xl">
          A financial survival simulator with Nigerian humour on top. The jokes are jokes;
          the runway maths is real and deterministic.
        </p>
        <p className="text-xs text-ash-500 max-w-xl">
          Entertainment and education only. Not financial advice, not a prediction, and not
          affiliated with any bank or government agency. &ldquo;Current national condition&rdquo;
          is a joke, not data.
        </p>
        <div className="flex flex-wrap gap-4 pt-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <Link to="/privacy" className="text-bone-300 hover:text-hazard">Privacy</Link>
          <a
            href="https://github.com/bokjong393/Mybusiness"
            className="text-bone-300 hover:text-hazard"
            target="_blank"
            rel="noreferrer"
          >
            Source
          </a>
        </div>
      </div>
    </footer>
  );
}
