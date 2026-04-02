/**
 * src/main.js
 * ------------------------------------------------------------
 * ✅ 이 파일의 역할
 *  - PWA 서비스워커(/sw.js)와 FCM 서비스워커(/firebase-messaging-sw.js)를
 *    모두 등록하고, 기존 불필요 SW는 선별적으로만 제거합니다.
 *  - 앱 마운트 후 FCM 초기화(setupMessaging)까지 수행합니다.
 *  - (추가) 허용된 관리자 이메일이면 admins/{uid} 자동 생성
 *
 * ✅ 선행 조건 (반드시 확인)
 *  1) /public/firebase-messaging-sw.js 존재 (프로젝트 config 반영)
 *  2) 루트 .env(.production)에 VITE_FCM_VAPID_KEY=<웹 푸시 공개키>
 *  3) import '@/firebase' 가 먼저 실행되어 Firebase/AppCheck 초기화 완료
 *  4) 이 파일은 https(호스팅) 환경에서 테스트 (로컬 http IP는 SW/푸시 제한)
 *
 * ✅ 테스트 체크리스트
 *  - 브라우저 알림 권한 허용 후 개발자도구 콘솔에 [FCM] token: ... 출력
 *  - Firebase 콘솔 → Cloud Messaging → “특정 토큰 대상”으로 알림 전송
 *  - 포그라운드 메시지는 콘솔 로그로, 백그라운드는 OS 알림으로 확인
 * ------------------------------------------------------------
 */

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { setupMessaging } from './lib/messaging' // 🔔 FCM 초기화

// ❗ App Check/서비스 초기화를 가장 먼저 로드
import '@/firebase'
// 🔑 핵심: Firebase(AppCheck + 익명로그인) 준비 완료 대기용
import { firebaseReady } from '@/firebase'

// 🔐 관리자 자동등록을 위한 Firebase SDK
import { getAuth } from 'firebase/auth'
import {
  getFirestore, doc, getDoc, setDoc, serverTimestamp,
} from 'firebase/firestore'

// 전역 스타일
import './reset.css'
import '@/styles/theme.css'
import { normalizeTheme, applyThemeToDom, attachThemeSync } from '@/store/theme.js'
import '@/styles/safeTap.css'
import './styles/pwa.css'

// 안전 탭 지시자
import safeTap from '@/directives/safeTap'

// ===============================
// Service Worker 관리
// ===============================

// 기존: 모든 SW 일괄 제거 → ❌ 메시징 SW까지 끊겨서 푸시 불가
// 변경: 기존 등록 중, 우리가 쓰지 않는 SW만 선별 제거 (혼선 방지)
async function cleanupOldServiceWorkers() {
  if (!('serviceWorker' in navigator)) return
  try {
    const regs = await navigator.serviceWorker.getRegistrations?.()
    if (!regs || !regs.length) return
    // 우리가 유지할 스크립트들
    const keepList = [
      `${location.origin}/sw.js`,                        // PWA 캐싱 SW
      `${location.origin}/firebase-messaging-sw.js`,     // FCM 메시징 SW
    ]
    await Promise.all(
      regs.map((r) => {
        const url = r?.active?.scriptURL || r?.scriptURL || ''
        if (!keepList.includes(url)) {
          return r.unregister()
        }
        return Promise.resolve()
      }),
    )
  } catch (_) {
    /* noop */
  }
}

// PWA SW 등록
async function registerPwaSW() {
  if (!('serviceWorker' in navigator)) return
  try {
    await navigator.serviceWorker.register('/sw.js')
  } catch (err) {
    console.error('[PWA SW] 등록 실패:', err)
  }
}

// FCM 메시징 전용 SW 등록 (알림 수신용)
async function registerMessagingSW() {
  if (!('serviceWorker' in navigator)) return
  try {
    // messaging SW는 반드시 루트 경로 '/firebase-messaging-sw.js'
    await navigator.serviceWorker.register('/firebase-messaging-sw.js')
  } catch (err) {
    console.error('[Messaging SW] 등록 실패:', err)
  }
}

