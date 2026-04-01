<!-- src/pages/MyPage.vue -->
<template>
  <main class="page-flat">
    <!-- ✅ 비로그인/게스트/익명 계정: 항상 LoggedOutSection -->
    <LoggedOutSection v-if="!effectiveLoggedIn" @auth="goAuth" />

    <!-- 로그인 상태(정식 회원만) -->
    <template v-else>
      <section
        class="section"
        style="display:flex; align-items:center; justify-content:space-between; gap:8px;"
      >
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
        :avatarStyle="avatarStyleWithBg"
        :initials="initials"
        :copy="copy"
        :copyInviteLink="copyMyInviteLink"
        :go="go"
        :userPoints="userPoints"
        :userReward="userReward"
        :userTier="userTier"
        :nextTier="nextTier"
        :tierProgressPct="tierProgressPct"
        :tierPointToNext="tierPointToNext"
        :onTierClick="goTierLadder"
        :onPointTableClick="openPointTable"
        :onShowReferralList="openReferralList"
      />

      <!-- 기업 회원(= 기업/관리자 공통) -->
      <template v-if="uiType === 'company'">
        <!-- 기업 프로필 카드 (회사 정보) -->
        <CompanySection
          v-if="state.company"
          :state="state"
          :displayNick="displayNick"
          :hasAvatarImage="hasAvatarImage"
          :avatarStyle="avatarStyleWithBg"
          :go="go"
        />

        <!-- 기업/관리자용 포인트·리워드·등급·추천코드 카드 -->
        <UserSection
          :state="state"
          :displayNick="displayNick"
          :myCode="myCode"
          :hasAvatarImage="hasAvatarImage"
          :avatarStyle="avatarStyleWithBg"
          :initials="initials"
          :copy="copy"
          :copyInviteLink="copyMyInviteLink"
          :go="go"
          :userPoints="userPoints"
          :userReward="userReward"
          :userTier="userTier"
          :nextTier="nextTier"
          :tierProgressPct="tierProgressPct"
          :tierPointToNext="tierPointToNext"
          :onTierClick="goTierLadder"
          :onPointTableClick="openPointTable"
          :onShowReferralList="openReferralList"
        />

        <!-- 운영자 전용(AdminTools) -->
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
            :addNewsTop="addNewsTop"
            :removeNews="removeNews"
            :reloadConfig="reloadConfig"
            :syncTags="syncTags"
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
        :displayNick="displayNickForEdit"
        :initials="initials"
        :previewAvatarStyle="previewAvatarStyleWithBg"
        :onPickProfilePhoto="onPickProfilePhoto"
        :onPickProfilePhotos="onPickProfilePhotos"
        :clearProfilePhoto="clearProfilePhoto"
        :applyRandomFemale="applyRandomFemale"
        :nextProfilePhoto="nextProfilePhoto"
        :prevProfilePhoto="prevProfilePhoto"
        @save="handleProfileSave"
        @close="closeEdit"
      />

      <!-- 포인트 적립 기준표 모달 -->
      <PointRuleModal
        v-if="pointTableOpen"
        @close="pointTableOpen = false"
      />

      <!-- 내 추천인 / 추천 내역 모달 -->
      <div
        v-if="referralOpen"
        class="ref-mask"
        @click.self="closeReferralList"
      >
        <section class="ref-sheet" role="dialog" aria-modal="true">
          <header class="ref-head">
            <strong>내 추천인 / 추천 내역</strong>
            <button
              type="button"
              class="ref-close"
              @click="closeReferralList"
              aria-label="닫기"
            >
              ✕
            </button>
          </header>

          <div class="ref-body">
            <!-- 나를 추천한 사람 -->
            <section class="ref-block">
              <h4>나를 추천한 사람</h4>
              <p v-if="referralLoading">
                불러오는 중…
              </p>
              <template v-else>
                <p v-if="!myReferrer">
                  아직 추천인 정보가 없습니다.
                </p>
                <p v-else class="ref-item">
                  <span class="ref-name">
                    {{
                      myReferrer.nickname ||
                      myReferrer.nick ||
                      myReferrer.name ||
                      myReferrer.email ||
                      myReferrer.id ||
                      '-'
                    }}
                  </span>
                  <span
                    v-if="myReferrer.code"
                    class="ref-code"
                  >
                    (코드: {{ myReferrer.code }})
                  </span>
                </p>
              </template>
            </section>

            <!-- 내 코드로 가입한 회원 목록 -->
            <section class="ref-block">
              <h4>내 코드로 가입한 회원</h4>
              <p v-if="referralLoading">
                불러오는 중…
              </p>
              <template v-else>
                <p v-if="!myReferralList.length">
                  아직 내 추천코드로 가입한 회원이 없습니다.
                </p>
                <ul v-else class="ref-list">
                  <li
                    v-for="u in myReferralList"
                    :key="u.id || u.uid || u.email || u.code"
                    class="ref-item"
                  >
                    <span class="ref-name">
                      {{ u.nickname || u.nick || u.name || u.email || u.id || '-' }}
                    </span>
                    <span
                      v-if="u.code"
                      class="ref-code"
                    >
                      · 코드: {{ u.code }}
                    </span>
                  </li>
                </ul>
              </template>
            </section>
          </div>
        </section>
      </div>

      <!-- 안내 오버레이 -->
      <GuideOverlay
        v-model="guideOpen"
        :slides="guideSlides"
        :show-text="false"
      />
    </template>
  </main>
