/**
 * 업체(stores) 조회·가공 서비스.
 * web/src/views/StoreFinder.vue 의 로직을 그대로 이식하되,
 * 화면에서 Firestore SDK 를 직접 만지지 않도록 여기에 가둔다.
 */
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import {
  collection,
  doc,
  limit as fbLimit,
  onSnapshot,
  orderBy,
  query,
} from '@react-native-firebase/firestore';
import { COLLECTIONS } from '@/constants/app';
import {
  EXPOSURE_KEY,
  STORE_FETCH_LIMIT,
  type RegionKey,
  type SortKey,
} from '@/constants/stores';
import { getDownloadURL, ref as storageRef } from '@react-native-firebase/storage';
import { db, storage } from '@/services/firebase';
import type { RoomsBizDoc, Store, StoreDoc } from '@/types/store';

/* ───────────────────────── 값 추출 유틸 ───────────────────────── */

export function num(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = String(v ?? '').trim();
  if (!s) return 0;
  const n = Number(s.replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** 급여 필드가 세대별로 달라 후보를 순서대로 조회 */
export function wageOf(s: Store): number {
  const v =
    s.wage ?? s.hourly ?? s.payPerHour ?? s.hourPay ?? s.hourlyPay ?? s.hourlyWage ?? s.pay;
  return num(v);
}

export function payText(s: Store): string {
  const n = wageOf(s);
  if (n) return `${n.toLocaleString()}원`;
  const raw = String(s.pay ?? '');
  if (raw.includes('원')) return raw;
  return '150,000원';
}

export function likesOf(s: Store): number {
  return num(s.likes ?? s.wishCount ?? 0);
}

export function roomsOf(s: Store): number {
  if (s.rooms != null) return num(s.rooms);
  if (s.roomCount != null) return num(s.roomCount);
  if (s.roomInfo != null) return num(s.roomInfo);
  return 0;
}

/** 티시 정렬 기준값 */
export function tcOf(s: Store): number {
  const w = wageOf(s);
  if (w) return w;
  if (s.tc != null) return num(s.tc);
  if (s.pay != null) return num(s.pay);
  return 0;
}

export function managerName(s: Store): string {
  const arr = Array.isArray(s.managers) ? s.managers : [];
  if (arr.length && arr[0]?.name) return String(arr[0].name);
  if (s.manager) return String(s.manager);
  return '';
}

export function introOf(s: Store): string {
  return String(s.adTitle || s.desc || s.description || '');
}

export function eventTextOf(s: Store): string {
  if (s.eventMain) return String(s.eventMain);
  if (Array.isArray(s.events) && s.events.length) return String(s.events[0]);
  return '';
}

export function scoreOf(s: Store): string {
  const r = Number(s.rating ?? 0);
  return (r > 0 ? r : 9.4).toFixed(1);
}

/** 지역 → 대분류 키 */
export function macroOf(s: Store): RegionKey {
  const r = String(s.region ?? '');
  if (['강남', '서초', '송파', '신사', '논현'].includes(r)) return 'gn';
  if (r === '경기') return 'gg';
  if (r === '인천') return 'ic';
  return 'bg';
}

/* ───────────────────────── 노출 조건 ───────────────────────── */

/**
 * exposure 플래그가 없으면 노출로 간주 (웹과 동일).
 * 홈(현황판)은 'dashboard', 업체찾기는 'gangtalk' 키를 본다 — 웹 PR #124~126 에서 분리됨.
 */
export function exposedHere(s: Store, key: string = EXPOSURE_KEY): boolean {
  const exp = s.exposure;
  if (!exp || typeof exp !== 'object') return true;
  if (exp[key] === undefined) return true;
  return !!exp[key];
}

export function isApproved(s: Store): boolean {
  if (s.approved === true) return true;
  const status = String(s.applyStatus ?? '').toLowerCase();
  return status === 'approved' || status === 'active';
}

/* ───────────────────────── 검색 ───────────────────────── */

const norm = (v: unknown): string => String(v ?? '').trim().toLowerCase();

export function searchTextOf(s: Store): string {
  const tags = Array.isArray(s.tags) ? s.tags.join(' ') : '';
  const services = Array.isArray(s.services) ? s.services.join(' ') : '';
  const events = Array.isArray(s.events) ? s.events.join(' ') : '';
  return [s.name, managerName(s), s.adTitle, s.desc, s.description, tags, services, events]
    .map(norm)
    .filter(Boolean)
    .join(' ');
}

/** 공백으로 나눈 단어가 모두 포함되면 매칭 */
export function matchesQuery(s: Store, q: string): boolean {
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = searchTextOf(s);
  return words.every(w => text.includes(w));
}

/** 업체명 일치에 가중치를 둔 연관도 */
export function relevanceScore(s: Store, q: string): number {
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  const name = norm(s.name);
  const text = searchTextOf(s);
  let score = 0;
  for (const w of words) {
    if (name === w) score += 100;
    else if (name.startsWith(w)) score += 50;
    else if (name.includes(w)) score += 30;
    if (text.includes(w)) score += 5;
  }
  return score;
}

/* ───────────────────────── 필터 · 정렬 ───────────────────────── */

export interface StoreFilter {
  category: string;
  region: RegionKey;
  sort: SortKey;
  keyword: string;
  /** 노출 플래그 키. 미지정 시 'gangtalk'(업체찾기) */
  exposureKey?: string;
}

function sortValue(s: Store, key: SortKey): number {
  if (key === 'rooms') return roomsOf(s);
  if (key === 'likes') return likesOf(s);
  return tcOf(s);
}

export function filterStores(stores: Store[], f: StoreFilter): Store[] {
  const list = stores.filter(s => {
    if (!exposedHere(s, f.exposureKey)) return false;
    if (!isApproved(s)) return false;
    if (f.category !== 'all' && s.category !== f.category) return false;
    if (f.region !== 'all' && macroOf(s) !== f.region) return false;
    if (f.keyword && !matchesQuery(s, f.keyword)) return false;
    return true;
  });

  const keyword = f.keyword.trim();
  if (keyword) {
    // 검색 중에는 연관순 → 동점이면 선택된 정렬 기준
    return list.sort((a, b) => {
      const d = relevanceScore(b, keyword) - relevanceScore(a, keyword);
      if (d !== 0) return d;
      return sortValue(b, f.sort) - sortValue(a, f.sort);
    });
  }
  return list.sort((a, b) => sortValue(b, f.sort) - sortValue(a, f.sort));
}

/* ───────────────────────── Firestore 구독 ───────────────────────── */

/** stores 문서에 rooms_biz 의 방/인원 수치를 합친다 (웹 rebuildStores 이식) */
export function mergeRoomsBiz(
  rawStores: StoreDoc[],
  rbMap: Map<string, RoomsBizDoc>,
): Store[] {
  return rawStores.map(raw => {
    const s: Store = { ...raw };
    const candidates = [raw.roomBizId, raw.rooms_biz, raw.storeKey, raw.id]
      .map(v => String(v ?? '').trim())
      .filter(Boolean);

    let rb: RoomsBizDoc | undefined;
    for (const key of candidates) {
      // store_xxx_room_01 → store_xxx
      const baseKey = key.replace(/_room_.+$/i, '');
      rb = rbMap.get(baseKey) ?? rbMap.get(key);
      if (rb) break;
    }
    if (!rb) return s;

    const totalRooms = num(rb.totalRooms ?? rb.total ?? 0);
    const totalCurrent = num(rb.totalCurrent ?? 0);
    const totalNeeded = num(rb.totalNeeded ?? 0);
    const totalRemaining = num(
      rb.totalRemaining ?? (totalNeeded && totalCurrent ? totalNeeded - totalCurrent : 0),
    );

    s.match = totalRooms;
    s.persons = totalRemaining;
    s.totalRooms = totalRooms;
    s.totalNeeded = totalNeeded;
    s.totalRemaining = totalRemaining;
    s.roomsBizId = rb.roomBizId ?? rb.storeId ?? rb.id ?? null;
    return s;
  });
}

export function subscribeStores(
  onData: (rows: StoreDoc[]) => void,
  onError?: (e: unknown) => void,
) {
  const q = query(
    collection(db, COLLECTIONS.stores),
    orderBy('updatedAt', 'desc'),
    fbLimit(STORE_FETCH_LIMIT),
  );
  return onSnapshot(
    q,
    (snap: FirebaseFirestoreTypes.QuerySnapshot) =>
      onData(snap.docs.map(d => ({ id: d.id, ...(d.data() as object) }) as StoreDoc)),
    e => onError?.(e),
  );
}

export function subscribeRoomsBiz(
  onData: (map: Map<string, RoomsBizDoc>) => void,
  onError?: (e: unknown) => void,
) {
  const q = query(collection(db, COLLECTIONS.roomsBiz), fbLimit(STORE_FETCH_LIMIT));
  return onSnapshot(
    q,
    (snap: FirebaseFirestoreTypes.QuerySnapshot) => {
      const map = new Map<string, RoomsBizDoc>();
      snap.docs.forEach(d => {
        const data = (d.data() ?? {}) as Omit<RoomsBizDoc, 'id'>;
        const merged: RoomsBizDoc = { id: d.id, ...data };
        // 웹과 동일하게 docId / roomBizId / storeId 세 키로 모두 색인
        map.set(String(d.id), merged);
        const roomId = String(data.roomBizId ?? '').trim();
        const storeId = String(data.storeId ?? '').trim();
        if (roomId) map.set(roomId, merged);
        if (storeId) map.set(storeId, merged);
      });
      onData(map);
    },
    e => onError?.(e),
  );
}

export function subscribeStore(
  id: string,
  onData: (store: Store | null) => void,
  onError?: (e: unknown) => void,
) {
  return onSnapshot(
    doc(db, COLLECTIONS.stores, id),
    (snap: FirebaseFirestoreTypes.DocumentSnapshot) =>
      onData(snap.exists() ? ({ id: snap.id, ...(snap.data() as object) } as Store) : null),
    e => onError?.(e),
  );
}

/* ───────────────────────── 썸네일 ───────────────────────── */

/** 썸네일 후보를 세대별 필드에서 순서대로 찾는다 (웹 thumbCandidate 이식) */
export function thumbCandidate(s: Store): string {
  const cand =
    s.thumb ||
    s.cover ||
    s.coverImg ||
    (Array.isArray(s.images) ? s.images[0] : '') ||
    (Array.isArray(s.photos) ? s.photos[0] : '') ||
    s.img ||
    s.banner ||
    s.logo ||
    '';
  return String(cand || '').trim();
}

const thumbCache = new Map<string, string>();

/** gs:// 경로는 Storage 다운로드 URL 로 변환. 실패하면 빈 문자열 */
export async function resolveThumb(raw: string): Promise<string> {
  const url = String(raw || '').trim();
  if (!url) return '';
  if (/^(data:|https?:\/\/)/i.test(url)) return url;
  if (!url.startsWith('gs://')) return '';

  const cached = thumbCache.get(url);
  if (cached !== undefined) return cached;
  try {
    const resolved = await getDownloadURL(storageRef(storage, url));
    thumbCache.set(url, resolved);
    return resolved;
  } catch {
    thumbCache.set(url, '');
    return '';
  }
}


/* ───────────────────────── 카테고리별 Top5 (가게찾기) ───────────────────────── */

/**
 * 관리자가 config/marketing.topRanks 에 지정한 카테고리별 순서.
 * 제휴관의 partnerTopRanks 와 별개 필드다.
 */
export function subscribeStoreTopRanks(onData: (ranks: Record<string, string[]>) => void) {
  return onSnapshot(
    doc(db, COLLECTIONS.config, 'marketing'),
    (snap: FirebaseFirestoreTypes.DocumentSnapshot) => {
      const data = (snap.data() ?? {}) as { topRanks?: unknown };
      const raw = data.topRanks;
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

export interface TopSection {
  key: string;
  label: string;
  list: Store[];
}

/**
 * 웹 topLists 이식.
 * 관리자 지정 순서를 우선 쓰되, 5개가 안 되면 자동 정렬로 나머지를 채운다.
 * (웹 2026-07-02 수정 내용 — 지정 항목이 2개뿐일 때 2개만 나오던 문제 대응)
 */
export function buildTopSections(
  stores: Store[],
  ranks: Record<string, string[]>,
  categories: { key: string; label: string }[],
  filter: { category: string; region: RegionKey; sort: SortKey },
): TopSection[] {
  const byId = new Map(stores.map(s => [s.id, s]));
  const passes = (s: Store, catKey: string) =>
    exposedHere(s) &&
    isApproved(s) &&
    (filter.region === 'all' || macroOf(s) === filter.region) &&
    s.category === catKey;

  const targets =
    filter.category === 'all'
      ? categories.filter(c => c.key !== 'all')
      : categories.filter(c => c.key === filter.category);

  return targets
    .map(cat => {
      const list: Store[] = [];
      const seen = new Set<string>();

      // ① 관리자 지정 순서
      for (const id of ranks[cat.key] ?? []) {
        const s = byId.get(String(id));
        if (!s || !passes(s, cat.key) || seen.has(s.id)) continue;
        list.push(s);
        seen.add(s.id);
        if (list.length >= 5) break;
      }

      // ② 부족분은 자동 정렬로 채움
      if (list.length < 5) {
        const auto = filterStores(stores, {
          category: cat.key,
          region: filter.region,
          sort: filter.sort,
          keyword: '',
        });
        for (const s of auto) {
          if (list.length >= 5) break;
          if (seen.has(s.id)) continue;
          list.push(s);
          seen.add(s.id);
        }
      }

      return { key: cat.key, label: cat.label, list };
    })
    .filter(sec => sec.list.length > 0);
}
