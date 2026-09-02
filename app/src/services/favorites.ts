/**
 * 찜 / 별점 — web/src/pages/StoreDetail.vue 이식.
 * 두 기능 모두 stores 문서의 집계값을 함께 갱신해야 해서 트랜잭션으로 처리한다.
 */
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { COLLECTIONS } from '@/constants/app';
import { db } from '@/services/firebase';

export type FavoriteType = 'store' | 'partner';

/**
 * 웹과 동일한 문서 ID 규칙 — 규칙상 사용자당 1건만 만들 수 있게 고정 ID 사용.
 * 웹 favId 패턴: `${uid}__${type}__${targetId}` (firestore.rules:82 주석)
 */
export const favoriteDocId = (uid: string, targetId: string, type: FavoriteType = 'store') =>
  `${uid}__${type}__${targetId}`;

const clamp0 = (n: unknown) => Math.max(0, Number(n) || 0);

export async function isFavorited(uid: string, storeId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, COLLECTIONS.favorites, favoriteDocId(uid, storeId)));
  return snap.exists();
}

/**
 * 내가 찜한 대상 id 집합을 실시간으로 받는다.
 * 목록 화면에서 카드마다 개별 조회하면 요청이 N배로 늘어나므로 한 번만 구독한다.
 * (웹 MainPage 의 favSet 과 같은 역할)
 */
export function subscribeMyFavoriteIds(
  uid: string,
  onData: (ids: { store: Set<string>; partner: Set<string> }) => void,
) {
  return onSnapshot(
    query(collection(db, COLLECTIONS.favorites), where('ownerId', '==', uid)),
    (snap: FirebaseFirestoreTypes.QuerySnapshot) => {
      const store = new Set<string>();
      const partner = new Set<string>();
      snap.docs.forEach(d => {
        const x = (d.data() ?? {}) as { type?: string; targetId?: string };
        const id = String(x.targetId ?? '');
        if (!id) return;
        // 레거시 문서는 type 이 없다 — 웹과 같이 store 로 본다
        if (String(x.type ?? 'store') === 'partner') partner.add(id);
        else store.add(id);
      });
      onData({ store, partner });
    },
    () => onData({ store: new Set(), partner: new Set() }),
  );
}

/**
 * 찜 토글. stores.likes 집계도 함께 조정한다.
 * @returns 토글 후 찜 상태
 */
export async function toggleFavorite(uid: string, storeId: string): Promise<boolean> {
  const favRef = doc(db, COLLECTIONS.favorites, favoriteDocId(uid, storeId));
  const storeRef = doc(db, COLLECTIONS.stores, storeId);

  const snap = await getDoc(favRef);
  const wasFav = snap.exists();

  await runTransaction(db, async tx => {
    const storeSnap = await tx.get(storeRef);
    const cur = clamp0((storeSnap.data() as { likes?: number })?.likes);
    tx.update(storeRef, { likes: Math.max(0, cur + (wasFav ? -1 : 1)) });
  });

  if (wasFav) {
    await deleteDoc(favRef);
  } else {
    await setDoc(favRef, {
      ownerId: uid,
      type: 'store',
      targetId: storeId,
      createdAt: serverTimestamp(),
    });
  }
  return !wasFav;
}

/**
 * 제휴업체 찜 토글. partners.likes 집계도 함께 조정한다.
 * (웹 PartnerDetail.vue:230 과 같은 필드 — 규칙 firestore.rules:273 이 likes 를 허용)
 */
export async function togglePartnerFavorite(uid: string, partnerId: string): Promise<boolean> {
  const favRef = doc(db, COLLECTIONS.favorites, favoriteDocId(uid, partnerId, 'partner'));
  const partnerRef = doc(db, COLLECTIONS.partners, partnerId);

  const snap = await getDoc(favRef);
  const wasFav = snap.exists();

  await runTransaction(db, async tx => {
    const pSnap = await tx.get(partnerRef);
    const cur = clamp0((pSnap.data() as { likes?: number })?.likes);
    tx.update(partnerRef, { likes: Math.max(0, cur + (wasFav ? -1 : 1)) });
  });

  if (wasFav) {
    await deleteDoc(favRef);
  } else {
    await setDoc(favRef, {
      ownerId: uid,
      type: 'partner',
      targetId: partnerId,
      createdAt: serverTimestamp(),
    });
  }
  return !wasFav;
}

/* ───────────────────────── 별점 ───────────────────────── */

export async function fetchMyRating(uid: string, storeId: string): Promise<number> {
  const snap = await getDoc(doc(db, COLLECTIONS.stores, storeId, 'ratings', uid));
  return snap.exists() ? Number((snap.data() as { score?: number })?.score ?? 0) : 0;
}

/**
 * 별점 주기(0 이면 취소). stores.ratingSum / ratingCount / rating 을 함께 갱신한다.
 * 웹 rate() 의 트랜잭션 로직 이식.
 */
export async function rateStore(uid: string, storeId: string, score: number): Promise<void> {
  const s = Math.max(0, Math.min(5, Number(score) || 0));
  const storeRef = doc(db, COLLECTIONS.stores, storeId);
  const myRef = doc(db, COLLECTIONS.stores, storeId, 'ratings', uid);

  await runTransaction(db, async tx => {
    const [storeSnap, mySnap] = await Promise.all([tx.get(storeRef), tx.get(myRef)]);
    const was = mySnap.exists() ? clamp0((mySnap.data() as { score?: number })?.score) : 0;
    if (s === was) return;

    const d = (storeSnap.data() ?? {}) as {
      rating?: number;
      ratingSum?: number;
      ratingCount?: number;
    };
    // ratingSum 이 없던 시절 문서는 rating × ratingCount 로 역산 (웹과 동일)
    const baseSum = clamp0(
      d.ratingSum == null ? Number(d.rating ?? 0) * Number(d.ratingCount ?? 0) : d.ratingSum,
    );
    const baseCount = clamp0(d.ratingCount);

    const nextSum = Math.max(0, baseSum - was + s);
    const nextCount = Math.max(0, baseCount + (was > 0 ? 0 : 1) - (s === 0 ? 1 : 0));
    const nextAvg = nextCount > 0 ? Number((nextSum / nextCount).toFixed(2)) : 0;

    tx.update(storeRef, {
      ratingSum: nextSum,
      ratingCount: nextCount,
      rating: nextAvg,
    });

    if (s === 0) tx.delete(myRef);
    else tx.set(myRef, { score: s, uid, updatedAt: serverTimestamp() }, { merge: true });
  });
}
