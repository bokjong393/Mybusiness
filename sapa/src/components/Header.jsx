import { Link, useLocation } from 'react-router-dom';
import { CloudLightning } from 'lucide-react';

const TICKER = [
  'CURRENT NATIONAL CONDITION: Sapa is actively looking for people',
  'ADVISORY: entertainment only, not real national data',
  'REMINDER: your account balance can hear you',
  'FORECAST: scattered wahala, chance of unexpected expenses'
];

export default function Header() {
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-40">
      <div className="hazard-tape h-1.5" aria-hidden="true" />

      <div className="bg-ash-900/95 backdrop-blur border-b border-ash-600">
        <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <CloudLightning className="w-5 h-5 text-hazard shrink-0" aria-hidden="true" />
            <span className="font-display text-2xl tracking-wide leading-none">SAPA</span>
            <span className="hidden sm:inline label-tag border-l border-ash-600 pl-2.5">
              Financial Weather Service
            </span>
          </Link>

          <nav className="flex items-center gap-1 text-[11px] font-mono uppercase tracking-[0.12em]">
            {[['/meter', 'Meter'], ['/battle', 'Battle'], ['/lab', 'Lab']].map(([to, label]) => (
              <Link
                key={to}
                to={to}
                className={`px-2.5 py-1.5 rounded-sm transition-colors ${
                  pathname === to ? 'text-hazard bg-ash-700' : 'text-bone-300 hover:text-bone-100'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Ticker: duplicated once so the -50% translate loops seamlessly. */}
      <div className="bg-ash-800 border-b border-ash-600 overflow-hidden">
        <div className="flex whitespace-nowrap animate-ticker w-max" aria-hidden="true">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex">
              {TICKER.map((item, i) => (
                <span key={i} className="font-mono text-[10px] uppercase tracking-[0.18em] text-bone-300 px-6 py-1.5">
                  <span className="text-hazard mr-2">◆</span>{item}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
