<!-- src/App.vue -->
<template>
  <div class="app-root">
    <TopBar v-if="!hideTopBar" />

    <!-- 전환/캐싱 없이 안전하게 렌더링 (흰 화면 방지) -->
    <RouterView :key="$route.fullPath" />

    <!-- ▶ 전역 가까운 매장 지도 모달 (open-nearby-map 이벤트로 열림) -->
    <NearbyMapModal />

    <!-- 좌측 상담 라벨 (3초 후 슬라이드 인) -->
    <!-- <LeftConsultRibbon /> -->

    <!-- 기존 아이콘/구성 유지 -->
    <BottomNav />
  </div>
</template>

<script setup>
import { onMounted, computed, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import TopBar from '@/components/TopBar.vue'
import BottomNav from '@/components/BottomNav.vue'
// import LeftConsultRibbon from '@/components/LeftConsultRibbon.vue'
import NearbyMapModal from '@/components/map/NearbyMapModal.vue'
import { applyThemeToDom, getTheme, attachThemeSync } from '@/store/theme.js'

const route = useRoute()

// 자체 헤더(AppHeader)를 사용하는 라우트들 (현황판/가게찾기/강톡/제휴관/마이페이지)
// + 자체 brand header 를 가진 업체 회원가입 페이지(bizSignup)
const hideTopBar = computed(() => {
  const n = route.name
  if (n === 'dashboard' || n === 'finder' || n === 'gangtalk' || n === 'chat' || n === 'partners' || n === 'mypage' || n === 'bizSignup') return true
  const p = route.path
  return p === '/' || p === '/dashboard' || p === '/find' || p === '/chat' || p === '/partners' || p === '/mypage' || p === '/biz-signup'
})

// 해당 라우트에서는 TopBar 가 부착한 body 클래스도 제거해
// .page padding-top(60px) 보정이 새 헤더 위에 겹쳐 보이지 않도록 함.
// TopBar 의 onMounted 가 add 한 다음 프레임에 remove 가 실행되도록 nextTick 사용.
watch(hideTopBar, async (on) => {
  if (on) {
    await nextTick()
    document.body.classList.remove('has-fixed-topbar')
  }
}, { immediate: true })

onMounted(async () => {
  applyThemeToDom(getTheme())
  attachThemeSync()
  if (hideTopBar.value) {
    await nextTick()
    document.body.classList.remove('has-fixed-topbar')
  }
})
</script>

<!-- ▼ 전역 스타일 (scoped 아님): 자식 컴포넌트까지 적용됨 -->
<style>
/* ▼▼▼ 전사 공통 헤더/검색 높이 토큰 (페이지 전환 시 레이아웃 점프 방지) ▼▼▼
 *   AppHeader.vue 가 이 토큰을 그대로 사용하므로, 모든 페이지의 헤더+검색 영역
 *   총 높이가 동일하게 잠긴다. 값을 바꾸려면 여기서만 수정. */
:root{
  /* ===== 헤더/검색 (PR 1b 컴팩트 적용 — 64/48/130 → 56/42/114) ===== */
  --app-header-height: 56px;   /* 헤더 영역 최소 높이 (64 → 56) */
  --app-search-height: 42px;   /* 검색창 박스 높이 (48 → 42) */
  --app-header-total:  114px;  /* 헤더 + 검색창 + 위·아래 패딩 합계 (130 → 114) */
  --page-h-pad:        16px;   /* 모든 페이지의 좌우 패딩 단일 토큰 — .page 가 책임 */

  /* ===== 모바일 컴팩트 토큰 (PR 1: 비율 유지 축소) =====
   *   진단: docs/audit/2026-06-22-모바일-비율유지-축소-진단.md
   *   배너/슬라이더는 aspect-ratio 로 비율 유지 → 폭 따라 자동 높이 → 잘림 0
   *   마케팅 자료 비율 12/5 (2.4:1) 표준화. 변경 시 본 토큰만 수정. */
  --banner-aspect:     12 / 5;       /* StoreFinder/PartnersPage 광고 배너 */
  --gt-slider-aspect:  12 / 5;       /* 강톡 상단 슬라이더 (배너와 시각 일관) */

  /* ===== 카테고리 (PR 1b 추가 축소 — 44/8 6 → 40/6 4) =====
   *   원형 40px = 터치 영역 최소 (WCAG 권장 40~44px). 그 아래로 안 감. */
  --cat-icon-size:     40px;          /* 카테고리 원형 아이콘 (44 → 40, 터치 최소선) */
  --cat-grid-gap:      6px 4px;       /* 카테고리 5x2 그리드 간격 (8 6 → 6 4) */
  --cat-label-size:    10.5px;        /* 카테고리 라벨 폰트 (11 → 10.5) */

  /* ===== PR 1b 신규 — 핫이슈/실시간순위/섹션 컴팩트 ===== */
  --hot-card-min-h:    48px;          /* sf-hot min-height (62 → 48) */
  --hot-card-padding:  8px 14px;      /* mp-hot/sf-hot padding (12 16 → 8 14) */
  --hot-card-margin:   0 0 8px;       /* mp-hot/sf-hot margin (0 0 14 → 0 0 8) */
  --section-top-pad:   4px;           /* mp-section 상단 패딩 (8 → 4) */
  --section-head-mb:   10px;          /* section-head margin-bottom (14 → 10) */

  /* ===== PR 2 (2026-06-22): 카드 비율 유지 축소 =====
   *   진단: docs/audit/2026-06-22-모바일-비율유지-축소-진단.md (§4)
   *   Top5 카드 thumb 은 aspect-ratio 로 비율 유지 → 폭 따라 자동 높이 → 잘림 0
   *   현황판 인기업소 썸네일은 정사각 (1:1 자동 유지) — size 토큰만 */
  --card-thumb-aspect: 16 / 9;        /* Top5 카드 thumb 비율 (sf-tops/pp-top-sec 공용) */
  --card-min-width:    180px;          /* Top5 카드 최소 폭 (200 → 180) */
  --card-meta-padding: 10px;          /* Top5 카드 meta 패딩 (12 → 10) */
  --store-thumb-size:  80px;          /* 현황판 인기업소 정사각 썸네일 (96 → 80) */
  --store-card-pad:    10px 4px;      /* mp-store 패딩 (14/4 → 10/4) */

  /* ===== PR 3 (2026-06-22): 강톡 커뮤니티 박스 컴팩트 =====
   *   진단: docs/audit/2026-06-22-모바일-비율유지-축소-진단.md (§5)
   *   4박스 (강톡/힐링톡/우리가게/이벤트톡) height + 내부 폰트/간격 균형 축소.
   *   비율 유지 (height 만 줄임 — 박스 내부는 솔리드 배경, 이미지 없음).
   *   PR 3b (2026-06-22): 추가 압축 — 92px 카드 + 비례 내부 조정 */
  --gc-card-height:    92px;           /* gc-card height (110 → 92) */
  --gc-card-padding:   8px;            /* gc-body padding (10 → 8) */
  --gc-title-size:     15px;           /* gc-title font (16 → 15) */
  --gc-grid-mb:        8px;            /* community-grid margin-bottom (12 → 8) */
  --gc-best-tabs-mb:   8px;            /* best-tabs margin-bottom (10 → 8) */
  --gt-section-head-mb: 6px;           /* gt-section-head margin (8 → 6) */
}

/* 앱 루트 최소 높이 */
.app-root { min-height: 100dvh; min-height: calc(var(--vh, 1vh) * 100); }

/* 전역: 와이파이 배지 규격(아이콘 크기에 자동 맞춤) */
.wifi-badge{
  position:absolute; right:6px; bottom:6px;
  display:grid; place-items:center;
  padding:2px;
  border-radius:999px;
  background:var(--surface);
  border:1px solid var(--line);
  box-shadow:0 4px 12px var(--shadow);
}
.wifi-badge svg{ display:block; width:28px; height:28px; }
.wifi-badge.ok{  color:#21c36b; }
.wifi-badge.mid{ color:#f2a100; }
.wifi-badge.busy{color:#ff6a6a; }

/* ▼ 하단 탭이 어떤 페이지의 내용에 가려지지 않도록 전역 보정 */
:root{ --nav-h: 64px; }

nav.bottom-nav,
.bottom-nav,
.app-bottom-nav,
.tabbar{
  position: fixed !important;
  left: 0; right: 0; bottom: 0;
  height: var(--nav-h);
  z-index: 9999;
  pointer-events: auto;
}

/* 페이지가 탭 아래에 깔리지 않도록 기본 패딩 확보 */
.page,
.page-flat,
main,
#app,
html, body{
  padding-bottom: max(env(safe-area-inset-bottom), var(--nav-h));
}

/* ===================================================================================
   ▼ 소개/칩 전역 강제 (라이트 모드에서 항상 검정, 다크 모드에서 흰색)
   - 이 규칙은 자식 컴포넌트(예: StoreEditPage)의 DOM에도 적용됩니다.
   =================================================================================== */
html[data-theme="light"] .inline-area,
html[data-theme="light"] .inline-chip,
html[data-theme="light"] .tag,
html[data-theme="light"] .tag.sm,
html[data-theme="light"] .chip,
html[data-theme="light"] .chip.pill{
  background:transparent !important;
  color:#111 !important;
  -webkit-text-fill-color:#111 !important; /* iOS/Safari */
  box-shadow:none !important;
  border-color:var(--line) !important;
}

html[data-theme="dark"] .inline-area{
  color:#fff !important;
  -webkit-text-fill-color:#fff !important;
}

:root { --accent: #ff6da1; } /* 상단 글쓰기 버튼과 같은 핑크 계열 */

/* ▼ 닫기(X) 아이콘 강제 검정 고정
   - 전역 테마/아이콘 컬러 규칙이 덮어써도 여기에서 최종 고정
   - LeftConsultRibbon 안의 버튼을 타겟: .ribbon .ribbon-header .btn-x
*/
:root .ribbon .ribbon-header .btn-x,
:root .ribbon .ribbon-header .btn-x i{
  color:#000 !important;
  -webkit-text-fill-color:#000 !important; /* Safari 아이콘폰트 대비 */
}
:root .ribbon .ribbon-header .btn-x i::before{
  color:#000 !important;                 /* 폰트아이콘 의사요소 대비 */
}
:root .ribbon .ribbon-header .btn-x svg{
  fill:#000 !important;
  stroke:#000 !important;                /* SVG 아이콘 대비 */
}
:root .ribbon .ribbon-header .btn-x{
  background:#fff !important;            /* 배경 흰색 고정 */
  filter:none !important;                /* 혹시 테마에서 invert/filter 적용 시 무효화 */
}
</style>

<!-- ▼ 페이지 컨테이너(여기는 scoped 유지: 자식 컴포넌트 선택자 넣지 마세요) -->
<style scoped>
.app-root{
  min-height:100dvh;
  background:var(--bg);
  color:var(--fg);
  padding-bottom: max(env(safe-area-inset-bottom), var(--nav-h));
  position: relative;
}
[data-theme="dark"] .bill,
[data-theme="black"] .bill{
  background: color-mix(in oklab, var(--surface), var(--accent) 2%);
  border: 1px dashed var(--line);
  color: var(--fg);
  box-shadow: none;
}
[data-theme="dark"] .bill .li,
[data-theme="black"] .bill .li{ border-top: 1px dashed var(--line); }
[data-theme="dark"] .bill .li.total,
[data-theme="black"] .bill .li.total{ border-top: 2px solid var(--line); }
[data-theme="dark"] .bill .calc,
[data-theme="black"] .bill .calc{ opacity: .72; }
</style>
