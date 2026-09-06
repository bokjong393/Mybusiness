import { useEffect, useState } from 'react';
import { Flame, Gamepad2, Trophy } from 'lucide-react';
import { getPublicStats, isEnabled } from '../lib/analytics.js';

/* Real numbers or nothing.
 *
 * If analytics is not configured, or the read fails, or every counter is
 * still zero, this component renders nothing at all. It never invents a
 * number to look popular — a fabricated counter would undermine the one
 * screen (the admin dashboard) whose whole purpose is honest evidence. */
export default function SocialProof() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!isEnabled()) return undefined;
    getPublicStats().then((data) => { if (!cancelled) setStats(data); });
    return () => { cancelled = true; };
  }, []);

  if (!stats) return null;

  const items = [
    { icon: Flame, value: stats.meterCompleted, label: 'Sapa checks run' },
    { icon: Gamepad2, value: stats.battlesStarted, label: 'entered Battle Royale' },
    { icon: Trophy, value: stats.battlesCompleted, label: 'survived the month' }
  ].filter((item) => item.value > 0);

  if (!items.length) return null;

  return (
    <div className="flex flex-wrap gap-2" aria-label="Live usage">
      {items.map(({ icon: Icon, value, label }) => (
        <span key={label} className="pill border-ash-600 text-bone-300">
          <Icon className="w-3.5 h-3.5 text-hazard" aria-hidden="true" />
          <span className="text-bone-100 font-bold">{value.toLocaleString('en-NG')}</span>
          {label}
        </span>
      ))}
    </div>
  );
}
