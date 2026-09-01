/**
 * src/lib/partnerCategories.js
 * 제휴업체(partners) 카테고리 통일 — 관리자 + 사용자 공용 단일 소스.
 *
 * 9 카테고리 확정 (진단: docs/audit/2026-06-18-제휴업체-순서-top5-진단.md §4):
 *   ps    : 성형외과
 *   skin  : 피부
 *   beauty: 미용
 *   nail  : 네일
 *   real  : 부동산
 *   fit   : 피트니스
 *   deal  : 공동구매
 *   shop  : 상품관
 *   etc   : 기타
 *
 * 이전 불일치:
 *   admin (PartnersManagePage)  : salon, nail, ps, real, rental, fit, cafe, etc (8)
 *   user  (PartnersPage)        : ps, skin, beauty, nail, real, fit, deal, shop, etc (9)
 *
 * 마이그레이션 매핑 (LEGACY_CATEGORY_MAP):
 *   salon  → beauty  (admin 이 쓰던 미용실)
 *   cafe   → etc     (admin 이 쓰던 카페)
 *   rental → etc     (admin 이 쓰던 렌탈샵)
 *   hair   → beauty  (혹시 잔존 시)
 *
 * stores(출근업소) 카테고리와 완전 분리 — 절대 건드리지 않음.
 */

/* 확정 9 카테고리 — 순서 = UI 표시 순서 */
export const PARTNER_CATEGORIES = Object.freeze([
  { key: 'ps',     label: '성형외과' },
  { key: 'skin',   label: '피부' },
  { key: 'beauty', label: '미용' },
  { key: 'nail',   label: '네일' },
  { key: 'real',   label: '부동산' },
  { key: 'fit',    label: '피트니스' },
  { key: 'deal',   label: '공동구매' },
  { key: 'shop',   label: '상품관' },
  { key: 'etc',    label: '기타', short: 'ETC' },
])

/* 허용 키 집합 (마이그레이션 판정 + 잔여 검출용) */
export const PARTNER_CATEGORY_KEYS = Object.freeze(
  PARTNER_CATEGORIES.map(c => c.key)
)

/* 라벨 맵 */
export const PARTNER_CATEGORY_LABEL = Object.freeze(
  Object.fromEntries(PARTNER_CATEGORIES.map(c => [c.key, c.label]))
)

/* 마이그레이션 매핑표 — 옛 키 → 새 키 */
export const LEGACY_CATEGORY_MAP = Object.freeze({
  salon:  'beauty',
  cafe:   'etc',
  rental: 'etc',
  hair:   'beauty',
})

/**
 * 카테고리 키 정규화.
 * - 빈 값/모르는 값 → 'etc'
 * - 허용 키 그대로 통과
 * - LEGACY_CATEGORY_MAP 적용
 * - 한글 별칭/자유 텍스트(예: '성형외과', '피트니스') 도 매칭
 */
export function normalizePartnerCategory(raw = '') {
  const v = String(raw || '').trim().toLowerCase()
  if (!v) return 'etc'

  // 1) 허용 키 직접 통과
  if (PARTNER_CATEGORY_KEYS.includes(v)) return v

  // 2) 레거시 키 매핑
  if (LEGACY_CATEGORY_MAP[v]) return LEGACY_CATEGORY_MAP[v]

  // 3) 한글/자유 텍스트 hit-based 매칭 (예전 PartnersPage normCat 패턴)
  const hit = (...words) => words.some(w => v.includes(w))
  if (['plastic', 'plastics'].includes(v) || hit('성형')) return 'ps'
  if (['derma', 'dermatology'].includes(v) || hit('피부')) return 'skin'
  if (hit('미용', '헤어', '살롱', '미용실')) return 'beauty'
  if (hit('네일')) return 'nail'
  if (['estate', 'realestate'].includes(v) || hit('부동산')) return 'real'
  if (['fitness', 'pt', 'gym'].includes(v) || hit('피트니스', '헬스', '짐')) return 'fit'
  if (['groupbuy'].includes(v) || hit('공동구매', '공구')) return 'deal'
  if (['store', 'market'].includes(v) || hit('상품관', '상품', '스토어', '샵', '마켓')) return 'shop'

  // 그 외 (카페/렌탈 등 이미 LEGACY_CATEGORY_MAP 에서 처리됨)
  return 'etc'
}

/**
 * 라벨 헬퍼.
 */
export function partnerCatLabel(key) {
  return PARTNER_CATEGORY_LABEL[key] || '기타'
}

/**
 * 마이그레이션 필요 여부 — 정규화 결과가 입력값과 다르면 true.
 * 빈 입력은 'etc' 로 자동 매핑되지만 그것도 변경으로 간주 (스토리지에 빈 값 남기지 않음).
 */
export function needsMigration(raw) {
  const cur = String(raw || '').trim()
  if (!cur) return true
  const next = normalizePartnerCategory(cur)
  return next !== cur
}
