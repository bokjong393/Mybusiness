import { useCallback, useEffect, useState } from 'react';
import {
  Users, Eye, Repeat, Calculator, Swords, Trophy, FlaskConical,
  Share2, Download, LogOut, Lock, RefreshCw
} from 'lucide-react';
import { ensureSupabase, isConfigured } from '../lib/supabase.js';
import { getAdminStats, getTopUsers, getRecentActivity } from '../lib/analytics.js';

/* SAPA COMMAND CENTER — private analytics.
 *
 * Access is gated by Supabase Authentication, NOT by a password compared in
 * this file. A frontend password check is theatre: the bundle is public, so
 * anyone can read the constant and call the database directly. Here the
 * session token is what the database checks, and every admin read function
 * re-verifies auth.role() server-side (see supabase/schema.sql).
 *
 * This route is deliberately unlinked from the public UI.
 */

const RANGES = [
  { id: 'today', label: 'Today', hours: 24 },
  { id: '7d', label: 'Last 7 days', hours: 24 * 7 },
  { id: '30d', label: 'Last 30 days', hours: 24 * 30 },
  { id: 'all', label: 'All time', hours: null }
];

const EVENT_LABEL = {
  app_open: 'opened the app',
  name_submitted: 'gave their name',
  meter_started: 'started the Sapa Meter',
  meter_completed: 'calculated their Sapa Meter',
  battle_started: 'entered Battle Royale',
  battle_event_answered: 'made a battle decision',
  battle_completed: 'completed Battle Royale',
  battle_failed: 'was located by Sapa',
  lab_opened: 'opened Sapa Lab',
  lab_scenario_tested: 'tested a Lab scenario',
  result_shared: 'shared a Sapa report',
  result_downloaded: 'downloaded a Sapa report',
  challenge_created: 'created a challenge link',
  challenge_opened: 'opened a challenge link',
  play_again: 'played again',
  demo_started: 'tried the demo'
};

export default function Admin() {
  const [supabase, setSupabase] = useState(null);
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let unsubscribe = () => {};
    let cancelled = false;

    ensureSupabase().then((client) => {
      if (cancelled) return;
      if (!client) return setChecking(false);
      setSupabase(client);
      client.auth.getSession().then(({ data }) => {
        if (cancelled) return;
        setSession(data.session);
        setChecking(false);
      });
      const { data: sub } = client.auth.onAuthStateChange((_event, next) => setSession(next));
      unsubscribe = () => sub.subscription.unsubscribe();
    });

    return () => { cancelled = true; unsubscribe(); };
  }, []);

  if (!isConfigured()) return <NotConfigured />;
  if (checking || !supabase) return <Centered>Checking session…</Centered>;
  if (!session) return <SignIn supabase={supabase} />;
  return <Dashboard supabase={supabase} email={session.user?.email} />;
}

