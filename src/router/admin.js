/**
 * src/router/admin.js
 * gangtalk815.com (관리자/업체 공용 빌드) 라우터.
 *
 * Role 계층:
 *   - 'platform' = gangtalk815@gmail.com (플랫폼 관리자) 또는 admins/{uid} 존재
 *   - 'biz'      = users/{uid}.type='company' & accountKind='storeOwner' (업체 계정)
 *   - null       = 인증 안 됐거나 권한 없음
 *
 * meta:
 *   requiresAdmin = true → platform 만 통과 (biz 는 /biz 로 안내)
 *   requiresBiz   = true → biz 만 통과 (platform 은 /admin 으로 안내, 그 외 로그인)
 *
 * 통합 진입점: /biz/login (관리자 + 업체 모두 받음).
 *  - /login 은 호환을 위해 /biz/login 으로 redirect.
 */

import { createRouter, createWebHistory } from 'vue-router'
import { getAuth } from 'firebase/auth'
import {
  authReady,
  getRole,
  invalidateRoleCache,
} from '@/composables/useAuthRole'

const AdminLayout      = () => import('@/layouts/AdminLayout.vue')
const Dashboard        = () => import('@/pages/admin/DashboardPage.vue')
const StoresManage     = () => import('@/pages/admin/StoresManagePage.vue')
const Top5Manage       = () => import('@/pages/admin/Top5ManagePage.vue')
const BannersManage    = () => import('@/pages/admin/BannersManagePage.vue')
const NewsManage       = () => import('@/pages/admin/NewsManagePage.vue')
const InboxPage        = () => import('@/pages/admin/InboxPage.vue')
const BizAccountsPage  = () => import('@/pages/admin/BizAccountsPage.vue')

const BizLogin         = () => import('@/pages/admin/BizLoginPage.vue')
const BizDashboard     = () => import('@/pages/admin/BizDashboardPage.vue')
const BizMetrics       = () => import('@/pages/admin/BizMetricsPage.vue')
const BizMyStore       = () => import('@/pages/admin/BizMyStorePage.vue')

const routes = [
  // 루트 — 가드에서 role 따라 분기
  { path: '/', name: 'root', redirect: { name: 'adminDashboard' } },

  // 통합 로그인. /login 은 호환용 redirect.
  { path: '/biz/login', name: 'bizLogin', component: BizLogin },
  { path: '/login',     name: 'adminLogin', redirect: { name: 'bizLogin' } },

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

  // /biz/* — 업체 전용 (관리자가 들어오면 /admin 으로 안내)
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
  scrollBehavior(to, _from, saved) {
    if (saved) return saved
    if (to.hash) return { el: to.hash }
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  // 로그인 페이지는 무조건 통과 (auth 상태와 무관)
  if (to.name === 'bizLogin' || to.name === 'adminLogin') return true

  // 인증 상태 확정 대기 (토큰 갱신 race 시 lastKnownUser 로 폴백)
  const user = await authReady()
  if (!user) {
    invalidateRoleCache()
  }

  // role 판별 — Firestore race 대비 1회 재시도
  const { role, resolved } = user
    ? await getRole({ retries: 1 })
    : { role: null, resolved: true }

  // 미확정 (resolved === false) 인데 사용자는 있는 경우:
  //   강제 로그아웃 하면 멀쩡한 세션이 무한 로그인 루프에 빠질 수 있음.
  //   → 일단 navigation 만 차단하고 로그인 페이지로 안내.
  //   사용자가 새로고침 하면 lastKnownUser + retry 로 복구.
  if (user && !resolved) {
    if (to.name === 'bizLogin') return true
    return { name: 'bizLogin', query: { next: to.fullPath, reason: 'retry' } }
  }

  // 루트(/): role 따라 분기
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
      // 업체가 관리자 경로 진입 시도 → 본인 대시보드로 안내
      if (role === 'biz') return { name: 'bizDashboard' }
      // 그 외 (확정 권한없음) → 강제 로그아웃 후 로그인
      try { await getAuth().signOut() } catch {}
      invalidateRoleCache()
      return { name: 'bizLogin', query: { next: to.fullPath } }
    }
  }

  if (needsBiz) {
    if (!user) return { name: 'bizLogin', query: { next: to.fullPath } }
    // 관리자가 업체 경로 진입 시도 → 관리자 대시보드로 안내 (차단 아님)
    if (role === 'platform') return { name: 'adminDashboard' }
    if (role !== 'biz') {
      try { await getAuth().signOut() } catch {}
      invalidateRoleCache()
      return { name: 'bizLogin', query: { next: to.fullPath } }
    }
  }

  return true
})

export { invalidateRoleCache }
export default router
