<template>
  <section class="wrap compact">
    <!-- ===== 상단 헤더 ===== -->
    <header class="page-head">
      <h2 class="title">강톡</h2>

      <!-- ① 힐링톡 히어로 -->
      <div
        class="healing-head hero"
        role="button"
        tabindex="0"
        :style="heroStyle('heal')"
        @click="openHealing"
      >
        <span class="yh-left">
          <svg class="yh-logo" viewBox="0 0 48 48" aria-hidden="true">
            <circle cx="24" cy="16" r="8" fill="currentColor" opacity=".15"/>
            <path d="M24 2v4M24 26v4M10 16h-4M42 16h-4M14.3 6.3l-2.8 2.8M36.5 28.5l-2.8 2.8M14.3 25.7l-2.8-2.8M39.3 9.1l-2.8 2.8"
                  stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
          <b class="yh-title">힐링톡</b>
          <span class="tagline"><span>여행 · 건강 · 명언</span></span>
        </span>
      </div>

      <!-- ② 힐링 3줄 -->
      <ul class="heal-quick">
        <li>
          <button class="pill-row" type="button" @click="openHealingCat('travel')">
            <span class="ico">🧭</span>
            <span class="txt">
              <span class="lbl">여행</span>
              <span class="sub">{{ HEAL_SUBS.travel }}</span>
            </span>
          </button>
        </li>
        <li>
          <button class="pill-row" type="button" @click="openHealingCat('health')">
            <span class="ico">🩺</span>
            <span class="txt">
              <span class="lbl">건강</span>
              <span class="sub">{{ HEAL_SUBS.health }}</span>
            </span>
          </button>
        </li>
        <li>
          <button class="pill-row" type="button" @click="openHealingCat('quote')">
            <span class="ico">📝</span>
            <span class="txt">
              <span class="lbl">명언</span>
              <span class="sub">{{ HEAL_SUBS.quote }}</span>
            </span>
          </button>
        </li>
      </ul>

      <!-- ③ 야호톡 히어로 -->
      <div
        class="yaho-head hero"
        role="button"
        tabindex="0"
        :style="heroStyle('yaho')"
        @click="openCategoryPage('all')"
      >
        <span class="yh-left">
          <svg class="yh-logo" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M6 12a10 10 0 0 1 10-10h16a10 10 0 0 1 10 10v8a10 10 0 0 1-10 10H22l-8 6v-6H16A10 10 0 0 1 6 20v-8Z" fill="currentColor" opacity=".12"/>
            <rect x="25" y="16" width="14" height="12" rx="3" stroke="currentColor" fill="none" stroke-width="2"/>
            <path d="M32 16v-2a4 4 0 1 1 8 0v2" stroke="currentColor" fill="none" stroke-width="2"/>
          </svg>
          <b class="yh-title">야호톡</b>
          <span class="tagline">
            <svg class="tag-lock" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="6" y="10" width="12" height="10" rx="2" stroke="currentColor" fill="none" stroke-width="2"/>
              <path d="M8 10V8a4 4 0 0 1 8 0v2" stroke="currentColor" fill="none" stroke-width="2"/>
            </svg>
            <span><b>100% 비공개</b></span>
          </span>
        </span>
      </div>

      <!-- ④ 야호톡 긴 바(카테고리) -->
      <section class="yaho-quick">
        <ul class="yq-list">
          <li>
            <button class="pill-row" type="button" @click="openCategoryPage('hot')">
              <span class="ico">{{ catIcon('hot') }}</span>
              <span class="txt">
                <span class="lbl">인기</span>
                <span class="sub">{{ YA_SUBS.hot }}</span>
              </span>
            </button>
          </li>

          <li>
            <button class="pill-row" type="button" @click="openCategoryPage('daily')">
              <span class="ico">{{ catIcon('daily') }}</span>
              <span class="txt">
                <span class="lbl">일상</span>
                <span class="sub">{{ YA_SUBS.daily }}</span>
              </span>
            </button>
          </li>

          <li>
            <button class="pill-row" type="button" @click="openCategoryPage('suggest')">
              <span class="ico">{{ catIcon('suggest') }}</span>
              <span class="txt">
                <span class="lbl">건의</span>
                <span class="sub">{{ YA_SUBS.suggest }}</span>
              </span>
            </button>
          </li>

          <li>
            <button class="pill-row" type="button" @click="openCategoryPage('pledge')">
              <span class="ico">{{ catIcon('pledge') }}</span>
              <span class="txt">
                <span class="lbl">다짐</span>
                <span class="sub">{{ YA_SUBS.pledge }}</span>
              </span>
            </button>
          </li>

          <li>
            <button class="pill-row" type="button" @click="openCategoryPage('vote')">
              <span class="ico">{{ catIcon('vote') }}</span>
              <span class="txt">
                <span class="lbl">투표</span>
                <span class="sub">{{ YA_SUBS.vote }}</span>
              </span>
            </button>
          </li>

          <li>
            <button class="pill-row" type="button" @click="openCategoryPage('quiz')">
              <span class="ico">{{ catIcon('quiz') }}</span>
              <span class="txt">
                <span class="lbl">팡팡</span>
                <span class="sub">{{ YA_SUBS.quiz }}</span>
              </span>
            </button>
          </li>

          <li>
            <button class="pill-row" type="button" @click="openCategoryPage('event')">
              <span class="ico">{{ catIcon('event') }}</span>
              <span class="txt">
                <span class="lbl">이벤트</span>
                <span class="sub">{{ YA_SUBS.event }}</span>
              </span>
            </button>
          </li>
        </ul>
      </section>
    </header>

    <!-- ===== 가게전용 게시판: 한 줄 리스트 ===== -->
    <section class="biz-one-line">
      <header class="sec-head">
        <h3 role="button" tabindex="0" @click="openFirstBiz">가게전용 게시판</h3>
      </header>

      <div class="biz-filters" @click.stop>
        <div class="filter">
          <button class="chip sm" type="button" @click="uiBiz.regionOpen = !uiBiz.regionOpen">
            {{ regionLabelBiz(selectedRegionBiz) }}
          </button>
          <ul v-if="uiBiz.regionOpen" class="menu" @click.self="uiBiz.regionOpen=false">
            <li v-for="opt in regionOptionsBiz" :key="opt.key">
              <button class="menu-item" type="button" @click="selectRegionBiz(opt.key)">
                {{ opt.label }}
              </button>
            </li>
          </ul>
        </div>

        <div class="filter">
          <button class="chip sm" type="button" @click="uiBiz.typeOpen = !uiBiz.typeOpen">
            {{ typeLabelBiz(selectedTypeBiz) }}
          </button>
          <ul v-if="uiBiz.typeOpen" class="menu" @click.self="uiBiz.typeOpen=false">
            <li v-for="opt in typeOptionsBiz" :key="opt.key">
              <button class="menu-item" type="button" @click="selectTypeBiz(opt.key)">
                {{ opt.label }}
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div v-if="loading" class="muted center" style="padding:6px 0;">불러오는 중…</div>
      <ul v-else class="biz-list">
        <li v-for="r in filteredBizRooms" :key="r.id" class="biz-row" @click="openBiz(r)">
          <img class="thumb" :src="r.logo || FALLBACK_BIZ_IMG" alt="" />
          <div class="meta">
            <div class="name ellip">{{ r.name }}</div>
            <div class="last ellip">{{ latestLine(r) }}</div>
          </div>
        </li>
      </ul>
      <p v-if="!loading && bizRooms.length === 0" class="muted center">등록된 업체가 없습니다.</p>
    </section>

    <!-- ===== 투표 상세 바텀시트 ===== -->
    <div v-if="votePost" class="sheet-backdrop" @click.self="closeVote">
      <div class="sheet">
        <header class="sheet-head">
          <strong class="sheet-title">{{ votePost.title }}</strong>
          <button class="x" type="button" @click="closeVote">✕</button>
        </header>
        <div class="sheet-sub">
          <span class="muted">투표 · {{ timeAgo(votePost.updatedAt) }}</span>
          <span class="muted">총 {{ poll.total }}표</span>
        </div>
        <div class="poll">
          <div class="opt">
            <div class="label"><b>{{ poll.aText }}</b><span>{{ poll.aVotes }}표 · {{ poll.aPct }}%</span></div>
            <div class="bar"><div class="fill a" :style="{ width: poll.aPct + '%' }"></div></div>
          </div>
          <div class="opt">
            <div class="label"><b>{{ poll.bText }}</b><span>{{ poll.bVotes }}표 · {{ poll.bPct }}%</span></div>
            <div class="bar"><div class="fill b" :style="{ width: poll.bPct + '%' }"></div></div>
          </div>
        </div>
        <div class="row vote-actions">
          <button class="vote a" type="button" @click="doVote(0)">{{ poll.aText }} 선택</button>
          <button class="vote b" type="button" @click="doVote(1)">{{ poll.bText }} 선택</button>
        </div>
      </div>
    </div>

    <!-- ========== 카테고리(야호) 전용 풀스크린 페이지 ========== -->
    <div v-if="catPage.open" class="cat-mask" @click.self="closeCatPage">
      <section class="cat-sheet" role="dialog" aria-modal="true">
        <header class="cat-head">
          <button class="back-btn" type="button" aria-label="뒤로가기" @click="closeCatPage">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <strong class="cat-title">{{ catLabel }}</strong>
          <span class="spacer"></span>

          <!-- 관리자 전용 시더 토글 -->
          <button v-if="isAdmin" class="btn-mini" type="button" @click.stop="toggleAutoSeed">
            {{ AUTO_SEED ? '자동글 OFF' : '자동글 ON' }}
          </button>


          <button class="btn-write" type="button" @click="openCreate">글쓰기</button>
        </header>

        <section class="notice-sec tight">
          <header class="notice-head">
            <span>공지</span>
            <span class="spacer"></span>
            <button
              v-if="otherNotices.length"
              class="btn-mini"
              type="button"
              @click="showAllNotices = !showAllNotices"
            >
              {{ showAllNotices ? '접기' : `이전 공지 ${otherNotices.length}개` }}
            </button>
            <template v-if="isAdmin">
              <button class="btn-mini" type="button" @click="openNoticeCreate">글쓰기</button>
            </template>
          </header>

          <ul class="notice-list">
            <li v-if="recentNotice" class="notice-row" role="button" tabindex="0"
                @click="openDetail(recentNotice)"
                @keydown.enter.prevent="openDetail(recentNotice)"
                @keydown.space.prevent="openDetail(recentNotice)">
              <span class="n-bullet">📌</span>
              <span class="n-title ellip">{{ recentNotice.title }}</span>
              <span class="n-meta">익명 · {{ timeAgo(recentNotice.updatedAt || recentNotice.createdAt) }}</span>
              <template v-if="isAdmin">
                <div class="n-admin" @click.stop>
                  <button class="btn-mini" type="button" @click="startNoticeEdit(recentNotice)">수정</button>
                  <button class="btn-mini danger" type="button" @click="deleteNotice(recentNotice)">삭제</button>
                </div>
              </template>
            </li>
            <li v-else class="notice-empty">
              등록된 공지가 없습니다.
              <button v-if="isAdmin" class="btn-mini" type="button" @click="openNoticeCreate" style="margin-left:8px">공지 작성</button>
            </li>
          </ul>

          <transition name="fade">
            <ul v-if="showAllNotices && otherNotices.length" class="notice-list older">
              <li v-for="n in otherNotices" :key="n.id" class="notice-row" role="button" tabindex="0" @click="openDetail(n)" @keydown.enter.prevent="openDetail(n)" @keydown.space.prevent="openDetail(n)">
                <span class="n-bullet">📌</span>
                <span class="n-title ellip">{{ n.title }}</span>
                <span class="n-meta">익명 · {{ timeAgo(n.updatedAt || n.createdAt) }}</span>
                <template v-if="isAdmin">
                  <div class="n-admin" @click.stop>
                    <button class="btn-mini" type="button" @click="startNoticeEdit(n)">수정</button>
                    <button class="btn-mini danger" type="button" @click="deleteNotice(n)">삭제</button>
                  </div>
                </template>
              </li>
            </ul>
          </transition>
        </section>

        <ul class="ql-list">
          <li v-for="(p, idx) in catPosts" :key="p.id" class="ql-row"
              role="button" tabindex="0"
              @click="openDetail(p)"
              @keydown.enter.prevent="openDetail(p)"
              @keydown.space.prevent="openDetail(p)">
            <div class="ql-left">{{ /^\d+$/.test(String(p.id)) ? p.id : (catPosts.length - idx) }}</div>
            <div class="ql-body">
              <div class="ql-top">
                <span class="ql-ico" :title="catLabelFor(p.category)" aria-hidden="true">{{ catIcon(p.category) }}</span>

                <!-- 제목(행 클릭으로 위임) -->
                <span class="ql-title ellip clickable" role="button" tabindex="0">
                  {{ p.title }}
                </span>

                <!-- 화살표(행 클릭으로 위임) -->
                <svg class="ql-arr" viewBox="0 0 24 24" role="button" tabindex="0">
                  <path d="M8 4l8 8-8 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>

              <!-- 스니펫(행 클릭으로 위임) -->
              <div v-if="shouldShowSnippet(p)" class="ql-snippet ellip clickable" role="button" tabindex="0">
                {{ firstLine(p) }}
              </div>

              <div class="ql-meta">
                <span class="m by">{{ authorName(p) }}</span><span class="sep">/</span>
                <span class="m date">{{ ymd(p.updatedAt || p.createdAt) }}</span><span class="sep">/</span>
                <span class="m">조회수 : <b>{{ Number(p.views||0).toLocaleString() }}</b></span><span class="sep">/</span>
                <span class="m red">추천수 : <b>{{ Number(p.likes||0).toLocaleString() }}</b></span>
              </div>

              <!-- 관리자 영역만 클릭 막기 유지 -->
              <div class="ql-admin" v-if="isAdmin" @click.stop>
                <button class="btn-mini" type="button" @click="startEdit(p)">수정</button>
                <button class="btn-mini danger" type="button" @click="deletePost(p)">삭제</button>
              </div>
            </div>
          </li>
          <li v-if="!catPosts.length" class="ql-empty">아직 등록된 글이 없습니다.</li>
        </ul>
      </section>
    </div>

    <!-- ========== 힐링톡(여행/건강/명언) 풀스크린 페이지 ========== -->
    <div v-if="healingPage.open" class="cat-mask" @click.self="closeHealingPage">
      <section class="cat-sheet" role="dialog" aria-modal="true">
        <header class="cat-head">
          <button class="back-btn" type="button" aria-label="뒤로가기" @click="closeHealingPage">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <strong class="cat-title">힐링톡 · {{ healLabel }}</strong>
          <span class="spacer"></span>

          <!-- 관리자 전용 시더 토글 -->
          <button v-if="isAdmin" class="btn-mini" type="button" @click.stop="toggleAutoSeed">
            {{ AUTO_SEED ? '자동글 OFF' : '자동글 ON' }}
          </button>

          <button class="btn-write" type="button" @click="openCreate">글쓰기</button>
        </header>

        <section class="notice-sec tight">
          <header class="notice-head"><span>공지</span></header>
          <ul class="notice-list">
            <li v-if="recentHealNotice" class="notice-row" role="button" tabindex="0"
                @click="openDetail(recentHealNotice)"
                @keydown.enter.prevent="openDetail(recentHealNotice)"
                @keydown.space.prevent="openDetail(recentHealNotice)">
              <span class="n-bullet">📌</span>
              <span class="n-title ellip">{{ recentHealNotice.title }}</span>
              <span class="n-meta">
                {{ authorName(recentHealNotice) }} · {{ timeAgo(recentHealNotice.updatedAt || recentHealNotice.createdAt) }}
              </span>
              <!-- ✅ 관리자만 보이는 수정/삭제 -->
              <template v-if="isAdmin">
                <div class="n-admin" @click.stop>
                  <button class="btn-mini" type="button" @click="startNoticeEdit(recentHealNotice)">수정</button>
                  <button class="btn-mini danger" type="button" @click="deleteNotice(recentHealNotice)">삭제</button>
                </div>
              </template>
            </li>
            <li v-else class="notice-empty">등록된 공지가 없습니다.</li>
          </ul>
        </section>

        <ul class="ql-list">
          <li v-for="(p, idx) in healPosts" :key="p.id" class="ql-row"
              role="button" tabindex="0"
              @click="openDetail(p)"
              @keydown.enter.prevent="openDetail(p)"
              @keydown.space.prevent="openDetail(p)">
            <div class="ql-left">{{ /^\d+$/.test(String(p.id)) ? p.id : (healPosts.length - idx) }}</div>
            <div class="ql-body">
              <div class="ql-top">
                <span class="ql-title ellip clickable" role="button" tabindex="0">
                  <small v-if="p.isSeed" class="muted" style="margin-right:6px">가이드</small>
                  {{ p.title }}
                </span>

                <svg class="ql-arr" viewBox="0 0 24 24" role="button" tabindex="0">
                  <path d="M8 4l8 8-8 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </div> <!-- ✅ ql-top 닫기 -->

              <div class="ql-snippet ellip clickable" role="button" tabindex="0">
                {{ firstLine(p) }}
              </div>

              <div class="ql-meta">
                <span class="m by">{{ authorName(p) }}</span><span class="sep">/</span>
                <span class="m date">{{ ymd(p.updatedAt || p.createdAt) }}</span><span class="sep">/</span>
                <span class="m">조회수 : <b>{{ Number(p.views||0).toLocaleString() }}</b></span><span class="sep">/</span>
                <span class="m red">추천수 : <b>{{ Number(p.likes||0).toLocaleString() }}</b></span>
              </div>

              <!-- ✅ 관리자만 보이는 수정/삭제 (야호톡과 동일) -->
              <div class="ql-admin" v-if="isAdmin" @click.stop>
                <button class="btn-mini" type="button" @click="startEdit(p)">수정</button>
                <button class="btn-mini danger" type="button" @click="deletePost(p)">삭제</button>
              </div>
            </div>
          </li>
          <li v-if="!healPosts.length" class="ql-empty">아직 글이 없습니다.</li>
        </ul>
      </section>
    </div>

    <!-- ========== 채팅 시트(권한 안전) ========== -->
    <div v-if="room.open" class="chat-mask" @click.self="closeRoom">
      <section class="chat-sheet" role="dialog" aria-modal="true">
        <template v-if="chatNoAccess">
          <div class="center muted" style="padding:16px 8px">
            <b>이 채팅방을 볼 권한이 없습니다.</b><br />
            담당자에게 초대를 요청해 주세요.
          </div>
          <div class="cmt-actions" style="justify-content:flex-end">
            <button class="btn-cmt" type="button" @click="closeRoom">닫기</button>
          </div>
        </template>

        <template v-else>
          <!-- 채팅 내용 등 기존 유지 -->
        </template>
      </section>
    </div>

    <!-- ========== 글쓰기(일반/투표/업체) 모달 — 위치 이동(전역) ========== -->
    <div v-if="showGenModal" class="sheet-backdrop" @click.self="showGenModal=false">
      <div class="sheet compose-sheet">
        <header class="sheet-head">
          <strong class="sheet-title">{{ editTargetId ? '글 수정' : '글쓰기' }}</strong>
          <button class="x" type="button" @click="showGenModal=false">✕</button>
        </header>

        <!-- 카테고리/대상 -->
        <div class="compose-top">
          <template v-if="composeBiz">
            <div class="muted small">업체 게시판</div>
            <div class="chip sm">{{ composeBizStoreName }}</div>
          </template>
          <template v-else>
            <label class="muted small">카테고리</label>
            <div class="cat-tabs one-line" role="tablist" aria-label="글쓰기 카테고리">
              <button
                v-for="c in [{key:'daily',label:'일상'},{key:'suggest',label:'건의'},{key:'pledge',label:'다짐'},{key:'vote',label:'투표'},{key:'quiz',label:'퀴즈'},{key:'event',label:'이벤트'},{key:'travel',label:'여행'},{key:'health',label:'건강'},{key:'quote',label:'명언'}]"
                :key="c.key"
                class="chip xs"
                :class="{ on: composeCat === c.key }"
                type="button"
                @click="composeCat = c.key"
              >{{ c.label }}</button>
            </div>
          </template>
        </div>

        <!-- 입력 폼 -->
        <form @submit.prevent="confirmCreate" class="compose-form">
          <input class="field" type="text" v-model="composeTitle" placeholder="제목을 입력하세요" />

          <!-- 투표일 때 A/B 항목 -->
          <div v-if="!composeBiz && composeCat==='vote'" class="vote-fields">
            <input class="field" type="text" v-model="composeA" placeholder="항목 A" />
            <input class="field" type="text" v-model="composeB" placeholder="항목 B" />
          </div>

          <!-- 일반 본문/부제 -->
          <input class="field" type="text" v-model="composeSubtitle" placeholder="부제(선택)" v-if="composeCat!=='vote'"/>
          <textarea class="field ta" rows="7" v-model="composeBody" placeholder="내용을 입력하세요" v-if="composeCat!=='vote'"></textarea>

          <!-- 첨부 메뉴(간단) -->
          <div class="cmt-actions" style="margin-top:8px">
            <button type="button" class="btn-mini" @click="cToggleAttach">첨부</button>
            <span class="spacer"></span>
            <button class="btn-cmt" type="submit">{{ editTargetId ? '수정 완료' : '등록' }}</button>
          </div>

          <!-- 첨부 팝 -->
          <div v-if="cAttach.open" class="attach-pop compose-attach" :style="cAttach.style" @click.stop>
            <button class="attach-item" type="button" @click="cPickImage">사진 첨부</button>
            <button class="attach-item" type="button" @click="cPickFile">파일 첨부</button>
            <button class="attach-item" type="button" @click="cCloseAttach">닫기</button>
            <input ref="cFileInput" type="file" class="hidden" @change="cOnFile" multiple />
            <input ref="cImgInput"  type="file" accept="image/*" class="hidden" @change="cOnImage" multiple />
          </div>
        </form>
      </div>
    </div>

    <!-- ✅ 상세 페이지(풀스크린 시트) -->
    <div v-if="detail.open" class="detail-mask" @click.self="closeDetail">
      <section class="detail-sheet" role="dialog" aria-modal="true">
        <!-- 헤더 -->
        <header class="cat-head detail-head">
          <button class="back-btn" type="button" aria-label="닫기" @click="closeDetail">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <strong class="cat-title">{{ detail.post?.title || '상세' }}</strong>
          <span class="spacer"></span>
          <button class="btn-mini" type="button" @click="likeDetail">추천</button>
        </header>

        <!-- 본문 -->
        <section class="detail-body">
          <div class="d-meta muted">
            <span>{{ ymd(detail.post?.updatedAt || detail.post?.createdAt) }}</span>
          </div>
          <div v-if="detailBodyText" class="detail-pre" v-html="detailBodyHtml"></div>
          <div v-else class="detail-pre muted">내용 없음</div>
        </section>

        <!-- 댓글 -->
        <section class="cmt-sec">
          <header class="cmt-head"><b>댓글 {{ commentsCount }}</b></header>
          <ul class="cmt-list">
            <li v-for="c in topComments" :key="c.id" class="cmt-row">
              <div class="cmt-top">
                <span class="by">익명</span>
                <span class="time muted">{{ timeAgo(c.createdAt) }}</span>
                <span class="spacer"></span>
                <button class="cmt-mini" type="button" @click="startReply(c)">답글</button>
                <button class="cmt-mini danger" v-if="canDeleteComment(c)" type="button" @click="deleteComment(c)">삭제</button>
              </div>
              <div class="cmt-body" v-html="renderCmt(c.body)"></div>

              <ul class="reply-list">
                <li v-for="r in repliesOf(c.id)" :key="r.id" class="reply-row">
                  <div class="cmt-top">
                    <span class="by">익명</span>
                    <span class="time muted">{{ timeAgo(r.createdAt) }}</span>
                    <span class="spacer"></span>
                    <button class="cmt-mini danger" v-if="canDeleteComment(r)" type="button" @click="deleteComment(r)">삭제</button>
                  </div>
                  <div class="cmt-body" v-html="renderCmt(r.body)"></div>
                </li>
              </ul>

              <!-- 대댓글 입력 -->
              <div v-if="replyForId === c.id" class="reply-composer">
                <textarea class="field ta" rows="3" v-model="replyDraft" placeholder="답글을 입력하세요"></textarea>
                <div class="cmt-actions">
                  <button class="btn-mini" type="button" @click="cancelReply">취소</button>
                  <span class="spacer"></span>
                  <button class="btn-cmt" type="button" @click="submitReply(c.id)">등록</button>
                </div>
              </div>
            </li>
          </ul>
        </section>

        <!-- 댓글 작성 (하단 고정) -->
        <form class="composer sticky" @submit.prevent="submitComment">
          <textarea class="field ta" rows="3" v-model="cmtDraft" placeholder="댓글을 입력하세요"></textarea>
          <div class="cmt-actions">
            <span class="spacer"></span>
            <button class="btn-cmt" type="submit">등록</button>
          </div>
        </form>
      </section>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeMount, watch, nextTick, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db as fbDb } from '@/firebase'
