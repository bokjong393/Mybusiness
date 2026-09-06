import { useCallback, useEffect, useState } from 'react';

/* Persisted state that degrades to plain state when storage is unavailable
 * (private windows, blocked site data). Never throws. */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      if (value === undefined || value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage blocked — the value still lives in memory for this session.
    }
  }, [key, value]);

  const clear = useCallback(() => {
    setValue(initialValue);
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  }, [key, initialValue]);

  return [value, setValue, clear];
}
