/**
 * 마이페이지 — 찜 목록 / 내 글 / 프로필 수정 / 회원탈퇴.
 */
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { COLLECTIONS } from '@/constants/app';
import { FUNCTIONS_REGION } from '@/constants/auth';
import { normalizePost } from '@/services/board';
import { app, db } from '@/services/firebase';
import type { Post } from '@/types/post';
import type { Store } from '@/types/store';

type Raw = Record<string, unknown>;

/* ───────────────────────── 찜 목록 ───────────────────────── */

/**
 * 내가 찜한 업체.
 * favorites 규칙이 ownerId == uid 만 읽게 하므로 where 절이 반드시 필요하다.
 * 업체 정보는 favorites 에 없어서 stores 를 따로 읽어 합친다.
 */
export function subscribeMyFavorites(
  uid: string,
  onData: (stores: Store[]) => void,
  onError?: (e: unknown) => void,
) {
  return onSnapshot(
    query(collection(db, COLLECTIONS.favorites), where('ownerId', '==', uid)),
    async (snap: FirebaseFirestoreTypes.QuerySnapshot) => {
      // type 을 보지 않으면 제휴업체 찜(type:'partner')의 targetId 가
      // 우연히 같은 stores 문서에 매칭돼 엉뚱한 업체가 뜰 수 있다.
      // (레거시 문서는 type 이 없어 store 로 간주)
      const targetIds = snap.docs
        .filter(d => {
          const t = String((d.data() as Raw)?.type ?? 'store');
          return t === 'store';
        })
        .map(d => String((d.data() as Raw)?.targetId ?? ''))
        .filter(Boolean);

      if (!targetIds.length) {
        onData([]);
        return;
      }

      try {
        // stores 는 전체 읽기가 열려 있어 한 번에 받아 필터하는 편이 요청 수가 적다
        const storesSnap = await getDocs(collection(db, COLLECTIONS.stores));
        const want = new Set(targetIds);
        const rows = storesSnap.docs
          .filter((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => want.has(d.id))
          .map(
            (d: FirebaseFirestoreTypes.QueryDocumentSnapshot) =>
              ({ id: d.id, ...(d.data() as object) }) as Store,
          );
        onData(rows);
      } catch (e) {
        onError?.(e);
      }
    },
    e => onError?.(e),
  );
}

/* ───────────────────────── 내 글 ───────────────────────── */

/**
 * 내가 쓴 글.
 * where + orderBy 조합은 복합 색인이 필요해, where 만 걸고 정렬은 클라이언트에서 한다.
 */
export function subscribeMyPosts(
  uid: string,
  onData: (posts: Post[]) => void,
  onError?: (e: unknown) => void,
) {
  return onSnapshot(
    query(collection(db, COLLECTIONS.boardPosts), where('authorUid', '==', uid)),
    (snap: FirebaseFirestoreTypes.QuerySnapshot) => {
      const rows = snap.docs.map(d => normalizePost(d.id, d.data() as Raw));
      rows.sort((a, b) => b.updatedAt - a.updatedAt);
      onData(rows);
    },
    e => onError?.(e),
  );
}

/* ───────────────────────── 프로필 ───────────────────────── */

export async function updateNickname(uid: string, nickname: string): Promise<void> {
  const nick = nickname.trim();
  await updateDoc(doc(db, COLLECTIONS.users, uid), {
    'profile.nickname': nick,
    'profile.nick': nick,
    'profile.nicknameLower': nick.toLowerCase(),
    updatedAt: serverTimestamp(),
  });
}

/* ───────────────────────── 회원탈퇴 ───────────────────────── */

/**
 * 계정 삭제. Auth 계정은 클라이언트가 지울 수 없어 Cloud Function 이 처리한다.
 * (App Store 5.1.1(v) — 앱 안에서 계정 삭제가 가능해야 함)
 */
export async function deleteMyAccount(reason: string): Promise<void> {
  const call = httpsCallable<{ reason: string }, { ok: boolean }>(
    getFunctions(app, FUNCTIONS_REGION),
    'deleteMyAccount',
  );
  await call({ reason });
}
