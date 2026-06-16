/**
 * src/router/admin.js
 * gangtalk815.com (관리자/업체 공용 빌드) 라우터.
 *
 * Role 계층:
 *   - 'platform' = gangtalk815@gmail.com (플랫폼 관리자)
 *   - 'biz'      = users/{uid}.type='company' & accountKind='storeOwner' (업체 계정)
 *   - null       = 인증 안 됐거나 권한 없음
 *
 * meta:
 *   requiresAdmin = true → platform 만 통과
 *   requiresBiz   = true → platform + biz 둘 다 통과
 */

import { createRouter, createWebHistory } from 'vue-router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { db as fbDb } from '@/firebase'
import { doc, getDoc } from 'firebase/firestore'

const AdminLayout      = () => import('@/layouts/AdminLayout.vue')
const Dashboard        = () => import('@/pages/admin/DashboardPage.vue')
const StoresManage     = () => import('@/pages/admin/StoresManagePage.vue')
const Top5Manage       = () => import('@/pages/admin/Top5ManagePage.vue')
const BannersManage    = () => import('@/pages/admin/BannersManagePage.vue')
const NewsManage       = () => import('@/pages/admin/NewsManagePage.vue')
const InboxPage        = () => import('@/pages/admin/InboxPage.vue')
const BizAccountsPage  = () => import('@/pages/admin/BizAccountsPage.vue')

const AdminLogin       = () => import('@/pages/admin/AdminLoginPage.vue')
const BizLogin         = () => import('@/pages/admin/BizLoginPage.vue')
const BizDashboard     = () => import('@/pages/admin/BizDashboardPage.vue')
const BizMetrics       = () => import('@/pages/admin/BizMetricsPage.vue')
const BizMyStore       = () => import('@/pages/admin/BizMyStorePage.vue')

const PLATFORM_EMAIL = 'gangtalk815@gmail.com'

const routes = [
  // 루트 — 가드에서 role 따라 분기
  { path: '/', name: 'root', redirect: { name: 'adminDashboard' } },

  // 로그인 (공용 진입점 = BizLogin, 기존 admin 만 쓰는 /login 도 유지)
  { path: '/login',     name: 'adminLogin', component: AdminLogin },
  { path: '/biz/login', name: 'bizLogin',   component: BizLogin },

  // /admin/* — 플랫폼 관리자 전용
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAdmin: true },
    children: [
      { path: '',              redirect: { name: 'adminDashboard' } },
      { path: 'dashboard',     name: 'adminDashboard',    component: Dashboard },
      { path: 'stores',        name: 'adminStores',       component: StoresManage },
      { path: 'top5',          name: 'adminTop5',         component: Top5Manage },
      { path: 'banners',       name: 'adminBanners',      component: BannersManage },
      { path: 'news',          name: 'adminNews',         component: NewsManage },
      { path: 'inbox',         name: 'adminInboxPage',    component: InboxPage },
      { path: 'biz-accounts',  name: 'adminBizAccounts',  component: BizAccountsPage },
    ],
  },

  // /biz/* — 업체(또는 플랫폼) 사용 가능
  {
    path: '/biz',
    component: AdminLayout,
    meta: { requiresBiz: true },
    children: [
      { path: '',          redirect: { name: 'bizDashboard' } },
      { path: 'dashboard', name: 'bizDashboard', component: BizDashboard },
      { path: 'metrics',   name: 'bizMetrics',   component: BizMetrics },
      { path: 'my-store',  name: 'bizMyStore',   component: BizMyStore },
    ],
  },

  // 그 외 경로 — 가드가 처리
  { path: '/:pathMatch(.*)*', redirect: { name: 'root' } },
]

const router = createRouter({
  history: createWebHistory('/'),
  routes,
  scrollBehavior(to, _from, saved){
    if (saved) return saved
    if (to.hash) return { el: to.hash }
    return { top: 0 }
  },
})

/* ---------------------------------------------------------
 * Firebase Auth 초기화 1회 대기
 * ------------------------------------------------------- */
let authReadyPromise = null
function authReady() {
  if (authReadyPromise) return authReadyPromise
  authReadyPromise = new Promise((resolve) => {
    const auth = getAuth()
    const unsub = onAuthStateChanged(auth, () => {
      unsub()
      resolve(auth.currentUser)
    })
  })
  return authReadyPromise
}

/* ---------------------------------------------------------
 * role 판별 — platform / biz / null
 * users/{uid} 1회 조회 후 캐시
 * ------------------------------------------------------- */
let cachedRole = null
let cachedRoleUid = null

async function getUserRole(user) {
  if (!user) return null
  if (cachedRoleUid === user.uid && cachedRole !== null) return cachedRole
  const email = String(user.email || '').toLowerCase()
  if (email === PLATFORM_EMAIL) {
    cachedRole = 'platform'
    cachedRoleUid = user.uid
    return cachedRole
  }
  try {
    const snap = await getDoc(doc(fbDb, 'users', user.uid))
    if (snap.exists()) {
      const d = snap.data() || {}
      if (d.type === 'company' && d.accountKind === 'storeOwner') {
        cachedRole = 'biz'
        cachedRoleUid = user.uid
        return cachedRole
      }
    }
  } catch (e) {
    console.warn('[admin router] getUserRole error:', e)
  }
  cachedRole = null
  cachedRoleUid = user.uid
  return null
}

/* role 캐시 무효화 — 로그아웃/계정 전환 시 호출 */
export function invalidateRoleCache() {
  cachedRole = null
  cachedRoleUid = null
}

router.beforeEach(async (to) => {
  // 로그인 페이지는 무조건 통과
  if (to.name === 'adminLogin' || to.name === 'bizLogin') return true

  await authReady()
  const auth = getAuth()
  const user = auth.currentUser

  // 캐시된 uid 가 다르면 무효화
  if (user && cachedRoleUid && cachedRoleUid !== user.uid) {
    invalidateRoleCache()
  }
  if (!user) invalidateRoleCache()

  const role = user ? await getUserRole(user) : null

  // 루트(/): role 에 맞게 분기
  if (to.name === 'root') {
    if (role === 'platform') return { name: 'adminDashboard' }
    if (role === 'biz')      return { name: 'bizDashboard' }
    return { name: 'bizLogin', query: { next: '/admin/dashboard' } }
  }

  const needsAdmin = !!to.meta?.requiresAdmin || to.matched.some(r => r.meta?.requiresAdmin)
  const needsBiz   = !!to.meta?.requiresBiz   || to.matched.some(r => r.meta?.requiresBiz)

  if (needsAdmin) {
    if (!user) return { name: 'bizLogin', query: { next: to.fullPath } }
    if (role !== 'platform') {
      // biz 가 admin 페이지 접근 시도 → 자기 대시보드로
      if (role === 'biz') return { name: 'bizDashboard' }
      try { await auth.signOut() } catch {}
      invalidateRoleCache()
      return { name: 'bizLogin', query: { next: to.fullPath } }
    }
  }

  if (needsBiz) {
    if (!user) return { name: 'bizLogin', query: { next: to.fullPath } }
    if (role !== 'platform' && role !== 'biz') {
      try { await auth.signOut() } catch {}
      invalidateRoleCache()
      return { name: 'bizLogin', query: { next: to.fullPath } }
    }
  }

  return true
})

export default router
