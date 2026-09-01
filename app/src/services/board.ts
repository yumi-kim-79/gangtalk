/**
 * 강톡 게시판 — web/src/pages/GangTalkPage.vue 의 board_posts 부분 이식.
 * (같은 파일에 있던 채팅/힐링톡/업체목록은 각 탭 작업에서 따로 옮긴다)
 */
import {
  addDoc,
  collection,
  doc,
  getDocs,
  increment,
  limit as fbLimit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  updateDoc,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { COLLECTIONS } from '@/constants/app';
import { POSTS_PER_PAGE } from '@/constants/board';
import { db } from '@/services/firebase';
import type { BoardCategory, Comment, Post } from '@/types/post';

/* ───────────────────────── 정규화 ───────────────────────── */

/** Firestore Timestamp / number / ISO 문자열을 ms 로 통일 */
export function tsToMs(v: unknown): number {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Date.parse(v);
    return Number.isFinite(n) ? n : 0;
  }
  const t = v as { toMillis?: () => number; seconds?: number };
  if (typeof t.toMillis === 'function') return t.toMillis();
  if (typeof t.seconds === 'number') return t.seconds * 1000;
  return 0;
}

/** 웹 normalizeCategory 이식 — 세대별로 다른 카테고리 표기를 하나로 */
export function normalizeCategory(c: unknown): BoardCategory {
  const k = String(c ?? '').toLowerCase();
  if (k === 'hot') return 'hot';
  if (['daily', 'anon'].includes(k)) return 'daily';
  if (['suggest', 'suggestion', 'sugg', 'var-suggest'].includes(k)) return 'suggest';
  if (['pledge', 'promise', 'var-pledge'].includes(k)) return 'pledge';
  if (['event', 'ev', 'var-event'].includes(k)) return 'event';
  if (['vote', 'poll'].includes(k)) return 'vote';
  if (['quiz', 'qz', 'trivia'].includes(k)) return 'quiz';
  if (['travel', 'trip', 'tour'].includes(k)) return 'travel';
  if (['health', 'wellness', '헬스', '건강'].includes(k)) return 'health';
  if (['quote', 'saying', '명언'].includes(k)) return 'quote';
  if (k === 'var') return 'suggest';
  return 'daily';
}

type Raw = Record<string, unknown>;
const str = (v: unknown, fallback = ''): string => (v == null ? fallback : String(v));
const int = (v: unknown): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/** 웹 normalizePost 이식 */
export function normalizePost(id: string, x: Raw = {}): Post {
  return {
    id,
    category: normalizeCategory(x.category),
    title: str(x.title) || '(제목 없음)',
    subtitle: str(x.subtitle),
    body: str(x.body || x.content),
    author: str(x.author) || '익명',
    authorUid: str(x.authorUid),
    views: int(x.views),
    likes: int(x.likes),
    cmtCount: int(x.cmtCount ?? x.comments),
    optA: str(x.optA),
    optB: str(x.optB),
    votesA: int(x.votesA),
    votesB: int(x.votesB),
    isNotice: !!x.isNotice,
    images: Array.isArray(x.images)
      ? (x.images as unknown[]).map(u => str(u).trim()).filter(Boolean)
      : [],
    createdAt: tsToMs(x.createdAt ?? x.createdAtMs ?? x.updatedAt),
    updatedAt: tsToMs(x.updatedAt ?? x.updatedAtMs ?? x.createdAt),
  };
}

/** 웹 normalizeComment 이식 */
export function normalizeComment(id: string, x: Raw = {}): Comment {
  return {
    id,
    body: str(x.body).trim(),
    author: str(x.author) || '익명',
    authorUid: str(x.authorUid),
    parentId: x.parentId ? str(x.parentId) : null,
    createdAt: tsToMs(x.createdAt ?? x.updatedAt),
    updatedAt: tsToMs(x.updatedAt ?? x.createdAt),
  };
}

/* ───────────────────────── 조회 ───────────────────────── */

type PostDoc = FirebaseFirestoreTypes.QueryDocumentSnapshot;

const postsQuery = () =>
  query(
    collection(db, COLLECTIONS.boardPosts),
    orderBy('updatedAt', 'desc'),
    orderBy('createdAt', 'desc'),
    fbLimit(POSTS_PER_PAGE),
  );

/** 첫 페이지 실시간 구독. 커서(마지막 문서)도 함께 넘겨 더보기에 쓴다 */
export function subscribePosts(
  onData: (posts: Post[], lastDoc: PostDoc | null) => void,
  onError?: (e: unknown) => void,
) {
  return onSnapshot(
    postsQuery(),
    (snap: FirebaseFirestoreTypes.QuerySnapshot) => {
      const rows = snap.docs.map(d => normalizePost(d.id, d.data() as Raw));
      onData(rows, snap.docs[snap.docs.length - 1] ?? null);
    },
    e => onError?.(e),
  );
}

