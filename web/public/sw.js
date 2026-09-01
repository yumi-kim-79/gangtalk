// 최소한의 안전한 fetch 핸들러
self.addEventListener('fetch', (event) => {
  const dest = event.request.destination;

  // 정적 리소스(이미지/폰트/스크립트/스타일)는 건드리지 않음
  if (['image', 'font', 'script', 'style'].includes(dest)) return;

  // 문서 탐색(라우팅)만 다룸
  if (event.request.mode !== 'navigate') return;

  // 필요한 경우에만 respondWith 사용
  event.respondWith(fetch(event.request));
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
