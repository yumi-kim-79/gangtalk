<!-- views/StoreFinder.vue -->
<template>
  <main class="page">
    <!-- =================== 검색 + 실시간순위(티커) =================== -->
    <section class="search-wrap search-lock">
      <SearchBar
        v-model="q"
        :placeholder="searchPlaceholder"
        @submit="doSearch"
      />

      <!-- 실시간 순위 (상단 티커: 1줄씩 세로 스크롤) -->
      <div
        class="hot-box"
        v-if="hotRanks10.length"
        role="button"
        tabindex="0"
        @click="openHotSheet"
        @keydown.enter.prevent="openHotSheet"
        @keydown.space.prevent="openHotSheet"
      >
        <div class="hot-ticker nowrap">
          <span class="hot-label">실시간순위</span>
          <span class="hot-sep">:</span>

          <div class="ticker-window" aria-label="실시간 순위">
            <ul class="ticker-list" :style="tickerStyle">
              <li
                v-for="(s, i) in loopedRanks"
                :key="`hr_${i}_${s.id || s.name}`"
                class="ticker-item"
                @click.stop="openHotSheet"
              >
                <span class="badge-rank" :data-rank="displayRank(i)">{{ displayRank(i) }}</span>
                <!-- 요청: 업체명은 줄임표 금지, 전체 노출 -->
                <span class="name">{{ s.name }}</span>
                <span class="dot">·</span>
                <!-- 내용만 줄임표 -->
                <span class="intro ellip1">{{ s.intro }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- ✅ 배너 등록 버튼: 티커 아래, 배너 위 -->
    <section v-if="isEnterprise" class="banner-cta">
      <button
        class="ad-btn pink-cta"
        type="button"
        @click.stop="toggleAdCreate($event)"
      >
        <!-- 배너 등록일 때만 화살표 3개 + 텍스트 -->
        <template v-if="!bizPanel.open || bizPanel.kind!=='ad'">
          <span class="arrow-3">▼▼▼</span>
          <span>배너 등록</span>
        </template>

        <!-- 패널이 열려 있을 때는 닫기 -->
        <span v-else>닫기</span>
      </button>
    </section>

    <!-- =================== 배너(실사) =================== -->
    <section class="banners" v-if="oneBanner.length">
      <article
        v-for="b in oneBanner"
        :key="b.id || b._key || b.title"
        class="banner"
        @click="onBannerClick"
      >
        <!-- img → images[_imgIndex] → images[0] 순서로 안전하게 표시 -->
        <img
          v-if="bannerImage(b)"
          class="banner-img"
          :src="bannerImage(b)"
          alt=""
        />
        <div class="banner-left" v-if="b.title || b.desc">
          <h3 v-if="b.title">{{ b.title }}</h3>
          <p v-if="b.desc" class="muted">{{ b.desc }}</p>
        </div>
        <span
          v-for="(t, tIdx) in (b.tags || [])"
          :key="t + '_' + tIdx"
          class="chip pill tag-abs"
          :style="tagPosStyle(b, tIdx)"
        >
          {{ t }}
        </span>
      </article>
    </section>

    <!-- =================== 카테고리/필터 =================== -->
    <section class="cats">
      <div class="tops-head"><div></div><div></div></div>

      <!-- 카테고리 그리드 (전체 타일 = 지역 드롭다운 트리거) -->
      <div class="cat-grid">
        <button
          v-for="c in categories"
          :key="c.key"
          class="cat"
          :class="{ active: type===c.key }"
          type="button"
          @click="c.key==='all' ? openRegionMenuFromCat($event) : setType(c.key)"
          :ref="el => setCatRef(el)"
          :data-key="c.key"
        >
          <!-- 요청: '전체'의 아이콘/텍스트 제거, 현재 지역만 표시 -->
          <template v-if="c.key!=='all'">
            <div class="ico">
              <span class="badge" v-if="c.badge">{{ c.badge }}</span>
              <span v-else>{{ c.emoji }}</span>
            </div>
            <div class="lbl">{{ c.label }}</div>
          </template>
          <template v-else>
            <div class="lbl">
              <span class="lbl-region">{{ regionLabel(selectedRegion) }}</span> 🔽
            </div>
          </template>
        </button>
      </div>

      <!-- 지역 드롭다운(전체 타일에 앵커링) -->
      <ul
        v-if="ui.regionOpen"
        class="menu region-menu"
        :style="regionMenuStyle"
        @click.self="ui.regionOpen=false"
      >
        <li v-for="r in regionOptions" :key="r.key">
          <button class="menu-item" type="button" @click="selectRegion(r.key)">{{ r.label }}</button>
        </li>
      </ul>
    </section>

    <!-- ❌ 인라인 마운트 제거: BizManagerTabs는 아래 오버레이 안에서 렌더링 -->

        <!-- ▽ 운영자 전용: 순위 편집 툴바 (기준 페이지와 동일 UI) -->
        <section v-if="canEdit" class="orders-head">
          <div class="rank-tools">
            <label class="toggle">
              <input type="checkbox" v-model="editMode" @change="onToggleEdit" />
              <span class="toggle-label">인기 순위 편집</span>
            </label>

            <div class="tools-right">
              <button
                class="icon-btn"
                :disabled="savingRank"
                @click="reloadTopRanks"
                title="새로고침"
                aria-label="새로고침"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <path d="M21 12a9 9 0 1 1-2.64-6.36"/>
                  <path d="M21 3v6h-6"/>
                </svg>
              </button>

              <button
                class="btn primary save-btn"
                :disabled="!editMode || savingRank"
                @click="saveTopRanksNow"
              >
                {{ savingRank ? '저장 중…' : '저장' }}
              </button>
            </div>
          </div>
        </section>

        <!-- =================== 카테고리 인기 순위 =================== -->
        <section class="tops">
          <div class="tops-head">
            <!-- 글씨만 제거, 레이아웃 유지 -->
            <h3 class="sec-ttl"></h3>
          </div>

      <div v-for="sec in topLists" :key="sec.key" class="top-sec">
        <div class="top-head">
          <span class="ttl">{{ sec.label }} Top 5</span>

          <!-- ✅ Top5 등록 버튼: 제목 오른쪽 (기업회원만 보임) -->
          <button
            v-if="isEnterprise"
            class="pink-cta top5-btn"
            type="button"
            @click="toggleBizCreate($event)"
          >
            Top5 등록
          </button>
        </div>
        <div class="top-row">
          <button
            v-for="(s,i) in sec.list"
            :key="s.id"
            class="mini click"
            type="button"
            :class="{ editing: editMode, dragging: drag.cat===sec.key && drag.index===i }"
            :draggable="canEdit && editMode"
            @dragstart="onDragStart(sec.key,i,$event)"
            @dragover="onDragOver(sec.key,i,$event)"
            @drop="onDrop"
            @dragend="onDragEnd"
            @click.stop.prevent="editMode ? noop() : openStore(s)"
            @touchstart.passive="editMode ? noop() : tapStart"
            @touchmove.passive="editMode ? noop() : tapMove"
            @touchend.stop.prevent="editMode ? noop() : tapEnd(() => openStore(s))"
            @mousedown="editMode ? noop() : mouseStart"
            @mousemove="editMode ? noop() : mouseMove"
            @mouseup="editMode ? noop() : mouseEnd(() => openStore(s))"
          >
            <div class="m-thumb" :style="bgStyle(thumbOf(s))">
              <span class="rank">{{ i+1 }}</span>
            </div>
            <div class="m-meta">
              <div class="name-row">
                <div class="m-name ellip">{{ s.name }}</div>
                <div class="m-sub ellip">ㅣ {{ s.region }} · {{ mapCat[s.category] }}</div>
              </div>

              <div class="ad-excerpt">
                <div class="ad-title ellip2">{{ s.adTitle || '' }}</div>
                <div class="ad-pay">일급 {{ payText(s) }}</div>
                <div class="ad-mgr" v-if="managerName(s)">담당: {{ managerName(s) }}</div>
              </div>
            </div>
            <span v-if="canEdit && editMode" class="drag-handle" title="드래그로 이동">☰</span>
          </button>
        </div>
      </div>
    </section>

    <!-- =================== 하단 순서 편집 =================== -->
    <section v-if="canEdit && editMode" class="reorder-sec">
      <h4 class="sec-ttl">하단 업체 순서 편집</h4>
      <ul class="reorder-list">
        <li
          v-for="(s,i) in editableList"
          :key="s.id"
          class="re-item"
          draggable="true"
          @dragstart="onListDragStart(i, $event)"
          @dragover="onListDragOver(i, $event)"
          @drop="onListDrop"
          @dragend="onListDragEnd"
        >
          <span class="re-handle" title="드래그해서 이동">☰</span>
          <span class="re-rank">{{ i+1 }}</span>
          <span class="re-name ellip">{{ s.name }}</span>
          <span class="re-sub ellip">{{ s.region }} · {{ mapCat[s.category] }}</span>
        </li>
      </ul>
      <div class="re-hint muted small">* 현재 카테고리의 상위 {{ EDITABLE_LIMIT }}개 항목을 바로 편집할 수 있습니다. 저장을 누르면 하단 노출 순서에 반영됩니다.</div>
    </section>

    <!-- =================== 상단 목록 헤드/툴 =================== -->
   <section class="list-head" id="list">
     <!-- “총 N개” 제거하고 정렬만 좌측에 배치 -->
     <div class="filter-row only-sort">
       <!-- 📌 정렬(티시 높은순 등) 버튼: 왼쪽 -->
       <div class="filter">
         <button class="drop" type="button" @click.stop="toggleSort">{{ sortLabel }} 🔽</button>
         <ul v-if="ui.sortOpen" class="menu right" @click.self="ui.sortOpen=false">
           <li v-for="o in sortOptions" :key="o.key">
             <button class="menu-item" type="button" @click="chooseSort(o.key)">{{ o.label }}</button>
           </li>
         </ul>
       </div>

       <!-- ✅ 일반등록 버튼: 정렬 오른쪽 -->
       <button
         v-if="isEnterprise"
         class="pink-cta list-reg-btn"
         type="button"
         @click="toggleBizCreate($event)"
       >
         일반등록
       </button>
     </div>

      <div class="view-tools" @click.stop>
        <!-- 🌗 다크/화이트 모드 -->
        <button
          class="tool"
          :title="isDark ? '라이트 모드' : '다크 모드'"
          :aria-label="isDark ? '라이트 모드' : '다크 모드'"
          type="button"
          @click.stop.prevent="toggleTheme"
          @touchstart.stop.prevent="toggleTheme"
        >
          <svg v-if="!isDark" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="4"></circle>
            <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l-1.5-1.5M20.5 20.5L19 19M5 19l-1.5 1.5M20.5 3.5L19 5"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"></path>
          </svg>
        </button>

        <!-- 📍 내 주변(10km) -->
        <button
          class="tool"
          title="내 주변 보기(10km)"
          aria-label="내 주변 보기(10km)"
          type="button"
          @click.stop.prevent="openNearbyHere"
          @touchstart.stop.prevent="openNearbyHere"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="10" r="3"></circle>
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
            <path d="M7 10c0 5 5 12 5 12s5-7 5-12a5 5 0 1 0-10 0z"/>
          </svg>
        </button>

        <!-- 📋/🗂 한줄/두칸 토글 (단일 버튼) -->
        <button
          class="tool"
          :class="{ on: isListView }"
          :title="isListView ? '두칸보기' : '한줄보기'"
          :aria-label="isListView ? '두칸보기로 전환' : '한줄보기로 전환'"
          type="button"
          @click.stop.prevent="toggleViewMode"
          @touchstart.stop.prevent="toggleViewMode"
        >
          <!-- 현재 한줄보기일 때: 리스트 아이콘 -->
          <svg
            v-if="isListView"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          <!-- 현재 두칸보기일 때: 그리드 아이콘 -->
          <svg
            v-else
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="currentColor"
          >
            <rect x="4" y="4" width="7" height="7" rx="1"></rect>
            <rect x="13" y="4" width="7" height="7" rx="1"></rect>
            <rect x="4" y="13" width="7" height="7" rx="1"></rect>
            <rect x="13" y="13" width="7" height="7" rx="1"></rect>
          </svg>
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
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M21 12a9 9 0 1 1-2.64-6.36"/>
            <path d="M21 3v6h-6"/>
          </svg>
        </button>
      </div>
    </section>

    <!-- =================== 목록 뷰 =================== -->
    <!-- StoreFinder.vue (일부) -->
    <!-- ✅ likes-of 전달 -->
    <StoreListView
      v-if="isListView"
      :filtered="filtered"
      :map-cat="mapCat"
      :thumb-of="thumbOf"
      :wifi-color="wifiColor"
      :pay-text="payText"
      :manager-name="managerName"
      :open-store="openStore"
      :show-sheet="showSheet"
      :open-biz-chat="openBizChat"
      :open-manager-menu="openManagerMenu"
      :tap-start="tapStart"
      :tap-move="tapMove"
      :tap-end="tapEnd"
      :mouse-start="mouseStart"
      :mouse-move="mouseMove"
      :mouse-end="mouseEnd"
      :noop="noop"
      :likes-of="likesOf"
    />

    <!-- ✅ likes-of 전달 -->
    <StoreGridView
      v-else
      :filtered="filtered"
      :map-cat="mapCat"
      :thumb-of="thumbOf"
      :wifi-color="wifiColor"
      :pay-text="payText"
      :manager-name="managerName"
      :open-store="openStore"
      :show-sheet="showSheet"
      :open-biz-chat="openBizChat"
      :open-manager-menu="openManagerMenu"
      :tap-start="tapStart"
      :tap-move="tapMove"
      :tap-end="tapEnd"
      :mouse-start="mouseStart"
      :mouse-move="mouseMove"
      :mouse-end="mouseEnd"
      :noop="noop"
      :likes-of="likesOf"
    />

    <!-- =================== 담당 드롭다운 =================== -->
    <teleport to="body">
      <div v-if="mgrMenu.open" class="mgr-portal" @keydown.esc="closeMgrMenu" tabindex="-1">
        <div class="mgr-backdrop" @click="closeMgrMenu"></div>
        <div class="mgr-pop" :style="mgrMenu.style">
          <button
            v-for="(m,i) in mgrMenu.items"
            :key="i"
            class="mgr-opt"
            type="button"
            @click="selectMgrFromMenu(i)"
          >
            <div class="mo-name">{{ m.name || '미지정' }}</div>
            <div class="mo-sub" v-if="m.phone">{{ m.phone }}</div>
            <div class="mo-sub" v-else-if="m.talkId">@{{ m.talkId }}</div>
          </button>
          <div v-if="!mgrMenu.items.length" class="mgr-empty">등록된 담당자가 없습니다.</div>
        </div>
      </div>
    </teleport>

    <!-- =================== 기본 바텀시트 =================== -->
    <teleport to="body">
      <div v-if="sheet.open" class="action-mask" @click.self="closeSheet">
        <section class="action-sheet" role="dialog" aria-modal="true">
          <header class="as-header">
            <button
              v-if="sheet.type==='manager' && sheet.managerIndex!==null && (managersOf(sheet.store).length>1)"
              class="as-back"
              aria-label="뒤로"
              @click="backToMgrList"
              type="button">◀</button>
            <strong>{{ sheet.store?.name }}</strong>
            <button class="as-close" aria-label="닫기" @click="closeSheet" type="button">✕</button>
          </header>

          <div class="as-body">
            <!-- 초톡 -->
            <template v-if="sheet.type==='invite'">
              <h4 class="as-title">초대톡 보기</h4>
              <ul class="list">
                <li v-for="(msg,i) in sheet.store?.invites || []" :key="i" class="li">
                  <span class="dot">•</span> <span>{{ msg }}</span>
                </li>
              </ul>
              <div class="as-actions">
                <button class="btn primary" @click="openBizChat(sheet.store)" type="button">초톡 열기</button>
                <button class="btn" @click="closeSheet" type="button">닫기</button>
              </div>
            </template>

            <!-- 담당자 -->
            <template v-else-if="sheet.type==='manager'">
              <template v-if="sheet.managerIndex===null">
                <h4 class="as-title">담당자 선택</h4>
                <ul class="mgr-list" v-if="managersOf(sheet.store).length">
                  <li v-for="(m,i) in managersOf(sheet.store)" :key="i">
                    <button class="mgr-item" type="button" @click="selectMgr(i)">
                      <span class="name">{{ m.name || '미지정' }}</span>
                      <span class="sub" v-if="m.phone || m.talkId">{{ m.phone || ('@' + m.talkId) }}</span>
                      <span class="arrow">›</span>
                    </button>
                  </li>
                </ul>
                <div v-else class="empty">등록된 담당자가 없습니다.</div>
              </template>

              <template v-else>
                <h4 class="as-title">담당자 연결</h4>
                <div class="kv"><span class="k">담당자</span><span class="v">{{ selectedMgr?.name || '미지정' }}</span></div>
                <div class="kv">
                  <span class="k">연락처</span>
                  <span class="v">
                    <a :href="`tel:${selectedMgr?.phone || ''}`">{{ selectedMgr?.phone || '정보없음' }}</a>
                    <button
                      v-if="selectedMgr?.phone"
                      class="inline-btn"
                      type="button"
                      @click="callPhone(selectedMgr?.phone)"
                    >연결</button>
                  </span>
                </div>
                <div class="kv" v-if="selectedMgr?.talkId">
                  <span class="k">연결톡</span>
                  <span class="v">
                    @{{ selectedMgr?.talkId }}
                    <button class="inline-btn" type="button" @click="openManagerChat()">연결</button>
                  </span>
                </div>

                <div class="as-actions">
                  <button class="btn primary" @click="openManagerChat()" type="button">담당 채팅</button>
                  <button class="btn" @click="callPhone(selectedMgr?.phone)" type="button">전화걸기</button>
                  <button class="btn" @click="copyToClipboard(selectedMgr?.phone)" type="button">번호복사</button>
                </div>
              </template>
            </template>
          </div>
        </section>
      </div>
    </teleport>

    <!-- =================== 등록/광고 신청 패널: 트리거 바로 아래 고정 =================== -->
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

        <!-- 라벨 주입: 광고신청/등록신청 구분 -->
        <BizManagerTabs
          :category="bizCategory"
          :kind="bizPanel.kind"
          :create-title="panelTitle"
          :create-button-label="panelButtonLabel"
          :create-tab-label="panelTitle"
        />
      </section>
    </teleport>

    <!-- =================== 실시간순위 Top10 바텀시트 =================== -->
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
                <button class="hot10-item" type="button" @click="openStoreFromHot(s)">
                  <span class="h-rank">{{ i + 1 }}</span>
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
  </main>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import SearchBar from '@/components/SearchBar.vue'
import { db } from '@/firebase'
import { collection, onSnapshot, doc, query, orderBy, setDoc, serverTimestamp, getDoc } from 'firebase/firestore'

import { getStorage, ref as sRef, getDownloadURL } from 'firebase/storage'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { useMarketingBanners } from '@/composables/useMarketingBanners'   // ⬅️ 추가
import { useNearby } from '@/composables/useNearby'
import StoreQuickCreate from '@/components/biz/StoreQuickCreate.vue'

import StoreListView from '@/components/finder/StoreListView.vue'
import StoreGridView from '@/components/finder/StoreGridView.vue'
import BizManagerTabs from '@/components/biz/BizManagerTabs.vue'

const router = useRouter()
const route  = useRoute()
const storage = getStorage()
const auth = getAuth()

/* ───────────────────────── 실시간순위 Top10 시트 ───────────────────────── */
const hotSheet = ref({ open:false })
function openHotSheet(){ if (hotRanks10.value.length) hotSheet.value.open = true }
function closeHotSheet(){ hotSheet.value.open = false }
function openStoreFromHot(item){
  const id = item?.id
  if (id) {
    const hit = storeIndex.value.get(String(id))
    if (hit) { openStore(hit); hotSheet.value.open = false; return }
  }
  if (item?.name) openHotDetail(item.name)
  hotSheet.value.open = false
}

// ───────────────────────── 검색 ───────────────────────── */
const q = ref((route.query.q || '').toString())

// 현황판(가게찾기) 상단 검색창 문구
// → 업체명, 담당자명 중심으로 안내
const searchPlaceholder = '업체명, 담당자명을 입력해 보세요.'

function scrollToList(){ document.getElementById('list')?.scrollIntoView({ behavior:'smooth', block:'start' }) }
const doSearch = ()=>{
  router.replace({ query: { ...route.query, q: q.value || undefined } })
  scrollToList()
}
watch(() => route.query.q, (nv) => { if (typeof nv !== 'undefined') q.value = String(nv) })

/* ───────────────────────── 배너 소스(공통 훅 사용) ───────────────────────── */
function bannerImage(b){
  if (!b) return ''
  const idx = Number.isFinite(b?._imgIndex) ? Number(b._imgIndex) : 0
  const cand = [
    b.img,
    Array.isArray(b.images) ? b.images[idx] : '',
    Array.isArray(b.images) ? b.images[0]   : '',
  ]
  // 문자열이면서 공백 아닌 첫 후보
  return (cand.find(u => typeof u === 'string' && u.trim().length) || '').trim()
}

const { items: bannersF } = useMarketingBanners('F')  // 가게찾기용 실시간 구독
const oneBanner = computed(() => {
  const arr = Array.isArray(bannersF.value) ? bannersF.value : []
  // 실제 이미지가 있는 배너만 걸러서 최신 1장만
  const withImg = arr.filter(b => !!bannerImage(b))
  return withImg.slice(-1)
})

function onBannerClick(){ scrollToList() }


/* ───────────────────────── 카테고리/정렬 ───────────────────────── */
const categories = [
  // 1줄: 전체, 하퍼, 쩜오, 텐카페, 텐프로, 1%
  { key:'all',     label:'',       emoji:'' },     // 전체: 현재 지역만 표시
  { key:'hopper',  label:'하퍼',    badge:'H' },
  { key:'point5',  label:'쩜오',    badge:'5' },
  { key:'ten',     label:'텐카페',  badge:'10' },
  { key:'tenpro',  label:'텐프로',  badge:'TP' },
  { key:'onep',    label:'1%',      badge:'1%' },

  // 2줄: (비워두기용) + 노래방, 가라오케, 바, 라운지, 기타
  { key:'spacer',  label:'',       emoji:'' },     // 두 번째 줄 첫 칸 비우기용
  { key:'nrb',     label:'노래방',   emoji:'🎤' },
  { key:'kara',    label:'가라오케', emoji:'🎶' },
  { key:'bar',     label:'바',       emoji:'🍸' },
  { key:'lounge',  label:'라운지',   emoji:'🛋️' },
  { key:'etc',     label:'기타',     emoji:'📌' },
]
const mapCat = Object.fromEntries(categories.map(c=>[c.key,c.label || c.key]))
const validType  = (t)=> t === 'all' || categories.some(c=>c.key===String(t))
const type  = ref(validType(route.query.type) ? String(route.query.type) : 'all')

// ✅ BizManagerTabs에 넘길 카테고리(전체면 빈 문자열)
const bizCategory = computed(() => type.value === 'all' ? '' : type.value)

function setType(k){
  if (!validType(k)) return
  type.value = k
  router.replace({ query: { ...route.query, type:k } })
}
watch(() => route.query.type, nv => { if (validType(nv)) type.value = String(nv) })


const sortOptions = [
  { key:'tc',    label:'티시 높은순' },
  { key:'likes', label:'찜 많은순' },
  { key:'rooms', label:'룸 많은순' },
]
const sortKey = ref((route.query.sort || localStorage.getItem('finder:sort') || 'tc').toString())
const sortLabel = computed(() => {
  const qq = String(q.value || '').trim()
  if (qq) return '검색 연관순'
  return sortOptions.find(o => o.key===sortKey.value)?.label || '티시 높은순'
})
function chooseSort(k){
  sortKey.value = k
  ui.value.sortOpen = false
  localStorage.setItem('finder:sort', k)
  router.replace({ query:{ ...route.query, sort:k } })
}

/* ───────────────────────── 등록/광고 패널(플로팅) ───────────────────────── */
const bizPanel = ref({ open:false, kind:'store', style:{ top:'0px', left:'0px', right:'0px' }, anchor:null })

function positionBizPanel(anchorEl){
  const r = anchorEl?.getBoundingClientRect?.()
  if (!r) { bizPanel.value.style = { position:'fixed', left:'8px', right:'8px', top:'70px' }; return }
  // 버튼 바로 아래 고정(좌우 8px 마진)
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
  // BizManagerTabs에서 작성 폼 열기(동일 이벤트 사용)
  window.dispatchEvent(new CustomEvent('open-biz-create', { detail:{ kind } }))
  // 스크롤/리사이즈 시 위치 업데이트
  window.addEventListener('scroll', onReposition, true)
  window.addEventListener('resize', onReposition)
}
function onReposition(){ positionBizPanel(bizPanel.value.anchor) }

function closeBiz(){
  bizPanel.value.open = false
  window.removeEventListener('scroll', onReposition, true)
  window.removeEventListener('resize', onReposition)
}

// ✅ 가게찾기 > 업체등록 버튼
//  - 더 이상 플로팅 패널을 열지 않고
//  - 기존 "업체 등록/편집" 화면(MyStoresPage)으로 바로 이동
async function toggleBizCreate(evt){
  // 기업회원이 아닌 경우 로그인/회원가입으로 보냄
  if (!auth.currentUser) {
    alert('기업회원 로그인 후 이용해 주세요.')
    router.push({
      name: 'auth',
      query: {
        next: route.fullPath || '/find',
        mode: 'login',
        who: 'biz',
      },
    })
    return
  }

  // 바로 새 업체 등록 폼으로 이동
  router.push({
    name: 'storeEdit',
    params: { id: 'new' },          // 새 업체 등록용 id
    query:  { from: route.name || 'finder' },
  }).catch(()=>{})
}

async function toggleAdCreate(evt){
  if (!bizPanel.value.open || bizPanel.value.kind !== 'ad') {
    await openBiz('ad', evt)   // ← 광고 패널 열기
  } else {
    closeBiz()
  }
}

/* 표기 라벨(광고/등록 구분) */
const panelTitle = computed(()=> bizPanel.value.kind === 'ad' ? '광고신청' : '등록신청')
const panelButtonLabel = computed(()=> bizPanel.value.kind === 'ad' ? '새 광고 추가' : '새 매장 추가')


/* ───────────────────────── 지역(전체 타일 드롭다운) ───────────────────────── */
const regionOptions = [
  { key:'gn',  label:'강남' },  // 기본
  { key:'bg',  label:'비강남' },
  { key:'gg',  label:'경기' },
  { key:'ic',  label:'인천' },
  { key:'all', label:'전체' },
]
const regionLabel = (k)=> (regionOptions.find(r=>r.key===k)?.label || '강남')
const selectedRegion = ref((route.query.region || 'gn').toString())

// 전체 타일을 앵커로 위치 계산
const catRefs = new Map()
function setCatRef(el){
  if (!el) return
  const key = el.getAttribute?.('data-key')
  if (!key) return
  catRefs.set(key, el)
}

const regionMenuStyle = ref({})
let regionMenuListenersOn = false
function positionRegionMenu(){
  const el = catRefs.get('all')
  if (!el) return
  const r = el.getBoundingClientRect()
  regionMenuStyle.value = {
    position:'fixed',                         // 뷰포트 기준으로 고정
    top: `${r.bottom + 6}px`,
    left:`${r.left}px`,
    minWidth: `${Math.max(160, r.width)}px`
  }
}
function openRegionMenuFromCat(){
  if (type.value !== 'all') setType('all')
  positionRegionMenu()
  ui.value.regionOpen = true
  ui.value.sortOpen = false
  if (!regionMenuListenersOn){
    window.addEventListener('scroll', positionRegionMenu, true)
    window.addEventListener('resize', positionRegionMenu)
    regionMenuListenersOn = true
  }
}
function closeRegionMenu(){
  ui.value.regionOpen = false
  if (regionMenuListenersOn){
    window.removeEventListener('scroll', positionRegionMenu, true)
    window.removeEventListener('resize', positionRegionMenu)
    regionMenuListenersOn = false
  }
}
function selectRegion(k){
  selectedRegion.value = k
  closeRegionMenu()
  router.replace({ query: { ...route.query, region: k } })
}

/* ───────────────────────── 정렬/검색 유틸 ───────────────────────── */
function norm(s){ return String(s||'').toLowerCase().trim() }
function tokens(s){ return norm(s).split(/\s+/).filter(Boolean) }
function categoryLabelOf(s){ return mapCat[String(s?.category)||''] || String(s?.category||'') }
function firstManagerName(s){
  const arr = Array.isArray(s?.managers) ? s.managers : []
  if (arr.length && arr[0]?.name) return arr[0].name
  return s?.manager || ''
}

/**
 * 검색에 사용할 텍스트 전체 묶기
 * - 업체명(name)
 * - 담당자명(firstManagerName)
 * - 광고/이벤트 제목(adTitle)
 * - 설명/시술명/부위/이벤트 내용(desc, description)
 * - 태그/서비스/이벤트 배열(tags, services, events)
 */
function searchTextOf(s){
  const manager = firstManagerName(s)
  const tags     = Array.isArray(s?.tags)     ? s.tags.join(' ')     : ''
  const services = Array.isArray(s?.services) ? s.services.join(' ') : ''
  const events   = Array.isArray(s?.events)   ? s.events.join(' ')   : ''

  return [
    s?.name,
    manager,
    s?.adTitle,
    s?.desc,
    s?.description,
    tags,
    services,
    events,
  ].map(norm).filter(Boolean).join(' ')
}

/**
 * 검색어 매칭 여부
 * - 입력된 단어(공백으로 분리)들이 searchTextOf 안에 모두 포함되면 true
 */
function matchesQuery(s, query){
  const text = searchTextOf(s)
  if (!text) return false
  const qs = tokens(query)
  if (!qs.length) return true
  return qs.every(tok => text.includes(tok))
}

function relevanceScore(s, query){
  const qs = tokens(query)
  if (!qs.length) return 0

  // 업체명/담당자/시술/이벤트 등을 모두 포함한 검색 텍스트
  const hay = [
    searchTextOf(s),
    s?.region,
    categoryLabelOf(s),
  ].map(norm).filter(Boolean)

  let score = 0
  for (const qtok of qs){
    for (const h of hay){
      if (h === qtok) score += 12
      else if (h.startsWith(qtok)) score += 8
      else if (h.includes(qtok)) score += 4
    }
  }

  // 업체명(name)에 조금 더 가중치
  const name = norm(s?.name)
  for (const qtok of qs){
    if (name === qtok) score += 10
    else if (name.startsWith(qtok)) score += 6
    else if (name.includes(qtok)) score += 3
  }
  return score
}

/* ───────────────────────── Firestore 목록 ───────────────────────── */
/**
 * storesRaw  : Firestore 원본 stores
 * stores     : rooms_biz 집계와 섞어서 화면에 쓰는 최종 데이터
 * roomsBizMap: rooms_biz 전체를 메모리 맵으로 보관 (id / storeId / roomBizId 모두 키)
 */
const storesRaw   = ref([])
const stores      = ref([])
const roomsBizMap = ref(new Map())

let unsubsStores   = null
let unsubsRoomsBiz = null

// 썸네일 공통
const FALLBACK_THUMB = {
  lounge : 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?q=80&w=1200&auto=format&fit=crop',
  bar    : 'https://images.unsplash.com/photo-1532634896-26909d0d4b6a?q=80&w=1200&auto=format&fit=crop',
  ten    : 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200&auto=format&fit=crop',
  point5 : 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1200&auto=format&fit=crop',
  hopper : 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop',
  nrb    : 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=1200&auto=format&fit=crop',
  kara   : 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?q=80&w=1200&auto=format&fit=crop',
  onep   : 'https://images.unsplash.com/photo-1514361892636-7f05f1d2710f?q=80&w=1200&auto=format&fit=crop',
  default: 'https://images.unsplash.com/photo-1521017432531-fbd92d59d4b1?q=80&w=1200&auto=format&fit=crop',
}

async function resolveThumb(u){
  const url = String(u || '').trim()
  if (!url) return ''
  if (/^(data:|blob:|https?:\/\/|\/)/i.test(url)) return url
  if (url.startsWith('gs://')){
    try{
      return await getDownloadURL(sRef(storage, url))
    }catch(e){
      console.warn('getDownloadURL 실패:', e)
      return ''
    }
  }
  return url
}
function thumbCandidate(s){
  const cand =
    s.thumb || s.cover || s.coverImg ||
    (Array.isArray(s.images) && s.images[0]) ||
    (Array.isArray(s.photos) && s.photos[0]) ||
    s.img || s.banner || s.logo || ''
  return String(cand || '').trim()
}
const thumbOf = (s)=> (s._thumb || s.thumb || '')

/** rooms_biz 값으로 stores 숫자 필드 보정 (초톡과 동일 기준) */
function rebuildStores(){
  const rbMap = roomsBizMap.value || new Map()

  stores.value = storesRaw.value.map(raw => {
    const s = { ...raw }

    // rooms_biz 문서 키 후보들
    const candidates = [
      s.roomBizId,   // 최근에 맞춰둔 필드
      s.rooms_biz,   // 예전 필드
      s.storeKey,    // store_mf54rsfl 등
      s.id,          // 혹시 id 자체가 동일한 경우
    ]
      .map(v => String(v || '').trim())
      .filter(Boolean)

    let rb = null
    for (const key of candidates){
      const baseKey = key.replace(/_room_.+$/i, '') // store_xxx_room_01 → store_xxx
      rb = rbMap.get(baseKey) || rbMap.get(key)
      if (rb) break
    }

    if (rb){
      const totalRooms     = Number(rb.totalRooms ?? rb.total ?? 0)
      const totalCurrent   = Number(rb.totalCurrent ?? 0)
      const totalNeeded    = Number(rb.totalNeeded ?? 0)
      const totalRemaining = Number(
        rb.totalRemaining ??
        (totalNeeded && totalCurrent ? (totalNeeded - totalCurrent) : 0)
      )

      // 🔴 여기서 “초톡 상단”과 완전히 동일하게 맞춤
      //    맞출방  = totalRooms
      //    필요인원 = totalRemaining
      s.match          = totalRooms
      s.persons        = totalRemaining
      s.totalRooms     = totalRooms
      s.totalNeeded    = totalNeeded
      s.totalRemaining = totalRemaining
      s._roomsBizId    = rb.id || rb.roomBizId || rb.storeId || null
    }

    return s
  })
}

// Firestore 구독
onMounted(() => {
  applyThemeToDom(getTheme())
  // 1) stores 컬렉션
  try{
    const qRef = query(collection(db, 'stores'), orderBy('updatedAt','desc'))
    unsubsStores = onSnapshot(qRef, async (snap)=>{
      const rows = await Promise.all(
        snap.docs.map(async d => {
          const raw = { id:d.id, ...d.data() }
          const cand = thumbCandidate(raw)
          let resolved = await resolveThumb(cand)
          if (!resolved) {
            const key = raw.category && FALLBACK_THUMB[raw.category] ? raw.category : 'default'
            resolved = FALLBACK_THUMB[key]
          }
          const adTitle = raw.adTitle || raw.desc || ''
          return { ...raw, _thumb: resolved, adTitle }
        })
      )
      storesRaw.value = rows
      rebuildStores()   // rooms_biz 값과 합쳐서 최종 stores 구성
    })
  }catch(e){
    console.warn('stores 구독 실패', e)
  }

  // 2) rooms_biz 컬렉션 (초톡과 같은 소스)
  try{
    const rRef = collection(db, 'rooms_biz')
    unsubsRoomsBiz = onSnapshot(rRef, snap => {
      const map = new Map()
      snap.forEach(d => {
        const data   = d.data() || {}
        const docId  = String(d.id)
        const roomId = String(data.roomBizId || '').trim()
        const storeId= String(data.storeId   || '').trim()

        const merged = { id: docId, ...data }
        map.set(docId, merged)
        if (roomId)  map.set(roomId, merged)
        if (storeId) map.set(storeId, merged)
      })
      roomsBizMap.value = map
      rebuildStores()   // rooms_biz 갱신 시에도 다시 머지
    })
  }catch(e){
    console.warn('rooms_biz 구독 실패', e)
  }
})

onUnmounted(() => {
  if (typeof unsubsStores   === 'function') unsubsStores()
  if (typeof unsubsRoomsBiz === 'function') unsubsRoomsBiz()
})

/* ───────────────────────── 새로고침(샘플 변동) ───────────────────────── */
function refresh(){
  stores.value = stores.value
    .slice()
    .sort(()=>Math.random()-.5)
    .map(s => ({ ...s,
      match:   Math.max(0,(Number(s.match||0)+Math.floor(Math.random()*3)-1)),
      persons: Math.max(0,(Number(s.persons||0)+Math.floor(Math.random()*3)-1)),
    }))
}

/* ───────────────────────── 숫자/정렬 유틸 ───────────────────────── */
const num = (v) => {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const s = String(v ?? '').trim()
  if (!s) return 0
  const cleaned = s.replace(/[^\d.-]/g, '')
  const n = Number.parseInt(cleaned, 10)
  return Number.isFinite(n) ? n : 0
}
const roomsOf = (s) => {
  if (s.rooms != null) return num(s.rooms)
  if (s.roomCount != null) return num(s.roomCount)
  if (s.roomInfo) return num(s.roomInfo)
  return 0
}
// StoreFinder.vue (일부)
// 찜수는 'likes' 또는 레거시 'wishCount'만 인정 (주석과 로직 일치)
const likesOf = (s) => num(s.likes ?? s.wishCount ?? 0)

const tcOf = (s) => {
  const w = wageOf(s)
  if (w) return w
  if (s.tc != null) return num(s.tc)
  if (s.pay != null) return num(s.pay)
  return 0
}

/* ───────────────────────── 급여/혼잡도 ───────────────────────── */
const wageOf = (s)=>{
  const v = s?.wage ?? s?.hourly ?? s?.payPerHour ?? s?.hourPay ?? s?.hourlyPay ?? s?.hourlyWage ?? s?.pay
  return Number(v || 0)
}
const payText = (s) => {
  const n = wageOf(s)
  if (n) return `${Number(n).toLocaleString()}원`
  const raw = (s?.pay || '').toString()
  if (raw.includes('원')) return raw
  return '150,000원'
}
function computeStatus(s){
  const saved = String(s?.status || '')
  if (['여유','보통','혼잡'].includes(saved)) return saved
  const totalRooms = num(s?.totalRooms ?? s?.total ?? s?.rooms)
  const maxPersons = num(s?.maxPersons ?? s?.capacity ?? s?.max)
  const match      = num(s?.match)
  const persons    = num(s?.persons)
  const ratios = []
  if (totalRooms > 0) ratios.push(match / totalRooms)
  if (maxPersons > 0) ratios.push(persons / maxPersons)
  const availability = ratios.length ? Math.min(...ratios.map(r => Math.max(0, Math.min(1, r)))) : 1
  if (availability >= 0.60) return '여유'
  if (availability >= 0.30) return '보통'
  return '혼잡'
}
const wifiColor = (storeOrStatus)=>{
  const st = typeof storeOrStatus === 'string' ? storeOrStatus : computeStatus(storeOrStatus || {})
  if (st === '여유') return 'ok'
  if (st === '보통') return 'mid'
  return 'busy'
}

/* ───────────────────────── 지역 매핑/노출 필터 ───────────────────────── */
/* ───────────────────────── 지역 매핑/노출 필터 ───────────────────────── */
const macroOf = (s)=>{
  const r = String(s.region || '')
  if (['강남','서초','송파','신사','논현'].includes(r)) return 'gn'
  if (r === '경기') return 'gg'
  if (r === '인천') return 'ic'
  return 'bg'
}

const toMs = (v) => {
  if (!v) return 0
  if (typeof v === 'number') return v
  if (v?.toDate) return v.toDate().getTime()
  if (typeof v.seconds === 'number') {
    return v.seconds * 1000 + Math.floor((v.nanoseconds || 0) / 1e6)
  }
  if (v instanceof Date) return v.getTime()
  return 0
}

/**
 * ✅ 승인 여부 판단 (현황판과 동일 정책)
 *  - s.approved === true
 *  - applyStatus = 'approved' / 'active'
 *  - applyStatus 비어 있고 active === true 인 경우도 노출
 */
const isApproved = (s) => {
  const status = String(s?.applyStatus || '').toLowerCase()

  // 예전 필드: approved === true
  if (s?.approved === true) return true

  // 상태 문자열 기반
  if (status === 'approved' || status === 'active') return true

  // 새 구조: 신청 상태는 비어 있고, active 플래그만 true 인 업체
  if (!status && s?.active === true) return true

  // 그 외는 미승인으로 취급
  return false
}

/**
 * ✅ 광고 기간 필터 비활성화
 *  - adStart / adEnd 값이 있어도 "가게찾기"에서는 무시하고 항상 true
 *  - 실제 광고 과금/관리 로직은 다른 레벨에서 처리
 */
const isActiveAd = (s) => {
  return true
}

const EXPOSURE_KEY = 'gangtalk'
const exposedHere = (s)=> {
  const exp = s?.exposure || {}
  if (exp == null || typeof exp !== 'object') return true
  if (exp[EXPOSURE_KEY] === undefined) return true
  return !!exp[EXPOSURE_KEY]
}

/* ───────────────────────── 실시간 순위(계산/티커) ───────────────────────── */
const hotRanks10 = computed(() => {
  const base = baseFiltered()
  const byLikes = (s) => likesOf(s)
  let arr = base.slice().sort((a,b)=> byLikes(b) - byLikes(a))
  if (!arr.length) {
    const byTc = (s) => tcOf(s)
    arr = base.slice().sort((a,b)=> byTc(b) - byTc(a))
  }
  return arr.slice(0, 10).map(s => ({
    id: s.id,
    name: s.name,
    intro: s.adTitle || s.desc || s.description || ''
  }))
})
const loopedRanks = computed(() => {
  const list = hotRanks10.value
  return list.length ? [...list, list[0]] : []
})
function displayRank(i){
  const n = hotRanks10.value.length
  if (!n) return ''
  // loopedRanks는 마지막에 첫 아이템을 한 번 더 붙이므로 모듈로 랭크 표기
  return ((i % n) + 1).toString()
}

const TICKER_ITEM_H = 28
const tickerIndex = ref(0)
const useTransition = ref(true)
const tickerMs = 1200
const tickerStyle = computed(() => ({
  transform: `translateY(-${tickerIndex.value * TICKER_ITEM_H}px)`,
  transition: useTransition.value ? 'transform 400ms ease-in' : 'none'
}))
let tickerTimer = null
onMounted(() => {
  tickerTimer = setInterval(() => {
    const n = hotRanks10.value.length
    if (!n) return
    if (tickerIndex.value < n) { useTransition.value = true; tickerIndex.value += 1 }
    else { useTransition.value = false; tickerIndex.value = 0 }
  }, tickerMs)
})
onUnmounted(() => { if (tickerTimer) clearInterval(tickerTimer) })
function openHotDetail(name){
  const exact = stores.value.find(st => String(st.name||'').trim() === String(name).trim())
  if (exact) { openStore(exact); return }
  const fuzzy = stores.value.find(st => String(st.name||'').toLowerCase().includes(String(name).toLowerCase()))
  if (fuzzy) { openStore(fuzzy); return }
  q.value = name; doSearch()
}

/* ───────────────────────── 기업회원 여부 ───────────────────────── */
/**
 * 가게찾기 페이지용 기업회원 판별
 *  - type === 'company'
 *  - accountKind === 'storeOwner' 인 경우에만 true
 *  - 제휴관 담당자(partnerOwner)는 false 처리
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

    // 회사 + storeOwner 일 때만 가게찾기용 기업회원
    isEnterprise.value = (type === 'company' && kind === 'storeowner')
  } catch (e) {
    console.warn('resolveEnterprise 실패:', e)
    isEnterprise.value = false
  }
}

onMounted(() => {
  resolveEnterprise(auth.currentUser)
  onAuthStateChanged(auth, resolveEnterprise)
})

/* ───────────────────────── 운영자 권한 ───────────────────────── */
// 관리자: Firestore 'admins/{uid}' 존재 여부로 판별(다른 페이지들과 일관)
const canEdit = ref(false)
let _adminUnsub = null
function watchAdmin(u){
  if (_adminUnsub) { _adminUnsub(); _adminUnsub = null }
  if (!u?.uid) { canEdit.value = false; return }
  _adminUnsub = onSnapshot(
    doc(db, 'admins', String(u.uid)),
    s => { canEdit.value = s.exists() },
    () => { canEdit.value = false }
  )
}
onMounted(() => {
  watchAdmin(auth.currentUser)
  onAuthStateChanged(auth, watchAdmin)
})
onUnmounted(() => { if (_adminUnsub) _adminUnsub() })

/* ───────────────────────── Top5 데이터 ───────────────────────── */
const topByCat = (k)=> {
  const base = stores.value.filter(s =>
    s.category === k &&
    isApproved(s) &&          // ✅ 승인된 업체만
    isActiveAd(s) &&          // ✅ (현재는 항상 true지만 정책 일치)
    exposedHere(s) &&         // ✅ 이 화면에 노출 허용된 곳만
    (selectedRegion.value === 'all' ? true : macroOf(s) === selectedRegion.value)
  )

  const k2 = sortKey.value
  const byKey = (s) =>
    (k2 === 'rooms'
      ? roomsOf(s)
      : k2 === 'likes'
        ? likesOf(s)
        : tcOf(s))

  return base.slice().sort((a, b) => byKey(b) - byKey(a)).slice(0, 5)
}

const storeIndex = computed(()=> {
  const map = new Map()
  for (const s of stores.value) map.set(String(s.id), s)
  return map
})
function topFromRanks(catKey){
  const ids = Array.isArray(topRanks.value?.[catKey]) ? topRanks.value[catKey] : []

  const list = ids
    .map(id => storeIndex.value.get(String(id)))
    .filter(s =>
      !!s &&
      isApproved(s) &&      // ✅ 승인된 업체만
      isActiveAd(s) &&      // ✅ 광고 기간 필터(현재 항상 true지만 유지)
      exposedHere(s) &&     // ✅ 이 화면 노출 허용
      (selectedRegion.value === 'all' ? true : macroOf(s) === selectedRegion.value) &&
      (type.value === 'all' ? true : s.category === catKey)
    )

  return list.slice(0, 5)
}

/* 표시용 Top 리스트: 수동 > 자동 */
const topRanks = ref({})
const topLists = computed(()=>{
  const allCats = categories
    .filter(c => c.key !== 'all')
    .filter(c => c.key!=='tenpro' || stores.value.some(s=>s.category==='tenpro'))
  const targetKeys = (type.value === 'all') ? allCats.map(c=>c.key) : [type.value]
  return allCats
    .filter(c => targetKeys.includes(c.key))
    .map(c => {
      const ranked = topFromRanks(c.key)
      const list = ranked.length ? ranked : topByCat(c.key)
      return { key:c.key, label:c.label || c.key, list }
    })
    .filter(sec => sec.list.length > 0)
})

/* ───────────────────────── 편집(드래그) Top5 ───────────────────────── */
const editMode = ref(false)
const savingRank = ref(false)
const drag = ref({ cat:'', index:-1, id:'' })
function ensureSeedFor(cat){
  if (!Array.isArray(topRanks.value[cat]) || !topRanks.value[cat].length){
    const seed = topByCat(cat).map(s => s.id).slice(0,5)
    topRanks.value = { ...topRanks.value, [cat]: seed }
  }
}
function onToggleEdit(){
  if (!canEdit.value || !editMode.value) return
  const cats = (type.value === 'all')
    ? categories.filter(c => c.key!=='all').map(c => c.key)
    : [type.value]
  cats.forEach(ensureSeedFor)
  ensureListSeedFor(currentListKey.value)
}
function onDragStart(cat, idx, e){
  if (!canEdit.value || !editMode.value) return
  const arr = topRanks.value?.[cat] || []
  drag.value = { cat, index: idx, id: String(arr[idx] || '') }
  try{ e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', drag.value.id) }catch{}
}
function onDragOver(cat, overIdx, e){
  if (!canEdit.value || !editMode.value) return
  const d = drag.value
  if (d.cat !== cat || d.index < 0) return
  e.preventDefault()
  const arr = (topRanks.value?.[cat] || []).slice()
  const from = d.index, to = overIdx
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return
  const [moved] = arr.splice(from, 1); arr.splice(to, 0, moved)
  topRanks.value = { ...topRanks.value, [cat]: arr }; drag.value.index = to
}
function onDrop(){} function onDragEnd(){ drag.value = { cat:'', index:-1, id:'' } }

/* ───────────────────────── 하단 목록 순서 편집 ───────────────────────── */
const listOrders = ref({})
const EDITABLE_LIMIT = 50
const currentListKey = computed(()=> type.value)
function baseFiltered(){
  const list = stores.value.filter(s=>{
    const okExpose   = exposedHere(s)
    const okApproved = isApproved(s)
    const okPeriod   = isActiveAd(s)
    const okT = type.value==='all' || s.category===type.value

    // 🔍 검색어가 있을 때:
    //  - 업체명, 담당자명, 시술명/부위, 이벤트(광고 제목/태그 등)를 모두 포함한 searchTextOf 기준으로 매칭
    const okQ = !q.value || matchesQuery(s, q.value)

    const okR = selectedRegion.value==='all' || macroOf(s)===selectedRegion.value
    return okExpose && okApproved && okPeriod && okT && okQ && okR
  })
  const qq = String(q.value || '').trim()
  if (qq){
    const k = sortKey.value
    const byKey = (s) => (k==='rooms' ? roomsOf(s) : k==='likes' ? likesOf(s) : tcOf(s))
    return list.slice().sort((a,b)=>{
      const rb = relevanceScore(b, qq), ra = relevanceScore(a, qq)
      if (rb !== ra) return rb - ra
      return byKey(b) - byKey(a)
    })
  } else {
    const k = sortKey.value
    const byKey = (s) => (k==='rooms' ? roomsOf(s) : k==='likes' ? likesOf(s) : tcOf(s))
    return list.slice().sort((a,b)=> byKey(b)-byKey(a))
  }
}
function ensureListSeedFor(key){
  if (!key) return
  if (!Array.isArray(listOrders.value[key]) || !listOrders.value[key].length){
    const ids = baseFiltered().slice(0, EDITABLE_LIMIT).map(s => s.id)
    listOrders.value = { ...listOrders.value, [key]: ids }
  }
}
const ldrag = ref({ index:-1, id:'' })
const editableList = computed(()=> filtered.value.slice(0, EDITABLE_LIMIT))
function onListDragStart(i, e){
  if (!canEdit.value || !editMode.value) return
  const cur = editableList.value[i]; if (!cur) return
  ldrag.value = { index:i, id:String(cur.id) }
  try{ e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', ldrag.value.id) }catch{}
}
function onListDragOver(overIdx, e){
  if (!canEdit.value || !editMode.value) return
  const d = ldrag.value; if (d.index < 0) return
  e.preventDefault()
  const key = currentListKey.value; ensureListSeedFor(key)
  const visibleIds = editableList.value.map(s=>String(s.id))
  const arr = (listOrders.value[key] || []).filter(id => visibleIds.includes(String(id)))
  const from = d.index, to = overIdx
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return
  const [moved] = arr.splice(from, 1); arr.splice(to, 0, moved)
  const others = (listOrders.value[key] || []).filter(id => !visibleIds.includes(String(id)))
  listOrders.value = { ...listOrders.value, [key]: [...arr, ...others] }
  ldrag.value.index = to
}
function onListDrop(){} function onListDragEnd(){ ldrag.value = { index:-1, id:'' } }

/* ───────────────────────── 최종 목록/저장/뷰 전환/테마 ───────────────────────── */
const filtered = computed(()=>{
  const base = baseFiltered()
  const key = currentListKey.value
  const order = Array.isArray(listOrders.value?.[key]) ? listOrders.value[key] : []
  if (!order.length) return base
  const pos = new Map(order.map((id,idx)=>[String(id), idx]))
  const k = sortKey.value
  const byKey = (s) => (k==='rooms' ? roomsOf(s) : k==='likes' ? likesOf(s) : tcOf(s))
  return base.slice().sort((a,b)=>{
    const ai = pos.has(String(a.id)) ? pos.get(String(a.id)) : Infinity
    const bi = pos.has(String(b.id)) ? pos.get(String(b.id)) : Infinity
    if (ai !== bi) return ai - bi
    return byKey(b) - byKey(a)
  })
})
async function saveTopRanksNow(){
  if (!canEdit.value) return
  try{
    savingRank.value = true
    const payloadRanks = { ...topRanks.value }
    const payloadOrders = { ...listOrders.value }
    await setDoc(doc(db, 'config', 'marketing'), {
      topRanks: payloadRanks,
      listOrders: payloadOrders,
      updatedAt: Date.now(),
      serverUpdatedAt: serverTimestamp()
    }, { merge: true })
    alert('저장되었습니다.')
    editMode.value = false
  }catch(e){
    console.warn('saveTopRanks 실패:', e)
    alert('저장 중 오류가 발생했습니다.')
  }finally{
    savingRank.value = false
  }
}
async function reloadTopRanks(){ topRanks.value = { ...topRanks.value }; listOrders.value = { ...listOrders.value } }

const view = ref((route.query.view || localStorage.getItem('finder:view') || 'list').toString())

// ▶ 현재 한줄 보기 여부 (단일 아이콘 토글용)
const isListView = computed(() => view.value === 'list')

async function setView(v){
  if (v !== 'list' && v !== 'grid') return
  const y = window.scrollY
  view.value = v
  localStorage.setItem('finder:view', v)
  router.replace({ query: { ...route.query, view: v } })
  await nextTick()
  window.scrollTo({ top: y, left: 0, behavior: 'auto' })
}

// ▶ 다크/화이트 토글처럼 한 버튼으로 리스트/그리드 전환
function toggleViewMode () {
  const next = isListView.value ? 'grid' : 'list'
  // 기존 setView 로직 재사용(스크롤 위치 유지 포함)
  setView(next)
}

watch(() => route.query.view, (nv) => { if (nv && nv !== view.value) view.value = String(nv) })

/* ▶ 테마: localStorage 기반 (URL 쿼리 제거) */
import { getTheme, setTheme, applyThemeToDom } from '@/store/theme.js'

const theme = ref(getTheme())
const isDark = computed(() => theme.value === 'dark' || theme.value === 'black')

function toggleTheme(){
  const next = isDark.value ? 'white' : 'black'
  theme.value = next
  setTheme(next)
}

/* ───────────────────────── 이동/도구/상세 ───────────────────────── */
/* ▶ 내 주변(10km) 지도 열기 */
const { openNearby } = useNearby()

/** 버튼용 래퍼: 현재 필터된 목록과 라우터를 넘겨 안전 호출 */
function openNearbyHere(){
  // 반경은 10km 고정, composable이 HTTPS/HTTP 폴백 처리
  openNearby({
    stores: filtered.value,  // 현재 화면에 보이는 목록
    router,                  // 상세 열기 등에 사용
    radiusKm: 10
  })
  // 목록 섹션으로 자연스럽게 이동
  scrollToList()
}

const openStore = (s)=> router.push({ name:'storeDetail', params:{ id:s.id } })

/* 담당 드롭다운 */
const mgrMenu = ref({ open:false, items:[], style:{ top:'0px', left:'0px', width:'220px' }, store:null })
const mgrAnchorEl = ref(null)
function updateMgrPos(){
  const el = mgrAnchorEl.value
  if(!el) return
  const r = el.getBoundingClientRect()
  mgrMenu.value.style = { top: `${r.bottom + 6}px`, left: `${r.left}px`, width: `${Math.max(220, r.width)}px` }
}
function managersOf(s){
  if(!s) return []
  const arr = Array.isArray(s.managers) ? s.managers.filter(Boolean) : []
  if (arr.length) return arr
  if (s.manager || s.phone || s.talkId) return [{ name:s.manager, phone:s.phone, talkId:s.talkId }]
  return []
}
function openManagerMenu(e, s){
  const list = managersOf(s)
  mgrAnchorEl.value = e.currentTarget
  mgrMenu.value = { open:true, items:list, style:mgrMenu.value.style, store:s }
  updateMgrPos()
  setTimeout(()=> document.querySelector('.mgr-portal')?.focus?.(), 0)
  window.addEventListener('scroll', updateMgrPos, true)
  window.addEventListener('resize', updateMgrPos)
}
function closeMgrMenu(){
  mgrMenu.value.open = false
  window.removeEventListener('scroll', updateMgrPos, true)
  window.removeEventListener('resize', updateMgrPos)
}
function selectMgrFromMenu(i){
  const s = mgrMenu.value.store
  const m = mgrMenu.value.items[i]
  closeMgrMenu()
  if (!s || !m) return
  goManagerDetail(s, m, i)
}
function goManagerDetail(s, _m, i){
  const idx = Number.isFinite(Number(i)) ? Number(i) : 0
  router.push({ name:'storeDetail', params:{ id: s.id }, query:{ sheet: 'manager', mi: idx } })
}

/* 기본 바텀시트 */
const sheet = ref({ open:false, type:'', store:null, managerIndex:null })
function showSheet(type, s){
  if(type==='manager'){
    const list = managersOf(s)
    sheet.value = { open:true, type, store:s, managerIndex: (list.length<=1 ? 0 : null) }
  }else{
    sheet.value = { open:true, type, store:s, managerIndex:null }
  }
}
function closeSheet(){ sheet.value.open = false }

const selectedMgr = computed(()=>{
  const s = sheet.value.store
  const i = sheet.value.managerIndex
  const list = managersOf(s)
  return (i!==null && list[i]) ? list[i] : null
})
function selectMgr(i){ sheet.value.managerIndex = i }
function backToMgrList(){ sheet.value.managerIndex = null }

/* 채팅/연락 */
function pushFirstAvailable(cands){
  for(const loc of cands){
    const r = router.resolve(loc)
    if (r.matched && r.matched.length){ router.push(loc); return true }
  }
  alert('채팅 라우트가 아직 등록되지 않았습니다.')
  return false
}
function openBizChat(s){
  const rid = `store-${encodeURIComponent(s.id || s.name)}`
  pushFirstAvailable([
    { name:'bizChat', params:{ roomId: rid }, query:{ title:s.name } },
    { path:`/chat/room/${rid}`, query:{ title:s.name } },
    { path:'/chat', query:{ room: rid, title:s.name } },
  ])
}
function openManagerChat(){
  const s = sheet.value.store
  const m = selectedMgr.value
  if(!s || !m) return
  const to = m.talkId ? `talk:${m.talkId}` : `manager-${s.id}-${(m.name || 'mgr').toString().replace(/\s+/g,'_')}`
  pushFirstAvailable([
    { name:'managerChat', query:{ to, name:(m.name || '담당자'), store:s.name, talkId:(m.talkId || '') } },
    { path:'/connect',    query:{ to, name:(m.name || '담당자'), store:s.name, talkId:(m.talkId || '') } },
  ])
}
function openConnectTalk(s){
  pushFirstAvailable([
    { name:'managerChat', query:{ to:`manager-${s.id}`, name:managerName(s), store:s.name } },
    { path:'/connect',    query:{ to:`manager-${s.id}`, name:managerName(s), store:s.name } },
  ])
}
function callPhone(phone){ if(phone) window.location.href = `tel:${phone}` }
async function copyToClipboard(text){
  if(!text) return
  try{ await navigator.clipboard.writeText(text); alert('복사되었습니다.') }
  catch{ alert('복사에 실패했어요.') }
}

/* 탭/클릭 보정 */
const noop = () => {}
const PRESS_THRESHOLD = 12, MIN_PRESS_MS = 50, MAX_PRESS_MS = 700
const press = ref({ active:false, x:0, y:0, t:0, moved:false })
function tapStart(e){
  const p = e.touches?.[0] || e
  press.value = { active:true, x:p.clientX, y:p.clientY, t:Date.now(), moved:false }
}
function tapMove(e){
  const st = press.value; if(!st.active) return
  const p = e.touches?.[0] || e
  const dx = Math.abs(p.clientX - st.x), dy = Math.abs(p.clientY - st.y)
  if (dx > PRESS_THRESHOLD || dy > PRESS_THRESHOLD) st.moved = true
}
function tapEnd(cb){
  const st = press.value
  const elapsed = Date.now() - st.t
  const isTap = !st.moved && elapsed >= MIN_PRESS_MS && elapsed <= MAX_PRESS_MS
  press.value.active = false
  if (isTap && typeof cb === 'function') cb()
}
function mouseStart(e){ tapStart(e) }
function mouseMove(e){ tapMove(e) }
function mouseEnd(cb){ tapEnd(cb) }

/* 공용 스타일 유틸 */
function bgStyle(url){
  const u = String(url || '').trim()
  return u ? ({ backgroundImage:`url("${u.replace(/"/g, '\\"')}")` }) : ({})
}
const managerName = (s) => {
  if (!s) return ''
  const arr = Array.isArray(s.managers) ? s.managers : []
  if (arr.length && arr[0]?.name) return arr[0].name
  if (s.manager) return s.manager
  return ''
}
function clamp01(v){ return Math.max(0, Math.min(1, Number(v) || 0)) }
function ensureTagPos(b){
  const n = Array.isArray(b.tags) ? b.tags.length : 0
  if (!Array.isArray(b.tagPos)) b.tagPos = []
  while (b.tagPos.length < n) b.tagPos.push({ x: clamp01(0.12 + b.tagPos.length * 0.08), y: clamp01(0.18 + b.tagPos.length * 0.08) })
  if (b.tagPos.length > n) b.tagPos.splice(n)
}
function tagPosStyle(b, idx){
  ensureTagPos(b)
  const p = b.tagPos?.[idx] || { x:.12, y:.18 }
  return { position:'absolute', left: `${clamp01(p.x) * 100}%`, top:  `${clamp01(p.y) * 100}%`, transform:'translate(-50%, -50%)', zIndex: 3, cursor:'default', userSelect:'none' }
}
const ui = ref({ regionOpen:false, sortOpen:false })
function toggleSort(){ ui.value.sortOpen = !ui.value.sortOpen; if(ui.value.sortOpen) ui.value.regionOpen=false }
</script>

<style scoped>
/* =============================
   Page Padding / Layout Locks
============================= */
.page{ padding: 8px 12px calc(92px + env(safe-area-inset-bottom)) }

:root{
  --search-height: 32px;
  --hot-height:    32px;
  --search-gap-top:    4px;
  --search-gap-bottom: 6px;
}

.search-wrap{ display:flex; flex-direction:column; gap:6px; margin:0; }
.search-lock{ padding-block: var(--search-gap-top) var(--search-gap-bottom); }
.search-lock > :first-child{ min-height: var(--search-height); display:flex; align-items:center; }
.banners, .cats, .tops, .list-head{ margin-top:8px; }

/* =============================
   HOT Ticker (상단: 세로 1줄)
============================= */
.nowrap{ white-space:nowrap; }
.hot-box{
  display:flex; align-items:center; height:var(--hot-height);
  border:1px solid var(--line); border-radius:14px;
  background:#fff; color:#111; padding:0 10px;
  box-shadow:0 4px 10px var(--shadow);
  overflow:hidden;
}
.hot-box .hot-label{ font-weight:900; font-size:12px; white-space:nowrap; }
.hot-box .hot-sep{ margin:0 6px; opacity:.6; font-weight:900; }
.hot-box .hot-ticker{ flex:1 1 auto; min-width:0; display:flex; align-items:center; }

.ticker-window{ position:relative; height:28px; overflow:hidden; flex:1 1 auto; min-width:0; }
/* 세로 스택: 기본 block 흐름을 사용하여 translateY로 이동 */
.ticker-list{ margin:0; padding:0; list-style:none; }
/* flex 자식이 수축 가능하도록 min-width:0 추가 */
.ticker-item{
  height:28px; display:flex; align-items:center; gap:6px;
  white-space:nowrap; cursor:pointer; user-select:none;
  width:100%; max-width:100%;
  min-width:0;                 /* ⬅️ 추가 */
}
/* ✅ 티커 숫자 배지: 원형 + 고정 크기 + 수축 금지 + 숫자폭 고정 */
.badge-rank{
  /* 레이아웃 고정 */
  flex: 0 0 20px;           /* grow=0, shrink=0, basis=20px */
  width: 20px;
  height: 20px;
  min-width: 20px;
  min-height: 20px;
  aspect-ratio: 1 / 1;

  /* 가운데 정렬 */
  display:inline-flex;
  align-items:center;
  justify-content:center;

  /* 모양/색 */
  border-radius:999px;
  background:var(--accent);
  color:#fff;

  /* 타이포(숫자 폭·높이 통일) */
  font-size:12px;
  font-weight:900;
  line-height:1;
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    "Noto Sans Mono", "Roboto Mono", "JetBrains Mono",
    "Courier New", monospace;
  font-variant-numeric: tabular-nums lining-nums;
  font-feature-settings: "tnum" 1, "lnum" 1;

  /* 렌더링 안정화 */
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  contain: layout paint;
}

/* 요청: 업체명 전체 표시(폭 제한/말줄임 제거) */
.ticker-item .name{ font-weight:900; font-size:12px; flex:0 0 auto; min-width:auto; }
.ticker-item .dot{ opacity:.55; font-weight:900; }
/* 우측 내용은 말줄임표 고정 */
.ticker-item .intro{
  font-size:12px; flex:1 1 auto; min-width:0;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}

/* 공통 한 줄 말줄임 */
.ellip1{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

/* =============================
   Banner
============================= */
.banners{ display:flex; flex-direction:column; gap:8px; margin:4px 0 6px }
.banner{ position:relative; overflow:hidden; display:block; border-radius:16px; box-shadow:0 6px 16px var(--shadow); background:transparent; padding:0; }
.banner-img{ display:block; width:100%; height:auto; object-fit:contain; }
.banner-left, .banner-rt{ position:absolute; z-index:2 }
.banner-left{ left:12px; top:12px; }
.banner-left h3{ margin:0 0 2px; font-size:15px; color:#111 }
.banner-left .muted{ margin:0 0 6px; font-size:12px; color:#222 }
.tag-abs{
  position:absolute; background:rgba(255,255,255,.95); border:1px solid rgba(0,0,0,.06);
  border-radius:999px; padding:4px 8px; font-weight:800; font-size:11px; box-shadow:0 2px 8px rgba(0,0,0,.18);
  backdrop-filter: blur(2px); z-index:3;
}

/* =============================
   Categories / Filters
============================= */
.cats{ position:relative; margin:4px 0 4px }  /* ↑ 공간 확보 */
.sec-ttl{ margin:0 0 6px; font-size:14px }
.tops-head{ display:flex; align-items:center; justify-content:space-between; gap:8px; margin:0 0 6px; }

/* 정렬만 남김 */
.filter-row.only-sort{ display:flex; justify-content:flex-end; margin:4px 0 8px; gap:8px }
.filter{ position:relative }
.filter.inline{ margin-right:6px }                /* 툴 아이콘들과 간격 */

.drop{
  height:30px; padding:0 12px; border-radius:999px; border:1px solid var(--line);
  background:#fff; font-weight:900; font-size:12px; color:#111;
}
.drop.icon{
  width:32px; height:32px; padding:0;             /* 아이콘형 */
  display:grid; place-items:center; font-size:14px;
  border-radius:999px;
}

/* 기본 메뉴 */
.menu{
  position:absolute; top:38px; left:0; min-width:160px; background:#fff; color:#111;
  border:1px solid var(--line); border-radius:12px; padding:6px; box-shadow:0 16px 40px rgba(0,0,0,.18); z-index:30;
}
/* 우측 정렬(툴바 오른쪽에서 펼침) */
.menu.right{ left:auto; right:0; }

.menu.region-menu{ z-index:35; position:fixed; } /* 지역 메뉴는 고정 포지셔닝 */

/* 카테고리 */
/* ▶ 카테고리 라벨을 한 단계 더 작게(가독 유지 범위) */
/* 카테고리 변수 (간격/높이 조정) */
:root{
  /* ▶ 라인 맞추기 + 높이/간격 최소화 */
  --cat-h:        38px;   /* 행 높이 약간 낮춤 */
  --cat-gap:       6px;   /* 아이콘-텍스트 간격 축소 */
  --cat-badge:    20px;
  --cat-font:      8.6px;
  --cat-ico:      12px;
}

/* 카테고리 그리드: 위·아래 행 간격 줄이기 */
.cat-grid{
  display:grid;
  grid-template-columns:repeat(6, minmax(0,1fr));
  row-gap:4px;
  column-gap:6px;
  padding:0;
}

/* 두 번째 줄 첫 칸(빈 칸)용 spacer: 자리는 차지하지만 보이지 않고 클릭도 안 됨 */
.cat[data-key="spacer"]{
  visibility: hidden;
  pointer-events: none;
}

/* 타일: 내부 세로 간격을 변수로 통일 */
/* 각 카테고리를 둥근 사각형 박스로 */
.cat{
  height:var(--cat-h);
  padding:4px 2px;
  border-radius:14px;
  border:1px solid var(--line);
  background:#fff;
  box-shadow:0 2px 6px var(--shadow);
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:var(--cat-gap);
  color:#111;
  transition:
    transform .08s ease,
    box-shadow .08s ease,
    border-color .08s ease,
    background-color .08s ease;
  position:relative;
}

/* 선택된 카테고리: 테두리·배경만 살짝 강조 */
.cat.active{
  outline:0;
  border-color:color-mix(in oklab, var(--accent), #ffffff 60%);
  background:color-mix(in oklab, var(--accent), #ffffff 90%);
  box-shadow:0 3px 8px var(--shadow);
}

.cat:active{
  transform:scale(.97);
}

/* 아이콘/텍스트는 그대로 노출 */
.ico{
  display:flex; align-items:center; justify-content:center;
  font-size:var(--cat-ico);
  line-height:1;
  padding-block: 2px;               /* 위아래 살짝 여유 */
}
/* ▶ H/5/10/TP 원형 배지를 확실히 원으로 표시 */
.ico .badge{
  display:inline-flex; align-items:center; justify-content:center;
  width: var(--cat-badge); height: var(--cat-badge);
  min-width: var(--cat-badge); min-height: var(--cat-badge);
  border-radius: 999px;
  background: #fff;                 /* 필요 시 배경 유지 */
  border: 1px solid var(--line);    /* 가장자리 선(선택) */
  line-height:1;
  font-weight:900;
  font-size: calc(var(--cat-font) + 1px);
}

/* 카테고리 라벨(전체 제외) = 현재 크기의 절반 */
.cat[data-key]:not([data-key="all"]) .lbl{
  font-size: calc(var(--cat-font) * .5) !important;
}

/* ▶ ‘전체(지역)’을 제외한 카테고리 라벨을 절반 크기로 */
.cat:not([data-key="all"]) .lbl{
  font-size: calc(var(--cat-font) * .5);  /* 지금의 1/2 */
}

/* 그대로 사용 (전체/일반 모두 공통 컨테이너) */
/* ▶ 라벨은 살짝 위 여백을 줘서 원이 잘려 보이지 않게 */
.cat .lbl{
  width:100%;
  display:flex; align-items:center; justify-content:center;
  gap:3px; padding:0 4px; min-width:0;
  margin-top: 0;                    /* 위아래 공간 최소화 */
}

/* 지역명(‘전체’ 타일) 스타일은 그대로 유지 */
.cat[data-key="all"] .lbl .lbl-region{ font-size: clamp(9px, 2.7vw, 12px); }

/* ▶ 지역명: 줄임표 제거 + 컨테이너 폭에 맞춰 살짝 줄어드는 폰트 */
.lbl-region{
  flex:0 1 auto;                  /* 필요 시 수축 허용 */
  font-weight:900;
  white-space:nowrap;             /* 한 줄 유지 */
  overflow:visible;               /* 잘림/줄임표 제거 */
  text-overflow:clip;

  /* 화면/컨테이너 폭에 따라 살짝 줄어드는 폰트 */
  font-size: clamp(9px, 2.7vw, 12px);
  line-height:1;
  max-width:100%;
}

/* =============================
   Top Sections & Cards
============================= */
.tops{ margin:4px 0 4px }
.rank-tools{ display:flex; align-items:center; gap:10px; }
.toggle{ display:flex; align-items:center; gap:8px; font-weight:800; }
.toggle input[type="checkbox"]{
  appearance:none; -webkit-appearance:none; -moz-appearance:none;
  width:18px; height:18px; transform: scale(1.3); transform-origin:center;
  background:#fff; border:2px solid #111; border-radius:4px; position:relative;
}
.toggle input[type="checkbox"]:checked::after{
  content:""; position:absolute; left:3px; top:0px; width:8px; height:12px;
  border-right:3px solid var(--accent); border-bottom:3px solid var(--accent); transform: rotate(45deg);
}
.toggle .toggle-label{ font-size:15px; font-weight:900; }

.rank-tools .btn.shrink{
  transform: scaleX(.68); transform-origin:left center;
  height:34px; padding:0 14px; min-width:86px; font-size:15px; display:inline-grid; place-items:center;
}

.top-sec{ margin:4px 0 10px }
.top-head{ display:flex; align-items:center; justify-content:space-between; margin:0 2px 6px }
.top-head .ttl{ font-weight:900; font-size:13px }
.top-row{ display:flex; gap:8px; overflow:auto; padding-bottom:4px }

.mini{
  appearance:none; min-width:160px; text-align:left; border:1px solid var(--line);
  background:#fff; color:#111; border-radius:10px; overflow:hidden; box-shadow:0 4px 10px var(--shadow); position:relative;
}
.mini.editing{ cursor:grab; }
.mini.dragging{ opacity:.75; transform:scale(.985); }
.drag-handle{
  position:absolute; right:8px; bottom:8px; font-size:16px; line-height:1;
  border:1px dashed var(--line); border-radius:8px; padding:6px 8px;
  background:color-mix(in oklab, var(--accent), white 92%);
}
.m-thumb{ position:relative; width:100%; padding-top:54%; background-size:cover; background-position:center; background-repeat:no-repeat; background-color:#f2f2f4; }
.rank{ position:absolute; left:6px; top:6px; width:20px; height:20px; border-radius:999px; display:inline-grid; place-items:center; font-size:11px; font-weight:900; color:#fff; background:var(--accent); box-shadow:0 2px 6px var(--shadow); }
.m-meta{ padding:6px 8px; display:flex; flex-direction:column; gap:2px; background:#fff; color:#111; }

.ad-excerpt{ border-top:0; margin-top:4px; padding-top:0; display:flex; flex-direction:column; gap:2px; }
.ad-title{ font-weight:800; font-size:11.5px; }
.ad-pay{ font-size:11.5px; color:var(--accent); font-weight:900 }
.ad-mgr{ font-size:11.5px; color:#666 }
.ellip{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ellip2{ display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }

/* =============================
   하단 목록 재정렬
============================= */
.reorder-sec{ margin:10px 0; padding:8px; border:1px dashed var(--line); border-radius:12px; background:color-mix(in oklab, var(--surface), white 10%); }
.reorder-list{ list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:6px; max-height:260px; overflow:auto; }
.re-item{
  display:grid; grid-template-columns:24px 24px 1fr auto; align-items:center;
  gap:8px; padding:8px 10px; background:#fff; border:1px solid var(--line); border-radius:10px; cursor:grab; color:#111;
}
.re-item:active{ cursor:grabbing; }
.re-handle{ text-align:center; font-size:16px; }
.re-rank{ width:24px; height:24px; border-radius:999px; display:inline-grid; place-items:center; font-size:12px; font-weight:900; color:#fff; background:var(--accent); }
.re-name{ font-weight:900; }
.re-sub{ color:#666; font-size:12px; margin-left:6px; }

/* =============================
   목록 헤드/툴(Sticky)
============================= */
.list-head{
  position:sticky; top:0; z-index:5;
  display:flex; justify-content:space-between; align-items:center; margin:8px 0 6px;
  padding:4px 0; background:var(--bg);
}
/* “총 N개” 행 대신 정렬만 있는 행 */
.filter-row.only-sort{
  display:flex; align-items:center; gap:8px;
  margin:0 0 4px;
}

.view-tools{ display:flex; gap:6px; pointer-events:auto }
.tool{
  width:32px; height:32px; border-radius:999px; border:1px solid var(--line); background:#fff;
  display:grid; place-items:center; box-shadow:0 4px 10px var(--shadow); color:#111;
}
.tool.on{ outline:2px solid var(--accent); }

/* =============================
   Dropdowns & Bottom Sheet
============================= */
.mgr-portal{ position:fixed; inset:0; z-index:10001; outline:none; }
.mgr-backdrop{ position:absolute; inset:0; background:transparent; }
.mgr-pop{
  position:absolute; min-width:220px; background:#fff; color:#111;
  border:1px solid rgba(0,0,0,.1); border-radius:12px; box-shadow:0 16px 40px rgba(0,0,0,.18);
  padding:6px; overflow:hidden;
}
:root[data-theme="dark"]  .mgr-pop,
:root[data-theme="black"] .mgr-pop{ background:#000; color:#fff; border-color:rgba(255,255,255,.18); }
.mgr-opt{ width:100%; text-align:left; border:0; background:transparent; padding:10px 12px; border-radius:10px; display:flex; flex-direction:column; gap:2px; font-weight:800; }
.mgr-opt:hover{ background:rgba(0,0,0,.05) }
:root[data-theme="dark"]  .mgr-opt:hover,
:root[data-theme="black"] .mgr-opt:hover{ background:rgba(255,255,255,.06) }
.mo-name{ font-size:14px; font-weight:900 }
.mo-sub{ font-size:12px; color:#666 }
:root[data-theme="dark"]  .mo-sub,
:root[data-theme="black"] .mo-sub{ color:#a2a2a9 }
.mgr-empty{ padding:10px 12px; font-size:13px; color:#888 }

/* =============================
   ✔ 바텀시트: 우측/하단 잘림 방지
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
  max-height: calc(100dvh - 16px - env(safe-area-inset-bottom));  /* 한 화면에 딱 들어오게 */
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
.as-back{ width:32px; height:32px; border-radius:999px; border:1px solid var(--line); background:#fff; margin-right:6px; color:#111 }
.as-close{ width:32px; height:32px; border-radius:999px; border:1px solid var(--line); background:#fff; color:#111 }
.as-body{
  flex: 1 1 auto; min-height:0; overflow:auto; -webkit-overflow-scrolling: touch;
  padding:12px 2px 12px;
}

/* =============================
   실시간 Top10 리스트 (바텀시트)
   - 반응형 스케일(폰/태블릿) + 넘침 방지 + 간격 통일
============================= */
.hot10-list{
  list-style:none; margin:0; padding:0;
  display:flex; flex-direction:column; gap:6px;
}

/* 반응형 변수 (이 블록 내부에서만 사용) */
.hot10-list{
  --h-pad-x:  clamp(10px, 3.5vw, 14px);
  --h-pad-y:  clamp(8px,  2.2vw, 10px);
  --gap:      clamp(4px,  1.6vw, 8px);
  --badge:    clamp(22px, 4.6vw, 26px);
  --fs-name:  clamp(12px, 3.2vw, 14px);
  --fs-intro: clamp(12px, 3.0vw, 13px);
}

.hot10-item{
  width:100%; box-sizing:border-box;
  display:grid;                                   /* ← grid로 간격/정렬 고정 */
  grid-template-columns: var(--badge) minmax(0,34%) auto 1fr;
  align-items:center; column-gap:var(--gap);
  padding:var(--h-pad-y) var(--h-pad-x);
  border-radius:12px; border:1px solid var(--line);
  background:#fff; color:#111; font-weight:800;
  overflow:hidden; min-width:0;
}
.hot10-item > *{ min-width:0; }                   /* 자식도 수축 허용 */

/* ✅ 바텀시트 숫자 배지도 동일 원칙 적용 */
.h-rank{
  /* 레이아웃 고정(반응형 변수 사용) */
  flex: 0 0 var(--badge);
  width: var(--badge);
  height: var(--badge);
  min-width: var(--badge);
  min-height: var(--badge);
  aspect-ratio: 1 / 1;

  /* 가운데 정렬 */
  display:inline-flex;          /* grid→inline-flex로 통일 */
  align-items:center;
  justify-content:center;

  /* 모양/색 */
  border-radius:999px;
  background:var(--accent);
  color:#fff;

  /* 타이포(숫자 폭·높이 통일) */
  font-size:12px;
  font-weight:900;
  line-height:1;
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    "Noto Sans Mono", "Roboto Mono", "JetBrains Mono",
    "Courier New", monospace;
  font-variant-numeric: tabular-nums lining-nums;
  font-feature-settings: "tnum" 1, "lnum" 1;

  /* 렌더링 안정화 */
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  contain: layout paint;
}

/* 업체명: 고정 비율 영역 + 말줄임 (반응형 폰트) */
.h-name{
  font-weight:900; font-size:var(--fs-name);
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}

/* 구분 점: 고정폭, 여백 최소화(간격 통일) */
.h-dot{
  opacity:.6; font-weight:900; line-height:1;
  padding:0 .15em;                                /* 최소 여백 */
  white-space:nowrap;
}

/* 소개: 남은 공간 모두 사용 + 우측 말줄임 (반응형 폰트) */
.h-intro{
  color:#666; font-weight:700; font-size:var(--fs-intro);
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}

/* 바텀시트를 최상단으로 */
.action-mask{ z-index:100000; }

/* '전체' 제외 9개 카테고리 라벨만 축소 */
.cat[data-key="hopper"]  .lbl,
.cat[data-key="point5"]  .lbl,
.cat[data-key="ten"]     .lbl,
.cat[data-key="tenpro"]  .lbl,
.cat[data-key="onep"]    .lbl,
.cat[data-key="nrb"]     .lbl,
.cat[data-key="kara"]    .lbl,
.cat[data-key="bar"]     .lbl,
.cat[data-key="lounge"]  .lbl{
  display:inline-block;          /* transform이 라벨에만 적용되게 */
  transform: scale(0.8);         /* ← 보이는 크기 정확히 절반 */
  transform-origin: center;
  line-height: 1;
  font-weight: 900;              /* 얇아보이는 현상 방지 */
}

/* 가라오케 라벨은 한 줄로 고정 */
.cat[data-key="kara"] .lbl{
  white-space: nowrap;     /* 줄바꿈 금지 */
  word-break: keep-all;    /* CJK 단어 내부 줄바꿈 방지 */
}

/* (옵션) 혹시 넘치면 살짝만 축소하고 가운데 정렬 유지 */
.cat[data-key="kara"] .lbl{
  font-size: calc(var(--cat-font) * .85);
  line-height: 1;
}
/* ── 검색창 폰트 사이즈/굵기 통일: 16px / 400 ── */
.search-wrap :deep(input[type="search"]),
.search-wrap :deep(input[type="text"]),
.search-wrap :deep(input) {
  font-size: 16px !important;
  font-weight: 300 !important;
}
.search-wrap :deep(input::placeholder) {
  font-size: 16px !important;
  font-weight: 300 !important;   /* 더 얇게 */
  opacity: .65 !important;       /* 살짝 더 옅게 */
}
/* ===== 운영자 순서 편집 툴바(기준과 동일) - 맨 아래에 추가 ===== */
.orders-head{ margin:6px 0 4px; }
.orders-head .rank-tools{
  display:flex; align-items:center; justify-content:space-between; gap:10px;
}
.orders-head .toggle{
  display:flex; align-items:center; gap:8px; font-weight:800;
}
.orders-head .toggle input[type="checkbox"]{
  appearance:none; width:18px; height:18px; background:transparent;
  border:2px solid var(--fg, #111); border-radius:4px; position:relative;
}
.orders-head .toggle input[type="checkbox"]:checked::after{
  content:""; position:absolute; left:3px; top:0px; width:8px; height:12px;
  border-right:3px solid var(--accent); border-bottom:3px solid var(--accent);
  transform:rotate(45deg);
}
.orders-head .toggle .toggle-label{ font-size:14px; font-weight:900; }
.orders-head .tools-right{ display:flex; align-items:center; gap:6px; }

.orders-head .icon-btn{
  width:34px; height:34px; border-radius:999px; border:1px solid var(--line);
  background:var(--surface, #fff); display:grid; place-items:center;
  box-shadow:0 4px 10px var(--shadow); color:var(--fg, #111);
}
.orders-head .icon-btn svg{ width:18px; height:18px }

/* ===== 저장 버튼: 연한 핑크 배경 ===== */
.orders-head .save-btn{
  height:34px; padding:0 12px; font-weight:900;
  color:#111 !important; -webkit-text-fill-color:#111 !important;

  /* 연한 핑크 배경/테두리 */
  background:#FFE6EF !important;          /* 연한 핑크 */
  border:1px solid #FFC7D8 !important;     /* 조금 진한 핑크 라인 */
  box-shadow:0 4px 10px var(--shadow);
}

.orders-head .save-btn:disabled{
  color:#444 !important; -webkit-text-fill-color:#444 !important;
}

.hero-wrap{ position:relative; }
/* 기업회원 빠른 버튼 섹션 여백 */
.biz-quick-row{ margin: 8px 0 4px; }

/* 기업회원 빠른 버튼 섹션 여백 */
.biz-quick-row{ margin: 8px 0 4px; }

/* 페이지 안에서 쓰는 '업체등록/Top5 등록' 토글 버튼 */
.sqc-btn{
  font-weight: 800; font-size: 12px;
  padding: 8px 14px; border-radius: 999px;
  border: 1px solid var(--line); background: #fff; color:#111;
  box-shadow: 0 4px 10px var(--shadow);
}

/* ✅ 광고신청(→ 배너 등록) 버튼: 티커 아래, 배너 위 섹션 */
.banner-cta{
  margin: 4px 0 4px;
  display:flex;
  justify-content:flex-start;  /* 필요하면 center 로 바꿔도 됨 */
}

/* 광고신청/배너등록 버튼 공통 스타일 */
.ad-btn{
  font-weight: 900;
  font-size: 12px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: #fff;
  color: #111;
  box-shadow: 0 4px 10px var(--shadow);
}

/* ───────── 공통: 연핑크 CTA 버튼(배너등록 / Top5 등록 / 일반등록) ───────── */
.pink-cta{
  background: #FFE6EF;          /* 연핑크 배경 */
  border-color: #FFC7D8;        /* 조금 진한 핑크 테두리 */
  color: #8A2241;               /* 진한 핑크 텍스트 */
  font-weight: 800;
}

.pink-cta:active{
  transform: translateY(1px);
  box-shadow: 0 2px 6px rgba(0,0,0,.18);
}

/* 배너 등록 버튼 앞쪽 화살표 3개 */
.arrow-3{
  margin-right: 4px;
  font-size: 11px;
  letter-spacing: 1px;          /* 화살표 사이 간격 살짝 띄우기 */
}

/* 리스트 상단에 들어간 '일반등록' 버튼 정렬용 */
.list-reg-btn{
  margin-left: 6px;        /* ▶ 이제 오른쪽에 있어서 왼쪽 여백 */
  height: 30px;
  padding-inline: 10px;
  border-radius: 999px;
  font-size: 12px;
}

/* Top5 제목 오른쪽에 붙는 Top5 등록 버튼 */
.top5-btn{
  margin-left: auto;       /* 제목과 자동 간격 → 오른쪽 정렬 */
  height: 26px;
  padding: 0 10px;
  font-size: 12px;
  border-radius: 999px;
}

/* ========= 등록 패널 오버레이 ========= */
/* ========= 버튼 바로 밑에 붙는 플로팅 패널 ========= */
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

</style>
