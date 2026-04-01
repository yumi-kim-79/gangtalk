// firebase.js — Web2 구성 + App Check(Enterprise) + 로컬 디버그 토큰 고정 + 안전 대기(firebaseReady)

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

const appCheckProvider = ENTERPRISE_SITE_KEY
  ? new ReCaptchaEnterpriseProvider(ENTERPRISE_SITE_KEY)
  : (V3_SITE_KEY ? new ReCaptchaV3Provider(V3_SITE_KEY) : null)

if (!appCheckProvider) {
  console.warn('[AppCheck] No provider key configured. Add ENTERPRISE or V3 site key.')
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

// 퍼시스턴스 (IndexedDB → LocalStorage → InMemory 순 폴백)
;(async () => {
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
   ────────────────────────────────────────────────────────── */
async function ensureSignedIn() {
  if (auth.currentUser) return auth.currentUser
  const existing = await new Promise(resolve => {
    const unsub = onAuthStateChanged(auth, u => { unsub(); resolve(u || null) })
  })
  if (existing) return existing
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
