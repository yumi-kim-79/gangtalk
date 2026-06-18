// firebase.js — Web2 구성 + App Check(Enterprise) + 로컬 디버그 토큰 고정 + 안전 대기(firebaseReady)

// ✅ 빌드 타겟 분기:
//   gangtalk815.com (관리자) 빌드는 reCAPTCHA Enterprise 사이트 키에
//   도메인이 등록돼 있지 않아 AppCheck 초기화가 항상 실패한다 (appCheck/recaptcha-error).
//   관리자 페이지는 본인 인증된 사용자만 사용하므로 AppCheck 가 필요 없음 → 초기화 자체를 스킵.
const IS_ADMIN_BUILD =
  (typeof import.meta !== 'undefined' &&
    import.meta?.env?.VITE_BUILD_TARGET === 'admin')

import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  setPersistence,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  inMemoryPersistence,
} from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  ReCaptchaV3Provider,
  getToken,
} from 'firebase/app-check'

/* ──────────────────────────────────────────────────────────
   0) App Check 디버그/운영 하드닝
   - 운영(실서버)에서는 디버그 흔적/파라미터 제거
   - 로컬(localhost, 127.0.0.1)에서는 고정 디버그 토큰 사용
   ────────────────────────────────────────────────────────── */
;(function setupAppCheckDebug() {
  if (typeof window === 'undefined') return

  const host = window.location.hostname
  const isLocal = host === 'localhost' || host === '127.0.0.1'

  // 운영 URL의 ?appCheckDebug 등 디버그 파라미터 제거
  try {
    if (!isLocal) {
      const usp = new URLSearchParams(window.location.search)
      let touched = false
      ;['appCheckDebug', 'firebaseAppCheckDebugToken'].forEach(k => {
        if (usp.has(k)) { usp.delete(k); touched = true }
      })
      if (touched) {
        const clean =
          window.location.pathname +
          (usp.toString() ? '?' + usp.toString() : '') +
          window.location.hash
        window.history.replaceState(null, '', clean)
      }
    }
  } catch {}

  // 로컬 전용 디버그 토큰(사용자 제공)
  const LOCAL_DEBUG_TOKEN = '95ABB125-8AB9-4005-A90D-1F6D6620A6F4'

  try {
    if (isLocal) {
      // ① 전역 플래그
      window.FIREBASE_APPCHECK_DEBUG_TOKEN = LOCAL_DEBUG_TOKEN
      // ② 로컬스토리지 키(파이어베이스가 참조)
      try { localStorage.setItem('firebase:appCheckDebugToken', LOCAL_DEBUG_TOKEN) } catch {}
    } else {
      // 운영에서는 어떤 디버그 흔적도 제거
      try { localStorage.removeItem('firebase:appCheckDebugToken') } catch {}
      try { sessionStorage.removeItem('firebase:appCheckDebugToken') } catch {}
      try { delete window.FIREBASE_APPCHECK_DEBUG_TOKEN } catch {}
      window.FIREBASE_APPCHECK_DEBUG_TOKEN = undefined
    }
  } catch {}
})();

/* ──────────────────────────────────────────────────────────
   1) Firebase 설정 (GangTalk-Web2)
   ────────────────────────────────────────────────────────── */
const firebaseConfig = {
  apiKey:            'AIzaSyCpoG1MamqFD0pMbltCmG46eAhSfnIvqAk',
  authDomain:        'gangtalk-b8eb8.firebaseapp.com',
  projectId:         'gangtalk-b8eb8',
  storageBucket:     'gangtalk-b8eb8.firebasestorage.app', // ★ 버킷 이름 수정
  messagingSenderId: '804477097788',
  appId:             '1:804477097788:web:81adf7b756f7809e0ab039',
  measurementId:     'G-5Y3DC0NM4C',
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

/* ──────────────────────────────────────────────────────────
   2) App Check (Enterprise 우선, 필요 시 v3로 폴백)
   ────────────────────────────────────────────────────────── */
const ENTERPRISE_SITE_KEY =
  (import.meta?.env?.VITE_RECAPTCHA_ENTERPRISE_KEY) ||
  '6LcrdwgsAAAAAKuZv6l9kYvnyS83LED3cNz_Qsoz'   // 기존 값 유지

const V3_SITE_KEY =
  (import.meta?.env?.VITE_RECAPTCHA_V3_SITE_KEY) || ''

const appCheckProvider = IS_ADMIN_BUILD
  ? null  // ✅ 관리자 빌드는 AppCheck 초기화 스킵
  : (ENTERPRISE_SITE_KEY
      ? new ReCaptchaEnterpriseProvider(ENTERPRISE_SITE_KEY)
      : (V3_SITE_KEY ? new ReCaptchaV3Provider(V3_SITE_KEY) : null))

if (!appCheckProvider && !IS_ADMIN_BUILD) {
  console.warn('[AppCheck] No provider key configured. Add ENTERPRISE or V3 site key.')
}
if (IS_ADMIN_BUILD) {
  console.info('[AppCheck] disabled in admin build (gangtalk815)')
}

const appCheck = appCheckProvider
  ? initializeAppCheck(app, { provider: appCheckProvider, isTokenAutoRefreshEnabled: true })
  : null

// 첫 토큰(캐시 허용) — 준비 Promise로 사용
const _appCheckReady = (async () => {
  if (!appCheck) return null
  try {
    const t = await getToken(appCheck)
    return t
  } catch (e) {
    console.warn('[AppCheck] token error:', e?.message || e)
    return null
  }
})()

// 탭 복귀 시 토큰 재확인
if (typeof document !== 'undefined' && appCheck) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      getToken(appCheck).catch(() => {})
    }
  })
}

