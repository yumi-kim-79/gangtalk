<!-- src/components/BottomNav.vue -->
<template>
  <nav class="bottom" role="navigation" aria-label="하단 네비게이션">
    <RouterLink
      v-for="t in tabs"
      :key="t.key"
      :to="t.to"
      class="item"
      :class="{ active: activeKey === t.key }"
    >
      <span class="ic" aria-hidden="true" v-html="t.svg"></span>
      <span class="lb">{{ t.label }}</span>
    </RouterLink>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

/* 기존 아이콘 유지 */
const svg = {
  home: `<svg viewBox="0 0 24 24"><path d="M4 11.5 12 4l8 7.5v7a1 1 0 0 1-1 1h-4.5v-5.5h-5V20.5H5a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  find: `<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m20 20-3.8-3.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  chat: `<svg viewBox="0 0 24 24"><path d="M5 5h14a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2H11l-4.5 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  deal: `<svg viewBox="0 0 24 24"><path d="M3.5 12.5 9 7l6 10 5.5-5.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  my: `<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5 20c1.8-3.3 5-5 7-5s5.2 1.7 7 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`
}

/* 탭 정의 (홈을 /dashboard 로, 가게찾기는 한줄보기+화이트 모드로 이동) */
const tabs = [
  { key: 'home',     to: { path: '/dashboard' },                                     label:'현황판',    svg: svg.home },
  { key: 'find',     to: { path: '/find',     query: { view: 'list' } }, label:'가게찾기',  svg: svg.find },
  { key: 'chat',     to: { path: '/chat' },                                          label:'강톡',      svg: svg.chat },
  { key: 'partners', to: { path: '/partners' },                                      label:'제휴관',    svg: svg.deal },
  { key: 'my',       to: { path: '/mypage' },                                        label:'마이페이지', svg: svg.my },
]

/* 라우트 → 탭 매핑 (path 기준 그룹) */
const groups = {
  home:      ['/dashboard', '/'],   // 홈은 /dashboard(우선), 과거 루트도 케어
  find:      ['/find', '/store'],
  chat:      ['/chat', '/gangtalk'],
  partners:  ['/partners'],
  my:        ['/mypage', '/auth'],
}

const inGroup = (prefixes) =>
  prefixes.some(p => (p === '/' ? route.path === '/' : route.path.startsWith(p)))

/* ✅ 활성 탭 계산 */
const activeKey = computed(() => {
  const name = route.name
  const from = route.query?.from

  // 1) 업체 등록 폼에서 온 경우: from 값으로 탭 결정
  if (name === 'storeEdit') {
    if (from === 'partners') {
      // 제휴관 → 업체등록 폼
      return 'partners'
    }
    // 기본은 가게찾기 탭으로 유지
    return 'find'
  }

  // 2) 나머지는 기존 path 그룹 규칙 그대로
  if (inGroup(groups.find))     return 'find'
  if (inGroup(groups.chat))     return 'chat'
  if (inGroup(groups.partners)) return 'partners'
  if (inGroup(groups.my))       return 'my'
  if (inGroup(groups.home))     return 'home'
  return ''
})
</script>

<style scoped>
.bottom{
  position: fixed; left: 0; right: 0; bottom: 0;
  height: 64px;
  display: grid; grid-template-columns: repeat(5, 1fr);
  background: var(--surface);
  border-top: 1px solid var(--line);
  z-index: 9999;                 /* 항상 클릭 가능하도록 최상단 */
  pointer-events: auto;
  padding-bottom: env(safe-area-inset-bottom);
}
.item{
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap: 4px; color: var(--muted); text-decoration:none; font-weight:700;
  -webkit-tap-highlight-color: transparent;
}
.item .ic{ width: 22px; height: 22px; display:inline-flex; }
.item .ic :deep(svg){ width: 22px; height: 22px; }
.item .lb{ font-size: 12px; line-height: 1; }
.item.active{ color: var(--accent); }
.item.active .ic{ filter: drop-shadow(0 0 0 currentColor); }
</style>