/** 커서 이후 한 페이지 더. 웹 loadMorePosts 이식 */
export async function loadMorePosts(
  lastDoc: PostDoc,
): Promise<{ posts: Post[]; lastDoc: PostDoc | null; hasMore: boolean }> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.boardPosts),
      orderBy('updatedAt', 'desc'),
      orderBy('createdAt', 'desc'),
      startAfter(lastDoc),
      fbLimit(POSTS_PER_PAGE),
    ),
  );
  return {
    posts: snap.docs.map((d: PostDoc) => normalizePost(d.id, d.data() as Raw)),
    lastDoc: snap.docs[snap.docs.length - 1] ?? null,
    hasMore: snap.docs.length >= POSTS_PER_PAGE,
  };
}

export function subscribePost(
  id: string,
  onData: (post: Post | null) => void,
  onError?: (e: unknown) => void,
) {
  return onSnapshot(
    doc(db, COLLECTIONS.boardPosts, id),
    (snap: FirebaseFirestoreTypes.DocumentSnapshot) =>
      onData(snap.exists() ? normalizePost(snap.id, snap.data() as Raw) : null),
    e => onError?.(e),
  );
}

export function subscribeComments(
  postId: string,
  onData: (comments: Comment[]) => void,
  onError?: (e: unknown) => void,
) {
  return onSnapshot(
    query(
      collection(db, COLLECTIONS.boardPosts, postId, 'comments'),
      orderBy('createdAt', 'asc'),
    ),
    (snap: FirebaseFirestoreTypes.QuerySnapshot) =>
      onData(snap.docs.map(d => normalizeComment(d.id, d.data() as Raw))),
    e => onError?.(e),
  );
}

/**
 * 조회수 +1.
 * 규칙상 views 단독 변경은 로그인 사용자만 허용되므로 비로그인 시 조용히 실패한다.
 */
export async function incView(postId: string): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTIONS.boardPosts, postId), {
      views: increment(1),
      updatedAt: Date.now(),
    });
  } catch {
    // 비로그인/권한 없음 — 조회수는 부가 기능이라 무시
  }
}

/* ───────────────────────── 표시 유틸 ───────────────────────── */

/** 목록에 보여줄 본문 첫 줄 (웹 firstLine 이식) */
export function firstLine(p: Post): string {
  const line = p.body.replace(/\r\n|\r/g, '\n').split('\n').find(s => s.trim()) ?? '';
  const t = line.trim();
  return t.length > 80 ? `${t.slice(0, 80)}…` : t;
}

/** 오늘이면 HH:MM, 아니면 MM.DD (게시판 관습) */
export function boardDate(ms: number): string {
  if (!ms) return '-';
  const d = new Date(ms);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const p2 = (n: number) => String(n).padStart(2, '0');
  return sameDay
    ? `${p2(d.getHours())}:${p2(d.getMinutes())}`
    : `${p2(d.getMonth() + 1)}.${p2(d.getDate())}`;
}

/** 상세용 전체 일시 */
export function fullDate(ms: number): string {
  if (!ms) return '-';
  const d = new Date(ms);
  const p2 = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p2(d.getMonth() + 1)}.${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

/* ───────────────────────── 쓰기 (로그인 필요) ───────────────────────── */

/** 글쓰기. 규칙상 authorUid 가 로그인 uid 와 같아야 한다 */
export async function createPost(params: {
  uid: string;
  author: string;
  category: BoardCategory;
  title: string;
  body: string;
  /** 투표 글이면 두 선택지 */
  optA?: string;
  optB?: string;
}): Promise<string> {
  const now = Date.now();
  const ref = await addDoc(collection(db, COLLECTIONS.boardPosts), {
    category: params.category,
    title: params.title.trim(),
    body: params.body.trim(),
    content: params.body.trim(),
    author: params.author || '익명',
    authorUid: params.uid,
    views: 0,
    likes: 0,
    cmtCount: 0,
    ...(params.category === 'vote'
      ? { optA: params.optA?.trim() ?? '', optB: params.optB?.trim() ?? '', votesA: 0, votesB: 0 }
      : {}),
    isNotice: false,
    images: [],
    source: 'app',
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

/** 추천(좋아요) +1. 규칙상 likes 단독 변경은 로그인 사용자면 허용 */
export async function likePost(postId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.boardPosts, postId), {
    likes: increment(1),
    updatedAt: Date.now(),
  });
}

/** 투표하기 — A/B 중 하나 +1 */
export async function votePost(postId: string, choice: 'A' | 'B'): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.boardPosts, postId), {
    [choice === 'A' ? 'votesA' : 'votesB']: increment(1),
    updatedAt: Date.now(),
  });
}

/** 댓글 작성. 게시글의 cmtCount 도 함께 올린다 */
export async function createComment(params: {
  postId: string;
  uid: string;
  author: string;
  body: string;
}): Promise<void> {
  const now = Date.now();
  await addDoc(collection(db, COLLECTIONS.boardPosts, params.postId, 'comments'), {
    body: params.body.trim(),
    author: params.author || '익명',
    authorUid: params.uid,
    parentId: null,
    createdAt: now,
    updatedAt: now,
  });
  // 집계 실패가 댓글 작성 자체를 되돌리지는 않게 분리
  try {
    await updateDoc(doc(db, COLLECTIONS.boardPosts, params.postId), {
      cmtCount: increment(1),
      updatedAt: now,
    });
  } catch {
    // 규칙상 cmtCount 단독 변경이 막혀 있으면 목록 숫자만 잠시 어긋난다
  }
}
