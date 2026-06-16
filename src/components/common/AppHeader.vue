<!--
  src/components/common/AppHeader.vue

  전사 공통 헤더 + 검색창.
  CLAUDE.md "공통 스타일 기준 (전사 통일)" 섹션을 컴포넌트로 추출한 것.
  - 헤더 영역(.app-header): 로고 + 타이틀 + 서브타이틀 + 알림벨(뱃지) + 햄버거 카드 드롭다운
  - 검색창(.app-search): 좌측 돋보기 + input + 우측 필터 SVG
  - 모든 페이지가 이 컴포넌트를 그대로 사용해 페이지 전환 시 레이아웃 점프를 차단한다.
-->
<template>
  <div class="app-header-wrap" :class="{ 'no-search': !showSearch }">
    <header class="app-header" :class="{ 'no-search': !showSearch }">
      <div class="app-brand">
        <img class="app-brand-logo-img" src="/icons/icon-192.png" alt="강톡" width="48" height="48" decoding="async" />
        <div class="app-brand-text">
          <h1 class="app-brand-title">강남톡방</h1>
          <p class="app-brand-sub">강남의 모든 공간, 한눈에.</p>
        </div>
      </div>
      <div class="app-header-actions">
        <button class="app-icon-btn" type="button" aria-label="알림" @click="openNotif">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 3h16z"/>
            <path d="M10 21a2 2 0 0 0 4 0"/>
          </svg>
          <span v-if="notifBadge > 0" class="app-bell-badge">{{ notifBadge }}</span>
        </button>
        <div class="app-menu-anchor">
          <button class="app-icon-btn" type="button" aria-label="메뉴" aria-haspopup="true" :aria-expanded="menuOpen" @click.stop="toggleMenu">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M4 7h16M4 12h16M4 17h16"/>
            </svg>
          </button>
          <transition name="app-dd">
            <div v-if="menuOpen" class="app-menu-card" role="menu" @click.stop>
              <button
                v-for="(m, i) in menuItems"
                :key="m.key"
                class="app-menu-row"
                :class="{ divider: i > 0 }"
                type="button"
                role="menuitem"
                @click="onMenuItem(m)"
              >
                <span class="app-menu-emoji" aria-hidden="true">{{ m.emoji }}</span>
                <span class="app-menu-label">{{ m.label }}</span>
                <svg class="app-menu-arrow" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <path d="M9 6l6 6-6 6"/>
                </svg>
              </button>
            </div>
          </transition>
        </div>
      </div>
    </header>

    <section v-if="showSearch" class="app-search">
      <div class="app-search-box">
        <svg class="app-search-ic" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <circle cx="11" cy="11" r="7"/>
          <path d="M21 21l-4.3-4.3"/>
        </svg>
        <input
          :value="modelValue"
          @input="onInput"
          @keyup.enter="$emit('search')"
          type="search"
          class="app-search-input"
          :placeholder="searchPlaceholder"
          autocomplete="off"
          spellcheck="false"
          aria-label="검색어"
        />
        <button class="app-search-filter" type="button" aria-label="필터" @click="$emit('filterClick')">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M4 6h12"/>
            <path d="M4 12h8"/>
            <path d="M4 18h14"/>
            <circle cx="18" cy="6" r="2" fill="currentColor"/>
            <circle cx="14" cy="12" r="2" fill="currentColor"/>
            <circle cx="20" cy="18" r="2" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth'
import { db as fbDb } from '@/firebase'
import {
  collection, doc, onSnapshot, query, where, orderBy, limit,
  updateDoc, serverTimestamp, getDocs,
} from 'firebase/firestore'

const props = defineProps({
  modelValue:        { type: String,  default: '' },
  searchPlaceholder: { type: String,  default: '업체명, 지역, 업종을 검색해보세요' },
  showSearch:        { type: Boolean, default: true },
})
const emit = defineEmits(['update:modelValue', 'search', 'filterClick'])

