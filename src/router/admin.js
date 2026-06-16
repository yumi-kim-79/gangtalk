/**
 * src/router/admin.js
 * gangtalk815.com (관리자 전용 빌드) 라우터.
 * - /admin/{dashboard,stores,top5,banners,news,inbox}
 * - /login (관리자 미니 로그인)
 * - / 진입 시 /admin/dashboard (가드가 미로그인은 /login 으로 보냄)
 *
 * 가드: 모든 /admin/* 은 gangtalk815@gmail.com 만 통과.
 */

import { createRouter, createWebHistory } from 'vue-router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'

const AdminLayout    = () => import('@/layouts/AdminLayout.vue')
const Dashboard      = () => import('@/pages/admin/DashboardPage.vue')
const StoresManage   = () => import('@/pages/admin/StoresManagePage.vue')
const Top5Manage     = () => import('@/pages/admin/Top5ManagePage.vue')
const BannersManage  = () => import('@/pages/admin/BannersManagePage.vue')
const NewsManage     = () => import('@/pages/admin/NewsManagePage.vue')
const InboxPage      = () => import('@/pages/admin/InboxPage.vue')
const AdminLogin     = () => import('@/pages/admin/AdminLoginPage.vue')

const ADMIN_EMAIL = 'gangtalk815@gmail.com'

const routes = [
  // 루트 진입 → 대시보드 (가드에서 미로그인이면 /login 으로 리다이렉트)
  { path: '/', redirect: { name: 'adminDashboard' } },

  // 관리자 미니 로그인
  { path: '/login', name: 'adminLogin', component: AdminLogin },

  // /admin/*  ← AdminLayout 안에 모든 페이지
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAdmin: true },
    children: [
      { path: '',           redirect: { name: 'adminDashboard' } },
      { path: 'dashboard',  name: 'adminDashboard', component: Dashboard },
      { path: 'stores',     name: 'adminStores',    component: StoresManage },
      { path: 'top5',       name: 'adminTop5',      component: Top5Manage },
      { path: 'banners',    name: 'adminBanners',   component: BannersManage },
      { path: 'news',       name: 'adminNews',      component: NewsManage },
      { path: 'inbox',      name: 'adminInboxPage', component: InboxPage },
    ],
  },

  // 그 외 경로 → 대시보드
  { path: '/:pathMatch(.*)*', redirect: { name: 'adminDashboard' } },
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
 * Firebase Auth 가 초기화될 때까지 한 번 기다리기 위한 헬퍼.
 * onAuthStateChanged 가 1회 발화하면 currentUser 가 채워진다.
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

router.beforeEach(async (to) => {
  // 로그인 페이지는 무조건 통과
  if (to.name === 'adminLogin') return true

  await authReady()
  const auth = getAuth()
  const u = auth.currentUser
  const email = String(u?.email || '').toLowerCase()

  const needsAdmin =
    !!to.meta?.requiresAdmin ||
    to.matched.some(r => r.meta?.requiresAdmin)

  if (needsAdmin) {
    if (!u) {
      return { name: 'adminLogin', query: { next: to.fullPath } }
    }
    if (email !== ADMIN_EMAIL) {
      // 관리자가 아닌 사용자가 로그인되어 있는 비정상 상태 → 강제 로그아웃
      try { await auth.signOut() } catch {}
      return { name: 'adminLogin', query: { next: to.fullPath } }
    }
  }

  return true
})

export default router
