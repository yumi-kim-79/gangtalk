/**
 * src/composables/useAuthRole.js
 * ------------------------------------------------------------
 * gangtalk815 (admin 빌드) 의 인증/역할 판별 단일 진입점.
 *
 *  - 기존에는 router/admin.js, BizLoginPage, AdminLoginPage, AdminLayout 4곳에서
 *    `resolveRole` 가 중복 구현돼 한 곳 실패 시 다른 곳과 결과가 달라지는
 *    inconsistency 발생.
 *  - 본 모듈로 단일화하면서 두 가지 race 도 함께 차단:
 *      1) onAuthStateChanged 1회 promise 가 토큰 갱신 race 시 user=null 로 굳어버림
 *         → "마지막으로 확정된 user" 를 폴백으로 유지 (lastKnownUser)
 *      2) users/{uid} getDoc 실패 시 즉시 role=null 단정
 *         → 짧은 retry 후에도 실패한 경우만 unresolved 로 보고, 호출자가 분기
 *
 * 사용:
 *   import { authReady, getRole, invalidateRoleCache } from '@/composables/useAuthRole'
 *
 *   await authReady()            // 첫 onAuthStateChanged 콜백까지 대기
 *   const { role, resolved } = await getRole({ retries: 1 })
 *   // role:     'platform' | 'biz' | null
 *   // resolved: true 면 확정 (강제 로그아웃 OK)
 *   //           false 면 일시 오류 (재시도 권장, signOut 하지 말 것)
 *
 *   invalidateRoleCache()  // 명시적 로그아웃/계정 전환 시 호출
 * ------------------------------------------------------------
 */

import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { db as fbDb } from '@/firebase'
import { doc, getDoc } from 'firebase/firestore'

const PLATFORM_EMAIL = 'gangtalk815@gmail.com'

/* ------------------------------------------------------------
 * 인증 상태
 * ------------------------------------------------------------
 *  - currentUser: onAuthStateChanged 가 보고한 가장 최근 값. null/User 객체
 *  - lastKnownUser: 한 번이라도 set 된 User 객체. 토큰 갱신 race 폴백용.
 *      명시적 logout 시 invalidateRoleCache() 가 함께 비움.
 *  - ready: 첫 onAuthStateChanged 콜백이 한 번이라도 발화했는지
 */
let currentUser = undefined
let lastKnownUser = null
let ready = false
let waiters = []
let watching = false

function ensureWatching() {
  if (watching) return
  watching = true
  try {
    onAuthStateChanged(getAuth(), (u) => {
      currentUser = u || null
      if (u) lastKnownUser = u
      if (!ready) {
        ready = true
        const fns = waiters
        waiters = []
        for (const fn of fns) {
          try { fn(currentUser) } catch {}
        }
      }
      // uid 가 바뀌었으면 role 캐시 무효
      const newUid = u?.uid || null
      if (roleCache.uid && roleCache.uid !== newUid) {
        roleCache = { uid: null, role: undefined }
        rolePromise = null
      }
    })
  } catch (e) {
    // firebase 미초기화 등 — 다음 호출 시 재시도
    watching = false
    console.warn('[useAuthRole] onAuthStateChanged failed:', e?.message || e)
  }
}

/**
 * 첫 onAuthStateChanged 콜백까지 대기.
 * - ready 인 경우 currentUser 가 null 이어도 lastKnownUser 가 있으면 그것을 반환.
 *   (토큰 갱신 race 로 일시 null 인 시점에 호출돼도 인증 유지로 처리)
 * - 진짜 로그아웃은 invalidateRoleCache() 가 lastKnownUser 도 null 로 비우므로 OK.
 */
export function authReady() {
  ensureWatching()
  if (ready) {
    return Promise.resolve(currentUser ?? lastKnownUser)
  }
  return new Promise((resolve) => {
    waiters.push(() => resolve(currentUser ?? lastKnownUser))
  })
}

/* ------------------------------------------------------------
 * 역할 판별
 * ------------------------------------------------------------ */
let roleCache = { uid: null, role: undefined }   // role === undefined → 미조회
let rolePromise = null                            // in-flight 중복 차단

/**
 * 한 명에 대해 admins/{uid} 우선, 그 다음 users/{uid} 로 role 확정 시도.
 * 반환:
 *   { role: 'platform' | 'biz' | null, resolved: boolean }
 *   resolved=false 면 일시 오류 (Firestore 호출이 모두 실패).
 *   resolved=true && role===null 이면 확정적 "권한 없음".
 */
async function probeRole(user, { retries = 1, delayMs = 300 } = {}) {
  if (!user) return { role: null, resolved: true }

  const email = String(user.email || '').toLowerCase()
  if (email === PLATFORM_EMAIL) return { role: 'platform', resolved: true }

  let adminAttempted = false
  let usersAttempted = false

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // 1) admins/{uid} — Custom Claims 도입 전 일관성 유지
      try {
        const adminSnap = await getDoc(doc(fbDb, 'admins', user.uid))
        adminAttempted = true
        if (adminSnap.exists()) return { role: 'platform', resolved: true }
      } catch (e1) {
        // admins 권한 거부 — 본인 doc 만 read 가능 룰 하 통과 가능하지만 실패 시 무시
        console.warn('[useAuthRole] admins read failed:', e1?.code || e1?.message)
      }

      // 2) users/{uid}
      const userSnap = await getDoc(doc(fbDb, 'users', user.uid))
      usersAttempted = true
      if (userSnap.exists()) {
        const d = userSnap.data() || {}
        if (d.type === 'company' && d.accountKind === 'storeOwner') {
          return { role: 'biz', resolved: true }
        }
        // doc 은 있지만 type 이 다름 → 권한 없음 확정
        return { role: null, resolved: true }
      }
      // doc 없음 — 가입 race 일 수 있으니 retry 일 때만 재시도
      if (attempt < retries) {
        await sleep(delayMs)
        continue
      }
      return { role: null, resolved: true }
    } catch (e) {
      console.warn('[useAuthRole] role probe error:', e?.code || e?.message)
      if (attempt < retries) {
        await sleep(delayMs)
        continue
      }
      return { role: null, resolved: false }
    }
  }

  // 도달 불가
  return { role: null, resolved: usersAttempted || adminAttempted }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * 캐시 우선, 미스 시 probe. 중복 호출 시 같은 promise 공유.
 * options.retries — Firestore 호출 재시도 (기본 1)
 */
export async function getRole({ retries = 1 } = {}) {
  ensureWatching()
  const user = await authReady()
  if (!user) return { role: null, resolved: true }

  // 캐시 hit
  if (roleCache.uid === user.uid && roleCache.role !== undefined) {
    return { role: roleCache.role, resolved: true }
  }
  if (rolePromise) return rolePromise

  rolePromise = (async () => {
    const out = await probeRole(user, { retries })
    if (out.resolved && out.role !== null) {
      roleCache = { uid: user.uid, role: out.role }
    } else if (out.resolved && out.role === null) {
      // 확정적 권한 없음도 캐시 (스팸 차단)
      roleCache = { uid: user.uid, role: null }
    } else {
      // 미확정 — 캐시하지 않음 (다음 호출 시 재시도)
    }
    rolePromise = null
    return out
  })()
  return rolePromise
}

/**
 * 명시적 로그아웃 / 계정 전환 시 호출.
 * lastKnownUser 도 함께 무효화 — authReady 가 다음에 currentUser=null 을 반환하도록.
 */
export function invalidateRoleCache() {
  roleCache = { uid: null, role: undefined }
  rolePromise = null
  lastKnownUser = null
}
