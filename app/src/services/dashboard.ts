/**
 * 홈(현황판) 전용 계산 — web/src/pages/MainPage.vue 이식.
 * 혼잡도는 rooms_biz 의 맞출방/필요인원을 카테고리별 분포로 정규화해 산출한다.
 */
import {
  doc,
  onSnapshot,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { COLLECTIONS } from '@/constants/app';
import { db } from '@/services/firebase';
import { num } from '@/services/stores';
import type { Store } from '@/types/store';

export type StatusLabel = '좋음' | '보통' | '나쁨';
export type StatusTone = 'ok' | 'mid' | 'busy';

function normalize01(v: number, min: number, max: number): number | null {
  if (!Number.isFinite(v) || !Number.isFinite(min) || !Number.isFinite(max)) return null;
  if (max <= min) return v > 0 ? 1 : 0;
  return Math.max(0, Math.min(1, (v - min) / (max - min)));
}

/** 같은 카테고리 업체들의 맞출방/필요인원 분포 (정규화 기준) */
function rangeByCategory(all: Store[], cat: string) {
  const list = all.filter(s => String(s.category ?? '') === String(cat ?? ''));
  if (!list.length) return { mMin: 0, mMax: 0, pMin: 0, pMax: 0 };
  let mMin = Infinity;
  let mMax = -Infinity;
  let pMin = Infinity;
  let pMax = -Infinity;
  for (const s of list) {
    const m = num(s.match);
    const p = num(s.persons);
    mMin = Math.min(mMin, m);
    mMax = Math.max(mMax, m);
    pMin = Math.min(pMin, p);
    pMax = Math.max(pMax, p);
  }
  return {
    mMin: Number.isFinite(mMin) ? mMin : 0,
    mMax: Number.isFinite(mMax) ? mMax : 0,
    pMin: Number.isFinite(pMin) ? pMin : 0,
    pMax: Number.isFinite(pMax) ? pMax : 0,
  };
}

/** 웹 computeStatus 이식 */
export function computeStatus(s: Store, all: Store[]): StatusLabel {
  // 수동 지정이면 그 값을 그대로 (예전 라벨 여유/혼잡도 해석)
  if (String((s as { statusMode?: string }).statusMode ?? 'auto') === 'manual') {
    const saved = String((s as { status?: string }).status ?? '');
    if (saved === '여유') return '좋음';
    if (saved === '혼잡') return '나쁨';
    if (saved === '좋음' || saved === '보통' || saved === '나쁨') return saved;
  }

  const match = num(s.match);
  const persons = num(s.persons);
  const { mMin, mMax, pMin, pMax } = rangeByCategory(all, String(s.category ?? 'etc'));

  // ① 카테고리 분포로 정규화
  const mN = normalize01(match, mMin, mMax);
  const pN = normalize01(persons, pMin, pMax);
  if (mN != null && pN != null) return toLabel((mN + pN) / 2);

  // ② 최대 방수/인원 대비 비율
  const totalRooms = num(s.totalRooms ?? s.rooms);
  const maxPersons = num((s as { maxPersons?: number; capacity?: number }).maxPersons ?? (s as { capacity?: number }).capacity);
  const rRooms = totalRooms > 0 ? match / totalRooms : null;
  const rPeople = maxPersons > 0 ? persons / maxPersons : null;

  let availability = 1;
  if (rPeople != null && rRooms != null) availability = (rPeople + rRooms) / 2;
  else if (rPeople != null) availability = rPeople;
  else if (rRooms != null) availability = rRooms;

  return toLabel(availability);
}

function toLabel(availability: number): StatusLabel {
  if (availability >= 0.6) return '좋음';
  if (availability >= 0.3) return '보통';
  return '나쁨';
}

export function statusTone(label: StatusLabel): StatusTone {
  if (label === '좋음') return 'ok';
  if (label === '나쁨') return 'busy';
  return 'mid';
}

/* ───────────────────────── 평점 표시 ───────────────────────── */

/** 웹 ratingOf — 값이 없으면 4.8 로 표기 (웹과 동일) */
export function ratingOf(s: Store): string {
  const r = Number(s.rating ?? (s as { stars?: number }).stars ?? (s as { score?: number }).score);
  return Number.isFinite(r) && r > 0 ? r.toFixed(1) : '4.8';
}

/** 웹 reviewCountOf — 값이 없으면 128 로 표기 (웹과 동일) */
export function reviewCountOf(s: Store): number {
  const n = Number(
    (s as { reviewCount?: number }).reviewCount ??
      (s as { reviews?: number }).reviews ??
      (s as { reviewsCount?: number }).reviewsCount,
  );
  return Number.isFinite(n) && n >= 0 ? n : 128;
}

/* ───────────────────────── config/marketing ───────────────────────── */

/** 관리자가 웹에서 지정한 홈 노출 순서 */
export function subscribeHomeOrder(onData: (ids: string[]) => void) {
  return onSnapshot(
    doc(db, COLLECTIONS.config, 'marketing'),
    (snap: FirebaseFirestoreTypes.DocumentSnapshot) => {
      const data = (snap.data() ?? {}) as { homeOrder?: unknown };
      onData(Array.isArray(data.homeOrder) ? data.homeOrder.map(String) : []);
    },
    () => onData([]),
  );
}

/** 관리자 지정 순서를 앞으로 끌어올린다 (미지정 업체는 기존 순서 유지) */
export function applyHomeOrder(stores: Store[], order: string[]): Store[] {
  if (!order.length) return stores;
  const pos = new Map(order.map((id, i) => [String(id), i]));
  return stores
    .slice()
    .sort(
      (a, b) =>
        (pos.get(String(a.id)) ?? Infinity) - (pos.get(String(b.id)) ?? Infinity),
    );
}
