<!-- src/pages/MainPage.vue -->
<template>
  <main class="page">
    <!-- ▼▼ 이벤트 오버레이 (gangtox.com 접속 & 미해제 & 스위치 ON 일 때만) ▼▼ -->
    <EventOverlay
      v-if="showEvent"
      @close="onCloseEvent"
      @dismiss-day="onDismissDay"
      @open-detail="goEventDetail"
    />

    <!-- ▲▲ 이벤트 오버레이 끝 ▲▲ -->

    <!-- 상단: 검색 -->
    <section class="top search-wrap search-lock">
      <SearchBar v-model="q" @search="doSearch" />

      <!-- 👇 기사 한줄 (검색창과 동일 세로폭) -->
      <section class="news">
        <div class="news-bar">
          <div class="news-left">
            <span class="news-ttl">기사한줄</span>
            <!-- ✅ 자동 순환되는 currentNews 사용 + NEW 뱃지 제거 -->
            <span class="news-headline ellip" @click="openNews(currentNews)">
              {{ currentNews.title }}
            </span>
          </div>

          <!-- 오른쪽 소형 더보기 -->
          <div class="news-more in-bar">
            <button class="more-btn" type="button" @click="newsOpen = !newsOpen">
              {{ newsOpen ? '접기' : '더' }}
            </button>
          </div>
        </div>

        <!-- 더보기 클릭 시, 아래로 이전 기사 목록 펼침 -->
        <ul v-if="newsOpen" class="news-list">
          <li
            v-for="(n, i) in olderNews"
            :key="n.id || i"
            class="news-item"
            @click="openNews(n)"
          >
            <span class="dot">•</span>
            <span class="txt ellip">{{ n.title }}</span>
            <!-- ✅ NEW 뱃지 제거 -->
          </li>
        </ul>
      </section>

      <!-- 유형 칩(전체/하퍼/…) : '전체' 칩 안에 지역 드롭다운 포함 -->
      <div class="type-row" aria-label="유형 선택">
        <button
          ref="allChipRef"
          class="type-chip all-chip"
          :class="{ on: type==='all' }"
          type="button"
          @click="openMacroMenu"
        >
          <span class="label">지역</span>
          <span v-if="macro !== 'all'" class="macro-mini">{{ macroLabel(macro) }}</span>
          <svg class="caret" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
            <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <button
          v-for="t in typeChips"
          :key="t.key"
          class="type-chip"
          :class="{ on: type===t.key }"
          type="button"
          @click="setType(t.key)"
        >{{ t.label }}</button>
      </div>

      <!-- 전체 칩 지역 드롭다운: portal -->
      <teleport to="body">
        <div
          v-if="macroOpen"
          class="macro-portal"
          tabindex="-1"
          @keydown.esc="macroOpen=false"
        >
          <div class="macro-backdrop" @click="macroOpen=false"></div>
          <div class="macro-pop" :style="macroMenuStyle">
            <button
              v-for="m in macroOptions"
              :key="m.key"
              class="macro-item"
              type="button"
              :class="{ active: macro===m.key }"
              @click="selectMacro(m.key)"
            >{{ m.label }}</button>
          </div>
        </div>
      </teleport>
    </section>

    <!-- ▽ 운영자 전용: 순서 편집 툴바 -->
    <section v-if="canEdit" class="orders-head">
      <div class="rank-tools">
        <label class="toggle">
          <input type="checkbox" v-model="editMode" @change="onEnterEdit" />
          <span class="toggle-label">현황판 순서 편집</span>
        </label>

        <div class="tools-right">
          <!-- 새로고침(왼쪽) -->
          <button
            class="icon-btn"
            :disabled="savingOrders"
            @click="refresh"
            title="새로고침"
            aria-label="새로고침"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M21 12a9 9 0 1 1-2.64-6.36"/>
              <path d="M21 3v6h-6"/>
            </svg>
          </button>
          <!-- 저장(오른쪽) -->
          <button
            class="btn primary save-btn"
            :disabled="!editMode || savingOrders"
            @click="saveOrders"
          >
            {{ savingOrders ? '저장 중…' : '저장' }}
          </button>
        </div>
      </div>
    </section>

    <!-- ▼▼▼ 업체 현황판 ▼▼▼ -->
    <section class="list-head" id="list">
      <!-- (정렬 드롭다운이 있다면 여기 유지) -->

      <!-- ▼ 가게찾기와 100% 동일한 아이콘 바 ▼ -->
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
          :class="{ on: near.enabled }"
          title="내 주변 보기(10km)"
          aria-label="내 주변 보기(10km)"
          type="button"
          @click.stop.prevent="openNearby"
          @touchstart.stop.prevent="openNearby"
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
          <svg v-if="isListView" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M4 7h16M4 12h16M4 17h16"/>
          </svg>
          <!-- 현재 두칸보기일 때: 그리드 아이콘 -->
          <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
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

    <!-- ▽ 편집 리스트(드래그) -->
    <section v-if="canEdit && editMode" class="reorder-sec">
      <h4 class="sec-ttl">현황판 노출 순서 편집</h4>
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
          <span class="re-sub ellip">{{ s.region }} · {{ mapCat[s.category] || s.category }}</span>
        </li>
      </ul>
      <div class="re-hint muted small">
        * 현재 보기의 상위 {{ EDITABLE_LIMIT }}개 항목만 편집합니다. 저장하면 모든 사용자에게 적용됩니다.
      </div>
    </section>

    <!-- ===== 한줄 보기 ===== -->
    <section v-if="isListView" class="list">
      <article v-for="s in filtered" :key="s.id" class="row-card">
        <div class="r-left">
          <!-- 왼쪽: 사진만 -->
          <div class="thumb-wrap">
            <div
              class="thumb wide click"
              :style="bgStyle(thumbOf(s))"
              @click.stop.prevent="noop"
              @touchstart.passive="tapStart"
              @touchmove.passive="tapMove"
              @touchend.stop.prevent="tapEnd(() => openStore(s))"
              @mousedown="mouseStart"
              @mousemove="mouseMove"
              @mouseup="mouseEnd(() => openStore(s))"
            ></div>
          </div>
        </div>

        <!-- 오른쪽: 정보 헤더 + 3개 지표 (단일 .r-right 안에 모두 배치) -->
        <div class="r-right tight">
          <!-- 정보 헤더 (같은 줄) -->
          <div class="info-line">
            <div
              class="info-name ellip click"
              @click.stop.prevent="noop"
              @touchstart.passive="tapStart"
              @touchmove.passive="tapMove"
              @touchend.stop.prevent="tapEnd(() => openStore(s))"
              @mousedown="mouseStart"
              @mousemove="mouseMove"
              @mouseup="mouseEnd(() => openStore(s))"
            >{{ s.name }}</div>
            <div class="info-sub nowrap">
              {{ s.region }} · {{ mapCat[s.category] || s.category }}
            </div>
          </div>

          <!-- 3개 지표(맞출방/필요인원/혼잡도) -->
          <div class="metric-wide" v-match-thumb>
            <button class="metric big"
                    type="button"
                    :class="{ editable: canEditStore(s) }"
                    @click="canEditStore(s) && openMetricEditor(s, 'rooms')">
              <!-- 🔹 rooms_biz 준비 전에는 숫자 대신 대시(—) -->
              <div class="num">{{ isRoomsBizReady ? s.match : '—' }}</div>
              <div class="lbl">맞출방</div>
            </button>

            <button class="metric big"
                    type="button"
                    :class="{ editable: canEditStore(s) }"
                    @click="canEditStore(s) && openMetricEditor(s, 'persons')">
              <div class="num">{{ isRoomsBizReady ? s.persons : '—' }}</div>
              <div class="lbl">필요인원</div>
            </button>

            <div class="metric big demand" :class="wifiColor(s)">
              <div class="wifi-dot mini-wifi" :class="wifiColor(s)" aria-label="혼잡도">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
                  <path d="M8.5 16a6 6 0 0 1 7 0"/>
                  <path d="M12 20h.01"/>
                </svg>
              </div>
              <!-- ✅ 혼잡도 텍스트도 준비 전에는 감춤 -->
              <div class="lbl">{{ isRoomsBizReady ? statusLabel(s) : '—' }}</div>
            </div>
          </div>
        </div>

        <!-- 하단 액션 4개(초톡/담당/채팅/게시판) -->
        <div class="r-actions chip-row actions" @click.stop>
          <!-- 초톡 -->
          <button class="chip action" type="button"
                  @click.stop.prevent="noop"
                  @touchstart.stop.passive="chotokTouchStart($event, s)"
                  @touchmove.stop.passive="chotokTouchMove($event)"
                  @touchend.stop.prevent="(cancelChotokHold(), tapEnd(() => openChotok(s)))"
                  @mousedown.stop="chotokMouseStart($event, s)"
                  @mousemove.stop="chotokMouseMove($event)"
                  @mouseup.stop="(cancelChotokHold(), mouseEnd(() => openChotok(s)))"
                  @mouseleave.stop="cancelChotokHold">
            <i class="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <rect x="2" y="2" width="20" height="20" rx="6" ry="6"></rect>
                <text x="12" y="15" text-anchor="middle" font-size="10" fill="#fff" font-weight="900">강</text>
              </svg>
            </i>
            <span class="txt">초톡</span>
          </button>

          <!-- 담당 -->
          <!-- (한줄 보기 r-actions 안) 담당 버튼 - 담당자 리스트 시트 열기 -->
          <button class="chip action" type="button"
                  @click.stop="openManagerList(s)"
                  @touchend.stop.prevent="openManagerList(s)">
            <i class="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5z"/>
                <path d="M2 21a10 10 0 0 1 20 0z"/>
              </svg>
            </i>
            <span class="txt">담당</span>
          </button>

          <!-- 채팅(오픈채팅) -->
          <button class="chip action" type="button"
                  @click.stop.prevent="noop"
                  @touchstart.passive="tapStart"
                  @touchmove.passive="tapMove"
                  @touchend.stop.prevent="tapEnd(() => openOpenChat(s))"
                  @mousedown="mouseStart"
                  @mousemove="mouseMove"
                  @mouseup="mouseEnd(() => openOpenChat(s))">
            <i class="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 2L11 13"/>
                <path d="M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </i>
            <span class="txt">채팅</span>
          </button>

          <!-- (list 뷰) -->
          <button class="chip action" type="button"
                  @click.stop.prevent="noop"
                  @touchstart.passive="tapStart"
                  @touchmove.passive="tapMove"
                  @touchend.stop.prevent="tapEnd(() => openStoreBoard(s))"
                  @mousedown="mouseStart"
                  @mousemove="mouseMove"
                  @mouseup="mouseEnd(() => openStoreBoard(s))">
            <i class="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M5 2h10l4 4v16H5z"/>
                <path d="M15 2v4h4"/>
                <rect x="7" y="10" width="10" height="2" rx="1"/>
                <rect x="7" y="14" width="10" height="2" rx="1"/>
              </svg>
            </i>
            <span class="txt">게시판</span>
          </button>
        </div>
      </article>
    </section>

    <!-- ===== 두칸 보기 ===== -->
    <section v-else class="grid">
      <article v-for="s in filtered" :key="s.id" class="grid-card">
        <!-- grid 뷰: 카드 우상단 핀 (상태 클래스 연결) -->
        <div class="wifi-pin grid-pin" :class="wifiColor(s)" aria-label="혼잡도">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
            <path d="M8.5 16a6 6 0 0 1 7 0"/>
            <path d="M12 20h.01"/>
          </svg>
        </div>

        <div class="row-top">
          <div
            class="thumb small click"
            :style="bgStyle(thumbOf(s))"
            @click.stop.prevent="noop"
            @touchstart.passive="tapStart"
            @touchmove.passive="tapMove"
            @touchend.stop.prevent="tapEnd(() => openStore(s))"
            @mousedown="mouseStart"
            @mousemove="mouseMove"
            @mouseup="mouseEnd(() => openStore(s))"
          ></div>

          <div class="meta">
            <div
              class="g-name ellip click"
              @click.stop.prevent="noop"
              @touchstart.passive="tapStart"
              @touchmove.passive="tapMove"
              @touchend.stop.prevent="tapEnd(() => openStore(s))"
              @mousedown="mouseStart"
              @mousemove="mouseMove"
              @mouseup="mouseEnd(() => openStore(s))"
            >{{ s.name }}</div>
            <div class="g-sub ellip">{{ s.region }} · {{ mapCat[s.category] || s.category }}</div>
            <!-- 담당 표시 제거 -->
          </div>
        </div>

        <!-- ▶ 두칸보기 지표: 맞출방 / 필요인원  (폭 축소 + 중앙 배치) -->
        <div class="mini-stats g-mini-stats">
          <button class="mini"
                  type="button"
                  :class="{ editable: canEditStore(s) }"
                  @click="canEditStore(s) && openMetricEditor(s, 'rooms')">
            <div class="num">{{ isRoomsBizReady ? s.match : '—' }}</div>
            <div class="lbl">맞출방</div>
          </button>
          <button class="mini"
                  type="button"
                  :class="{ editable: canEditStore(s) }"
                  @click="canEditStore(s) && openMetricEditor(s, 'persons')">
            <div class="num">{{ isRoomsBizReady ? s.persons : '—' }}</div>
            <div class="lbl">필요인원</div>
          </button>
        </div>

        <!-- 액션(아이콘만 + 중앙 정렬) -->
        <div class="chip-row actions" @click.stop>
          <button class="chip action" type="button"
                  aria-label="초톡"
                  @click.stop.prevent="noop"
                  @touchstart.stop.passive="chotokTouchStart($event, s)"
                  @touchmove.stop.passive="chotokTouchMove($event)"
                  @touchend.stop.prevent="chotokTouchEnd(s)"
                  @mousedown.stop="chotokMouseStart($event, s)"
                  @mousemove.stop="chotokMouseMove($event)"
                  @mouseup.stop="chotokMouseEnd(s)"
                  @mouseleave.stop="cancelChotokHold">
            <i class="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <rect x="2" y="2" width="20" height="20" rx="6" ry="6"></rect>
                <text x="12" y="15" text-anchor="middle" font-size="10" fill="#fff" font-weight="900">강</text>
              </svg>
            </i>
            <span class="txt">초톡</span>
          </button>

          <!-- (두칸 보기 grid-card 안) 담당 버튼 - 담당자 리스트 시트 열기 -->
          <button class="chip action" type="button"
                  aria-label="담당"
                  @click.stop="openManagerList(s)"
                  @touchend.stop.prevent="openManagerList(s)">
            <i class="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5z"/>
                <path d="M2 21a10 10 0 0 1 20 0z"/>
              </svg>
            </i>
            <span class="txt">담당</span>
          </button>

          <button class="chip action" type="button"
                  aria-label="채팅"
                  @click.stop.prevent="noop"
                  @touchstart.passive="tapStart"
                  @touchmove.passive="tapMove"
                  @touchend.stop.prevent="tapEnd(() => openOpenChat(s))"
                  @mousedown="mouseStart"
                  @mousemove="mouseMove"
                  @mouseup="mouseEnd(() => openOpenChat(s))">
            <i class="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 2L11 13"/>
                <path d="M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </i>
            <span class="txt">채팅</span>
          </button>

          <!-- (grid 뷰) -->
          <button class="chip action" type="button"
                  @click.stop.prevent="noop"
                  @touchstart.passive="tapStart"
                  @touchmove.passive="tapMove"
                  @touchend.stop.prevent="tapEnd(() => openStoreBoard(s))"
                  @mousedown="mouseStart"
                  @mousemove="mouseMove"
                  @mouseup="mouseEnd(() => openStoreBoard(s))">
            <i class="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M5 2h10l4 4v16H5z"/>
                <path d="M15 2v4h4"/>
                <rect x="7" y="10" width="10" height="2" rx="1"/>
                <rect x="7" y="14" width="10" height="2" rx="1"/>
              </svg>
            </i>
            <span class="txt">게시판</span>
          </button>
        </div>
      </article>
    </section>
    <!-- ▲▲▲ 업체 현황판 끝 ▲▲▲ -->

    <!-- ====== 담당 드롭다운 포털 ====== -->
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

    <!-- ====== 액션 모달(바텀시트) ====== -->
    <div v-if="sheet.open" class="action-mask" @click.self="closeSheet">
      <section class="action-sheet" role="dialog" aria-modal="true">
        <header class="as-header">
          <strong>{{ sheet.store?.name }}</strong>
          <button class="as-close" aria-label="닫기" @click="closeSheet" type="button">✕</button>
        </header>

        <div v-if="sheet.type==='invite'" class="as-body">
          <h4 class="as-title">초대톡 보기</h4>
          <ul class="list">
            <li v-for="(msg,i) in sheet.store?.invites || []" :key="i" class="li">
              <span class="dot">•</span> <span>{{ msg }}</span>
            </li>
          </ul>
          <div class="as-actions">
            <button class="btn primary" @click="openChotok(sheet.store)" type="button">초톡 열기</button>
            <button class="btn" @click="closeSheet" type="button">닫기</button>
          </div>
        </div>

        <!-- ✅ 담당자 리스트 시트 -->
        <div v-else-if="sheet.type==='managerList'" class="as-body">
          <h4 class="as-title">담당자 선택</h4>

          <ul class="mgr-list-sheet">
            <li
              v-for="(m,i) in managersOf(sheet.store)"
              :key="i"
              class="mgr-li-sheet"
              @click="onSelectManagerFromList(m, i)"
            >
              <div class="mgr-li-left">
                <div class="mgr-thumb" :style="bgStyle(thumbOf(sheet.store))"></div>
              </div>

              <div class="mgr-li-main">
                <div class="mgr-li-name">
                  {{ sheet.store?.name || '업체' }} · {{ m.name || '담당자' }}
                </div>
                <div class="mgr-li-sub">
                  <span v-if="m.phone">{{ m.phone }}</span>
                  <span v-else-if="m.talkId">@{{ m.talkId }}</span>
                  <span v-else class="muted">연락처 미등록</span>
                </div>
              </div>

              <div class="mgr-li-arrow">›</div>
            </li>
          </ul>

          <div class="as-actions">
            <button class="btn" type="button" @click="closeSheet">닫기</button>
          </div>
        </div>

        <!-- 기존 단일 담당자 시트(다른 곳에서 사용할 수 있으니 그대로 유지) -->
        <div v-else-if="sheet.type==='manager'" class="as-body">
          <h4 class="as-title">담당자 연결</h4>
          <div class="kv"><span class="k">담당자</span><span class="v">{{ sheet.store?.manager || '미지정' }}</span></div>
          <div class="kv"><span class="k">연락처</span><span class="v"><a :href="`tel:${sheet.store?.phone}`">{{ sheet.store?.phone }}</a></span></div>
          <div class="kv" v-if="sheet.store?.talkId"><span class="k">연결톡</span><span class="v">@{{ sheet.store?.talkId }}</span></div>

          <div class="as-actions">
            <button class="btn primary" @click="openConnectTalk(sheet.store)" type="button">연결톡 열기</button>
            <button class="btn" @click="callPhone(sheet.store?.phone)" type="button">전화걸기</button>
            <button class="btn" @click="copyToClipboard(sheet.store?.phone)" type="button">번호복사</button>
          </div>
        </div>

        <div v-else-if="sheet.type==='event'" class="as-body">
          <h4 class="as-title">이벤트</h4>
          <ul class="list">
            <li v-for="(ev,i) in sheet.store?.events || []" :key="i" class="li">
              <span class="badge small">EVENT</span>
              <span>{{ ev }}</span>
            </li>
          </ul>
          <div class="as-actions">
            <button class="btn primary" @click="openChotok(sheet.store)" type="button">이벤트 문의</button>
            <button class="btn" @click="closeSheet" type="button">닫기</button>
          </div>
        </div>

        <!-- ✅ 지표 수정 폼 -->
        <div v-else-if="sheet.type==='metric'" class="as-body">
          <h4 class="as-title">현황 지표 수정</h4>

          <!-- 방 수 -->
          <div class="kv"><span class="k">최대방수</span>
            <span class="v"><input type="number" min="0" v-model.number="metricForm.totalRooms" class="inp"></span>
          </div>
          <div class="kv"><span class="k">맞출방</span>
            <span class="v"><input aria-label="맞출방" type="number" min="0" v-model.number="metricForm.match" class="inp"></span>
          </div>

          <!-- 인원 -->
          <div class="kv"><span class="k">최대인원</span>
            <span class="v"><input type="number" min="0" v-model.number="metricForm.maxPersons" class="inp"></span>
          </div>
          <div class="kv"><span class="k">필요인원</span>
            <span class="v"><input aria-label="필요인원" type="number" min="0" v-model.number="metricForm.persons" class="inp"></span>
          </div>

          <div class="as-actions">
            <button class="btn primary" type="button" @click="saveMetric">저장</button>
            <button class="btn" type="button" @click="closeSheet">취소</button>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeMount, onUnmounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import SearchBar from '@/components/SearchBar.vue'
