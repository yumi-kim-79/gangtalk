import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 테마 모드 — 웹 store/theme.js 와 같은 값을 쓴다.
 * 'white' = 주간, 'black' = 야간. 기본은 주간이며 **OS 설정을 따르지 않는다**
 * (웹이 그렇게 동작하고, 웹/앱이 같아야 한다).
 */
export type ThemeMode = 'white' | 'black';

const KEY = 'theme';

function normalize(v: unknown): ThemeMode {
  const s = String(v ?? '').toLowerCase();
  return s === 'black' || s === 'dark' ? 'black' : 'white';
}

interface Ctx {
  mode: ThemeMode;
  isDark: boolean;
  toggle: () => void;
  setMode: (m: ThemeMode) => void;
}

const ThemeCtx = createContext<Ctx>({
  mode: 'white',
  isDark: false,
  toggle: () => {},
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('white');

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(KEY)
      .then(v => {
        if (alive && v) setModeState(normalize(v));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    const next = normalize(m);
    setModeState(next);
    AsyncStorage.setItem(KEY, next).catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    setModeState(prev => {
      const next: ThemeMode = prev === 'white' ? 'black' : 'white';
      AsyncStorage.setItem(KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<Ctx>(
    () => ({ mode, isDark: mode === 'black', toggle, setMode }),
    [mode, toggle, setMode],
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useThemeMode(): Ctx {
  return useContext(ThemeCtx);
}
