/**
 * 초톡 — 업체가 카톡 내용을 그대로 붙여넣으면 맞출방/필요인원이 자동 반영되는 채널.
 * web/src/pages/ChatBiz.vue 이식.
 *
 * 저장 위치: rooms_biz/{storeId}/rooms/{roomId}/messages
 *            (roomId 기본값 `${storeId}_room_01`)
 * 원문 사본: rooms_biz/{storeId}.lastPastedTextRaw / lastPastedText
 */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { COLLECTIONS } from '@/constants/app';
import { db } from '@/services/firebase';

export interface ChotokMessage {
  id: string;
  text: string;
  author: string;
  authorUid: string;
  /** 'paste' = 붙여넣은 카톡 원문 / 'chat' = 일반 대화 */
  kind: 'paste' | 'chat';
  createdAt: number;
}

export interface ChotokParseResult {
  /** 맞출방 — 숫자로 시작하는 줄 수 */
  roomCount: number;
  /** 필요인원 — 방번호 뒤 첫 숫자의 합 */
  needSum: number;
}

/** 기본 초톡방 id (웹과 동일 규칙) */
export const defaultRoomId = (storeId: string) => `${storeId}_room_01`;

/**
 * 붙여넣은 카톡 텍스트 → 맞출방/필요인원 (웹 parsePasted 이식).
 *
 * 규칙:
 *   - 줄이 숫자(방번호)로 시작하면 맞출방 1개로 센다
 *   - 그 방번호 뒤에 처음 나오는 1~2자리 숫자를 필요인원으로 더한다
 */
export function parseChotok(text: string): ChotokParseResult {
  const lines = String(text ?? '').split(/\r?\n/);
  let roomCount = 0;
  let needSum = 0;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const m1 = line.match(/^\s*(\d{1,4})\b/);
    if (!m1) continue;
    roomCount += 1;

    const m2 = line.slice(m1[0].length).match(/(\d{1,2})/);
    if (m2) {
      const n = Number.parseInt(m2[1], 10);
      if (!Number.isNaN(n)) needSum += n;
    }
  }

  return { roomCount, needSum };
}

function tsToMs(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  const o = v as { toMillis?: () => number; seconds?: number };
  if (typeof o.toMillis === 'function') return o.toMillis();
  if (typeof o.seconds === 'number') return o.seconds * 1000;
  return 0;
}

/**
 * 초톡 메시지 구독.
 * 업체가 관리자 웹에서 붙여넣으면 즉시 내려온다.
 */
export function subscribeChotok(
  storeId: string,
  roomId: string,
  onData: (msgs: ChotokMessage[]) => void,
  onError?: (e: unknown) => void,
) {
  const col = collection(
    db,
    COLLECTIONS.roomsBiz,
    storeId,
    'rooms',
    roomId,
    COLLECTIONS.messages,
  );

  return onSnapshot(
    query(col, orderBy('createdAt', 'asc')),
    (snap: FirebaseFirestoreTypes.QuerySnapshot) => {
      onData(
        snap.docs.map(d => {
          const x = (d.data() ?? {}) as Record<string, unknown>;
          return {
            id: d.id,
            text: String(x.text ?? ''),
            author: String(x.author ?? '업체'),
            authorUid: String(x.authorUid ?? ''),
            kind: x.kind === 'paste' ? 'paste' : 'chat',
            createdAt: tsToMs(x.createdAt),
          };
        }),
      );
    },
    e => onError?.(e),
  );
}

/** rooms_biz/{storeId} 문서에 직접 저장된 지표 (붙여넣기 원문이 없을 때 쓰는 폴백) */
export interface ChotokDocMetrics {
  needRooms: number;
  needPeople: number;
  /** 붙여넣기 원문 — 있으면 이걸 파싱한 값이 우선 */
  pastedText: string;
}

/**
 * rooms_biz/{storeId} 문서 구독.
 *
 * 웹 ChatBiz.recomputeFromLastPasted(:335-365) 는 붙여넣기 원문이 없거나
 * 파싱 결과가 0/0 이면 **문서 필드로 폴백**한다.
 * 앱은 이 폴백이 없어서, 관리자가 수동 저장만 하고 paste 메시지가 없는 업소는
 * 초톡방 상단이 0/0 으로 떴다 — 같은 앱의 현황판 카드와 숫자가 어긋났다.
 */
export function subscribeChotokDoc(
  storeId: string,
  onData: (m: ChotokDocMetrics | null) => void,
  onError?: (e: unknown) => void,
) {
  return onSnapshot(
    doc(db, COLLECTIONS.roomsBiz, storeId),
    (snap: FirebaseFirestoreTypes.DocumentSnapshot) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      const x = (snap.data() ?? {}) as Record<string, unknown>;
      const n = (v: unknown) => {
        const num = Number(v ?? 0);
        return Number.isFinite(num) ? num : 0;
      };
      onData({
        needRooms: n(x.needRooms),
        // 웹과 같은 폴백 순서 (ChatBiz.vue:344-350)
        needPeople: n(x.needPeople ?? x.need ?? x.totalNeeded),
        pastedText: String(x.lastPastedTextRaw || x.lastPastedText || '').trim(),
      });
    },
    e => onError?.(e),
  );
}

/* ───────────────────────── 쓰기 (웹 ChatBiz 와 동일) ───────────────────────── */

/**
 * 초톡 메시지 전송 — 웹 ChatBiz.sendMessage(:390-418) 와 같은 문서 모양.
 * 줄바꿈이 있으면 'paste'(카톡 원문 붙여넣기), 아니면 'chat'.
 */
export async function sendChotokMessage(params: {
  storeId: string;
  uid: string;
  author: string;
  text: string;
}): Promise<void> {
  const text = String(params.text ?? '').replace(/\r\n/g, '\n');
  if (!text.trim()) return;

  const kind: ChotokMessage['kind'] = /\n/.test(text.trim()) ? 'paste' : 'chat';

  await addDoc(
    collection(
      db,
      COLLECTIONS.roomsBiz,
      params.storeId,
      'rooms',
      defaultRoomId(params.storeId),
      COLLECTIONS.messages,
    ),
    {
      text,
      author: params.author || '익명',
      authorUid: params.uid,
      kind,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  );
}

/** 내가 이 초톡방에 참여 중인지 (웹 ChatBiz participants 컬렉션) */
export function subscribeMyJoin(
  storeId: string,
  uid: string,
  onData: (joined: boolean) => void,
) {
  return onSnapshot(
    doc(db, COLLECTIONS.roomsBiz, storeId, 'participants', uid),
    (snap: FirebaseFirestoreTypes.DocumentSnapshot) => onData(snap.exists()),
    () => onData(false),
  );
}

/** 참여자 수 */
export function subscribeParticipantCount(
  storeId: string,
  onData: (n: number) => void,
) {
  return onSnapshot(
    collection(db, COLLECTIONS.roomsBiz, storeId, 'participants'),
    (snap: FirebaseFirestoreTypes.QuerySnapshot) => onData(snap.size),
    () => onData(0),
  );
}

/** 참여 / 참여취소 — 웹 ChatBiz.toggleJoin(:649-674) 이식 */
export async function toggleChotokJoin(params: {
  storeId: string;
  uid: string;
  name: string;
}): Promise<boolean> {
  const ref = doc(db, COLLECTIONS.roomsBiz, params.storeId, 'participants', params.uid);
  const cur = await getDoc(ref);
  if (cur.exists()) {
    await deleteDoc(ref);
    return false;
  }
  await setDoc(ref, {
    uid: params.uid,
    name: params.name || '익명',
    joinedAt: serverTimestamp(),
  });
  return true;
}
