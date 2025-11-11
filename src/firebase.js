// firebase.js — Web2 구성 + App Check 안정화(Enterprise 우선) + 로컬 디버그 + 안전 대기(firebaseReady)

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
   0) 운영에서 디버그 강제 차단 (초기화 전에 실행!)
   ────────────────────────────────────────────────────────── */
;(function hardenAppCheckDebugFlag(){
  if (typeof window === 'undefined') return
  const host = window.location.hostname
  const isLocal = host === 'localhost' || host === '127.0.0.1'

  // (a) URL의 디버그 파라미터 제거
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

  // (b) 전역 디버그 토큰
  try {
    if (isLocal) {
      window.FIREBASE_APPCHECK_DEBUG_TOKEN = true
    } else {
      delete window.FIREBASE_APPCHECK_DEBUG_TOKEN
      window.FIREBASE_APPCHECK_DEBUG_TOKEN = undefined
    }
  } catch {}

  // (c) 과거에 남은 디버그 토큰 키 제거(운영)
  try {
    if (!isLocal) {
      const keys = ['firebase:appCheckDebugToken', 'FIREBASE_APPCHECK_DEBUG_TOKEN']
      keys.forEach(k => {
        try { localStorage.removeItem(k) } catch {}
        try { sessionStorage.removeItem(k) } catch {}
      })
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
  storageBucket:     'gangtalk-b8eb8.appspot.com',
  messagingSenderId: '804477097788',
  appId:             '1:804477097788:web:81adf7b756f7809e0ab039',
  measurementId:     'G-5Y3DC0NM4C',
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

/* ──────────────────────────────────────────────────────────
   2) App Check (Enterprise 우선, 필요 시 v3로 스위칭 가능)
   ────────────────────────────────────────────────────────── */
const ENTERPRISE_SITE_KEY =
  (import.meta?.env?.VITE_RECAPTCHA_ENTERPRISE_KEY) ||
  '6LcrdwgsAAAAAKuZv6l9kYvnyS83LED3cNz_Qsoz'

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
      getToken(appCheck).catch(()=>{})
    }
  })
}

/* ──────────────────────────────────────────────────────────
   3) 나머지 서비스
   ────────────────────────────────────────────────────────── */
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)

// 퍼시스턴스
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
   5) export (새 이름 + 레거시 호환 별칭 함께)
   ────────────────────────────────────────────────────────── */
export { app, auth, db, storage, appCheck, firebaseReady, ensureSignedIn }

// ▼▼▼ 레거시 이름 호환(기존 코드 수정 없이 빌드되게) ▼▼▼
export { app as fbApp }
export { auth as fbAuth }
export { db as fbDb }
export { storage as fbStorage }
export { appCheck as fbAppCheck }
