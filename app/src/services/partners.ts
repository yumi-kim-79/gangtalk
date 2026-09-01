/**
 * 제휴관 — web/src/pages/PartnersPage.vue 이식.
 * partners 컬렉션은 stores 와 완전히 별개다.
 */
import {
  collection,
  doc,
  limit as fbLimit,
  onSnapshot,
  query,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { COLLECTIONS } from '@/constants/app';
import {
  PARTNER_FETCH_LIMIT,
  PARTNER_ORDER_FIELD,
  PARTNER_TOP_RANKS_FIELD,
  TOP_N,
  normalizePartnerCategory,
} from '@/constants/partners';
import { db } from '@/services/firebase';
import type { Partner } from '@/types/partner';

type Raw = Record<string, unknown>;
const str = (v: unknown, f = ''): string => (v == null ? f : String(v));
const posInt = (v: unknown): number => Math.max(0, Number(v) || 0);

/* ───────────────────────── 노출 조건 ───────────────────────── */

/**
 * 승인 여부 (웹 isPartnerApproved 이식).
 *
 * 관리자 PartnersManagePage 의 배지와 **같은 기준**이어야 한다:
 *   비활성 = active === false / 미승인 = approved === false.
 * 필드가 없으면 관리자 화면에 "활성 · 승인" 으로 보이므로 여기서도 승인으로 본다.
 * (이 규칙이 어긋나서, approved 필드가 없는 업체를 비활성화→활성화 하면
 *  관리자에는 "활성 · 승인" 인데 사용자 화면에서만 사라지는 문제가 있었다)
 */
export function isPartnerApproved(x: Raw): boolean {
  if (x.active === false) return false;
  if (x.approved === true) return true;
  if (x.approved === false) return false;

  const apply = str(x.applyStatus).trim().toLowerCase();
  if (!apply) return true;
  return ['approved', 'active', '승인', '승인완료'].includes(apply);
}

/** 광고 노출 기간 (웹 isActiveAdPartner 이식) */
export function isActiveAdPartner(x: Raw): boolean {
  const start = Number(x.adStart ?? 0);
  const end = Number(x.adEnd ?? 0);
  if (!start && !end) return true;
  const now = Date.now();
  if (start && now < start) return false;
  if (end && now >= end) return false;
  return true;
}

/* ───────────────────────── 정규화 ───────────────────────── */

/**
 * 썸네일 후보 (웹 pickThumb 이식).
 * 배열 필드(images/photos/pictures)는 첫 문자열을 쓴다.
 */
function pickPartnerThumb(x: Raw): string {
  const cands: unknown[] = [
    x.thumb, x.image, x.logo, x.photoUrl, x.cover, x.banner,
    x.thumbnail, x.thumbUrl, x.pic, x.photo, x.img,
    x.images, x.photos, x.pictures,
    (x.tags as Raw | undefined)?.thumb,
  ];
  for (const c of cands) {
    if (typeof c === 'string' && c.trim()) return c.trim();
    if (Array.isArray(c)) {
      const first = c.find(v => typeof v === 'string' && v.trim());
      if (first) return String(first).trim();
    }
  }
  return '';
}

function normalizePartner(id: string, x: Raw): Partner {
  return {
    id,
    name: str(x.name),
    manager: str(x.manager || x.managerName),
    region: str(x.region),
    address: str(x.address),
    category: normalizePartnerCategory(x.category ?? x.categoryRaw),
    categoryRaw: str(x.category || x.categoryRaw),
    rating: Math.max(0, Number(x.rating ?? 4.5) || 0),
    thumb: pickPartnerThumb(x),
    link: str(x.link),
    tags: Array.isArray(x.tags) ? (x.tags as unknown[]).map(t => str(t)) : [],
    intro: str(x.intro || x.desc || x.about || x.bio).trim(),
    benefits: str(x.benefits),
    favs: posInt(x.favs ?? x.likes ?? x.hearts ?? x.bookmarks),
    lat: Number(x.lat) || undefined,
    lng: Number(x.lng) || undefined,
  };
}

/* ───────────────────────── 구독 ───────────────────────── */

export function subscribePartners(
  onData: (partners: Partner[]) => void,
  onError?: (e: unknown) => void,
) {
  return onSnapshot(
    query(collection(db, COLLECTIONS.partners), fbLimit(PARTNER_FETCH_LIMIT)),
    (snap: FirebaseFirestoreTypes.QuerySnapshot) => {
      const rows: Partner[] = [];
      snap.docs.forEach(d => {
        const x = (d.data() ?? {}) as Raw;
        // 미승인·기간 만료 업체는 사용자 화면에서 제외 (웹과 동일)
        if (!isPartnerApproved(x)) return;
        if (!isActiveAdPartner(x)) return;
        rows.push(normalizePartner(d.id, x));
      });
      onData(rows);
    },
    e => onError?.(e),
  );
}

/** 제휴관 관련 관리자 설정 (config/marketing 1개 문서) */
export interface PartnerConfig {
  /** 전체 목록 순서 — 관리자 PartnersManagePage 드래그 결과 */
  order: string[];
  /** 카테고리별 Top5 순서 — 관리자 PartnerTop5ManagePage 결과 */
  ranks: Record<string, string[]>;
}

export const EMPTY_PARTNER_CONFIG: PartnerConfig = { order: [], ranks: {} };

/**
 * partnerOrder + partnerTopRanks 를 한 번의 onSnapshot 으로 구독한다.
 * (웹 PartnersPage.subPartnerOrder 와 동일 — 같은 문서라 구독을 나누면 비용만 2배)
 */
export function subscribePartnerConfig(onData: (cfg: PartnerConfig) => void) {
  return onSnapshot(
    doc(db, COLLECTIONS.config, 'marketing'),
    (snap: FirebaseFirestoreTypes.DocumentSnapshot) => {
      const data = (snap.data() ?? {}) as Record<string, unknown>;

      const rawOrder = data[PARTNER_ORDER_FIELD];
      const order = Array.isArray(rawOrder) ? rawOrder.map(String) : [];

      const rawRanks = data[PARTNER_TOP_RANKS_FIELD];
      const ranks: Record<string, string[]> = {};
      if (rawRanks && typeof rawRanks === 'object') {
        for (const [k, v] of Object.entries(rawRanks as Record<string, unknown>)) {
          if (Array.isArray(v)) ranks[k] = v.map(String);
        }
      }

      onData({ order, ranks });
    },
    () => onData(EMPTY_PARTNER_CONFIG),
  );
}

/**
 * 관리자 지정 순서 적용 (웹 PartnersPage.filtered 이식).
 * 순서에 없는 업체는 뒤로 밀되 원래 상대 순서를 유지한다.
 */
export function applyPartnerOrder(list: Partner[], order: string[]): Partner[] {
  if (!order.length) return list;
  const pos = new Map(order.map((id, idx) => [String(id), idx]));
  return list
    .map((p, idx) => ({ p, idx }))
    .sort((a, b) => {
      const ai = pos.get(a.p.id) ?? Infinity;
      const bi = pos.get(b.p.id) ?? Infinity;
      if (ai !== bi) return ai === bi ? 0 : ai < bi ? -1 : 1;
      return a.idx - b.idx;
    })
    .map(x => x.p);
}

/* ───────────────────────── 정렬 ───────────────────────── */

/**
 * 자동 정렬 점수 — 웹 PartnersPage.score 와 **동일한 공식**이어야 한다.
 * (웹: rating*100 + tags.length*3, 반올림. favs 는 쓰지 않는다)
 */
export function partnerScore(p: Partner): number {
  return Math.round(p.rating * 100 + p.tags.length * 3);
}

/* ───────────────────────── 검색 ───────────────────────── */

const norm = (v: unknown): string => String(v ?? '').toLowerCase().trim();

/** 검색 대상 텍스트 (웹 searchTextOf 이식) */
export function partnerSearchText(p: Partner): string {
  return [p.name, p.manager, p.intro, p.benefits, p.tags.join(' '), p.address]
    .map(norm)
    .filter(Boolean)
    .join(' ');
}

/** 공백으로 나눈 토큰이 **모두** 포함돼야 매칭 (웹 matchesQuery 이식) */
export function matchesPartnerQuery(p: Partner, keyword: string): boolean {
  const toks = norm(keyword).split(/\s+/).filter(Boolean);
  if (!toks.length) return true;
  const text = partnerSearchText(p);
  if (!text) return false;
  return toks.every(t => text.includes(t));
}

/**
 * 카테고리별 Top5 (웹 topByCat 이식).
 * 1) 관리자가 partnerTopRanks 로 지정한 순서 우선 (삭제·카테고리 변경된 항목은 건너뜀)
 * 2) 없으면 score 자동 정렬 폴백
 */
export function topByCategory(
  partners: Partner[],
  ranks: Record<string, string[]>,
  categoryKey: string,
): Partner[] {
  const ids = ranks[categoryKey] ?? [];
  if (ids.length) {
    const byId = new Map(partners.map(p => [p.id, p]));
    const ordered: Partner[] = [];
    for (const id of ids) {
      const p = byId.get(String(id));
      if (!p || p.category !== categoryKey) continue;
      ordered.push(p);
      if (ordered.length >= TOP_N) break;
    }
    if (ordered.length) return ordered;
  }
  return partners
    .filter(p => p.category === categoryKey)
    .sort((a, b) => partnerScore(b) - partnerScore(a))
    .slice(0, TOP_N);
}

/** 혜택 문구가 가격/할인 형태인지 — 강조 색을 줄지 판단 (웹 isPriceLike) */
export function isPriceLike(text: string): boolean {
  const s = String(text ?? '');
  return /[\d,]/.test(s) || /(원|만원|%|할인|dc)/i.test(s);
}
