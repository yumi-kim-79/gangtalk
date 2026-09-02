/**
 * 마케팅 배너 — 웹 composables/useMarketingBanners.js 이식.
 *
 * 소스 우선순위(웹과 동일):
 *   3) config/marketing/<subcoll>/prod   ← 실시간 구독 (운영 미러, 가장 자주 갱신)
 *   2) config/marketing/<subcoll>        ← 1회 getDocs 폴백
 *   1) config/marketing                  ← 1회 getDoc 폴백
 * 우선순위가 높은 소스가 값을 주면 낮은 소스는 덮어쓰지 못한다.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { getDownloadURL, ref as storageRef } from '@react-native-firebase/storage';
import { db, storage } from '@/services/firebase';

/** 'F' = 가게찾기, 'P' = 제휴관 */
export type BannerKind = 'F' | 'P';

export interface Banner {
  id: string;
  /** 표시용 https URL (gs:// 는 해석 후 저장) */
  img: string;
  title: string;
  desc: string;
  link: string;
  tags: string[];
}

type Raw = Record<string, unknown>;

const str = (v: unknown): string => (v == null ? '' : String(v));

function subcollName(kind: BannerKind): string {
  return kind === 'F' ? 'adBannersFinder' : 'adBannersP';
}

/** 문서 필드 폴백 — 세대별로 필드명이 다르다 */
function pickFromDocFields(d: Raw, kind: BannerKind): unknown {
  if (kind === 'F') {
    return d.adBannersFinder ?? d.finderBanners ?? d.finderAds ?? d.finder ?? [];
  }
  return d.adBannersP ?? d.adBanners ?? d.banners ?? d.ads ?? [];
}

/* gs:// → https 캐시. 같은 URL 에 매번 토큰을 발급받으면 왕복이 쌓인다 (웹과 동일) */
const urlCache = new Map<string, string>();

async function resolveImg(u: unknown): Promise<string> {
  const url = str(u).trim();
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (!url.startsWith('gs://')) return '';
  const hit = urlCache.get(url);
  if (hit !== undefined) return hit;
  try {
    const https = await getDownloadURL(storageRef(storage, url));
    urlCache.set(url, https);
    return https;
  } catch {
    urlCache.set(url, '');
    return '';
  }
}

async function normalizeBanner(raw: unknown, idFallback: string): Promise<Banner> {
  const d = (typeof raw === 'string' ? { img: raw } : (raw ?? {})) as Raw;
  const images = Array.isArray(d.images) ? (d.images as unknown[]) : [];
  const idx = Number.isFinite(Number(d._imgIndex)) ? Number(d._imgIndex) : 0;
  const rawImg = d.img || images[idx] || images[0] || '';
  return {
    id: str(d.id) || idFallback,
    img: await resolveImg(rawImg),
    title: str(d.title),
    desc: str(d.desc),
    link: str(d.link || d.href),
    tags: Array.isArray(d.tags) ? (d.tags as unknown[]).map(str) : [],
  };
}

const PRIORITY = { rootDoc: 1, subcoll: 2, fixedDoc: 3 } as const;

/**
 * 배너 구독. 반환값은 해제 함수.
 * 이미지가 없는 배너는 버린다 (웹 withImage 필터와 동일).
 */
export function subscribeBanners(
  kind: BannerKind,
  onData: (items: Banner[]) => void,
  onReady?: () => void,
): () => void {
  let stopped = false;
  let currentPriority = 0;

  const apply = async (rawList: unknown, from: string, prio: number) => {
    const arr = Array.isArray(rawList) ? rawList : [];
    const normalized = await Promise.all(arr.map((x, i) => normalizeBanner(x, `${from}_${i}`)));
    const withImage = normalized.filter(b => !!b.img);
    if (stopped) return;
    onReady?.();
    // 비면 적용하지 않는다 — 다른 소스가 채울 수 있게
    if (!withImage.length) return;
    if (prio < currentPriority) return;
    currentPriority = prio;
    onData(withImage);
  };

  const sub = subcollName(kind);

  // 3) fixedDoc — 유일한 실시간 구독
  const unsub = onSnapshot(
    doc(db, 'config', 'marketing', sub, 'prod'),
    (snap: FirebaseFirestoreTypes.DocumentSnapshot) => {
      const data = (snap.data() ?? {}) as Raw;
      apply(data.adBanners, 'fixedDoc', PRIORITY.fixedDoc).catch(() => undefined);
    },
    () => onReady?.(),
  );

  // 2) subcollection — 1회
  const runSubcoll = async () => {
    try {
      const col = collection(db, 'config', 'marketing', sub);
      let snap: FirebaseFirestoreTypes.QuerySnapshot;
      try {
        snap = await getDocs(query(col, orderBy('createdAt', 'desc')));
      } catch {
        snap = await getDocs(col);
      }
      await apply(
        snap.docs.map((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => ({
          id: d.id,
          ...(d.data() as object),
        })),
        'subcoll',
        PRIORITY.subcoll,
      );
    } catch {
      /* 폴백 실패는 무시 — 상위 소스가 있다 */
    }
  };
  runSubcoll().catch(() => undefined);

  // 1) rootDoc — 1회
  const runRootDoc = async () => {
    try {
      const snap = await getDoc(doc(db, 'config', 'marketing'));
      await apply(pickFromDocFields((snap.data() ?? {}) as Raw, kind), 'rootDoc', PRIORITY.rootDoc);
    } catch {
      onReady?.();
    }
  };
  runRootDoc().catch(() => undefined);

  return () => {
    stopped = true;
    unsub();
  };
}
