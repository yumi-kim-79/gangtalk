// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'

// ===== pages =====
import MainPage          from '@/pages/MainPage.vue'
import GangTalkPage      from '@/pages/GangTalkPage.vue'
import PartnersPage      from '@/pages/PartnersPage.vue'
import PartnerDetail     from '@/pages/PartnerDetail.vue'
import MyPage            from '@/pages/MyPage.vue'
import SupportPage       from '@/pages/SupportPage.vue'
import AuthPage          from '@/pages/AuthPage.vue'
import StoreFinder       from '@/views/StoreFinder.vue'
import MapView           from '@/views/MapView.vue'
import StoreDetail       from '@/pages/StoreDetail.vue'
import StoreManagers     from '@/pages/StoreManagers.vue'
import StoreEditPage     from '@/pages/StoreEditPage.vue'
import StoreBoard        from '@/pages/StoreBoard.vue'
import StorePost         from '@/pages/StorePost.vue'
import LegalConsultBoard from '@/pages/LegalConsultBoard.vue'

// 채팅 전용 페이지
import ChatBiz           from '@/pages/ChatBiz.vue'
import ChatOpen          from '@/pages/ChatOpen.vue'

import DiaryPage         from '@/pages/DiaryPage.vue'

// 동적 import → 정적 import
import MyStoresPage      from '@/pages/MyStoresPage.vue'

// 이벤트 상세
import EventDetail       from '@/pages/EventDetail.vue'

// 상담 도움말 페이지
const ConsultHelpPage = () => import('@/pages/ConsultHelpPage.vue')

// session store
import { me as user } from '@/store/user.js'
user.init()

// Firestore: 랜덤ID → 벤더키 해석용
import { db as fbDb } from '@/firebase'
import { doc, getDoc } from 'firebase/firestore'

/* helpers */
function normalizeType(raw) {
  const s = String(raw || 'guest').toLowerCase()
  if (['admin', 'owner'].includes(s)) return 'admin'
  if (['biz', 'company', 'partner', 'store', 'merchant'].includes(s)) return 'company'
  if (['user', 'member', 'personal', 'woman', 'female'].includes(s)) return 'user'
  return 'guest'
}
function currentType() {
  const a = user?.auth?.value ?? user?.auth ?? {}
  const raw = a.type ?? a.role ?? 'guest'
  return normalizeType(raw)
}

// 랜덤ID인지 판별
const looksLikeRandomId = (s) =>
  /^[A-Za-z0-9_-]{18,}$/.test(String(s || '')) && !/^[a-z0-9_-]+$/.test(String(s || ''))

// 슬러그 형태인지 판별
const isSlugLike = (s) => /^[a-z0-9_-]+$/.test(String(s || ''))

// ID 정규화
function sanitizeId(v) {
  const s = String(v ?? '').trim()
  return isSlugLike(s) ? s.toLowerCase() : s
}

// stores/{id} → rooms_biz/vendorKey/slug 등으로 벤더키 해석
const KEY_FIELDS = ['rooms_biz', 'vendorKey', 'vendorId', 'slug', 'storeKey', 'bizKey']
async function resolveVendorKey(id) {
  try {
    const snap = await getDoc(doc(fbDb, 'stores', id))
    if (!snap.exists()) return null
    const d = snap.data() || {}
    for (const k of KEY_FIELDS) {
      const v = d[k]
      if (typeof v === 'string' && v.trim()) return v.trim().toLowerCase()
    }
    const name = String(d.name || d.title || '').trim()
    if (name) {
      return name
        .normalize('NFKD')
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase()
    }
    return null
  } catch (_) {
    return null
  }
}

// theme normalize
const normTheme = (v) => {
  const s = String(v || '').toLowerCase()
  if (['dark', 'black', 'b'].includes(s)) return 'black'
  if (['light', 'white', 'w'].includes(s)) return 'white'
  return ''
}
function applyThemeToDom(t) {
  const theme = normTheme(t) || 'white'
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)
}

