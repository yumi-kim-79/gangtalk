/**
 * src/main-admin.js
 * ------------------------------------------------------------
 * gangtalk815.com (관리자 전용) Vue 진입점.
 *  - App.vue 대신 AdminApp.vue
 *  - router 대신 router/admin.js  (/admin/* + /login 만)
 *  - FCM / PWA SW 제외 (관리자는 푸시 필요 없음)
 *  - 기존 src/main.js 의 관리자 자동등록 로직(ensureAdminProvision) 유지
 * ------------------------------------------------------------
 */

import { createApp } from 'vue'
import AdminApp from './AdminApp.vue'
import router from './router/admin.js'

// ❗ Firebase / AppCheck 초기화는 최상위에서 가장 먼저
import '@/firebase'
import { firebaseReady } from '@/firebase'

// 관리자 자동등록 (gangtalk815@gmail.com → admins/{uid})
import { getAuth } from 'firebase/auth'
import {
  getFirestore, doc, getDoc, setDoc, serverTimestamp,
} from 'firebase/firestore'

// 전역 스타일
import './reset.css'
import '@/styles/theme.css'
import '@/styles/admin.css'
import { normalizeTheme, applyThemeToDom } from '@/store/theme.js'

const ALLOWED_ADMIN_EMAILS = new Set([
  'gangtalk815@gmail.com',
])

async function ensureAdminProvision() {
  try {
    const auth = getAuth()
    const db = getFirestore()
    const u = auth.currentUser
    if (!u) return
    const email = String(u.email || '').toLowerCase()
    if (!ALLOWED_ADMIN_EMAILS.has(email)) return
    const ref = doc(db, 'admins', u.uid)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      await setDoc(ref, { role: 'admin', createdAt: serverTimestamp() }, { merge: true })
      console.info('[ADMIN] admins/{uid} 문서 자동 생성:', u.uid)
    }
  } catch (e) {
    console.warn('[ADMIN] 자동 등록 실패(무시 가능):', e?.message || e)
  }
}

// 구형 iOS 대비
function setVhVar() {
  const vh = window.innerHeight * 0.01
  document.documentElement.style.setProperty('--vh', `${vh}px`)
}
setVhVar()
window.addEventListener('resize', setVhVar)

// 잔존 SW 정리 (관리자 빌드에서는 SW 등록하지 않음)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations?.()
    .then(regs => regs.forEach(r => r.unregister()))
    .catch(() => {})
}

const app = createApp(AdminApp)
app.use(router)

router.isReady().then(async () => {
  try {
    await firebaseReady
  } catch (e) {
    console.warn('[admin bootstrap] firebaseReady 실패:', e)
  }

  const initialTheme = normalizeTheme(localStorage.getItem('theme') || 'white')
  applyThemeToDom(initialTheme)
  try { localStorage.setItem('theme', initialTheme) } catch {}

  app.mount('#app')

  await ensureAdminProvision()
})

export default app
