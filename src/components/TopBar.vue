<!-- src/components/Topbar.vue -->
<template>
  <header class="topbar">
    <div class="container bar-inner">
      <div class="brandWrap">
        <BrandLogo class="brand-logo" :badge-only="true" />

        <a class="wordmark" href="/" @click.prevent="router.push('/')">
          <img
            v-if="hasExternalWordmark"
            class="wordmark-img"
            :src="WORDMARK_PATH"
            alt="강남톡방"
            decoding="async"
            referrerpolicy="no-referrer"
          />
          <svg
            v-else
            class="wordmark-svg"
            viewBox="0 0 560 140"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="강남톡방"
            role="img"
            preserveAspectRatio="xMinYMid meet"
          >
            <text x="0" y="104" class="fill unni">강남톡방</text>
          </svg>
        </a>

        <small class="tagline"></small>
      </div>

      <nav class="actions" aria-label="상단 작업">
        <!-- 🔔 관리자 알림 버튼 제거됨 -->

        <!-- ❓ 헬프 아이콘 추가 -->
        <button
          class="round-icon help"
          title="도움말"
          aria-label="도움말"
          type="button"
          @click="router.push('/help')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.8"/>
            <path
              d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.9.4-1.5 1.1-1.5 2v1"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
            <circle cx="12" cy="17" r="1" fill="currentColor"/>
          </svg>
        </button>

        <!-- 📒 마이 다이어리 -->
        <button
          class="round-icon diary"
          title="마이 다이어리"
          aria-label="마이 다이어리"
          type="button"
          @click="router.push('/diary')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/>
            <path d="M3 9h18M8 2v4M16 2v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </button>

        <!-- 고객센터 -->
        <button class="round-icon" title="고객센터" aria-label="고객센터" type="button" @click="router.push('/support')">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 12a8 8 0 0 1 16 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <rect x="3" y="12" width="3.6" height="6.4" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.8"/>
            <rect x="17.4" y="12" width="3.6" height="6.4" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.8"/>
          </svg>
        </button>

        <!-- ❤️ 찜 목록 -->
        <button
          class="round-icon heart"
          title="찜 목록"
          aria-label="찜 목록"
          type="button"
          @click="router.push('/favorites')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12.1 21.35 10 19.28C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41.81 4.5 2.09C12.09 4.81 13.76 4 15.5 4 18 4 20 6 20 8.5c0 3.78-3.4 6.86-8 10.78l-1.9 2.07z"
              fill="currentColor"
            />
          </svg>
        </button>

        <!-- 🌗 라이트/다크 토글: 마이페이지에서만 노출 -->
        <button
          v-if="isMyPage"
          class="round-icon"
          :class="{ active: isBlack }"
          :title="nextModeTitle"
          :aria-label="nextModeTitle"
          type="button"
          @click="onToggle"
          @keydown.enter.prevent="onToggle"
          @keydown.space.prevent="onToggle"
        >
          <svg v-if="!isBlack" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/>
            <path d="M12 2v3M12 19v3M4.7 4.7l2.1 2.1M17.2 17.2l2.1 2.1M2 12h3M19 12h3M4.7 19.3l2.1-2.1M17.2 6.8l2.1-2.1"
                  fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 12.5a8 8 0 1 1-7.5-10 7 7 0 0 0 7.5 10z"
                  fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </nav>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import BrandLogo from './BrandLogo.vue'

/* public/brand/gangnamtalk-wordmark.png */
const WORDMARK_PATH = '/brand/gangnamtalk-wordmark.png?v=1'
const hasExternalWordmark = ref(false)

/* 마이페이지 여부(경로 기준) */
const route  = useRoute()
const router = useRouter()
const isMyPage = computed(() => route.path.startsWith('/mypage'))

/* theme utils — localStorage만 사용 (URL 쿼리 제거) */
import { setTheme, getTheme, normalizeTheme } from '@/store/theme.js'

/* state */
const isBlack = ref(false)
const nextModeTitle = computed(()=> isBlack.value ? '화이트 모드로 전환' : '블랙(다크) 모드로 전환')

/* actions */
function onToggle(){
  const next = isBlack.value ? 'white' : 'black'
  setTheme(next)
  isBlack.value = (next === 'black')
}

/* init & sync */
onMounted(()=>{
  // 🔒 고정 탑바 사용 플래그 (전역 padding-top 용)
  document.body.classList.add('has-fixed-topbar')

  // 워드마크 이미지 존재 확인
  const img = new Image()
  img.onload  = () => { hasExternalWordmark.value = true }
  img.onerror = () => { hasExternalWordmark.value = false }
  img.src = WORDMARK_PATH

  // 테마 초기화: localStorage 기반
  const current = getTheme()
  isBlack.value = (current === 'black')
})
</script>

<style scoped>
.topbar{
  --btn-size: 36px;
  --emoji-size: 18px;

  /* 🔒 화면 최상단에 항상 고정 */
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 200;

  background: var(--surface);
  color: var(--fg);
  border-bottom: 1px solid var(--line);
  backdrop-filter: saturate(120%) blur(8px);
  padding-top: env(safe-area-inset-top);
}

.bar-inner{ min-height: calc(52px + env(safe-area-inset-top)); display:flex; align-items:center; justify-content:space-between; }

.brandWrap{ display:flex; align-items:center; gap:10px; }
.wordmark{ display:inline-flex; align-items:center; text-decoration:none; }
.topbar{ --wordmark-h: 40px; }
.wordmark-img{ height: var(--wordmark-h); width:auto; display:block; }
.wordmark-svg{ height: var(--wordmark-h); width:auto; display:block; }

@media (max-width: 420px){
  .topbar{ --wordmark-h: 34px; }
}
.wordmark-svg text{ font-family: 'Pretendard','Noto Sans KR','Spoqa Han Sans Neo',system-ui,sans-serif; font-weight:900; font-size:110px; letter-spacing:-2px; }
.wordmark-svg text.fill{ fill:#ff2b8a; }

.actions{ display:flex; gap:10px; align-items:center; }

.round-icon{
  width:var(--btn-size); height:var(--btn-size); border-radius:999px;
  display:grid; place-items:center;
  border:1px solid var(--line);
  background: var(--surface);
  color: var(--fg);
  box-shadow: 0 6px 16px var(--shadow);
  transition: transform .08s ease, outline-color .2s ease, background .2s ease, color .2s ease;
  position: relative;
}
.round-icon:active{ transform: translateY(1px); }
.round-icon.active{ outline: 2px solid var(--accent); }
.round-icon svg{ width: var(--emoji-size); height: var(--emoji-size); display:block; }

/* 개별 아이콘 색상 */
.round-icon.heart{ color: var(--accent); }
.round-icon.help{ color: var(--fg); }

.container{ width:100%; max-width:960px; margin:0 auto; padding:0 14px; }

:root[data-theme="black"] .round-icon{ background:#0f0f12; border-color:#2a2a33; }
</style>

<!-- 🔓 전역(main) 에 적용되는 스타일은 scoped 없이 별도 블록으로 -->
<style>
/* 고정 탑바 높이만큼 상단 패딩을 전역 main에 부여 */
body.has-fixed-topbar main.page,
body.has-fixed-topbar main.page-flat,
body.has-fixed-topbar main.wrap.auth-page{
  /* 🔻 여유는 조금만 남기고, 탑바 바로 아래에 거의 붙도록 60px 로 조정 */
  padding-top: calc(60px + env(safe-area-inset-top));
}
</style>


