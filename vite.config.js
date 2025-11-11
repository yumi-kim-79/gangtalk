// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

/**
 * 배포 후 오래된 화면이 보이는 문제 대응:
 *  1) index.html에 no-store 메타 삽입 (서버 헤더와 이중 방어)
 *  2) 과거에 남아있을 수 있는 Service Worker 강제 해제
 *  3) 빌드 산출물 파일명에 해시 적용으로 캐시 무효화
 */
function htmlHardRefreshPlugin() {
  const buildTime = new Date().toISOString()
  return {
    name: 'html-hard-refresh-and-sw-unregister',
    transformIndexHtml(html) {
      return {
        html,
        tags: [
          { tag: 'meta', attrs: { 'http-equiv': 'Cache-Control', content: 'no-store' }, injectTo: 'head' },
          { tag: 'meta', attrs: { name: 'x-build-time', content: buildTime }, injectTo: 'head' },
          {
            tag: 'script',
            attrs: { type: 'module' },
            children: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations?.()
                  .then(regs => regs.forEach(r => r.unregister()))
                  .catch(() => {});
              }
            `,
            injectTo: 'head',
          },
        ],
      }
    },
  }
}

// ✅ /api 프록시 대상: 환경변수 → 기본값(로컬 백엔드)
const API_PROXY_TARGET =
  process.env.VITE_API_PROXY_TARGET ||
  process.env.API_PROXY_TARGET ||
  'http://localhost:3000' // ← 백엔드 서버 주소(예: PASS 연동 서버 또는 Functions 에뮬 URL)

export default defineConfig({
  plugins: [vue(), htmlHardRefreshPlugin()],

  // Firebase Hosting 루트 기준 고정
  base: '/',

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
      '@pages': fileURLToPath(new URL('./src/pages', import.meta.url)),
      '@store': fileURLToPath(new URL('./src/store', import.meta.url)),
    },
    dedupe: ['vue'],
  },

  server: {
    host: true, // 0.0.0.0
    port: 5173,
    strictPort: false,
    cors: true,
    open: false,
    // 필요하면 에러 오버레이 비활성화
    // hmr: { overlay: false },

    /**
     * ✅ DEV 프록시: /api → 백엔드(PASS)로 전달
     * 프론트에서 fetch('/api/...') 로 호출하면 자동 프록시됩니다.
     */
    proxy: {
      '/api': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
        secure: false,
        // 필요 시 경로 수정:
        // rewrite: (path) => path.replace(/^\/api/, '/api'),
        configure(proxy) {
          // 디버깅 로깅(원하지 않으면 제거)
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('[Vite Proxy] →', req.method, req.url, '=>', API_PROXY_TARGET)
          })
        },
      },
    },
  },

  preview: {
    host: true,
    port: 4173,
    /**
     * 미리보기 환경에서도 동일하게 프록시가 필요하면 아래 주석을 해제하세요.
     */
    // proxy: {
    //   '/api': {
    //     target: API_PROXY_TARGET,
    //     changeOrigin: true,
    //     secure: false,
    //   },
    // },
  },

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    target: 'es2019',
    sourcemap: false,
    emptyOutDir: true, // ✅ 이전 빌드 잔재 제거
    manifest: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // ✅ 해시 파일명으로 강력 캐시 무효화
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: ({ name }) => {
          const ext = name ? name.split('.').pop() : 'asset'
          return `assets/[name]-[hash].${ext}`
        },
      },
    },
  },

  optimizeDeps: {
    include: ['vue'],
  },

  define: {
    __APP_VERSION__: JSON.stringify(new Date().toISOString()),
  },
})