// onload에 SW 관련 처리
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    await cleanupOldServiceWorkers()
    await registerPwaSW()
    await registerMessagingSW()
  })
}

// ===============================
// 구형 iOS 대비: --vh 변수를 갱신
// ===============================
function setVhVar() {
  const vh = window.innerHeight * 0.01
  document.documentElement.style.setProperty('--vh', `${vh}px`)
}
setVhVar()
window.addEventListener('resize', setVhVar)

// ===============================
// (추가) 관리자 자동 등록 유틸
// ===============================

// ⚠️ 허용할 관리자 이메일 목록: 필요 시 추가/수정
const ALLOWED_ADMIN_EMAILS = new Set([
  'gangtalk815@gmail.com', // 강톡 마스터
])

async function ensureAdminProvision() {
  try {
    const auth = getAuth()
    const db = getFirestore()

    const u = auth.currentUser
    if (!u) return

    // 콘솔에서 UID/이메일 한 번에 확인 가능
    console.log('[AUTH]', { uid: u.uid, email: u.email })

    // 허용된 이메일만 관리자 자동 등록
    const email = String(u.email || '').toLowerCase()
    if (!ALLOWED_ADMIN_EMAILS.has(email)) return

    const ref = doc(db, 'admins', u.uid)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      await setDoc(ref, { role: 'admin', createdAt: serverTimestamp() }, { merge: true })
      console.info('[ADMIN] admins/{uid} 문서 자동 생성 완료:', u.uid)
    }
  } catch (e) {
    console.warn('[ADMIN] 자동 등록 실패(무시 가능):', e?.message || e)
  }
}

// ===============================
// Vue 앱 구동
// ===============================
const app = createApp(App)
app.use(router)
app.directive('safe-tap', safeTap)

// 앱 마운트 전, 현재 라우트/로컬의 테마를 DOM에 반영
router.isReady().then(async () => {
  // 🔒 Firebase(AppCheck + 익명로그인) 준비 끝날 때까지 대기 (가장 중요)
  try {
    await firebaseReady
  } catch (e) {
    console.warn('[bootstrap] firebaseReady 실패(계속 진행):', e)
  }

  const initialTheme = normalizeTheme(localStorage.getItem('theme') || 'white')
  applyThemeToDom(initialTheme)
  try { localStorage.setItem('theme', initialTheme) } catch {}

  attachThemeSync()

  app.mount('#app')

  // 🔐 관리자 자동 등록 (허용 이메일만)
  await ensureAdminProvision()

  // 🔔 푸시 초기화: 사용자 권한이 허용되면 토큰 발급 및 포그라운드 수신 바인딩
  // (권장: 최초 진입 버튼/탭 등 사용자 제스처 이후 호출. 임시로 자동 시도)
  try {
    await setupMessaging()
  } catch (e) {
    console.warn('[FCM] setupMessaging 실패:', e)
  }
})

// 라우트 변경마다 theme 반영 (localStorage 기준)
router.afterEach(() => {
  applyThemeToDom(normalizeTheme(localStorage.getItem('theme') || 'white'))
})

/* ============================================================
 * 🔐 새로고침/탭 종료 시 자동 로그아웃
 * ------------------------------------------------------------
 * - 탭을 닫거나 새로고침(전체 리로드) 할 때 Firebase Auth signOut 실행
 * - 같은 탭 안에서 페이지 이동(router push)은 그대로 로그인 유지
 * - 다른 브라우저/앱(구글, 네이버 등)에서 새로 접속하면 항상 "로그아웃 상태"에서 시작
 * ============================================================ */
window.addEventListener('beforeunload', () => {
  try {
    const auth = getAuth()
    if (auth) {
      auth.signOut().catch(() => {
        // signOut 실패해도 그냥 무시 (언로드 직전이라 재시도 불필요)
      })
    }
  } catch (_) {
    // getAuth 실패 시에도 조용히 무시
  }
})

export default app
