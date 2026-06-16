// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

// ✅ gangtalk815.com (관리자) 별도 빌드 여부.
//   `VITE_BUILD_TARGET=admin vite build --outDir dist-admin` 형태로 호출.
const IS_ADMIN_BUILD = process.env.VITE_BUILD_TARGET === 'admin'

/**
 * admin 빌드 시 입력 HTML 은 `index-admin.html` 이지만 산출물 파일명은
 * `dist-admin/index.html` 이어야 Firebase Hosting rewrite 가 정상 동작한다.
 * Vite 가 HTML 산출 후(=closeBundle) fs.rename 으로 직접 교체.
 */
function adminHtmlRenamePlugin() {
  if (!IS_ADMIN_BUILD) return null
  return {
    name: 'admin-html-rename',
    apply: 'build',
    enforce: 'post',
    closeBundle() {
      // outDir 은 CLI --outDir 또는 config 기본값 (dist-admin)
      const outDir = path.resolve(process.cwd(), 'dist-admin')
      const src = path.join(outDir, 'index-admin.html')
      const dst = path.join(outDir, 'index.html')
      if (fs.existsSync(src)) {
        // 기존 index.html 이 있다면 덮어쓰기
        if (fs.existsSync(dst)) fs.unlinkSync(dst)
        fs.renameSync(src, dst)
        console.log('[admin-html-rename] renamed → dist-admin/index.html')
      }
    },
  }
}

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
  plugins: [vue(), htmlHardRefreshPlugin(), adminHtmlRenamePlugin()].filter(Boolean),

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
    // admin 빌드는 CLI `--outDir dist-admin` 로 덮어쓰지만, 안전망으로 여기서도 분기.
    outDir: IS_ADMIN_BUILD ? 'dist-admin' : 'dist',
    assetsDir: 'assets',
    target: 'es2019',
    sourcemap: false,
    emptyOutDir: true, // ✅ 이전 빌드 잔재 제거
    manifest: true,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      // admin 빌드는 별도 HTML 진입점 사용 (generateBundle 에서 index.html 로 rename)
      input: IS_ADMIN_BUILD ? 'index-admin.html' : 'index.html',
      output: {
        // ✅ 해시 파일명으로 강력 캐시 무효화
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: ({ name }) => {
          const ext = name ? name.split('.').pop() : 'asset'
          return `assets/[name]-[hash].${ext}`
        },
        // ✅ Firebase 를 기능별 chunk 로 분리 — 큰 firestore 번들을 페이지가
        //    실제 필요로 할 때만 로드해 초기 진입 부담을 줄임.
        manualChunks(id) {
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            if (id.includes('firestore')) return 'firebase-firestore'
            if (id.includes('/auth')) return 'firebase-auth'
            if (id.includes('storage')) return 'firebase-storage'
            if (id.includes('functions')) return 'firebase-functions'
            if (id.includes('app-check') || id.includes('analytics') || id.includes('performance')) return 'firebase-extras'
            return 'firebase-core'
          }
          if (id.includes('node_modules/vue') || id.includes('node_modules/@vue')) {
            return 'vue-vendor'
          }
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