</template>

<script setup>
import { computed, onMounted, nextTick, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getAuth, signOut as fbSignOut } from 'firebase/auth'
import { db as fbDb } from '@/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'

import LoggedOutSection from '@/components/mypage/LoggedOutSection.vue'
import HeaderBar from '@/components/mypage/HeaderBar.vue'
import UserSection from '@/components/mypage/UserSection.vue'
import CompanySection from '@/components/mypage/CompanySection.vue'
import ProfileEditSheet from '@/components/mypage/ProfileEditSheet.vue'
import AdminTools from '@/components/mypage/AdminTools.vue'
import AdminNotifyBell from '@/components/common/AdminNotifyBell.vue'
import BizManagerTabs from '@/components/biz/BizManagerTabs.vue'
import GuideOverlay from '@/components/GuideOverlay.vue'
import PointRuleModal from '@/components/mypage/PointRuleModal.vue'

import { useMyPageCore } from '@/composables/mypage/useMyPageCore.js'
import { me } from '@/store/user.js'

const router = useRouter()
const route = useRoute()
const core = useMyPageCore()
const fns = getFunctions(undefined, 'asia-northeast3')
const fnLoadReferralInfo = httpsCallable(fns, 'loadReferralInfo')

// ✅ 마이페이지 안내/포인트표 상태
const guideOpen = ref(false)
const pointTableOpen = ref(false)

// ✅ 추천인/추천 내역 모달 상태 + 데이터
const referralOpen = ref(false)
const referralLoading = ref(false)
const myReferrer = ref(null)
const myReferralList = ref([])

const openReferralList = async () => {
  referralOpen.value = true
  await loadReferralInfo()
}
const closeReferralList = () => {
  referralOpen.value = false
}

const guideSlides = [
  { key: 'guide-1', image: '/guide/guide_01.jpg' },
  { key: 'guide-2', image: '/guide/guide_02.jpg' },
  { key: 'guide-3', image: '/guide/guide_03.jpg' },
]
const openGuide = () => {
  guideOpen.value = true
}
const openPointTable = () => {
  pointTableOpen.value = true
}

// 디버깅용
window.__mp = { isAdmin: core.isAdmin, state: core.state }

