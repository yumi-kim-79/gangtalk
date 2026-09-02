/**
 * 마이페이지 — 찜 목록 / 내 글 / 프로필 수정 / 회원탈퇴.
 */
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as fbLimit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import {
  getDownloadURL,
  putFile,
  ref as storageRef,
} from '@react-native-firebase/storage';
import { COLLECTIONS } from '@/constants/app';
import { FUNCTIONS_REGION } from '@/constants/auth';
import { normalizePost } from '@/services/board';
import { normalizePartner } from '@/services/partners';
import { app, db, storage } from '@/services/firebase';
import type { Partner } from '@/types/partner';
import type { Post } from '@/types/post';
import type { Store } from '@/types/store';

type Raw = Record<string, unknown>;

/* ───────────────────────── 찜 목록 ───────────────────────── */

/**
 * 내가 찜한 제휴업체.
 * 웹 FavoritesPage 는 전체/업체/제휴업체 탭을 주는데 앱은 업체만 보여 줬다.
 */
export function subscribeMyPartnerFavorites(
  uid: string,
  onData: (partners: Partner[]) => void,
  onError?: (e: unknown) => void,
) {
  return onSnapshot(
    query(collection(db, COLLECTIONS.favorites), where('ownerId', '==', uid)),
    async (snap: FirebaseFirestoreTypes.QuerySnapshot) => {
      const targetIds = snap.docs
        .filter(d => String((d.data() as Raw)?.type ?? 'store') === 'partner')
        .map(d => String((d.data() as Raw)?.targetId ?? ''))
        .filter(Boolean);

      if (!targetIds.length) {
        onData([]);
        return;
      }
      try {
        const ps = await getDocs(collection(db, COLLECTIONS.partners));
        const want = new Set(targetIds);
        onData(
          ps.docs
            .filter((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => want.has(d.id))
            .map((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) =>
              normalizePartner(d.id, d.data() as Record<string, unknown>),
            ),
        );
      } catch (e) {
        onError?.(e);
      }
    },
    e => onError?.(e),
  );
}

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

export interface ProfilePatch {
  nickname: string;
  phone: string;
  bgColor: string;
  textColor: string;
  /** 로컬 파일 URI 면 업로드하고, http URL 이면 그대로 쓴다. 빈 문자열이면 사진 삭제 */
  photo: string;
}

/**
 * 로컬 이미지 → Storage 업로드.
 * 웹 uploadDataUrlToStorage(ProfileEditSheet.vue:544)와 **같은 경로 규칙**
 * (`profiles/{uid}/avatar_{stamp}.jpg`)을 써야 storage.rules 가 통과한다.
 */
async function uploadAvatar(uid: string, localUri: string): Promise<{ url: string; path: string }> {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:T]/g, '')
    .slice(0, 14);
  const path = `profiles/${uid}/avatar_${stamp}.jpg`;
  const ref = storageRef(storage, path);
  await putFile(ref, localUri.replace(/^file:\/\//, ''), { contentType: 'image/jpeg' });
  const url = await getDownloadURL(ref);
  return { url, path };
}

/**
 * 프로필 저장 — 닉네임 / 연락처 / 아바타 사진 / 배경색 / 글자색.
 *
 * 웹 ProfileEditSheet.onSave 와 **같은 필드**에 쓴다. 한쪽만 다른 필드에 쓰면
 * 웹에서 고른 색이 앱에서 안 보이는(= 지금까지의) 문제가 그대로 재발한다.
 * 점(.) 표기 경로는 updateDoc 만 해석하므로 set(merge) 을 쓰면 안 된다.
 */
export async function saveProfile(uid: string, patch: ProfilePatch): Promise<void> {
  const nick = patch.nickname.trim();
  if (!nick) throw new Error('닉네임을 입력해 주세요.');

  let photoUrl = patch.photo;
  let photoPath: string | null = null;

  if (photoUrl && !/^https?:\/\//i.test(photoUrl)) {
    const up = await uploadAvatar(uid, photoUrl);
    photoUrl = up.url;
    photoPath = up.path;
  }

  const payload: Record<string, unknown> = {
    'profile.nickname': nick,
    'profile.nick': nick,
    'profile.nicknameLower': nick.toLowerCase(),
    'profile.phone': patch.phone.trim() || null,
    'profile.photoUrl': photoUrl || null,
    'profile.bgColor': patch.bgColor || null,
    'profile.textColor': patch.textColor || null,
    updatedAt: serverTimestamp(),
  };
  // 새로 올린 사진일 때만 경로를 갱신한다 (그대로 둔 사진의 경로를 지우지 않도록)
  if (photoPath) payload['profile.photoPath'] = photoPath;
  else if (!photoUrl) payload['profile.photoPath'] = null;

  await updateDoc(doc(db, COLLECTIONS.users, uid), payload);
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

/* ───────────────────────── 내 댓글 / 대댓글 ───────────────────────── */

export interface MyComment {
  id: string;
  postId: string;
  postTitle: string;
  body: string;
  /** 값이 있으면 대댓글 */
  parentId: string | null;
  updatedAt: number;
}

const toMs = (v: unknown): number => {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  const t = v as { toMillis?: () => number; seconds?: number };
  if (typeof t.toMillis === 'function') return t.toMillis();
  if (typeof t.seconds === 'number') return t.seconds * 1000;
  return 0;
};

async function postTitleOf(postId: string, cache: Map<string, string>): Promise<string> {
  if (!postId) return '';
  const hit = cache.get(postId);
  if (hit !== undefined) return hit;
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.boardPosts, postId));
    const title = String((snap.data() as Raw)?.title ?? '');
    cache.set(postId, title);
    return title;
  } catch {
    cache.set(postId, '');
    return '';
  }
}

