/**
 * 디자인 토큰 — web/src/styles/tokens.css 이식.
 * 색상은 웹과 동일하게 유지하고, 크기/간격만 앱 관습에 맞게 조정한다.
 */
import { useColorScheme } from 'react-native';

export interface ThemeColors {
  bg: string;
  surface: string;
  fg: string;
  muted: string;
  line: string;
  accent: string;
  accentWeak: string;
  chipBg: string;
  chipBorder: string;
  chipActiveBg: string;
  chipActiveFg: string;
  shadow: string;
}

export const palette: { light: ThemeColors; dark: ThemeColors } = {
  light: {
    bg: '#ffffff',
    surface: '#ffffff',
    fg: '#111318',
    muted: '#6b7380',
    line: '#e7e9ee',
    accent: '#ff3f8a',
    accentWeak: '#ffd2e6',
    chipBg: '#f1f2f4',
    chipBorder: '#dcdee3',
    chipActiveBg: '#ff3f8a',
    chipActiveFg: '#ffffff',
    shadow: 'rgba(17, 19, 24, 0.06)',
  },
  dark: {
    bg: '#0f1114',
    surface: '#15181d',
    fg: '#e8ecf2',
    muted: '#9aa3b2',
    line: '#29303a',
    accent: '#ff4b94',
    accentWeak: '#3a1e2b',
    chipBg: '#1e232a',
    chipBorder: '#333b46',
    chipActiveBg: '#ff4b94',
    chipActiveFg: '#ffffff',
    shadow: 'rgba(0, 0, 0, 0.35)',
  },
};

export const radius = { sm: 10, md: 16, pill: 999 } as const;

/**
 * 타이포 스케일.
 * 웹(--fs-*)보다 한 단계 낮췄다 — 웹은 넓은 화면 기준이라 그대로 쓰면
 * 한 화면에 카드가 1~2개밖에 안 들어와 스크롤 부담이 컸다.
 * (웹 원본: xxl 22 / xl 20 / lg 16 / md 14 / sm 12)
 */
export const fontSize = { xxl: 20, xl: 17, lg: 15, md: 13, sm: 11, xs: 10 } as const;

/** 2px 그리드 — 여백도 함께 줄여 목록 밀도를 높였다 (웹 --page-h-pad: 16px → 14px) */
export const spacing = { xs: 4, sm: 6, md: 10, lg: 14, xl: 20, page: 14 } as const;

/** 최소 터치 타겟 */
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const MIN_TAP = 44;

export function useTheme(): ThemeColors {
  return useColorScheme() === 'dark' ? palette.dark : palette.light;
}

export function useIsDark(): boolean {
  return useColorScheme() === 'dark';
}
