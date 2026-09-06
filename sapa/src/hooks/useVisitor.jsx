import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as analytics from '../lib/analytics.js';
import { getDisplayName, displayNameOrAnonymous, resetLocalData } from '../lib/visitor.js';
import { useLocalStorage } from './useLocalStorage.js';

/* Shared app state: who the visitor is, and the scenario/result that carries
 * between the Meter, Battle Royale and the Lab. Kept in one context so the
 * three surfaces cannot disagree about the player's numbers.
 *
 * Financial values live HERE and in localStorage only. They are never sent to
 * analytics — see lib/analytics.js. */

const SapaContext = createContext(null);

const PROMPTED_KEY = 'sapa.name_prompted';

export function SapaProvider({ children }) {
  const [name, setName] = useState(() => getDisplayName());
  const [scenario, setScenario] = useLocalStorage('sapa.scenario', null);
  const [result, setResult] = useLocalStorage('sapa.result', null);
  const [bestBattle, setBestBattle] = useLocalStorage('sapa.best_battle', null);
  const [needsNamePrompt, setNeedsNamePrompt] = useState(false);

  useEffect(() => {
    // Fire-and-forget: initializeVisitor resolves even when analytics is off.
    analytics.initializeVisitor();
    try {
      if (!localStorage.getItem(PROMPTED_KEY) && !getDisplayName()) setNeedsNamePrompt(true);
    } catch {
      // Storage blocked; skip the prompt rather than showing it every render.
    }
  }, []);

  const dismissNamePrompt = useCallback(() => {
    setNeedsNamePrompt(false);
    try { localStorage.setItem(PROMPTED_KEY, '1'); } catch { /* ignore */ }
  }, []);

  const submitName = useCallback(async (rawName) => {
    const stored = await analytics.updateDisplayName(rawName);
    if (stored) setName(stored);
    dismissNamePrompt();
    return stored;
  }, [dismissNamePrompt]);

  const resetEverything = useCallback(() => {
    resetLocalData();
    setName('');
    setScenario(null);
    setResult(null);
    setBestBattle(null);
  }, [setScenario, setResult, setBestBattle]);

  const value = useMemo(() => ({
    name,
    displayName: name || displayNameOrAnonymous(),
    hasName: Boolean(name),
    submitName,
    needsNamePrompt,
    dismissNamePrompt,
    scenario, setScenario,
    result, setResult,
    bestBattle, setBestBattle,
    resetEverything
  }), [name, submitName, needsNamePrompt, dismissNamePrompt, scenario, setScenario,
       result, setResult, bestBattle, setBestBattle, resetEverything]);

  return <SapaContext.Provider value={value}>{children}</SapaContext.Provider>;
}

export function useSapa() {
  const context = useContext(SapaContext);
  if (!context) throw new Error('useSapa must be used inside <SapaProvider>');
  return context;
}