const {
  state,
  isAdmin,
  ads,
  adsP,
  adsF,
  savingAdsP,
  savingAdsF,
  newsSaving,
  displayNick: coreDisplayNick,
  myCode,
  hasAvatarImage,
  avatarStyle,
  initials,
  previewAvatarStyle,
  copy,
  copyMyInviteLink,
  bgStyle,
  timeAgo,
  fmtDate,
  formatWon,
  adDaysOf,
  adPreviewStyle,
  ui,
  saving,
  edit,
  openEdit: goProfileEdit,
  closeEdit,
  saveProfile,
  onPickProfilePhoto,
  onPickProfilePhotos,
  clearProfilePhoto,
  applyRandomFemale,
  nextProfilePhoto,
  prevProfilePhoto,
  onPickAdImage,
  clearAdImage,
  toggleAd,
  saveAdOne,
  removeAd,
  saveNewsline,
  onNewsChange,
  userPoints,
  userTier,
  nextTier,
  tierProgressPct,
  tierPointToNext,
  news,
  addNewsTop,
  removeNews,
  reloadConfig,
  syncTags,
} = core

/* ✅ "실제 로그인" 여부: 게스트/익명 계정은 모두 false */
const effectiveLoggedIn = computed(() => {
  const s = state?.value || state || {}

  // 기존 플래그
  const base = !!(s.loggedIn ?? s.logged ?? false)
  if (!base) return false

  // 타입 기준: guest / anonymous 등은 로그인으로 보지 않음
  const rawType =
    s.type ||
    s.role ||
    s.profile?.type ||
    s.profile?.role ||
    ''
  const t = String(rawType || '').toLowerCase()

  if (['guest', 'anonymous', 'anon', 'temp'].includes(t)) {
    return false
  }

  // 이메일이 전혀 없으면(익명 계정) 로그인으로 보지 않음
  const email = String(
    s.profile?.email ||
      s.email ||
      ''
  ).trim()

  if (!email) return false

  return true
})

/* 리워드 금액 */
const userReward = computed(() => {
  const s = state?.value || {}
  const prof = s.profile || {}
  return Number(prof.reward ?? prof.rewardAmount ?? s.reward ?? 0)
})

/* 닉네임 표시 */
const displayNick = computed(() => {
  const s = state?.value || {}
  return (
    s.profile?.nickname ||
    s.profile?.nick ||
    (coreDisplayNick && coreDisplayNick.value !== undefined
      ? coreDisplayNick.value
      : coreDisplayNick) ||
    ''
  )
})

/* 프로필 수정 모달에서 사용할 닉네임 */
const displayNickForEdit = computed(() => {
  const src = edit?.value ?? edit ?? {}
  const fromEdit = src.nickname?.trim?.() || ''
  if (fromEdit) return fromEdit
  return (displayNick.value || '').trim()
})

/* edit 객체에서 필드 꺼내기 */
const getEditField = (key) => {
  const src = edit?.value ?? edit ?? {}
  return src[key]
}

/* 아바타 배경 + 텍스트 색상 */
const avatarStyleWithBg = computed(() => {
  const baseVal = avatarStyle?.value ?? avatarStyle
  const prof = (state?.value && state.value.profile) || state?.profile || {}

  const bg = prof.bgColor || null
  const textColor = prof.textColor || '#FF2C8A'

  const rawPhoto = prof.photoUrl || ''
  const isPlaceholder = rawPhoto.startsWith('data:image/svg+xml')
  const hasImg = isPlaceholder
    ? false
    : (hasAvatarImage?.value ?? hasAvatarImage)

  const base =
    typeof baseVal === 'function' ? baseVal('user') || {} : baseVal || {}

  const styleObj = {
    ...base,
    color: textColor,
  }

  if (bg && !hasImg) {
    styleObj.backgroundColor = bg
    styleObj.backgroundImage = 'none'
  }

  return styleObj
})

/* 프로필 수정 시트에서 아바타 프리뷰 스타일 */
const previewAvatarStyleWithBg = computed(() => {
  const baseVal = previewAvatarStyle?.value ?? previewAvatarStyle
  const prof = (state?.value && state.value.profile) || state?.profile || {}

  const bg = prof.bgColor || null
  const textColor = prof.textColor || '#FFFFFF'

  const base =
    typeof baseVal === 'function' ? baseVal('user') || {} : baseVal || {}

  const styleObj = {
    ...base,
    color: textColor,
  }

  if (bg) {
    styleObj.backgroundColor = bg
  }

  return () => styleObj
})