import GuideOverlay from '@/components/GuideOverlay.vue'
import { db, firebaseReady } from '@/firebase'
import {
  collection, onSnapshot, query, orderBy, doc,
  getDoc, setDoc, updateDoc, serverTimestamp, getDocs, limit
} from 'firebase/firestore'
import { getStorage, ref as sRef, getDownloadURL } from 'firebase/storage'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import EventOverlay from '@/components/EventOverlay.vue'
// [디버그] Firestore 내부 로그를 상세하게
import { setLogLevel } from 'firebase/firestore'
setLogLevel('error')

const router = useRouter()
const route  = useRoute()

/* ===== 내 주변 공통 이벤트/상수/보안체크 ===== */
const NEARBY_EVENT = 'open-nearby-map'          // 제휴관과 동일
const NEAR_KM = 10                               // 반경 10km
const GANGNAM_LOC = { lat: 37.4979, lng: 127.0276 } // 강남역

function isSecureOrigin(){
  const { protocol, hostname } = window.location
  if (protocol === 'https:') return true
  if (protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1')) return true
  return false
}

// 🔄 2025-11-16: rooms_biz 컬렉션이 권한/쿨다운 등으로 늦게 와도
//               일단 stores.match / stores.persons 값은 바로 보여주기 위해 true 로 시작
const isRoomsBizReady = ref(true)   // rooms_biz 최신값 도착 여부 (기본 true)

// === [내 주변] 상태 및 거리 유틸 ===
const near = ref({ enabled:false, lat:null, lng:null, radiusKm:NEAR_KM })
const distances = ref(new Map())

function latOf(s){ const g = s?.geo || s?.location || s?.loc
  if (g?.latitude != null) return Number(g.latitude)
  if (g?.lat != null)       return Number(g.lat)
  if (s?.lat != null)       return Number(s.lat)
  return NaN
}
function lngOf(s){ const g = s?.geo || s?.location || s?.loc
  if (g?.longitude != null) return Number(g.longitude)
  if (g?.lng != null)       return Number(g.lng)
  if (s?.lng != null)       return Number(s.lng)
  return NaN
}
function hasCoord(s){ const la = latOf(s), lo = lngOf(s); return Number.isFinite(la) && Number.isFinite(lo) }

function distanceKm(lat1, lon1, lat2, lon2){
  const R = 6371, toRad = (x)=> x * Math.PI/180
  const dLat = toRad(lat2-lat1), dLon = toRad(lon2-lon1)
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

// ▼ 템플릿(@click="openNearby")과 연결되는 별칭
const openNearby = () => goNearMe()

// 지도 라우팅 후보를 순차 시도
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
    }catch{}
  }
}

async function goNearMe(){
  const secure = isSecureOrigin()
  const hasGeo = 'geolocation' in navigator

  async function openNearbyWith(center, usedDefault){
    window.dispatchEvent(new CustomEvent(NEARBY_EVENT, {
      detail: { center, radiusKm: NEAR_KM, usedDefault }
    }))
    await pushMapRoute(center)
  }

  if (!secure || !hasGeo){
    await openNearbyWith(GANGNAM_LOC, true)
    alert('HTTPS가 아니어서 현재 위치를 가져올 수 없어요.\n기본 중심(강남역)으로 표시합니다.')
    return
  }

  try{
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true, timeout: 10000, maximumAge: 60000
      })
    })
    const center = { lat: pos.coords.latitude, lng: pos.coords.longitude }
    await openNearbyWith(center, false)
  }catch(err){
    await openNearbyWith(GANGNAM_LOC, true)
    const msg = String(err?.message || '')
    if (/denied|permission/i.test(msg))      alert('위치 권한이 거부되어 기본 중심(강남역)으로 표시합니다.')
    else if (/timeout/i.test(msg))           alert('위치 요청이 시간 초과되어 기본 중심(강남역)으로 표시합니다.')
    else                                     alert('현재 위치를 가져오지 못해 기본 중심(강남역)으로 표시합니다.')
  }
}

/* === 테마 & 뷰 전환 (통합/안전 버전) === */
const viewMode  = ref(route.query.view || localStorage.getItem('finder:view') || 'list')
const theme     = ref(String(route.query?.theme ?? localStorage.getItem('theme') ?? 'white'))
const isDark    = computed(() => theme.value === 'dark' || theme.value === 'black')

/** 리스트 뷰 여부 (공통) */
const isListView = computed(() => viewMode.value === 'list')

/** 템플릿 호환용 별칭 (view === 'list' / 'grid') */
const view = viewMode

function applyTheme(v = theme.value){
  document.documentElement.setAttribute('data-theme', v)
  localStorage.setItem('theme', v)
}
watch(theme, v => applyTheme(v), { immediate: true })

// 주소창의 ?theme= 변경되면 동기화
watch(() => route.query.theme, (nv) => { if (nv) theme.value = String(nv) })

// 주소창의 ?view= 변경되면 뷰 모드도 동기화
watch(() => route.query.view, (nv) => {
  if (nv === 'list' || nv === 'grid') {
    viewMode.value = nv
  }
})

/** 한줄/두칸 토글 (공통) */
function toggleViewMode(){
  // list → grid → list …
  const next = isListView.value ? 'grid' : 'list'
  viewMode.value = next
  localStorage.setItem('finder:view', next)
  router.replace({
    query: { ...route.query, view: next, theme: theme.value }
  }).catch(()=>{})
}

/** 명시적으로 목록/그리드 지정 (template 의 setView 호출용) */
function setView(mode){
  const next = mode === 'grid' ? 'grid' : 'list'
  viewMode.value = next
  localStorage.setItem('finder:view', next)
  router.replace({
    query: { ...route.query, view: next, theme: theme.value }
  }).catch(()=>{})
}

// 테마 토글: 현재 viewMode를 그대로 보존
function toggleTheme(){
  theme.value = (theme.value === 'white') ? 'dark' : 'white'
  router.replace({
    query: { ...route.query, theme: theme.value, view: viewMode.value }
  }).catch(()=>{})
}

/* === 이름 정규화 & id 매핑 헬퍼 (먼저 선언) === */
function _normName(s){
  return String(s || '')
    .toLowerCase()
    .replace(/[.\s]/g, '')                // 점/공백 제거 (레.이.블 → 레이블)
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width 제거
}
const _storeIdByName   = ref(new Map()) // normName -> storeId
const _storeIdByVendor = ref(new Map()) // vendorKey(lower) -> storeId
function rebuildStoreIndexes(){
  const byName = new Map()
  const byVendor = new Map()
  for (const s of (baseStores.value || [])) {
    const id = String(s.id || '')
    const nm = _normName(s.name || '')
    const vk = String(s.vendorKey || '').toLowerCase()
    if (id && nm) byName.set(nm, id)
    if (id && vk) byVendor.set(vk, id)
  }
  _storeIdByName.value = byName
  _storeIdByVendor.value = byVendor
}
function _hasStoreId(id){
  if (!id) return false
  return (baseStores.value || []).some(s => String(s.id) === String(id))
}

// === onSnapshot 실패(권한/네트워크) 시 1회 조회로 대체하는 헬퍼 ===
function onDocSnap(ref, onOk) {
  try {
    const unsub = onSnapshot(ref, (snap) => onOk(snap), async (err) => {
      console.warn('[onDocSnap] listener error:', err?.code || err)
      if (String(err?.code).includes('permission-denied')) {
        try {
          const once = await getDoc(ref)
          if (once.exists()) onOk(once)
        } catch (e) {
          console.warn('[onDocSnap] fallback getDoc failed:', e?.message || e)
        }
      }
    })
    return () => { try { unsub && unsub() } catch {} }
  } catch (e) {
    console.warn('[onDocSnap] attach failed immediately:', e?.message || e)
    getDoc(ref).then((once) => { if (once.exists()) onOk(once) }).catch(() => {})
    return () => {}
  }
}

function onQuerySnap(qRef, onOk) {
  try {
    const unsub = onSnapshot(qRef, (qs) => onOk(qs), async (err) => {
      console.warn('[onQuerySnap] listener error:', err?.code || err)
      if (String(err?.code).includes('permission-denied')) {
        try {
          const once = await getDocs(qRef)
          onOk(once)
        } catch (e) {
          console.warn('[onQuerySnap] fallback getDocs failed:', e?.message || e)
        }
      }
    })
    return () => { try { unsub && unsub() } catch {} }
  } catch (e) {
    console.warn('[onQuerySnap] attach failed immediately:', e?.message || e)
    getDocs(qRef).then(onOk).catch(() => {})
    return () => {}
  }
}

const showEvent = ref(false)
const showGuide = ref(false)
const openGuide = () => {
  showGuide.value = true
}

const closeGuide = () => {
  showGuide.value = false
}

// ==== 이벤트 노출 스위치/키 ====
const EVENT_ENABLED     = true
const EVENT_KEY         = 'event:open202510:hideUntil'
const EVENT_SESSION_KEY = 'event:open202510:seenSession'  // 👈 한 세션에서 한 번만 보기용
const EVENT_IMAGE       = '/event/gangtox-open.png?v=20251016'
const isAllowedHost = () => true
const _wantEvent = ref(false)
const _isMounted = ref(false)

function preloadEventImage(src){
  return new Promise((resolve) => {
    if (!src) return resolve()
    const img = new Image()
    img.src = src
    if (typeof img.decode === 'function') {
      img.decode().then(resolve).catch(resolve)
    } else {
      img.onload = () => resolve()
      img.onerror = () => resolve()
    }
  })
}
async function openEventSafely(flag){
  if (!flag) { showEvent.value = false; return }
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
  await preloadEventImage(EVENT_IMAGE).catch(()=>{})
  showEvent.value = true
}
function isHiddenByUser() {
  try {
    // ✅ 1) '오늘 하루 보지 않기' 로 7일 숨김
    const v = localStorage.getItem(EVENT_KEY)
    const until = Number(v || 0)
    if (Number.isFinite(until) && Date.now() < until) return true

    // ✅ 2) 이번 브라우저 탭(세션)에서 한 번 이미 닫았는지 체크
    const seen = sessionStorage.getItem(EVENT_SESSION_KEY)
    if (seen === '1') return true

    return false
  } catch {
    return false
  }
}
function onDismissDay() {
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000  // 7일
  try { localStorage.setItem(EVENT_KEY, String(Date.now() + SEVEN_DAYS)) } catch {}
  showEvent.value = false
}

function decideShowEvent(){
  const q = String(route?.query?.event || '').toLowerCase()
  const qOn  = q === 'on'
  const qOff = q === 'off'
  const flag = qOn || (EVENT_ENABLED && !qOff && isAllowedHost() && !isHiddenByUser())
  _wantEvent.value = flag
  if (_isMounted.value) openEventSafely(flag)
}
function onCloseEvent() {
  showEvent.value = false

  // 👇 이번 브라우저 탭에서는 다시 안 뜨도록 세션 플래그 저장
  try {
    sessionStorage.setItem(EVENT_SESSION_KEY, '1')
  } catch {}

  // 👉 라우터에 등록된 이름 'EventDetail' 로 이동
  router.push({ name: 'EventDetail' })
  // 또는 router.push({ path: '/event' }) 로 써도 됨
}