function onInput(e){ emit('update:modelValue', e.target.value) }

const router = useRouter()
const auth   = getAuth()

/* Auth 상태 (메뉴 항목 분기 + 알림 뱃지용) */
const currentUser = ref(undefined)
const isAuthReady = ref(false)
onMounted(() => {
  onAuthStateChanged(auth, (u) => {
    currentUser.value = u || null
    if (!isAuthReady.value) isAuthReady.value = true
  })
})

/* ===== 알림벨 (관리자 인박스 기반) =====
 * 현재 서비스에는 일반 사용자용 알림 컬렉션이 없고 adminInbox 만 존재.
 *  - 비로그인: 뱃지 안 보임
 *  - 로그인 + 비관리자: 뱃지 0
 *  - 로그인 + 관리자: adminInbox.where('unread', '==', true) 카운트
 * 클릭 시 markAllRead() 후 /mypage?view=apps 로 이동 (AdminNotifyBell 과 동일 동작)
 */
const isAdmin = ref(false)
const unreadCount = ref(0)
let unsubAdmin = null
let unsubInbox = null

function stopInbox(){
  if (unsubInbox) { try { unsubInbox() } catch {} ; unsubInbox = null }
  unreadCount.value = 0
}
function watchInbox(){
  stopInbox()
  const qInbox = query(
    collection(fbDb, 'adminInbox'),
    where('unread', '==', true),
    orderBy('createdAt', 'desc'),
    limit(50),
  )
  unsubInbox = onSnapshot(
    qInbox,
    (snap) => { unreadCount.value = snap.size },
    () => { unreadCount.value = 0 },
  )
}
function stopAdmin(){
  if (unsubAdmin) { try { unsubAdmin() } catch {} ; unsubAdmin = null }
  isAdmin.value = false
  stopInbox()
}
function watchAdmin(uid){
  stopAdmin()
  if (!uid) return
  const ref = doc(fbDb, 'admins', String(uid))
  unsubAdmin = onSnapshot(
    ref,
    (snap) => {
      const next = snap.exists()
      isAdmin.value = next
      if (next) watchInbox()
      else stopInbox()
    },
    () => { isAdmin.value = false; stopInbox() },
  )
}
// [1단계 gangtox.com 정리] 관리자 알림벨 로직 임시 비활성화
// — admins/{uid} 구독 + adminInbox unread 카운트는 2단계 /admin/* 헤더로 이동 예정
// 아래 watch 와 notifBadge 의 실제 동작 로직은 주석으로 보존
/*
watch(currentUser, (u) => {
  if (u?.uid) watchAdmin(u.uid)
  else stopAdmin()
}, { immediate: false })
*/

onBeforeUnmount(() => { stopAdmin() })

const isLoggedIn = computed(() => !!currentUser.value)
/* 뱃지 표시 규칙:
 *  - 비로그인이면 0 (템플릿 v-if 로 숨김)
 *  - 관리자면 실제 unreadCount
 *  - 비관리자면 0
 *
 * [1단계 gangtox.com 정리]
 *   여성회원 사이트에서는 알림벨이 항상 0 (관리자 알림은 2단계로 이전)
 *   원본 로직은 아래 주석으로 보존
 */
/*
const notifBadge = computed(() => {
  if (!isLoggedIn.value) return 0
  if (!isAdmin.value) return 0
  return Number(unreadCount.value || 0)
})
*/
const notifBadge = computed(() => 0)

async function markAllRead(){
  try {
    const qUnread = query(
      collection(fbDb, 'adminInbox'),
      where('unread', '==', true),
      limit(25),
    )
    const s = await getDocs(qUnread)
    const ps = []
    s.forEach((d) => ps.push(
      updateDoc(doc(fbDb, 'adminInbox', d.id), { unread: false, readAt: serverTimestamp() })
    ))
    await Promise.allSettled(ps)
  } catch {}
}

