// src/lib/messaging.js
/**
 * 웹 FCM 유틸:
 * - 서비스워커 등록(재사용)
 * - 권한 요청 → 토큰 발급(VAPID = .env 의 VITE_FCM_VAPID_KEY)
 * - (관리자이면) admin 토픽 자동 구독(callable)
 * - 포그라운드 onMessage 바인딩
 *
 * 사용:
 *   import { setupMessaging } from '@/lib/messaging'
 *   await setupMessaging()
 */

import { getApp } from 'firebase/app'
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
} from 'firebase/messaging'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { getAuth } from 'firebase/auth'

/* ──────────────────────────────────────────────────────────
   내부: 서비스워커 등록/재사용
   ────────────────────────────────────────────────────────── */
async function registerMessagingSW() {
  if (!('serviceWorker' in navigator)) return null
  // 동일 경로가 이미 있으면 재사용
  const existing = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
  if (existing) return existing
  // 없으면 새로 등록
  return navigator.serviceWorker.register('/firebase-messaging-sw.js')
}

/* ──────────────────────────────────────────────────────────
   외부: FCM 기본 세팅(권한 → 토큰 → (관리자)토픽 구독 → onMessage)
   ────────────────────────────────────────────────────────── */
export async function setupMessaging({
  requestPermission = true,
  onForeground = defaultOnMessage,
} = {}) {
  // FCM 지원 브라우저인지 확인
  if (!(await isSupported())) {
    console.warn('[FCM] 이 브라우저는 FCM을 지원하지 않습니다.')
    return { token: null, supported: false }
  }

  // SW 등록
  const swReg = await registerMessagingSW()
  if (!swReg) {
    console.warn('[FCM] 서비스워커를 등록할 수 없습니다.')
    return { token: null, supported: true }
  }

  // 권한 요청
  if (requestPermission) {
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') {
      console.warn('[FCM] 알림 권한 거부됨')
      return { token: null, supported: true }
    }
  }

  // VAPID 공개키 필수
  const vapidKey = import.meta.env?.VITE_FCM_VAPID_KEY
  if (!vapidKey) {
    console.warn('[FCM] VAPID 공개키(VITE_FCM_VAPID_KEY)가 설정되지 않았습니다.')
    return { token: null, supported: true }
  }

  // 토큰 발급
  const app = getApp()
  const messaging = getMessaging(app)
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: swReg,
  })

  if (!token) {
    console.warn('[FCM] 토큰 발급 실패')
    return { token: null, supported: true }
  }

  console.info('[FCM] token:', token)

  // (운영자 전용) admin 토픽 자동 구독
  try {
    const auth = getAuth(app)
    // 이미 로그인되어 있어야 함 (firebase.js 의 ensureSignedIn 등 선행)
    const email = auth.currentUser?.email?.toLowerCase?.() || ''
    if (email === 'gangtalk815@gmail.com') {
      await subscribeAdminTopic(token)
      console.log("[FCM] subscribed to 'admin' topic")
    }
  } catch (e) {
    console.warn('[FCM] admin topic subscribe failed:', e?.message || e)
  }

  // 포그라운드 수신
  onMessage(messaging, (payload) => {
    try { onForeground?.(payload) }
    catch (e) { console.warn('[FCM] onForeground 처리 중 오류:', e) }
  })

  return { token, supported: true }
}

/* ──────────────────────────────────────────────────────────
   Callable: admin 토픽 구독 (토큰 변경 시 재호출 가능)
   ────────────────────────────────────────────────────────── */
export async function subscribeAdminTopic(token) {
  const app = getApp()
  const functions = getFunctions(app, 'asia-northeast3')
  const call = httpsCallable(functions, 'subscribeAdminToken')
  // token 인자를 명시적으로 전달(서버에서 유효성 검사)
  return call({ token })
}

/* ──────────────────────────────────────────────────────────
   선택: 토큰만 필요할 때
   ────────────────────────────────────────────────────────── */
export async function getFcmTokenOnly() {
  if (!(await isSupported())) return null
  const swReg = await registerMessagingSW()
  if (!swReg) return null

  const vapidKey = import.meta.env?.VITE_FCM_VAPID_KEY
  if (!vapidKey) return null

  const app = getApp()
  const messaging = getMessaging(app)
  return getToken(messaging, { vapidKey, serviceWorkerRegistration: swReg })
}

/* ──────────────────────────────────────────────────────────
   선택: 포그라운드 메시지 리스너만 등록
   ────────────────────────────────────────────────────────── */
export function onForegroundMessage(callback) {
  try {
    const app = getApp()
    const messaging = getMessaging(app)
    return onMessage(messaging, callback)
  } catch (e) {
    console.warn('[FCM] onForegroundMessage 바인딩 실패:', e)
    return () => {}
  }
}

/* ──────────────────────────────────────────────────────────
   기본 포그라운드 핸들러
   ────────────────────────────────────────────────────────── */
function defaultOnMessage(payload) {
  console.log('[FCM] foreground message:', payload)
  const n = payload.notification || {}
  if (n.title || n.body) {
    try {
      if (Notification.permission === 'granted') {
        const notice = new Notification(n.title || '알림', {
          body: n.body || '',
          icon: n.icon || '/icons/icon-192.png',
          data: payload.data || {},
        })
        notice.onclick = () => {
          const url = notice.data?.url || '/'
          window.focus()
          if (url) window.location.assign(url)
        }
      }
    } catch { /* noop */ }
  }
}
