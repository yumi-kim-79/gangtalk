<!-- src/pages/PartnersPage.vue -->
<template>
  <main class="page">
    <section class="top">
      <SearchBar v-model="q" :placeholder="searchPH" @search="doSearch" />

      <!-- ✅ 실시간 순위 (상단 티커: 1줄 세로 스크롤) -->
      <div
        class="hot-box"
        v-if="hotRanks10.length"
        role="button"
        tabindex="0"
        aria-label="실시간 순위 보기"
        @click="openHotSheet"
        @keydown.enter.prevent="openHotSheet"
        @keydown.space.prevent="openHotSheet"
      >
        <div class="hot-ticker nowrap">
          <span class="hot-label">실시간순위</span>
          <span class="hot-sep">:</span>
          <div
            class="ticker-window"
            aria-label="실시간 순위"
            ref="tickerWinRef"
            :style="{ '--ticker-item-h': tickerItemH + 'px' }"
          >
            <ul class="ticker-list" :style="tickerStyle">
              <li
                v-for="(s, i) in loopedRanks"
                :key="`hr_${i}_${s.id || s.name}`"
                class="ticker-item"
                @click.stop="openHotSheet"
              >
                <span class="badge-rank" :data-rank="displayRank(i)">{{ displayRank(i) }}</span>
                <span class="name">{{ s.name }}</span>
                <span class="dot">·</span>
                <span class="intro ellip1">{{ s.intro }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- 🔸 배너 등록 버튼 (실시간 순위 아래, 배너 위) -->
    <section v-if="isEnterprise || canEdit" class="banner-cta">
      <button
        class="ad-btn pink-cta"
        type="button"
        @click.stop="toggleAdCreate($event)"
      >
        <!-- 배너 등록 상태 -->
        <template v-if="!bizPanel.open || bizPanel.kind!=='ad'">
          <span class="arrow-3">▼▼▼</span>
          <span>배너 등록</span>
        </template>

        <!-- 패널 열려 있을 때 -->
        <span v-else>닫기</span>
      </button>
    </section>

    <!-- 프로모션 배너 -->
    <section class="banners" v-if="bannersReady && bannersToShow.length">
      <article
        v-for="b in bannersToShow"
        :key="b.id"
        class="banner"
        @click="onBannerClick"
      >
        <img v-if="bannerImage(b)" :src="bannerImage(b)" alt="" class="banner-img" loading="lazy" />
        <span
          v-for="(t, tIdx) in (b.tags||[])"
          :key="t + '_' + tIdx"
          class="chip tag-abs"
          :style="tagPosStyle(b, tIdx)"
        >{{ t }}</span>
      </article>
    </section>

    <!-- 카테고리 -->
    <section class="cats">
      <!-- 텍스트만 제거, 여백/레이아웃 유지를 위해 h3는 남겨둠 -->
      <h3 class="sec-ttl"></h3>
      <div class="cat-grid">
        <!-- 지역 드롭다운 트리거 -->
        <button
          type="button"
          class="cat region-cat"
          @click="toggleRegion"
          :aria-expanded="regionOpen ? 'true' : 'false'"
          aria-haspopup="listbox"
          ref="regionBtnRef"
        >
          <div class="ico">📍</div>
          <div class="lbl">{{ regionLabel }}</div>
          <span class="chev">🔽</span>
        </button>

        <ul
          v-if="regionOpen"
          class="region-pop"
          role="listbox"
          :aria-activedescendant="`opt_${region}`"
          ref="regionPopRef"
        >
          <li
            v-for="opt in regionOptions"
            :key="opt.value"
            :id="`opt_${opt.value}`"
            class="region-opt"
            :class="{ active: region===opt.value }"
            role="option"
            :aria-selected="region===opt.value"
            @click="selectRegion(opt.value)"
          >
            {{ opt.label }}
          </li>
        </ul>

        <!-- 카테고리 버튼들 (PNG 이미지 아이콘 버전) -->
        <button
          v-for="c in categories"
          :key="c.key"
          class="cat"
          :class="{ active: cat===c.key }"
          @click="toggleCat(c.key)"
          type="button"
        >
          <!-- 아이콘: data-type 에 맞는 PNG를 background-image로 표시 -->
          <div class="cat-icon" :data-type="c.key"></div>

          <!-- 아래 라벨 텍스트 -->
          <div class="lbl">{{ c.label }}</div>
        </button>
      </div>
    </section>

    <!-- (가게찾기와 동일하게: 카테고리 아래 별도 CTA 제거) -->
    <!-- partner-cta 섹션 삭제 -->

    <!-- ✅ 운영자 전용 툴바 -->
    <section v-if="canEdit" class="orders-head">
      <div class="rank-tools">
        <label class="toggle">
          <input type="checkbox" v-model="editMode" @change="onEnterEdit" />
          <span class="toggle-label">현황판 순서 편집</span>
        </label>
        <div class="tools-right">
          <button class="icon-btn" :disabled="savingOrders" @click="refresh" title="새로고침" aria-label="새로고침" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M21 12a9 9 0 1 1-2.64-6.36"/>
              <path d="M21 3v6h-6"/>
            </svg>
          </button>
          <button class="btn primary save-btn" :disabled="!editMode || savingOrders" @click="saveOrders" type="button">
            {{ savingOrders ? '저장 중…' : '저장' }}
          </button>
        </div>
      </div>
    </section>

    <!-- 카테고리 인기 (배너 카드형) -->
    <section class="rank-sections">
      <!-- 텍스트만 제거 -->
      <h3 class="sec-ttl"></h3>

      <div v-for="sec in visibleCategories" :key="sec.key" class="rank-sec">
        <div class="rs-head">
          <strong>{{ sec.label }} Top 5</strong>

          <!-- ✅ Top5 등록 버튼: 제목 오른쪽 (기업회원 + 관리자) -->
          <button
            v-if="isEnterprise || canEdit"
            class="pink-cta top5-btn"
            type="button"
            @click="toggleBizCreate($event)"
          >
            Top5 등록
          </button>
        </div>

        <div class="rs-scroller">
          <article
            v-for="(p, idx) in topByCat(sec.key)"
            :key="p.id"
            class="rs-card"
            role="button"
            tabindex="0"
            @click="openPartner(p)"
            @keydown.enter.prevent="openPartner(p)"
            @keydown.space.prevent="openPartner(p)"
          >
            <!-- 썸네일 -->
            <div class="rs-thumb" :class="{ noimg: !p.thumb }" :style="thumbStyle(p.thumb)">
              <span class="rs-badge" :data-rank="idx+1">{{ idx+1 }}</span>
            </div>

            <!-- 텍스트 영역 -->
            <div class="rs-info">
              <div class="rs-title ellip">{{ p.name }}</div>
              <div class="rs-sub ellip">{{ p.region }} · {{ mapCat[p.category] || p.categoryRaw || '기타' }}</div>
              <div class="rs-intro ellip">{{ primaryLine(p) }}</div>
              <div v-if="priceTagsJoined(p)" class="rs-price ellip">{{ priceTagsJoined(p) }}</div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- 목록 헤드 -->
    <section class="list-head" id="list">
      <div class="count-row">
        <div class="count">총 {{ filtered.length }}개</div>

        <!-- ✅ 일반등록 버튼: 개수 오른쪽 (기업회원 + 관리자) -->
        <button
          v-if="isEnterprise || canEdit"
          class="pink-cta list-reg-btn"
          type="button"
          @click="toggleBizCreate($event)"
        >
          일반등록
        </button>
      </div>

      <div class="view-tools" @click.stop>
        <!-- 🌗 다크/화이트 -->
        <button
          class="tool"
          :title="isDark ? '라이트 모드' : '다크 모드'"
          :aria-label="isDark ? '라이트 모드' : '다크 모드'"
          type="button"
          @click.stop.prevent="toggleTheme"
          @touchstart.stop.prevent="toggleTheme"
        >
          <span class="ico-svg" v-html="isDark ? Icons.darkLight.dark : Icons.darkLight.light"></span>
        </button>

        <!-- 📍 내 주변 -->
        <button
          class="tool"
          title="내 주변 보기(10km)"
          aria-label="내 주변 보기(10km)"
          type="button"
          @click.stop.prevent="goNearMe"
          @touchstart.stop.prevent="goNearMe"
        >
          <span class="ico-svg" v-html="Icons.nearme"></span>
        </button>

        <!-- 📋/🗂 한줄/두칸 토글 (단일 버튼) -->
        <button
          class="tool"
          :class="{ on: isListView }"
          :title="isListView ? '두칸보기' : '한줄보기'"
          :aria-label="isListView ? '두칸보기로 전환' : '한줄보기로 전환'"
          type="button"
          @click.stop.prevent="toggleView"
          @touchstart.stop.prevent="toggleView"
        >
          <!-- 현재 상태에 따라 아이콘 변경 -->
          <span class="ico-svg" v-html="isListView ? Icons.list : Icons.grid"></span>
        </button>

        <!-- 🔄 새로고침 -->
        <button
          class="tool"
          title="새로고침"
          aria-label="새로고침"
          type="button"
          @click.stop.prevent="refresh"
          @touchstart.stop.prevent="refresh"
        >
          <span class="ico-svg" v-html="Icons.refresh"></span>
        </button>
      </div>
    </section>

    <!-- 제휴 목록 (리스트) -->
    <section v-if="view==='list'" class="list">
      <article
        v-for="p in filtered"
        :key="p.id"
        class="list-card"
        @click="openPartner(p)"
      >
        <div class="lc-thumb" :class="{ noimg: !p.thumb }" :style="thumbStyle(p.thumb)"></div>
        <div class="lc-body">
          <div class="lc-top ellip">
            <b class="lc-name">{{ p.name }}</b>
            <span class="sep">ㅣ</span>
            <span class="lc-sub">{{ p.region }} · {{ mapCat[p.category] || p.categoryRaw || '기타' }}</span>
          </div>
          <div class="lc-title ellip">{{ primaryLine(p) }}</div>
          <div class="lc-meta" :class="{ flash: flashId === p.id }">
            <span class="rate">⭐️ {{ ratingTextP(p) }}</span>
            <span class="favs">({{ likesOf(p) }})</span>
          </div>
          <div v-if="priceTagsJoined(p)" class="lc-price ellip">{{ priceTagsJoined(p) }}</div>
        </div>
      </article>
    </section>

    <!-- 제휴 목록 (그리드) -->
    <section v-else class="grid">
      <article
        v-for="p in filtered"
        :key="p.id"
        class="grid-card"
        @click="openPartner(p)"
      >
        <div class="thumb" :class="{ noimg: !p.thumb }" :style="thumbStyle(p.thumb)"></div>
        <div class="g-name">{{ p.name }}</div>
        <div class="g-sub muted">{{ p.region }} · {{ mapCat[p.category] || p.categoryRaw || '기타' }}</div>
        <div class="g-tags">
          <span v-for="t in (p.tags||[]).slice(0,2)" :key="t" class="tag">{{ t }}</span>
        </div>
      </article>
    </section>

    <!-- ✅ 실시간순위 Top10 바텀시트 -->
    <teleport to="body">
      <div v-if="hotSheet.open" class="action-mask" @click.self="closeHotSheet">
        <section class="action-sheet" role="dialog" aria-modal="true">
          <header class="as-header">
            <strong>실시간 순위 Top 10</strong>
            <button class="as-close" aria-label="닫기" @click="closeHotSheet" type="button">✕</button>
          </header>
          <div class="as-body">
            <ol class="hot10-list">
              <li v-for="(s, i) in hotRanks10" :key="s.id || s.name">
                <button class="hot10-item" type="button" @click="openPartnerFromHot(s)">
                  <span class="h-rank" :data-rank="i + 1">{{ i + 1 }}</span>
                  <span class="h-name ellip1">{{ s.name }}</span>
                  <span class="h-dot">·</span>
                  <span class="h-intro ellip1">{{ s.intro }}</span>
                </button>
              </li>
            </ol>
          </div>
        </section>
      </div>
    </teleport>

    <!-- =================== 등록/광고 신청 패널: 트리거 아래 고정 =================== -->
    <teleport to="body">
      <section
        v-if="bizPanel.open"
        class="biz-fly"
        :style="bizPanel.style"
        role="dialog"
        aria-modal="true"
      >
        <header class="biz-header">
          <strong>{{ panelTitle }}</strong>
          <button class="biz-close" aria-label="닫기" @click="closeBiz" type="button">✕</button>
        </header>

        <BizManagerTabs
          :category="bizCategory"
          :kind="bizPanel.kind"
          :create-title="panelTitle"
          :create-button-label="panelButtonLabel"
          :create-tab-label="panelTitle"
        />
      </section>
    </teleport>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import SearchBar from '@/components/SearchBar.vue'
import BizManagerTabs from '@/components/biz/BizManagerTabs.vue'
import { db } from '@/firebase'

/* ====== ⬇⬇⬇ 추가: 근처 보기 공통 상수/유틸(가게찾기와 동일 동작) ⬇⬇⬇ ====== */
const NEARBY_EVENT = 'open-nearby-map'
const SS_KEY       = 'nearby:stores'
const GANGNAM_LOC  = { lat: 37.4979, lng: 127.0276 } // 강남역
function isSecureOrigin(){
  const { protocol, hostname } = window.location
  if (protocol === 'https:') return true
  if (protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1')) return true
  return false
}
/* ====== ⬆⬆⬆ 추가 끝 ⬆⬆⬆ ====== */

import {
  doc, getDoc, setDoc, addDoc, collection, getDocs, onSnapshot, serverTimestamp, query, limit
} from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getStorage, ref as sRef, getDownloadURL } from 'firebase/storage'
import { useMarketingBanners } from '@/composables/useMarketingBanners'

const router = useRouter()
const route  = useRoute()
const auth   = getAuth()
const storage = getStorage()

/* ✅ gs:// → https, data:image/* 은 그대로 허용 */
async function resolveImg(u){
  const url = String(u || '').trim()
  if (!url) return ''
  if (/^https?:\/\//i.test(url) || url.startsWith('/') || /^data:image\//i.test(url)) return url
  if (url.startsWith('gs://')){
    try { return await getDownloadURL(sRef(storage, url)) }
    catch (e) { console.warn('[Partners] getDownloadURL failed:', e); return '' }
  }
  console.warn('[Partners] Unsupported image URL skipped:', url.slice(0,80))
  return ''
}

/* 배너 이미지 선택 */
function bannerImage(b){
  if (!b) return ''
  const idx = Number.isFinite(b?._imgIndex) ? Number(b._imgIndex) : 0
  const cand = [ b.img, Array.isArray(b.images) ? b.images[idx] : '', Array.isArray(b.images) ? b.images[0] : '' ]
  return (cand.find(u => typeof u === 'string' && u.trim()) || '').trim()
}

/* ===== 로컬 별점 저장/복원 유틸 ===== */
const userKey = computed(() => auth.currentUser?.uid ? `u:${auth.currentUser.uid}` : 'guest')
function ratingKeys(id){
  const idStr = String(id); const uKey  = userKey.value
  return [
    `partnerRating:${uKey}:${idStr}`,
    `partnerRating:${idStr}`,
    `partner:rating:${idStr}`,
    `rating:partner:${idStr}`,
    `rating:${idStr}`,
  ]
}

/* 숫자 유틸 */
const clamp0 = (n) => Math.max(0, Number(n || 0))
const toPosInt = (x) => {
  const s = String(x ?? '').match(/\d+/g)?.join('') ?? ''
  const n = Number(s)
  return Math.max(0, Number.isFinite(n) ? n : 0)
}
/* ───────── 아이콘: StoreFinder.vue와 100% 동일 SVG ───────── */
const Icons = {
  darkLight: {
    light: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="12" cy="12" r="4"></circle>
        <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l-1.5-1.5M20.5 20.5L19 19M5 19l-1.5 1.5M20.5 3.5L19 5"></path>
      </svg>
    `,
    dark: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"></path>
      </svg>
    `
  },
  nearme: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <circle cx="12" cy="10" r="3"></circle>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>
      <path d="M7 10c0 5 5 12 5 12s5-7 5-12a5 5 0 1 0-10 0z"></path>
    </svg>
  `,
  list: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <path d="M4 7h16M4 12h16M4 17h16"></path>
    </svg>
  `,
  grid: `
    <svg viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="7" height="7" rx="1"></rect>
      <rect x="13" y="4" width="7" height="7" rx="1"></rect>
      <rect x="4" y="13" width="7" height="7" rx="1"></rect>
      <rect x="13" y="13" width="7" height="7" rx="1"></rect>
    </svg>
  `,
  refresh: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <path d="M21 12a9 9 0 1 1-2.64-6.36"></path>
      <path d="M21 3v6h-6"></path>
    </svg>
  `
}

/* ───────── 테마 토글: StoreFinder와 동일 동작 ───────── */
const theme = ref((route.query?.theme || localStorage.getItem('theme') || 'white').toString())
const isDark = computed(() => theme.value === 'dark' || theme.value === 'black')
function applyTheme(v){
  document.documentElement.setAttribute('data-theme', v)
  localStorage.setItem('theme', v)
}
watch(theme, applyTheme, { immediate:true })
function toggleTheme(){
  theme.value = isDark.value ? 'white' : 'dark'
  // 라우터가 있으면 공유 가능하게 쿼리 반영(없으면 이 줄은 제거해도 됨)
  try{ router.replace?.({ query:{ ...route.query, theme: theme.value } }) }catch{}
}

/* ───────── 내 주변: 페이지에 맞게 라우팅 연결 ─────────
   - 이미 지도/근처 기능이 있으면 그 함수로 연결.
   - 없으면 일단 리스트로 스크롤만 내려주도록 기본 구현.
*/
function scrollToList(){ document.getElementById('list')?.scrollIntoView({ behavior:'smooth', block:'start' }) }
// ✅ 수정 후
// ▼▼ 교체본: 모달 열고, 지도 페이지로도 이동되게 ▼▼
async function goNearMe(){
  const secure = isSecureOrigin()
  const hasGeo = 'geolocation' in navigator

  // 지도 라우팅 후보(프로젝트 라우트 이름에 맞춰 순차 시도)
  async function pushMapRoute(center){
    const candidates = [
      { name: 'mapNearby', query: { lat: center.lat, lng: center.lng, r: NEAR_KM } },
      { name: 'map',       query: { lat: center.lat, lng: center.lng, r: NEAR_KM } },
      { path: '/map',      query: { lat: center.lat, lng: center.lng, r: NEAR_KM } },
    ]
    for (const to of candidates){
      try{
        const r = router.resolve(to)
        if (r.matched && r.matched.length){ await router.push(to); break }
      }catch{ /* 다음 후보 시도 */ }
    }
  }

  // 공통: 근처 모달/지도 오픈 이벤트 + 지도 라우팅
  async function openNearbyWith(center, usedDefault){
    const stores = buildNearbyStores(center)
    try{ sessionStorage.setItem(SS_KEY, JSON.stringify(stores)) }catch{}
    window.dispatchEvent(new CustomEvent(NEARBY_EVENT, {
      detail: { center, radiusKm: NEAR_KM, stores, usedDefault } // ★ usedDefault 전달
    }))
    await pushMapRoute(center)  // ★ 지도 페이지로 이동
  }

  // ① 비보안/미지원 → 강남역 폴백
  if (!secure || !hasGeo){
    await openNearbyWith(GANGNAM_LOC, true)
    alert('현재 페이지가 보안 연결(HTTPS)이 아니어서 위치 접근이 제한됩니다.\n기본 중심(강남역)으로 표시합니다.')
    return
  }

  // ② 보안 환경 → 현재 위치 시도, 실패 시 폴백
  try{
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true, timeout: 10000, maximumAge: 60000
      })
    })
    const center = { lat: pos.coords.latitude, lng: pos.coords.longitude }
    await openNearbyWith(center, false)
  }catch(err){
    console.warn('[Partners] geolocation error:', err)
    const msg = String(err?.message || '')
    if (/denied|permission/i.test(msg)){
      alert('위치 권한이 거부되어 기본 중심(강남역)으로 표시합니다.')
    }else if (/timeout/i.test(msg)){
      alert('위치 요청이 시간 초과되어 기본 중심(강남역)으로 표시합니다.')
    }else{
      alert('현재 위치를 가져오지 못해 기본 중심(강남역)으로 표시합니다.')
    }
    await openNearbyWith(GANGNAM_LOC, true)
  }
}
// ▲▲ 교체본 끝 ▲▲

/* ───────── 뷰 전환/새로고침 훅 연결(이미 있는 경우 재사용) ─────────
   - setView('list'|'grid'), refresh()는 기존 것을 그대로 사용하세요.
   - view 상태(ref)도 기존 것을 그대로 씁니다.
*/

/* ---------- 썸네일 키 폴백 ---------- */
function firstString(...xs){
  for (const x of xs){
    if (typeof x === 'string' && x.trim()) return x.trim()
    if (Array.isArray(x) && x.length){
      const s = x.find(v => typeof v === 'string' && v.trim())
      if (s) return s.trim()
      const o = x.find(v => v && (typeof v.url === 'string' || typeof v.downloadURL === 'string' || typeof v.src === 'string'))
      if (o) return (o.url || o.downloadURL || o.src).trim()
    }
    if (x && (typeof x.url === 'string' || typeof x.downloadURL === 'string' || typeof x.src === 'string')){
      return (x.url || x.downloadURL || x.src).trim()
    }
  }
  return ''
}
function pickThumb(d = {}){
  return firstString(
    d.thumb, d.image, d.logo, d.photoUrl, d.cover, d.banner,
    d.thumbnail, d.thumbUrl, d.pic, d.photo,
    d.images, d.photos, d.pictures,
    d?.tags?.thumb
  )
}

/* 찜 수 계산 */
const likesOf = (p) => toPosInt(p?.favs ?? p?.likes ?? p?.hearts ?? p?.bookmarks ?? 0)

function getLocalRating(id){
  try{
    for (const k of ratingKeys(id)){
      const v1 = localStorage.getItem(k)
      const v2 = sessionStorage.getItem(k)
      const n1 = Number(v1), n2 = Number(v2)
      if (Number.isFinite(n1) && n1 >= 1 && n1 <= 5) return n1
      if (Number.isFinite(n2) && n2 >= 1 && n2 <= 5) return n2
    }
    return null
  }catch{ return null }
}
function setLocalRating(id, rating){
  const n = Math.max(1, Math.min(5, Number(rating) || 0))
  try{
    const [primary, legacy] = ratingKeys(id)
    localStorage.setItem(primary, String(n))
    localStorage.setItem(legacy, String(n))
  }catch{}
}

/* ---------- 검색 ---------- */
const q = ref('')

// 제휴관 상단 검색창 안내 문구
// → 시술명 / 시술부위 / 이벤트 중심이지만, 실제로는 업체명·담당자명도 함께 검색됨
const searchPH = '시술명, 시술부위, 이벤트를 입력해 보세요.'

function doSearch(){
  router.replace({ query: { ...route.query, q: q.value || undefined } })
  scrollToList()
}

onMounted(() => { if (route.query.q) q.value = String(route.query.q) })
watch(() => route.query.q, v => { q.value = String(v || '') })

/* ---------- 카테고리 ---------- */
const categories = [
  { key:'ps',     label:'성형'     },
  { key:'skin',   label:'피부'     },
  { key:'beauty', label:'미용'     },
  { key:'nail',   label:'네일'     },
  { key:'real',   label:'부동산'   },
  { key:'fit',    label:'피트니스' },
  { key:'deal',   label:'공동구매' },
  { key:'shop',   label:'상품관'   },
  // ETC 카테고리는 아이콘 안에 영어 텍스트 표시
  { key:'etc',    label:'기타', short:'ETC' },
]


const mapCat = Object.fromEntries(categories.map(c=>[c.key,c.label]))
const cat = ref('all')
const toggleCat = (k)=>{ cat.value = (cat.value===k ? 'all' : k) }
const visibleCategories = computed(() => (cat.value === 'all' ? categories : categories.filter(c => c.key === cat.value)))
const bizCategory = computed(() => cat.value === 'all' ? '' : cat.value)

/* 카테고리 정규화 */
function normCat(raw=''){
  const v = String(raw).trim().toLowerCase()
  if (!v) return 'etc'
  const hit = (...words)=> words.some(w => v.includes(w))

  // 성형
  if (['ps','plastic','plastics'].includes(v) || hit('성형','성형외과')) return 'ps'
  // 피부
  if (['skin','derma','dermatology'].includes(v) || hit('피부','피부과')) return 'skin'
  // 미용(헤어/살롱 포함, 기존 salon → beauty로 흡수)
  if (['beauty','salon','hair'].includes(v) || hit('미용','헤어','살롱','미용실')) return 'beauty'
  // 네일
  if (['nail'].includes(v) || hit('네일')) return 'nail'
  // 부동산
  if (['real','estate','realestate'].includes(v) || hit('부동산')) return 'real'
  // 피트니스
  if (['fit','fitness','pt','gym'].includes(v) || hit('피트니스','헬스','pt','짐')) return 'fit'
  // 공동구매(공구)
  if (['deal','groupbuy'].includes(v) || hit('공동구매','공구')) return 'deal'
  // 상품관(스토어/샵)
  if (['shop','store','market'].includes(v) || hit('상품관','상품','스토어','샵','마켓')) return 'shop'

  // 과거 카테고리(카페/렌탈 등)는 기타로
  return 'etc'
}


/* ---------- 지역 드롭다운 ---------- */
const regionOptions = [
  { value: 'all',         label: '전체' },
  { value: 'gangnam',     label: '강남' },
  { value: 'non_gangnam', label: '비강남' },
  { value: 'gyeonggi',    label: '경기' },
  { value: 'incheon',     label: '인천' },
]
const region = ref('all')
const regionOpen = ref(false)
const regionBtnRef = ref(null)
const regionPopRef = ref(null)
const regionLabel = computed(() => {
  const f = regionOptions.find(o => o.value === region.value)
  return f ? f.label : '지역'
})
function toggleRegion(){ regionOpen.value = !regionOpen.value }
function selectRegion(v){ region.value = v; regionOpen.value = false }
function onDocClick(e){
  if (!regionOpen.value) return
  const btn = regionBtnRef.value
  const pop = regionPopRef.value
  if (btn?.contains(e.target) || pop?.contains(e.target)) return
  regionOpen.value = false
}
onMounted(() => document.addEventListener('click', onDocClick, true))
onUnmounted(() => document.removeEventListener('click', onDocClick, true))

/* 지역 정규화 */
function normRegion(raw=''){
  const v = String(raw).toLowerCase()
  if (!v) return 'non_gangnam'
  const hit = (...keys)=> keys.some(k=>v.includes(k))
  if (hit('강남','gangnam')) return 'gangnam'
  if (hit('인천','incheon')) return 'incheon'
  if (hit('경기','gyeonggi', '경기도','용인','수원','성남','고양','부천','안산','평택','안양','의정부','김포','광명','하남','군포','과천','광주(경기)','양주','구리','오산','시흥','파주','양평','남양주','동두천','포천','여주','이천','화성')) return 'gyeonggi'
  return 'non_gangnam'
}

/* ───────── 파트너 승인 여부: active + applyStatus/approved 기준 ───────── */
function isPartnerApproved(x = {}) {
  const active = x.active !== false           // active가 false면 무조건 숨김

  const approvedFlag = x.approved === true    // approved: true → 승인
  const apply = String(x.applyStatus || '').trim().toLowerCase()
  const applyApproved =
    ['approved', '승인', '승인완료'].includes(apply)

  // 🔹 승인 관련 필드가 하나도 없는 예전 데이터는 "기본 승인"으로 간주
  const hasExplicit = (
    typeof x.approved === 'boolean' ||
    typeof x.active === 'boolean' ||
    !!apply
  )
  if (!hasExplicit) return true

  // 🔹 active 이면서 (approved === true 또는 applyStatus가 승인 계열) 인 경우만 노출
  return active && (approvedFlag || applyApproved)
}

/* ───────── 내 주변 모달 연동(반경/거리계산/목록) ───────── */
const NEAR_KM = 10

function haversineKm(lat1, lng1, lat2, lng2){
  const R = 6371
  const toRad = (d)=> (d*Math.PI/180)
  const dLat = toRad(lat2-lat1)
  const dLng = toRad(lng2-lng1)
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)))
}

function toStoreItem(p, center){
  const lat = Number(p?.lat), lng = Number(p?.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const dist = haversineKm(center.lat, center.lng, lat, lng)
  return { id: p.id, name: p.name, lat, lng, dist }
}

function buildNearbyStores(center){
  // partners → 좌표 있는 항목만 골라 10km 이내만 거리순 정렬
  return partners.value
    .map(p => toStoreItem(p, center))
    .filter(Boolean)
    .filter(s => (s.dist ?? Infinity) <= NEAR_KM)
    .sort((a,b) => (a.dist ?? 0) - (b.dist ?? 0))
}

/* ---------- 배너: 공통 훅 사용(제휴관 'P') ---------- */
const { items: bannersP, ready: bannersReady } = useMarketingBanners('P')
const bannersToShow = computed(() => {
  const arr = Array.isArray(bannersP.value) ? bannersP.value : []
  const withImage = arr.filter(b => !!bannerImage(b))
  return withImage.slice(0, 1)
})
function onBannerClick(){ scrollToList() }

/* ---------- 파트너 데이터 ---------- */
const partners = ref([])

async function loadPartners(){
  try{
    const pSnap = await getDocs(query(collection(db, 'partners'), limit(200)))
    const base = []
    const missingIds = []

    pSnap.forEach(d => {
      const x = d.data() || {}

      // 🔹 승인되지 않은 제휴업체는 목록에서 제외
      if (!isPartnerApproved(x)) return

      const myLocal = getLocalRating(d.id)
      const thumbCand = pickThumb(x)

      if (!thumbCand) missingIds.push(d.id)

      base.push({
        id: d.id,
        name: x.name || '',
        // 🔹 담당자명(있는 경우) → 나중에 필요하면 검색에 사용
        manager: x.manager || x.managerName || '',

        region: x.region || '',
        address: x.address || '',          // ✅ 주소도 같이 보관(선택)

        category: normCat(x.category || x.categoryRaw || ''),
        categoryRaw: x.category || x.categoryRaw || '',

        rating: clamp0(x.rating ?? myLocal ?? 4.5),
        userRating: (myLocal ?? undefined),

        thumb: thumbCand || '',
        link: x.link || '',

        // ✅ 해시태그/키워드(대표서비스, 이벤트 키워드 등)
        tags: Array.isArray(x.tags) ? x.tags : [],

        // ✅ 소개 페이지 텍스트(desc 등이 여기로 들어옴)
        intro: (x.intro || x.desc || x.about || x.bio || '').toString().trim(),

        // ✅ 혜택/이벤트 문구
        benefits: x.benefits || '',

        favs: toPosInt(x.favs ?? x.likes ?? x.hearts ?? x.bookmarks ?? 0),

        // ✅ 지도용 좌표
        lat: Number(x.lat),
        lng: Number(x.lng),
      })
    }) // 🔹 forEach 닫기

    if (missingIds.length){
      const fills = await Promise.all(
        missingIds.map(async id => {
          try{
            const req = await getDoc(doc(db, 'partnerRequests', String(id)))
            if (req.exists()){
              const rx = req.data() || {}
              return [id, pickThumb(rx) || pickThumb(rx?.tags) || '']
            }
          }catch{}
          return [id, '']
        })
      )
      const fillMap = new Map(fills)
      for (const it of base){
        if (!it.thumb){
          const f = (fillMap.get(it.id) || '').trim()
          if (f) it.thumb = f
        }
      }
    }

    partners.value = await Promise.all(
      base.map(async p => ({ ...p, thumb: await resolveImg(p.thumb) }))
    )
  }catch(e){
    console.warn('partners load failed:', e)
  }
}

/* 초기 로드 */
onMounted(async ()=>{ await loadPartners() })
onMounted(() => onAuthStateChanged(auth, () => loadPartners()))

/* ---------- 상세 → 목록 반영 ---------- */
const flashId = ref(null)
let flashTimer = null
function onPartnerRating(ev){
  const { id, rating } = ev?.detail || {}
  const r = Number(rating)
  if (!id || !Number.isFinite(r)) return
  const idx = partners.value.findIndex(p => String(p.id) === String(id))
  if (idx >= 0){
    const next = { ...partners.value[idx], rating: r, userRating: r }
    partners.value.splice(idx, 1, next)
    setLocalRating(id, r)
    flashId.value = id
    if (flashTimer) clearTimeout(flashTimer)
    flashTimer = setTimeout(() => { flashId.value = null }, 900)
  }
}
function onFavoriteChanged(ev){
  const { type, id, wished } = ev?.detail || {}
  if (type !== 'partner' || !id) return
  const idx = partners.value.findIndex(p => String(p.id) === String(id))
  if (idx < 0) return
  const p = partners.value[idx]
  const nextFavs = Math.max(0, toPosInt(p.favs) + (wished ? 1 : -1))
  partners.value.splice(idx, 1, { ...p, favs: nextFavs })
}
function bindRatingEvents(add=true){
  const fn = add ? window.addEventListener : window.removeEventListener
  fn.call(window, 'partner-rating', onPartnerRating)
  fn.call(window, 'partner:rating', onPartnerRating)
  fn.call(window, 'favorite-changed', onFavoriteChanged)
}
onMounted(() => bindRatingEvents(true))
onUnmounted(() => {
  bindRatingEvents(false)
  if (flashTimer) clearTimeout(flashTimer)
})

/* ---------- 점수/정렬 ---------- */
const score = (p)=> Math.round((Number(p.rating||0))*100 + (p.tags?.length||0)*3)

/* 실시간 순위 */
const hotRanks10 = computed(() => {
  const base = partners.value.slice().sort((a,b)=> score(b)-score(a)).slice(0,10)
  return base.map(p => ({ id: p.id, name: p.name, intro: p.intro || (Array.isArray(p.tags) ? p.tags.join(' · ') : '') }))
})
const loopedRanks = computed(() => {
  const list = hotRanks10.value
  return list.length ? [...list, list[0]] : []
})
function displayRank(i){
  const n = hotRanks10.value.length
  if (!n) return ''
  return ((i % n) + 1).toString()
}

/* 티커 */
const tickerWinRef   = ref(null)
const tickerItemH    = ref(30)
const tickerIndex    = ref(0)
const useTransition  = ref(true)
const tickerMs       = 1400
function measureTickerItemH(){
  const win = tickerWinRef.value
  const li = win?.querySelector('.ticker-item')
  const h  = li?.offsetHeight || 30
  tickerItemH.value = Math.max(28, h)
}
const tickerStyle = computed(() => ({
  transform: `translate3d(0, -${tickerIndex.value * tickerItemH.value}px, 0)`,
  transition: useTransition.value ? 'transform 420ms ease-in' : 'none'
}))
let tickerTimer = null
function startTicker(){
  if (tickerTimer) clearInterval(tickerTimer)
  tickerTimer = setInterval(() => {
    const n = hotRanks10.value.length
    if (!n) return
    if (tickerIndex.value < n) { useTransition.value = true; tickerIndex.value += 1 }
    else { useTransition.value = false; tickerIndex.value = 0 }
  }, tickerMs)
}
onMounted(async () => {
  await nextTick(); measureTickerItemH(); startTicker(); window.addEventListener('resize', measureTickerItemH)
})
onUnmounted(() => {
  if (tickerTimer) clearInterval(tickerTimer)
  window.removeEventListener('resize', measureTickerItemH)
})

/* 바텀시트 */
const hotSheet = ref({ open:false })
function openHotSheet(){ if (hotRanks10.value.length) hotSheet.value.open = true }
function closeHotSheet(){ hotSheet.value.open = false }

/* 파트너 인덱스/이동 */
const partnerIndex = computed(()=> {
  const map = new Map()
  for (const p of partners.value) map.set(String(p.id), p)
  return map
})
function openPartnerFromHot(item){
  const id = item?.id
  if (id){
    const hit = partnerIndex.value.get(String(id))
    if (hit){ openPartner(hit); hotSheet.value.open = false; return }
  }
  if (item?.name) openHotDetail(item.name)
  hotSheet.value.open = false
}
function openHotDetail(name){
  const exact = partners.value.find(p => String(p.name||'').trim() === String(name).trim())
  if (exact) { openPartner(exact); return }
  const fuzzy = partners.value.find(p => String(p.name||'').toLowerCase().includes(String(name).toLowerCase()))
  if (fuzzy) { openPartner(fuzzy); return }
  q.value = name; doSearch()
}

/* ===================== 정렬/필터 ===================== */

// 검색용 문자열 전처리
function norm(s){ return String(s || '').toLowerCase().trim() }
function tokens(s){ return norm(s).split(/\s+/).filter(Boolean) }

/**
 * 검색 대상 텍스트 묶기
 *
 * 🔍 포함되는 것:
 *  - 업체명(name)
 *  - 담당자명(manager)
 *  - 소개 페이지 텍스트(intro = desc 등)
 *  - 혜택/이벤트 문구(benefits)
 *  - 해시태그/키워드(tags[])
 *  - (선택) 주소(address)까지
 */
function searchTextOf(p){
  const tags = Array.isArray(p?.tags) ? p.tags.join(' ') : ''

  return [
    p?.name,        // 업체명
    p?.manager,     // 담당자명
    p?.intro,       // 소개/소개 페이지 텍스트(desc)
    p?.benefits,    // 이벤트/혜택 문구
    tags,           // 태그/해시태그
    p?.address,     // 주소로 검색하고 싶을 때
  ]
    .map(norm)
    .filter(Boolean)
    .join(' ')
}

/**
 * 검색 매칭 여부
 * - 입력한 단어들(공백 분리)이 searchTextOf 안에 모두 포함되면 true
 */
function matchesQuery(p, query){
  const text = searchTextOf(p)
  if (!text) return false
  const qs = tokens(query)
  if (!qs.length) return true
  return qs.every(tok => text.includes(tok))
}

const view = ref(route.query.view || localStorage.getItem('partners:view') || 'list')
const isListView = computed(() => view.value === 'list')

function setView(v){
  const next = v === 'grid' ? 'grid' : 'list'
  view.value = next
  localStorage.setItem('partners:view', next)
}

function toggleView(){
  setView(isListView.value ? 'grid' : 'list')
}

function baseFiltered(){
  return partners.value.filter(p=>{
    const okCat    = (cat.value === 'all') || (p.category === cat.value)

    // 🔍 검색어가 있을 때:
    //  - 업체명(name)
    //  - 담당자명(manager)
    //  - 소개/본문(intro)
    //  - 태그(시술명/시술부위/이벤트 텍스트)
    //   를 모두 합친 searchTextOf 기준으로 매칭
    const okQ      = !q.value || matchesQuery(p, q.value)

    const okRegion = (region.value === 'all') || (normRegion(p.region) === region.value)
    return okCat && okQ && okRegion
  })
}

/* ===== 파트너 노출 순서 저장/적용 ===== */
const PARTNER_ORDER_FIELD = 'partnerOrder'
const partnerOrder = ref([])
let unsubOrder = null
function subPartnerOrder(){
  try{
    unsubOrder = onSnapshot(doc(db, 'config', 'marketing'), (snap)=>{
      const data = snap.exists() ? (snap.data() || {}) : {}
      partnerOrder.value = Array.isArray(data[PARTNER_ORDER_FIELD])
        ? data[PARTNER_ORDER_FIELD].map(String)
        : []
    })
  }catch(e){ console.warn('subPartnerOrder error:', e) }
}
onMounted(subPartnerOrder)
onUnmounted(()=>{ if (typeof unsubOrder==='function') unsubOrder() })

/* 최종 filtered: partnerOrder 우선 정렬 */
const filtered = computed(()=>{
  const base = baseFiltered()
  if (!partnerOrder.value.length) return base
  const pos = new Map(partnerOrder.value.map((id,idx)=>[String(id), idx]))
  return base.slice().sort((a,b)=>{
    const ai = pos.has(String(a.id)) ? pos.get(String(a.id)) : Infinity
    const bi = pos.has(String(b.id)) ? pos.get(String(b.id)) : Infinity
    if (ai !== bi) return ai - bi
    return 0
  })
})

/* ===== 운영자 권한 ===== */
const isAdmin = ref(false)
let _adminUnsub = null
function watchAdmin(u){
  if (_adminUnsub) { _adminUnsub(); _adminUnsub = null }
  if (!u?.uid) { isAdmin.value = false; return }
  _adminUnsub = onSnapshot(
    doc(db, 'admins', String(u.uid)),
    s => { isAdmin.value = s.exists() },
    () => { isAdmin.value = false }
  )
}
onMounted(() => {
  watchAdmin(auth.currentUser)
  onAuthStateChanged(auth, watchAdmin)
})
onUnmounted(() => { if (_adminUnsub) _adminUnsub() })
const canEdit = isAdmin

/* ───────────────────────── 기업회원 여부(제휴관용 관리자 계정) ─────────────────────────
 * - type === 'company' 이면서
 * - accountKind === 'partnerOwner' 인 계정만 제휴관 업체등록/광고 버튼 노출
 * - 가게찾기 사장님(storeOwner)은 여기서는 false 처리
 */
const isEnterprise = ref(false)

async function resolveEnterprise(u){
  if (!u) {
    isEnterprise.value = false
    return
  }
  try {
    const snap = await getDoc(doc(db, 'users', u.uid))
    if (!snap.exists()) {
      isEnterprise.value = false
      return
    }

    const data = snap.data() || {}
    const type = String(data.type || data.profile?.type || '').toLowerCase()
    const kind = String(data.accountKind || '').toLowerCase()

    // 🔹 제휴관 담당자 = company + partnerOwner
    isEnterprise.value = (type === 'company' && kind === 'partnerowner')
  } catch (e) {
    console.warn('[Partners] resolveEnterprise failed:', e)
    isEnterprise.value = false
  }
}

onMounted(() => {
  resolveEnterprise(auth.currentUser)
  onAuthStateChanged(auth, resolveEnterprise)
})

/* ───────────────────────── 등록/광고 패널(플로팅) ───────────────────────── */
// 제휴관은 기본 모드가 'partner'
const bizPanel = ref({ open:false, kind:'partner', style:{ top:'0px', left:'0px', right:'0px' }, anchor:null })

function positionBizPanel(anchorEl){
  const r = anchorEl?.getBoundingClientRect?.()
  if (!r) {
    bizPanel.value.style = { position:'fixed', left:'8px', right:'8px', top:'70px', zIndex:100000 }
    return
  }
  bizPanel.value.style = {
    position:'fixed',
    top:  `${r.bottom + 8}px`,
    left: `8px`,
    right:`8px`,
    zIndex: 100000
  }
}

async function openBiz(kind, evt){
  const anchor = evt?.currentTarget || evt?.target
  bizPanel.value = { ...bizPanel.value, open:true, kind, anchor }
  positionBizPanel(anchor)
  await nextTick()
  // BizManagerTabs 폼 열기
  window.dispatchEvent(new CustomEvent('open-biz-create', { detail:{ kind } }))
  // 위치 업데이트
  window.addEventListener('scroll', onReposition, true)
  window.addEventListener('resize', onReposition)
}
function onReposition(){ positionBizPanel(bizPanel.value.anchor) }
function closeBiz(){
  bizPanel.value.open = false
  window.removeEventListener('scroll', onReposition, true)
  window.removeEventListener('resize', onReposition)
}

// 제휴관 업체등록 버튼 → (관리자회원 전용) 신규 등록 페이지로
async function toggleBizCreate(evt){
  // 관리자회원(제휴관 담당자)이 아닌 경우 로그인/회원가입으로 보냄
  if (!auth.currentUser) {
    alert('관리자회원(제휴관 담당자)으로 로그인 후 이용해 주세요.')
    router.push({
      name: 'auth',
      query: {
        next: route.fullPath || '/partners',
        mode: 'login',
        who: 'admin',   // 🔹 관리자회원 탭으로 이동
      },
    })
    return
  }

  // (현재 구조 유지) 제휴관에서도 동일하게 새 업체 등록 폼으로 이동
  router.push({
    name: 'storeEdit',
    params: { id: 'new' },          // 새 업체 등록용 id
    query:  { from: route.name || 'partners' },
  }).catch(()=>{})
}

async function toggleAdCreate(evt){
  if (!bizPanel.value.open || bizPanel.value.kind !== 'ad') await openBiz('ad', evt)
  else closeBiz()
}

/* 패널의 제목/버튼 라벨(요청사항 반영) */
const panelTitle = computed(() => bizPanel.value.kind === 'ad' ? '광고신청' : '업체등록')
const panelButtonLabel = computed(() => bizPanel.value.kind === 'ad' ? '새 광고 추가' : '새 매장 추가')

/* ===== 운영자 편집 ===== */
const EDITABLE_LIMIT = 50
const editMode      = ref(false)
const savingOrders  = ref(false)
const dragState     = ref({ from:-1 })
function onEnterEdit(){
  if (!editMode.value) return
  if (!partnerOrder.value.length){
    const seed = baseFiltered().slice(0, EDITABLE_LIMIT).map(s=>String(s.id))
    partnerOrder.value = seed
  }else{
    const seen = new Set(partnerOrder.value)
    for (const s of baseFiltered().slice(0, EDITABLE_LIMIT)){
      const id = String(s.id)
      if (!seen.has(id)){ partnerOrder.value.push(id); seen.add(id) }
    }
  }
}
const editableList = computed(()=> filtered.value.slice(0, EDITABLE_LIMIT))
function onListDragStart(i, e){
  if (!editMode.value) return
  dragState.value.from = i
  try{ e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'drag') }catch{}
}
function onListDragOver(i, e){
  if (!editMode.value) return
  e.preventDefault()
  const from = dragState.value.from
  if (from === i || from < 0) return
  const visibleIds = editableList.value.map(s=>String(s.id))
  const arr    = partnerOrder.value.filter(id => visibleIds.includes(String(id)))
  const others = partnerOrder.value.filter(id => !visibleIds.includes(String(id)))
  if (from < 0 || from >= arr.length || i < 0 || i >= arr.length) return
  const [moved] = arr.splice(from, 1)
  arr.splice(i, 0, moved)
  partnerOrder.value = [...arr, ...others]
  dragState.value.from = i
}
function onListDrop(){}
function onListDragEnd(){ dragState.value.from = -1 }

/* 저장 */
async function saveOrders(){
  if (!canEdit.value) return
  try{
    savingOrders.value = true
    await setDoc(doc(db, 'config', 'marketing'), {
      [PARTNER_ORDER_FIELD]: partnerOrder.value.map(String),
      partnerOrderSavedAt: serverTimestamp()
    }, { merge: true })
    alert('저장되었습니다.')
    editMode.value = false
  }catch(e){
    console.warn('saveOrders error:', e)
    alert('저장 중 오류가 발생했습니다.')
  }finally{
    savingOrders.value = false
  }
}

/* ---------- 이동/스타일 ---------- */
const openPartner = (p)=> router.push({ name:'partnerDetail', params:{ id:p.id } })
const thumbStyle  = (src)=> src ? ({ backgroundImage:`url(${src})` }) : ({})

/* ---------- 태그 좌표 스타일 ---------- */
function clamp01(v){ return Math.max(0, Math.min(1, Number(v)||0)) }
function ensureTagPos(b){
  const n = Array.isArray(b.tags) ? b.tags.length : 0
  if (!Array.isArray(b.tagPos)) b.tagPos = []
  while (b.tagPos.length < n){
    const i = b.tagPos.length
    b.tagPos.push({ x: clamp01(0.12 + i*0.08), y: clamp01(0.18 + i*0.08) })
  }
  if (b.tagPos.length > n) b.tagPos.splice(n)
}
function tagPosStyle(b, idx){
  ensureTagPos(b)
  const p = b.tagPos?.[idx] || { x:.12, y:.18 }
  return { left: `${clamp01(p.x) * 100}%`, top:  `${clamp01(p.y) * 100}%`, transform:'translate(-50%, -50%)' }
}

/* ---------- 카테고리 인기(지역 필터 적용) ---------- */
const topByCat = (k) => (
  partners.value
    .filter(p => p.category === k)
    .filter(p => (region.value==='all') || (normRegion(p.region)===region.value))
    .slice()
    .sort((a,b) => score(b) - score(a))
    .slice(0, 5)
)

/* ---------- 카드 표시 유틸 ---------- */
const ratingTextP = (p)=> Number(p?.rating || 0).toFixed(1)
function isPriceLike(text=''){
  const s = String(text)
  return /[\d,]/.test(s) || /(원|만원|%|할인|dc|DC)/i.test(s)
}
const primaryLine = (p)=>{
  if (p?.intro) return p.intro
  if (!Array.isArray(p?.tags)) return ''
  const t = p.tags.find(t => !isPriceLike(t))
  return t || ''
}
const priceTags = (p)=>{
  if (!Array.isArray(p?.tags)) return []
  return p.tags.filter(t => isPriceLike(t))
}
const priceTagsJoined = (p)=> {
  const list = priceTags(p)
  return list.length ? list.slice(0, 4).join(' · ') : ''
}

/* 새로고침 */
function refresh(){ loadPartners() }
</script>

<style scoped>
/* 전체 패딩/간격 */
.page{ padding:8px 12px 92px }

/* 상단 */
.top{ display:flex; flex-direction:column; gap:8px; margin-bottom:10px }

/* =============================
   HOT Ticker (상단: 세로 1줄)
============================= */
:root{ --ticker-item-h:28px; }
.nowrap{ white-space:nowrap; }
.hot-box{
  display:flex; align-items:center; height:32px;
  border:1px solid var(--line); border-radius:14px;
  background:var(--surface); color:var(--fg); padding:0 10px;
  box-shadow:0 4px 10px var(--shadow);
  overflow:hidden; cursor:pointer; user-select:none;
}
.hot-box .hot-label{ font-weight:900; font-size:12px; white-space:nowrap; }
.hot-box .hot-sep{ margin:0 6px; opacity:.6; font-weight:900; }
.hot-box .hot-ticker{ flex:1 1 auto; min-width:0; display:flex; align-items:center; }

.ticker-window{ position:relative; height:var(--ticker-item-h); overflow:hidden; flex:1 1 auto; min-width:0; }
.ticker-list{
  margin:0; padding:0; list-style:none;
  will-change: transform;
}
.ticker-item{
  height:var(--ticker-item-h);
  line-height: var(--ticker-item-h);
  display:flex; align-items:center; gap:6px;
  white-space:nowrap; width:100%; max-width:100%; min-width:0;
  padding:0;
}
.ticker-item .name{ font-weight:900; font-size:12px; flex:0 0 auto; min-width:auto; }
.ticker-item .dot{ opacity:.55; font-weight:900; }
.ticker-item .intro{
  font-size:12px; flex:1 1 auto; min-width:0;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.ellip1{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

/* 배너 */
.banners{
  display:flex;
  flex-direction:column;
  gap:10px;
  margin:4px 0 12px;
}

/* 배너 한 장 */
.banner{
  position:relative;
  overflow:hidden;
  display:block;
  padding:0;
  background:transparent;
  box-shadow:none;
  border-radius:0;
  aspect-ratio:auto;
  min-height:0;
}
.banner-img{
  display:block;
  width:100%;
  height:auto;
  object-fit:contain;
}

/* 🔸 배너 등록 버튼 영역: 실시간 순위 아래, 배너 위 */
.banner-cta{
  margin:4px 0 4px;             /* 가게찾기와 동일 마진 */
  display:flex;
  justify-content:flex-start;
}

/* 배너 등록 버튼 공통 스타일 (가게찾기와 동일) */
.ad-btn{
  font-weight:900;
  font-size:12px;
  padding:8px 14px;
  border-radius:999px;
  border:1px solid var(--line);
  background:#fff;
  color:#111;
  box-shadow:0 4px 10px var(--shadow);
}

/* 태그 절대 위치 */
.tag-abs{
  position:absolute;
  background:#fff;
  border:1px solid rgba(0,0,0,.06);
  border-radius:999px;
  padding:4px 8px;
  font-weight:800;
  font-size:11px;
  box-shadow:0 2px 8px rgba(0,0,0,.18);
  backdrop-filter: blur(2px);
  z-index:2;
}

/* 카테고리 */
.cats{ margin:6px 0 6px }
.sec-ttl{ margin:0 0 6px; font-size:14px; color:var(--fg) }
.cat-grid{ display:grid; grid-template-columns:repeat(5, minmax(0,1fr)); gap:6px }
.cat{
  height:56px;
  border:1px solid var(--line);
  border-radius:12px;
  background:var(--surface);
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:4px;
  transition:transform .08s ease;
  color:var(--fg);
  position:relative;
}
.cat:active{ transform:scale(.985) }
.cat.active{ outline:2px solid var(--accent) }

/* 기존 .ico 는 지역 선택(📍)에서만 사용 */
.ico{ font-size:16px; line-height:1 }

/* 라벨 텍스트 */
.lbl{
  font-weight:800;
  font-size:11px;
}

/* 지역 트리거의 화살표 위치 */
.region-cat .chev{
  position:absolute; right:6px; top:6px; font-size:12px; line-height:1;
}

/* ===================== 카테고리 PNG 아이콘 ===================== */
.cat-icon{
  width:36px;          /* 아이콘 박스 살짝 키우기 */
  height:36px;
  background-repeat:no-repeat;
  background-position:center;
  /* 박스 기준 80% 정도를 채우도록 → 원본 크기가 달라도 균일하게 보임 */
  background-size:80% auto;
}

/* 🔽 파일 이름은 예시야. 실제 만든 파일명에 맞게 수정하면 됨 */
/* 성형(ps) */
.cat-icon[data-type="ps"]{
  background-image:url('/img/partners/cat-ps.png');
  background-size:35px auto;  /* 기존 22px보다 크게 */
}

/* 피부(skin) */
.cat-icon[data-type="skin"]{
  background-image:url('/img/partners/cat-skin.png');
  background-size:50px auto;
}

/* 미용(beauty) */
.cat-icon[data-type="beauty"]{
  background-image:url('/img/partners/cat-beauty.png');
}

/* 네일(nail) */
.cat-icon[data-type="nail"]{
  background-image:url('/img/partners/cat-nail.png');
}

/* 부동산(real) */
.cat-icon[data-type="real"]{
  background-image:url('/img/partners/cat-real.png');
}

/* 피트니스(fit) */
.cat-icon[data-type="fit"]{
  background-image:url('/img/partners/cat-fit.png');
  background-size:40px auto;
}

/* 공동구매(deal) */
.cat-icon[data-type="deal"]{
  background-image:url('/img/partners/cat-deal.png');
  background-size:50px auto;
}

/* 상품관(shop) */
.cat-icon[data-type="shop"]{
  background-image:url('/img/partners/cat-shop.png');
}

/* 기타(etc) */
.cat-icon[data-type="etc"]{
  background-image:url('/img/partners/cat-etc.png');
}

/* 다크/블랙 테마에서 선 색만 밝게 */
:root[data-theme="dark"] .cat-icon,
:root[data-theme="black"] .cat-icon{
  border-color:#ddd;
  color:#ddd;
}

/* 드롭다운 팝업 */
.region-pop{
  position:absolute;
  z-index:50;
  transform: translateY(58px);
  width: calc((100% - 24px) / 5);
  max-width: 100%;
  border:1px solid var(--line);
  background:#fff; color:#111;
  border-radius:12px;
  box-shadow:0 8px 24px rgba(0,0,0,.15);
  padding:6px 0;
}
.region-opt{
  padding:10px 12px;
  font-weight:800;
  font-size:13px;
  cursor:pointer;
  white-space:nowrap;
}
.region-opt:hover{ background:#f7f7f9; }
.region-opt.active{ color:var(--accent); }

/* 목록 헤드(현황판) */
.list-head{ display:flex; justify-content:space-between; align-items:center; margin:6px 0 6px; color:var(--fg) }
.count{ font-size:13px; font-weight:900 }
.view-tools{ display:flex; gap:6px }
.tool{
  width:32px; height:32px; border-radius:999px; border:1px solid var(--line); background:#fff;
  color:#111; display:inline-flex; align-items:center; justify-content:center; box-shadow:0 4px 10px var(--shadow);
}
/* 툴바 아이콘(가게찾기페이지와 통일): 20×20 */
.tool svg{ width:20px; height:20px; display:block; }

.tool.on{ outline:2px solid var(--accent) }

/* 편집 리스트(드래그) */
.reorder-sec{ margin:6px 0 10px; padding:8px; border:1px dashed var(--line); border-radius:12px; background:color-mix(in oklab, var(--surface), white 10%); }
.reorder-list{ list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:6px; max-height:260px; overflow:auto; }
.re-item{
  display:grid; grid-template-columns:24px 24px 1fr auto; align-items:center;
  gap:8px; padding:8px 10px; background:var(--surface); border:1px solid var(--line); border-radius:10px; cursor:grab;
}
.re-item:active{ cursor:grabbing; }
.re-handle{ text-align:center; font-size:16px; }
.re-rank{ width:24px; height:24px; border-radius:999px; display:inline-grid; place-items:center; font-size:12px; font-weight:900; color:#fff; background:var(--accent); }
.re-name{ font-weight:900; }
.re-sub{ color:var(--muted); font-size:12px; margin-left:6px; }
.re-hint{ margin-top:6px; font-size:11px; color:var(--muted); }

/* 리스트 카드 */
.list{ display:flex; flex-direction:column; gap:8px }

/* 배너형 카드: 좌 140px, 우 텍스트 4행 고정 */
.list-card{
  display:grid;
  grid-template-columns:140px 1fr;
  gap:10px;
  border:1px solid var(--line);
  border-radius:12px;
  background:var(--surface);
  padding:8px;
  box-shadow:0 6px 14px var(--shadow);
  color:var(--fg);
}
.lc-thumb{
  width:100%;
  aspect-ratio: 12 / 5;
  border-radius:10px;
  background-position:center;
  background-repeat:no-repeat;
  background-size:cover;
  background-color:#f2f2f4;
}
.lc-thumb.noimg{ background-image:none }
.lc-body{
  position:relative; min-width:0;
  display:grid; grid-template-rows:18px 16px 16px 16px; row-gap:2px;
}
.lc-top{ font-size:13px; line-height:18px; font-weight:800; min-width:0; }
.lc-top .sep{ margin:0 4px; opacity:.7 }
.lc-title{ font-size:12.5px; line-height:16px; }
.lc-meta{ font-size:12px; line-height:16px; color:var(--muted); display:flex; align-items:center; gap:4px; }
@keyframes rateFlash{ 0%{ color:var(--accent); text-shadow:0 0 0 rgba(0,0,0,0) } 40%{ color:var(--accent); text-shadow:0 0 8px rgba(0,0,0,.15) } 100%{ color:var(--muted); text-shadow:0 0 0 rgba(0,0,0,0) } }
.lc-meta.flash{ animation:rateFlash .9s ease-out 1; }
.lc-price{
  position:absolute; right:0; bottom:0;
  font-size:13px; line-height:16px; font-weight:900; color:#ff2f7a;
}

/* 공통 말줄임 */
.ellip{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap }

/* 그리드 */
.grid{ display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:8px }
.grid-card{ border:1px solid var(--line); border-radius:12px; background:var(--surface); overflow:hidden; box-shadow:0 6px 14px var(--shadow); color:var(--fg) }
.thumb{
  width:100%;
  padding-top:41.6667%;
  background-size:cover;
  background-position:center;
  background-repeat:no-repeat;
  background-color:#f2f2f4;
}
.thumb.noimg{ background-image:none }
.g-name{ padding:6px 8px 0; font-weight:800; color:var(--fg); font-size:13px }
.g-sub{ padding:0 8px 6px; color:var(--muted); font-size:12px }
.g-tags{ padding:0 8px 10px; display:flex; gap:6px; flex-wrap:wrap }
.tag{ border:1px solid var(--line); border-radius:999px; padding:3px 7px; font-size:11px; color:var(--fg); background:transparent }

/* 인기 섹션 (배너 카드형) */
.rank-sections{ margin-top:12px }
.rank-sec{ margin:10px 0 14px }
.rs-head{
  display:flex; align-items:center; gap:6px; margin-bottom:8px;
  color:var(--fg); font-size:13px; font-weight:900;
}
.rs-scroller{
  display:flex; gap:10px; overflow:auto; padding:2px 2px 4px 0;
  scroll-snap-type:x mandatory;
  --cards-per-view: 2.5; --gap: 10px;
}
.rs-scroller::-webkit-scrollbar{ height:6px }
.rs-scroller::-webkit-scrollbar-thumb{ background:rgba(0,0,0,.15); border-radius:6px }
.rs-card{
  flex:0 0 auto;
  width: calc( (100% - (var(--gap) * (var(--cards-per-view) - 1))) / var(--cards-per-view) );
  min-width: 220px;
  border:1px solid var(--line);
  border-radius:14px;
  background:var(--surface);
  box-shadow:0 6px 14px var(--shadow);
  color:var(--fg);
  overflow:hidden;
  scroll-snap-align:start;
  cursor:pointer;
  transition:transform .06s ease;
}
.rs-card:active{ transform: translateY(1px) }
.rs-thumb{
  width:100%; height: 120px;
  background-size: contain; background-position: center; background-repeat: no-repeat; background-color:#f2f2f4;
  position:relative;
}
.rs-thumb.noimg{ background-image:none }
.rs-badge{
  position:absolute; left:10px; top:10px;
  width:24px; height:24px; border-radius:999px; display:grid; place-items:center;
  background: var(--accent); color:#fff; font-weight:900; font-size:12px;
  box-shadow: 0 2px 8px rgba(0,0,0,.18);
}
.rs-info{ padding:8px 10px 10px; display:flex; flex-direction:column; gap:4px }
.rs-title{ font-weight:900; font-size:14px }
.rs-sub{ font-size:12px; color:var(--muted) }
.rs-intro{ font-size:13px }
.rs-price{ font-size:13px; font-weight:900; color:#ff2f7a; }

/* =============================
   ✔ 바텀시트 (Top10)
============================= */
.action-mask{
  position:fixed; inset:0; background:rgba(0,0,0,.35);
  display:grid; place-items:end center; z-index:9999;
  padding-bottom: max(10px, env(safe-area-inset-bottom));
  padding-left:  max(8px,  env(safe-area-inset-left));
  padding-right: max(8px,  env(safe-area-inset-right));
}
.action-sheet{
  width:100%; max-width:680px; margin:0 auto; box-sizing:border-box;
  max-height: calc(100dvh - 16px - env(safe-area-inset-bottom));
  display:flex; flex-direction:column;
  background:#fff; color:#111;
  border-top-left-radius:18px; border-top-right-radius:18px;
  box-shadow:0 -10px 30px rgba(0,0,0,.25);
  padding:12px 14px 14px;
  animation:slideUp .16s ease-out;
  overscroll-behavior:contain;
}
@supports not (height: 100dvh){
  .action-sheet{ max-height: calc(100vh - 16px - env(safe-area-inset-bottom)); }
}
@keyframes slideUp{ from{ transform:translateY(16px); opacity:.7 } to{ transform:none; opacity:1 } }
.as-header{ display:flex; justify-content:space-between; align-items:center; padding:4px 2px 10px; border-bottom:1px solid var(--line) }
.as-close{ width:32px; height:32px; border-radius:999px; border:1px solid var(--line); background:#fff; color:#111 }
.as-body{ flex: 1 1 auto; min-height:0; overflow:auto; -webkit-overflow-scrolling: touch; padding:12px 2px 12px; }

/* Top10 리스트(반응형) */
.hot10-list{ list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:6px;
  --h-pad-x:  clamp(10px, 3.5vw, 14px);
  --h-pad-y:  clamp(8px,  2.2vw, 10px);
  --gap:      clamp(4px,  1.6vw, 8px);
  --badge:    clamp(22px, 4.6vw, 26px);
  --fs-name:  clamp(12px, 3.2vw, 14px);
  --fs-intro: clamp(12px, 3.0vw, 13px);
}
/* ───────── HOT 티커용 순위 배지 ───────── */
.badge-rank{
  flex: 0 0 20px; width: 20px; height: 20px; min-width: 20px; min-height: 20px; aspect-ratio: 1 / 1;
  display: inline-flex; align-items: center; justify-content: center; border-radius: 999px;
  background: var(--accent); color: #fff; font-size: 12px; font-weight: 900; line-height: 1;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Noto Sans Mono", "Roboto Mono", "JetBrains Mono", "Courier New", monospace;
  font-variant-numeric: tabular-nums lining-nums; font-feature-settings: "tnum" 1, "lnum" 1;
  margin-right: 2px; contain: layout paint;
}
.ticker-item .name{ margin-left: 2px; }
.hot10-item{ width:100%; box-sizing:border-box; display:grid; grid-template-columns: var(--badge) minmax(0,34%) auto 1fr; align-items:center; column-gap:var(--gap); padding:var(--h-pad-y) var(--h-pad-x); border-radius:12px; border:1px solid var(--line); background:#fff; color:#111; font-weight:800; overflow:hidden; min-width:0; }
.h-rank{ flex: 0 0 20px; width: 20px; height: 20px; min-width: 20px; min-height: 20px; aspect-ratio: 1 / 1; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; background: var(--accent); color: #fff; font-size: 12px; font-weight: 900; line-height: 1; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Noto Sans Mono", "Roboto Mono", "JetBrains Mono","Courier New", monospace; font-variant-numeric: tabular-nums lining-nums; font-feature-settings: "tnum" 1, "lnum" 1; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; contain: layout paint; }
.h-name{ font-weight:900; font-size:var(--fs-name); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.h-dot{ opacity:.6; font-weight:900; line-height:1; padding:0 .15em; white-space:nowrap; }
.h-intro{ color:#666; font-weight:700; font-size:var(--fs-intro); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

/* 검색창 폰트 통일 */
.top :deep(input[type="search"]),
.top :deep(input[type="text"]),
.top :deep(input) { font-size: 16px !important; font-weight: 300 !important; }
.top :deep(input::placeholder) { font-size: 16px !important; font-weight: 300 !important; opacity: .65 !important; }

/* 운영자 툴바 */
.orders-head{ margin:6px 0; }
.rank-tools{ display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:nowrap; }
.rank-tools .toggle{ display:flex; align-items:center; gap:8px; white-space:nowrap; }
.rank-tools .toggle input[type="checkbox"]{
  appearance:none; -webkit-appearance:none; -moz-appearance:none;
  width:18px; height:18px; transform: scale(1.3); transform-origin:center;
  background:#fff; border:2px solid #111; border-radius:4px; position:relative;
}
.rank-tools .toggle input[type="checkbox"]:checked::after{
  content:""; position:absolute; left:3px; top:0px; width:8px; height:12px;
  border-right:3px solid var(--accent); border-bottom:3px solid var(--accent);
  transform: rotate(45deg);
}
.rank-tools .toggle .toggle-label{ font-size:15px; font-weight:900; }
.tools-right{ display:flex; gap:8px; flex:0 0 auto; }
.icon-btn{
  width:32px; height:32px; border-radius:999px; border:1px solid var(--line);
  background:#fff; color:#111; display:grid; place-items:center;
  box-shadow:0 4px 10px var(--shadow);
}
.orders-head .save-btn{
  min-width:80px; height:32px; padding:0 12px; font-weight:900;
  color:#111 !important; -webkit-text-fill-color:#111 !important;
  background:#FFE6EF !important; border:1px solid #FFC7D8 !important; box-shadow:0 4px 10px var(--shadow);
}
.orders-head .save-btn:hover:not(:disabled){ background:#FFD6E6 !important; }
.orders-head .save-btn:active:not(:disabled){ background:#FFC7D8 !important; }
.orders-head .save-btn:disabled{
  background:#F5E9ED !important; border-color:#E8D3DB !important;
  color:#666 !important; -webkit-text-fill-color:#666 !important;
}

/* ========= 등록/광고 플로팅 패널 ========= */
.biz-fly{
  position: fixed; /* JS에서 top/left/right 주입 */
  background: var(--bg, #fff);
  color: var(--fg, #111);
  border: 1px solid var(--line);
  border-radius: 16px;
  box-shadow: 0 18px 44px rgba(0,0,0,.25);
  max-width: 720px;
  margin: 0 auto;
  max-height: min(76dvh, 560px);
  overflow: auto;
  animation: flyIn .14s ease-out;
  z-index: 100000;
}
@supports not (height: 100dvh){
  .biz-fly{ max-height: min(76vh, 560px); }
}
@keyframes flyIn{ from{ transform: translateY(8px); opacity:.85 } to{ transform:none; opacity:1 } }

.biz-header{
  display:flex; align-items:center; justify-content:space-between;
  padding: 10px 12px; border-bottom: 1px solid var(--line);
}
.biz-header strong{ font-size: 15px; font-weight: 900; }
.biz-close{
  width: 32px; height: 32px; border-radius: 999px;
  border: 1px solid var(--line); background: #fff; color: #111;
}

/* ───────── 공용 Pill 버튼(광고/등록 공용) ───────── */
.pill-btn{
  padding:8px 14px;
  border-radius:999px;
  border:1px solid var(--line);
  background:#fff;
  color:#111;
  font-weight:900;
  font-size:12px;
  box-shadow:0 4px 10px var(--shadow);
}

/* 카테고리 아래 ‘업체등록’ 섹션 레이아웃 */
.partner-cta{
  margin:6px 0 12px;
  display:flex;
}
.partner-cta .reg-btn{
  /* 위치 고정 없음: pill-btn의 룩만 활용 */
}
/* 아이콘 컨테이너: StoreFinder와 동일 사이즈(18px)로 고정 */
.ico-svg :where(svg){
  width:18px; height:18px; display:block;
}
/* ============================
   공통 CTA 버튼(연핑크)
   - 배너 등록 / Top5 등록 / 일반등록
============================ */
.pink-cta{
  background:#FFE6EF;          /* 연핑크 배경 */
  border-color:#FFC7D8;        /* 핑크 테두리 */
  color:#8A2241;               /* 진한 핑크 글자 */
  font-weight:800;
}

.pink-cta:active{
  transform:translateY(1px);
  box-shadow:0 2px 6px rgba(0,0,0,.18);
}

/* 배너 등록 버튼 앞쪽 화살표 3개 */
.arrow-3{
  margin-right:4px;
  font-size:11px;
  letter-spacing:1px;
}

/* Top5 제목 오른쪽에 붙는 Top5 등록 버튼 */
.top5-btn{
  margin-left:auto;            /* 오른쪽 정렬 */
  height:26px;
  padding:0 10px;
  border-radius:999px;
  font-size:12px;
}

/* “총 N개” 옆 일반등록 버튼 정렬용 래퍼 */
.count-row{
  display:flex;
  align-items:center;
  gap:6px;
}

/* 목록 헤드의 일반등록 버튼 */
.list-reg-btn{
  height:30px;
  padding:0 10px;
  border-radius:999px;
  font-size:12px;
}

</style>
