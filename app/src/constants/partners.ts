/**
 * 제휴관(partners) 카테고리 — web/src/lib/partnerCategories.js 이식.
 * stores(가게찾기) 카테고리와 완전히 별개다.
 */

export interface PartnerCategory {
  key: string;
  label: string;
}

/** 확정 9 카테고리 — 순서 = UI 표시 순서 */
export const PARTNER_CATEGORIES: PartnerCategory[] = [
  { key: 'ps', label: '성형외과' },
  { key: 'skin', label: '피부' },
  { key: 'beauty', label: '미용' },
  { key: 'nail', label: '네일' },
  { key: 'real', label: '부동산' },
  { key: 'fit', label: '피트니스' },
  { key: 'deal', label: '공동구매' },
  { key: 'shop', label: '상품관' },
  { key: 'etc', label: '기타' },
];

export const PARTNER_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  PARTNER_CATEGORIES.map(c => [c.key, c.label]),
);

/** 옛 키 → 새 키 (웹 LEGACY_CATEGORY_MAP) */
const LEGACY_CATEGORY_MAP: Record<string, string> = {
  salon: 'beauty',
  cafe: 'etc',
  rental: 'etc',
  hair: 'beauty',
};

/** 한글 별칭 — 자유 입력된 카테고리도 매칭 */
const KO_ALIAS: Record<string, string> = {
  성형외과: 'ps',
  성형: 'ps',
  피부: 'skin',
  피부과: 'skin',
  미용: 'beauty',
  미용실: 'beauty',
  헤어: 'beauty',
  네일: 'nail',
  부동산: 'real',
  피트니스: 'fit',
  헬스: 'fit',
  공동구매: 'deal',
  상품관: 'shop',
  기타: 'etc',
};

/** 웹 normalizePartnerCategory 이식 */
export function normalizePartnerCategory(raw: unknown): string {
  const v = String(raw ?? '').trim().toLowerCase();
  if (!v) return 'etc';
  if (PARTNER_CATEGORY_LABEL[v]) return v;
  if (LEGACY_CATEGORY_MAP[v]) return LEGACY_CATEGORY_MAP[v];
  const ko = KO_ALIAS[String(raw ?? '').trim()];
  return ko ?? 'etc';
}

/** Top5 순서를 담는 config/marketing 필드명 (웹과 동일) */
export const PARTNER_TOP_RANKS_FIELD = 'partnerTopRanks';

export const PARTNER_FETCH_LIMIT = 200;
export const TOP_N = 5;
