<!-- src/pages/MyPage.vue -->
<template>
  <main class="page-flat">
    <!-- 비로그인 -->
    <LoggedOutSection v-if="!state.loggedIn" @auth="goAuth" />

    <!-- 로그인 상태 -->
    <template v-else>
      <section
        class="section"
        style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
        <HeaderBar :type="uiType" @edit="goProfileEdit" @logout="onLogout" />
        <AdminNotifyBell v-if="isAdmin" />
      </section>

      <!-- 개인 회원 -->
      <UserSection
        v-if="uiType === 'user'"
        :state="state"
        :displayNick="displayNick"
        :myCode="myCode"
        :hasAvatarImage="hasAvatarImage"
        :avatarStyle="avatarStyle"
        :initials="initials"
        :copy="copy"
        :go="go"
        :userPoints="userPoints"
        :userTier="userTier"
        :nextTier="nextTier"
        :tierProgressPct="tierProgressPct"
        :tierPointToNext="tierPointToNext"
        :onTierClick="goTierLadder"
      />

      <!-- 기업 회원 -->
      <template v-if="uiType === 'company'">
        <CompanySection
          v-if="state.company"
          :state="state"
          :displayNick="displayNick"
          :hasAvatarImage="hasAvatarImage"
          :avatarStyle="avatarStyle"
          :go="go"
        />

        <!-- 운영자 전용(신청목록 + 관리자 도구) -->
        <section v-if="isAdmin" class="section" style="margin-top:16px;">
          <div style="margin-top:12px;" ref="appsSection" id="apps">
            <BizManagerTabs kind="all" :category="defaultCategory" />
          </div>

          <AdminTools
            :ads="ads"
            :adsP="adsPData"
            :adsF="adsFData"
            :news="news"
            :savingAdsP="savingAdsP"
            :savingAdsF="savingAdsF"
            :newsSaving="newsSaving"
            :timeAgo="timeAgo"
            :bgStyle="bgStyle"
            :adPreviewStyle="adPreviewStyle"
            :fmtDate="fmtDate"
            :adDaysOf="adDaysOf"
            :formatWon="formatWon"
            :onPickAdImage="onPickAdImage"
            :clearAdImage="clearAdImage"
            :toggleAd="toggleAd"
            :saveAdOne="saveAdOne"
            :removeAd="removeAd"
            :saveNewsline="saveNewsline"
            :onNewsChange="onNewsChange"
          />
        </section>
      </template>

      <!-- 프로필 수정 시트 -->
      <ProfileEditSheet
        :open="ui.editOpen"
        :type="uiType"
        :state="state"
        :edit="edit"
        :saving="saving"
        :displayNick="displayNick"
        :initials="initials"
        :previewAvatarStyle="previewAvatarStyle"
        :onPickProfilePhoto="onPickProfilePhoto"
        :onPickProfilePhotos="onPickProfilePhotos"
        :clearProfilePhoto="clearProfilePhoto"
        :applyRandomFemale="applyRandomFemale"
        :nextProfilePhoto="nextProfilePhoto"
        :prevProfilePhoto="prevProfilePhoto"
        @save="saveProfile"
        @close="closeEdit"
      />
    </template>
  </main>
</template>

<script setup>
import { computed, onMounted, nextTick, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getAuth, signOut as fbSignOut } from 'firebase/auth'

import LoggedOutSection from '@/components/mypage/LoggedOutSection.vue'
import HeaderBar from '@/components/mypage/HeaderBar.vue'
import UserSection from '@/components/mypage/UserSection.vue'
import CompanySection from '@/components/mypage/CompanySection.vue'
import ProfileEditSheet from '@/components/mypage/ProfileEditSheet.vue'
import AdminTools from '@/components/mypage/AdminTools.vue'
import AdminNotifyBell from '@/components/common/AdminNotifyBell.vue'
import BizManagerTabs from '@/components/biz/BizManagerTabs.vue'

import { useMyPageCore } from '@/composables/mypage/useMyPageCore.js'
import { me } from '@/store/user.js'

const router = useRouter()
const route  = useRoute()
const core   = useMyPageCore()

// 디버깅용
window.__mp = { isAdmin: core.isAdmin, state: core.state }

const {
  state, isAdmin,
  ads, adsP, adsF,
  savingAdsP, savingAdsF, newsSaving,
  displayNick, myCode, hasAvatarImage, avatarStyle, initials,
  previewAvatarStyle, copy, bgStyle, timeAgo, fmtDate, formatWon,
  adDaysOf, adPreviewStyle,
  ui, saving, edit, openEdit: goProfileEdit, closeEdit, saveProfile,
  onPickProfilePhoto, onPickProfilePhotos, clearProfilePhoto, applyRandomFemale,
  nextProfilePhoto, prevProfilePhoto,
  onPickAdImage, clearAdImage, toggleAd, saveAdOne, removeAd,
  saveNewsline, onNewsChange,
  userPoints, userTier, nextTier, tierProgressPct, tierPointToNext,
  news
} = core

/* ✅ 모달 상태 */


/* ✅ 등급 배지 클릭 → 계급도 페이지 이동 */
const goTierLadder = () => {
  try {
    router.push({ name: 'tier-ladder', query: { p: Number(userPoints || 0) } })
  } catch {
    // 라우터 인스턴스가 없을 경우 폴백
    location.href = '/tier-ladder'
  }
}