async function openNotif(){
  // 관리자: 미읽음 일괄 처리 후 /mypage?view=apps
  if (isLoggedIn.value && isAdmin.value) {
    await markAllRead()
    router.push({ path: '/mypage', query: { view: 'apps' } }).catch(() => {})
    return
  }
  // 비관리자: 마이페이지로
  router.push({ name: 'mypage' }).catch(() => {})
}

/* 햄버거 카드형 드롭다운 메뉴 */
const menuOpen = ref(false)
function toggleMenu(){ menuOpen.value = !menuOpen.value }
function closeMenu(){ menuOpen.value = false }

const menuItems = computed(() => {
  const base = [
    { key:'diary',     emoji:'📅', label:'일정/달력', to:{ path:'/diary' } },
    { key:'support',   emoji:'🎧', label:'고객센터', to:{ name:'support' } },
    { key:'favorites', emoji:'❤️', label:'즐겨찾기', to:{ name:'favorites' } },
  ]
  base.push(
    isLoggedIn.value
      ? { key:'logout', emoji:'🚪', label:'로그아웃', action:'logout' }
      : { key:'login',  emoji:'🔑', label:'로그인',   to:{ name:'auth' } }
  )
  return base
})

async function onMenuItem(m){
  closeMenu()
  if (m.action === 'logout') {
    try { await signOut(auth) } catch (e) { console.warn('signOut error:', e) }
    return
  }
  if (m.to) router.push(m.to).catch(()=>{})
}

watch(menuOpen, (on) => {
  if (on) {
    const onDocClick = () => closeMenu()
    const onEsc = (e) => { if (e.key === 'Escape') closeMenu() }
    document.addEventListener('click', onDocClick)
    window.addEventListener('keydown', onEsc)
    menuOpen._cleanup = () => {
      document.removeEventListener('click', onDocClick)
      window.removeEventListener('keydown', onEsc)
    }
  } else if (menuOpen._cleanup) {
    menuOpen._cleanup()
    menuOpen._cleanup = null
  }
})
</script>

<style scoped>
/* 전체 컨테이너 — 페이지 전환 시 점프 방지용 최소 높이 */
.app-header-wrap{
  min-height: var(--app-header-total, 130px);
}
/* 검색창이 없는 페이지(예: 강톡)는 헤더만 점유 + 아래 콘텐츠가 바로 붙도록 */
.app-header-wrap.no-search{
  min-height: var(--app-header-height, 64px);
}

