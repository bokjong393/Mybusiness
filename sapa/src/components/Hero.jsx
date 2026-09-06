import { Link } from 'react-router-dom';
import { Calculator, Gamepad2, Radio } from 'lucide-react';
import SocialProof from './SocialProof.jsx';

export default function Hero() {
  return (
    <section className="pt-10 pb-8">
      <span className="pill border-siren text-siren">
        <span className="w-1.5 h-1.5 rounded-full bg-siren animate-blip" aria-hidden="true" />
        <Radio className="w-3 h-3" aria-hidden="true" />
        Current national condition: Sapa is actively looking for people
      </span>

      <h1 className="font-display text-5xl sm:text-7xl leading-[0.95] mt-5 text-shadow-hard">
        HOW FAR IS<br />SAPA FROM YOU?
      </h1>

      <p className="text-lg text-bone-300 mt-5 max-w-xl">
        Enter a few numbers. We&rsquo;ll estimate your financial runway, stress-test your
        money, and see if you can survive the month.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mt-7">
        <Link to="/meter" className="btn-primary text-base py-4">
          <Calculator className="w-4 h-4" aria-hidden="true" /> Check my Sapa meter
        </Link>
        <Link to="/battle" className="btn-ghost text-base py-4">
          <Gamepad2 className="w-4 h-4" aria-hidden="true" /> Play Battle Royale
        </Link>
      </div>

      <div className="mt-6"><SocialProof /></div>

      <p className="text-xs text-ash-500 mt-4 max-w-lg">
        &ldquo;Current national condition&rdquo; is a joke, not data. Everything you enter
        stays in your browser.
      </p>
    </section>
  );
}
