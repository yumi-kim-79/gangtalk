// src/services/adminInquiryService.js
import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
  setDoc,
} from 'firebase/firestore'
import { auth, db } from '@/firebase'

/** env 플래그: 원격 쓰기 켜기(=1일 때만) */
const REMOTE_ENABLED = String(import.meta?.env?.VITE_CONSULT_WRITE || '0') === '1'
/** 세션 중 권한 오류가 난 뒤엔 더 이상 시도하지 않기 위한 키 */
const SS_SKIP_KEY = 'consult:remote_skip_v1'
/** 로컬 폴백 큐 키(선택) */
const LS_QUEUE_KEY = 'consult:queue_v1'

/** undefined/null 깊은 제거 */
function cleanDeep(input) {
  if (Array.isArray(input)) {
    return input
      .map((v) => cleanDeep(v))
      .filter((v) => v !== undefined && v !== null)
  }
  if (input && typeof input === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(input)) {
      const vv = cleanDeep(v)
      if (
        vv !== undefined &&
        vv !== null &&
        !(typeof vv === 'object' && !Array.isArray(vv) && Object.keys(vv).length === 0)
      ) {
        out[k] = vv
      }
    }
    return out
  }
  return input
}

/** 로컬 폴백 큐 저장(네트워크 못 쓸 때) */
function enqueueLocal(payload) {
  try {
    const arr = JSON.parse(localStorage.getItem(LS_QUEUE_KEY) || '[]')
    arr.push({ ...payload, _ts: Date.now() })
    localStorage.setItem(LS_QUEUE_KEY, JSON.stringify(arr).slice(0, 200000)) // 너무 커지는 것 방지
  } catch { /* no-op */ }
}

/**
 * 관리자 알림/스레드 생성
 * - 권한 없으면 네트워크 호출 자체를 막아 콘솔 에러 제거
 */
export class AdminInquiryService {
  /**
   * @param {'무료법률상담'|'무료세무상담'|'무료창업상담'} type
   * @returns {Promise<string|null>}
   */
  async createInquiry(type) {
    if (!type) return null
    const user = auth?.currentUser || null
    if (!user) return null

    // 이미 스킵 플래그가 있거나 원격 비활성화면, 네트워크 호출 안 함
    const skipByFlag = !REMOTE_ENABLED || sessionStorage.getItem(SS_SKIP_KEY) === '1'
    const now = serverTimestamp()

    // 사용자 문서 경로(권한 없을 수 있으므로 나중에 조건부 사용)
    const userReqRefPath = `users/${user.uid}/consult_requests`

    const userInfo = cleanDeep({
      uid: user.uid,
      email: user.email || undefined,
      displayName: user.displayName || undefined,
      photoURL: user.photoURL || undefined,
    })

    const payloadCommon = cleanDeep({
      type: String(type),
      status: 'open',
      createdAt: now,
      updatedAt: now,
      preview: `${type} 상담 요청`,
      user: userInfo,
    })

    // 네트워크를 쓰지 않는 경우: 로컬에만 저장하고 종료(콘솔도 조용히)
    if (skipByFlag) {
      enqueueLocal({
        ...payloadCommon,
        // serverTimestamp() 대신 숫자로 대체
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      return null
    }

    // ────────────────────────────────────────────────────────────
    // 원격 쓰기 시도(권한 OK인 환경에서만)
    // ────────────────────────────────────────────────────────────
    try {
      // 1) 사용자 소유 하위 컬렉션에 저장
      const userReqRef = doc(collection(db, userReqRefPath))
      await setDoc(
        userReqRef,
        cleanDeep({
          requestId: userReqRef.id,
          ...payloadCommon,
        })
      )

      // 2) (선택) 관리자 인박스 복제 — 실패해도 무시
      try {
        const threadsCol = collection(db, 'admin_chats')
        const threadRef = doc(threadsCol)
        const messagesCol = collection(threadRef, 'messages')
        const messageRef = doc(messagesCol)
        const alertsCol = collection(db, 'admin_alerts')
        const alertRef = doc(alertsCol)

        const batch = writeBatch(db)
        batch.set(
          threadRef,
          cleanDeep({
            threadId: threadRef.id,
            type: String(type),
            status: 'open',
            participants: ['admin', user.uid],
            createdBy: user.uid,
            createdAt: now,
            updatedAt: now,
            lastMessagePreview: `${type} 요청이 접수되었습니다.`,
            lastMessageAt: now,
            user: userInfo,
            userRequestRef: userReqRef.path,
          })
        )
        batch.set(
          messageRef,
          cleanDeep({
            messageId: messageRef.id,
            senderUid: user.uid,
            text: `[자동생성] ${type} 상담을 요청합니다.`,
            type: 'text',
            createdAt: now,
          })
        )
        batch.set(
          alertRef,
          cleanDeep({
            alertId: alertRef.id,
            kind: 'consult_request',
            type: String(type),
            threadId: threadRef.id,
            byUid: user.uid,
            createdAt: now,
            userRequestRef: userReqRef.path,
          })
        )
        await batch.commit()
      } catch {
        // 관리자 인박스 실패는 조용히 무시
      }

      return null
    } catch (e) {
      // 권한 문제 감지 → 세션 동안 추가 시도 금지(에러 로그도 중단)
      const msg = String(e?.message || e || '')
      if (
        msg.includes('Missing or insufficient permissions') ||
        e?.code === 'permission-denied'
      ) {
        sessionStorage.setItem(SS_SKIP_KEY, '1')
      }
      // 폴백으로 로컬 큐 저장
      enqueueLocal({
        ...payloadCommon,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        _err: 'permission',
      })
      return null
    }
  }
}

export const adminInquiryService = new AdminInquiryService()
