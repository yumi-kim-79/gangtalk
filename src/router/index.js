import { createRouter, createWebHistory } from 'vue-router'

// ===== pages =====
import MainPage        from '@/pages/MainPage.vue'
import GangTalkPage    from '@/pages/GangTalkPage.vue'
import PartnersPage    from '@/pages/PartnersPage.vue'
import PartnerDetail   from '@/pages/PartnerDetail.vue'
import MyPage          from '@/pages/MyPage.vue'
import SupportPage     from '@/pages/SupportPage.vue'
import AuthPage        from '@/pages/AuthPage.vue'
import StoreFinder     from '@/views/StoreFinder.vue'
import MapView         from '@/views/MapView.vue'
import StoreDetail     from '@/pages/StoreDetail.vue'
import StoreEditPage   from '@/pages/StoreEditPage.vue'
import StoreBoard      from '@/pages/StoreBoard.vue'
import StorePost       from '@/pages/StorePost.vue'

// ✅ 채팅 전용 페이지(게시판형/오픈)
import ChatBiz         from '@/pages/ChatBiz.vue'
import ChatOpen        from '@/pages/ChatOpen.vue'

import DiaryPage       from '@/pages/DiaryPage.vue'

// dynamic
const MyStoresPage = () => import('../pages/MyStoresPage.vue')

// ✅ 상담 도움말 페이지(무료법률/세무/창업 상담)
const ConsultHelpPage = () => import('@/pages/ConsultHelpPage.vue')

// session store
import { me as user } from '@/store/user.js'
user.init()

// ✅ Firestore: 랜덤ID → 벤더키 해석용
// ⛳️ FIX: 경로·이름 통일 ('.js' 제거, db를 fbDb 별칭으로)
import { db as fbDb } from '@/firebase'
import { doc, getDoc } from 'firebase/firestore'

/* helpers */
function normalizeType(raw) {
  const s = String(raw || 'guest').toLowerCase()
  if (['admin','owner'].includes(s)) return 'admin'
  if (['biz','company','partner','store','merchant'].includes(s)) return 'company'
  if (['user','member','personal','woman','female'].includes(s)) return 'user'
  return 'guest'
}
function currentType() {
  const a = user?.auth?.value ?? user?.auth ?? {}
  const raw = a.type ?? a.role ?? 'guest'
  return normalizeType(raw)
}

// ✅ 랜덤ID인지(대소문자 포함 18자 이상 등) 대략 판별
const looksLikeRandomId = (s) =>
  /^[A-Za-z0-9_-]{18,}$/.test(String(s||'')) && !/^[a-z0-9_-]+$/.test(String(s||''))

// ✅ 슬러그 형태인지 판별(이 경우에만 소문자화 안전)
const isSlugLike = (s) => /^[a-z0-9_-]+$/.test(String(s||''))

// ✅ 공통: ID 정규화
//    - 슬러그처럼 보이면 소문자화
//    - 랜덤ID(대문자 포함/길이김)는 **소문자화 금지**
function sanitizeId(v) {
  const s = String(v ?? '').trim()
  return isSlugLike(s) ? s.toLowerCase() : s
}

