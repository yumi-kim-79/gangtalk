/** 업체(stores) 도메인 상수 — web/src/views/StoreFinder.vue 이식 */

export interface StoreCategory {
  key: string;
  label: string;
  badge?: string;
  emoji?: string;
}

/** 웹의 2줄 그리드용 spacer 는 앱에서 불필요하므로 제거 */
export const STORE_CATEGORIES: StoreCategory[] = [
  { key: 'all', label: '전체' },
  { key: 'hopper', label: '하퍼', badge: 'H' },
  { key: 'point5', label: '쩜오', badge: '5' },
  { key: 'ten', label: '텐카페', badge: '10' },
  { key: 'tenpro', label: '텐프로', badge: 'TP' },
  { key: 'onep', label: '1%', badge: '1%' },
  { key: 'nrb', label: '노래방', emoji: '🎤' },
  { key: 'kara', label: '가라오케', emoji: '🎶' },
  { key: 'bar', label: '바', emoji: '🍸' },
  { key: 'lounge', label: '라운지', emoji: '🛋️' },
  { key: 'etc', label: '기타', emoji: '📌' },
];

export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  STORE_CATEGORIES.map(c => [c.key, c.label]),
);

export type RegionKey = 'gn' | 'bg' | 'gg' | 'ic' | 'all';

export const REGIONS: { key: RegionKey; label: string }[] = [
  { key: 'gn', label: '강남' },
  { key: 'bg', label: '비강남' },
  { key: 'gg', label: '경기' },
  { key: 'ic', label: '인천' },
  { key: 'all', label: '전체' },
];

export const REGION_LABEL: Record<string, string> = Object.fromEntries(
  REGIONS.map(r => [r.key, r.label]),
);

export type SortKey = 'tc' | 'likes' | 'rooms';

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'tc', label: '티시 높은순' },
  { key: 'likes', label: '찜 많은순' },
  { key: 'rooms', label: '룸 많은순' },
];

/** 강톡 노출 플래그 키 — stores.exposure[EXPOSURE_KEY] */
export const EXPOSURE_KEY = 'gangtalk';

/** 목록 초기 로드 상한 (웹과 동일) */
export const STORE_FETCH_LIMIT = 100;
