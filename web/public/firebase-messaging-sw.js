/* public/firebase-messaging-sw.js */
/* eslint-disable no-undef */

/**
 * Firebase Messaging 서비스워커(반드시 호스팅 루트 경로)
 * - 빌드 시 public 폴더의 이 파일이 /firebase-messaging-sw.js 로 배포됩니다.
 * - SW는 모듈이 아니라서 compat 버전을 사용합니다.
 */
importScripts('https://www.gstatic.com/firebasejs/9.6.10/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.10/firebase-messaging-compat.js');

/* ──────────────────────────────────────────────────────────
   프로젝트 Firebase 설정 (firebase.js와 동일)
   ────────────────────────────────────────────────────────── */
firebase.initializeApp({
  apiKey:            'AIzaSyCpoG1MamqFD0pMbltCmG46eAhSfnIvqAk',
  authDomain:        'gangtalk-b8eb8.firebaseapp.com',
  projectId:         'gangtalk-b8eb8',
  storageBucket:     'gangtalk-b8eb8.firebasestorage.app',
  messagingSenderId: '804477097788',
  appId:             '1:804477097788:web:0c8664e224e7950c0ab039',
  measurementId:     'G-8PBNPJ8MJX',
});

const messaging = firebase.messaging();

/**
 * 백그라운드 메시지 수신 처리
 * - 서버에서 notification(title/body) 필드를 넣어주면 알림으로 표시됩니다.
 * - data.url 이 있으면 클릭 시 해당 URL로 이동합니다.
 */
messaging.onBackgroundMessage((payload) => {
  const n = payload.notification || {};
  const data = payload.data || {};

  const title = n.title || '알림';
  const options = {
    body: n.body || '',
    icon: n.icon || '/icons/icon-192.png',
    badge: n.badge || '/icons/icon-96.png',
    data, // 클릭 시 참조
  };

  self.registration.showNotification(title, options);
});

/**
 * 알림 클릭 시 동작
 * - data.url 이 있으면 해당 경로로 포커스/오픈
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || '/';
  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const client = allClients.find(c => c.url.includes(self.location.origin));
    if (client) {
      client.focus();
      try { client.postMessage({ type: 'PUSH_CLICK', url }); } catch (_) {}
      return;
    }
    await clients.openWindow(url);
  })());
});