/* 저장 후 state.profile 즉시 반영 */
const handleProfileSave = () => {
  try {
    const store = state?.value ?? state
    if (store) {
      if (!store.profile) store.profile = {}
      const p = store.profile

      const nickname = getEditField('nickname')
      const phone = getEditField('phone')
      const bgColor = getEditField('bgColor')
      const textColor = getEditField('textColor')

      if (nickname !== undefined) {
        const nick = String(nickname || '').trim()
        if (nick) {
          p.nickname = nick
          p.nick = nick
        }
      }
      if (phone !== undefined) {
        p.phone = String(phone || '').trim()
      }
      if (bgColor !== undefined) {
        p.bgColor = bgColor || null
      }
      if (textColor !== undefined) {
        p.textColor = textColor || '#FF2C8A'
      }
    }
  } catch (e) {
    console.warn('local profile patch failed:', e)
  }

  if (typeof saveProfile === 'function') {
    saveProfile()
  }
}

/* 등급 배지 클릭 → 계급도 페이지 */
const goTierLadder = () => {
  try {
    router.push({ name: 'tier-ladder', query: { p: Number(userPoints || 0) } })
  } catch {
    location.href = '/tier-ladder'
  }
}

/* AdminTools에 넘길 데이터 정규화 */
function normalizeAdsShape(src) {
  if (Array.isArray(src?.list)) return { list: src.list }
  if (Array.isArray(src)) return { list: src }
  return { list: [] }
}
const adsPData = computed(() => {
  if (adsP && typeof adsP === 'object') return normalizeAdsShape(adsP)
  if (ads && typeof ads === 'object' && 'P' in ads)
    return normalizeAdsShape(ads.P)
  if (Array.isArray(ads)) return { list: ads }
  return { list: [] }
})
const adsFData = computed(() => {
  if (adsF && typeof adsF === 'object') return normalizeAdsShape(adsF)
  if (ads && typeof ads === 'object' && 'F' in ads)
    return normalizeAdsShape(ads.F)
  return { list: [] }
})

/** 운영자는 company UI로 고정 */
const uiType = computed(() => {
  if (isAdmin?.value) return 'company'
  const hasCompanySignal = !!(state?.value?.company || state?.value?.storeId)
  const t = String(state?.value?.type || '').toLowerCase()
  return t === 'company' || t === 'biz' || hasCompanySignal ? 'company' : 'user'
})

/** 기본 카테고리 */
const defaultCategory = computed(
  () =>
    state?.value?.company?.category ||
    state?.value?.profile?.category ||
    '',
)