import { getApp } from 'firebase/app'

try {
  const app = getApp()
  const cfg = app?.options || {}
  console.log('[gangtalk] projectId:', cfg.projectId, 'apiKey:', (cfg.apiKey||'').slice(0,8)+'***')
} catch (_) {}

import {
  collection, query, orderBy, onSnapshot, getDocs,
  doc, serverTimestamp, increment, limit
} from 'firebase/firestore'
import { sanitizeUserPayload } from '@/lib/author'
import { safeAdd, safeUpdate, safeDelete } from '@/lib/firestoreSafe'

import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { CATEGORY_TEMPLATES, BOT_NAMES } from '@/data/sim-templates'

const AUTO_OPEN_CAT = false
const EMOJIS = ['😀','😁','😂','🤣','😊','😍','😘','😎','🤔','😮','😢','😡','👍','👎','🙏','👏','🔥','✨','🎉','💯','🥹','🤝','🫶','💪','😴','🤩','😇','🙌']
const emoji = ref({ open:false, target:'', style:{ right:'16px', bottom:'126px' } })

const composeBodyEl = ref(null)
const noticeBodyEl  = ref(null)
const bizPage = ref({ open:false, store:null })

function openHealingCat(key){ healingPage.value = { open: true, filter: key } }

function showEmoji(target='compose'){
  emoji.value = {
    open:true,
    target,
    style: target==='chat' ? { right:'94px', bottom:'126px' } : { right:'16px', bottom:'126px' }
  }
  document.addEventListener('click', onDocClick, { capture:true })
}
function hideEmoji(){
  emoji.value.open = false
  document.removeEventListener('click', onDocClick, { capture:true })
}
function onDocClick(){ hideEmoji() }
function insertAtCursor(el, text){
  if (!el) return
  const start = el.selectionStart ?? el.value.length
  const end   = el.selectionEnd ?? el.value.length
  const v     = el.value ?? ''
  el.value    = v.slice(0, start) + text + v.slice(end)
  el.dispatchEvent(new Event('input'))
  const pos = start + text.length
  el.setSelectionRange?.(pos, pos)
  el.focus?.()
}
function pickEmoji(ch){
  if (emoji.value.target === 'chat') {
    insertAtCursor(composerInput.value, ch)
  } else if (emoji.value.target === 'notice') {
    insertAtCursor(noticeBodyEl.value, ch)
  } else {
    insertAtCursor(composeBodyEl.value, ch)
  }
  hideEmoji()
}
onBeforeUnmount(()=> document.removeEventListener('click', onDocClick, { capture:true }))

