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
import { congestionFromScore, normName, parseNeedFromPastedText } from '@/services/pastedText';
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

/**
 * 평점 표기. 값이 없으면 0.0.
 * 2026-09-10: 웹·앱 모두 값이 없을 때 4.8 을 지어내고 있어, 별점을 한 번도 안 받은
 * 업소가 전부 같은 점수로 보였다. 없으면 없다고 보여 준다.
 */
export function ratingOf(s: Store): string {
  const r = Number(s.rating ?? (s as { stars?: number }).stars ?? (s as { score?: number }).score);
  return Number.isFinite(r) && r > 0 ? r.toFixed(1) : '0.0';
}

/**
 * 리뷰(별점) 개수. ratingCount 가 정본 — stores/{id}/ratings 문서와 함께 갱신된다.
 * 예전에는 값이 없으면 128 을 지어내 전 업소가 '리뷰 128' 로 보였다.
 */
export function reviewCountOf(s: Store): number {
  const n = Number(
    (s as { ratingCount?: number }).ratingCount ??
      (s as { reviewCount?: number }).reviewCount ??
      (s as { reviews?: number }).reviews ??
      (s as { reviewsCount?: number }).reviewsCount,
  );
  return Number.isFinite(n) && n >= 0 ? n : 0;
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
  return stores.slice().sort((a, b) => {
    const ai = pos.get(String(a.id)) ?? Infinity;
    const bi = pos.get(String(b.id)) ?? Infinity;
    // Infinity - Infinity = NaN 이라 비교자가 망가진다. 미지정끼리는 기존 순서 유지
    if (ai === bi) return 0;
    return ai - bi;
  });
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

  let rooms = 0;
  let people = 0;
  let pastedText = '';

  if (manualSaved) {
    // 관리자/업체 수동 저장은 0/0 도 의도된 값으로 존중하고 파싱을 건너뛴다
    rooms = Math.max(0, inputRooms);
    people = Math.max(0, inputPeople);
  } else {
    // ChatBiz 자동 갱신 업소는 needRooms 대신 붙여넣기 원문만 남긴다.
    // 이 단계가 없어 앱만 0 으로 표시되던 문제. (웹 MainPage.vue:1509)
    pastedText = String(rb.lastPastedText || rb.manualText || rb.bannerText || '').trim();
    if (pastedText) {
      const parsed = parseNeedFromPastedText(pastedText);
      rooms = num(parsed.rooms);
      people = num(parsed.people);
    }
    // 파싱이 0/0 이거나 줄바꿈 없는 한 줄이면 시트/수동값을 우선 채택
    const isOneLine = !!pastedText && !/\n/.test(pastedText);
    if ((rooms === 0 && people === 0) || isOneLine) {
      rooms = Math.max(rooms, inputRooms);
      people = Math.max(people, inputPeople);
    }
    rooms = Math.max(0, rooms);
    people = Math.max(0, people);
  }

  // "진짜 0" 과 "데이터 없음" 을 구분한다.
  // pastedText 존재만으로는 통과시키지 않는다 — "응" 같은 한 줄 메시지가
  // stores 의 실제 값을 0 으로 덮어쓰던 사고(웹 2026-06-19 진단)를 그대로 방어.
  const hasInput = manualSaved || inputRooms > 0 || inputPeople > 0 || rooms > 0 || people > 0;
  const hasPositive = rooms > 0 || people > 0;

  return {
    rooms,
    people,
    manualSaved,
    congestion:
      (rb.congestion ? String(rb.congestion) : null) || congestionFromScore(rb.congestionScore),
    // 입력이 없는 빈 문서는 무시 → stores 값으로 폴백
    active: hasInput && (hasPositive || manualSaved),
  };
}

/** 동명 업소 충돌 마커 — 잘못된 매핑보다 매핑 안 하고 legacy 폴백이 안전 */
const AMBIGUOUS = '__AMBIGUOUS__';

function buildIndex(pairs: Array<[string, string]>): Map<string, string> {
  const m = new Map<string, string>();
  for (const [key, id] of pairs) {
    if (!key || !id) continue;
    const prev = m.get(key);
    if (prev && prev !== AMBIGUOUS && prev !== id) m.set(key, AMBIGUOUS);
    else if (!prev) m.set(key, id);
  }
  return m;
}

/**
 * store 에 붙일 rooms_biz 문서를 찾는다.
 * 웹은 4단계로 매칭하는데(MainPage.vue:1450-1472) 앱은 id 계열 3키만 봤다.
 * 이름/vendorKey 로만 연결된 업소가 앱에서만 legacy 값으로 떨어지던 원인.
 */
function resolveRoomsBiz(
  raw: StoreDoc,
  rbMap: Map<string, RoomsBizDoc>,
  byName: Map<string, RoomsBizDoc>,
  byVendor: Map<string, RoomsBizDoc>,
): RoomsBizDoc | undefined {
  const direct = rbMap.get(String(raw.id));
  if (direct) return direct;

  const nm = normName(raw.name);
  if (nm) {
    const hit = byName.get(nm);
    if (hit) return hit;
  }

  const vk = String(raw.vendorKey ?? '').toLowerCase();
  if (vk) {
    const hit = byVendor.get(vk);
    if (hit) return hit;
  }
  return undefined;
}

/** stores + rooms_biz 를 현황판 기준으로 병합 */
export function applyRoomsBiz(
  rawStores: StoreDoc[],
  rbMap: Map<string, RoomsBizDoc>,
): Store[] {
  // rooms_biz 문서를 이름/vendorKey 로도 찾을 수 있게 역인덱스를 만든다.
  // rbMap 은 한 문서를 여러 키로 가리키므로 doc.id 로 중복을 제거한다.
  const docs = new Map<string, RoomsBizDoc>();
  rbMap.forEach(rb => docs.set(String(rb.id), rb));
  const uniq = Array.from(docs.values());

  const nameIdx = buildIndex(uniq.map(rb => [normName(rb.name ?? rb.id), String(rb.id)]));
  const vendorIdx = buildIndex(uniq.map(rb => [String(rb.id).toLowerCase(), String(rb.id)]));
  const pick = (idx: Map<string, string>) => {
    const m = new Map<string, RoomsBizDoc>();
    idx.forEach((id, key) => {
      if (id === AMBIGUOUS) return;
      const rb = docs.get(id);
      if (rb) m.set(key, rb);
    });
    return m;
  };
  const byName = pick(nameIdx);
  const byVendor = pick(vendorIdx);

  return rawStores.map(raw => {
    const s: Store = { ...raw };
    const rb = readRoomsBiz(resolveRoomsBiz(raw, rbMap, byName, byVendor));

    const legacyMatch = num(raw.match ?? raw.needRooms);
    const legacyPersons = num(raw.persons ?? raw.needPeople);

    s.match = rb?.active ? rb.rooms : legacyMatch;
    s.persons = rb?.active ? rb.people : legacyPersons;
    /* 시트 업로드가 집계한 총 방수는 functions/index.js syncStores 가
     * stores.totalRooms 로 미러링한다 (vendors 는 rules 규칙이 없어 읽을 수 없다).
     * 웹 MainPage.vue:1274 와 같은 폴백 순서. */
    s.totalRooms = num(raw.totalRooms ?? raw.total ?? raw.rooms);
    s.maxPersons = num(raw.maxPersons ?? raw.capacity ?? raw.max);
    // 혼잡도: rooms_biz.congestion → congestionScore → 자동계산 (readRoomsBiz 에서 합침)
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
