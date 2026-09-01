/**
 * 신고·차단 서비스 (Apple 심사지침 1.2).
 *
 * Firestore 구조
 *   reports/{auto}        { reporterUid, reporterName, targetType, targetId,
 *                           targetOwnerUid, targetOwnerName, excerpt,
 *                           reason, detail, status, createdAt }
 *   blocks/{uid__blocked} { ownerUid, blockedUid, blockedName, createdAt }
 *
 * 차단은 **클라이언트 필터**다. 상대의 글을 서버에서 지우는 게 아니라
 * 내 화면에서만 감춘다 (상대는 자기 글이 사라진 걸 알 수 없음).
 */
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit as fbLimit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { COLLECTIONS } from '@/constants/app';
import type { ReportTargetType } from '@/constants/moderation';
import { auth, db } from '@/services/firebase';

export interface BlockedUser {
  uid: string;
  name: string;
  createdAt: number;
}

function tsToMs(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  const o = v as { toMillis?: () => number; seconds?: number };
  if (typeof o.toMillis === 'function') return o.toMillis();
  if (typeof o.seconds === 'number') return o.seconds * 1000;
  return 0;
}

const blockId = (ownerUid: string, blockedUid: string) =>
  `${ownerUid}__${blockedUid}`;

/* ───────────────────────── 신고 ───────────────────────── */

export interface ReportParams {
  targetType: ReportTargetType;
  targetId: string;
  /** 신고 대상 작성자 uid — 차단 연계에 쓴다 */
  targetOwnerUid?: string;
  targetOwnerName?: string;
  /** 관리자가 맥락을 알 수 있도록 원문 일부 (최대 200자) */
  excerpt?: string;
  reason: string;
  detail?: string;
}

/**
 * 신고 접수. 관리자 웹 "신고 관리" 에서 조회한다.
 * 로그인 사용자만 가능 (규칙에서도 강제).
 */
export async function reportContent(params: ReportParams): Promise<void> {
  const u = auth.currentUser;
  if (!u) throw new Error('로그인이 필요합니다.');

  await setDoc(doc(collection(db, COLLECTIONS.reports)), {
    reporterUid: u.uid,
    reporterName: u.displayName || u.email || '익명',
    targetType: params.targetType,
    targetId: String(params.targetId || ''),
    targetOwnerUid: String(params.targetOwnerUid || ''),
    targetOwnerName: String(params.targetOwnerName || ''),
    excerpt: String(params.excerpt || '').slice(0, 200),
    reason: params.reason,
    detail: String(params.detail || '').slice(0, 500),
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

/* ───────────────────────── 차단 ───────────────────────── */

export async function blockUser(blockedUid: string, blockedName = ''): Promise<void> {
  const u = auth.currentUser;
  if (!u) throw new Error('로그인이 필요합니다.');
  if (!blockedUid) throw new Error('차단할 사용자를 찾을 수 없습니다.');
  if (blockedUid === u.uid) throw new Error('자기 자신은 차단할 수 없습니다.');

  await setDoc(doc(db, COLLECTIONS.blocks, blockId(u.uid, blockedUid)), {
    ownerUid: u.uid,
    blockedUid,
    blockedName: String(blockedName || '').slice(0, 60),
    createdAt: serverTimestamp(),
  });
}

export async function unblockUser(blockedUid: string): Promise<void> {
  const u = auth.currentUser;
  if (!u) throw new Error('로그인이 필요합니다.');
  await deleteDoc(doc(db, COLLECTIONS.blocks, blockId(u.uid, blockedUid)));
}

/** 내가 차단한 사용자 목록 구독 */
export function subscribeMyBlocks(
  ownerUid: string,
  onData: (rows: BlockedUser[]) => void,
) {
  return onSnapshot(
    query(
      collection(db, COLLECTIONS.blocks),
      where('ownerUid', '==', ownerUid),
      fbLimit(300),
    ),
    (snap: FirebaseFirestoreTypes.QuerySnapshot) => {
      const rows = snap.docs.map(d => {
        const x = (d.data() ?? {}) as Record<string, unknown>;
        return {
          uid: String(x.blockedUid ?? ''),
          name: String(x.blockedName ?? '') || '알 수 없음',
          createdAt: tsToMs(x.createdAt),
        };
      });
      rows.sort((a, b) => b.createdAt - a.createdAt);
      onData(rows);
    },
    () => onData([]),
  );
}

/** 1회성 조회 — 구독이 과한 곳에서 사용 */
export async function fetchBlockedUids(ownerUid: string): Promise<string[]> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.blocks),
      where('ownerUid', '==', ownerUid),
      fbLimit(300),
    ),
  );
  return snap.docs
    .map((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) =>
      String((d.data() ?? {}).blockedUid ?? ''),
    )
    .filter(Boolean);
}
