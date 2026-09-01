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
import type { RoomsBizDoc, Store, StoreDoc } from '@/types/store';

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


/* ───────────────────────── 현황판 병합 (관리자 입력 반영) ───────────────────────── */

/**
 * 웹 MainPage.applyRoomsBiz 이식.
 *
 * ⚠️ 가게찾기(StoreFinder)의 병합과 필드가 다르다.
 *   - 관리자(StoresManagePage.saveAllMetrics)는 두 곳에 동시에 쓴다:
 *       stores/{id}      : match, persons, totalRooms, maxPersons, statusMode, status
 *       rooms_biz/{id}   : needRooms, needPeople, totalRooms, manualSaved
 *   - 즉 현황판 숫자의 1차 소스는 rooms_biz.needRooms/needPeople,
 *     비어 있으면 stores.match/persons 로 폴백한다.
 *
 * 웹이 겪었던 버그를 그대로 방어한다 (docs/audit/2026-06-19-현황판-실시간데이터-0덮어쓰기-진단.md):
 *   빈 rooms_biz 문서의 0 이 stores 의 실제 값을 덮어써 "10초 후 지표 0" 이 되던 문제 →
 *   `hasInput` 으로 "진짜 0" 과 "데이터 없음" 을 구분한다.
 */
function readRoomsBiz(rb: RoomsBizDoc | undefined) {
  if (!rb) return null;
  const inputRooms = num(rb.needRooms);
  const inputPeople = num(rb.needPeople);
  const manualSaved = rb.manualSaved === true;

  // 관리자/업체 수동 저장은 0/0 도 의도된 값으로 존중한다
  const rooms = manualSaved ? Math.max(0, inputRooms) : Math.max(0, inputRooms);
  const people = manualSaved ? Math.max(0, inputPeople) : Math.max(0, inputPeople);

  const hasInput = manualSaved || inputRooms > 0 || inputPeople > 0;
  const hasPositive = rooms > 0 || people > 0;

  return {
    rooms,
    people,
    manualSaved,
    congestion: rb.congestion ? String(rb.congestion) : null,
    // 입력이 없는 빈 문서는 무시 → stores 값으로 폴백
    active: hasInput && (hasPositive || manualSaved),
  };
}

/** stores + rooms_biz 를 현황판 기준으로 병합 */
export function applyRoomsBiz(
  rawStores: StoreDoc[],
  rbMap: Map<string, RoomsBizDoc>,
): Store[] {
  return rawStores.map(raw => {
    const s: Store = { ...raw };
    const rb = readRoomsBiz(rbMap.get(String(raw.id)));

    const legacyMatch = num(raw.match ?? raw.needRooms);
    const legacyPersons = num(raw.persons ?? raw.needPeople);

    s.match = rb?.active ? rb.rooms : legacyMatch;
    s.persons = rb?.active ? rb.people : legacyPersons;
    s.totalRooms = num(raw.totalRooms ?? raw.rooms);
    s.maxPersons = num(raw.maxPersons ?? raw.capacity ?? raw.max);
    if (rb?.congestion) s.congestion = rb.congestion;

    return s;
  });
}

/**
 * 최종 혼잡도.
 * 우선순위: 관리자 수동(statusMode==='manual') → rooms_biz.congestion → 자동계산
 */
export function resolveStatus(s: Store, all: Store[]): StatusLabel {
  if (String(s.statusMode ?? 'auto') === 'manual') {
    const saved = String(s.status ?? '');
    if (saved === '여유') return '좋음';
    if (saved === '혼잡') return '나쁨';
    if (saved === '좋음' || saved === '보통' || saved === '나쁨') return saved;
  }
  if (s.congestion) {
    const cg = s.congestion;
    if (cg === '여유') return '좋음';
    if (cg === '혼잡') return '나쁨';
    if (cg === '좋음' || cg === '보통' || cg === '나쁨') return cg;
  }
  return computeStatus(s, all);
}