import { useUserNick } from '@/store/userNick.js'
const route = useRoute()
const router = useRouter()

// 👉 1x/2x 준비(레티나에서도 또렷) — 원하시는 이미지 URL로 교체하셔도 됩니다.
// 1x/2x 모두 같은 파일을 써도 되고, 필요하면 2x를 더 큰 파일로 교체하세요.
const HEALING_BG_1X = '/img/healing-hero.jpg';
const HEALING_BG_2X = '/img/healing-hero.jpg';
const YAHO_BG_1X    = '/img/yaho-hero.jpg';
const YAHO_BG_2X    = '/img/yaho-hero.jpg';

// 배경을 CSS 변수로 전달 (image-set으로 레티나에서도 또렷)
const heroStyle = (type) => ({
  '--hero-img-1x': `url('${type === 'heal' ? HEALING_BG_1X : YAHO_BG_1X}')`,
  '--hero-img-2x': `url('${type === 'heal' ? HEALING_BG_2X : YAHO_BG_2X}')`,
  // ▶ 배경 중심 위치: 힐링은 거의 중앙, 야호는 아래쪽(배 노출)으로 내림
  '--hero-pos': type === 'heal' ? 'center 50%' : 'center 35%',
  // 원하면 높이도 배너별로 다르게
  // '--hero-h': type === 'heal' ? '86px' : '96px',
});

// 🔽 카테고리별 배경 이미지
const PILL_BG = {
  travel: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop',
  health: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=1600&auto=format&fit=crop',
  quote:  'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=1600&auto=format&fit=crop',
  hot:    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1600&auto=format&fit=crop',
  daily:  'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1600&auto=format&fit=crop',
  suggest:'https://images.unsplash.com/photo-1559156167-1f3f674c92a0?q=80&w=1600&auto=format&fit=crop',
  pledge: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1600&auto=format&fit=crop',
  vote:   'https://images.unsplash.com/photo-1558449028-b53a39d100fc?q=80&w=1600&auto=format&fit=crop',
  quiz:   'https://images.unsplash.com/photo-1523246191915-6d2b56f0d5a5?q=80&w=1600&auto=format&fit=crop',
  event:  'https://images.unsplash.com/photo-1482192596544-9eb780fc7f66?q=80&w=1600&auto=format&fit=crop',
};

// 버튼(배너)용 인라인 스타일
function pillStyle(key){
  const url = PILL_BG[key] || PILL_BG.daily
  return { '--pill-img': `url('${url}')` }
}


/* 야호 카테고리: 아이콘/라벨/설명 교체 */
const yaCats = [
  { key:'daily',   label:'일상',   icon:'😉', desc:'오늘은 어땠어? 우리들의 소소한 이야기' },
  { key:'suggest', label:'건의',   icon:'📢', desc:'우리가게 업주에게 바란다' },
  { key:'pledge',  label:'다짐',   icon:'💊', desc:'타임캡슐!! 미래의 나의다짐' },
  { key:'vote',    label:'투표',   icon:'✌️', desc:'뭐가 좋을지 투표해줘' },
  { key:'quiz',    label:'팡팡',   icon:'💥', desc:'퀴즈풀고 선물받자' },
  { key:'event',   label:'이벤트', icon:'🎉', desc:'다양한 이벤트 소식 모아보기' },
];

/* 목록/배지에 쓰이는 부제 텍스트(상단 리스트) */
const YA_SUBS = {
  hot:    '오늘의 인기글,댓글',
  daily:  '오늘은 어땠어? 우리들의 소소한 이야기',
  suggest:'우리가게 업주에게 바란다',
  pledge: '타임캡슐!! 미래의 나의다짐',
  vote:   '뭐가 좋을지 투표해줘',
  quiz:   '퀴즈풀고 선물받자',
  event:  '다양한 이벤트 소식 모아보기',
};

/* 힐링(여행/건강/명언) 부제 교체 */
const HEAL_SUBS = {
  travel: '우리들만의 여행 이야기',
  health: '건강이 나를 위한 최고의 선물',
  quote:  '나를 감동시킨 오늘의 명언은??',
};

/* 카테고리별 아이콘 */
const CAT_ICON = {
  hot:'❤️',
  daily:'😉',
  suggest:'📢',
  pledge:'💊',
  vote:'✌️',
  quiz:'💥',
  event:'🎉'
};

const yahoCategoryCards = computed(()=>{
  const LIMIT = 10
  const allNonNotice = posts.value.filter(p => !p.isNotice)
  const hotSorted = allNonNotice.slice().sort((a,b)=>(Number(b.views||0)+Number(b.likes||0))-(Number(a.views||0)+Number(a.likes||0)))
  const hot = { key:'hot', label:'인기', icon:'🔥', sub: YA_SUBS.hot, preview: hotSorted.slice(0, LIMIT), hasMore: hotSorted.length > LIMIT }
  const rest = yaCats.map(c => {
    const pool = allNonNotice.filter(p => p.category === (yaMap[c.key]||c.key)).slice().sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))
    return { key:c.key, label:c.label, icon:c.icon, sub: YA_SUBS[c.key] || '', preview: pool.slice(0, LIMIT), hasMore: pool.length > LIMIT }
  })
  return [hot, ...rest]
})
const selectedCat = ref(null)
const yahoCardsToShow = computed(()=> !selectedCat.value ? yahoCategoryCards.value : yahoCategoryCards.value.filter(c => c.key === selectedCat.value))
function onMainTabClick(key){ yaTab.value = key; selectedCat.value = (selectedCat.value === key) ? null : key }

const yaTabsInPage = [{ key:'all', label:'전체', icon:'✨' }, ...yaCats]
function catIcon(cat){
  const k = String(cat||'');
  if (k === 'hot') return '❤️';
  return CAT_ICON[normalizeCategory(cat)] || '📌';
}
function catLabelFor(cat){
  if (cat === 'hot') return '인기';
  if (cat === 'quiz') return '퀴즈';
  return yaCats.find(c => c.key === normalizeCategory(cat))?.label || '기타';
}
const yaTab = ref('hot')
const currentYaDesc = computed(()=> yaCats.find(c=>c.key===yaTab.value)?.desc || '')
const yaMap = { daily:'daily', suggest:'suggest', pledge:'pledge', event:'event', vote:'vote', quiz:'quiz', travel:'travel', health:'health', quote:'quote' }

const normalizeCategory = (c) => {
  const k = String(c || '').toLowerCase()
  if (['hot'].includes(k)) return 'hot'
  if (['daily','anon'].includes(k)) return 'daily'
  if (['suggest','suggestion','sugg','var-suggest'].includes(k)) return 'suggest'
  if (['pledge','promise','var-pledge'].includes(k)) return 'pledge'
  if (['event','ev','var-event'].includes(k)) return 'event'
  if (['vote','poll'].includes(k)) return 'vote'
  if (['quiz','qz','trivia'].includes(k)) return 'quiz'
  if (['travel','trip','tour'].includes(k)) return 'travel'
  if (['health','wellness','헬스','건강'].includes(k)) return 'health'
  if (['quote','saying','명언'].includes(k)) return 'quote'
  if (k === 'var') return 'suggest'
  return 'daily'
}

const HEAL_ICON = { travel:'🧭', health:'🩺', quote:'📝' }
function healCatIcon(cat){ return HEAL_ICON[normalizeCategory(cat)] || '📌' }
function healCatLabelFor(cat){ return healCats.find(c => c.key === normalizeCategory(cat))?.label || '힐링' }

const healingPage = ref({ open:false, filter:'travel' })
const healLabel = computed(() => healingPage.value.filter === 'all' ? '전체' : (healCats.find(x => x.key === healingPage.value.filter)?.label || '힐링'))

/* Firestore: 게시판 글 */
const posts = ref([])
let unsubPosts = null
const tsToMs = (v) => {
  if (!v) return Date.now()
  if (typeof v === 'number') return v
  if (typeof v === 'string' && /^\d+$/.test(v)) return Number(v)
  if (typeof v?.toMillis === 'function') return v.toMillis()
  if (v?.toDate) return v.toDate().getTime()
  return Date.now()
}
async function subscribePosts () {
  try{
    const qRef = query(
      collection(fbDb, 'board_posts'),
      orderBy('updatedAt','desc'),
      orderBy('createdAt','desc')
    )
    // 화면 최초 오픈 여부 플래그
    const openedCatOnce = ref(false)

    const first = await getDocs(qRef)
    posts.value = first.docs.map(d => normalizePost(d.id, d.data()))
    console.log('[gangtalk] board_posts first load =', posts.value.length)

    if (!openedCatOnce.value && posts.value.length > 0 && AUTO_OPEN_CAT) {
      openedCatOnce.value = true
      openCategoryPage('all')            // ← 토글이 true일 때만 자동 오픈
    }

    unsubPosts = onSnapshot(
      qRef,
      (snap)=>{
        posts.value = snap.docs.map(d => normalizePost(d.id, d.data()))
        console.log('[gangtalk] board_posts snap =', posts.value.length)
        maybePatchRoomTitleFromPosts()

        if (!openedCatOnce.value && posts.value.length > 0 && AUTO_OPEN_CAT) {
          openedCatOnce.value = true
          openCategoryPage('all')        // ← 토글이 true일 때만 자동 오픈
        }
      },
      (err)=>{
        if (err?.code !== 'permission-denied') console.warn('board_posts onSnapshot error:', err)
      }
    )

  }catch(e){
    console.warn('board_posts 구독 실패:', e)
  }
}
const normalizePost = (id, x={}) => ({
  id,
  category: normalizeCategory(x.category),
  title: x.title || '(제목 없음)',
  subtitle: x.subtitle || '',
  body: x.body || x.content || '',
  content: x.content || x.body || '',
  author: x.author || '익명',
  authorUid: x.authorUid || '',
  views: Number(x.views || 0),
  likes: Number(x.likes || 0),
  cmtCount: Number(x.cmtCount || x.comments || 0),
  optA: x.optA || '',
  optB: x.optB || '',
  votesA: Number(x.votesA || 0),
  votesB: Number(x.votesB || 0),
  isNotice: !!x.isNotice,
  isSynthetic: !!x.isSynthetic,
  simScenario: x.simScenario || '',
  createdAt: tsToMs(x.createdAt || x.createdAtMs || x.updatedAt),
  updatedAt: tsToMs(x.updatedAt || x.updatedAtMs || x.createdAt),
})

const filteredForHot = computed(() => {
  const tab = yaTab.value
  if (tab === 'hot') return posts.value.filter(p => !p.isNotice)
  const tag = yaMap[tab] || 'daily'
  return posts.value.filter(p => p.category === tag)
})
const top3Views = computed(() => filteredForHot.value.slice().sort((a,b)=>Number(b.views||0)-Number(a.views||0)).slice(0,3))
const top3Likes = computed(() => filteredForHot.value.slice().sort((a,b)=>Number(b.likes||0)-Number(a.likes||0)).slice(0,3))
const top3Cmts  = computed(() => filteredForHot.value.slice().sort((a,b)=>Number(b.cmtCount||0)-Number(a.cmtCount||0)).slice(0,3))

/* Firestore: 업체 */
const loading = ref(true)
const bizRooms = ref([])
let unsubStores = null
const normalizeKey = (v) => String(v || '').trim().toLowerCase().replace(/\s|_/g, '')
const catLabelFromStore = (code) => {
  const k = normalizeKey(code)
  if (['ten', 'tencafe', 'ten-cafe'].includes(k)) return '텐카페'
  if (['tenpro', 'ten-pro', 'tp'].includes(k)) return '텐프로'
  if (['onep', 'one', 'onepercent', '1p', '1percent', '1%'].includes(k)) return '1%'
  if (['point5', '0.5', 'half', 'zzim'].includes(k)) return '쩜오'
  if (['hopper', 'happer', 'harper'].includes(k)) return '하퍼'
  if (['noraebang', 'nrb', 'norae'].includes(k)) return '노래방'
  if (['bar'].includes(k)) return '바'
  if (['karaoke'].includes(k)) return '가라오케'
  if (['lounge'].includes(k)) return '라운지'
  const passthrough = ['텐카페','텐프로','1%','쩜오','하퍼','노래방','바','가라오케','라운지']
  if (passthrough.includes(String(code))) return String(code)
  return code || ''
}
async function subscribeStores () {
  loading.value = true
  try{
    const qRef = query(collection(fbDb, 'stores'), orderBy('updatedAt','desc'))
    const first = await getDocs(qRef)
    bizRooms.value = first.docs.map(d => {
      const x = d.data() || {}
      return {
        id: d.id,
        name: x.name || '(이름 없음)',
        region: x.region || '',
        type: catLabelFromStore(x.category),
        manager: x.manager || '',
        logo: x.thumb || '',
        adTitle: x.adTitle || x.desc || '',
        createdAt: tsToMs(x.createdAt || x.updatedAt),
        updatedAt: tsToMs(x.updatedAt || x.createdAt),
      }
    })
    unsubStores = onSnapshot(
      qRef,
      (snap)=>{
        bizRooms.value = snap.docs.map(d=>{
          const x = d.data() || {}
          return {
            id: d.id, name: x.name || '(이름 없음)', region: x.region || '',
            type: catLabelFromStore(x.category), manager: x.manager || '',
            logo: x.thumb || '', adTitle: x.adTitle || x.desc || '',
            createdAt: tsToMs(x.createdAt || x.updatedAt),
            updatedAt: tsToMs(x.updatedAt || x.createdAt),
          }
        })
        loading.value = false
      },
      (err)=>{
        loading.value = false
        if (err?.code !== 'permission-denied') console.warn('stores onSnapshot error:', err)
      }
    )

  }catch(e){
    loading.value = false
    console.warn('stores 구독 실패:', e)
  }
}

