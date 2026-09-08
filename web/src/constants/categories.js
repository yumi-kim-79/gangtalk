/**
 * 업소 카테고리 — 웹 전역 단일 출처.
 *
 * 예전에는 MainPage 와 StoreFinder 가 각각 자기 표를 들고 있었고, 한 파일 안에서도
 * 칩용/라벨용이 갈려 있었다. 그래서 같은 업종이 화면마다 '바(Bar)' / '바(bar)' / '바',
 * '일프로' / '1%' 로 달리 보였다. 표는 여기 하나뿐이어야 한다.
 * 앱 대응: app/src/constants/stores.ts (키·라벨·순서가 같아야 한다)
 *
 * chip: false 는 "칩으로는 고를 수 없지만 기존 데이터의 라벨은 살려 둔다" 는 뜻이다.
 * (가라오케는 2026-09-08 요청으로 칩에서 뺐다. 이미 kara 로 등록된 업체가 있어
 *  라벨까지 지우면 카드에 업종이 빈칸으로 나온다.)
 */
export const STORE_CATEGORIES = [
  { key: 'all', label: '전체', icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>' },
  { key: 'hopper', label: '하퍼', badge: 'H', icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h14l-2 6a5 5 0 0 1-10 0z"/><path d="M12 10v8"/><path d="M8 21h8"/></svg>' },
  { key: 'point5', label: '쩜오', badge: '5', icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 13c0 1.5 1.3 2.5 3 2.5s3-1 3-2.5-1.3-2.5-3-2.5h-1l1-3h3"/></svg>' },
  { key: 'ten', label: '텐카페', badge: '10', icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11h14a4 4 0 0 1 0 8H3z"/><path d="M17 13h2a2 2 0 0 1 0 4h-2"/><path d="M7 4v3M11 4v3M15 4v3"/></svg>' },
  { key: 'tenpro', label: '텐프로', badge: 'TP', icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01z"/></svg>' },
  { key: 'onep', label: '1%', badge: '1%', icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 6h2v12"/><path d="M8 18h6"/></svg>' },
  { key: 'nrb', label: '노래방', icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="3" width="4" height="11" rx="2"/><path d="M5 11a5 5 0 0 0 10 0"/><path d="M10 16v4"/><path d="M7 20h6"/></svg>' },
  { key: 'bar', label: '바', icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h14l-7 9z"/><path d="M12 12v8"/><path d="M8 21h8"/></svg>' },
  { key: 'lounge', label: '라운지', icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3"/><path d="M3 11h18v5H3z"/><path d="M6 16v3M18 16v3"/></svg>' },
  { key: 'etc', label: '기타', icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>' },
  { key: 'kara', label: '가라오케', chip: false, icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>' },
]

/** 칩으로 노출할 카테고리 (5열 격자 2줄 = 10개) */
export const CATEGORY_CHIPS = STORE_CATEGORIES.filter(c => c.chip !== false)

/** key → 라벨. 숨긴 카테고리도 포함한다 */
export const CATEGORY_LABEL = Object.fromEntries(
  STORE_CATEGORIES.map(c => [c.key, c.label]),
)

export const CATEGORY_ICON = Object.fromEntries(
  STORE_CATEGORIES.map(c => [c.key, c.icon]),
)

export function categoryLabel(key) {
  const k = String(key ?? '')
  return CATEGORY_LABEL[k] || k
}