/* routes */
const routes = [
  { path: '/', redirect: '/dashboard' },

  { path: '/dashboard', name: 'dashboard', component: MainPage },
  { path: '/find',      name: 'finder',    component: StoreFinder },
  { path: '/map',       name: 'mapNearby', component: MapView },

  // 상세 페이지 (클릭 시 로그인 필요)
  {
    path: '/store/:id',
    name: 'storeDetail',
    component: StoreDetail,
    props: true,
    meta: { needLoginOnClick: true },
  },

  // 담당자 전용 업체 상세
  {
    path: '/store/:id/managers',
    name: 'storeManagers',
    component: StoreManagers,
    props: true,
  },

  {
    path: '/store/:id/edit',
    name: 'storeEdit',
    component: StoreEditPage,
    props: true,
    meta: { requiresAuth: true, role: 'company' },
  },
  {
    path: '/my-stores',
    name: 'myStores',
    component: MyStoresPage,
    meta: { requiresAuth: true, role: 'company' },
  },

  // ===== 탭: 강톡 메인 =====
  { path: '/chat', name: 'chat', component: GangTalkPage },

  {
    path: '/gangtalk',
    name: 'gangtalk',
    redirect: (to) => ({
      name: 'chat',
      query: to.query,
    }),
  },

  // 초톡(업체 매칭/게시판형)
  {
    path: '/chat-biz/:storeId',
    name: 'ChatBiz',
    component: ChatBiz,
    props: (route) => ({ storeId: sanitizeId(route.params.storeId), ...route.query }),
    meta: { needLoginOnClick: true },
    beforeEnter: async (to) => {
      const raw = String(to.params.storeId || '').trim()
      if (!raw) {
        return { name: 'chat', query: { ...to.query, reason: 'missing_storeId' } }
      }
      if (looksLikeRandomId(raw)) {
        const resolved = await resolveVendorKey(raw)
        if (resolved && resolved !== raw) {
          return {
            name: 'ChatBiz',
            params: { storeId: resolved },
            query: {
              ...to.query,
              roomId: to.query.roomId || `${resolved}_room_01`,
            },
            replace: true,
          }
        }
      }
      return true
    },
  },

  // 레거시 호환
  {
    path: '/chat/biz/:storeId',
    name: 'bizChat',
    redirect: (to) => ({
      name: 'ChatBiz',
      params: { storeId: sanitizeId(to.params.storeId) },
      query: to.query,
    }),
  },

  // 오픈 채팅
  {
    path: '/chat-open/:storeId',
    name: 'ChatOpen',
    component: ChatOpen,
    props: (route) => ({ storeId: sanitizeId(route.params.storeId) }),
    meta: { needLoginOnClick: true },
    beforeEnter: async (to) => {
      const raw = String(to.params.storeId || '').trim()
      if (!raw) {
        return { name: 'chat', query: { ...to.query, reason: 'missing_storeId' } }
      }
      if (looksLikeRandomId(raw)) {
        const resolved = await resolveVendorKey(raw)
        if (resolved && resolved !== raw) {
          return {
            name: 'ChatOpen',
            params: { storeId: resolved },
            query: to.query,
            replace: true,
          }
        }
      }
      return true
    },
  },

  // 레거시 오픈채팅
  {
    path: '/chat/open/:storeId',
    name: 'openChat',
    redirect: (to) => ({
      name: 'ChatOpen',
      params: { storeId: sanitizeId(to.params.storeId) },
      query: to.query,
    }),
  },

  // 개별 room 진입
  {
    path: '/chat/room/:roomId',
    name: 'chatRoom',
    component: GangTalkPage,
    props: (route) => ({ roomId: route.params.roomId, title: route.query.title || '' }),
    meta: { needLoginOnClick: true },
  },

  // 레거시 /biz-chat/:roomId → 초톡
  {
    path: '/biz-chat/:roomId',
    name: 'bizChatLegacy',
    redirect: (to) => ({
      name: 'ChatBiz',
      params: { storeId: sanitizeId(to.params.roomId) },
      query: to.query,
    }),
  },

  // 매니저/1:1 연결
  {
    path: '/connect',
    name: 'managerChat',
    component: GangTalkPage,
    props: (route) => ({
      to: route.query.to || '',
      name: route.query.name || '',
      store: route.query.store || '',
    }),
    meta: { needLoginOnClick: true },
  },

  {
    path: '/favorites',
    name: 'favorites',
    component: () => import('@/pages/FavoritesPage.vue'),
    meta: { needLoginOnClick: true },
  },

  { path: '/partners',     name: 'partners',     component: PartnersPage },
  {
    path: '/partners/:id',
    name: 'partnerDetail',
    component: PartnerDetail,
    props: true,
    meta: { needLoginOnClick: true },
  },

  // 안심 문자/전화
  {
    path: '/safe/:mode(sms|call)/:storeId',
    name: 'safeContact',
    component: () => import('@/pages/SafeContact.vue'),
    props: (route) => ({
      mode:   String(route.params.mode || 'sms'),
      storeId: String(route.params.storeId || ''),
      phone:  String(route.query.phone || ''),
      name:   String(route.query.name || ''),
    }),
    meta: { needLoginOnClick: true },
  },

  // 탭: 마이페이지
  { path: '/mypage', name: 'mypage', component: MyPage, meta: { requiresAuth: true } },

  { path: '/auth',   name: 'auth',   component: AuthPage },
  { path: '/support', name: 'support', component: SupportPage },

  // 이벤트 상세
  {
    path: '/event',
    name: 'EventDetail',
    component: EventDetail,
  },

  // 헬프 페이지
  {
    path: '/help',
    name: 'help',
    component: () => import('@/pages/HelpPage.vue'),
  },

  // 상담 도움말
  { path: '/consult', redirect: '/consult/legal' },
  {
    path: '/consult/:kind(legal|tax|startup)',
    name: 'ConsultHelp',
    component: ConsultHelpPage,
    props: true,
  },

  // 법률 상담 게시판
  {
    path: '/legal-board',
    name: 'LegalConsultBoard',
    component: LegalConsultBoard,
    meta: { requiresAuth: true },
  },

  // 업체 전용 게시판
  {
    name: 'storeBoard',
    path: '/boards/:id',
    component: StoreBoard,
    props: true,
    meta: { needLoginOnClick: true },
  },
  {
    name: 'storePost',
    path: '/boards/:id/post/:postId',
    component: StorePost,
    props: true,
    meta: { needLoginOnClick: true },
  },

  {
    path: '/partner-apply',
    name: 'partnerApply',
    component: () => import('@/pages/PartnerRequestPage.vue'),
    meta: { requiresAuth: true },
  },

  {
    path: '/tier-ladder',
    name: 'tier-ladder',
    component: () => import('@/pages/TierLadderView.vue'),
  },

  { path: '/diary', name: 'diary', component: DiaryPage },

  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, _from, saved) {
    if (saved) return saved
    if (to.hash) return { el: to.hash }
    return { top: 0 }
  },
})