/* AdminTools에 넘길 안전한 형태로 정규화 */
function normalizeAdsShape(src){
  if (Array.isArray(src?.list)) return { list: src.list }
  if (Array.isArray(src))       return { list: src }
  return { list: [] }
}
const adsPData = computed(() => {
  if (adsP && typeof adsP === 'object') return normalizeAdsShape(adsP)
  if (ads && typeof ads === 'object' && 'P' in ads) return normalizeAdsShape(ads.P)
  if (Array.isArray(ads)) return { list: ads }
  return { list: [] }
})
const adsFData = computed(() => {
  if (adsF && typeof adsF === 'object') return normalizeAdsShape(adsF)
  if (ads && typeof ads === 'object' && 'F' in ads) return normalizeAdsShape(ads.F)
  return { list: [] }
})

/** 운영자는 company UI로 고정 */
const uiType = computed(() => {
  if (isAdmin?.value) return 'company'
  const hasCompanySignal = !!(state?.value?.company || state?.value?.storeId)
  const t = String(state?.value?.type || '').toLowerCase()
  return (t === 'company' || t === 'biz' || hasCompanySignal) ? 'company' : 'user'
})

/** 기본 카테고리 */
const defaultCategory = computed(() =>
  state?.value?.company?.category ||
  state?.value?.profile?.category ||
  ''
)

/** 알림에서 넘어오면 신청목록으로 스크롤 */
const appsSection = ref(null)
async function maybeScrollToApps () {
  if (route.query.view === 'apps') {
    await nextTick()
    const el = appsSection.value || document.getElementById('apps')
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
onMounted(() => { maybeScrollToApps() })
watch(() => route.query.view, () => { maybeScrollToApps() })

/** 라우팅 헬퍼 */
const go = (to) => {
  try {
    const tgt = typeof to === 'string' ? { path: to } : (to || {})
    if (tgt.name === 'storeEdit') {
      const id = tgt.params?.id ?? tgt.query?.id ?? null
      if (!id) { alert('가게 ID가 없어 이동할 수 없습니다.'); return }
    }
    router.push(tgt)
  } catch (e) {
    console.warn('router.push error:', e)
    alert('화면 이동 중 오류가 발생했습니다.')
  }
}
const goAuth = () => router.push({ path: '/auth', query: { next: '/mypage' } })

/** 로그아웃 */
const onLogout = async () => {
  try {
    try { const auth = getAuth(); await fbSignOut(auth) } catch (e) { console.warn('Firebase signOut 실패/무시:', e?.message || e) }
    try {
      const a = me?.auth?.value ?? me?.auth ?? {}
      if (a) { a.loggedIn = false; a.uid = null; a.user = null; a.type = 'guest'; a.role = 'guest'; a.profile = null; a.company = null }
      if (me?.profile?.value !== undefined) me.profile.value = null; else if (me?.profile !== undefined) me.profile = null
      if (me?.company?.value !== undefined) me.company.value = null; else if (me?.company !== undefined) me.company = null
    } catch {}
    router.replace({ path: '/auth', query: { next: '/mypage' } })
  } catch (e) {
    alert('로그아웃 중 오류가 발생했어요.')
  }
}
</script>

<!-- 공통 CSS -->
<style src="@/styles/mypage.css"></style>

<style scoped>
:root[data-theme="white"] .page-flat{
  --auth-pink:#ff2c8a;
  --auth-pink-soft:#ff6aa8;
}
:root[data-theme="white"] .page-flat :deep(.auth button[aria-pressed="false"]),
:root[data-theme="white"] .page-flat :deep(.auth [role="tab"][aria-selected="false"]),
:root[data-theme="white"] .page-flat :deep(.auth .seg button:not(.on):not(.primary)),
:root[data-theme="white"] .page-flat :deep(.auth .tabs button:not(.on):not(.primary)) {
  color: var(--auth-pink-soft) !important;
  border-color: color-mix(in oklab, var(--auth-pink-soft), white 35%) !important;
  background: transparent !important;
}
:root[data-theme="white"] .page-flat :deep(.auth button[aria-pressed="true"]),
:root[data-theme="white"] .page-flat :deep(.auth [role="tab"][aria-selected="true"]),
:root[data-theme="white"] .page-flat :deep(.auth .seg button.on),
:root[data-theme="white"] .page-flat :deep(.auth .tabs button.on),
:root[data-theme="white"] .page-flat :deep(.auth .btn.primary) {
  background: var(--auth-pink) !important;
  border-color: var(--auth-pink) !important;
  color: #fff !important;
}
:root[data-theme="white"] .page-flat :deep(.auth form button[type="submit"]),
:root[data-theme="white"] .page-flat :deep(.auth button.login) {
  background: var(--auth-pink) !important;
  border-color: var(--auth-pink) !important;
  color: #fff !important;
  opacity: 1 !important;
  filter: none !important;
}
:root[data-theme="white"] .page-flat :deep(.auth button svg){
  fill: currentColor !important;
  stroke: currentColor !important;
}

/* ✅ 모달 기본 스타일 (프로젝트 전역에 있으면 중복 무방) */
/* 기본은 완전 비활성화: 화면 클릭 방해 금지 */
</style>
