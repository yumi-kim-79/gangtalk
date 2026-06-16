<!--
  src/layouts/AdminLayout.vue
  관리자 페이지 공통 레이아웃 (헤더 + 사이드바 + RouterView)
  /admin/* 전체에서 사용. gangtalk815@gmail.com 만 접근 가능 (router 가드).
-->
<template>
  <div class="admin-shell">
    <!-- 상단 헤더 -->
    <header class="admin-topbar">
      <button class="admin-hamburger" type="button" aria-label="메뉴" @click="navOpen = !navOpen">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M4 7h16M4 12h16M4 17h16"/>
        </svg>
      </button>
      <div class="admin-brand">
        <img class="admin-brand-logo" src="/icons/icon-192.png" alt="강톡 관리자" />
        <div class="admin-brand-text">
          <strong>강남톡방 관리자</strong>
          <span class="admin-brand-sub">{{ currentEmail || '비로그인' }}</span>
        </div>
      </div>
      <div class="admin-topbar-spacer"></div>
    </header>

    <!-- 본문: 사이드바 + 메인 -->
    <div class="admin-body">
      <!-- 사이드바 (데스크탑 고정, 모바일 드로어) -->
      <aside class="admin-sidebar" :class="{ open: navOpen }">
        <nav class="admin-nav" aria-label="관리자 메뉴">
          <div class="admin-role-tag" v-if="role">
            <span v-if="role === 'platform'" class="admin-role-pill platform">플랫폼 관리자</span>
            <span v-else-if="role === 'biz'" class="admin-role-pill biz">업체 계정</span>
          </div>

          <RouterLink
            v-for="m in menus"
            :key="m.to"
            :to="m.to"
            class="admin-nav-item"
            active-class="active"
            @click="navOpen = false"
          >
            <span class="admin-nav-emoji" aria-hidden="true">{{ m.emoji }}</span>
            <span class="admin-nav-label">{{ m.label }}</span>
          </RouterLink>

          <div class="admin-nav-divider" />

          <a class="admin-nav-item" href="https://gangtox.com" target="_blank" rel="noopener" @click="navOpen = false">
            <span class="admin-nav-emoji" aria-hidden="true">🔗</span>
            <span class="admin-nav-label">gangtox.com 바로가기</span>
          </a>

          <button class="admin-nav-item logout" type="button" @click="onLogout">
            <span class="admin-nav-emoji" aria-hidden="true">🚪</span>
            <span class="admin-nav-label">로그아웃</span>
          </button>
        </nav>
      </aside>

      <!-- 모바일 드로어 배경 -->
      <div v-if="navOpen" class="admin-backdrop" @click="navOpen = false" />

      <!-- 메인 콘텐츠 -->
      <main class="admin-main">
        <RouterView v-slot="{ Component }">
          <component :is="Component" />
        </RouterView>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, RouterLink, RouterView } from 'vue-router'
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth'
import { db as fbDb } from '@/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { invalidateRoleCache } from '@/router/admin.js'

const PLATFORM_EMAIL = 'gangtalk815@gmail.com'

const router = useRouter()
const auth = getAuth()
const currentEmail = ref('')
const role = ref(null)   // 'platform' | 'biz' | null
const navOpen = ref(false)

let unsubAuth = null

async function resolveRole(user) {
  if (!user) return null
  const email = String(user.email || '').toLowerCase()
  if (email === PLATFORM_EMAIL) return 'platform'
  try {
    const snap = await getDoc(doc(fbDb, 'users', user.uid))
    if (snap.exists()) {
      const d = snap.data() || {}
      if (d.type === 'company' && d.accountKind === 'storeOwner') return 'biz'
    }
  } catch (e) { console.warn('[AdminLayout] resolveRole', e) }
  return null
}

onMounted(() => {
  unsubAuth = onAuthStateChanged(auth, async (u) => {
    currentEmail.value = u?.email || ''
    role.value = await resolveRole(u)
  })
  if (window.matchMedia('(min-width: 900px)').matches) navOpen.value = true
})
onBeforeUnmount(() => { if (unsubAuth) try { unsubAuth() } catch {} })

/* === 역할별 메뉴 === */
const platformMenus = [
  { to: '/admin/dashboard',     emoji: '📊', label: '대시보드' },
  { to: '/admin/stores',        emoji: '🏢', label: '현황판 업소 관리' },
  { to: '/admin/top5',          emoji: '🏆', label: '가게찾기 Top5' },
  { to: '/admin/banners',       emoji: '📢', label: '배너 관리' },
  { to: '/admin/news',          emoji: '📰', label: '뉴스/한줄' },
  { to: '/admin/inbox',         emoji: '📬', label: '메시지함' },
  { to: '/admin/biz-accounts',  emoji: '👥', label: '업체 계정 관리' },
]
const bizMenus = [
  { to: '/biz/dashboard', emoji: '🏠', label: '대시보드' },
  { to: '/biz/metrics',   emoji: '📊', label: '현황판 업데이트' },
  { to: '/biz/my-store',  emoji: '🏢', label: '업체 정보 수정' },
]
const menus = computed(() => {
  if (role.value === 'platform') return platformMenus
  if (role.value === 'biz')      return bizMenus
  return []
})

