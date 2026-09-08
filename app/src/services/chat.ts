/**
 * 채팅 — web/src/pages/GangTalkPage.vue 의 rooms 채팅 부분 이식.
 *
 * ⚠️ 경로 선택 근거 (firestore.rules 확인 결과):
 *   - rooms / chat_rooms / chats  : read·create 모두 signedIn → 사용 가능
 *   - rooms_biz/{id}/{sub=**}     : write 가 isAdmin() 뿐 → 사용자가 메시지를 못 보냄
 *   - rooms_open                  : 규칙 자체가 없어 전면 거부 (웹 ChatOpen 도 동작 불가)
 *   → 앱은 `rooms` 컬렉션만 사용한다.
 *
 * 방 생성은 규칙상 관리자만 가능하다(allow create, update: if isAdmin()).
 * 따라서 앱은 관리자가 만들어 둔 방에 입장만 한다.
 */
import {
  addDoc,
  collection,
  limit as fbLimit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { db } from '@/services/firebase';
import { tsToMs } from '@/services/board';
import type { ChatMessage, ChatRoom } from '@/types/chat';
import { ANON_LABEL, displayAuthor } from '@/constants/author';

export const CHAT_COLLECTION = 'rooms';

/** 한 방에서 불러올 메시지 상한 (웹과 동일) */
export const MESSAGE_LIMIT = 300;

type Raw = Record<string, unknown>;
const str = (v: unknown, f = ''): string => (v == null ? f : String(v));

function normalizeRoom(id: string, x: Raw = {}): ChatRoom {
  return {
    id,
    title: str(x.title || x.name) || '채팅방',
    subtitle: str(x.subtitle || x.desc || x.description),
    updatedAt: tsToMs(x.updatedAt ?? x.createdAt),
    lastMessage: str(x.lastMessage || x.lastText),
  };
}

function normalizeMessage(id: string, x: Raw, myUid: string): ChatMessage {
  const authorUid = str(x.authorUid);
  return {
    id,
    text: str(x.text).trim(),
    author: displayAuthor(str(x.author)),
    authorUid,
    createdAt: tsToMs(x.createdAt ?? x.updatedAt),
    mine: !!myUid && authorUid === myUid,
  };
}

/** 방 목록. 규칙상 로그인 상태여야 읽을 수 있다 */
export function subscribeRooms(
  onData: (rooms: ChatRoom[]) => void,
  onError?: (e: unknown) => void,
) {
  return onSnapshot(
    collection(db, CHAT_COLLECTION),
    (snap: FirebaseFirestoreTypes.QuerySnapshot) => {
      const rows = snap.docs.map(d => normalizeRoom(d.id, d.data() as Raw));
      // updatedAt 이 없는 방이 섞여 있어 서버 정렬 대신 클라이언트에서 정렬한다
      rows.sort((a, b) => b.updatedAt - a.updatedAt);
      onData(rows);
    },
    e => onError?.(e),
  );
}

export function subscribeMessages(
  roomId: string,
  myUid: string,
  onData: (messages: ChatMessage[]) => void,
  onError?: (e: unknown) => void,
) {
  return onSnapshot(
    query(
      collection(db, CHAT_COLLECTION, roomId, 'messages'),
      orderBy('createdAt', 'asc'),
      fbLimit(MESSAGE_LIMIT),
    ),
    (snap: FirebaseFirestoreTypes.QuerySnapshot) =>
      onData(snap.docs.map(d => normalizeMessage(d.id, d.data() as Raw, myUid))),
    e => onError?.(e),
  );
}

export async function sendMessage(params: {
  roomId: string;
  uid: string;
  author: string;
  text: string;
}): Promise<void> {
  const text = params.text.trim();
  if (!text) return;
  await addDoc(collection(db, CHAT_COLLECTION, params.roomId, 'messages'), {
    text,
    author: params.author || ANON_LABEL,
    authorUid: params.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  // rooms 문서 갱신(lastMessage 등)은 규칙상 관리자만 가능해 생략한다
}

/** 말풍선 옆 시각 — 오전/오후 h:mm */
export function chatTime(ms: number): string {
  if (!ms) return '';
  const d = new Date(ms);
  const h = d.getHours();
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${h12}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 날짜 구분선 */
export function chatDay(ms: number): string {
  if (!ms) return '';
  const d = new Date(ms);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}