/* global guard */
router.beforeEach(async (to, from) => {
  // ===== 1) 테마 처리 =====
  const ls = normTheme(localStorage.getItem('theme'))
  const q  = normTheme(to.query.theme)
  const desired = q || ls || 'white'
  applyThemeToDom(desired)
  if (q && q !== ls) {
    localStorage.setItem('theme', desired)
  }

  // ===== 2) 로그인/권한 체크 =====
  await user.ensureAuthReady()
  const a = user?.auth?.value ?? user?.auth ?? {}
  const myType = currentType()

  // 이메일 기준으로 "정식 로그인" 여부 판별
  const email =
    String(
      a.email ||
        a.user?.email ||
        a.profile?.email ||
        user?.profile?.value?.email ||
        user?.profile?.email ||
        '',
    ).trim()

  // Firebase/스토어 기준 로그인 + 이메일까지 있어야 "로그인"
  const rawLogged = !!a.loggedIn && !!email

  // guest 타입은 로그인으로 보지 않음
  const logged = rawLogged && myType !== 'guest'

  const needAuth     = !!to.meta?.requiresAuth
  const requiredRole = to.meta?.role ? normalizeType(to.meta.role) : null
  const needLoginOnClick = !!to.meta?.needLoginOnClick
  const toName = String(to.name || '')

  // 게스트 허용 페이지
  const publicForGuests = new Set(['auth', 'help', 'support'])

  // 바텀 탭 루트 페이지(현황판/가게찾기/강톡/제휴관/마이페이지)는
  // 비로그인이어도 "페이지 진입"은 허용
  const tabRoots = new Set(['dashboard', 'finder', 'chat', 'partners', 'mypage'])
  const isTabRoot = tabRoots.has(toName)

  // requiresAuth 메타도 탭 루트에서는 무시
  const effectiveNeedAuth = needAuth && !isTabRoot

  // 1) 클릭해야 들어가는 상세/채팅 등: 비로그인 상태면 회원가입 화면으로 유도
  if (!logged && needLoginOnClick) {
    window.alert('회원가입 후 이용해 주세요')
    return {
      path: '/auth',
      query: {
        next: to.fullPath,
        mode: 'signup',
        theme: desired,
      },
    }
  }

  // 2) 그 외 페이지: 비로그인 상태면 /auth 로 보냄 (auth/help/support/탭루트 제외)
  if (!logged && !publicForGuests.has(toName) && !isTabRoot) {
    return {
      path: '/auth',
      query: {
        next: to.fullPath,
        mode: 'signup',
        theme: desired,
      },
    }
  }

  // 3) 이미 로그인했는데 /auth 로 가려 하면 마이페이지/next로 보냄
  if (to.name === 'auth' && logged) {
    const nextPath = (to.query?.next && String(to.query.next)) || '/mypage'
    return nextPath
  }

  // 4) meta.requiresAuth 라우트 처리(탭 루트는 제외)
  if (effectiveNeedAuth && !logged) {
    const who = requiredRole === 'company' ? 'biz' : 'user'
    return {
      path: '/auth',
      query: { next: to.fullPath, mode: 'login', who, theme: desired },
    }
  }

  // 5) 권한(회사/관리자) 체크
  if (requiredRole) {
    if (requiredRole === 'company' && !['company', 'admin'].includes(myType)) {
      return {
        path: '/auth',
        query: { next: to.fullPath, mode: 'login', who: 'biz', theme: desired },
      }
    }
    if (requiredRole === 'admin' && myType !== 'admin') {
      return {
        path: '/auth',
        query: { next: to.fullPath, mode: 'login', theme: desired },
      }
    }
  }

  return true
})

export default router