onBeforeMount(decideShowEvent)
onMounted(async () => {
  _isMounted.value = true
  await openEventSafely(_wantEvent.value)
  watch(() => route.query.event, decideShowEvent)
})

const TABBAR_H = 92
function getScrollEl(){ return document.scrollingElement || document.documentElement || document.body }
function getScrollY(){ const se = getScrollEl(); return se ? se.scrollTop || 0 : (window.pageYOffset || 0) }
function scrollToY(y, smooth = true){
  const se = getScrollEl()
  if (se?.scrollTo) se.scrollTo({ top: y, behavior: smooth ? 'smooth' : 'auto' })
  else window.scrollTo({ top: y, behavior: smooth ? 'smooth' : 'auto' })
}
function scrollIntoViewWithOffset(el, offset = TABBAR_H + 8, smooth = true){
  if (!el) return
  const rect = el.getBoundingClientRect()
  const targetY = getScrollY() + rect.top - offset
  scrollToY(Math.max(0, targetY), smooth)
}

const storage = getStorage()
const auth    = getAuth()

const EXPOSURE_KEY = 'gangtalk'

const q = ref('')
const doSearch = ()=>{}

/* ========= 뉴스 ========= */
const newsItems = ref([])
const newsOpen = ref(false)
const newsState = { marketing: [], config: [], admin: [], dashboard: [], col: [] }
const newsUnsubs = []
// ✅ 기사한줄 자동 순환용 인덱스 & 보이는 리스트(최신 10개)
const currentNewsIndex = ref(0)

// 최신 뉴스 10개만 순환 대상
const visibleNews = computed(() =>
  (newsItems.value || []).slice(0, 10)
)

// 현재 화면에 보여줄 기사
const currentNews = computed(() =>
  visibleNews.value.length
    ? visibleNews.value[currentNewsIndex.value]
    : { id: '', title: '' }
)

function tsToMs(t){
  if (!t) return 0
  if (typeof t === 'number') return t
  if (t?.toDate) return t.toDate().getTime()
  const ms = Date.parse(t)
  return Number.isFinite(ms) ? ms : 0
}
function normalizeItem(it, i, prefix='n'){
  return {
    id: it.id || `${prefix}_${i}`,
    title: it.title || it.text || '업데이트가 준비중입니다.',
    createdAt: it.createdAt || it.updatedAt || it.date || Date.now(),
    isNew: Boolean(it.isNew) || String(it.badge || '').toUpperCase() === 'NEW',
  }
}
function recomputeNews(){
  // 1) 운영자 페이지에서 정한 newsline(마케팅) 순서를 그대로 최상단에 둔다.
  const marketing = Array.isArray(newsState.marketing) ? newsState.marketing : []

  // 2) 나머지 소스들을 합치되, 마케팅과 중복되는 항목은 제거.
  const othersRaw = [
    ...newsState.config,
    ...newsState.admin,
    ...newsState.dashboard,
    ...newsState.col,
  ]

  const isDup = (a, b) => {
    if (a.id && b.id) return String(a.id) === String(b.id)
    return String(a.title||'').trim() === String(b.title||'').trim()
  }

  const othersDedup = othersRaw.filter(o =>
    !marketing.some(m => isDup(m, o))
  )

  // 3) 나머지는 최신순 정렬해서 뒤에 붙인다.
  const othersSorted = othersDedup.sort((a,b)=> tsToMs(b.createdAt) - tsToMs(a.createdAt))

  // 4) 최종 머지: [마케팅(운영자 지정 순서 유지)] + [기타(최신순)]
  const merged = marketing.length ? [...marketing, ...othersSorted] : othersSorted

  newsItems.value = merged.length ? merged : [
    { id:'n1', title:'강톡 업데이트: 현황판 지표 카드형으로 개선!', createdAt: Date.now() - 1000*60*20, isNew:true },
    { id:'n0', title:'새 제휴점 등록 가이드 오픈', createdAt: Date.now() - 1000*60*60*30 },
  ]
}

function subNewsMarketing(){
  try{
    const ref = doc(db, 'config', 'marketing')
    const u = watchWithLabel('news:config/marketing', ref, (snap)=>{
      const data = snap.exists() ? (snap.data() || {}) : {}
      const list = Array.isArray(data.newsline) ? data.newsline : []
      newsState.marketing = list.map((v,i)=> {
        const it = normalizeItem({
          id: v.id,
          text: v.text || v.title,
          createdAt: v.createdAt || v.ts || v.updatedAt,
          badge: v.badge,
          isNew: v.badge === 'NEW'
        }, i, 'mk')
        // id가 빠진 항목은 순서를 보존하는 보조 id를 부여(중복 제거/비교에 사용)
        if (!it.id) it.id = `mk_${i}__${(it.title||'').slice(0,40)}`
        return it
      })
      recomputeNews()
    })
    newsUnsubs.push(u)
  }catch(e){
    console.error('[FS][news:config/marketing] subNewsMarketing error:', e)
  }
}
function subNewsDoc(bucketKey, col, id){
  try{
    const ref = doc(db, col, id)
    const u = watchWithLabel(`news:${col}/${id}`, ref, (snap)=>{
      if (!snap.exists()){
        newsState[bucketKey] = []
        return recomputeNews()
      }
      const data = snap.data() || {}
      const listArr =
        (Array.isArray(data.items)     && data.items) ||
        (Array.isArray(data.newsItems) && data.newsItems) ||
        (Array.isArray(data.list)      && data.list) ||
        []
      const single = (data.title || data.text)
        ? [ { id:data.id || `${col}_${id}_single`, title:data.title || data.text, createdAt:data.createdAt || data.updatedAt || data.date || Date.now(), isNew: !!data.isNew } ]
        : []
      newsState[bucketKey] = [
        ...listArr.map((v,i)=>normalizeItem(v,i,`${bucketKey}a`)),
        ...single.map((v,i)=>normalizeItem(v,i,`${bucketKey}s`))
      ]
      recomputeNews()
    })
    newsUnsubs.push(u)
  }catch(e){
    console.error(`[FS][news:${col}/${id}] subNewsDoc error:`, e)
  }
}
function subNewsCollection(){
  try{
    const qRef = query(collection(db, 'news'))
    const u = watchWithLabel('news:collection(news)', qRef, (snap)=>{
      const list = snap.docs.map((d,i)=> normalizeItem({ id:d.id, ...d.data() }, i, 'col'))
      newsState.col = list
      recomputeNews()
    })
    newsUnsubs.push(u)
  }catch(e){
    console.error('[FS][news:collection(news)] subNewsCollection error:', e)
  }
}

onMounted(async () => {
  await firebaseReady
  subNewsMarketing()
  subNewsDoc('config', 'config', 'news')
  subNewsDoc('admin', 'admin', 'news')
  subNewsDoc('dashboard', 'dashboard', 'news')
  subNewsCollection()
  recomputeNews()
})

// ✅ 뉴스 목록이 바뀌면 인덱스 보정
watch(visibleNews, (list) => {
  if (!list.length) {
    currentNewsIndex.value = 0
    return
  }
  if (currentNewsIndex.value >= list.length) {
    currentNewsIndex.value = 0
  }
})

// ✅ 2~3초마다 자동으로 다음 뉴스로 순환 (여기선 2.5초)
let newsRotateTimer = null
onMounted(() => {
  newsRotateTimer = setInterval(() => {
    const len = visibleNews.value.length
    if (!len) return
    currentNewsIndex.value = (currentNewsIndex.value + 1) % len
  }, 2500) // 2500ms = 2.5초
})

onUnmounted(() => {
  if (newsRotateTimer) {
    clearInterval(newsRotateTimer)
    newsRotateTimer = null
  }
})

// 뉴스 NEW 판단 (지금은 뱃지를 안 쓰지만 로직은 남겨둠)
function isNewsNew(n){
  if(!n) return false
  const ms = tsToMs(n.createdAt)
  return (Date.now() - (ms || 0)) <= 1000*60*60*48 || Boolean(n.isNew)
}

const latestNews = computed(() =>
  (newsItems.value && newsItems.value.length)
    ? newsItems.value[0]
    : { id:'', title:'' }
)
const olderNews  = computed(() =>
  (newsItems.value && newsItems.value.length > 1)
    ? newsItems.value.slice(1)
    : []
)
const isLatestNew = computed(() => isNewsNew(latestNews.value))
function openNews(n){ if(!n) return; alert(n.title) }

/* 카테고리 (라벨 맵) */
const categories = [
  { key:'hopper',  label:'하퍼',     badge:'H' },
  { key:'point5',  label:'쩜오',     badge:'5' },
  { key:'ten',     label:'텐카페',   badge:'10' },
  { key:'tenpro',  label:'텐프로',   badge:'TP' },
  { key:'onep',    label:'일프로',   badge:'1P' },
  { key:'bar',     label:'바(bar)',  emoji:'🍸' },
  { key:'nrb',     label:'노래방',   emoji:'🎤' },
  { key:'kara',    label:'가라오케', emoji:'🎶' },
  { key:'etc',     label:'기타',     emoji:'➕' },
  { key:'lounge',  label:'라운지',   emoji:'🛋️' },
]
const mapCat = Object.fromEntries(categories.map(c=>[c.key,c.label]))

/* 유형 칩 목록 */
const typeChips = [
  { key:'hopper', label:'하퍼' },
  { key:'point5', label:'쩜오' },
  { key:'ten',    label:'텐카페' },
  { key:'tenpro', label:'텐프로' },
  { key:'onep',   label:'일프로' },
  { key:'bar',    label:'바(bar)' },
  { key:'nrb',    label:'노래방' },
  { key:'kara',   label:'가라오케' },
  { key:'etc',    label:'기타' },
]

/* 지역 드롭다운 */
const macroOptions = [
  { key:'all', label:'전체' },
  { key:'gn',  label:'강남' },
  { key:'bg',  label:'비강남' },
  { key:'gg',  label:'경기' },
  { key:'ic',  label:'인천' },
]
const macroLabel = (k)=> (macroOptions.find(o=>o.key===k)?.label || '전체')

const type  = ref('all')
function setType(k){ type.value = k }

const macro = ref('all')
const allChipRef = ref(null)
const macroOpen = ref(false)
const macroMenuStyle = ref({ top:'0px', left:'0px', width:'160px' })
function updateMacroMenuPos(){
  const el = allChipRef.value
  if(!el) return
  const rect = el.getBoundingClientRect()
  macroMenuStyle.value = {
    top:  `${rect.bottom + 6}px`,
    left: `${rect.left}px`,
    width: `${Math.max(rect.width, 140)}px`,
  }
}

// 1) 테마 토글: white ↔ dark  (※ 내부용, toggleTheme 와 동일 동작)
function onThemeToggle(){
  const next = theme.value === 'white' ? 'dark' : 'white'
  theme.value = next
  applyTheme(next)
  router.replace({
    query: { ...route.query, theme: next, view: viewMode.value }
  }).catch(()=>{})
}

function openMacroMenu(){
  type.value = 'all'
  macroOpen.value = !macroOpen.value
  if (macroOpen.value){
    updateMacroMenuPos()
    setTimeout(() => document.querySelector('.macro-portal')?.focus?.(), 0)
  }
}
function selectMacro(k){
  macro.value = k
  macroOpen.value = false
}
watch(macroOpen, (open)=>{
  if(open){
    updateMacroMenuPos()
    window.addEventListener('scroll', updateMacroMenuPos, true)
    window.addEventListener('resize', updateMacroMenuPos)
  }else{
    window.removeEventListener('scroll', updateMacroMenuPos, true)
    window.removeEventListener('resize', updateMacroMenuPos)
  }
})

const macroOf = (s)=>{
  const r = String(s.region || '')
  if (['강남','서초','송파','신사','논현'].includes(r)) return 'gn'
  if (r === '경기') return 'gg'
  if (r === '인천') return 'ic'
  return 'bg'
}