async function onLogout(){
  try { await signOut(auth) } catch {}
  invalidateRoleCache()
  router.replace({ name: 'bizLogin' })
}
</script>

<style scoped>
.admin-shell{
  min-height:100vh;
  background:#fff;
  color:#222;
  display:flex; flex-direction:column;
}

/* === Topbar === */
.admin-topbar{
  position:sticky; top:0; z-index:50;
  display:flex; align-items:center; gap:12px;
  padding:10px 16px;
  background:linear-gradient(90deg,#ff4d8d 0%, #ff7da8 100%);
  color:#fff;
  box-shadow:0 2px 12px rgba(255,77,141,.18);
}
.admin-hamburger{
  width:38px; height:38px; border-radius:10px;
  display:none; place-items:center; align-items:center; justify-content:center;
  background:rgba(255,255,255,.18); border:none; color:#fff; cursor:pointer;
}
.admin-brand{ display:flex; align-items:center; gap:10px; min-width:0; flex:1; }
.admin-brand-logo{
  width:36px; height:36px; border-radius:10px; object-fit:cover;
  background:#fff;
}
.admin-brand-text{ display:flex; flex-direction:column; min-width:0; line-height:1.2; }
.admin-brand-text strong{ font-size:16px; font-weight:900; letter-spacing:-0.3px; }
.admin-brand-sub{ font-size:11px; opacity:.85; }
.admin-topbar-spacer{ width:0; }

/* === Body / Sidebar === */
.admin-body{
  flex:1;
  display:flex;
  min-height:0;
}
.admin-sidebar{
  width:240px; flex:none;
  background:#fafafa;
  border-right:1px solid #eee;
  padding:14px 10px;
  overflow-y:auto;
}
.admin-nav{ display:flex; flex-direction:column; gap:2px; }
.admin-role-tag{ padding:6px 12px 10px; }
.admin-role-pill{
  display:inline-block; font-size:11px; font-weight:800;
  padding:3px 10px; border-radius:999px;
}
.admin-role-pill.platform{ background:#ff2e7e; color:#fff; }
.admin-role-pill.biz{ background:#fff0f6; color:#ff2e7e; border:1px solid #ffd6e4; }
.admin-nav-item{
  display:flex; align-items:center; gap:10px;
  padding:10px 12px;
  border-radius:10px;
  color:#333;
  text-decoration:none;
  font-size:14px; font-weight:600;
  background:transparent; border:none; cursor:pointer;
  text-align:left;
}
.admin-nav-item:hover{ background:#fff0f6; }
.admin-nav-item.active{
  background:#ffe4ef;
  color:#ff2e7e;
  font-weight:800;
}
.admin-nav-emoji{
  width:24px; height:24px; display:grid; place-items:center;
  font-size:16px; flex:none;
}
.admin-nav-label{ flex:1; min-width:0; }
.admin-nav-divider{
  height:1px; background:#eee; margin:8px 4px;
}
.admin-nav-item.logout{ color:#888; }
.admin-nav-item.logout:hover{ color:#ff2e7e; background:#fff0f6; }

.admin-backdrop{
  position:fixed; inset:0;
  background:rgba(0,0,0,.4);
  z-index:40;
  display:none;
}

/* === Main === */
.admin-main{
  flex:1; min-width:0;
  padding:20px;
  overflow-x:auto;
}

/* 모바일 */
@media (max-width: 899px){
  .admin-hamburger{ display:grid; }
  .admin-sidebar{
    position:fixed; top:58px; left:0; bottom:0;
    z-index:45;
    transform:translateX(-100%);
    transition:transform .2s ease;
    width:80%; max-width:300px;
  }
  .admin-sidebar.open{ transform:translateX(0); }
  .admin-backdrop{ display:block; top:58px; }
}

/* 다크모드 */
:root[data-theme="dark"] .admin-shell,
:root[data-theme="black"] .admin-shell{
  background:#111; color:#eee;
}
:root[data-theme="dark"] .admin-sidebar,
:root[data-theme="black"] .admin-sidebar{
  background:#181818; border-right-color:#2a2a2a;
}
:root[data-theme="dark"] .admin-nav-item,
:root[data-theme="black"] .admin-nav-item{ color:#ddd; }
:root[data-theme="dark"] .admin-nav-item:hover,
:root[data-theme="black"] .admin-nav-item:hover{ background:#2a1a22; }
:root[data-theme="dark"] .admin-nav-item.active,
:root[data-theme="black"] .admin-nav-item.active{ background:#3a1d2a; color:#ff7fb8; }
:root[data-theme="dark"] .admin-nav-divider,
:root[data-theme="black"] .admin-nav-divider{ background:#2a2a2a; }
</style>