// ✅ stores/{id} → rooms_biz/vendorKey/slug 등으로 벤더키 해석
const KEY_FIELDS = ['rooms_biz','vendorKey','vendorId','slug','storeKey','bizKey']
async function resolveVendorKey(id) {
  try {
    const snap = await getDoc(doc(fbDb, 'stores', id))
    if (!snap.exists()) return null
    const d = snap.data() || {}
    for (const k of KEY_FIELDS) {
      const v = d[k]
      if (typeof v === 'string' && v.trim()) return v.trim().toLowerCase()
    }
    // 이름/제목에서 간단 슬러그 추출 (fallback)
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
  if (['dark','black','b'].includes(s)) return 'black'
  if (['light','white','w'].includes(s)) return 'white'
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

  // ▶ 풀스크린 지도(내 주변): /map?lat=..&lng=..&r=10
  { path: '/map',       name: 'mapNearby', component: MapView },

  { path: '/store/:id', name: 'storeDetail', component: StoreDetail, props: true },

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

  // ===== Chat =====
  // 강톡 허브(유지)
  { path: '/chat', name: 'chat', component: GangTalkPage },

  /* ── ✅ Canonical: 초톡(업체 매칭/게시판형) ───────────────────────── */
  {
    path: '/chat-biz/:storeId',
    name: 'ChatBiz',
    component: ChatBiz,
    props: (route) => ({ storeId: sanitizeId(route.params.storeId), ...route.query }),
    beforeEnter: async (to) => {
      const raw = String(to.params.storeId || '').trim()
      if (!raw) {
        return { name: 'chat', query: { ...to.query, reason: 'missing_storeId' } }
      }
      // ✅ 랜덤ID면 stores/{id}를 읽어 벤더키로 변환 → 정규 경로 리다이렉트
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

  // 🔁 레거시 호환
  {
    path: '/chat/biz/:storeId',
    name: 'bizChat',
    redirect: (to) => ({
      name: 'ChatBiz',
      params: { storeId: sanitizeId(to.params.storeId) },
      query: to.query,
    }),
  },

  /* ── ✅ Canonical: 오픈 채팅 ─────────────────────────────────────── */
  {
    path: '/chat-open/:storeId',
    name: 'ChatOpen',
    component: ChatOpen,
    props: (route) => ({ storeId: sanitizeId(route.params.storeId) }),
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

  // 🔁 레거시 호환
  {
    path: '/chat/open/:storeId',
    name: 'openChat',
    redirect: (to) => ({
      name: 'ChatOpen',
      params: { storeId: sanitizeId(to.params.storeId) },
      query: to.query,
    }),
  },

  // (유지) 개별 room 진입 (예전 GangTalkPage용)
  {
    path: '/chat/room/:roomId',
    name: 'chatRoom',
    component: GangTalkPage,
    props: route => ({ roomId: route.params.roomId, title: route.query.title || '' }),
  },

  // (레거시) /biz-chat/:roomId → 새 초톡 경로로 리다이렉트
  {
    path: '/biz-chat/:roomId',
    name: 'bizChatLegacy',
    redirect: to => ({
      name: 'ChatBiz',
      params: { storeId: sanitizeId(to.params.roomId) },
      query: to.query,
    }),
  },

  // 매니저/1:1 연결 진입(유지)
  {
    path: '/connect',
    name: 'managerChat',
    component: GangTalkPage,
    props: route => ({
      to: route.query.to || '',
      name: route.query.name || '',
      store: route.query.store || ''
    }),
  },

  {
    path: '/favorites',
    name: 'favorites',
    component: () => import('@/pages/FavoritesPage.vue'),
  },

  { path: '/partners',      name: 'partners',      component: PartnersPage },
  { path: '/partners/:id',  name: 'partnerDetail', component: PartnerDetail, props: true },

  /* ✅ 안심 문자/전화 페이지 (휴대폰 UI) */
  {
    path: '/safe/:mode(sms|call)/:storeId',
    name: 'safeContact',
    component: () => import('@/pages/SafeContact.vue'),
    props: route => ({
      mode: String(route.params.mode || 'sms'),
      storeId: String(route.params.storeId || ''),
      phone: String(route.query.phone || ''),   // 선택: 미리 전달하면 그대로 사용
      name: String(route.query.name || '')      // 상단 표시에 사용
    })
  },

  { path: '/mypage', name: 'mypage', component: MyPage, meta: { requiresAuth: true } },

  { path: '/auth',   name: 'auth',   component: AuthPage },

  { path: '/support', name: 'support', component: SupportPage },

  // ===== 상담 도움말 =====
  { path: '/consult', redirect: '/consult/legal' },
  {
    path: '/consult/:kind(legal|tax|startup)',
    name: 'ConsultHelp',
    component: ConsultHelpPage,
    props: true,
  },

  // old compatibility
  { path: '/gangtalk', redirect: to => ({ name: 'chat', query: to.query }) },
  {
    path: '/gangtalk/room/:roomId',
    redirect: to => ({
      name: 'chatRoom',
      params: { roomId: to.params.roomId },
      query: to.query
    })
  },

  // ===== 업체 전용 게시판 =====
  { name:'storeBoard', path:'/boards/:id', component: StoreBoard, props:true },
  { name:'storePost',  path:'/boards/:id/post/:postId', component: StorePost, props:true },

  {
    path: '/partner-apply',
    name: 'partnerApply',
    component: () => import('@/pages/PartnerRequestPage.vue'),
    meta: { requiresAuth: true }
  },

  {
    path: '/tier-ladder',
    name: 'tier-ladder',
    component: () => import('@/pages/TierLadderView.vue')
  },

  { path: '/diary', name: 'diary', component: DiaryPage },

  // ⚠️ Catch-all 은 항상 맨 마지막!
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
router.beforeEach(async (to) => {
  const ls = normTheme(localStorage.getItem('theme'))
  const q  = normTheme(to.query.theme)
  const desired = ls || q || 'white'

  // ✅ /chat 내부에서 postId 등 쿼리만 바뀌는 네비게이션은 테마 리다이렉트 생략
  if (to.name === 'chat') {
    applyThemeToDom(desired)
    if (!q) {
      return {
        name: to.name,
        params: to.params,
        query: { ...to.query, theme: desired },
        hash: to.hash,
        replace: true,
      }
    }
    return true
  }

  if (q !== desired) {
    if (to.name) {
      return {
        name: to.name,
        params: to.params,
        query: { ...to.query, theme: desired },
        hash: to.hash,
        replace: true,
      }
    }
    return {
      path: to.path,
      query: { ...to.query, theme: desired },
      hash: to.hash,
      replace: true,
    }
  }

  applyThemeToDom(desired)

  await user.ensureAuthReady()
  const a = user?.auth?.value ?? user?.auth ?? {}
  const logged = !!a.loggedIn
  const needAuth = !!to.meta?.requiresAuth
  const requiredRole = to.meta?.role ? normalizeType(to.meta.role) : null
  const myType = currentType()

  if (to.name === 'auth' && logged) {
    const nextPath = (to.query?.next && String(to.query.next)) || '/mypage'
    return nextPath
  }
  if (needAuth && !logged) {
    const who = requiredRole === 'company' ? 'biz' : 'user'
    return { path: '/auth', query: { next: to.fullPath, mode: 'login', who, theme: desired } }
  }
  if (requiredRole) {
    if (requiredRole === 'company' && !['company','admin'].includes(myType)) {
      return { path: '/auth', query: { next: to.fullPath, mode: 'login', who: 'biz', theme: desired } }
    }
    if (requiredRole === 'admin' && myType !== 'admin') {
      return { path: '/auth', query: { next: to.fullPath, mode: 'login', theme: desired } }
    }
  }

  return true
})

export default router