/* 힐링 */
const HEAL_KEYS = ['travel','health','quote']
const healNoticePosts = computed(()=>{
  const f = healingPage.value.filter
  const list = posts.value.filter(p =>
    p.isNotice === true &&
    (f === 'all' ? HEAL_KEYS.includes(p.category) : p.category === (healMap[f] || f))
  )
  return list.slice().sort((a,b)=> (b.updatedAt||0) - (a.updatedAt||0))
})
const recentHealNotice = computed(()=> healNoticePosts.value[0] || null)
const healPosts = computed(()=>{
  const f = healingPage.value.filter
  const list = posts.value.filter(p =>
    !p.isNotice &&
    (f === 'all' ? HEAL_KEYS.includes(p.category) : p.category === (healMap[f] || f))
  )
  return list.slice().sort((a,b)=> (b.updatedAt||0) - (a.updatedAt||0))
})
const latestLine = (r) => r.latest || r.adTitle || `${r.region || ''} · ${r.type || ''}` || '새 글이 등록되면 표시돼요'

/* 닉네임 */
const { nick: myNickRef, setNick } = useUserNick()
const myNick = computed(() => myNickRef.value || '나')
watch(() => route.query.nick, (nv) => { if (nv) setNick(String(nv)) })

/* 채팅 */
const CHAT_COLLECTION = 'rooms'
const room = ref({ open:false, id:'', title:'', subtitle:'' })
const messages = ref([])
const draft = ref('')
const msgBox = ref(null)
const composerInput = ref(null)

function scrollToBottom(){ nextTick(()=>{ if (msgBox.value) msgBox.value.scrollTop = msgBox.value.scrollHeight }) }
const clock = (ms)=>{ const d=new Date(ms); const h=String(d.getHours()).padStart(2,'0'); const m=String(d.getMinutes()).padStart(2,'0'); return `${h}:${m}` }
function normChat(id, x={}){
  const auth = getAuth()
  const cur = auth.currentUser?.uid || ''
  const tms = tsToMs(x.createdAt || x.updatedAt)
  return { _id:id, text:String(x.text||'').trim(), author:x.author || '익명', me:String(x.authorUid||'') === String(cur), time: clock(tms) }
}
let systemHello = null
let firstSnapDone = false
let unsubChat = null
const chatNoAccess = ref(false)

function toggleAutoSeed(){
  if (!isAdmin.value) return
  // 화면 상태 먼저 바꾸고(즉시 반영), 동작 이어가기
  if (AUTO_SEED.value) stopAutoSeed()
  else startAutoSeed()
}

function handleChatNoAccess(){
  if (typeof unsubChat === 'function') unsubChat()
  unsubChat = null
  chatNoAccess.value = true
}

async function subscribeChat(roomId){
  if (!roomId) return
  if (typeof unsubChat === 'function') unsubChat()
  chatNoAccess.value = false

  try{
    const col = collection(fbDb, CHAT_COLLECTION, String(roomId), 'messages')
    const qRef = query(col, orderBy('createdAt','asc'), limit(300))

    let first
    try{
      first = await getDocs(qRef)
    }catch(e){
      if (e?.code === 'permission-denied') return handleChatNoAccess()
      throw e
    }

    const loaded = first.docs.map(d => normChat(d.id, d.data()))
    messages.value = systemHello ? [systemHello, ...loaded] : loaded
    firstSnapDone = true

    unsubChat = onSnapshot(
      qRef,
      (snap)=>{
        const cur = snap.docs.map(d => normChat(d.id, d.data()))
        messages.value = systemHello ? [systemHello, ...cur] : cur
        scrollToBottom()
      },
      (err)=>{
        if (err?.code === 'permission-denied') return handleChatNoAccess()
        console.warn('chat onSnapshot error:', err)
      }
    )
  }catch(e){
    console.warn('chat subscribe error:', e)
  }
}

