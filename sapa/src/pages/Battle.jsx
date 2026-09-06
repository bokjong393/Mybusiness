import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import BattleIntro from '../components/BattleIntro.jsx';
import BattleHUD from '../components/BattleHUD.jsx';
import BattleEventCard, { BattleOutcome } from '../components/BattleEventCard.jsx';
import BattleResult from '../components/BattleResult.jsx';
import {
  createBattleScenario, applyBattleChoice, recalculateRunway, generateBattleSummary
} from '../lib/battleEngine.js';
import { readChallengeDays } from '../lib/shareUtils.js';
import { useSapa } from '../hooks/useVisitor.jsx';
import * as analytics from '../lib/analytics.js';

export default function Battle() {
  const { scenario, displayName, setBestBattle } = useSapa();
  const location = useLocation();
  const challengeDays = useMemo(() => readChallengeDays(location.search), [location.search]);

  const [state, setState] = useState(null);
  const [pending, setPending] = useState(null);
  const [phase, setPhase] = useState('intro');

  useEffect(() => {
    if (challengeDays !== null) analytics.recordChallengeOpened({ days: challengeDays });
  }, [challengeDays]);

  const baseScenario = useMemo(() => ({
    currentCash: scenario?.currentCash,
    weeklySpending: scenario?.weeklySpending,
    income: scenario?.income,
    expenses: scenario?.expenses,
    startDate: new Date()
  }), [scenario]);

  // Preview uses a fixed seed so the intro screen's numbers do not change
  // between renders before the player has committed to a run.
  const preview = useMemo(() => createBattleScenario(baseScenario, { seed: 1 }), [baseScenario]);

  const start = () => {
    const fresh = createBattleScenario(baseScenario);
    setState(fresh);
    setPending(null);
    setPhase('playing');
    analytics.recordBattleStarted({ runwayDays: fresh.originalRunway });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const choose = (option) => {
    const event = state.events[state.step];
    const outcome = applyBattleChoice(state, event, option);
    setState(outcome.state);
    setPending(outcome.change);
    analytics.recordBattleEventAnswered({
      category: event.category,
      optionId: option.id,
      direction: outcome.change.direction
    });
  };

  const advance = () => {
    setPending(null);
    if (state.status !== 'playing') {
      const summary = generateBattleSummary(state);
      setBestBattle({ survivedDays: summary.survivedDays, rank: summary.rank.id });
      setPhase('result');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const playAgain = () => {
    analytics.recordPlayAgain();
    setPhase('intro');
    setState(null);
  };

  if (phase === 'intro') {
    return (
      <div className="py-8">
        <BattleIntro
          preview={preview}
          hasScenario={Boolean(scenario)}
          challengeDays={challengeDays}
          onStart={start}
        />
      </div>
    );
  }

  if (phase === 'result') {
    return (
      <div className="py-8">
        <BattleResult
          summary={generateBattleSummary(state)}
          name={displayName}
          onPlayAgain={playAgain}
        />
      </div>
    );
  }

  const runway = recalculateRunway(state);
  const event = state.events[state.step];
  const isLast = state.status !== 'playing';

  return (
    <div className="py-6 space-y-4">
      <BattleHUD state={state} runway={runway} />
      {pending
        ? <BattleOutcome change={pending} onContinue={advance} isLast={isLast} />
        : event && <BattleEventCard event={event} onChoose={choose} />}
    </div>
  );
}
