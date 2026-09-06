import { Calculator, Swords, FlaskConical, Share2 } from 'lucide-react';
import Hero from '../components/Hero.jsx';

const STEPS = [
  { icon: Calculator, title: 'Check', body: 'Calculate your financial runway from a few real numbers.' },
  { icon: Swords, title: 'Survive', body: 'Face a month of unexpected financial wahala, one decision at a time.' },
  { icon: FlaskConical, title: 'Stress-test', body: 'See how emergencies, raises and spending cuts move your Sapa date.' },
  { icon: Share2, title: 'Share', body: 'Download your survival report and challenge a friend to beat it.' }
];

export default function Home() {
  return (
    <>
      <Hero />

      <section className="grid sm:grid-cols-2 gap-3 pb-6" aria-label="How it works">
        {STEPS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="panel p-5">
            <Icon className="w-5 h-5 text-hazard" aria-hidden="true" />
            <h2 className="font-display text-2xl mt-3">{title.toUpperCase()}</h2>
            <p className="text-sm text-bone-300 mt-1.5">{body}</p>
          </div>
        ))}
      </section>

      <section className="panel-lit p-5 sm:p-7 mb-4">
        <p className="font-display text-2xl sm:text-3xl leading-tight">
          MOST FINANCE APPS TELL YOU HOW MUCH YOU&rsquo;VE SPENT.
          <span className="block text-siren mt-1">SAPA TELLS YOU HOW LONG YOUR MONEY CAN SURVIVE.</span>
        </p>
        <p className="text-ash-700 mt-3 text-sm max-w-2xl">
          The humour sits on top of a day-by-day cash simulation. Every naira figure, runway
          and date on this site is calculated deterministically in your browser — no model
          invents a number, and nothing you type is sent anywhere.
        </p>
      </section>
    </>
  );
}
