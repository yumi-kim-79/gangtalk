<!-- src/App.vue -->
<template>
  <div class="app-root">
    <TopBar />

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
import { onMounted } from 'vue'
import TopBar from '@/components/TopBar.vue'
import BottomNav from '@/components/BottomNav.vue'
// import LeftConsultRibbon from '@/components/LeftConsultRibbon.vue'
import NearbyMapModal from '@/components/map/NearbyMapModal.vue'
import { applyThemeToDom, getTheme, attachThemeSync } from '@/store/theme.js'

onMounted(() => {
  applyThemeToDom(getTheme())
  attachThemeSync()
})
</script>

<!-- ▼ 전역 스타일 (scoped 아님): 자식 컴포넌트까지 적용됨 -->
<style>
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
