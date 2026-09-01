// src/services/adminInquiryService.js
import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { auth, db } from '@/firebase'

/* 2026-09-01 수정:
 *   이전에는 VITE_CONSULT_WRITE=1 일 때만 원격에 썼는데 그 값이 어느 .env 에도
 *   없어서, 상담 신청이 항상 localStorage 큐에만 쌓이고 운영자에게 전달되지
 *   않았다. 게다가 쓰려던 대상(admin_chats / admin_alerts / users/{uid}/
 *   consult_requests)은 firestore.rules 에 규칙 자체가 없어 켜도 거부됐다.
 *   → 관리자 메시지함(InboxPage)이 실제로 읽는 adminInbox 로 직접 쓴다.
 *     (firestore.rules:295 `allow create: if signedIn()`)
 *   실패하면 종전처럼 로컬 큐로 폴백한다. */
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

    // 권한 오류가 한 번 난 세션에서만 네트워크 호출을 건너뛴다
    const skipByFlag = sessionStorage.getItem(SS_SKIP_KEY) === '1'
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
    // 원격 쓰기 — 관리자 메시지함(adminInbox)
    // ────────────────────────────────────────────────────────────
    try {
      const ref = doc(collection(db, 'adminInbox'))
      await setDoc(
        ref,
        cleanDeep({
          kind: 'consult_request',
          // InboxPage.vue:34 가 title 을, :41 이 from/type 을 읽는다
          title: `${type} 상담 요청`,
          type: String(type),
          from: userInfo.email || userInfo.displayName || user.uid,
          body: `${type} 상담을 요청했습니다.`,
          status: 'open',
          unread: true,
          byUid: user.uid,
          user: userInfo,
          createdAt: now,
          updatedAt: now,
        })
      )
      return ref.id
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
      // 호출부가 실패를 알 수 있게 다시 던진다 (LeftConsultRibbon 이 안내 문구를 띄운다)
      throw e
    }
  }
}

export const adminInquiryService = new AdminInquiryService()