function Dashboard({ supabase, email }) {
  const [range, setRange] = useState('all');
  const [stats, setStats] = useState(null);
  const [visitors, setVisitors] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const chosen = RANGES.find((r) => r.id === range);
    const since = chosen?.hours ? new Date(Date.now() - chosen.hours * 3600 * 1000).toISOString() : null;

    const [nextStats, nextVisitors, nextActivity] = await Promise.all([
      getAdminStats(since),
      getTopUsers({ limit: 25, since }),
      getRecentActivity({ limit: 20 })
    ]);

    // A null stats payload means the read was refused or failed. Say so
    // rather than rendering zeroes that look like real (empty) data.
    if (!nextStats) setError('Could not load analytics. Check that the schema and policies are installed.');
    setStats(nextStats);
    setVisitors(nextVisitors);
    setActivity(nextActivity);
    setLoading(false);
  }, [range]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="py-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="label-tag">Private analytics</p>
          <h1 className="font-display text-4xl sm:text-5xl leading-tight mt-1">SAPA COMMAND CENTER</h1>
          <p className="text-sm text-bone-300 mt-1">Signed in as {email}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="btn-ghost" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </button>
          <button type="button" onClick={() => supabase.auth.signOut()} className="btn-ghost">
            <LogOut className="w-4 h-4" aria-hidden="true" /> Sign out
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Date range">
        {RANGES.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setRange(option.id)}
            aria-pressed={range === option.id}
            className={`pill ${range === option.id ? 'border-hazard text-hazard' : 'border-ash-600 text-bone-300'}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {error && <p className="panel border-l-4 border-l-siren p-4 text-sm text-siren">{error}</p>}

      {stats && (
        <>
          <section className="grid grid-cols-2 lg:grid-cols-3 gap-3" aria-label="Overview">
            <Card icon={Users} label="Unique survivors" value={stats.uniqueVisitors} accent />
            <Card icon={Eye} label="Total visits" value={stats.totalVisits} />
            <Card icon={Repeat} label="Returning" value={stats.returningVisitors} />
            <Card icon={Calculator} label="Sapa checks" value={stats.meterCompleted} />
            <Card icon={Swords} label="Battles started" value={stats.battlesStarted} />
            <Card icon={Trophy} label="Battles survived" value={stats.battlesCompleted} />
            <Card icon={FlaskConical} label="Lab uses" value={stats.labUses} />
            <Card icon={Share2} label="Shares" value={stats.shares} />
            <Card icon={Download} label="Downloads" value={stats.downloads} />
          </section>

          <section className="panel p-5" aria-labelledby="engagement">
            <h2 id="engagement" className="label-tag">Engagement</h2>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
              <Rate label="Battle completion" value={stats.battleCompletionRate} />
              <Rate label="Share rate" value={stats.shareRate} />
              <Rate label="Meter → Battle" value={stats.meterToBattleRate} />
              <Rate label="Returning rate" value={stats.returningRate} />
              <Rate label="Visits per user" value={stats.averageVisitsPerUser} suffix="" decimals={1} />
              <div>
                <dt className="label-tag">Most used feature</dt>
                <dd className="font-mono text-lg mt-1">{mostUsedFeature(stats)}</dd>
              </div>
            </dl>
          </section>
        </>
      )}

      <section className="panel p-5" aria-labelledby="survivors">
        <h2 id="survivors" className="label-tag">Survivors</h2>
        {visitors.length === 0 ? (
          <Empty>No visitors recorded in this range yet.</Empty>
        ) : (
          <div className="overflow-x-auto mt-3 scrollbar-none">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left">
                  {['Name', 'First visit', 'Last visit', 'Visits', 'Meter', 'Started', 'Survived', 'Lab', 'Shares'].map((head) => (
                    <th key={head} className="label-tag font-normal pb-2 pr-3 whitespace-nowrap">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-mono">
                {visitors.map((visitor, index) => (
                  <tr key={index} className="border-t border-ash-600">
                    <td className={`py-2 pr-3 whitespace-nowrap ${visitor.isNamed ? 'text-bone-100' : 'text-ash-500'}`}>
                      {visitor.name}
                    </td>
                    <td className="py-2 pr-3 text-bone-300 whitespace-nowrap">{shortDate(visitor.firstSeen)}</td>
                    <td className="py-2 pr-3 text-bone-300 whitespace-nowrap">{shortDate(visitor.lastSeen)}</td>
                    <td className="py-2 pr-3">{visitor.visits}</td>
                    <td className="py-2 pr-3">{visitor.meter}</td>
                    <td className="py-2 pr-3">{visitor.battlesStarted}</td>
                    <td className="py-2 pr-3">{visitor.battlesCompleted}</td>
                    <td className="py-2 pr-3">{visitor.lab}</td>
                    <td className="py-2 pr-3">{visitor.shares}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-ash-500 mt-3">
          Usage activity only. This is not a financial ranking, and no financial values are
          stored against any visitor.
        </p>
      </section>

      <section className="panel p-5" aria-labelledby="activity">
        <h2 id="activity" className="label-tag">Recent activity</h2>
        {activity.length === 0 ? (
          <Empty>Nothing yet.</Empty>
        ) : (
          <ul className="mt-3 divide-y divide-ash-600">
            {activity.map((item, index) => (
              <li key={index} className="py-2.5 flex items-baseline justify-between gap-4">
                <span className="text-sm">
                  <span className="text-bone-100">{item.name}</span>{' '}
                  <span className="text-bone-300">{EVENT_LABEL[item.event] || item.event}</span>
                </span>
                <span className="font-mono text-[11px] text-ash-500 whitespace-nowrap">
                  {relativeTime(item.at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SignIn({ supabase }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    // Deliberately generic: do not reveal whether the address exists.
    if (authError) setError('Sign-in failed. Check the email and password.');
    setBusy(false);
  };

  return (
    <div className="py-16 max-w-sm mx-auto">
      <form onSubmit={submit} className="panel p-6 space-y-4">
        <Lock className="w-5 h-5 text-hazard" aria-hidden="true" />
        <h1 className="font-display text-3xl leading-tight">ADMIN ACCESS</h1>
        <p className="text-sm text-bone-300">
          Authentication is handled by Supabase. Credentials are never stored in this app.
        </p>
        <label className="block">
          <span className="label-tag">Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                 className="field-input mt-2" autoComplete="username" />
        </label>
        <label className="block">
          <span className="label-tag">Password</span>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                 className="field-input mt-2" autoComplete="current-password" />
        </label>
        {error && <p className="font-mono text-xs text-siren" role="alert">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

function NotConfigured() {
  return (
    <div className="py-16 max-w-lg mx-auto">
      <div className="panel p-6 space-y-3">
        <Lock className="w-5 h-5 text-hazard" aria-hidden="true" />
        <h1 className="font-display text-3xl leading-tight">ANALYTICS NOT CONFIGURED</h1>
        <p className="text-sm text-bone-300">
          This build has no Supabase project attached, so there is nothing to report. The app
          itself works fully without it — analytics is optional.
        </p>
        <p className="text-sm text-bone-300">
          To switch it on: create a Supabase project, run <code className="text-hazard">supabase/schema.sql</code>{' '}
          then <code className="text-hazard">supabase/policies.sql</code>, add an admin user, and set{' '}
          <code className="text-hazard">VITE_SUPABASE_URL</code> and{' '}
          <code className="text-hazard">VITE_SUPABASE_ANON_KEY</code>. The README has the full steps.
        </p>
      </div>
    </div>
  );
}

function Card({ icon: Icon, label, value, accent }) {
  return (
    <div className={`panel p-4 ${accent ? 'border-l-4 border-l-hazard' : ''}`}>
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-hazard" aria-hidden="true" />
        <p className="label-tag">{label}</p>
      </div>
      <p className="stat-num text-4xl mt-2">{Number(value || 0).toLocaleString('en-NG')}</p>
    </div>
  );
}

function Rate({ label, value, suffix = '%', decimals = 1 }) {
  return (
    <div>
      <dt className="label-tag">{label}</dt>
      <dd className="font-mono text-lg mt-1">
        {Number(value || 0).toFixed(decimals)}{suffix}
      </dd>
    </div>
  );
}

function Empty({ children }) {
  return <p className="text-sm text-ash-500 mt-3">{children}</p>;
}

function Centered({ children }) {
  return <div className="py-24 text-center font-mono text-sm text-bone-300">{children}</div>;
}

function mostUsedFeature(stats) {
  const options = [
    ['Sapa Meter', stats.meterCompleted],
    ['Battle Royale', stats.battlesStarted],
    ['Sapa Lab', stats.labUses],
    ['Sharing', stats.shares]
  ];
  const [name, count] = options.reduce((best, item) => (item[1] > best[1] ? item : best));
  return count > 0 ? name : '—';
}

function shortDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function relativeTime(value) {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  return `${Math.round(seconds / 86400)}d ago`;
}