async function send(){
  const t = draft.value.trim()
  if(!t || !room.value.id) return
  try{
    const user = await requireAuth()
    const col = collection(fbDb, CHAT_COLLECTION, String(room.value.id), 'messages')
    await safeAdd(col,
      sanitizeUserPayload({
        text: t,
        author: myNick.value || '익명',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, user.uid),
      'sendChat'
    )

    draft.value = ''
    scrollToBottom()
  }catch(e){
    console.warn('sendText error:', e)
    if (!/auth-required/.test(String(e))) alert('메시지 전송에 실패했어요.')
  }
}
function openRoom(id, title, subtitle=''){
  chatNoAccess.value = false
  room.value = { open:true, id, title, subtitle }
  systemHello = { _id: 'hello-'+Date.now(), text: `${title}에 들어오셨습니다. 반갑습니다!`, me: false, author: '시스템', time: '지금' }
  messages.value = [systemHello]
  subscribeChat(id)
  scrollToBottom()
  router.replace({ query:{ ...route.query, room:id, title } })
  nextTick(()=> composerInput.value?.focus())
}

function closeRoom(){
  room.value.open = false
  closeAttach()
  systemHello = null
  firstSnapDone = false
  if (typeof unsubChat === 'function') unsubChat()
  if (route.query.room){
    const q = { ...route.query }
    delete q.room; delete q.title; delete q.postId
    router.replace({ query:q })
  }
}

/* 인증 유틸 */
async function requireAuth(){
  const auth = getAuth()
  if (auth.currentUser) return auth.currentUser
  router.replace({ path:'/auth', query:{ next: route.fullPath || route.path } })
  throw new Error('auth-required')
}

/* 가게 게시판 */
const theme = computed(() => String(route.query.theme || 'white'))
function openBiz(r){
  if (!r || !r.id) return
  const target = { name: 'storeBoard', params: { id: String(r.id) }, query:  { theme: theme.value } }
  if (route.name === 'storeBoard' && String(route.params.id) === String(r.id)) {
    target.query.ts = Date.now().toString()
    router.replace(target)
  } else {
    router.push(target).catch(()=>{})
  }
}
function closeBizPage(){
  bizPage.value.open = false
  const q = { ...route.query }; delete q.biz
  router.replace({ query:q })
  if (typeof unsubStorePosts === 'function') unsubStorePosts()
}
const bizAdFirstLine = computed(()=>{
  const raw = String(bizPage.value.store?.adTitle || '').replace(/\r\n|\r/g, '\n')
  const line = raw.split('\n').find(s => s.trim().length > 0) || ''
  const trimmed = line.trim()
  return trimmed.length > 80 ? trimmed.slice(0,80) + '…' : trimmed
})

// ⬇️ 파일 상단 script 영역 어딘가에 전역 핸들러 추가
let detailTicker = null

// ⬇️ 틱커 유틸 추가 (파일 내에 그대로 붙여넣기)
function startDetailTicker(postId, opts = {}){
  stopDetailTicker()
  // 더 빠른 템포
  const minMs = opts.minMs ?? 4000
  const maxMs = opts.maxMs ?? 9000
  // 좋아요 비중↑
  const probs = { view: 0.60, like: 0.35, comment: 0.05, ...(opts.probs||{}) }

  const pickAction = () => {
    const r = Math.random()
    if (r < probs.view) return 'view'
    if (r < probs.view + probs.like) return 'like'
    return 'comment'
  }
  const randDelay = () => Math.floor(minMs + Math.random()*(maxMs - minMs))

  const tick = async () => {
    try{
      const act = pickAction()
      if (act === 'view') {
        await updateDoc(doc(fbDb, 'board_posts', String(postId)), { views: increment(1) })
      } else if (act === 'like') {
        await updateDoc(doc(fbDb, 'board_posts', String(postId)), {
          likes: increment(1),
          updatedAt: serverTimestamp(),    // ← 같이 올려서 반영 빠르게
        })
      } else {
        await updateDoc(doc(fbDb, 'board_posts', String(postId)), { cmtCount: increment(1) })
      }
    }catch(_){ /* 실패 무시 */ }
    detailTicker = setTimeout(tick, randDelay())
  }

  detailTicker = setTimeout(tick, randDelay())
}

function stopDetailTicker(){
  if (detailTicker){ clearTimeout(detailTicker); detailTicker = null }
}

// ⬇️ openDetail/closeDetail에 연결
function openDetail(p){
  if (!p) return
  const found = posts.value.find(x => String(x.id) === String(p.id)) || p

  incView(found.id).catch(()=>{})

  if (found.category === 'vote') {
    votePostId.value = found.id
    detail.value.open = false
    return
  }

  // 상세 시트 오픈
  detail.value = { open: true, post: found }
  subscribeComments(found.id)
  // ✅ 목록 자동증가 중이면 멈추기(경합 방지)
  stopListTicker()
  // ✅ 상세 자동증가 시작(느린 템포)
  startDetailTicker(found.id, { minMs: 12000, maxMs: 28000 })

  // URL만 살짝 바꿔주기(라우터 가드 우회)
  const params = new URLSearchParams({ ...route.query })
  params.set('postId', String(found.id))
  if (!params.get('theme')) params.set('theme', String(route.query.theme || 'white'))
  window.history.replaceState({}, '', `${route.path}?${params.toString()}`)
}

function openBizDetail(){
  const s = bizPage.value.store
  const body = (s?.adTitle || '').trim()
  const post = {
    id: `store-${s?.id || 'unknown'}`,
    title: s?.name || '업체',
    subtitle: '',
    body,
    content: body,
    author: s?.manager || s?.name || '담당자',
    authorUid: '',
    views: 0, likes: 0,
    createdAt: s?.updatedAt || Date.now(),
    updatedAt: s?.updatedAt || Date.now(),
  }
  detail.value = { open:true, post }
}
function openStorePost(p){
  incViewStore(p._storeId, p.id).catch(()=>{})
  detail.value = { open:true, post: p }
}
async function incViewStore(storeId, postId){
  try{
    const auth = getAuth()
    if (!auth.currentUser) return
    await updateDoc(doc(fbDb, 'stores', String(storeId), 'posts', String(postId)), {
      views: increment(1), updatedAt: serverTimestamp()
    })
  }catch(_){}
}

async function incLikeStore(storeId, postId){
  try{
    await requireAuth()
    await updateDoc(doc(fbDb, 'stores', String(storeId), 'posts', String(postId)), {
      likes: increment(1), updatedAt: serverTimestamp()
    })
    return true
  }catch(_){
    return false
  }
}

async function likeDetail(){
  const p = detail.value.post || {}
  const id = p?.id
  if (!id) return

  if (p._storeId){
    const key = `store:${p._storeId}:${id}`
    if (hasLiked(key)) { alert('이미 추천하셨습니다.'); return }
    const ok = await incLikeStore(p._storeId, id)
    if (ok) {
      markLiked(key)
    } else {
      alert('추천 권한이 없거나 네트워크 문제로 실패했어요.')
    }
    return
  }

  if (hasLiked(id)) { alert('이미 추천하셨습니다.'); return }
  const ok = await incLike(id)
  if (ok) {
    markLiked(id)
  } else {
    alert('추천 권한이 없거나 네트워크 문제로 실패했어요.')
  }
}

/* 딥링크 */
function openFromQueryFast(q = route.query){
  if (q?.nick) setNick(String(q.nick))
  if (q?.room && !String(q.room).startsWith('post-')){
    openRoom(String(q.room), String(q.title || '채팅'))
    return true
  }
  return false
}

function maybePatchRoomTitleFromPosts(){
  const m = /^post-(.+)$/.exec(String(route.query.room || ''))
  if (m){
    const p = posts.value.find(x => String(x.id) === m[1])
    if (p) room.value.title = p.title || room.value.title
  }
}

function tryOpenFromQuery(q = route.query){
  if (q?.nick) setNick(String(q.nick))

  if (q?.biz){
    const found = bizRooms.value.find(b => String(b.id) === String(q.biz))
    if (found){ openBiz(found); return }
  }

  if (q?.postId){
    const p = posts.value.find(x => String(x.id) === String(q.postId))
    if (p){ openDetail(p); return }
  }
  if (q?.room && String(q.room).startsWith('post-')){
    const postId = decodeURIComponent(String(q.room).replace(/^post-/, ''))
    const p = posts.value.find(x => String(x.id) === String(postId))
    if (p){ openDetail(p); return }
  }

  if (q?.room){
    const foundBiz = bizRooms.value.find(b =>
      `store-${b.id}` === q.room || b.roomId === q.room || String(b.id) === String(q.room))
    if (foundBiz){ openBiz(foundBiz); return }
    openRoom(String(q.room), String(q.title || '채팅'))
  }
}

/* 일반 글 동작 */
const votePostId = ref(null)
const votePost = computed(() => posts.value.find(p => p.id === votePostId.value) || null)
const openPost = (post) => {
  incView(post.id)
  if (post?.category === 'vote') votePostId.value = post.id
  else openDetail(post)
}
import { updateDoc } from 'firebase/firestore' // ⬅ 상단 import 이미 있으면 생략

async function incView(id){
  if (!id) return
  try{
    const auth = getAuth()
    if (!auth.currentUser) {
      console.warn('[incView] skip: not authed')
      return
    }
    await updateDoc(doc(fbDb, 'board_posts', id), { views: increment(1) })
  }catch(e){
    console.warn('[incView] failed:', e?.code || e, id)
  }
}

async function incLike(id){
  if (!id) return false
  try{
    await requireAuth()
    await updateDoc(doc(fbDb, 'board_posts', id), {
      likes: increment(1),
      updatedAt: serverTimestamp(),   // ← 함께 갱신(정렬 & 스냅 반영 빠르게)
    })
    return true
  }catch(e){
    console.warn('incLike failed:', e)
    return false
  }
}

/* 업체 전용 게시글 */
const storePosts = ref([])
let unsubStorePosts = null
const normalizeStorePost = (id, x = {}, storeId = '') => ({
  id, _storeId: storeId, category: 'biz',
  title: x.title || '(제목 없음)', subtitle: x.subtitle || '',
  body: x.body || x.content || '', content: x.content || x.body || '',
  author: x.author || '익명', authorUid: x.authorUid || '',
  views: Number(x.views || 0), likes: Number(x.likes || 0),
  createdAt: tsToMs(x.createdAt || x.updatedAt),
  updatedAt: tsToMs(x.updatedAt || x.createdAt),
})
async function subscribeStorePosts (storeId) {
  if (!storeId) return
  if (typeof unsubStorePosts === 'function') unsubStorePosts()
  try{
    const col = collection(fbDb, 'stores', String(storeId), 'posts')
    const qRef = query(col, orderBy('updatedAt','desc'))
    const first = await getDocs(qRef)
    storePosts.value = first.docs.map(d => normalizeStorePost(d.id, d.data(), storeId))
    unsubStorePosts = onSnapshot(qRef, (snap)=>{
      storePosts.value = snap.docs.map(d => normalizeStorePost(d.id, d.data(), storeId))
    })
  }catch(e){
    console.warn('store posts 구독 실패:', e)
  }
}

/* 글쓰기 모달 상태 */
const showGenModal = ref(false)
const composeCat = ref('daily')
const composeTitle = ref('')
const composeSubtitle = ref('')
const composeBody = ref('')
const composeA = ref('')
const composeB = ref('')
const composeBiz = ref(false)
const composeBizStoreId = ref('')
const composeBizStoreName = ref('')

function openBizCreateFromTabs(){
  const target = filteredBizRooms.value[0] || bizRooms.value[0]
  if(!target){ alert('등록된 업체가 없습니다.'); return }
  openBiz(target)
  nextTick(()=> openBizCreateFromStore())
}
function openBizCreateFromStore(){
  if(!bizPage.value.store){ alert('업체를 찾을 수 없어요.'); return }
  composeBiz.value = true
  composeBizStoreId.value = bizPage.value.store.id
  composeBizStoreName.value = bizPage.value.store.name || '업체'
  composeTitle.value = `${composeBizStoreName.value} 공지`
  composeSubtitle.value = ''
  composeBody.value = (bizPage.value.store.adTitle || '').trim()
  composeA.value = ''
  composeB.value = ''
  editTargetId.value = null
  showGenModal.value = true
}
function openFirstBiz(){
  const target = filteredBizRooms.value[0] || bizRooms.value[0]
  if(!target){ alert('등록된 업체가 없습니다.'); return }
  openBiz(target)
}

/* 공지 작성/수정/삭제 */
const showNoticeModal = ref(false)
const noticeEditId = ref(null)
const noticeTitle = ref('')
const noticeBody  = ref('')
const noticeCat   = ref('daily')
function openNoticeCreate(){
  if (!isAdmin.value){ alert('관리자만 작성할 수 있습니다.'); return }
  noticeEditId.value = null
  noticeTitle.value  = ''
  noticeBody.value   = ''
  noticeCat.value    = catPage.value.key || yaTab.value
  showNoticeModal.value = true
}
function startNoticeEdit(n){
  if (!isAdmin.value) return
  noticeEditId.value = n.id
  noticeTitle.value  = n.title || ''
  noticeBody.value   = n.body || n.content || ''
  noticeCat.value    = n.category || catPage.value.key || yaTab.value
  showNoticeModal.value = true
}
function closeNoticeModal(){ showNoticeModal.value = false }
async function confirmNotice(){
  if (!isAdmin.value){ alert('권한이 없습니다.'); return }
  const title = noticeTitle.value.trim()
  const body  = noticeBody.value.trim()
  if (!title){ alert('제목을 입력해 주세요.'); return }
  try{
    const user = await requireAuth()
    const base = {
      category: noticeCat.value,
      isNotice: true,
      title, subtitle: '',
      body, content: body,
      author: '익명', authorUid: user.uid
    }
    const baseSan = sanitizeUserPayload(base, user.uid)

    if (noticeEditId.value){
      await safeUpdate(
        doc(fbDb, 'board_posts', String(noticeEditId.value)),
        { ...baseSan, updatedAt: serverTimestamp() },
        'updateNotice'
      )
    } else {
      await safeAdd(
        collection(fbDb, 'board_posts'),
        { ...baseSan, views:0, likes:0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
        'createNotice'
      )
    }
    showNoticeModal.value = false
  }catch(e){ alert('공지 저장에 실패했습니다.') }
}

async function deleteNotice(n){
  if (!isAdmin.value) return
  if (!n?.id) return
  if (!confirm('이 공지를 삭제할까요?')) return
  try{
    await requireAuth()
    await safeDelete(doc(fbDb, 'board_posts', String(n.id)), 'deleteNotice')
  }catch(e){ alert('공지 삭제에 실패했습니다.') }
}

/* 공지/목록 데이터 */
const noticePosts = computed(()=>{
  const f = catPage.value.filter || yaTab.value
  const list = posts.value.filter(p => p.isNotice === true && (f === 'all' ? true : p.category === f))
  return list.slice().sort((a,b)=> (b.updatedAt || 0) - (a.updatedAt || 0))
})
const isNotice = (p) => p?.isNotice === true
const editTargetId = ref(null)
const openCreate = async () => {
  try { await requireAuth() } catch(_) { return }
  composeBiz.value = false
  composeBizStoreId.value = ''
  composeBizStoreName.value = ''
  if (healingPage.value.open) {
    composeCat.value = (healingPage.value.filter && healingPage.value.filter !== 'all') ? healingPage.value.filter : 'travel'
  } else {
    composeCat.value = (catPage.value.filter && catPage.value.filter !== 'all') ? catPage.value.filter : yaTab.value
  }
  composeTitle.value = ''
  composeSubtitle.value = ''
  composeBody.value = ''
  composeA.value = ''
  composeB.value = ''
  editTargetId.value = null
  showGenModal.value = true
}
const confirmCreate = async () => {
  if (composeBiz.value) {
    const title = (composeTitle.value || '').trim()
    const body  = (composeBody.value  || '').trim()
    if (!composeBizStoreId.value){ alert('대상 업체가 없습니다.'); return }
    if (!title){ alert('제목을 입력해 주세요.'); return }
    try{
      const user = await requireAuth()
      await safeAdd(
        collection(fbDb, 'stores', composeBizStoreId.value, 'posts'),
        sanitizeUserPayload({
          title,
          subtitle: composeSubtitle.value || '',
          body, content: body,
          views: 0, likes: 0,
          createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        }, user.uid),
        'createStorePost'
      )
      showGenModal.value = false
    }catch(e){ alert('업체 게시판 글 저장에 실패했습니다.') }
    return
  }
  const title = (composeTitle.value || '').trim()
  if (!title){ alert('제목을 입력해 주세요.'); return }
  let user
  try { user = await requireAuth() } catch(_) { return }
  const authorUid = user.uid
  try{
    if (composeCat.value === 'vote'){
      if (!composeA.value.trim() || !composeB.value.trim()){ alert('투표 항목 A/B를 입력해 주세요.'); return }
      await safeAdd(
        collection(fbDb, 'board_posts'),
        sanitizeUserPayload({
          category: 'vote',
          title,
          subtitle: `${composeA.value} vs ${composeB.value}`,
          optA: composeA.value, optB: composeB.value,
          views: 0, likes: 0, cmtCount: 0,              // ✅ 댓글 카운트 초기화
          votesA: 0, votesB: 0,
          createdAt: serverTimestamp(), updatedAt: serverTimestamp()
        }, authorUid),
        'createVotePost'
      )
    }else{
      const mapped = yaMap[composeCat.value] || 'var'
      const text = (composeBody.value || '').trim()
      await safeAdd(
        collection(fbDb, 'board_posts'),
        sanitizeUserPayload({
          category: mapped,
          title,
          body: text, content: text,
          views: 0, likes: 0, cmtCount: 0,              // ✅ 댓글 카운트 초기화
          createdAt: serverTimestamp(), updatedAt: serverTimestamp()
        }, authorUid),
        'createBoardPost'
      )
    }
    showGenModal.value = false
  }catch(e){ alert('등록에 실패했습니다.') }
}
async function deletePost(p){
  const id = p?.id
  if (!id) return
  if (!confirm('이 게시글을 삭제할까요?')) return
  try{
    await requireAuth()
    await safeDelete(doc(fbDb, 'board_posts', id), 'deleteBoardPost')
    if (detail.value.open && detail.value.post?.id === id) closeDetail()
  }catch(e){ alert('삭제에 실패했습니다.') }
}
function startEdit(p){
  const post = posts.value.find(x => x.id === p.id) || p
  editTargetId.value = post.id
  if (post.category === 'vote' || post.optA || post.optB || /vs/.test(post.subtitle||'')) {
    composeCat.value = 'vote'
    const parsed = parsePoll(post)
    composeTitle.value = post.title || ''
    composeA.value = parsed.aText || ''
    composeB.value = parsed.bText || ''
    composeSubtitle.value = post.subtitle || ''
    composeBody.value = ''
  } else {
    const rev = ['daily','suggest','pledge','event','vote','quiz','travel','health','quote'].includes(post.category) ? post.category : 'daily'
    composeCat.value = rev
    composeTitle.value = post.title || ''
    composeSubtitle.value = post.subtitle || ''
    const existingBody = post.body || post.content || ''
    composeBody.value = existingBody || (post.subtitle || '')
    composeA.value = ''; composeB.value = ''
  }
  showGenModal.value = true
}

/* 투표 */
const parsePoll = (post) => {
  if (post.optA || post.optB) {
    const aText = post.optA ?? 'A'
    const bText = post.optB ?? 'B'
    const aVotes = Number(post.votesA || 0)
    const bVotes = Number(post.votesB || 0)
    return { aText, bText, aVotes, bVotes }
  }
  const sub = post.subtitle || ''
  const [aText, bText] = sub.split('vs').map(s => s?.trim()).filter(Boolean)
  return { aText: aText || 'A', bText: bText || 'B', aVotes:Number(post.votesA||0), bVotes:Number(post.votesB||0) }
}
const poll = computed(()=>{
  if(!votePost.value) return { aText:'', bText:'', aVotes:0, bVotes:0, total:0, aPct:0, bPct:0 }
  const p = parsePoll(votePost.value)
  const total = p.aVotes + p.bVotes
  const aPct = total ? Math.round((p.aVotes/total)*100) : 0
  const bPct = total ? Math.round((p.bVotes/total)*100) : 0
  return { ...p, total, aPct, bPct }
})
const doVote = async (index) => {
  if (!votePost.value) return
  try{
    await requireAuth()
    const id = votePost.value.id
    await updateDoc(doc(fbDb, 'board_posts', id), {
      [index === 0 ? 'votesA' : 'votesB']: increment(1)
    })
  }catch(e){ /* noop */ }
}

const closeVote = () => { votePostId.value = null }

/* 카테고리 전용 페이지 */

const healMap = { travel:'travel', health:'health', quote:'quote' }

const catPage = ref({ open:false, filter:'all' })
const catLabel = computed(() => catPage.value.filter === 'all' ? '야호 게시판' : (yaCats.find(x => x.key === catPage.value.filter)?.label || '야호 게시판'))
const catPosts = computed(() => {
  const f = catPage.value.filter
  const list = posts.value.filter(p => !isNotice(p) && (f === 'all' ? true : p.category === (yaMap[f] || f)))
  return list.slice().sort((a,b)=> (b.updatedAt || 0) - (a.updatedAt || 0))
})
// ⬇️ 파일 상단에 전역 핸들러
let listTicker = null

function stopListTicker(){
  if (listTicker){ clearTimeout(listTicker); listTicker = null }
}

function startListTicker(getVisiblePosts, opts = {}){
  stopListTicker()
  const minMs = opts.minMs ?? 5000
  const maxMs = opts.maxMs ?? 12000

  // ✅ 조회수 대비 추천수 20%p 낮게
  const VIEW = 0.65
  const LIKE = Math.max(0, VIEW - 0.20) // 항상 20%p 차이

  const randDelay = () => Math.floor(minMs + Math.random()*(maxMs - minMs))

  const tick = async () => {
    try{
      const pool = (getVisiblePosts() || []).filter(p => !p.isNotice && p.category !== 'vote')
      if (pool.length){
        const target = pool[Math.floor(Math.random()*pool.length)]
        const r = Math.random()
        if (r < VIEW){
          await updateDoc(doc(fbDb, 'board_posts', String(target.id)), {
            views: increment(1)
          })
        } else {
          await updateDoc(doc(fbDb, 'board_posts', String(target.id)), {
            likes: increment(1),
            updatedAt: serverTimestamp(),
          })
        }
      }
    }catch(_){}
    listTicker = setTimeout(tick, randDelay())
  }

  listTicker = setTimeout(tick, randDelay())
}

// ✅ 카테고리 풀스크린 열릴 때 시작, 닫을 때 중지
function openCategoryPage (key = 'all') {
  if (key !== 'all') yaTab.value = key
  catPage.value = { open: true, filter: key || 'all' }
  startListTicker(() => catPosts.value, { minMs: 15000, maxMs: 35000 })
}
function closeCatPage () {
  stopListTicker()
  catPage.value.open = false
}

// ✅ 힐링 풀스크린도 동일하게
function openHealing(){
  healingPage.value = { open:true, filter:'all' }
  startListTicker(() => healPosts.value, { minMs: 15000, maxMs: 35000 })
}
function closeHealingPage () {
  stopListTicker()
  healingPage.value.open = false
}

/* 상세 보기 */
const detail = ref({ open:false, post:{} })
const detailBodyText = computed(() => {
  const p = detail.value?.post || {}
  const b = (p.body || p.content || '').trim()
  if (b) return b
  if (p.category === 'vote' || p.optA || p.optB) return ''
  return (p.subtitle || '').trim()
})
const detailBodyHtml = computed(() => {
  const t = detailBodyText.value || ''
  if (!t) return ''
  const escaped = t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  return escaped.replace(/\r\n|\r|\n/g, '<br>')
})

function closeDetail(){
  // ✅ 상세 닫히면 중지
  stopDetailTicker()
  detail.value.open = false
  if (typeof unsubComments === 'function') unsubComments()
  comments.value = []
  replyForId.value = null
  replyDraft.value = ''
  if (route.query.postId){
    const q = { ...route.query }; delete q.postId
    router.replace({ query:q })
  }
}

/* 추천(1회) */
const uid = ref('')
function genLocalId(){
  let id = localStorage.getItem('gt_uid')
  if (!id){
    id = 'local-' + Math.random().toString(36).slice(2)
    localStorage.setItem('gt_uid', id)
  }
  return id
}
async function ensureUid(){
  try{
    const auth = getAuth()
    uid.value = auth.currentUser?.uid || genLocalId()
  }catch(e){
    uid.value = genLocalId()
  }
}
const likedKey = computed(()=> `gt_liked_${uid.value || 'anon'}`)
function hasLiked(id){
  if (!id) return false
  try{
    const raw = localStorage.getItem(likedKey.value)
    const arr = raw ? JSON.parse(raw) : []
    return arr.includes(String(id))
  }catch(_){ return false }
}
function markLiked(id){
  try{
    const raw = localStorage.getItem(likedKey.value)
    const arr = raw ? JSON.parse(raw) : []
    if (!arr.includes(String(id))){
      arr.push(String(id))
      localStorage.setItem(likedKey.value, JSON.stringify(arr))
    }
  }catch(_){}
}

/* 댓글 */
const comments = ref([])
let unsubComments = null
const normalizeComment = (id, x={}) => ({
  id,
  body: String(x.body || '').trim(),
  author: x.author || '익명',
  authorUid: x.authorUid || '',
  parentId: x.parentId || null,
  createdAt: tsToMs(x.createdAt || x.updatedAt),
  updatedAt: tsToMs(x.updatedAt || x.createdAt),
})
async function subscribeComments(postId){
  if (!postId) return
  if (typeof unsubComments === 'function') unsubComments()
  try{
    const col = collection(fbDb, 'board_posts', String(postId), 'comments')
    const qRef = query(col, orderBy('createdAt','asc'))
    const first = await getDocs(qRef)
    comments.value = first.docs.map(d => normalizeComment(d.id, d.data()))
    unsubComments = onSnapshot(
      qRef,
      (snap)=>{
        comments.value = snap.docs.map(d => normalizeComment(d.id, d.data()))
      },
      (err)=>{
        if (err?.code !== 'permission-denied') console.warn('comments onSnapshot error:', err)
      }
    )

  }catch(e){
    console.warn('comments 구독 실패:', e)
  }
}
const commentsCount = computed(()=> comments.value.length)
const topComments = computed(()=> comments.value.filter(c => !c.parentId))
const repliesOf = (pid) => comments.value.filter(c => c.parentId === pid)
const cmtDraft = ref('')
const replyForId = ref(null)
const replyDraft = ref('')
const renderCmt = (t='') => {
  const escaped = String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  return escaped.replace(/\r\n|\r|\n/g,'<br>')
}
async function submitComment(){
  const body = cmtDraft.value.trim()
  const postId = detail.value.post?.id
  if (!postId || !body) return
  let ok = false
  try{
    const user = await requireAuth()
    await safeAdd(
      collection(fbDb, 'board_posts', String(postId), 'comments'),
      sanitizeUserPayload({
        body,
        parentId: null,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      }, user.uid),
      'addComment'
    )
    ok = true
  }catch(e){
    if (!/auth-required/.test(String(e))) alert('댓글 등록에 실패했습니다.')
    return
  }
  if (ok){
    try{
      await updateDoc(doc(fbDb, 'board_posts', String(postId)), {
        cmtCount: increment(1)
      })
    }catch(e){ console.warn('cmtCount 업데이트 실패:', e) }
    cmtDraft.value = ''
  }
}

function startReply(target){ replyForId.value = target.parentId || target.id; replyDraft.value = '' }
function cancelReply(){ replyForId.value = null; replyDraft.value = '' }
async function submitReply(parentId){
  const postId = detail.value.post?.id
  const body = replyDraft.value.trim()
  if (!postId || !parentId || !body) return
  let ok = false
  try{
    const user = await requireAuth()
    await safeAdd(
      collection(fbDb, 'board_posts', String(postId), 'comments'),
      sanitizeUserPayload({
        body,
        parentId: String(parentId),
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      }, user.uid),
      'addReply'
    )
    ok = true
  }catch(e){
    if (!/auth-required/.test(String(e))) alert('대댓글 등록에 실패했습니다.')
    return
  }
  if (ok){
    try{
      await updateDoc(doc(fbDb, 'board_posts', String(postId)), {
        cmtCount: increment(1)
      })
    }catch(e){ console.warn('cmtCount 업데이트 실패:', e) }
    replyDraft.value = ''
    replyForId.value = null
  }
}

function canDeleteComment(c){ return isAdmin.value || (String(c.authorUid || '') === String(uid.value || '')) }
async function deleteComment(c){
  if (!detail.value.post?.id || !c?.id) return
  if (!canDeleteComment(c)) { alert('삭제 권한이 없습니다.'); return }
  if (!confirm('이 댓글을 삭제할까요?')) return
  try{
    await requireAuth()
    const postId = String(detail.value.post.id)
    const children = repliesOf(c.id)
    const delCnt = 1 + children.length
    await safeDelete(doc(fbDb, 'board_posts', postId, 'comments', c.id), 'delComment')
    for (const r of children){
      await safeDelete(doc(fbDb, 'board_posts', postId, 'comments', r.id), 'delReply')
    }
    await updateDoc(doc(fbDb, 'board_posts', postId), {
      cmtCount: increment(-delCnt), updatedAt: serverTimestamp(),
    })

  }catch(e){ alert('댓글 삭제에 실패했습니다.') }
}

/* 표시 유틸 */
function authorName(_p){ return '익명' }
function firstLine(p){
  const raw = (p?.body || p?.content || '').replace(/\r\n|\r/g, '\n')
  const line = raw.split('\n').find(s => s.trim().length > 0) || ''
  const trimmed = line.trim()
  return trimmed.length > 80 ? trimmed.slice(0,80) + '…' : trimmed
}
const timeAgo = (tsIn) => {
  const ts = tsToMs(tsIn)
  const sec = Math.floor((Date.now() - ts)/1000)
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec/60); if (m < 60) return `${m}분전`
  const h = Math.floor(m/60); if (h < 24) return `${h}시간전`
  const d = Math.floor(h/24); return `${d}일전`
}

/* 채팅 첨부 */
const attach = ref({ open:false, style:{ right:'92px', bottom:'64px' } })
const fileInput = ref(null)
const imgInput  = ref(null)
function toggleAttach(){
  attach.value.open = !attach.value.open
  if (attach.value.open){ attach.value.style = { right:'94px', bottom:'76px' } }
}
function closeAttach(){ attach.value.open = false }
function pickImage(){ imgInput.value?.click() }
function pickFile(){ fileInput.value?.click() }
function onFile(e){
  const files = Array.from(e.target.files || [])
  if (!files.length) return
  messages.value.push({ _id:'local-'+Date.now(), text:`파일 ${files.length}개를 선택했어요(업로드는 추후 연결).`, time:clock(Date.now()), me:true, author: myNick.value })
  closeAttach()
}
function onImage(e){
  const files = Array.from(e.target.files || [])
  if (!files.length) return
  messages.value.push({ _id:'local-'+Date.now(), text:`사진 ${files.length}장을 선택했어요(업로드는 추후 연결).`, time:clock(Date.now()), me:true, author: myNick.value })
  closeAttach()
}
function openSticker(){ closeAttach(); showEmoji('chat') }
function cOpenSticker(target = 'compose'){ cCloseAttach(); showEmoji(target) }

/* 글쓰기 모달 첨부 */
const cAttach = ref({ open:false, style:{ right:'14px', bottom:'66px' } })
const cFileInput = ref(null)
const cImgInput  = ref(null)
function cToggleAttach(){ cAttach.value.open = !cAttach.value.open; if (cAttach.value.open){ cAttach.value.style = { right:'16px', bottom:'70px' } } }
function cCloseAttach(){ cAttach.value.open = false }
function cPickImage(){ cImgInput.value?.click() }
function cPickFile(){ cFileInput.value?.click() }
function cOnFile(e){ const files = Array.from(e.target.files || []); if (!files.length) return; alert(`파일 ${files.length}개 선택됨(업로드 연동 예정)`); cCloseAttach() }
function cOnImage(e){ const files = Array.from(e.target.files || []); if (!files.length) return; alert(`사진 ${files.length}장 선택됨(업로드 연동 예정)`); cCloseAttach() }

const hasImageIn = (t='') => /<img\b|!\[.*\]\(|data:image\/|https?:\/\/\S+\.(png|jpe?g|gif|webp|bmp|svg)(\?\S*)?/i.test(t)
const hasFileIn = (t='') => /https?:\/\/\S+\.(pdf|docx?|xlsx?|pptx?|zip|7z|rar|hwp|txt|csv)(\?\S*)?/i.test(t)
function fileIcon(p){ const t = String(p?.body || p?.content || ''); if (hasImageIn(t)) return '🖼️'; if (hasFileIn(t))  return '💾'; return '📄'; }
function fileKind(p){ const t = String(p?.body || p?.content || ''); if (hasImageIn(t)) return '사진 첨부'; if (hasFileIn(t))  return '파일 첨부'; return '텍스트만'; }

/** ‘일상’ 탭일 때만 스니펫 노출 */
function shouldShowSnippet(p){
  const f = catPage.value.filter || yaTab.value
  if (f === 'all') return p.category === 'daily' && !!firstLine(p)
  return f === 'daily' && !!firstLine(p)
}

/* 관리자 감지 */
const userEmail = ref('')
const isAdmin = computed(() => (userEmail.value || '').toLowerCase() === 'gangtalk815@gmail.com')

/* 퍼시스턴스 + 인증 가드 */
onBeforeMount(()=>{
  const auth = getAuth()
  setPersistence(auth, browserLocalPersistence).catch(()=>{})
  const u = auth.currentUser
  if (!u) {
    const next = route.fullPath || route.path
    router.replace({ path:'/auth', query:{ next } })
    return
  }
  openFromQueryFast()
})
onMounted(()=>{
  try{
    const auth = getAuth()
    onAuthStateChanged(auth, u => { userEmail.value = u?.email || '' })
  }catch(e){}
  ensureUid()
  subscribeStores()
  subscribePosts()
  tryOpenFromQuery()
  window.addEventListener('resize', scrollToBottom)
})
onBeforeUnmount(()=>{
  window.removeEventListener('resize', scrollToBottom)
  if (typeof unsubStores === 'function') unsubStores()
  if (typeof unsubPosts === 'function') unsubPosts()
  if (typeof unsubComments === 'function') unsubComments()
  if (typeof unsubChat === 'function') unsubChat()
})

/* 날짜 */
const ymd = (tsIn) => {
  const ms = tsToMs(tsIn);
  const d  = new Date(ms);
  const y  = d.getFullYear();
  const m  = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${dd}`;
};

const showAllNotices = ref(false)
const recentNotice   = computed(() => noticePosts.value[0] || null)
const otherNotices   = computed(() => noticePosts.value.slice(1))

/* 가게전용 게시판 필터 */
const uiBiz = ref({ regionOpen:false, typeOpen:false })
const regionOptionsBiz = [
  { key:'all', label:'지역: 전체' },
  { key:'gn',  label:'지역: 강남' },
  { key:'bg',  label:'지역: 비강남' },
  { key:'gg',  label:'지역: 경기' },
  { key:'ic',  label:'지역: 인천' },
]
const selectedRegionBiz = ref('all')
const regionLabelBiz = (k)=> regionOptionsBiz.find(x=>x.key===k)?.label || '지역: 전체'
function selectRegionBiz(k){ selectedRegionBiz.value = k; uiBiz.value.regionOpen = false }
function macroBiz(r){
  const v = String(r?.region || '')
  if (['강남','서초','송파','신사','논현'].includes(v)) return 'gn'
  if (v === '경기') return 'gg'
  if (v === '인천') return 'ic'
  if (v === '비강남') return 'bg'
  return 'bg'
}
const typeOptionsBiz = [
  { key:'all',  label:'업종: 전체' },
  { key:'하퍼', label:'하퍼' },
  { key:'쩜오', label:'쩜오' },
  { key:'텐카페', label:'텐카페' },
  { key:'텐프로', label:'텐프로' },
  { key:'1%',   label:'1%' },
  { key:'노래방', label:'노래방' },
  { key:'가라오케', label:'가라오케' },
  { key:'바',    label:'바' },
  { key:'라운지', label:'라운지' },
]
const selectedTypeBiz = ref('all')
const typeLabelBiz = (k)=> `업종: ${k==='all' ? '전체' : k}`
function selectTypeBiz(k){ selectedTypeBiz.value = k; uiBiz.value.typeOpen = false }
const filteredBizRooms = computed(()=> {
  return bizRooms.value.filter(r =>
    (selectedRegionBiz.value === 'all' || macroBiz(r) === selectedRegionBiz.value) &&
    (selectedTypeBiz.value   === 'all' || r.type === selectedTypeBiz.value)
  )
})
const FALLBACK_BIZ_IMG = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200&auto=format&fit=crop'

/* ================== 자동 시더(랜덤 글/댓글/대댓글) ================== */
import { nanoid } from 'nanoid'

/* ==== 자동 시더 토글 개선: 로컬스토리지 유지 + 즉시 반영 ==== */
const AUTO_SEED = ref(localStorage.getItem('gt_auto_seed') === '1')
let seedTimer = null

watch(AUTO_SEED, v => {
  localStorage.setItem('gt_auto_seed', v ? '1' : '0')
})

// ▶ 템플릿에서 안전하게 뽑아오는 유틸
function pickTemplate(cat, key) {
  const t = CATEGORY_TEMPLATES?.[cat] || {}
  const arr = Array.isArray(t[key]) ? t[key] : []
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : ''
}
function pickVoteAB() {
  const ab = CATEGORY_TEMPLATES?.vote?.ab || []
  return ab.length ? ab[Math.floor(Math.random() * ab.length)] : ['A','B']
}

// ▶ 글 카테고리 풀(투표 포함)
const SEED_CATS = ['daily','suggest','pledge','travel','health','quote','event','quiz','vote']


function randPick(arr){ return arr[Math.floor(Math.random()*arr.length)] }
function randDelayMs(){ return 12000 + Math.floor(Math.random()*15000) }

function makeSeedId(){ try{ return nanoid(10) } catch(_){ return Math.random().toString(36).slice(2,12) } }

const SEED_LOCK_KEY = 'gt_seed_lock'
function tryAcquireLock(){
  const now = Date.now()
  const raw = localStorage.getItem(SEED_LOCK_KEY)
  const beat = raw ? Number(raw) : 0
  if (now - beat < 10000) return false
  localStorage.setItem(SEED_LOCK_KEY, String(now))
  return true
}
function heartbeat(){ localStorage.setItem(SEED_LOCK_KEY, String(Date.now())) }

async function seedPost(){
  const user = await requireAuth().catch(()=>null)
  if (!user) return

  const cat = randPick(SEED_CATS)
  const seedId = makeSeedId()

  // 투표 전용 포맷
  if (cat === 'vote') {
    const [aText, bText] = pickVoteAB()
    const title = pickTemplate('vote', 'titles') || `오늘의 선택!`

    await safeAdd(
      collection(fbDb, 'board_posts'),
      {
        seedId,
        category: 'vote',
        title,
        subtitle: `${aText} vs ${bText}`,
        optA: aText,
        optB: bText,
        votesA: 0,
        votesB: 0,
        views: 0,
        likes: 0,
        cmtCount: 0,
        author: '익명',
        authorUid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      'seedPost:vote'
    )
    return
  }

  // 일반/힐링/이벤트/퀴즈
  const title = pickTemplate(cat, 'titles') || `새 글 #${(Date.now()%100000).toString(36)}`
  const body  = pickTemplate(cat, 'bodies') || pickTemplate('daily', 'bodies') || ''

  await safeAdd(
    collection(fbDb, 'board_posts'),
    {
      seedId,
      category: cat,
      title,
      subtitle: '',
      body,
      content: body,
      views: 0,
      likes: 0,
      cmtCount: 0,
      author: '익명',
      authorUid: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    'seedPost:general'
  )
}

async function seedComment(){
  const user = await requireAuth().catch(()=>null)
  if (!user) return

  const pool = posts.value.filter(p => !p.isNotice)
  if (!pool.length){ await seedPost(); return }

  const target = pool[Math.floor(Math.random()*pool.length)]
  const cat = normalizeCategory(target.category)
  const isReply = Math.random() < 0.45 && comments.value.some(c => !c.parentId)
  const seedId = makeSeedId()

  const cText = pickTemplate(cat, 'comments') || pickTemplate('daily', 'comments') || '좋은 글이네요!'
  const rText = pickTemplate(cat, 'replies')  || pickTemplate('daily', 'replies')  || '동감합니다!'

  if (!isReply){
    await safeAdd(
      collection(fbDb, 'board_posts', String(target.id), 'comments'),
      {
        seedId,
        body: cText,
        parentId: null,
        author: '익명',
        authorUid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      'seedComment:add'
    )

    await updateDoc(
      doc(fbDb, 'board_posts', String(target.id)),
      { cmtCount: increment(1), updatedAt: serverTimestamp() },
    )

    if (detail.value.open && detail.value.post?.id === target.id) subscribeComments(target.id)
  } else {
    const tops = comments.value.filter(c => !c.parentId)
    const parent = tops[Math.floor(Math.random()*tops.length)]
    if (!parent) return

    await safeAdd(
      collection(fbDb, 'board_posts', String(target.id), 'comments'),
      {
        seedId,
        body: rText,
        parentId: String(parent.id),
        author: '익명',
        authorUid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      'seedReply:add'
    )

    await updateDoc(
      doc(fbDb, 'board_posts', String(target.id)),
      { cmtCount: increment(1), updatedAt: serverTimestamp() },
    )
  }
}

async function seedLoop(){
  if (!AUTO_SEED.value) return
  if (!tryAcquireLock()){ seedTimer = setTimeout(seedLoop, randDelayMs()); return }
  heartbeat()
  try{
    if (Math.random() < 0.6) await seedPost()
    else await seedComment()
  }catch(_){ /* noop */ }
  heartbeat()
  seedTimer = setTimeout(seedLoop, randDelayMs())
}

function startAutoSeed(){
  if (!isAdmin.value) return
  if (AUTO_SEED.value) return
  AUTO_SEED.value = true
  console.log('[seed] ▶ start')
  seedLoop()
}
function stopAutoSeed(){
  if (!AUTO_SEED.value && !seedTimer) return
  AUTO_SEED.value = false
  if (seedTimer){ clearTimeout(seedTimer); seedTimer = null }
  console.log('[seed] ■ stop')
}

/* mount 시 관리자면 저장된 상태에 맞춰 실행 (힐링/야호 어디서 눌러도 동일 상태 유지) */
onMounted(()=>{
  try{
    const auth = getAuth()
    onAuthStateChanged(auth, u => {
      userEmail.value = u?.email || ''
      if (isAdmin.value) {
        if (AUTO_SEED.value) startAutoSeed()
        else stopAutoSeed()
      } else {
        stopAutoSeed()
      }
    })
  }catch(_){}
})


onBeforeUnmount(()=> stopAutoSeed())

console.log('[sim-templates] loaded v2025-09-30-01')

</script>

<style scoped>
/* 페이지 여백 */
.wrap{ padding:14px }

/* ===== 헤더 & 타이틀 ===== */
.page-head{ display:flex; flex-direction:column; gap:8px; margin-bottom:8px }
.title{ margin:0; font-size:18px; font-weight:900 }

/* ===== 히어로 ===== */
.hero{
  position:relative;
  border:1px solid var(--line);
  border-radius:14px;

  /* ▶ 배너 높이 2배 수준 */
  --hero-h: 86px;              /* 기존 40px → 86px (원하면 90~110px로 조절) */
  min-height: var(--hero-h);
  padding: 12px 14px;

  display:flex; align-items:center;
  color:var(--fg);

  /* ▶ 투명/흐림 오버레이 완전 제거 (이미지만 그대로) */
  background-color: #0000;     /* 투명한 바탕 */
  background-repeat: no-repeat;
  background-position: var(--hero-pos, center center);
  background-size: cover;

  /* 고해상도에서도 선명하게: image-set 사용 */
  background-image:
    image-set(
      var(--hero-img-1x) 1x,
      var(--hero-img-2x) 2x
    );

  /* 사파리 대응(선택) */
  background-image:
    -webkit-image-set(
      var(--hero-img-1x) 1x,
      var(--hero-img-2x) 2x
    );

  box-shadow:0 4px 12px var(--shadow);
}

/* 배너 안 아이콘/텍스트도 살짝 키워 비율 맞추기 */
.yh-logo{ width:34px; height:34px; color:var(--accent) }  /* 26 → 34 */
.yh-title{ font-size:18px; font-weight:900 }              /* 14 → 18 */
.tagline{
  display:inline-flex; align-items:center; gap:8px;
  height:26px; padding:0 12px;
  border-radius:999px; border:1px solid var(--line);
  background:var(--bg);
  font-weight:900; font-size:12px; line-height:1;
}

.yh-left{ display:flex; align-items:center; gap:8px; flex-wrap:wrap }
.tag-lock{ width:14px; height:14px; opacity:.8 }

/* ===== 공통 칩/버튼 ===== */
.cat-row{ display:flex; align-items:center; gap:6px; flex-wrap:wrap }
.cat-tabs .chip{
  background:transparent;
  color:var(--fg);
  border:1px solid var(--line);
  border-radius:999px;
  box-shadow:none;
}
.cat-tabs .chip.on{
  background: transparent;
  border-color: #ff6da1;
  outline: 0;
  box-shadow: 0 0 0 2px #ffd6e5;
}
.cat-tabs .chip{ border-color:#e9e1e6 }
:root[data-theme="white"] .cat-tabs .chip.on{
  border-color:#ff6da1 !important;
  box-shadow:0 0 0 2px #ffd6e5 !important;
}
.chip.xs{ height:30px; padding:0 10px; font-size:13px; }
.chip.sm{ height:26px; font-size:12px; padding:0 8px }
.chip .ico{ font-size:14px }
.spacer{ flex:1 }
.btn-write{
  height:26px; padding:0 12px; border-radius:999px; border:1px solid var(--accent);
  background: color-mix(in oklab, var(--accent), white 85%); font-weight:900; color:#111 !important;
}

/* ===== 가게 전용 한 줄 리스트 ===== */
.biz-one-line{ margin-top:12px }
.biz-filters{ display:flex; gap:8px; align-items:center; flex-wrap:nowrap; margin:4px 2px 10px; }
.filter{ position:relative }
.filter .menu{
  position:absolute; top:calc(100% + 6px); left:0; z-index:50; min-width:140px; padding:6px;
  border:1px solid #ddd; border-radius:10px; background:#fff; color:#111;
  box-shadow:0 10px 24px rgba(0,0,0,.12);
}
.filter .menu-item{ display:block; width:100%; border:0; background:transparent; color:#111; font-size:13px; text-align:left; padding:8px 10px; border-radius:8px; cursor:pointer; }
.filter .menu-item:hover{ background:#f5f5f5 }
:root[data-theme="dark"] .filter .menu,
:root[data-theme="black"] .filter .menu{ background:#fff; color:#111; }
:root[data-theme="dark"] .filter .menu-item,
:root[data-theme="black"] .filter .menu-item{ color:#111; }

/* 섹션 헤더 */
.sec-head{ display:flex; align-items:center; justify-content:space-between; margin:0 2px 6px }
.sec-head h3{ margin:0; font-size:15px; font-weight:900 }

/* ===== 게시판 리스트(ql-list) ===== */
.ql-list{ list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:8px }
.ql-row{
  border:1px solid var(--line); border-radius:12px; background:var(--surface); box-shadow:0 4px 12px var(--shadow);
  padding:10px; display:grid; grid-template-columns:42px 1fr; gap:8px; align-items:center;
}
.ql-left{ font-weight:900; font-size:13px; color:var(--muted); text-align:center }
.ql-body{ min-width:0 }
.ql-top{ display:flex; align-items:center; gap:6px }
.ql-ico{ font-size:14px }
.ql-title{ font-size:14px; font-weight:900; line-height:1.25 }
.ql-arr{ width:18px; height:18px; margin-left:auto }
.ql-snippet{ font-size:12.5px; color:var(--muted); margin-top:2px }
.clickable{ cursor: pointer; }
.clickable:active{ opacity:.8; }

.ql-meta{ margin-top:4px; font-size:11.5px; color:var(--muted); display:flex; align-items:center; gap:6px }
.ql-meta .sep{ opacity:.55 }
.ql-admin .btn-mini{ font-size:11px }

/* ===== 공통 시트 ===== */
.sheet-backdrop{
  position:fixed; inset:0;
  background:rgba(0,0,0,.35);
  display:flex; align-items:flex-end;
  z-index:140;
}
.sheet{
  width:100%;
  background:var(--bg);
  border-radius:18px 18px 0 0;
  box-shadow:0 -10px 30px rgba(0,0,0,.25);
  padding:14px;
  padding-bottom:max(14px, env(safe-area-inset-bottom));
}

/* 글쓰기 시트 */
.compose-sheet{
  max-height: calc(100vh - 80px);
  overflow: auto;
  padding-bottom: max(90px, env(safe-area-inset-bottom) + 60px);
}
.compose-sheet .cmt-actions{
  position: sticky;
  bottom: 0;
  background: var(--bg);
  padding: 10px 0 6px;
  margin-top: 12px;
  border-top: 1px solid color-mix(in oklab, var(--bg), white 12%);
  z-index: 1;
}
.attach-pop.compose-attach{ right:14px !important; bottom:70px !important; z-index:2 }
.sheet-head{ display:flex; justify-content:space-between; align-items:center; gap:8px }
.sheet-title{ font-size:17px }
.sheet-head .x{ width:32px; height:32px; border-radius:50%; border:1px solid var(--line); background:var(--surface); display:flex; align-items:center; justify-content:center; color:var(--fg); }
:root[data-theme="white"] .sheet-head .x{ color:#111 !important }

/* 카테고리 탭 */
.cat-tabs{
  display:flex; gap:6px; flex-wrap:wrap;
  padding:8px 12px;
  background:transparent;
  border:0;
}
.cat-tabs.one-line{
  display:flex; align-items:center; gap:6px;
  padding:6px 8px 12px; margin:0;
  background:transparent;
  border:0;
  overflow-x:auto; overflow-y:hidden;
  white-space:nowrap;
  -ms-overflow-style:none; scrollbar-width:none;
}
.cat-tabs.one-line::-webkit-scrollbar{ display:none; }
.cat-tabs .chip.xs{
  background: transparent;
  border: 1px solid var(--line);
  color: var(--fg);
  border-radius: 999px;
  box-shadow: none;
}

.cat-tabs .chip.xs.on{
  background: transparent;
  border-color: var(--accent);
  outline: 0;
  box-shadow: 0 0 0 2px color-mix(in oklab, var(--accent), white 80%);
}
.chip.xs{ height:30px; padding:0 10px; font-size:13px; border-radius:999px; display:inline-flex; align-items:center; gap:6px; flex:0 0 auto; }
.chip.xs .ico{ font-size:11px }

/* 화이트 모드 대비 */
:root[data-theme="white"] .cat-head .back-btn{ color:#111 !important; background:#fff !important; border-color:#bbb !important; box-shadow:0 1px 2px rgba(0,0,0,.06) }
:root[data-theme="white"] .back-btn{ color:#111 !important; background:#fff !important; border-color:#bbb !important; }
:root[data-theme="white"] .cat-tabs .chip,
:root[data-theme="white"] .cat-tabs .chip .ico,
:root[data-theme="white"] .cat-tabs .chip .lbl{ color:#111 !important; }
:root[data-theme="white"] .cat-tabs .chip.xs.on{
  background: transparent !important;
  border-color: var(--accent) !important;
  box-shadow: 0 0 0 2px color-mix(in oklab, var(--accent), white 80%) !important;
}
:root[data-theme="white"] .cat-tabs .chip.on{ background:transparent !important; border-color:var(--accent) !important; box-shadow:0 0 0 2px color-mix(in oklab, var(--accent), white 80%) !important; }
:root[data-theme="white"] .wrap,
:root[data-theme="white"] .sheet,
:root[data-theme="white"] .cat-sheet{ color:#111 !important; }
:root[data-theme="white"] .chat-sheet{ color:#111 !important; }
:root[data-theme="white"] .muted{ color:#666 !important }
:root[data-theme="white"] .detail-pre{ color:#111 !important }
:root[data-theme="white"] .row-snippet{ color:#666 !important }
:root[data-theme="white"] .sheet-title,
:root[data-theme="white"] .title,
:root[data-theme="white"] .n-title{ color:#111 !important }
:root[data-theme="white"] .btn-edit,
:root[data-theme="white"] .btn-like,
:root[data-theme="white"] .btn-close,
/* 화이트 모드에서 목록의 '수정/삭제' 미니 버튼을 연핑크 톤으로 */
:root[data-theme="white"] .btn-mini{
  background: #ffe6ef !important;   /* 연한 핑크 */
  border-color: #ffbcd2 !important;  /* 핑크 테두리 */
  color: #8a2241 !important;         /* 글자색(딥 핑크) */
  box-shadow: 0 1px 0 rgba(0,0,0,.03);
}

/* 삭제(danger) 버튼은 살짝 더 진한 핑크 */
:root[data-theme="white"] .btn-mini.danger{
  background: #ffd9e5 !important;
  border-color: #ffa7c1 !important;
  color: #b0003a !important;
}

/* 호버/액티브 피드백 */
:root[data-theme="white"] .btn-mini:hover{
  background: #ffd6e5 !important;
}
:root[data-theme="white"] .btn-mini:active{
  background: #ffc7db !important;
}

:root[data-theme="white"] .cmt-mini{ color:#111 !important }
:root[data-theme="white"] .cmt-mini.danger{ color:#d33 !important }
:root[data-theme="white"] .attach-pop,
:root[data-theme="white"] .compose-attach,
:root[data-theme="white"] .attach-item{ color:#111 !important; }
:root[data-theme="white"] .attach-item svg{ color:#111 !important }
:root[data-theme="white"] .field::placeholder,
:root[data-theme="white"] textarea.field::placeholder,
:root[data-theme="white"] .ta::placeholder{ color:#777 !important; }
:root[data-theme="white"] .compose-plus,
:root[data-theme="white"] .plus{ color:#111 !important }
:root[data-theme="black"] .compose-plus,
:root[data-theme="black"] .plus{ color:#fff !important }
:root[data-theme="dark"] .compose-plus,
:root[data-theme="dark"] .plus{ color:#fff !important }

.center{ text-align:center; padding:10px 0 }
.emoji-pop{ position:absolute; z-index:10060; min-width:240px; max-width:92vw; padding:8px; border:1px solid var(--line); border-radius:12px; background:var(--surface); color:var(--fg); box-shadow:0 16px 36px rgba(0,0,0,.18); }
.emoji-grid{ display:grid; grid-template-columns:repeat(8, 1fr); gap:6px; }
.emoji-btn{ font-size:20px; line-height:1; padding:8px; border:0; border-radius:8px; background:transparent; cursor:pointer; }
.emoji-btn:hover{ background:rgba(0,0,0,.06) }
.emoji-actions{ display:flex; justify-content:flex-end; margin-top:6px }
:root[data-theme="white"] .emoji-pop{ color:#111 !important }

.fade-enter-active, .fade-leave-active { transition: all .15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; max-height: 0; }
.notice-sec .older { border-top: 1px dashed var(--line); }

/* 컴팩트 */
.wrap.compact { padding: 10px; }
.wrap.compact .chip{ height:24px; font-size:11px; padding:0 8px; }
.wrap.compact .btn-write{ height:24px; font-size:12px; padding:0 10px; }
.wrap.compact .detail-sheet .detail-pre{ font-size:14px; }

/* ===== 배너(카테고리 버튼) ===== */
.pill-row{
  width:100%;
  display:flex; align-items:center; gap:8px;
  text-align:left;
  padding:12px 16px;
  border-radius:999px;
  border:1px solid var(--line);
  background-size: cover;
  background-position: center;
  color: var(--fg);
  font-weight:900;
  font-size:14px;
  box-shadow:0 4px 12px var(--shadow);
}
/* 리스트 배너는 배경사진 제거 + 슬림 */
.heal-quick .pill-row,
.yq-list .pill-row{
  width: calc(100% - 32px);
  margin: 0 16px;
  height: 33px;
  padding: 0 10px;
  font-size: 13px;
  background: var(--surface) !important;
  background-image: none !important;
  display:flex; align-items:center;
}

.pill-row .txt{ display:flex; align-items:center; gap:6px; }
.pill-row .lbl{ font-weight:900; }
.pill-row .sub{
  font-size:12px;
  color:var(--muted);
  border:0;
  background:transparent;
  border-radius:0;
  padding:0;
  line-height:1;
}

:root[data-theme="dark"] .pill-row,
:root[data-theme="black"] .pill-row{
  background-image:
    linear-gradient(180deg, rgba(0,0,0,.35), rgba(0,0,0,.35)),
    var(--pill-img);
  color:#fff;
}
.heal-quick .pill-row,
.yq-list .pill-row{
  color: var(--fg);
}

.pill-row .ico{ font-size:16px; line-height:1 }
.pill-row .lbl{ line-height:1 }
.pill-row:active{ transform:translateY(1px) }

.heal-quick{ list-style:none; padding:6px 0 2px; margin:0; display:flex; flex-direction:column; gap:8px }
.yaho-quick{ margin-top:8px }
.yq-list{ list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:8px }

/* 가게 리스트 */
.biz-list{ list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:8px }
.biz-row{ display:grid; grid-template-columns:50px 1fr; align-items:center; gap:10px; border:1px solid var(--line); border-radius:14px; background:var(--surface); color:var(--fg); box-shadow:0 4px 12px var(--shadow); padding:8px; }
.biz-row .thumb{ width:50px; height:50px; object-fit:cover; border-radius:10px; background:#eee; }
.biz-row .meta{ min-width:0; display:flex; flex-direction:column; gap:2px }
.biz-row .name{ font-weight:900; line-height:1.1; font-size:13.5px }
.biz-row .last{ font-size:11.5px; color:var(--muted) }

/* 풀스크린 오버레이(카테고리/상세) */
.cat-mask{ position: fixed; inset: 0; z-index: 80; background: var(--bg); display: flex; }
.cat-sheet{ flex:1; display:flex; flex-direction:column; background:var(--bg); overflow: auto; padding-bottom: max(16px, env(safe-area-inset-bottom)); }

/* 시트/헤더 공통 보정 */
.cat-head{
  position: sticky; top: 0;
  display:flex; align-items:center; gap:8px;
  padding:10px 12px;
  background: var(--surface);
  border-bottom: 1px solid color-mix(in oklab, var(--bg), white 10%);
  z-index: 1;
}
.back-btn{
  width:32px; height:32px; border-radius:50%;
  border:1px solid var(--line); background:var(--surface);
  display:flex; align-items:center; justify-content:center;
}
.cat-title{ font-size:16px; font-weight:900 }
.spacer{ flex:1 }

/* 글쓰기 폼 */
.compose-sheet .field{
  width:100%;
  box-sizing:border-box;
  border:1px solid var(--line);
  background:var(--surface);
  color:var(--fg);
  border-radius:10px;
  padding:10px 12px;
  font-size:14px;
  margin-top:8px;
}
.compose-sheet .ta{ resize:vertical; min-height:120px }
.compose-top{ margin:6px 0 2px }
.vote-fields{ display:grid; grid-template-columns:1fr; gap:8px; margin-top:6px }
.compose-attach{ right:14px !important; bottom:70px !important }
.hidden{ display:none }

/* 상세 페이지 */
.detail-mask{ position:fixed; inset:0; z-index:120; background:var(--bg); display:flex; }
.detail-sheet{ flex:1; display:flex; flex-direction:column; overflow:auto; background:var(--bg); padding-bottom: max(18px, env(safe-area-inset-bottom) + 90px); }
.detail-head{ position:sticky; top:0; z-index:2; }
.detail-body{ padding:12px; padding-top:8px; }
.d-meta{ font-size:12px; margin-bottom:8px; display:flex; align-items:center; gap:6px }
.d-meta .sep{ opacity:.6 }
.detail-pre{ font-size:15px; line-height:1.6; word-break:break-word; }

/* 댓글 */
.cmt-sec{ padding:0 12px 10px }
.cmt-head{ padding:8px 0; border-top:1px solid color-mix(in oklab, var(--bg), white 12%); margin-top:8px; }
.cmt-list{ list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:10px }
.cmt-row{ padding:10px 0; border-bottom:1px dashed color-mix(in oklab, var(--bg), white 16%); }
.cmt-top{ display:flex; align-items:center; gap:8px; }
.cmt-top .by{ font-weight:900; }
.cmt-mini{ font-size:12px; background:transparent; border:0; color:var(--fg); }
.cmt-mini.danger{ color:#d33 }
.cmt-body{ margin-top:6px; line-height:1.5; font-size:14px; word-break:break-word; }
.reply-list{ list-style:none; padding-left:10px; margin-top:8px; display:flex; flex-direction:column; gap:8px; }
.reply-row{ border-left:3px solid color-mix(in oklab, var(--accent), white 70%); padding-left:8px; }
.reply-composer{ margin-top:8px; }

/* 댓글 작성창 하단 고정 */
.composer.sticky{
  position: sticky; bottom: 0; left:0; right:0;
  background: var(--bg);
  padding: 10px 12px;
  border-top: 1px solid color-mix(in oklab, var(--bg), white 12%);
  z-index: 3;
}
.composer .field{ width:100%; border:1px solid var(--line); background:var(--surface); color:var(--fg); border-radius:10px; padding:10px 12px; font-size:14px; }
.composer .ta{ min-height:64px; resize:vertical }
.cmt-actions{ display:flex; align-items:center; gap:8px; padding-top:6px }
.btn-cmt{ height:34px; padding:0 12px; border-radius:10px; border:1px solid var(--accent); background: color-mix(in oklab, var(--accent), white 85%); font-weight:900; color:#111 }

/* 포커스 표시 */
.ql-row, .notice-row{ cursor:pointer; }
.ql-row:focus, .notice-row:focus{
  outline:0;
  box-shadow:0 0 0 2px color-mix(in oklab, var(--accent), white 75%);
  border-color:var(--accent);
}
.yaho-head.hero{
  position: relative;
  z-index: 2;            /* 위로 올리기 */
  pointer-events: auto;  /* 클릭 보장 */
}

</style>