/** 알림에서 넘어오면 신청목록으로 스크롤 */
const appsSection = ref(null)
async function maybeScrollToApps() {
  if (route.query.view === 'apps') {
    await nextTick()
    const el = appsSection.value || document.getElementById('apps')
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
onMounted(() => {
  maybeScrollToApps()
})
watch(
  () => route.query.view,
  () => {
    maybeScrollToApps()
  },
)

/** Cloud Functions에서 추천 관계 불러오기 */
async function loadReferralInfo() {
  referralLoading.value = true
  try {
    const res = await fnLoadReferralInfo()
    const data = res?.data || {}

    myReferrer.value = data.referrer || null
    myReferralList.value = Array.isArray(data.referred) ? data.referred : []
  } catch (e) {
    console.warn('loadReferralInfo error:', e)
    myReferrer.value = null
    myReferralList.value = []
  } finally {
    referralLoading.value = false
  }
}

/** 라우팅 헬퍼 */
const go = (to) => {
  try {
    const tgt = typeof to === 'string' ? { path: to } : to || {}
    if (tgt.name === 'storeEdit') {
      const id = tgt.params?.id ?? tgt.query?.id ?? null
      if (!id) {
        alert('가게 ID가 없어 이동할 수 없습니다.')
        return
      }
    }
    router.push(tgt)
  } catch (e) {
    console.warn('router.push error:', e)
    alert('화면 이동 중 오류가 발생했습니다.')
  }
}
const goAuth = () =>
  router.push({ path: '/auth', query: { next: '/mypage' } })

/** 로그아웃 */
const onLogout = async () => {
  try {
    try {
      const auth = getAuth()
      await fbSignOut(auth)
    } catch (e) {
      console.warn('Firebase signOut 실패/무시:', e?.message || e)
    }
    try {
      const a = me?.auth?.value ?? me?.auth ?? {}
      if (a) {
        a.loggedIn = false
        a.uid = null
        a.user = null
        a.type = 'guest'
        a.role = 'guest'
        a.profile = null
        a.company = null
      }
      if (me?.profile?.value !== undefined) me.profile.value = null
      else if (me?.profile !== undefined) me.profile = null
      if (me?.company?.value !== undefined) me.company.value = null
      else if (me?.company !== undefined) me.company = null
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
:root[data-theme='white'] .page-flat {
  --auth-pink: #ff2c8a;
  --auth-pink-soft: #ff6aa8;
}
:root[data-theme='white'] .page-flat :deep(.auth button[aria-pressed='false']),
:root[data-theme='white'] .page-flat :deep(.auth [role='tab'][aria-selected='false']),
:root[data-theme='white']
  .page-flat
  :deep(.auth .seg button:not(.on):not(.primary)),
:root[data-theme='white']
  .page-flat
  :deep(.auth .tabs button:not(.on):not(.primary)) {
  color: var(--auth-pink-soft) !important;
  border-color: color-mix(in oklab, var(--auth-pink-soft), white 35%) !important;
  background: transparent !important;
}
:root[data-theme='white'] .page-flat :deep(.auth button[aria-pressed='true']),
:root[data-theme='white'] .page-flat :deep(.auth [role='tab'][aria-selected='true']),
:root[data-theme='white'] .page-flat :deep(.auth .seg button.on),
:root[data-theme='white'] .page-flat :deep(.auth .tabs button.on),
:root[data-theme='white'] .page-flat :deep(.auth .btn.primary) {
  background: var(--auth-pink) !important;
  border-color: var(--auth-pink) !important;
  color: #fff !important;
}
:root[data-theme='white']
  .page-flat
  :deep(.auth form button[type='submit']),
:root[data-theme='white'] .page-flat :deep(.auth button.login) {
  background: var(--auth-pink) !important;
  border-color: var(--auth-pink) !important;
  color: #fff !important;
  opacity: 1 !important;
  filter: none !important;
}
:root[data-theme='white'] .page-flat :deep(.auth button svg) {
  fill: currentColor !important;
  stroke: currentColor !important;
}

/* 마이페이지 안내 탭 스타일 */
.guide-section {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 64px;
  padding: 0 16px 10px;
  z-index: 5000;
  pointer-events: none;
}
.guide-btn {
  pointer-events: auto;
}
.guide-btn {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  height: 44px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--surface);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  font-weight: 700;
  font-size: 14px;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.08);
  color: #111 !important;
}
.guide-btn .label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.guide-btn .icon {
  font-size: 18px;
  opacity: 0.7;
}
.guide-btn.admin {
  background: #ffe7f2;
  border-color: #ffc5e0;
}
.guide-btn .pill {
  padding: 2px 8px;
  border-radius: 999px;
  background: #ff2c8a;
  color: #fff;
  font-size: 11px;
}
:root[data-theme='white'] .guide-btn {
  background: #ffffff;
  border-color: #f1f1f1;
  color: #111 !important;
}

/* 추천 목록 모달 */
.ref-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9000;
  padding: 16px;
}

.ref-sheet {
  width: 100%;
  max-width: 480px;
  background: var(--surface, #fff);
  color: var(--fg, #111);
  border-radius: 16px;
  border: 1px solid var(--line, #eee);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.25);
  padding: 12px 14px 14px;
}

.ref-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--line, #eee);
}

.ref-close {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid var(--line, #ddd);
  background: var(--surface, #fff);
  font-weight: 900;
}

.ref-body {
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 13px;
}

.ref-block h4 {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 900;
}

.ref-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ref-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ref-name {
  font-weight: 800;
}

.ref-code {
  font-size: 12px;
  color: #666;
}
</style>
