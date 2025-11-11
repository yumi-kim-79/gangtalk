/**
 * src/main.js
 * ------------------------------------------------------------
 * ✅ 이 파일의 역할
 *  - PWA 서비스워커(/sw.js)와 FCM 서비스워커(/firebase-messaging-sw.js)를
 *    모두 등록하고, 기존 불필요 SW는 선별적으로만 제거합니다.
 *  - 앱 마운트 후 FCM 초기화(setupMessaging)까지 수행합니다.
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

// 전역 스타일
import './reset.css'
import '@/styles/theme.css'
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
      })
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

  const cur = router.currentRoute.value
  const initialTheme = (
    cur.query.theme ||
    localStorage.getItem('theme') ||
    'white'
  ).toString()

  document.documentElement.setAttribute('data-theme', initialTheme)
  localStorage.setItem('theme', initialTheme)

  app.mount('#app')

  // 🔔 푸시 초기화: 사용자 권한이 허용되면 토큰 발급 및 포그라운드 수신 바인딩
  // (권장: 최초 진입 버튼/탭 등 사용자 제스처 이후 호출. 임시로 자동 시도)
  try {
    await setupMessaging()
  } catch (e) {
    console.warn('[FCM] setupMessaging 실패:', e)
  }
})

// 라우트 변경마다 theme 반영 (쿼리 우선, 없으면 로컬)
router.afterEach((to) => {
  const theme = (
    to.query.theme ||
    localStorage.getItem('theme') ||
    'white'
  ).toString()
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)
})

export default app
