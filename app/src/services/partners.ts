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
 * 승인 관련 필드가 하나도 없는 예전 데이터는 "기본 승인"으로 본다.
 */
export function isPartnerApproved(x: Raw): boolean {
  const active = x.active !== false;
  const approvedFlag = x.approved === true;
  const apply = str(x.applyStatus).trim().toLowerCase();
  const applyApproved = ['approved', '승인', '승인완료'].includes(apply);

  const hasExplicit =
    typeof x.approved === 'boolean' || typeof x.active === 'boolean' || !!apply;
  if (!hasExplicit) return true;

  return active && (approvedFlag || applyApproved);
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
    thumb: str(x.thumb || x.cover || x.image || x.img || x.logo).trim(),
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

/** 관리자가 지정한 카테고리별 Top5 순서 */
export function subscribePartnerTopRanks(onData: (ranks: Record<string, string[]>) => void) {
  return onSnapshot(
    doc(db, COLLECTIONS.config, 'marketing'),
    (snap: FirebaseFirestoreTypes.DocumentSnapshot) => {
      const data = (snap.data() ?? {}) as Record<string, unknown>;
      const raw = data[PARTNER_TOP_RANKS_FIELD];
      if (!raw || typeof raw !== 'object') {
        onData({});
        return;
      }
      const out: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        if (Array.isArray(v)) out[k] = v.map(String);
      }
      onData(out);
    },
    () => onData({}),
  );
}

/* ───────────────────────── 정렬 ───────────────────────── */

/** 자동 정렬 점수 — 평점 우선, 찜 수 보조 (웹 score 폴백과 동일 취지) */
export function partnerScore(p: Partner): number {
  return p.rating * 100 + p.favs;
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