/* 썸네일 */
const FALLBACK_THUMB = {
  lounge : 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?q=80&w=1200&auto=format&fit=crop',
  bar    : 'https://images.unsplash.com/photo-1532634896-26909d0d4b6a?q=80&w=1200&auto=format&fit=crop',
  ten    : 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200&auto=format&fit=crop',
  point5 : 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1200&auto=format&fit=crop',
  hopper : 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop',
  nrb    : 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=1200&auto=format&fit=crop',
  kara   : 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?q=80&w=1200&auto=format&fit=crop',
  onep   : 'https://images.unsplash.com/photo-1514361892636-7f05f1d2710f?q=80&w=1200&auto=format&fit=crop',
  etc    : 'https://images.unsplash.com/photo-1521017432531-fbd92d59d4b1?q=80&w=1200&auto=format&fit=crop',
  default: 'https://images.unsplash.com/photo-1521017432531-fbd92d59d4b1?q=80&w=1200&auto=format&fit=crop',
}
async function resolveThumb(u){
  const url = (String(u || '').trim())
  if (!url) return ''
  if (/^(data:|blob:|https?:\/\/|\/)/i.test(url)) return url
  if (url.startsWith('gs://')){
    try { return await getDownloadURL(sRef(storage, url)) } catch { return '' }
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

// ✅ 업체 전용 게시판 열기
function openStoreBoard(s){
  if (!s || !s.id) return
  const target = {
    name: 'storeBoard',
    params: { id: String(s.id) },
    query:  { theme: theme.value }
  }
  if (route.name === 'storeBoard' && String(route.params.id) === String(s.id)) {
    target.query.ts = Date.now().toString()
    router.replace(target).catch(()=>{})
  } else {
    router.push(target).catch(()=>{})
  }
}

/* ===== Firestore ===== */
function watchWithLabel(label, refOrQuery, next) {
  return onSnapshot(
    refOrQuery,
    (snap) => {
      const meta = snap.metadata || {}

      // 👉 로컬 캐시에서만 온 스냅샷이면 화면에 반영하지 않고 건너뜀
      //    (fromCache === true 이고, hasPendingWrites === false 인 경우)
      if (meta.fromCache && !meta.hasPendingWrites) {
        console.info(`[FS][${label}] skip cached snapshot`)
        return
      }

      // ✅ 서버에서 받은 최신 스냅샷만 실제로 사용
      next(snap)
    },
    (err) => {
      console.error(`[FS][${label}] onSnapshot error:`, err)
    },
  )
}

// ① 원본 stores와, rooms_biz로부터 덮어쓸 맵을 분리 보관
const baseStores = ref([])          // 'stores' 컬렉션 원본 목록
const stores     = ref([])          // 화면에 쓰는 최종 목록(override 적용)
const roomsBiz   = ref({})          // { [storeId]: { rooms, people, updatedAt } }
/* rooms_biz 문서 id(=bizId) → 실제 stores 문서 id 매핑 */
const bizToStore = ref({})

// “내 주변”이 켜진 상태에서 stores 변경 시 거리 재계산
watch(
  [() => near.value.enabled, () => stores.value],
  ([on]) => {
    if (!on) return
    const { lat, lng } = near.value
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    const map = new Map()
    for (const s of (stores.value || [])) {
      if (!hasCoord(s)) continue
      map.set(String(s.id), distanceKm(lat, lng, latOf(s), lngOf(s)))
    }
    distances.value = map
  },
  { immediate: false }
)

let unsubStores = null
let unsubRooms  = null

/* ===== Google Sheets 업로드 기반 vendors 집계 ===== */
const labelsMap = ref({})  // { vendorId: { name } }
const labelsAgg = ref({})  // { name: { match?, persons, totalRooms, totalNeeded, totalCurrent, congestion, updatedAt } }
let unsubLabels = null
let unsubStatus = null

// ③ stores 구독 (원본 유지 후 applyRoomsBiz 호출)
async function subscribe(){
  if (unsubStores) { unsubStores(); unsubStores = null }
  const qRef = query(collection(db, 'stores'), orderBy('updatedAt','desc'))
  unsubStores = watchWithLabel('stores:list', qRef, async (snap)=>{
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
    baseStores.value = rows
    // 이름/벤더키 인덱스 갱신
    rebuildStoreIndexes()
    // ✅ stores 로딩 후 rooms_biz 다시 구독/매핑 (이름·벤더키 기반 매칭 보장)
    subscribeRoomsBiz()
    applyRoomsBiz()
  })
}

// ✅ 메인 합성 로직
//    - rooms_biz 값이 있으면 그 값을 우선 사용
//    - rooms_biz 가 없으면 기존 stores.match / stores.persons 를 폴백으로 그대로 사용
//    - vendors 집계는 최대방수/최대인원, 혼잡도 보조용으로만 사용
function applyRoomsBiz(){
  const bases = Array.isArray(baseStores.value) ? baseStores.value : []
  const rbMap = roomsBiz.value || {}
  const agg   = labelsAgg.value || {}

  const out = bases.map((s) => {
    const id   = String(s.id || '')
    const byRb = rbMap[id] || null
    const byAg = agg[String(s.name || '')] || null

    // ✅ 1) 맞출방 / 필요인원:
    //    - rooms_biz 값이 있으면 그 값을 우선 사용
    //    - rooms_biz 값이 없으면 기존 stores.match / stores.persons (또는 needRooms / needPeople) 를 폴백으로 사용
    const legacyMatch   = Number(s?.match ?? s?.needRooms ?? 0)
    const legacyPersons = Number(s?.persons ?? s?.needPeople ?? 0)

    const match = Number.isFinite(byRb?.rooms)
      ? Number(byRb.rooms)
      : (Number.isFinite(legacyMatch) ? legacyMatch : 0)

    const persons = Number.isFinite(byRb?.people)
      ? Number(byRb.people)
      : (Number.isFinite(legacyPersons) ? legacyPersons : 0)

    // ✅ 2) 최대방수/최대인원은 필요 시 vendors 집계를 참고하되,
    //       없으면 stores 필드에서만 가져옴 (예전 match/persons 와는 독립)
    const totalRooms = Number(
      byAg?.totalRooms ?? s?.totalRooms ?? s?.total ?? s?.rooms ?? 0
    )

    const maxPersons = Number(
      s?.maxPersons ?? s?.capacity ?? s?.max ?? 0
    )

    // ✅ 3) 혼잡도: rooms_biz → vendors → 자동계산
    const rbCg = (byRb && byRb.congestion) ? String(byRb.congestion) : null
    const agCg = (byAg && byAg.congestion) ? String(byAg.congestion) : null

    const status =
      s?.statusMode === 'manual'
        ? (s?.status || '보통')
        : (rbCg || agCg || computeStatus({
            match,
            persons,
            totalRooms,
            maxPersons,
            category: s.category
          }))

    return {
      ...s,
      match,
      persons,
      totalRooms,
      maxPersons,
      status,
      // rooms_biz 가 있으면 그걸 최우선, 없으면 vendors 집계, 없으면 stores.updatedAt
      updatedAt: byRb?.updatedAt || byAg?.updatedAt || s.updatedAt || null,
    }
  })

  stores.value = out
}

/* ===== rooms_biz 붙여넣기/메시지 폴백 파서 ===== */

// (A) 붙여넣기 원문에서 방/인원 추출 (층 구간 기준, 기존 로직 유지)
function parseNeedFromLastPastedText(txt = '') {
  // 0) 기본 정리
  let rawAll = String(txt || '').replace(/\r/g, '').trim()
  if (!rawAll) return { rooms: 0, people: 0 }

  // 1) 한 줄로 들어온 경우를 위해 "— 1층 — / — 2층 —" 같은 패턴 앞뒤에 줄바꿈을 주입
  //    (em dash, 하이픈, = 모두 허용)
  rawAll = rawAll
    .replace(/[-—=]{2,}\s*(\d+)\s*층\s*[-—=]{2,}/g, '\n$1층\n') //  —— 1층 —— → 줄바꿈
    .replace(/(\d+)\s*층(?!\S)/g, '\n$1층\n')                    //  1층 (단독) → 줄바꿈
    .replace(/\s{2,}/g, ' ')                                    // 과도한 공백 정규화

  // 2) 1층~N층 라벨이 한 줄에 이어붙은 케이스: "… 1층 … 2층 …" → 강제 개행
  rawAll = rawAll.replace(/(\d+\s*층)\s+/g, '$1\n')

  const floorRe = /^(?:\s*[-—=]{2,}\s*)?(\d+)층(?:\s*[-—=]{2,}\s*)?$/m
  const lines = rawAll.split('\n')
  const floors = []
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(floorRe)
    if (m) floors.push({ idx: i, floorNo: Number(m[1]) })
  }
  if (!floors.length) return { rooms: 0, people: 0 }

  let rooms = 0
  let people = 0

  const isValidPair = (s) => {
    const NAME = '[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z]{1,10}'
    const m = s.match(new RegExp(`(${NAME})\\s+(\\d{1,3})\\s+(${NAME})`))
    return m ? Number(m[2]) : null
  }
  const bNumsIn = (s) => {
    let sum = 0
    s.replace(/ㅃ\s*(\d{1,2})/g, (_, n) => { sum += Number(n); return '' })
    return sum
  }
  const looksLikeRoomLine = (s) => {
    if (/^\s*\d{2,3}\b/.test(s)) return true
    if (/ㅃ\s*\d{1,2}/.test(s)) return true
    if (isValidPair(s) != null) return true
    return false
  }

  for (let f = 0; f < floors.length; f++) {
    const start = floors[f].idx + 1
    const end   = (f + 1 < floors.length) ? floors[f + 1].idx : lines.length
    for (let i = start; i < end; i++) {
      const line = lines[i].trim()
      if (!line) continue
      if (/^[-—=]{2,}$/.test(line)) continue
      if (/[✅🚫]|가빵|날개|금지|ㅁ\.ㄴ|ㅈ\.ㅁ/.test(line)) continue

      let addedPeople = 0
      const b = bNumsIn(line)
      if (b) addedPeople += b

      if (b === 0) {
        const p = isValidPair(line)
        if (p != null) addedPeople += p
      }

      if (looksLikeRoomLine(line)) rooms += 1
      people += addedPeople
    }
  }

  return { rooms: Math.max(0, rooms), people: Math.max(0, people) }
}

// (B) 루트에 원문이 없을 때 “최근 메시지 1건” 텍스트를 폴백으로 가져오기
async function fetchLatestMessageText(bizId){
  if (!bizId) return ''

  // 1) rooms_biz/{bizId}/messages
  try {
    const q1 = query(
      collection(db, 'rooms_biz', bizId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(1)
    )
    const s1 = await getDocs(q1)
    const t1 = s1.docs[0]?.data()?.text || s1.docs[0]?.data()?.content || ''
    if (t1) return String(t1)
  } catch {}

  // 2) rooms_biz/{bizId}/rooms/{roomId}/messages (자주 쓰는 roomId 후보)
  const guessRoomIds = [`${bizId}_room_01`, 'room_01', 'general', 'main']
  for (const rid of guessRoomIds) {
    try {
      const q2 = query(
        collection(db, 'rooms_biz', bizId, 'rooms', rid, 'messages'),
        orderBy('createdAt', 'desc'),
        limit(1)
      )
      const s2 = await getDocs(q2)
      const t2 = s2.docs[0]?.data()?.text || s2.docs[0]?.data()?.content || ''
      if (t2) return String(t2)
    } catch {}
  }

  // 3) (옵션) 매핑 문서 사용: chat_room_ids/{bizId} -> { roomId }
  try {
    const m = await getDoc(doc(db, 'chat_room_ids', bizId))
    const rid = m.exists() ? (m.data()?.roomId || '') : ''
    if (rid) {
      const q3 = query(
        collection(db, 'rooms_biz', bizId, 'rooms', rid, 'messages'),
        orderBy('createdAt', 'desc'),
        limit(1)
      )
      const s3 = await getDocs(q3)
      const t3 = s3.docs[0]?.data()?.text || s3.docs[0]?.data()?.content || ''
      if (t3) return String(t3)
    }
  } catch {}

  return ''
}

// (C) rooms_biz 구독: 루트 원문 우선, 없으면 메시지 폴백 파싱
function subscribeRoomsBiz(){
  if (unsubRooms) { unsubRooms(); unsubRooms = null }

  // 🔹 이제는 이전 rooms_biz 값을 비우지 않는다.
  //    직전에 받아둔 숫자를 그대로 보여주다가,
  //    새 스냅샷이 오면 그때 최신값으로 덮어쓴다.
  const cRef = collection(db, 'rooms_biz')

  unsubRooms = watchWithLabel('rooms_biz', cRef, async (qs)=>{
    const entries = []
    qs.forEach(d => {
      const x     = d.data() || {}
      const bizId = String(d.id || '')
      if (!bizId) return

      // 1) rooms_biz.storeId
      let storeId = String(x.storeId || '')

      // 2) 이름 기반(rooms_biz.name 또는 bizId 자체를 이름으로 간주)
      if (!storeId || !_hasStoreId(storeId)) {
        const guessName = _normName(x.name || bizId)
        const byName = _storeIdByName.value.get(guessName)
        if (byName) storeId = String(byName)
      }

      // 3) vendorKey 기반(bizId == vendorKey 라는 전제)
      if (!storeId || !_hasStoreId(storeId)) {
        const byVendor = _storeIdByVendor.value.get(bizId.toLowerCase())
        if (byVendor) storeId = String(byVendor)
      }

      // 4차: 마지막 폴백
      if (!storeId) storeId = bizId

      // 메인 합성용 입력
      entries.push({ id: storeId, x })
      bizToStore.value[bizId] = storeId
    })

    const map = {}

    // 순차 처리(폴백 메시지 조회 포함)
    for (const { id, x } of entries) {
      // 1) 루트의 붙여넣기/배너/수동 텍스트
      let pastedText =
        String(x.lastPastedText || x.manualText || x.bannerText || '').trim()

      // 2) 없으면 최근 메시지 텍스트 1건 가져오기
      if (!pastedText) {
        try {
          const bizId = Object.keys(bizToStore.value).find(k => bizToStore.value[k] === id) || id
          pastedText = (await fetchLatestMessageText(bizId)).trim()
        } catch {}
      }

      // 3) 파싱 + 폴백(needRooms/needPeople 우선 반영)
      const inputRooms  = Number(x.needRooms  ?? 0)
      const inputPeople = Number(x.needPeople ?? 0)

      let rooms = 0, people = 0

      // (A) 붙여넣기 원문이 있으면 먼저 파싱
      if (pastedText) {
        const parsed = parseNeedFromLastPastedText(pastedText)
        rooms  = Number(parsed.rooms  ?? 0)
        people = Number(parsed.people ?? 0)
      }

      // (B) 파싱이 0/0이거나 원문이 "줄바꿈 없는 한 줄"이면 시트/수동값을 우선 채택
      const isOneLine = pastedText && !/\n/.test(pastedText)
      if ((rooms === 0 && people === 0) || isOneLine) {
        rooms  = Math.max(rooms,  inputRooms)
        people = Math.max(people, inputPeople)
      }

      // (C) 마지막 안전망
      rooms  = Math.max(0, Number(rooms  || 0))
      people = Math.max(0, Number(people || 0))

      const cgFromScore = (n) => {
        const v = Number(n)
        if (!Number.isFinite(v)) return null
        return v >= 2 ? '여유' : v >= 1 ? '보통' : '혼잡'
      }

      map[id] = {
        rooms    : Math.max(0, Number(rooms  || 0)),
        people   : Math.max(0, Number(people || 0)),
        congestion: (x.congestion && String(x.congestion)) || cgFromScore(x.congestionScore) || null,
        updatedAt : x.updatedAt || x.lastUpdated || x.lastPastedAt || null,
      }
    }

    roomsBiz.value = map
    applyRoomsBiz()

    // 🔹 서버 스냅샷까지 한 번 이상 처리한 뒤에만
    //    실제 숫자를 노출하도록 플래그 ON
    isRoomsBizReady.value = true
  })
}

function subscribeVendorsSummary(){
  if (unsubLabels) { unsubLabels(); unsubLabels = null }

  const cRef = collection(db, 'vendors')
  unsubLabels = watchWithLabel('vendors', cRef, (qs)=>{
    const vMap = {}
    const agg  = {}

    qs.forEach(d => {
      const x = d.data() || {}
      const vendorId = d.id
      const name = String(x.name || '').trim()
      if (vendorId && name) vMap[vendorId] = { name }

      const totalRooms     = Number(x.totalRooms || 0)
      const totalNeeded    = Number(x.totalNeeded || 0)
      const totalCurrent   = Number(x.totalCurrent || 0)
      const totalRemaining = Number(
        x.totalRemaining ?? Math.max(totalNeeded - totalCurrent, 0)
      )

      if (name) {
        agg[name] = {
          // ✅ 웹 메인 현황판의 "필요인원" 은 출근자 수를 뺀 값이 아니라
          //    시트에 적힌 필요인원(totalNeeded)의 합계를 그대로 사용
          persons: totalNeeded,
          totalRooms,
          totalNeeded,
          totalCurrent,
          totalRemaining,
          congestion: x.congestion || null,
          updatedAt : x.updatedAt || x.ts || null,
        }
      }
    })

    labelsMap.value = vMap
    labelsAgg.value = { ...(labelsAgg.value || {}), ...agg }
    applyRoomsBiz()
  })
}

function subscribeVendorStatusPerVendor(){
  if (unsubStatus && typeof unsubStatus === 'function') { try{unsubStatus()}catch{} }
  unsubStatus = null

  const statusUnsubs = new Map()

  const listenOne = (vendorId, name) => {
    if (statusUnsubs.has(vendorId)) {
      try{ statusUnsubs.get(vendorId)?.() } catch {}
      statusUnsubs.delete(vendorId)
    }
    const qRef = collection(db, 'vendors', vendorId, 'status')
    const u = watchWithLabel(`vendors/${vendorId}/status`, qRef, (qs)=>{
      let totalRooms   = 0
      let totalNeeded  = 0
      let totalCurrent = 0
      let remainingSum = 0      // (needed - current) 합계 → 혼잡도 계산용으로 그대로 유지
      let matchRooms   = 0      // 맞출방 개수
      let personsSum   = 0      // ✅ 웹 메인 “필요인원” 표시용 합계(needed 그대로)
      let latestMs     = 0
      const cgSet = new Set()

      qs.forEach(docSnap => {
        const v = docSnap.data() || {}
        totalRooms += 1

        const neededRaw  = Number(v.needed || 0)
        const current = (v.current != null)
          ? Number(v.current || 0)
          : (Array.isArray(v.staff) ? Number(v.staff.length) : 0)

        // 남은 인원(혼잡도 계산용)
        const rem = Math.max(0, neededRaw - current)

        totalNeeded  += neededRaw
        totalCurrent += current
        remainingSum += rem

        // ✅ 필요인원 합계 및 맞출방 계산
        //    - 출근자 수(current)는 여기서 사용하지 않고
        //      needed 값만 그대로 사용
        //    - 필요인원이 빈칸/0 인 방은 맞출방에서 제외
        const effectiveNeeded = Number.isFinite(neededRaw) ? Math.max(0, neededRaw) : 0
        if (effectiveNeeded > 0) {
          personsSum += effectiveNeeded
          matchRooms += 1
        }

        const cg = String(v.congestion || '').trim()
        if (cg) cgSet.add(cg)

        const ts = v.updatedAt || v.ts || null
        const ms = (ts?.toDate ? ts.toDate().getTime() : Date.parse(ts)) || 0
        if (ms > latestMs) latestMs = ms
      })

      let cg = null
      if (cgSet.size === 1) cg = Array.from(cgSet)[0]
      else if (cgSet.size > 1) {
        if (cgSet.has('혼잡') && !cgSet.has('여유')) cg = '혼잡'
        else if (cgSet.has('여유') && !cgSet.has('혼잡')) cg = '여유'
      }
      if (!cg) {
        const denom = Math.max(1, totalNeeded)
        const ratio = remainingSum / denom
        cg = ratio >= 0.60 ? '여유' : ratio >= 0.30 ? '보통' : '혼잡'
      }

      const cur = labelsAgg.value?.[name] || {}
      labelsAgg.value = {
        ...(labelsAgg.value || {}),
        [name]: {
          ...cur,
          // ✅ 맞출방: 필요인원이 1명 이상인 방의 개수
          match:        matchRooms,
          // ✅ 필요인원: 출근자 수를 빼지 않고, 시트에 적힌 필요인원 합계
          persons:      personsSum,
          totalRooms:   totalRooms || cur.totalRooms || 0,
          totalNeeded:  totalNeeded || cur.totalNeeded || 0,
          totalCurrent: totalCurrent || cur.totalCurrent || 0,
          congestion:   cur.congestion || cg,
          updatedAt:    latestMs ? new Date(latestMs) : (cur.updatedAt || null),
        }
      }
      applyRoomsBiz()
    })
    statusUnsubs.set(vendorId, u)
  }

  const rebind = ()=>{
    const map = labelsMap.value || {}
    const seen = new Set(Object.keys(map))
    for (const vendorId of seen) {
      const name = map[vendorId]?.name
      if (!name) continue
      if (!statusUnsubs.has(vendorId)) listenOne(vendorId, name)
    }
    for (const [vid, unsub] of statusUnsubs.entries()) {
      if (!seen.has(vid)) {
        try{ unsub?.() } catch {}
        statusUnsubs.delete(vid)
      }
    }
  }
  rebind()
  watch(labelsMap, rebind, { deep:true })

  unsubStatus = () => {
    for (const [,u] of statusUnsubs) { try{ u?.() } catch {} }
    statusUnsubs.clear()
  }
}

onMounted(async () => {
  await firebaseReady
  subscribe()
  // rooms_biz 는 stores 구독 후 subscribe() 안에서 재구독/매핑
  subscribeVendorsSummary()
  subscribeVendorStatusPerVendor()
})

async function refresh(){
  await firebaseReady
  subscribe()
  // rooms_biz 는 stores 구독 후 subscribe() 안에서 재구독/매핑
  subscribeVendorsSummary()
  subscribeVendorStatusPerVendor()
}


// (제거) collectionGroup('messages') 실시간 구독은 권한 이슈로 비활성화
// let unsubRoomsMsg = null
// function subscribeRoomsBizMessages(){ /* removed */ }


/* ===== 운영자 권한 ===== */
const ADMIN_EMAIL = 'gangtalk815@gmail.com'
const canEdit = ref(false)
onMounted(async ()=>{
  await firebaseReady
  const sync = (u)=> { canEdit.value = !!u && String(u.email||'').toLowerCase() === ADMIN_EMAIL }
  sync(auth.currentUser)
  onAuthStateChanged(auth, sync)
})

/* ===== 수동 정렬 저장/적용 ===== */
const homeOrder = ref([])
let unsubOrder = null
function subHomeOrder(){
  try{
    const ref = doc(db, 'config', 'marketing')
    unsubOrder = watchWithLabel('config/marketing.homeOrder', ref, (snap)=>{
      const data = snap.exists() ? (snap.data() || {}) : {}
      homeOrder.value = Array.isArray(data.homeOrder) ? data.homeOrder.map(String) : []
    })
  }catch(e){
    console.error('[FS][config/marketing.homeOrder] subHomeOrder error:', e)
  }
}
onMounted(async () => { await firebaseReady; subHomeOrder() })

const EDITABLE_LIMIT = 50
const editMode     = ref(false)
const savingOrders = ref(false)
const dragState    = ref({ from:-1 })

function onEnterEdit(){
  if (!editMode.value) return
  if (!homeOrder.value.length){
    const seed = baseFiltered().slice(0, EDITABLE_LIMIT).map(s=>String(s.id))
    homeOrder.value = seed
  }else{
    const seen = new Set(homeOrder.value)
    for (const s of baseFiltered().slice(0, EDITABLE_LIMIT)){
      const id = String(s.id)
      if (!seen.has(id)){ homeOrder.value.push(id); seen.add(id) }
    }
  }
}

/* ===== 필터링 ===== */
const toMs = (v) => {
  if (!v) return 0
  if (typeof v === 'number') return v
  if (v?.toDate) return v.toDate().getTime()
  if (typeof v.seconds === 'number') return v.seconds*1000 + Math.floor((v.nanoseconds||0)/1e6)
  if (v instanceof Date) return v.getTime()
  return 0
}

// ✅ 승인된 업체만 현황판에 노출
//    - 신청 시: applyStatus = 'pending', approved = false       → 미노출
//    - 관리자 승인: applyStatus = 'approved', approved = true    → 노출
//    - 옛날 데이터(둘 다 없는 경우)는 기존처럼 노출(호환용)
const isApproved = (s)=>{
  // 1) 강제로 숨기고 싶은 업체는 hidden: true 로 제어
  if (s?.hidden === true) return false

  const applyRaw = s?.applyStatus
  const apply    = String(applyRaw || '').trim().toLowerCase()
  const hasApply = applyRaw !== undefined

  const approvedFlag    = s?.approved
  const hasApprovedFlag = approvedFlag !== undefined

  // 2) 예전 데이터: applyStatus / approved 둘 다 없으면 기본 승인 처리
  if (!hasApply && !hasApprovedFlag) return true

  // 3) 명시적으로 승인된 경우
  if (
    approvedFlag === true ||
    ['approved', '승인', '완료'].includes(apply)
  ) {
    return true
  }

  // 4) 명시적으로 대기/거절/신청 상태인 경우 → 무조건 미승인 처리
  if (
    approvedFlag === false ||
    [
      'pending', '대기', 'waiting', '신청', '검토중',
      'rejected', '거절', '반려'
    ].includes(apply)
  ) {
    return false
  }

  // 5) 알 수 없는 값이 들어온 경우도 안전하게 미노출
  return false
}

// 광고 기간(adStart/adEnd) 필터를 더 이상 사용하지 않는다.
// 문서에 adStart/adEnd가 있어도, 메인 현황판에서는 무조건 통과.
const isActiveAd = (s)=> {
  return true
}

const exposedHere = (s)=> {
  const exp = s?.exposure || {}
  if (exp == null || typeof exp !== 'object') return true
  if (exp[EXPOSURE_KEY] === undefined) return true
  return !!exp[EXPOSURE_KEY]
}

/* 기본 필터(정렬 적용 전) + 내 주변(반경) 필터 */
function baseFiltered(){
  const arr = stores.value.filter(s=>{
    const okExpose   = exposedHere(s)
    const okApproved = isApproved(s)
    const okPeriod   = isActiveAd(s)
    const okT = type.value==='all' || s.category===type.value
    const okM = (macro.value==='all') ? true : (macroOf(s)===macro.value)
    const okQ = !q.value || (s.name||'').toLowerCase().includes(q.value.toLowerCase())

    let okNear = true
    if (near.value.enabled){
      if (!hasCoord(s)) okNear = false
      else {
        const km = distances.value.get(String(s.id))
        okNear = (km != null) && (km <= near.value.radiusKm)
      }
    }

    return okExpose && okApproved && okPeriod && okT && okM && okQ && okNear
  })
  return arr
}

/* 최종 filtered */
const filtered = computed(()=>{
  const base = baseFiltered()
  if (near.value.enabled){
    return base.slice().sort((a,b)=>{
      const da = distances.value.get(String(a.id))
      const db = distances.value.get(String(b.id))
      if (da == null && db == null) return 0
      if (da == null) return 1
      if (db == null) return -1
      return da - db
    })
  }
  if (!homeOrder.value.length) return base
  const pos = new Map(homeOrder.value.map((id,idx)=>[String(id), idx]))
  return base.slice().sort((a,b)=>{
    const ai = pos.has(String(a.id)) ? pos.get(String(a.id)) : Infinity
    const bi = pos.has(String(b.id)) ? pos.get(String(b.id)) : Infinity
    if (ai !== bi) return ai - bi
    return 0
  })
})

/* 편집용 리스트(상위 N개) */
const editableList = computed(()=> filtered.value.slice(0, EDITABLE_LIMIT))

/* 드래그 핸들러 */
function onListDragStart(i, e){
  if (!editMode.value) return
  dragState.value.from = i
  try{
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', 'drag')
  }catch{}
}
function onListDragOver(i, e){
  if (!editMode.value) return
  e.preventDefault()
  const from = dragState.value.from
  if (from === i || from < 0) return
  const visibleIds = editableList.value.map(s=>String(s.id))
  const arr = homeOrder.value.filter(id => visibleIds.includes(String(id)))
  const others = homeOrder.value.filter(id => !visibleIds.includes(String(id)))
  if (from < 0 || from >= arr.length || i < 0 || i >= arr.length) return
  const [moved] = arr.splice(from, 1)
  arr.splice(i, 0, moved)
  homeOrder.value = [...arr, ...others]
  dragState.value.from = i
}
function onListDrop(){ /* no-op */ }
function onListDragEnd(){ dragState.value.from = -1 }

/* 저장 */
async function saveOrders(){
  if (!canEdit.value) return
  try{
    savingOrders.value = true
    await setDoc(doc(db, 'config', 'marketing'), {
      homeOrder: homeOrder.value.map(String),
      homeOrderSavedAt: serverTimestamp()
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

/* 혼잡도 계산 유틸 */
const num = (v) => {
  const n = Number(v); if (Number.isFinite(n)) return n
  const m = String(v||'').match(/\d+/g)
  return m ? Number(m[m.length-1]) : 0
}
function normalize01(v, min, max){
  if (!Number.isFinite(v)) return null
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null
  if (max <= min) return v > 0 ? 1 : 0
  const r = (v - min) / (max - min)
  return Math.max(0, Math.min(1, r))
}
function rangeByCategory(cat){
  const list = (stores.value || []).filter(s => String(s?.category || '') === String(cat || ''))
  if (!list.length) return { mMin:0, mMax:0, pMin:0, pMax:0 }
  let mMin = Infinity, mMax = -Infinity, pMin = Infinity, pMax = -Infinity
  for (const s of list){
    const m = num(s?.match), p = num(s?.persons)
    if (Number.isFinite(m)){ mMin = Math.min(mMin, m); mMax = Math.max(mMax, m) }
    if (Number.isFinite(p)){ pMin = Math.min(pMin, p); pMax = Math.max(pMax, p) }
  }
  if (!Number.isFinite(mMin)) mMin = 0
  if (!Number.isFinite(mMax)) mMax = 0
  if (!Number.isFinite(pMin)) pMin = 0
  if (!Number.isFinite(pMax)) pMax = 0
  return { mMin, mMax, pMin, pMax }
}
function computeStatus(s){
  const mode = String(s?.statusMode || 'auto')

  // 수동 설정인 경우: 예전 라벨도 그대로 허용
  if (mode === 'manual'){
    const saved = String(s?.status || '')
    if (['좋음','보통','나쁨','여유','혼잡'].includes(saved)) return saved
  }

  const cat = String(s?.category || 'etc')
  const { mMin, mMax, pMin, pMax } = rangeByCategory(cat)
  const match   = num(s?.match)
  const persons = num(s?.persons)
  const mN = normalize01(match,   mMin, mMax)
  const pN = normalize01(persons, pMin, pMax)

  // ① 카테고리 기준 정규화 값 있는 경우
  if (mN != null && pN != null){
    const availability = (mN + pN) / 2
    if (availability >= 0.60) return '좋음'
    if (availability >= 0.30) return '보통'
    return '나쁨'
  }

  // ② 최대방수/최대인원 기반 비율 계산
  const totalRooms = num(s?.totalRooms ?? s?.total ?? s?.rooms)
  const maxPersons = num(s?.maxPersons ?? s?.capacity ?? s?.max)
  const rRooms  = (totalRooms > 0 && Number.isFinite(match))   ? (match   / totalRooms) : null
  const rPeople = (maxPersons > 0 && Number.isFinite(persons)) ? (persons / maxPersons) : null

  let availability
  if (rPeople != null && rRooms != null)      availability = (rPeople + rRooms) / 2
  else if (rPeople != null)                  availability = rPeople
  else if (rRooms  != null)                  availability = rRooms
  else                                       availability = 1

  if (availability >= 0.60) return '좋음'
  if (availability >= 0.30) return '보통'
  return '나쁨'
}

const wifiColor = (storeOrStatus)=>{
  // ✅ rooms_biz가 아직 안 들어온 상태에서는 “중간(mid)” 로만 표시
  if (!isRoomsBizReady.value) return 'mid'

  const st = typeof storeOrStatus === 'string'
    ? storeOrStatus
    : computeStatus(storeOrStatus || {})

  // 예전 라벨(여유/혼잡)도 그대로 해석
  if (st === '좋음' || st === '여유')  return 'ok'
  if (st === '보통')                    return 'mid'
  if (st === '나쁨' || st === '혼잡')   return 'busy'

  // 혹시 이상한 값이면 중간으로
  return 'mid'
}


const demandStats = computed(() => {
  const acc = {}
  for (const s of stores.value) {
    const cat = String(s?.category || 'etc')
    const p = num(s?.persons)
    if (!acc[cat]) acc[cat] = { max: p, min: p }
    acc[cat].max = Math.max(acc[cat].max, p)
    acc[cat].min = Math.min(acc[cat].min, p)
  }
  return acc
})

/* === 혼잡도 라벨 텍스트 === */
const statusLabel = (s) => {
  // ↑ 이제는 isRoomsBizReady와 상관없이
  // 항상 computeStatus 결과를 바로 보여줍니다.
  const st = computeStatus(s)

  if (st === '좋음' || st === '여유') {
    return '좋음'
  } else if (st === '보통') {
    return '보통'
  } else if (st === '나쁨' || st === '혼잡') {
    return '나쁨'
  }

  // 혹시 계산이 안 된 경우엔 그냥 빈 문자열(라벨 숨김)
  return ''
}



/* 상세 */
const openStore = (s)=> router.push({ name:'storeDetail', params:{ id:s.id } })

// ✅ 권한 없으면 DB 쓰기 건너뜀.
async function ensureChotokRoom(s){
  const raw = s.chatRoomId || s.roomId || s.chatId || s.id
  const roomId = String(raw || '').trim()
  if (!roomId) return null
  if (!canWriteChatRooms(s)) return roomId
  try{
    const base = {
      id: roomId,
      type: 'store',
      storeId: s.id,
      storeName: s.name || '',
      name: s.name || '채팅방',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    const rRef = doc(db, 'chat_rooms', roomId)
    const rSnap = await getDoc(rRef)
    if (!rSnap.exists()){
      await setDoc(rRef, { ...base, lastMessageAt: serverTimestamp() }, { merge: true })
    } else {
      await updateDoc(rRef, { updatedAt: serverTimestamp() })
    }
    const altRef = doc(db, 'rooms', roomId)
    const altSnap = await getDoc(altRef).catch(()=>null)
    if (!altSnap || !altSnap.exists()){
      await setDoc(altRef, { ...base, lastMessageAt: serverTimestamp() }, { merge: true }).catch(()=>{})
    } else {
      await updateDoc(altRef, { updatedAt: serverTimestamp() }).catch(()=>{})
    }
    return roomId
  }catch(e){
    console.warn('ensureChotokRoom error (ignored):', e?.message || e)
    return roomId
  }
}

/* ===== 채팅 이동 ===== */
function roomTitle(s){ return s?.name || s?.storeName || '채팅방' }
async function openChotok(s){
  if (!s) return
  const storeId = String(s.id || s.storeId || s.chatRoomId || s.roomId || s.chatId || '').trim()
  if (!storeId) return
  const target = { name: 'bizChat', params: { storeId }, query: { name: roomTitle(s), theme: theme.value } }
  try{ await router.push(target) }catch{ router.replace({ ...target, query:{ ...target.query, ts: Date.now().toString() } }).catch(()=>{}) }
}
async function openOpenChat(s){
  const storeId = String(s?.id || s?.storeId || '').trim()
  if (!storeId) return

  // ✅ ChatOpen 에 썸네일/이름을 같이 넘겨줌
  const target = {
    name: 'openChat',
    params: { storeId },
    query: {
      theme: theme.value,
      name : roomTitle(s),      // 상단 텍스트
      thumb: thumbOf(s) || '',  // 현황판에서 이미 쓰고 있는 썸네일 URL
    },
  }

  try {
    await router.push(target)
  } catch {
    router
      .replace({ ...target, query: { ...target.query, ts: Date.now().toString() } })
      .catch(()=>{})
  }
}
const openBizChat = openChotok
function canWriteChatRooms(s){
  const u = auth.currentUser
  if (!u) return false
  const uid = String(u.uid || '')
  const email = String(u.email || '').toLowerCase()
  const isAdmin = email === ADMIN_EMAIL
  const isOwner = [s?.ownerId, s?.uid, s?.createdBy].map(v=>String(v||'')).includes(uid)
  return isAdmin || isOwner
}

/* ====== 초톡 버튼 제스처 ====== */
let chotokHoldTimer = null
const HOLD_DELAY_MS = 750
function startChotokHold(s){ cancelChotokHold(); chotokHoldTimer = setTimeout(() => { showSheet('invite', s) }, HOLD_DELAY_MS) }
function cancelChotokHold(){ if (chotokHoldTimer){ clearTimeout(chotokHoldTimer); chotokHoldTimer = null } }
function chotokTouchStart(e, s){ tapStart(e); startChotokHold(s) }
function chotokTouchMove(e){ tapMove(e) }
function chotokTouchEnd(s){ cancelChotokHold(); tapEnd(() => openChotok(s)) }
function chotokMouseStart(e, s){ mouseStart(e); startChotokHold(s) }
function chotokMouseMove(e){ mouseMove(e) }
function chotokMouseEnd(s){ cancelChotokHold(); mouseEnd(() => openChotok(s)) }

/* 담당 드롭다운 */
const mgrMenu = ref({ open:false, items:[], style:{ top:'0px', left:'0px', width:'220px' }, store:null })
const mgrAnchorEl = ref(null)
function managersOf(s){
  if(!s) return []
  const arr = Array.isArray(s.managers) ? s.managers.filter(Boolean) : []
  if (arr.length) return arr
  if (s.manager || s.phone || s.talkId) return [{ name:s.manager, phone:s.phone, talkId:s.talkId }]
  return []
}
function updateMgrPos(){
  const el = mgrAnchorEl.value
  if(!el) return
  const r = el.getBoundingClientRect()
  mgrMenu.value.style = {
    top: `${r.bottom + 6}px`,
    left: `${r.left}px`,
    width: `${Math.max(220, r.width)}px`
  }
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

/* 액션 모달 */
const sheet = ref({ open:false, type:'', store:null })
function showSheet(type, s){
  sheet.value = { open:true, type, store:s }
}
function closeSheet(){ sheet.value.open = false }

/* ✅ 담당자 리스트 시트 열기 */
function openManagerList(s){
  if (!s) return
  const list = managersOf(s)
  if (!list.length){
    alert('등록된 담당자가 없습니다.')
    return
  }
  // sheet.store 에 원본 store 객체를 넣어두고 type 으로 분기
  sheet.value = { open:true, type:'managerList', store:s }
}

/* ✅ 담당 리스트에서 담당자 하나 선택했을 때:
     1) 시트 닫기
     2) 담당자 인덱스를 쿼리 파라미터로 넘겨서 업체 상세로 이동 */
function onSelectManagerFromList(m, i){
  const s = sheet.value.store
  if (!s) return

  // 1) 리스트 시트 닫기
  closeSheet()

  // 2) 안전한 인덱스 계산
  const idx = Number.isFinite(Number(i)) ? Number(i) : 0

  // 3) 기존 쿼리를 유지하면서 mgr 인덱스만 추가
  const query = {
    ...route.query,
    mgr: String(idx),   // ← StoreDetail 에서 사용할 담당자 인덱스
  }
  // 예전에 쓰던 sheet/mi 는 제거 (하단 담당자 시트 안 뜨게)
  delete query.sheet
  delete query.mi

  router.push({
    name: 'storeDetail',
    params: { id: s.id },
    query,
  }).catch(()=>{})
}

/* ✅ 기업회원 본인 글만 수정 허용 */
function canEditStore(s){
  const u = auth.currentUser
  const uid = u?.uid || ''
  return !!uid && [s?.ownerId, s?.uid, s?.createdBy].map(v=>String(v||'')).includes(uid)
}

/* 지표 입력 폼 */
const metricForm = ref({ match:0, totalRooms:0, persons:0, maxPersons:0 })
function openMetricEditor(s, focus){
  if (!canEditStore(s)) return
  metricForm.value = {
    match:      num(s?.match),
    totalRooms: num(s?.totalRooms ?? s?.total ?? s?.rooms),
    persons:    num(s?.persons),
    maxPersons: num(s?.maxPersons ?? s?.capacity ?? s?.max),
  }
  sheet.value = { open:true, type:'metric', store:s, focus }
  nextTick(() => {
    const sheetEl = document.querySelector('.action-sheet')
    scrollIntoViewWithOffset(sheetEl)
    const focusSel =
      focus === 'rooms'   ? 'input[aria-label="맞출방"], .kv input' :
      focus === 'persons' ? 'input[aria-label="필요인원"], .kv input' :
      '.kv input'
    const inputEl = sheetEl?.querySelector(focusSel) || sheetEl?.querySelector('.kv input')
    if (inputEl){
      inputEl.focus()
      setTimeout(() => scrollIntoViewWithOffset(inputEl, TABBAR_H + 16), 120)
    }
  })
}
async function saveMetric(){
  const s = sheet.value.store
  if (!s?.id) return
  try{
    const payload = {
      match:      Math.max(0, Number(metricForm.value.match||0)),
      persons:    Math.max(0, Number(metricForm.value.persons||0)),
      totalRooms: Math.max(0, Number(metricForm.value.totalRooms||0)),
      maxPersons: Math.max(0, Number(metricForm.value.maxPersons||0)),
      updatedAt:  serverTimestamp(),
    }
    await updateDoc(doc(db, 'stores', String(s.id)), payload)
    closeSheet()
  }catch(e){
    console.warn('saveMetric error:', e)
    alert('저장 중 오류가 발생했습니다.')
  }
}

/* 탭 제스처 유틸 */
const noop = () => {}
const PRESS_THRESHOLD = 12
const MIN_PRESS_MS    = 50
const MAX_PRESS_MS    = 700
const press = ref({ active:false, x:0, y:0, t:0, moved:false })
function tapStart(e){ const p = e.touches?.[0] || e; press.value = { active:true, x:p.clientX, y:p.clientY, t:Date.now(), moved:false } }
function tapMove(e){
  const st = press.value; if(!st.active) return
  const p = e.touches?.[0] || e
  const dx = Math.abs(p.clientX - st.x), dy = Math.abs(p.clientY - st.y)
  if (dx > PRESS_THRESHOLD || dy > PRESS_THRESHOLD) st.moved = true
}
function tapEnd(cb){
  const st = press.value; if(!st.active) return
  const elapsed = Date.now() - st.t
  const isTap = !st.moved && elapsed >= MIN_PRESS_MS && elapsed <= MAX_PRESS_MS
  press.value.active = false
  if (isTap && typeof cb === 'function') cb()
}
function mouseStart(e){ tapStart(e) }
function mouseMove(e){ tapMove(e) }
function mouseEnd(cb){ tapEnd(cb) }

/* 유틸 */
function bgStyle(url){ const u = String(url || '').trim(); return u ? ({ backgroundImage:`url("${u.replace(/"/g, '\\"')}")` }) : ({}) }
const managerName = (s) => {
  if (!s) return ''
  const arr = Array.isArray(s.managers) ? s.managers : []
  if (arr.length && arr[0]?.name) return arr[0].name
  if (s.manager) return s.manager
  return ''
}
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

// vMatchThumb (하드코딩 버전)
const vMatchThumb = {
  mounted(el) {
    const card  = el.closest('.row-card')
    const thumb = card?.querySelector('.thumb.wide')
    const wrap  = card?.querySelector('.thumb-wrap')
    const name  = card?.querySelector('.info-line')
    if (!thumb) return
    const SHIFT_DOWN = 7
    const TRIM_TOP   = 22
    const apply = () => {
      const th = thumb.getBoundingClientRect()
      const gap   = wrap ? parseFloat(getComputedStyle(wrap).gap || '0') : 0
      const nameH = name ? name.getBoundingClientRect().height : 0
      const baseTop = Math.round(nameH + gap)
      const h = Math.round(th.height || 0)
      if (!h) return
      el.style.marginTop = `${Math.max(0, baseTop + SHIFT_DOWN)}px`
      el.style.height    = `${Math.max(0, h - TRIM_TOP)}px`
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(thumb); if (wrap) ro.observe(wrap); if (name) ro.observe(name)
    const onWin = () => apply()
    window.addEventListener('resize', onWin, { passive:true })
    el._matchThumbCleanup = () => { try{ro.disconnect()}catch{}; window.removeEventListener('resize', onWin) }
  },
  updated(el) {
    const card  = el.closest('.row-card')
    const thumb = card?.querySelector('.thumb.wide')
    const wrap  = card?.querySelector('.thumb-wrap')
    const name  = card?.querySelector('.info-line')
    if (!thumb) return
    const SHIFT_DOWN = 7, TRIM_TOP = 22
    const th = thumb.getBoundingClientRect()
    const gap   = wrap ? parseFloat(getComputedStyle(wrap).gap || '0') : 0
    const nameH = name ? name.getBoundingClientRect().height : 0
    const baseTop = Math.round(nameH + gap)
    const h = Math.round(th.height || 0)
    if (!h) return
    el.style.marginTop = `${Math.max(0, baseTop + SHIFT_DOWN)}px`
    el.style.height    = `${Math.max(0, h - TRIM_TOP)}px`
  },
  unmounted(el){ el._matchThumbCleanup?.() }
}

onUnmounted(() => {
  if (Array.isArray(newsUnsubs)) {
    for (const u of newsUnsubs) { try { if (typeof u === 'function') u() } catch {} }
    newsUnsubs.length = 0
  }
  const toUnsub = [unsubStores, unsubRooms, unsubLabels, unsubStatus, unsubOrder]
  for (const u of toUnsub) { try { if (typeof u === 'function') u() } catch {} }
  unsubStores = null; unsubRooms  = null; unsubLabels = null; unsubStatus = null; unsubOrder  = null

  // ⛔ 여기서 isRoomsBizReady 를 false 로 초기화하지 않는다.
  //    한 번이라도 rooms_biz를 받아온 이후에는,
  //    같은 세션 안에서는 계속 숫자를 바로 보여주기 위함.
})

</script>

<style scoped>
/* === 안전영역 포함 패딩 === */
:root{
  /* 실제 탭바/앱바 높이에 맞게 조정하세요 */
  --tabbar-height: 92px;
  --appbar-height: 56px; /* ← 상단 앱 이름/헤더 높이(필요시 60~64로 조정) */
}

.page{
  /* ⬇️ 가게찾기 페이지와 상단 여백(검색창 높이) 맞추기 */
  padding-top: 8px;
  padding-left:  max(12px, env(safe-area-inset-left));
  padding-right: max(12px, env(safe-area-inset-right));
  /* 하단 탭 + 홈인디케이터 만큼 여유 */
  padding-bottom: calc(var(--tabbar-height) + env(safe-area-inset-bottom));
}

/* ======= 글로벌: 하단 네비게이션 고정 ======= */
:global(.bottom-nav),
:global(.tabbar),
:global(.app-tabbar),
:global(.gnb-bottom){
  position: fixed !important;
  left: 0; right: 0; bottom: 0;
  z-index: 999999;
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  backface-visibility: hidden;
  padding-bottom: env(safe-area-inset-bottom);
}

/* 상단 */
.top{ display:flex; flex-direction:column; gap:6px; margin-bottom:6px }
/* ✅ 가게찾기와 동일한 검색창 스타일로 교체 */
/* 검색바 주변 여백만 유지 */
/* ── 검색/핫티커 레이아웃 락(화면 공통 고정값) */
:root{
  --search-height: 32px;   /* SearchBar 고정 높이 */
  --hot-height:    32px;   /* HOT 티커 한 줄 높이 */
  --search-gap-top:    6px;
  --search-gap-bottom: 10px;
  /* 숫자 색상 토큰(테마별로 오버라이드) */
  --metric-num-color:#111; /* 기본: 라이트에서 검정 */
}
/* 다크/블랙 테마에서 숫자를 흰색으로 */
:root[data-theme="dark"],
:root[data-theme="black"]{
  --metric-num-color:#fff;
}

.search-wrap{
  display:flex;
  flex-direction:column;
  gap:6px;
  margin:0; /* 페이지마다 margin 차이로 흔들리는 것 방지 */
}

/* 같은 높이의 슬롯을 항상 예약 */
.search-lock{
  padding-block: var(--search-gap-top) var(--search-gap-bottom);
}

/* 검색바가 차지할 세로 공간을 고정(컴포넌트 외곽 래핑) */
.search-lock > :first-child{
  min-height: var(--search-height);
  display:flex; align-items:center;
}

/* HOT 티커도 항상 같은 높이 예약 */
.hot-slot{
  height: var(--hot-height);
  display:flex; align-items:center;
}

/* hot-box는 기존 스타일 그대로 사용 가능 (이미 있던 코드 유지) */
/* .hot-box { height:32px; ... } 가 이미 있으면 OK.
   없다면 아래 한 줄만 추가해도 됨 */
.hot-box{ height: var(--hot-height); }

/* (권장) 섹션들의 위·아래 margin 충돌 방지: 다음 섹션은 top margin만 쓰기 */
.banners, .cats, .tops, .list-head{ margin-top:12px; }


/* ===== 뉴스 한줄(검색창과 동일 높이) ===== */
.news{ margin:0; }
.news-bar{
  position:relative;
  display:flex; align-items:center; justify-content:space-between; gap:6px;
  border:1px solid var(--line); border-radius:10px; padding:6px 8px; background:var(--surface);
  box-shadow:0 2px 6px var(--shadow);
  height: var(--search-height);          /* ← 검색창과 동일 */
}
.news-left{ display:flex; align-items:center; gap:6px; min-width:0; flex:1; }
.news-ttl{
  flex:0 0 auto;
  font-weight:900; padding:0 6px; height:18px; border-radius:999px; border:1px solid var(--line); background:var(--bg);
  display:inline-flex; align-items:center; justify-content:center; font-size:10px;
}
.news-headline{ flex:1; min-width:0; font-weight:800; font-size:12px }
.news-badge{
  flex:0 0 auto;
  display:inline-grid; place-items:center; width:18px; height:18px; border-radius:999px;
  background:var(--accent); color:#fff; font-weight:900; font-size:8.5px;
  box-shadow:0 2px 6px var(--shadow);
}
.news-badge.sm{ width:16px; height:16px; font-size:8px; margin-left:4px }
.news-more.in-bar{ position:static; transform:none; bottom:auto; display:flex; justify-content:flex-end; }
.more-btn{
  height:24px; padding:0 10px; border-radius:999px; border:1px solid var(--line); background:var(--surface);
  font-weight:800; font-size:11px; color:var(--fg);
}
:root[data-theme="white"] .more-btn{ color:#111 !important }
:root[data-theme="dark"]  .more-btn{ color:#fff !important }

.news-list{ margin:6px 2px 0; display:flex; flex-direction:column; gap:4px }
.news-item{ display:flex; align-items:center; gap:6px; padding:4px 6px; border:1px dashed var(--line); border-radius:10px; background:var(--surface) }
.news-item .dot{ color:var(--muted) }
.news-item .txt{ font-weight:700; font-size:11.5px }

/* 유형 칩 줄 (살짝 아래로) */
.type-row{ display:flex; flex-wrap:wrap; gap:5px; margin-top:6px; }
.type-chip{
  height:26px; padding:0 10px; border-radius:999px; border:1px solid var(--line);
  background:var(--surface); color:var(--fg); font-weight:800; font-size:11.5px;
}
.type-chip.on{ outline:2px solid var(--accent) }
.all-chip{ display:inline-flex; align-items:center; gap:6px }
.all-chip .label{ font-weight:900 }
:root[data-theme="white"] .type-chip.all-chip{ color:#111 !important }
:root[data-theme="dark"]  .type-chip.all-chip{ color:#fff !important }

.macro-mini{
  display:inline-flex; align-items:center; justify-content:center;
  padding:0 6px; height:18px; border-radius:999px;
  border:1px solid var(--line); background:var(--surface); font-weight:800; font-size:10px;
}
.all-chip .caret{ opacity:.7 }

/* ===== 운영자 순서 편집 툴바 ===== */
.orders-head{ margin:6px 0 4px; }
.rank-tools{ display:flex; align-items:center; justify-content:space-between; gap:10px; }
.toggle{ display:flex; align-items:center; gap:8px; font-weight:800; }
.toggle input[type="checkbox"]{
  appearance:none; width:18px; height:18px; background:transparent;
  border:2px solid var(--fg, #111); border-radius:4px; position:relative;
}
.toggle input[type="checkbox"]:checked::after{
  content:""; position:absolute; left:3px; top:0px; width:8px; height:12px;
  border-right:3px solid var(--accent); border-bottom:3px solid var(--accent); transform:rotate(45deg);
}
.toggle .toggle-label{ font-size:14px; font-weight:900; }
.tools-right{ display:flex; align-items:center; gap:6px; }
.icon-btn{
  width:34px; height:34px; border-radius:999px; border:1px solid var(--line);
  background:var(--surface); display:grid; place-items:center; box-shadow:0 4px 10px var(--shadow);
  color: var(--fg, #111);
}
.icon-btn svg{ width:18px; height:18px }
/* 기존 화이트 전용 규칙은 삭제 또는 주석 처리하세요 */
/* :root[data-theme="white"] .save-btn{ color:#111 !important } */

/* ✅ 테마 무시: 저장 버튼 텍스트 항상 검정 고정 */
.save-btn{
  height:34px;
  padding:0 12px;
  font-weight:900;
  color:#111 !important;
  -webkit-text-fill-color:#111 !important;
}

/* 비활성(disabled)일 때는 진한 회색으로 */
.save-btn:disabled{
  color:#444 !important;
  -webkit-text-fill-color:#444 !important;
}


/* ===== 목록 헤드 ===== */
.list-head{
  position:sticky; top:0; z-index:5;
  display:flex; justify-content:flex-end; align-items:center; margin:6px 0 4px;
  padding:2px 0; background:var(--bg); font-size:11.5px;
}
.view-tools{ display:flex; gap:5px }
.tool{
  width:26px; height:26px; border-radius:999px; border:1px solid var(--line); background:var(--surface);
  display:grid; place-items:center; box-shadow:0 2px 8px var(--shadow);
}
.tool.on{ outline:2px solid var(--accent); background:var(--surface) }

/* ===== 순서 편집 리스트 ===== */
.reorder-sec{ margin:6px 0 10px; padding:8px; border:1px dashed var(--line); border-radius:12px; background:color-mix(in oklab, var(--surface), white 10%); }
.sec-ttl{ margin:0 0 6px; font-size:13px; font-weight:900; }
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

/* ========= 한줄보기 카드 ========= */
.list{ display:flex; flex-direction:column; gap:0px } /* 간격 최소화 */
.row-card{
  --thumb-col: 24%;
  --act-col: 92px;
  position:relative;
  border:1px solid var(--line); border-radius:12px; background:var(--surface);
  box-shadow:0 1px 3px var(--shadow); color: var(--fg);
  padding:8px;
  display:grid;
  grid-template-columns: var(--thumb-col) 1fr;
  grid-template-rows:auto auto; /* 1행: 썸네일/우측내용, 2행: 액션칩 */
  column-gap:8px; row-gap:2px;
  align-items:start;
  overflow:visible; /* 혼잡도/와이파이 잘림 방지 */
  min-height: 128px; /* 4장 보이도록 압축 */
}
.row-card{ margin:0; }              /* 카드 바깥 여백 제거 */
.row-card + .row-card{ margin-top:0; }  /* 인접 카드 사이 여백 강제 0 */
.r-left{ grid-column:1; grid-row:1 }
.r-right{ grid-column:2; grid-row:1; display:flex; flex-direction:column; gap:2px; height:auto }
.r-right > *{ border:0 !important; background:transparent !important }

/* 업체명/메타 */
.name-row,
.r-meta{
  position:relative;
  z-index:2;
  background:var(--surface) !important;
  border:0 !important;
  box-shadow:none !important;
}

/* 와이파이 핀(카드 우상단) */
.wifi-pin{
  position:absolute; top:6px; right:8px;
  width:24px; height:24px;
  border-radius:999px;
  display:flex; align-items:center; justify-content:center;
  background:var(--surface); border:1px solid var(--line);
  box-shadow:0 3px 8px var(--shadow);
  line-height:0;
}

/* 혼잡(지표 안 작은 아이콘) */
/* 아이콘 자체를 조금 줄이고 위로 끌어올림 */
.wifi-dot{
  width:28px; height:28px;               /* 36 → 28 */
  border-radius:999px;
  display:inline-flex; align-items:center; justify-content:center;
  background:var(--surface); border:1px solid var(--line);
  box-shadow:0 2px 6px var(--shadow);
  line-height:0;
}

/* 리스트 지표(혼잡도)에서 숫자 대신 들어간 아이콘 간격/위치 보정 */
.metric.big.demand .wifi-dot{
  margin-bottom:4px;                      /* 숫자의 margin-bottom(4px)과 동일하게 */
  transform:translateY(-2px);             /* 살짝 위로 */
}

/* 내부 SVG는 컨테이너에 맞춤(기존 유지) */
.wifi-dot svg{ width:100%; height:100%; }

/* 함께 쓰던 mini 사이즈도 균형 조정(있으면) */
.mini-wifi{ width:24px; height:24px }     /* 30 → 24 */

.wifi-dot svg{ width:100%; height:100%; }/* 아이콘이 컨테이너 꽉 차게 */

.wifi-dot.ok{ color:#21c36b } .wifi-dot.mid{ color:#f2a100 } .wifi-dot.busy{ color:#ff6a6a }

/* 썸네일 */
.thumb{ position:relative; background-size:cover; background-position:center; background-color:#f2f2f4 }
.thumb.wide{ width:100%; aspect-ratio:1 / 1; height:auto; min-height:0; border-radius:10px; display:block; }
.thumb.small{ flex:0 0 46%; aspect-ratio:1/1; border-radius:12px; display:block; }
.click{ cursor:pointer; touch-action: manipulation; -webkit-tap-highlight-color: rgba(0,0,0,0.08); user-select:none; -webkit-user-select:none; }

/* 텍스트(타이트) */
.name-row{ display:flex; align-items:center; gap:6px; margin-bottom:0 }
.ellip{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ellip1{ display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden; }
.r-name{ flex:1; min-width:0; font-weight:900; font-size:15px; line-height:1.2; word-break:keep-all; text-decoration:none; }
.r-meta{ display:flex; align-items:center; gap:4px; min-width:0; margin-top:-2px; font-size:10.5px; color:var(--muted); line-height:1.05; }
.r-meta .sep{ opacity:.55 }

/* ✅ 지표(리스트): 3칩이 더 작아져도 줄바꿈 없이 카드 안에 들어오게 */
.metric-row.equal-3{
  width:100%;
  display:grid;
  /* ← 최소폭 0으로 변경해 칩이 더 줄어들 수 있게 */
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap:4px;            /* (선택) 간격도 살짝 축소 */
  margin-top:2px;
}

.mini{
  width:100%;
  height:36px;        /* (선택) 살짝 낮춰 공간 확보 */
  border:1.5px solid var(--line);
  border-radius:999px;
  background:var(--surface);
  box-shadow:0 2px 6px var(--shadow);
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  text-align:center;
  padding-inline:6px; /* (선택) 좌우 여백 축소 */
}
/* 리스트/그리드 미니 숫자: 테마 변수 사용 */
.mini .num{
  font-weight:800;
  font-size:12.5px;
  line-height:1;
  margin-bottom:0;
  color: var(--act-pink) !important; /* ← 연핑크 */
}
.mini .lbl{ font-size:9px;   color:var(--muted); font-weight:800; line-height:1 }


/* ========= 두칸보기 카드 ========= */
.grid{ display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:10px }
.grid-card{
  position:relative;
  border:1px solid var(--line); border-radius:14px; background:var(--surface); color: var(--fg);
  box-shadow:0 4px 12px var(--shadow);
  padding:10px; display:flex; flex-direction:column; gap:6px;
  overflow:hidden;
  min-width:0;
}
.grid-pin{ top:6px; right:8px; width:22px; height:22px }     /* 그리드 핀 축소 */
.grid-pin svg{ width:20px; height:20px }
.row-top{ display:flex; align-items:center; gap:10px; }
.meta{ flex:1; min-width:0; }
.g-name{ font-weight:800; font-size:14.2px; line-height:1.2; word-break:keep-all; border:0 !important }
.g-sub{ margin-top:1px; font-size:12px; color:var(--muted); word-break:keep-all; border:0 !important }
.g-mgr{ font-size:11.5px; color:var(--muted) }

/* ✅ 지표(두칸보기): 2개 더 작게 + 중앙 배치 */
.g-mini-stats{
  width:100%;
  display:grid;
  grid-template-columns:repeat(2, minmax(72px, 1fr)); /* 가로 축소 */
  gap:6px;
  margin-top:2px;
  max-width: 240px;              /* 박스 총 폭 제한 */
  margin-left:auto; margin-right:auto;
}
.grid .g-mini-stats .mini{ height:40px }
.grid .g-mini-stats .mini .num{ font-size:12.5px }
.grid .g-mini-stats .mini .lbl{ font-size:9px }

/* 액션칩 (리스트: 텍스트 유지 + 중앙) */
.ad-excerpt{ display:none }
/* 액션칩: 배경/테두리/그림자 모두 제거하고 텍스트와 아이콘만 */
.chip.action{
  padding:0;                /* ← 여백 제거 */
  min-height:auto;
  background:transparent;   /* ← 배경 제거 */
  border:0;                 /* ← 테두리 제거 */
  border-radius:0 !important;
  box-shadow:none;          /* ← 그림자 제거 */
  color:inherit;            /* 페이지 글자색 따름 */
  display:inline-flex; align-items:center; gap:6px;
}

/* 리스트/그리드 공통: 고정폭 해제, 자연스럽게 배치 */
.list .chip.action{ flex:0 0 auto; width:auto; min-width:0; }
.chip-row.actions{ gap:10px; padding-inline:0; }
/* 연핑크 컬러 토큰 추가(원하는 색으로 조정 가능) */
:root{ --act-pink:#ff9cc4; }

/* ✅ 액션버튼(리스트 r-actions 내부) 아이콘만 연핑크로 */
/* 액션 아이콘 색 (연핑크) – 페이지 전체에서 공통 적용 */
.page{ --act-pink:#ff9cc4; }

/* 리스트/그리드 공통: 아이콘을 연핑크로 */
.actions .chip.action .icon{
  color: var(--act-pink) !important;
}
.actions .chip.action .icon svg{
  fill: currentColor;
  stroke: currentColor;
}

/* (기존) 아이콘 공통 — 다른 아이콘은 기존 색 유지 */
.icon{ width:15px; height:15px; display:inline-grid; place-items:center; color:#4f46e5; }
.icon svg{ width:15px; height:15px; }


:root[data-theme="dark"]  .chip.action{ background:#0f1324; border-color:#232a5a; color:#c9d2ff }
:root[data-theme="black"] .chip.action{ background:#0b0e1c; border-color:#232a5a; color:#c9d2ff }


/* 그리드: 아이콘만 보이게 */
.grid .actions .txt{ display:none }            /* 텍스트 숨김 */
.grid .chip.action{
  flex:0 0 auto; padding:8px; min-width:36px; max-width:36px; /* 동그란 아이콘 버튼 느낌 */
}

/* ===== 담당 드롭다운 ===== */
.mgr-portal{ position:fixed; inset:0; z-index:10001; outline:none; }
.mgr-backdrop{ position:absolute; inset:0; background:transparent; }
.mgr-pop{
  position:absolute; min-width:220px;
  background:var(--surface); color:var(--fg);
  border:1px solid var(--line); border-radius:12px;
  box-shadow:0 16px 40px rgba(0,0,0,.18);
  padding:6px; overflow:hidden;
}

/* ▶ 블랙(다크) 모드일 때 검은 배경 + 흰 글씨 강제 */
:root[data-theme="dark"]  .mgr-pop,
:root[data-theme="black"] .mgr-pop{
  background:#000; color:#fff; border-color:rgba(255,255,255,.18);
}

.mgr-opt{
  width:100%; text-align:left; border:0; background:transparent;
  padding:10px 12px; border-radius:10px; display:flex; flex-direction:column; gap:2px; font-weight:800;
}
.mgr-opt:hover{ background:rgba(255,255,255,.06) }
.mo-name{ font-size:14px; font-weight:900 }
:root[data-theme="white"] .mo-name{ color:#111 !important }
:root[data-theme="white"] .mo-sub{ color:#666 !important }
:root[data-theme="dark"]  .mo-name,
:root[data-theme="black"] .mo-name{ color:#fff !important }
:root[data-theme="dark"]  .mo-sub,
:root[data-theme="black"] .mo-sub{ color:#a2a2a9 !important }
.mgr-empty{ padding:10px 12px; font-size:13px; color:#888 }

/* ===== 지역 드롭다운(포털) ===== */
.macro-portal{ position:fixed; inset:0; z-index:10000; outline:none; }
.macro-backdrop{ position:absolute; inset:0; background:transparent; }
.macro-pop{
  position:absolute; min-width:160px; background:var(--surface); color:var(--fg);
  border:1px solid var(--line); border-radius:12px; box-shadow:0 14px 36px var(--shadow);
  padding:6px;
}
:root[data-theme="white"] .macro-pop{ background:#fff; color:#111; border-color:rgba(0,0,0,.12) }
:root[data-theme="dark"]  .macro-pop{ background:#1c1c1f; color:#fff; border-color:rgba(255,255,255,.12) }
.macro-item{
  width:100%; text-align:left; border:0; background:transparent;
  padding:9px 10px; border-radius:10px; font-weight:900; font-size:13px;
}
:root[data-theme="white"] .macro-item{ color:#111 !important }
:root[data-theme="dark"]  .macro-item{ color:#fff !important }
.macro-item.active{ outline:2px solid var(--accent) }
.macro-item:hover{ background:rgba(0,0,0,.05) }
:root[data-theme="dark"] .macro-item:hover{ background:rgba(255,255,255,.06) }

.action-sheet{
  width:100%; max-width:680px;
  background:var(--surface); color:var(--fg);
  border-bottom-left-radius:18px; border-bottom-right-radius:18px; /* ↓ 아래 둥글게 */
  border-top-left-radius:0; border-top-right-radius:0;
  box-shadow:0 10px 30px rgba(0,0,0,.25); /* 그림자 방향 반전 */
  padding:12px 14px 14px;

  /* 앱바 바로 아래에서 시작 */
  margin-top: 8px;

  /* 콘텐츠 길면 내부 스크롤 */
  max-height: calc(100dvh
    - (var(--appbar-height) + env(safe-area-inset-top) + 24px)
    - (var(--tabbar-height) + env(safe-area-inset-bottom))
  );
  overflow:auto;
  -webkit-overflow-scrolling:touch;

  /* 위에서 아래로 슬라이드 */
  animation: slideDownTop .16s ease-out;
}

@keyframes slideDownTop{
  from{ transform:translateY(-12px); opacity:.7 }
  to{ transform:none; opacity:1 }
}

.as-header{ display:flex; justify-content:space-between; align-items:center; padding:4px 2px 10px; border-bottom:1px solid var(--line) }
.as-close{
  width:32px; height:32px; border-radius:999px;
  border:1px solid var(--line); background:var(--surface);
  display:grid; place-items:center; font-weight:900;
  /* 기본은 현재 테마 글자색을 따르도록 */
  color: var(--fg);
}
/* ✅ 화이트 모드에선 확실히 검정 고정 */
:root[data-theme="white"] .as-close{
  color:#111 !important;
  -webkit-text-fill-color:#111 !important;
}
/* (가독성) 다크/블랙에선 흰색 고정하고 테두리 대비 강화 */
:root[data-theme="dark"]  .as-close,
:root[data-theme="black"] .as-close{
  color:#fff !important;
  -webkit-text-fill-color:#fff !important;
  border-color: rgba(255,255,255,.24);
}

.as-body{ padding:12px 2px 2px }
.as-title{ margin:0 0 10px; font-size:16px }
.kv{ display:flex; justify-content:space-between; gap:10px; padding:8px 0; border-bottom:1px dashed var(--line) }
.kv .k{ color:var(--muted) } .kv .v{ font-weight:700 }
.list .li{ display:flex; align-items:flex-start; gap:8px } .dot{ color:var(--muted) }
.badge.small{ font-size:11px; border:1px solid var(--line); border-radius:999px; padding:2px 6px; margin-right:6px; background:var(--surface) }
.as-actions{
  display:flex; gap:8px; flex-wrap:wrap; padding:8px 0 0;

  /* ✅ 스크롤해도 버튼 항상 시트 하단에 고정 */
  position: sticky;
  bottom: 0;
  margin-top: 8px;
  background: var(--surface);
  padding-bottom: 10px; /* 터치 여유 */
}

.btn{ flex:1; min-width:120px; height:42px; border-radius:12px; border:1px solid var(--line); background:var(--surface); font-weight:800; }
.btn.primary{ background: color-mix(in oklab, var(--accent), white 85%); border-color: var(--accent) }

/* 1) r-right 내부 형제 사이 구분선 제거 */
.row-card .r-right > * + * { border-top: 0 !important; box-shadow: none !important; background-image: none !important; }
/* 2) pseudo 요소 선 제거 */
.row-card .r-right > * + *::before,
.row-card .r-right > * + *::after { content: none !important; display: none !important; }
/* 3) seam 예방 */
.row-card { background-clip: padding-box; }

/* 초소형 화면 보완 */
@media (max-width: 360px){
  .row-card{
    --thumb-col: 26%;
    position:relative;
    border:1px solid var(--line);
    border-radius:12px;
    background:var(--surface);
    box-shadow:0 1px 3px var(--shadow);
    color: var(--fg);
    padding:8px;
    display:grid;
    grid-template-columns: var(--thumb-col) 1fr;
    grid-template-rows:auto auto;
    column-gap:8px; row-gap:2px;
    align-items:start;
    overflow:visible;
    min-height:128px;
  }
  .metric-row.equal-3{ grid-template-columns: repeat(3, minmax(80px, 1fr)); gap:6px }
  .grid{ gap:8px }
  .chip-row.actions{ gap:4px }
  .list .chip.action{ flex:0 0 74px }
  .chip.action{ padding:6px 8px; font-size:11px; }
}

/* 두칸보기: 광고요약 구역 상단선 제거 */
.grid-card .ad-excerpt { border-top: 0 !important; background-image: none !important; }

/* 배경이미지는 유지, 선만 끄기 */
.row-card * { border-top: 0 !important; }

/* 리스트 뷰: 버튼을 자연스러운 너비로 중앙 배치 */
.list .r-actions .chip.action{
  width:auto;            /* ← 100% → auto */
  min-width:74px;        /* 보기 좋은 최소 폭 */
  padding:8px 10px;
  display:inline-flex;
  justify-content:center;
  white-space:nowrap;
  flex:0 0 auto;
}
/* 그리드 뷰: 액션 묶음 중앙 정렬 */
.grid .actions{
  display:flex;
  justify-content:center;
  gap:10px;
}

/* 초소형 화면 보완: 간격만 살짝 축소 */
@media (max-width: 360px){
  .list .r-actions{ gap:6px; margin-top:4px; }
}

/* === 사진 오버레이(업체명/위치·유형) === */
.thumb.wide, .thumb.small{ position:relative; }

/* 텍스트 크기/굵기 */
.ov-name{ font-weight:900; font-size:14px; line-height:1.1; }
.ov-sub { font-weight:800; font-size:11.5px; line-height:1.1; opacity:.95; }

.ov-name{ font-weight:900; font-size:14px; line-height:1.2; }
.ov-sub{ margin-top:2px; font-size:11px; opacity:.92; }

/* === 오른쪽 세로 지표(배너 크기) === */
.metric-col{ display:flex; flex-direction:column; gap:8px; align-items:stretch; }
.metric.big{
  height:52px; border:1.5px solid var(--line); border-radius:12px;
  background:var(--surface); box-shadow:0 2px 6px var(--shadow);
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  text-align:center;
}
.metric.big.editable,
.mini.editable{
  cursor:pointer;
}
.as-body .inp{
  width:120px; height:34px; border:1px solid var(--line); border-radius:8px;
  background:var(--surface); color:var(--fg); padding:0 10px; font-weight:700; text-align:right;
}

/* ▶ 큰 지표 숫자: 테마 변수 사용 */
.metric.big .num{
  font-weight:800;
  font-size:21px;
  line-height:1;
  margin-bottom:4px;
  color: var(--act-pink) !important; /* ← 연핑크 */
}
/* 한줄보기(list) 카드 내 숫자도 동일 변수 사용 */
.list .metric.big .num{
  color: var(--act-pink) !important; /* ← 연핑크 */
}

.metric.big .lbl{
  font-size:16px;
  color:var(--muted);
  font-weight:500;
}

.metric.big.demand{ border-color: color-mix(in oklab, currentColor, transparent 80%); }
/* ① 상태 색 변수 (페이지 범위에서 보장) */
.page{
  --wifi-ok:   #21c36b;  /* 좋음 */
  --wifi-mid:  #f2a100;  /* 보통 */
  --wifi-busy: #ff6a6a;  /* 혼잡 */
}

/* ② 핀/아이콘/도트에 변수 적용 */
.wifi-pin.ok,
.wifi-dot.ok,
.metric.big.demand.ok{   color:var(--wifi-ok) !important; }

.wifi-pin.mid,
.wifi-dot.mid,
.metric.big.demand.mid{  color:var(--wifi-mid) !important; }

.wifi-pin.busy,
.wifi-dot.busy,
.metric.big.demand.busy{ color:var(--wifi-busy) !important; }


/* 혼잡도 라벨 → 검은색 + 얇게 (테마 영향 X) */
.metric.big.demand .lbl{
  color:#111 !important;
  font-weight:400;
}

/* 미니/칩 형태로 상태 텍스트가 있는 경우(클래스를 ok/mid/busy로 붙여 쓰면 자동 연동) */
.mini.demand.ok    .lbl,
.mini.demand.mid   .lbl,
.mini.demand.busy  .lbl,
.status-chip.ok    .txt,
.status-chip.mid   .txt,
.status-chip.busy  .txt{
  color:currentColor !important;
}

/* (scoped 환경이라면 깊은 선택자 보강) */
:deep(.metric.big.demand .lbl),
:deep(.mini.demand .lbl),
:deep(.status-chip .txt){
  color:currentColor !important;
}


/* === 가로 지표: 이미지 높이와 동일하게 채우기 === */
.metric-wide{
  display:grid;
  grid-template-columns: repeat(3, 1fr);
  gap:8px;
  /* height:100%;  ← 삭제 */
}
/* 리스트: 사진 밖에 상·하 텍스트 배치 */
.thumb-wrap{
  display:flex;
  flex-direction:column;
  gap:4px;
}

.name-above{
  font-weight:900;
  font-size:14px;
  line-height:1.2;
  padding:0 2px;           /* 좌우 살짝 여백 */
  color: var(--fg);
}

.sub-below{
  font-weight:800;
  font-size:11.5px;
  line-height:1.1;
  padding:2px;             /* 사진 아래 텍스트 */
  color: var(--muted);
}

:root{
  /* 오른쪽 상자 묶음을 더 아래로 내리고 싶으면 +값 (px) */
  --metric-shift-down: 8;
  /* 상단을 깎아 전체 높이를 줄이고 싶으면 +값 (px) */
  --metric-trim-top: 10;
}

/* 다크/모바일만 다르게도 가능 */
@media (max-width: 360px){
  :root{
    --metric-shift-down: 10;
    --metric-trim-top: 12;
  }
}

/* 오른쪽 상단 정보 헤더 (한 줄) */
.info-line{
  display:flex;
  align-items:baseline;
  gap:8px;
  margin-bottom:-16px;     /* 지표와 간격 */
  min-width:0;
}
.info-name{
  flex:0 0 auto;
  min-width:0;
  font-weight:900;
  font-size:16px;
  line-height:1;
  color: var(--fg);
}
.info-sub{
  flex:0 0 auto;
  font-weight:800;
  font-size:11.5px;
  line-height:1.1;
  color: var(--muted);
}
.nowrap{ white-space:nowrap; }

/* 액션칩: 중앙 정렬(리스트 뷰) */
.list .r-actions{
  grid-column: 1 / -1;
  grid-row: 2;
  display:flex;
  flex-wrap: wrap;
  gap:10px;
  justify-content:center;   /* ← 중앙 정렬 */
  align-items:center;
  padding:0;
  margin-top:0 !important;
  border:0 !important;
  background:transparent !important;
}

/* ‘살짝 분리’ 규칙에 있던 여백도 0으로 통일 */
.row-card .ad-lines,
.row-card .r-actions { padding-top:0 !important; margin-top:0 !important; }


/* 왼쪽 사진 래퍼는 사진만 남으니 간격 최소화 */
.thumb-wrap{ gap:0; }

/* 지표 카드 높이 고정 (늘어남 방지) */
.metric-wide .metric.big{ height:60px; }  /* 고정값: 아래 .metric.big 규칙과 동일 */

/* 카드 전체를 더 콤팩트하게 (노출 개수↑) */
.row-card{
  --thumb-col: 24%;        /* 사진 폭 살짝 축소(기존 26%였다면) */
  padding:8px 8px 6px;     /* 하단 패딩 ↓ */
  row-gap:0;               /* 행 간격 제거 */
}
.r-right{ gap:4px }        /* 이름줄~지표 간 간격 최소화 */
.metric-wide{ gap:6px }    /* 지표 3칸 사이 간격 살짝 축소 */
.metric.big{ height:48px } /* 지표 상자 높이 소폭 축소(52→48) */
/* ▼ 글씨 크기 & 두께 통일 — 요청 반영 */
/* 1) 검색창: 입력/플레이스홀더 모두 크게, 얇게 */
:deep(input[type="search"]),
:deep(.search-input),
:deep(.searchbar input),
:deep(.search input[type="text"]) {
  font-size: 16px !important;
  font-weight: 300 !important;   /* 얇게 */
  line-height: 1.2 !important;
}
:deep(input[type="search"]::placeholder),
:deep(.search-input::placeholder),
:deep(.searchbar input::placeholder),
:deep(.search input::placeholder) {
  font-size: 16px !important;
  font-weight: 300 !important;   /* 얇게 */
  opacity: .65 !important;
}

/* 2) 업체명 / 위치·유형(비율 맞춰 키우고 얇게) */
.info-name{
  font-size: 18px !important;    /* 16 → 18 */
  font-weight: 500 !important;   /* 900 → 500 */
  letter-spacing: -0.2px;
}
.info-sub{
  font-size: 13px !important;    /* 11.5 → 13 */
  font-weight: 400 !important;   /* 800 → 400 */
  letter-spacing: -0.1px;
}

/* 3) 지표 라벨(맞출방/필요인원/나쁨 등) – 크기/굵기 통일 */
.metric.big .lbl,
.mini .lbl{
  font-size: 13px !important;    /* 통일 */
  font-weight: 400 !important;   /* 얇게 통일 */
  line-height: 1.05 !important;
}

/* 혼잡도 라벨(좋음/보통/나쁨)도 같은 두께로 고정 */
.metric.big.demand .lbl{
  font-size: 13px !important;
  font-weight: 400 !important;
}

/* 4) 담당 드롭다운(담당 이름/연락처) 크게 + 얇게 */
.mgr-opt .mo-name{
  font-size: 16px !important;    /* 14 → 16 */
  font-weight: 500 !important;   /* 900 → 500 */
}
.mgr-opt .mo-sub{
  font-size: 14px !important;    /* (기본값) → 14 */
  font-weight: 400 !important;
}

/* (옵션) 바텀시트의 담당/연락처도 보기 좋게 */
.action-sheet .kv .k,
.action-sheet .kv .v{
  font-size: 15px !important;
  font-weight: 400 !important;
}
.action-mask{
  position:fixed; inset:0;
  background:rgba(0,0,0,.35);
  display:grid; place-items:start center; /* ↑ 위쪽 정렬 */
  z-index:9999;
  padding-top: calc(var(--appbar-height) + env(safe-area-inset-top)); /* 앱바 바로 아래 시작 */
}

/* 가게찾기와 동일한 컨트롤 바 룩 */
.finder-tools{
  display:flex; gap:6px; justify-content:flex-end; align-items:center;
}
.finder-tools .tool{
  width:28px; height:28px; border-radius:999px;
  border:1px solid var(--line);
  background:var(--surface);
  display:grid; place-items:center;
  box-shadow:0 2px 8px var(--shadow);
  color: var(--fg);
}
.finder-tools .tool.on{
  outline:2px solid var(--accent);
  background:var(--surface);
}
.finder-tools .tool[disabled]{ opacity:.6; pointer-events:none }
.view-tools{ display:flex; gap:6px; pointer-events:auto }
.tool{
  width:32px; height:32px; border-radius:999px; border:1px solid var(--line); background:#fff;
  display:grid; place-items:center; box-shadow:0 4px 10px var(--shadow); color:#111;
}
.tool.on{ outline:2px solid var(--accent); }

/* ✅ 테마 무시: 저장 버튼 텍스트 항상 검정 고정 */
.save-btn{
  height:34px;
  padding:0 12px;
  font-weight:900;
  color:#111 !important;
  -webkit-text-fill-color:#111 !important;
}
.save-btn:disabled{
  color:#444 !important;
  -webkit-text-fill-color:#444 !important;
}

/* ===== 담당자 리스트 시트 ===== */
.mgr-list-sheet{
  list-style:none;
  margin:0;
  padding:4px 0 0;
  display:flex;
  flex-direction:column;
  gap:6px;
}

.mgr-li-sheet{
  display:grid;
  grid-template-columns:48px 1fr auto;
  align-items:center;
  gap:10px;
  padding:8px 10px;
  border-radius:12px;
  border:1px solid var(--line);
  background:var(--surface);
  box-shadow:0 2px 8px var(--shadow);
  cursor:pointer;
}

.mgr-li-sheet:active{
  transform:translateY(1px);
  box-shadow:0 1px 4px var(--shadow);
}

.mgr-thumb{
  width:48px;
  height:48px;
  border-radius:10px;
  background-size:cover;
  background-position:center;
  background-color:#f2f2f4;
}

.mgr-li-main{
  min-width:0;
  display:flex;
  flex-direction:column;
  gap:2px;
}

.mgr-li-name{
  font-size:14px;
  font-weight:900;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}

.mgr-li-sub{
  font-size:12px;
  color:var(--muted);
}

.mgr-li-arrow{
  font-size:18px;
  font-weight:700;
  color:var(--muted);
}

</style>
