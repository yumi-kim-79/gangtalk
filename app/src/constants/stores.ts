/** 업체(stores) 도메인 상수 — web/src/views/StoreFinder.vue 이식 */

export interface StoreCategory {
  key: string;
  label: string;
  /** 하퍼/쩜오 등 유형 뱃지 (웹과 동일) */
  badge?: string;
}

/**
 * 웹의 2줄 그리드용 spacer 는 앱에서 불필요하므로 제거.
 * 웹이 쓰던 이모지(🎤🎶🍸🛋️📌)는 기기에 따라 tofu 로 깨져 라벨만 남겼다.
 */
export const STORE_CATEGORIES: StoreCategory[] = [
  { key: 'all', label: '전체' },
  { key: 'hopper', label: '하퍼', badge: 'H' },
  { key: 'point5', label: '쩜오', badge: '5' },
  { key: 'ten', label: '텐카페', badge: '10' },
  { key: 'tenpro', label: '텐프로', badge: 'TP' },
  { key: 'onep', label: '1%', badge: '1%' },
  { key: 'nrb', label: '노래방' },
  { key: 'kara', label: '가라오케' },
  { key: 'bar', label: '바' },
  { key: 'lounge', label: '라운지' },
  { key: 'etc', label: '기타' },
];

/** 현황판 카드 상한 — 웹 MainPage.vue:91 의 slice(0, 20) 과 같은 값 */
export const HOME_STORE_LIMIT = 20;

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

/**
 * 목록 정렬 옵션.
 * 'none' = 정렬하지 않고 입력 순서(Firestore updatedAt desc)를 유지한다.
 * 현황판이 이걸 쓴다 — 웹 MainPage 가 정렬을 하지 않기 때문(MainPage.vue:1936-1951).
 */
export type SortOption = SortKey | 'none';

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'tc', label: '티시 높은순' },
  { key: 'likes', label: '찜 많은순' },
  { key: 'rooms', label: '룸 많은순' },
];

/**
 * 노출 플래그 키 — stores.exposure[key].
 * 웹 PR #124~126 에서 현황판(홈)과 가게찾기 노출이 분리됐다.
 */
export const EXPOSURE_KEY = 'gangtalk';
export const EXPOSURE_KEY_DASHBOARD = 'dashboard';

/**
 * 목록 초기 로드 상한.
 * 웹(MainPage.vue:1210 / StoreFinder)은 limit 없이 전부 읽는다.
 * 100 이던 시절에는 업체가 100곳을 넘으면 앱 현황판에서만 오래된 업소가 사라졌다.
 */
export const STORE_FETCH_LIMIT = 300;

/**
 * rooms_biz 로드 상한.
 * stores 와 달리 정렬 기준이 없어 같은 100 으로 두면 stores 100건과
 * 서로 다른 100건이 잡혀 일부 업소의 지표가 비는 일이 생긴다. 넉넉히 잡는다.
 */
export const ROOMS_BIZ_FETCH_LIMIT = 300;
