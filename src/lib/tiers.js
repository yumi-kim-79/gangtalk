// 포인트 → 등급 매핑 (원본 피라미드 느낌 유지)
// 필요하면 min 값만 조정하세요.
export const TIERS = [
  { key: 'high',     label: 'HIGH-END', min: 0,     brands: ['BURBERRY', 'MIU MIU', 'Chloé', 'Ferragamo'] },
  { key: 'premium',  label: 'PREMIUM',  min: 10000, brands: ['FENDI', 'CELINE', 'Bottega Veneta', 'MOYNAT'] },
  { key: 'prestige', label: 'PRESTIGE', min: 20000, brands: ['GUCCI', 'LOUIS VUITTON', 'YSL'] },
  { key: 'legend',   label: 'LEGEND',   min: 50000, brands: ['CHANEL', 'DIOR', 'HERMÈS'] },
];

// points로 현재/다음 등급과 진행률 계산
export function tierByPoints(points = 0) {
  const p = Math.max(0, Number(points) || 0);
  const sorted = [...TIERS].sort((a,b)=>a.min-b.min);

  let cur = sorted[0];
  for (const t of sorted) if (p >= t.min) cur = t;

  const curIdx = sorted.findIndex(t => t.key === cur.key);
  const next = sorted[curIdx + 1] || null;

  let pct = 100;
  let toNext = 0;
  if (next) {
    const span = next.min - cur.min;
    pct = Math.min(100, Math.round(((p - cur.min) / span) * 100));
    toNext = Math.max(0, next.min - p);
  }
  return { current: cur, next, progressPct: pct, toNext };
}