/* ===== Header ===== */
.app-header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  /* 좌우는 페이지의 .page padding (var(--page-h-pad)) 가 단일 책임 → 여기선 0 */
  padding:16px 0 12px;
  min-height: var(--app-header-height, 64px);
  box-sizing:border-box;
}
/* 검색창 없는 모드: 하단 패딩 축소해 다음 콘텐츠가 바짝 붙도록 */
.app-header.no-search{
  padding-bottom: 0;
}
.app-brand{
  display:flex;
  align-items:center;
  gap:10px;
  min-width:0;
}
.app-brand-logo-img{
  flex:none;
  width:48px; height:48px;
  border-radius:12px;
  object-fit:cover;
  display:block;
  box-shadow:0 4px 10px rgba(255,77,141,.18);
}
.app-brand-text{ min-width:0; line-height:1.15; }
.app-brand-title{
  margin:0;
  font-size:20px;
  font-weight:900;
  color:#ff2e7e;
  letter-spacing:-0.3px;
}
.app-brand-sub{
  margin:2px 0 0;
  font-size:12px;
  color:var(--muted, #888);
  font-weight:500;
}
.app-header-actions{
  display:flex;
  align-items:center;
  gap:4px;
}
.app-icon-btn{
  position:relative;
  width:38px; height:38px;
  border-radius:50%;
  background:transparent;
  border:none;
  display:grid; place-items:center;
  color:var(--fg, #222);
  cursor:pointer;
}
.app-icon-btn:active{ background:rgba(0,0,0,.05); }
.app-bell-badge{
  position:absolute;
  top:4px; right:4px;
  min-width:16px; height:16px;
  padding:0 4px;
  border-radius:999px;
  background:#ff4d8d;
  color:#fff;
  font-size:10px;
  font-weight:800;
  line-height:16px;
  text-align:center;
  border:2px solid var(--bg, #fafafa);
  box-sizing:content-box;
}

/* ===== Search ===== */
.app-search{
  /* 좌우는 .page 가 책임 */
  padding:0 0 10px;
}
.app-search-box{
  display:flex;
  align-items:center;
  gap:8px;
  height: var(--app-search-height, 48px);
  padding:0 14px;
  background:var(--surface, #fff);
  border-radius:14px;
  box-shadow:0 2px 10px rgba(0,0,0,.05);
  border:1px solid var(--line, #f0f0f0);
  box-sizing:border-box;
}
.app-search-ic{
  flex:none;
  color:var(--muted, #999);
}
.app-search-input{
  flex:1;
  min-width:0;
  border:none;
  outline:none;
  background:transparent;
  /* 페이지 전역 CSS 가 input 을 덮어쓰는 경우가 잦아 단일 톤을 강제한다 */
  font-size:15px !important;
  color:var(--fg, #333) !important;
  font-weight:500 !important;
  line-height:1.2 !important;
}
.app-search-input::placeholder{
  color:#aaa !important;
  font-weight:400 !important;
  font-size:15px !important;
  opacity:1 !important;
}
.app-search-filter{
  flex:none;
  background:transparent;
  border:none;
  width:28px; height:28px;
  display:grid; place-items:center;
  color:var(--muted, #999);
  cursor:pointer;
  padding:0;
}
.app-search-filter:active{ color:var(--accent, #ff4d8d); }

/* ===== 카드형 드롭다운 ===== */
.app-menu-anchor{ position:relative; }
.app-menu-card{
  position:absolute;
  top:calc(100% + 8px);
  right:0;
  width:200px;
  background:var(--surface, #fff);
  border-radius:16px;
  box-shadow:0 4px 20px rgba(0,0,0,.15);
  z-index:1000;
  overflow:hidden;
  transform-origin:top right;
}
.app-menu-row{
  width:100%;
  display:flex;
  align-items:center;
  gap:10px;
  padding:14px 16px;
  background:transparent;
  border:none;
  font-size:14px;
  font-weight:600;
  color:var(--fg, #222);
  cursor:pointer;
  text-align:left;
}
.app-menu-row.divider{
  border-top:1px solid var(--line, #f0f0f0);
}
.app-menu-row:active{ background:rgba(0,0,0,.04); }
.app-menu-emoji{
  width:22px;
  display:grid; place-items:center;
  font-size:16px;
  flex:none;
}
.app-menu-label{ flex:1; min-width:0; }
.app-menu-arrow{ color:var(--muted, #bbb); flex:none; }

.app-dd-enter-from,
.app-dd-leave-to{
  opacity:0;
  transform:scale(.92) translateY(-4px);
}
.app-dd-enter-active,
.app-dd-leave-active{
  transition:opacity .14s ease, transform .14s ease;
}

/* 다크모드 */
:root[data-theme="dark"] .app-search-box,
:root[data-theme="black"] .app-search-box{
  background:var(--surface, #1c1c1c);
  border-color:var(--line, #2a2a2a);
}
:root[data-theme="dark"] .app-menu-card,
:root[data-theme="black"] .app-menu-card{
  background:var(--surface, #1c1c1c);
  box-shadow:0 4px 20px rgba(0,0,0,.5);
}
:root[data-theme="dark"] .app-menu-row.divider,
:root[data-theme="black"] .app-menu-row.divider{
  border-top-color:var(--line, #2a2a2a);
}
:root[data-theme="dark"] .app-bell-badge,
:root[data-theme="black"] .app-bell-badge{
  border-color:var(--bg, #111);
}
</style>
