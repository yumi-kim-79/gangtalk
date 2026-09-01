/**
 * 핫이슈 한줄 뉴스 — web/src/pages/MainPage.vue 의 뉴스 구독/머지 로직 이식.
 *
 * 소스 3곳 (웹과 동일):
 *   1) config/marketing.newsline  — 관리자 "뉴스/한줄 관리" 가 저장하는 배열. **순서 그대로 최상단**
 *   2) config/news                — 예전 단일 문서 (items / newsItems / list / title)
 *   3) news 컬렉션                 — 개별 문서
 * 2·3 은 1과 중복 제거 후 최신순으로 뒤에 붙인다.
 */
import {
  collection,
  doc,
  onSnapshot,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { COLLECTIONS } from '@/constants/app';
import { db } from '@/services/firebase';

export interface NewsItem {
  id: string;
  title: string;
  createdAt: number;
  isNew: boolean;
}

type Raw = Record<string, unknown>;

/** Firestore Timestamp / Date / number / 문자열 → ms */
function tsToMs(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (v instanceof Date) return v.getTime();
  const o = v as { toMillis?: () => number; seconds?: number };
  if (typeof o.toMillis === 'function') return o.toMillis();
  if (typeof o.seconds === 'number') return o.seconds * 1000;
  const parsed = Date.parse(String(v));
  return Number.isFinite(parsed) ? parsed : 0;
}

/** 웹 normalizeItem 이식 */
function normalizeItem(it: Raw, i: number, prefix: string): NewsItem {
  const title = String(it.title ?? it.text ?? '').trim() || '업데이트가 준비중입니다.';
  const created = tsToMs(it.createdAt ?? it.updatedAt ?? it.date ?? it.ts) || Date.now();
  return {
    id: String(it.id ?? `${prefix}_${i}`),
    title,
    createdAt: created,
    isNew: it.isNew === true || String(it.badge ?? '').toUpperCase() === 'NEW',
  };
}

const asArray = (v: unknown): Raw[] => (Array.isArray(v) ? (v as Raw[]) : []);

/** 웹 recomputeNews 이식 — 관리자 지정 순서 우선, 나머지는 중복 제거 후 최신순 */
export function mergeNews(marketing: NewsItem[], others: NewsItem[]): NewsItem[] {
  const isDup = (a: NewsItem, b: NewsItem) =>
    a.id && b.id ? a.id === b.id : a.title.trim() === b.title.trim();

  const rest = others
    .filter(o => !marketing.some(m => isDup(m, o)))
    .sort((a, b) => b.createdAt - a.createdAt);

  return marketing.length ? [...marketing, ...rest] : rest;
}

/**
 * 세 소스를 모두 구독해 머지된 목록을 돌려준다.
 * 관리자가 저장하면 onSnapshot 으로 즉시 반영된다.
 */
export function subscribeNews(onData: (items: NewsItem[]) => void) {
  let marketing: NewsItem[] = [];
  let configDoc: NewsItem[] = [];
  let col: NewsItem[] = [];

  const emit = () => onData(mergeNews(marketing, [...configDoc, ...col]));

  // 1) config/marketing.newsline
  const unsubMarketing = onSnapshot(
    doc(db, COLLECTIONS.config, 'marketing'),
    (snap: FirebaseFirestoreTypes.DocumentSnapshot) => {
      const data = (snap.data() ?? {}) as Raw;
      marketing = asArray(data.newsline).map((v, i) => normalizeItem(v, i, 'mk'));
      emit();
    },
    () => {
      marketing = [];
      emit();
    },
  );

  // 2) config/news (예전 단일 문서)
  const unsubConfigDoc = onSnapshot(
    doc(db, COLLECTIONS.config, 'news'),
    (snap: FirebaseFirestoreTypes.DocumentSnapshot) => {
      const data = (snap.data() ?? {}) as Raw;
      const list = asArray(data.items).length
        ? asArray(data.items)
        : asArray(data.newsItems).length
          ? asArray(data.newsItems)
          : asArray(data.list);
      const single: Raw[] =
        data.title || data.text
          ? [{ id: data.id ?? 'config_news_single', ...data }]
          : [];
      configDoc = [
        ...list.map((v, i) => normalizeItem(v, i, 'cfga')),
        ...single.map((v, i) => normalizeItem(v, i, 'cfgs')),
      ];
      emit();
    },
    () => {
      configDoc = [];
      emit();
    },
  );

  // 3) news 컬렉션
  const unsubCol = onSnapshot(
    collection(db, COLLECTIONS.news),
    (snap: FirebaseFirestoreTypes.QuerySnapshot) => {
      col = snap.docs.map((d, i) =>
        normalizeItem({ ...(d.data() ?? {}), id: d.id }, i, 'col'),
      );
      emit();
    },
    () => {
      col = [];
      emit();
    },
  );

  return () => {
    unsubMarketing();
    unsubConfigDoc();
    unsubCol();
  };
}