/* ──────────────────────────────────────────────────────────
   3) Firestore / Storage / Auth
   ────────────────────────────────────────────────────────── */
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)

// 퍼시스턴스 (IndexedDB → LocalStorage → InMemory 순 폴백).
// firebaseReady 가 시작되기 전에 끝나도록 모듈 스코프 promise 로 노출.
const persistenceReady = (async () => {
  try {
    await setPersistence(auth, indexedDBLocalPersistence)
  } catch {
    try {
      await setPersistence(auth, browserLocalPersistence)
    } catch {
      await setPersistence(auth, inMemoryPersistence)
    }
  }
})().catch(() => {})

/* ──────────────────────────────────────────────────────────
   4) 익명 로그인 보장 + 외부 준비 Promise
   ──────────────────────────────────────────────────────────
   race 차단 (2026-06-18):
   - 이전: onAuthStateChanged 첫 콜백이 null 이면 즉시 signInAnonymously
     → SDK 가 indexedDB/localStorage 에서 실계정 복원 중인 동안 익명 user 가
       currentUser 점유 → 실계정 잃음
   - 이후:
     ① persistence 설정 완료 대기
     ② 첫 콜백이 user 면 즉시 채택, null 이면 grace period (2500ms) 대기
     ③ grace 동안 두 번째 콜백이 user 주면 그 user 채택
     ④ grace 후에도 user 없으면 그제야 익명 로그인 (진짜 비로그인)
   ────────────────────────────────────────────────────────── */
const RESTORE_GRACE_MS = 2500

async function ensureSignedIn() {
  // ① persistence 설정 완료까지 대기 — 미설정 상태에서 signInAnonymously 호출 시
  //    in-memory 폴백으로 저장될 수 있어 새로고침 시 사라짐.
  await persistenceReady

  if (auth.currentUser) return auth.currentUser

  // ② onAuthStateChanged 의 첫 user 발화를 대기. null 발화는 grace 동안 무시.
  const restored = await new Promise((resolve) => {
    let done = false
    let unsub = () => {}
    const finish = (u) => {
      if (done) return
      done = true
      try { unsub() } catch {}
      clearTimeout(timer)
      resolve(u || null)
    }
    const timer = setTimeout(() => finish(auth.currentUser || null), RESTORE_GRACE_MS)
    unsub = onAuthStateChanged(auth, (u) => {
      if (u) finish(u)
      // u=null 일 때는 SDK 가 아직 복원 중일 수 있으므로 timer 만료까지 더 기다림.
    })
  })

  if (restored) return restored

  // ③ 진짜 비로그인 → 익명 로그인
  try {
    const cred = await signInAnonymously(auth)
    return cred.user ?? null
  } catch (e) {
    console.warn('[Auth] anonymous sign-in failed:', e?.message || e)
    return null
  }
}

const firebaseReady = (async () => {
  try { await _appCheckReady } catch {}
  await ensureSignedIn()
})()

/* ──────────────────────────────────────────────────────────
   5) exports (신규 + 레거시 호환 별칭)
   ────────────────────────────────────────────────────────── */
export { app, auth, db, storage, appCheck, firebaseReady, ensureSignedIn }

// ▼▼▼ 레거시 이름 호환(기존 코드 수정 최소화) ▼▼▼
export { app as fbApp }
export { auth as fbAuth }
export { db as fbDb }
export { storage as fbStorage }
export { appCheck as fbAppCheck }
