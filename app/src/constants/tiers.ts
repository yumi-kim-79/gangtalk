/**
 * 회원 등급 — 웹 `components/mypage/UserSection.vue` 의 TIERS 이식.
 * 보유 포인트 기준이며 임계값·라벨·순서가 웹과 **완전히 같아야** 한다.
 */
export interface Tier {
  key: string;
  label: string;
  /** 이 등급이 되는 최소 포인트 */
  threshold: number;
}

export const TIERS: Tier[] = [
  { key: 'daiso', label: '다이소', threshold: 10_000 },
  { key: 'newbalance', label: '뉴발란스', threshold: 100_000 },
  { key: 'nike', label: '나이키', threshold: 300_000 },
  { key: 'ck', label: 'CK', threshold: 500_000 },
  { key: 'ysl', label: '생로랑', threshold: 1_000_000 },
  { key: 'prada', label: '프라다', threshold: 5_000_000 },
  { key: 'gucci', label: '구찌', threshold: 20_000_000 },
  { key: 'lv', label: '루이비통', threshold: 30_000_000 },
  { key: 'chanel', label: '샤넬', threshold: 50_000_000 },
  { key: 'hermes', label: '에르메스', threshold: 100_000_000 },
];

export interface TierInfo {
  current: Tier;
  next: Tier | null;
  /** 다음 등급까지 진행률 0~100 */
  progressPct: number;
  /** 다음 등급까지 남은 포인트 */
  toNext: number;
}

/** 웹 tier / nextTier / progressPct / pointToNext 계산과 동일 */
export function tierByPoints(points: number): TierInfo {
  const p = Number(points) || 0;

  let current = TIERS[0];
  for (const t of TIERS) {
    if (p >= t.threshold) current = t;
    else break;
  }

  const idx = TIERS.findIndex(t => t.key === current.key);
  const next = TIERS[idx + 1] ?? null;

  if (!next) return { current, next: null, progressPct: 100, toNext: 0 };

  const span = next.threshold - current.threshold;
  const prog = Math.max(0, Math.min(1, (p - current.threshold) / span));

  return {
    current,
    next,
    progressPct: Math.round(prog * 100),
    toNext: Math.max(0, next.threshold - p),
  };
}

/**
 * 등급 배지 이미지 — 웹 `public/tiers/badges/badge_{key}.png` 를 그대로 복사해 왔다.
 * (웹 UserSection.vue:382 `tierBadgeSrc` 와 같은 그림)
 *
 * babel module-resolver 의 extensions 목록에 .png 가 없어 `@/` 별칭이 듣지 않는다.
 * 반드시 상대경로 require 로 적을 것.
 */
export const TIER_BADGES: Record<string, number> = {
  daiso: require('../assets/tiers/badge_daiso.png'),
  newbalance: require('../assets/tiers/badge_newbalance.png'),
  nike: require('../assets/tiers/badge_nike.png'),
  ck: require('../assets/tiers/badge_ck.png'),
  ysl: require('../assets/tiers/badge_ysl.png'),
  prada: require('../assets/tiers/badge_prada.png'),
  gucci: require('../assets/tiers/badge_gucci.png'),
  lv: require('../assets/tiers/badge_lv.png'),
  chanel: require('../assets/tiers/badge_chanel.png'),
  hermes: require('../assets/tiers/badge_hermes.png'),
};

/** 친구 가입 시 서로 받는 포인트 — 웹 마이페이지 문구와 동일 */
export const REFERRAL_REWARD_POINT = 20_000;