export interface MyCommentsResult {
  items: MyComment[];
  /** true = collectionGroup 조회가 막혀 폴백(최근 글 일부만 훑기)으로 얻은 불완전한 결과 */
  partial: boolean;
}

/**
 * 내가 쓴 댓글 · 대댓글.
 *
 * 정상 경로는 collectionGroup('comments').where('authorUid','==',uid) 한 번.
 * 이게 되려면 두 가지가 **둘 다** 있어야 한다.
 *   - firestore.rules 의 match /{path=**}/comments/{commentId} 블록
 *     (board_posts/{postId}/comments 블록은 경로 고정이라 그룹 조회에 안 먹는다)
 *   - firestore.indexes.json 의 comments.authorUid COLLECTION_GROUP 색인
 * 둘 중 하나라도 없으면 조회가 거부되고, 예전에는 그대로 빈 목록이 떠서
 * "댓글이 없다"와 "못 불러왔다"를 구분할 수 없었다. 그래서 partial 을 함께 돌려준다.
 *
 * 폴백은 board_posts 100개만 훑는다(웹과 같은 상한). 글이 수만 건이라
 * 사실상 아무것도 못 찾으므로 결과가 아니라 **경고**로 취급해야 한다.
 */
export async function fetchMyComments(uid: string): Promise<MyCommentsResult> {
  const cache = new Map<string, string>();

  const mapDocs = async (
    docs: FirebaseFirestoreTypes.QueryDocumentSnapshot[],
    forcedPostId = '',
    forcedTitle = '',
  ): Promise<MyComment[]> => {
    const out: MyComment[] = [];
    for (const d of docs) {
      const x = (d.data() ?? {}) as Raw;
      const postId = forcedPostId || d.ref.parent.parent?.id || '';
      out.push({
        id: d.id,
        postId,
        postTitle: forcedTitle || (await postTitleOf(postId, cache)),
        body: String(x.body ?? ''),
        parentId: x.parentId ? String(x.parentId) : null,
        updatedAt: toMs(x.updatedAt ?? x.createdAt),
      });
    }
    return out;
  };

  try {
    const snap = await getDocs(
      query(collectionGroup(db, COLLECTIONS.comments), where('authorUid', '==', uid)),
    );
    return {
      items: (await mapDocs(snap.docs)).sort((a, b) => b.updatedAt - a.updatedAt),
      partial: false,
    };
  } catch {
    const posts = await getDocs(query(collection(db, COLLECTIONS.boardPosts), fbLimit(100)));
    const chunks = await Promise.all(
      posts.docs.map(async (p: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
        const cs = await getDocs(
          query(
            collection(db, COLLECTIONS.boardPosts, p.id, COLLECTIONS.comments),
            where('authorUid', '==', uid),
          ),
        );
        return mapDocs(cs.docs, p.id, String((p.data() as Raw)?.title ?? ''));
      }),
    );
    return {
      items: chunks.flat().sort((a: MyComment, b: MyComment) => b.updatedAt - a.updatedAt),
      partial: true,
    };
  }
}

/* ───────────────────────── 수정 · 삭제 ───────────────────────── */

/** 내 글 수정 — 규칙상 작성자 본인만 (firestore.rules:352-358) */
export async function updateMyPost(
  postId: string,
  patch: { title: string; subtitle?: string; body: string },
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.boardPosts, postId), {
    title: patch.title.trim(),
    subtitle: (patch.subtitle ?? '').trim(),
    body: patch.body.trim(),
    content: patch.body.trim(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteMyPost(postId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.boardPosts, postId));
}

export async function updateMyComment(
  postId: string,
  commentId: string,
  body: string,
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.boardPosts, postId, COLLECTIONS.comments, commentId), {
    body: body.trim(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteMyComment(postId: string, commentId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.boardPosts, postId, COLLECTIONS.comments, commentId));
}
