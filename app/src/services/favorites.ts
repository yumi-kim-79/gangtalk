/**
 * 찜 / 별점 — web/src/pages/StoreDetail.vue 이식.
 * 두 기능 모두 stores 문서의 집계값을 함께 갱신해야 해서 트랜잭션으로 처리한다.
 */
import {
  deleteDoc,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
} from '@react-native-firebase/firestore';
import { COLLECTIONS } from '@/constants/app';
import { db } from '@/services/firebase';

/** 웹과 동일한 문서 ID 규칙 — 규칙상 사용자당 1건만 만들 수 있게 고정 ID 사용 */
export const favoriteDocId = (uid: string, storeId: string) => `${uid}__store__${storeId}`;

const clamp0 = (n: unknown) => Math.max(0, Number(n) || 0);

export async function isFavorited(uid: string, storeId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, COLLECTIONS.favorites, favoriteDocId(uid, storeId)));
  return snap.exists();
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
