<template>
  <section class="wrap compact">
    <!-- ✅ 상단 이미지 슬라이더 배너 -->
    <section class="gt-slider-bar">
      <div class="gt-slider-track" :style="{ transform: `translateX(-${sliderIdx * 100}%)` }">
        <div
          v-for="(slide, i) in sliderItems"
          :key="i"
          class="gt-slide"
        >
          <img :src="slide.img" :alt="slide.alt" class="gt-slide-img" />
        </div>
      </div>
      <div class="gt-slider-dots">
        <span
          v-for="(_, i) in sliderItems"
          :key="i"
          class="gt-dot"
          :class="{ on: sliderIdx === i }"
          @click="sliderIdx = i"
        ></span>
      </div>
    </section>

    <!-- ===== 커뮤니티 2x2 그리드 ===== -->
    <section class="community-grid">
      <div class="grid-card dark" role="button" tabindex="0" @click="openCategoryPage('all')">
        <svg class="grid-lock" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="6" y="10" width="12" height="10" rx="2" stroke="currentColor" fill="none" stroke-width="2"/>
          <path d="M8 10V8a4 4 0 0 1 8 0v2" stroke="currentColor" fill="none" stroke-width="2"/>
        </svg>
        <b class="grid-title">강톡</b>
        <span class="grid-sub">100% 비공개</span>
      </div>
      <div class="grid-card light" role="button" tabindex="0" @click="openHealing">
        <b class="grid-title">힐링톡</b>
        <span class="grid-sub">명언 · 건강 · 여행 · 다이어트</span>
      </div>
      <div class="grid-card biz" role="button" tabindex="0" @click="openFirstBiz">
        <b class="grid-title">우리 가게 게시판</b>
        <span class="grid-sub">공지 · 소식 · 가게 이야기</span>
      </div>
      <div class="grid-card event" role="button" tabindex="0" @click="openCategoryPage('event')">
        <b class="grid-title">이벤트 참여</b>
        <span class="grid-sub">이벤트 · 혜택 · 참여</span>
      </div>
    </section>

    <!-- ===== 베스트 탭: 인기글 / 인기댓글 / 인기추천수 (pill 스타일) ===== -->
    <div class="best-tabs" role="tablist" aria-label="인기 정렬">
      <button
        type="button"
        class="pill-tab"
        :class="{ on: bestMode === 'views' }"
        role="tab"
        @click="bestMode = 'views'"
      >
        인기글
      </button>
      <button
        type="button"
        class="pill-tab"
        :class="{ on: bestMode === 'comments' }"
        role="tab"
        @click="bestMode = 'comments'"
      >
        인기댓글
      </button>
      <button
        type="button"
        class="pill-tab"
        :class="{ on: bestMode === 'likes' }"
        role="tab"
        @click="bestMode = 'likes'"
      >
        인기추천수
      </button>
    </div>

    <!-- ===== 베스트 랭킹 (카드형) ===== -->
    <section class="best-sec">
      <header class="sec-head">
        <h3>인기 {{ bestLabel }}</h3>
      </header>
      <ul class="best-list">
        <li
          v-for="(p, idx) in bestTop3"
          :key="p.id"
          class="post-card"
          @click="openPost(p)"
        >
          <div class="pc-body">
            <span class="pc-nick">{{ authorName(p) }}</span>
            <div class="pc-title ellip">{{ p.title }}</div>
            <div class="pc-snippet ellip">{{ firstLine(p) }}</div>
            <div class="pc-footer">
              <span class="pc-time">{{ timeAgo(p.updatedAt || p.createdAt) }}</span>
              <span class="pc-stat">&#x2764; {{ Number(p.likes || 0).toLocaleString() }}</span>
              <span class="pc-stat">&#x1F4AC; {{ Number(p.cmtCount || 0).toLocaleString() }}</span>
            </div>
          </div>
          <img
            v-if="p.images && p.images.length"
            :src="p.images[0]"
            class="pc-thumb"
            alt=""
          />
        </li>
        <li v-if="!bestTop3.length" class="best-empty">
          아직 베스트 글이 없습니다.
        </li>
      </ul>
    </section>

    <!-- 우리가게 게시판 섹션 제거됨 (2x2 그리드 카드로 이동) -->

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

        <!-- ✅ 강톡 카테고리 탭 (공지 바로 위) -->
        <div class="cat-filter-tabs">
          <button
            v-for="t in yaTabsInPage"
            :key="t.key"
            type="button"
            class="chip xs"
            :class="{ on: catPage.filter === t.key }"
            @click="onCatFilterClick(t.key)"
          >
            <span class="ico" v-if="t.icon">{{ t.icon }}</span>
            <span>{{ t.label }}</span>
          </button>
        </div>

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
          </header>

          <ul class="notice-list">
            <li v-if="recentNotice" class="notice-row" role="button" tabindex="0"
                @click="openDetail(recentNotice)"
                @keydown.enter.prevent="openDetail(recentNotice)"
                @keydown.space.prevent="openDetail(recentNotice)">
              <span class="n-bullet">📌</span>
              <span class="n-title ellip">{{ recentNotice.title }}</span>
              <!-- ✅ authorName() 으로 닉네임/익명 표시 -->
              <span class="n-meta">
                <span class="n-author">{{ authorName(recentNotice) }}</span>
                <span class="sep"> / </span>
                <span class="n-time">{{ timeAgo(recentNotice.updatedAt || recentNotice.createdAt) }}</span>
              </span>
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
              <li v-for="n in otherNotices" :key="n.id" class="notice-row" role="button" tabindex="0"
                  @click="openDetail(n)"
                  @keydown.enter.prevent="openDetail(n)"
                  @keydown.space.prevent="openDetail(n)">
                <span class="n-bullet">📌</span>
                <span class="n-title ellip">{{ n.title }}</span>
                <!-- ✅ authorName() 사용 -->
                <span class="n-meta">
                  <span class="n-author">{{ authorName(n) }}</span>
                  <span class="sep"> / </span>
                  <span class="n-time">{{ timeAgo(n.updatedAt || n.createdAt) }}</span>
                </span>
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
                <!-- 카테고리 아이콘 -->
                <span class="ql-ico" :title="catLabelFor(p.category)" aria-hidden="true">
                  {{ catIcon(p.category) }}
                </span>

                <!-- 제목: 일반 글씨 느낌 -->
                <span class="ql-title ellip clickable" role="button" tabindex="0">
                  {{ p.title }}
                </span>

                <!-- 새글 N (최근 24시간 이내) -->
                <span v-if="isNewPost(p)" class="badge-new">N</span>

                <!-- 댓글 수 [2] -->
                <span v-if="p.cmtCount" class="badge-cmt">
                  [{{ Number(p.cmtCount || 0).toLocaleString() }}]
                </span>

                <!-- 모바일/웹 뱃지 -->
                <span v-if="deviceLabel(p)" class="badge-device">
                  {{ deviceLabel(p) }}
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
                <span class="m red date">{{ ymd(p.updatedAt || p.createdAt) }}</span><span class="sep">/</span>
                <span class="m red">조회수 : <b>{{ Number(p.views||0).toLocaleString() }}</b></span><span class="sep">/</span>
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

        <!-- ✅ 힐링톡 카테고리 탭 (공지 바로 위) -->
        <div class="cat-filter-tabs">
          <button
            v-for="t in healTabsInPage"
            :key="t.key"
            type="button"
            class="chip xs"
            :class="{ on: healingPage.filter === t.key }"
            @click="onHealFilterClick(t.key)"
          >
            <span class="ico" v-if="t.icon">{{ t.icon }}</span>
            <span>{{ t.label }}</span>
          </button>
        </div>

        <!-- ✅ 힐링 공지는 있을 때만 표시 (없으면 섹션 자체를 숨김) -->
        <section v-if="recentHealNotice" class="notice-sec tight">
          <header class="notice-head"><span>공지</span></header>
          <ul class="notice-list">
            <li class="notice-row" role="button" tabindex="0"
                @click="openDetail(recentHealNotice)"
                @keydown.enter.prevent="openDetail(recentHealNotice)"
                @keydown.space.prevent="openDetail(recentHealNotice)">
              <span class="n-bullet">📌</span>
              <span class="n-title ellip">{{ recentHealNotice.title }}</span>
              <span class="n-meta">
                <span class="n-author">{{ authorName(recentHealNotice) }}</span>
                <span class="sep"> / </span>
                <span class="n-time">{{ timeAgo(recentHealNotice.updatedAt || recentHealNotice.createdAt) }}</span>
              </span>
              <template v-if="isAdmin">
                <div class="n-admin" @click.stop>
                  <button class="btn-mini" type="button" @click="startNoticeEdit(recentHealNotice)">수정</button>
                  <button class="btn-mini danger" type="button" @click="deleteNotice(recentHealNotice)">삭제</button>
                </div>
              </template>
            </li>
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
                <!-- 힐링 카테고리 아이콘 -->
                <span class="ql-ico" :title="healCatLabelFor(p.category)" aria-hidden="true">
                  {{ healCatIcon(p.category) }}
                </span>

                <span class="ql-title ellip clickable" role="button" tabindex="0">
                  <small v-if="p.isSeed" class="muted" style="margin-right:6px">가이드</small>
                  {{ p.title }}
                </span>

                <!-- 새글 N -->
                <span v-if="isNewPost(p)" class="badge-new">N</span>

                <!-- 댓글 수 [2] -->
                <span v-if="p.cmtCount" class="badge-cmt">
                  [{{ Number(p.cmtCount || 0).toLocaleString() }}]
                </span>

                <!-- 모바일/웹 뱃지 -->
                <span v-if="deviceLabel(p)" class="badge-device">
                  {{ deviceLabel(p) }}
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
                <span class="m red date">{{ ymd(p.updatedAt || p.createdAt) }}</span><span class="sep">/</span>
                <span class="m red">조회수 : <b>{{ Number(p.views||0).toLocaleString() }}</b></span><span class="sep">/</span>
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
          <div class="sheet-head-left">
            <strong class="sheet-title">{{ editTargetId ? '글 수정' : '글쓰기' }}</strong>

            <!-- ✅ 내 글/댓글 보기 버튼 -->
            <button
              class="btn-mini"
              type="button"
              @click="goMyPosts"
            >
              내 글/댓글 보기
            </button>
          </div>

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
                v-for="c in composeCats"
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
          <!-- 닉네임 (비우면 익명) -->
          <input
            class="field"
            type="text"
            v-model="composeNick"
            placeholder="닉네임 (비우면 익명으로 표시됩니다)"
          />

          <input class="field" type="text" v-model="composeTitle" placeholder="제목을 입력하세요" />

          <!-- 투표일 때 A/B 항목 -->
          <div v-if="!composeBiz && composeCat==='vote'" class="vote-fields">
            <input class="field" type="text" v-model="composeA" placeholder="항목 A" />
            <input class="field" type="text" v-model="composeB" placeholder="항목 B" />
          </div>

          <!-- 일반 본문 -->
          <textarea class="field ta" rows="7" v-model="composeBody" placeholder="내용을 입력하세요" v-if="composeCat!=='vote'"></textarea>

          <!-- 첨부 메뉴(간단) -->
          <div class="cmt-actions" style="margin-top:8px">
            <button type="button" class="btn-mini" @click="cToggleAttach">첨부</button>
            <span class="spacer"></span>
            <button class="btn-cmt" type="submit">{{ editTargetId ? '수정 완료' : '등록' }}</button>
          </div>

          <!-- 첨부 팝 (사진만, 최대 3장) -->
          <div v-if="cAttach.open" class="attach-pop compose-attach" :style="cAttach.style" @click.stop>
            <button class="attach-item" type="button" @click="cPickImage">
              사진 첨부 (최대 3장)
            </button>

            <p class="attach-info">
              선택된 사진: {{ composeImages.length }} / 3
            </p>

            <div v-if="composeImages.length" class="attach-preview">
              <img
                v-for="(img, idx) in composeImages"
                :key="idx"
                :src="img.preview"
                class="attach-thumb"
                alt="첨부 이미지 미리보기"
              />
            </div>

            <button class="attach-item" type="button" @click="cCloseAttach">닫기</button>

            <!-- 사진 선택 input -->
            <input
              ref="cImgInput"
              type="file"
              accept="image/*"
              class="hidden"
              multiple
              @change="cOnImage"
            />
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
          <!-- ✅ 첨부 이미지: 글 상단에 순서대로 표시 -->
          <div v-if="detailImages.length" class="detail-images">
            <div
              v-for="(img, idx) in detailImages"
              :key="idx"
              class="detail-img-wrap"
            >
              <img
                :src="img"
                class="detail-img"
                :alt="`첨부 이미지 ${idx + 1}`"
              />
            </div>
          </div>

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
const storage = getStorage()
import {
  collection, query, orderBy, onSnapshot, getDocs,
  doc, serverTimestamp, increment, limit
} from 'firebase/firestore'
import { getStorage, ref as sRef, uploadBytes, getDownloadURL } from 'firebase/storage'

import { sanitizeUserPayload } from '@/lib/author'
import { safeAdd, safeUpdate, safeDelete } from '@/lib/firestoreSafe'

import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { CATEGORY_TEMPLATES, BOT_NAMES } from '@/data/sim-templates'

const AUTO_OPEN_CAT = false
const EMOJIS = ['😀','😁','😂','🤣','😊','😍','😘','😎','🤔','😮','😢','😡','👍','👎','🙏','👏','🔥','✨','🎉','💯','🥹','🤝','🫶','💪','😴','🤩','😇','🙌']
const emoji = ref({ open:false, target:'', style:{ right:'16px', bottom:'126px' } })

// 👇 힐링톡/강톡 아래의 “여러 카테고리 버튼”을 보일지 여부
const SHOW_INLINE_CATS = false

// ✅ 상단 이미지 슬라이더 (광고 배너 대체)
const sliderIdx = ref(0)
const sliderItems = ref([
  { img: '/img/banner1.jpg', alt: '배너 1' },
  { img: '/img/banner2.jpg', alt: '배너 2' },
  { img: '/img/banner3.jpg', alt: '배너 3' },
])
let sliderTimer = null
function startSlider() {
  sliderTimer = setInterval(() => {
    sliderIdx.value = (sliderIdx.value + 1) % sliderItems.value.length
  }, 4000)
}
function stopSlider() {
  if (sliderTimer) { clearInterval(sliderTimer); sliderTimer = null }
}

// ✅ (레거시) 상단 한 줄 광고 텍스트
const adLine = ref('')
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
import { useMyPageCore } from '@/composables/mypage/useMyPageCore.js'

const route = useRoute()
const router = useRouter()

// ✅ 마이페이지 공용 훅에서 기사한줄(newsline) 가져오기
const { news } = useMyPageCore()

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
  { key:'daily',   label:'뉴스게시판',   icon:'😉', desc:'기사한줄의 뉴스를 모아서 보는 곳' },
  { key:'suggest', label:'건의',   icon:'📢', desc:'우리가게 업주에게 바란다' },
  { key:'pledge',  label:'다짐',   icon:'💊', desc:'타임캡슐!! 미래의 나의다짐' },
  { key:'vote',    label:'투표',   icon:'✌️', desc:'뭐가 좋을지 투표해줘' },
  { key:'quiz',    label:'팡팡',   icon:'💥', desc:'퀴즈풀고 선물받자' },
  { key:'event',   label:'이벤트', icon:'🎉', desc:'다양한 이벤트 소식 모아보기' },
];

/* 목록/배지에 쓰이는 부제 텍스트(상단 리스트) */
const YA_SUBS = {
  hot:    '오늘의 인기글,댓글',
  daily:  '기사한줄의 내용을 여기서 볼 수 있어요',
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

/* ✅ 힐링톡 카테고리 메타 */
const healCats = [
  { key: 'travel', label: '여행.맛집',      icon: '🧭', desc: HEAL_SUBS.travel },
  { key: 'health', label: '건강.다이어트',  icon: '🩺', desc: HEAL_SUBS.health },
  { key: 'quote',  label: '명언.동기부여',  icon: '📝', desc: HEAL_SUBS.quote },
];

/* 힐링톡 상세 시트용 탭(전체 + 카테고리) */
const healTabsInPage = [{ key: 'all', label: '전체', icon: '✨' }, ...healCats]

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
const healLabel = computed(() =>
  healingPage.value.filter === 'all'
    ? '전체'
    : (healCats.find(x => x.key === healingPage.value.filter)?.label || '힐링')
)

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
// ✅ 기사한줄 → 강톡 뉴스게시판용 가짜 게시글로 변환
const newsPosts = computed(() => {
  const list = Array.isArray(news?.list) ? news.list : []
  return list.map((n, idx) => {
    const text = String(n.text || n.title || '').trim()
    const when = n.createdAt || n.ts || Date.now()
    return {
      id: n.id || `news_${idx}`,
      category: 'daily',          // 뉴스게시판 카테고리로 고정
      title: text || '(제목 없음)',
      subtitle: '',
      body: text,
      content: text,
      author: n.author || '운영팀',
      authorUid: '',
      views: 0,
      likes: 0,
      cmtCount: 0,
      optA: '',
      optB: '',
      votesA: 0,
      votesB: 0,
      isNotice: false,
      isSynthetic: false,
      simScenario: '',
      createdAt: tsToMs(when),
      updatedAt: tsToMs(when),
    }
  })
})

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
  // ✅ 작성 환경(모바일/웹 표시용)
  source: x.source || x.client || x.platform || x.from || '',
  // ✅ 첨부 이미지 배열 (Storage URL)
  images: Array.isArray(x.images)
    ? x.images.map(u => String(u || '').trim()).filter(Boolean)
    : [],
  createdAt: tsToMs(x.createdAt || x.createdAtMs || x.updatedAt),
  updatedAt: tsToMs(x.updatedAt || x.updatedAtMs || x.createdAt),
})

const filteredForHot = computed(() => {
  const tab = yaTab.value
  if (tab === 'hot') return posts.value.filter(p => !p.isNotice)
  const tag = yaMap[tab] || 'daily'
  return posts.value.filter(p => p.category === tag)
})
const top3Views = computed(() =>
  filteredForHot.value
    .slice()
    .sort((a, b) => Number(b.views || 0) - Number(a.views || 0))
    .slice(0, 3)
)
const top3Likes = computed(() =>
  filteredForHot.value
    .slice()
    .sort((a, b) => Number(b.likes || 0) - Number(a.likes || 0))
    .slice(0, 3)
)
const top3Cmts = computed(() =>
  filteredForHot.value
    .slice()
    .sort((a, b) => Number(b.cmtCount || 0) - Number(a.cmtCount || 0))
    .slice(0, 3)
)

/* ▼ 베스트 탭 상태 + 현재 선택된 베스트 리스트 */
const bestMode = ref('views') // 'views' | 'comments' | 'likes'

const bestLabel = computed(() => {
  if (bestMode.value === 'comments') return '댓글'
  if (bestMode.value === 'likes') return '추천수'
  return '글'
})

const bestTop3 = computed(() => {
  if (bestMode.value === 'comments') return top3Cmts.value
  if (bestMode.value === 'likes') return top3Likes.value
  return top3Views.value
})

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

// ✅ 매장 승인 여부: active + applyStatus/approved 기준
function isStoreApproved(x = {}) {
  const active = x.active !== false           // active가 false면 숨김
  const approvedFlag = x.approved === true    // approved: true 면 승인

  const apply = String(x.applyStatus || '').trim().toLowerCase()
  const applyApproved =
    ['approved', '승인', '승인완료'].includes(apply)

  // 🔹 active 이면서 (approved === true 또는 applyStatus가 승인 계열) 인 경우만 승인으로 인정
  return active && (approvedFlag || applyApproved)
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
        // 🔹 승인 여부/상태 저장
        isApproved: isStoreApproved(x),
        applyStatus: x.applyStatus || '',
        active: x.active !== false,
        // ✅ 작성글 수(필드명은 상황에 맞게 자동 사용)
        postCount: Number(
          x.postCount ||
          x.postsCount ||
          x.boardPostCount ||
          x.boardPosts ||
          0
        ),
        createdAt: tsToMs(x.createdAt || x.updatedAt),
        updatedAt: tsToMs(x.updatedAt || x.createdAt),
      }
    })

    unsubStores = onSnapshot(
      qRef,
      (snap)=>{
        bizRooms.value = snap.docs.map(d => {
          const x = d.data() || {}
          return {
            id: d.id,
            name: x.name || '(이름 없음)',
            region: x.region || '',
            type: catLabelFromStore(x.category),
            manager: x.manager || '',
            logo: x.thumb || '',
            adTitle: x.adTitle || x.desc || '',
            // 🔹 스냅샷에서도 승인/상태 반영
            isApproved: isStoreApproved(x),
            applyStatus: x.applyStatus || '',
            active: x.active !== false,
            postCount: Number(
              x.postCount ||
              x.postsCount ||
              x.boardPostCount ||
              x.boardPosts ||
              0
            ),
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

  // 비회원: 안내 후 로그인/회원가입 화면으로 이동
  alert('회원가입 후 이용해 주세요.')
  const next = route.fullPath || route.path
  router.replace({ path:'/auth', query:{ next } })
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
        // ▶ 조회수만 증가
        await updateDoc(doc(fbDb, 'board_posts', String(postId)), {
          views: increment(1)
        })
      } else if (act === 'like') {
        // ▶ 상세 화면에서도 추천이면 조회수도 같이 +1
        await updateDoc(doc(fbDb, 'board_posts', String(postId)), {
          likes: increment(1),
          views: increment(1),
          updatedAt: serverTimestamp(),    // ← 같이 올려서 반영 빠르게
        })
      } else {
        await updateDoc(doc(fbDb, 'board_posts', String(postId)), {
          cmtCount: increment(1)
        })
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
    await updateDoc(doc(
      fbDb,
      'stores',
      String(storeId),
      'posts',
      String(postId)
    ), {
      likes: increment(1),
      views: increment(1),           // ▶ 업체 게시판도 추천 = 조회수 +1
      updatedAt: serverTimestamp()
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
      views: increment(1),             // ▶ 실제 유저 추천 시에도 조회수 함께 +1
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
const composeNick = ref('')        // ✅ 닉네임 입력값
const composeTitle = ref('')
const composeSubtitle = ref('')
const composeBody = ref('')
const composeA = ref('')
const composeB = ref('')
const composeBiz = ref(false)
const composeBizStoreId = ref('')
const composeBizStoreName = ref('')

/** 글쓰기 이미지 첨부 (최대 3장) */
const composeImages = ref([]) // [{ file, preview, url }]

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

  // ✅ 닉네임 기본값: 계정 닉네임 (비워두면 익명)
  composeNick.value = myNick.value || ''

  composeTitle.value = ''
  composeSubtitle.value = ''
  composeBody.value = ''
  composeA.value = ''
  composeB.value = ''

  composeImages.value = []   // ✅ 이미지 초기화

  editTargetId.value = null
  showGenModal.value = true
}

/** 글쓰기에서 선택한 이미지들을 Firebase Storage에 업로드하고 URL 배열 반환 */
async function uploadComposeImages(authorUid){
  if (!composeImages.value.length) return []

  const folder = `board_images/${authorUid || 'anon'}/${Date.now()}`
  const urls = []

  for (let i = 0; i < composeImages.value.length; i++){
    const img = composeImages.value[i]
    const file = img.file
    if (!file) continue

    const ext = (file.name && file.name.includes('.'))
      ? file.name.split('.').pop()
      : 'jpg'

    const path = `${folder}/img_${i}.${ext}`
    const fileRef = sRef(storage, path)
    await uploadBytes(fileRef, file)
    const url = await getDownloadURL(fileRef)
    urls.push(url)
    img.url = url
  }

  return urls
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

  // ⬇ 닉네임(비우면 익명) 처리 – 이전에 추가해둔 부분
  const nick = (composeNick.value || '').trim()
  const authorNameForSave = nick || '익명'

  // ✅ 이미지가 있으면 먼저 업로드
  const imageUrls = await uploadComposeImages(authorUid)

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
          views: 0, likes: 0, cmtCount: 0,
          votesA: 0, votesB: 0,
          images: imageUrls,
          source: 'web',                    // ✅ 추가
          author: authorNameForSave,
          authorUid,
          createdAt: serverTimestamp(), updatedAt: serverTimestamp()
        }, authorUid),
        'createVotePost'
      )
    }
    // ✅ 관리자 전용 '공지' 카테고리
    else if (composeCat.value === 'notice' && isAdmin.value){
      const baseCat =
        (catPage.value.filter && catPage.value.filter !== 'all')
          ? (yaMap[catPage.value.filter] || 'daily')
          : 'daily'

      const text = (composeBody.value || '').trim()
      await safeAdd(
        collection(fbDb, 'board_posts'),
        sanitizeUserPayload({
          category: baseCat,
          isNotice: true,
          title,
          body: text, content: text,
          views: 0, likes: 0, cmtCount: 0,
          images: imageUrls,
          source: 'web',                    // ✅ 추가
          author: authorNameForSave,
          authorUid,
          createdAt: serverTimestamp(), updatedAt: serverTimestamp()
        }, authorUid),
        'createNoticeByCompose'
      )
    }
    // 일반 게시글
    else{
      const mapped = yaMap[composeCat.value] || 'var'
      const text = (composeBody.value || '').trim()
      await safeAdd(
        collection(fbDb, 'board_posts'),
        sanitizeUserPayload({
          category: mapped,
          title,
          body: text, content: text,
          views: 0, likes: 0, cmtCount: 0,
          images: imageUrls,
          source: 'web',                    // ✅ 추가
          author: authorNameForSave,
          authorUid,
          createdAt: serverTimestamp(), updatedAt: serverTimestamp()
        }, authorUid),
        'createBoardPost'
      )
    }

    // 저장 후 입력값/이미지 초기화
    composeImages.value = []

    showGenModal.value = false
  }catch(e){
    alert('등록에 실패했습니다.')
  }
}

async function goMyPosts(){
  // 로그인 안 되어 있으면 먼저 로그인/회원가입으로 보내기
  try{
    await requireAuth()
  }catch(_){
    return
  }

  // 글쓰기 모달 닫고
  showGenModal.value = false

  // 마이페이지의 내 글/댓글 관리로 이동
  // (section=posts 쿼리는 마이페이지에서 사용하도록 여유 있게 남겨둠)
  router.push({
    path: '/mypage',
    query: { section: 'posts' }
  }).catch(()=>{})
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

  // ✅ 기존 글의 닉네임을 폼에 반영 (익명이면 빈칸)
  composeNick.value = (post.author && post.author !== '익명') ? post.author : ''

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

  // 편집 시에도 새로 선택하므로 기존 이미지 배열은 비워둠
  composeImages.value = []

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
const catLabel = computed(() =>
  catPage.value.filter === 'all'
    ? '강톡 게시판'
    : (yaCats.find(x => x.key === catPage.value.filter)?.label || '강톡 게시판')
)

const catPosts = computed(() => {
  const f = catPage.value.filter

  // ✅ 뉴스게시판(일상) 탭일 때는 board_posts 대신 기사한줄(newsPosts)만 사용
  if (f === 'daily') {
    return newsPosts.value
  }

  // 나머지 카테고리는 기존 board_posts 기준
  const list = posts.value.filter(
    p => !isNotice(p) && (f === 'all' ? true : p.category === (yaMap[f] || f))
  )
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
          // ▶ 조회수만 증가
          await updateDoc(doc(fbDb, 'board_posts', String(target.id)), {
            views: increment(1)
          })
        } else {
          // ▶ 추천수가 오를 때 조회수도 같이 +1 (조회수 ≥ 추천수 보장)
          await updateDoc(doc(fbDb, 'board_posts', String(target.id)), {
            likes: increment(1),
            views: increment(1),
            updatedAt: serverTimestamp(),
          })
        }
      }
    }catch(_){}
    listTicker = setTimeout(tick, randDelay())
  }

  listTicker = setTimeout(tick, randDelay())
}

// ✅ 강톡 상세 시트 상단 카테고리 탭 클릭
function onCatFilterClick(key){
  const f = key || 'all'
  // 현재 열려있는 catPage 에 필터만 바꿔서 유지
  catPage.value = { ...catPage.value, filter: f }

  // 베스트 탭/설명과도 어느 정도 맞추기 위해 hot 제외하고 동기화
  if (f !== 'all') {
    yaTab.value = f
  }
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

// ✅ 힐링톡 상세 시트 상단 카테고리 탭 클릭
function onHealFilterClick(key){
  const f = key || 'all'
  healingPage.value = { ...healingPage.value, filter: f }
}

/* 상세 보기 */
const detail = ref({ open:false, post:{} })

// ✅ 상세 글의 첨부 이미지들 (위에서부터 순서대로 표시)
const detailImages = computed(() => {
  const arr = detail.value?.post?.images
  if (!Array.isArray(arr)) return []
  return arr.map(u => String(u || '').trim()).filter(Boolean)
})

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
/* 표시 유틸 */
function authorName(p){
  const name = p?.author || ''
  return name.trim() || '익명'
}

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

/* ✅ 새 글 여부(24시간 이내) */
function isNewPost(p){
  const ms = tsToMs(p?.createdAt || p?.updatedAt)
  const diff = Date.now() - ms
  return diff <= 24 * 60 * 60 * 1000   // 필요하면 12시간 등으로 조정 가능
}

/* ✅ 모바일/웹 라벨 */
function deviceLabel(p){
  const raw = String(p?.source || '').toLowerCase()
  if (!raw) return ''
  if (['mobile','app','android','ios'].some(k => raw.includes(k))) return 'mobile'
  if (['web','pc','desktop'].some(k => raw.includes(k))) return 'web'
  return ''
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
const cImgInput  = ref(null)
const MAX_IMAGES = 3

function cToggleAttach(){
  cAttach.value.open = !cAttach.value.open
  if (cAttach.value.open){
    cAttach.value.style = { right:'16px', bottom:'70px' }
  }
}
function cCloseAttach(){ cAttach.value.open = false }
function cPickImage(){ cImgInput.value?.click() }

function cOnImage(e){
  const files = Array.from(e.target.files || [])
  if (!files.length) return

  const remain = MAX_IMAGES - composeImages.value.length
  if (remain <= 0){
    alert(`사진은 최대 ${MAX_IMAGES}장까지 첨부할 수 있습니다.`)
    e.target.value = ''
    return
  }

  const slice = files.slice(0, remain)
  for (const file of slice){
    const preview = URL.createObjectURL(file)
    composeImages.value.push({ file, preview, url: null })
  }

  if (files.length > slice.length){
    alert(`사진은 최대 ${MAX_IMAGES}장까지만 선택됩니다.`)
  }
  e.target.value = ''
}

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
/* 글쓰기 모달 카테고리(관리자일 때만 '공지' 추가) */
const composeCats = computed(() => {
  const base = [
    { key:'daily',  label:'뉴스게시판' },
    { key:'suggest',label:'건의' },
    { key:'pledge', label:'다짐' },
    { key:'vote',   label:'투표' },
    { key:'quiz',   label:'퀴즈' },
    { key:'event',  label:'이벤트' },
    { key:'travel', label:'여행.맛집' },
    { key:'health', label:'건강.다이어트' },
    { key:'quote',  label:'명언.동기부여' },
  ]
  // 강톡 관리자일 때만 '공지' 카테고리 맨 앞에 추가
  if (isAdmin.value) {
    return [{ key:'notice', label:'공지' }, ...base]
  }
  return base
})

/* 퍼시스턴스 + 인증 가드 */
onBeforeMount(()=>{
  const auth = getAuth()
  setPersistence(auth, browserLocalPersistence).catch(()=>{})

  const u = auth.currentUser
  // ✅ 비회원이어도 강톡 페이지 진입은 허용
  if (u) {
    // 로그인된 경우에만 쿼리로 넘어온 room 등 자동 오픈
    openFromQueryFast()
  }
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
  startSlider()
  window.addEventListener('resize', scrollToBottom)
})
onBeforeUnmount(()=>{
  stopSlider()
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
const filteredBizRooms = computed(() => {
  const filtered = bizRooms.value.filter(r =>
    // 🔹 승인된 가게만 노출 (isApproved === true 인 것만)
    r.isApproved === true &&
    (selectedRegionBiz.value === 'all' || macroBiz(r) === selectedRegionBiz.value) &&
    (selectedTypeBiz.value === 'all' || r.type === selectedTypeBiz.value)
  )

  // ✅ 작성글 많은 순 정렬 → 같으면 최근 업데이트순
  return filtered
    .slice()
    .sort((a, b) => {
      const ac = Number(a.postCount || 0)
      const bc = Number(b.postCount || 0)
      if (bc !== ac) return bc - ac
      return (b.updatedAt || 0) - (a.updatedAt || 0)
    })
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

/* 이 페이지에서만 사용할 레이아웃 변수 (TopBar 높이) */
.wrap.compact{
  --gt-topbar-h: 56px;
  --gt-ad-h: 0px;
  padding: 10px;
  margin-top: var(--gt-topbar-h);
}

/* ===== 상단 이미지 슬라이더 ===== */
.gt-slider-bar{
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  margin-bottom: 12px;
  aspect-ratio: 16 / 7;
  background: #eee;
}
.gt-slider-track{
  display: flex;
  width: 100%;
  height: 100%;
  transition: transform 0.5s ease;
}
.gt-slide{
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
}
.gt-slide-img{
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.gt-slider-dots{
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
}
.gt-dot{
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255,255,255,0.5);
  cursor: pointer;
  transition: background 0.2s;
}
.gt-dot.on{
  background: #fff;
  box-shadow: 0 0 4px rgba(0,0,0,0.3);
}

/* ===== 2x2 커뮤니티 그리드 ===== */
.community-grid{
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 14px;
}
.grid-card{
  border-radius: 14px;
  padding: 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
  transition: transform 0.15s;
}
.grid-card:active{ transform: scale(0.97); }
.grid-title{ font-size: 15px; font-weight: 900; }
.grid-sub{ font-size: 11.5px; opacity: 0.8; line-height: 1.3; }
.grid-lock{ width: 18px; height: 18px; margin-bottom: 2px; }

.grid-card.dark{
  background: #1e1e2e;
  color: #fff;
}
.grid-card.light{
  background: linear-gradient(135deg, #fff5f8, #ffe4ec);
  color: #333;
}
.grid-card.biz{
  background: linear-gradient(135deg, #f0f4ff, #e4ecff);
  color: #333;
}
.grid-card.event{
  background: linear-gradient(135deg, #fff8e1, #ffecb3);
  color: #333;
}

/* ===== 헤더 & 타이틀 ===== */
.title{ margin:0; font-size:18px; font-weight:900 }

/* (히어로/tagline 스타일은 2x2 그리드로 대체됨) */

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
.ql-list{ list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:0 }
.ql-row{
  border:1px solid var(--line); border-radius:12px; background:var(--surface); box-shadow:0 4px 12px var(--shadow);
  padding:10px; display:grid; grid-template-columns:42px 1fr; gap:8px; align-items:center;
}
.ql-left{ font-weight:900; font-size:13px; color:var(--muted); text-align:center }
.ql-body{ min-width:0 }
.ql-top{ display:flex; align-items:center; gap:6px }
.ql-ico{ font-size:14px }
/* 제목: 일반 텍스트 느낌(굵기 감소, 색상 동일) */
.ql-title{
  font-size:13.5px;
  font-weight:500;
  line-height:1.25;
  color:var(--fg);
}

.ql-arr{ width:18px; height:18px; margin-left:auto }
.ql-snippet{ font-size:12.5px; color:var(--muted); margin-top:2px }
.clickable{ cursor: pointer; }
.clickable:active{ opacity:.8; }

.ql-meta{ margin-top:4px; font-size:11.5px; color:var(--muted); display:flex; align-items:center; gap:6px }
.ql-meta .sep{ opacity:.55 }
.ql-admin .btn-mini{ font-size:11px }

/* ✅ 날짜/조회수/추천수 빨간색 */
.ql-meta .m.red,
.ql-meta .m.red b{
  color:#e53935;  /* 진한 빨강 */
}

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
/* 글쓰기 헤더: 제목 + 내 글/댓글 보기 버튼 정렬 */
.sheet-head-left{
  display: flex;
  align-items: center;
  gap: 8px;
}

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

  border-radius: 999px !important;   /* 🔹 둥근 사각형 모양 통일 */
  box-shadow: 0 2px 4px rgba(0,0,0,.06);
}
/* 공지 메타: 닉네임 강조 + / 구분 */
.n-meta{
  font-size: 12px;
  color: var(--muted);
}

.n-meta .n-author{
  color: #e53935;        /* 🔴 빨간색 닉네임 */
  font-weight: 800;
}

.n-meta .sep{
  margin: 0 3px;
  opacity: 0.7;
}

.n-meta .n-time{
  opacity: 0.85;
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
/* 공지 헤더: "공지"는 중앙, 이전 공지 버튼은 오른쪽 */
.notice-head{
  position: relative;
  display: flex;
  justify-content: center;   /* ▶ 공지 텍스트를 중앙으로 */
  align-items: center;
  margin: 4px 2px 6px;
}

/* 공지 라벨 살짝 강조 */
.notice-head > span:first-child{
  font-weight: 700;
}

/* spacer는 중앙 정렬에 방해되므로 숨김 */
.notice-head .spacer{
  display: none;
}

/* 이전 공지 버튼은 오른쪽에 고정 */
.notice-head .btn-mini{
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
}

/* 컴팩트 */
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

.heal-quick{ list-style:none; padding:6px 0 2px; margin:0; display:flex; flex-direction:column; gap:0 }
.yaho-quick{ margin-top:8px }
.yq-list{ list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:0 }

/* 가게 리스트 */
.biz-list{ list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:0 }
.biz-row{ display:grid; grid-template-columns:50px 1fr; align-items:center; gap:10px; border:1px solid var(--line); border-radius:14px; background:var(--surface); color:var(--fg); box-shadow:0 4px 12px var(--shadow); padding:8px; }
.biz-row .thumb{ width:50px; height:50px; object-fit:cover; border-radius:10px; background:#eee; }
.biz-row .meta{ min-width:0; display:flex; flex-direction:column; gap:2px }
.biz-row .name{ font-weight:900; line-height:1.1; font-size:13.5px }
.biz-row .last{ font-size:11.5px; color:var(--muted) }

/* 풀스크린 오버레이(카테고리/상세) */
.cat-mask{
  position: fixed;
  top: var(--gt-topbar-h);
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 80;
  background: var(--bg);
  display: flex;
}

/* 👉 flex + overflow 조합 제거 + 상단 safe-area 확보 */
.cat-sheet{
  flex: 1;
  background: var(--bg);
  overflow: auto;
  padding-bottom: max(16px, env(safe-area-inset-bottom));
  padding-top: env(safe-area-inset-top); /* iOS 노치 영역만큼 내려서 그 아래에 헤더 고정 */
}

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

.detail-mask{
  position: fixed;
  top: var(--gt-topbar-h);
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 120;
  background: var(--bg);
  display: flex;
}

/* 👉 flex 제거 + 상단 safe-area 확보 */
.detail-sheet{
  flex: 1;
  background: var(--bg);
  overflow: auto;
  padding-bottom: max(18px, env(safe-area-inset-bottom) + 90px);
  padding-top: env(safe-area-inset-top);
}

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
/* ===== 미니 버튼 공통 스타일 (내 글/댓글 보기, 첨부, 이전 공지 등) ===== */
.btn-mini{
  height: 28px;
  padding: 0 12px;
  border-radius: 999px;  /* 둥근 사각형(필 모양) */
  border: 1px solid color-mix(in oklab, var(--accent), white 20%);

  background: color-mix(in oklab, var(--accent), white 90%);
  color: #111;

  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.01em;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,.06);
}

.btn-mini:active{
  transform: translateY(1px);
  box-shadow: 0 1px 2px rgba(0,0,0,.12);
}

/* 위험(danger) 버튼 - 삭제 등 */
.btn-mini.danger{
  border-color: #e53935;
  background: color-mix(in oklab, #e53935, white 90%);
  color: #b00020;
}

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

/* ===== 상단 베스트 탭 (pill 스타일) ===== */
.best-tabs{
  display: flex;
  gap: 8px;
  margin-top: 4px;
  margin-bottom: 8px;
}
.pill-tab{
  flex: 1;
  height: 36px;
  border: none;
  border-radius: 999px;
  font-size: 13.5px;
  font-weight: 800;
  cursor: pointer;
  background: var(--surface);
  color: var(--fg);
  border: 1px solid var(--line);
  transition: background 0.15s, color 0.15s;
}
.pill-tab.on{
  background: #ff6b9d;
  color: #fff;
  border-color: #ff6b9d;
  box-shadow: 0 2px 8px rgba(255,107,157,0.35);
}

/* ===== 베스트 랭킹 (카드형) ===== */
.best-sec{
  margin-top: 4px;
}
.best-list{
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ===== 게시글 카드 ===== */
.post-card{
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: var(--surface);
  box-shadow: 0 2px 10px var(--shadow);
  cursor: pointer;
  transition: transform 0.12s;
}
.post-card:active{ transform: translateY(1px); }
.pc-body{
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.pc-nick{
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
}
.pc-title{
  font-size: 14px;
  font-weight: 900;
  line-height: 1.3;
}
.pc-snippet{
  font-size: 12.5px;
  color: var(--muted);
  line-height: 1.4;
}
.pc-footer{
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
  font-size: 11.5px;
  color: var(--muted);
}
.pc-stat{
  display: flex;
  align-items: center;
  gap: 3px;
}
.pc-thumb{
  width: 72px;
  height: 72px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
  background: #eee;
}
.best-empty{
  font-size: 12px;
  color: var(--muted);
  padding: 4px 2px 10px;
}
/* 힐링톡 / 강톡 배너 오른쪽 "전체" 버튼 */
.hero-all-btn{
  height:26px;
  padding:0 12px;
  border-radius:999px;
  border:1px solid #fff;              /* 흰색 테두리 */
  background:rgba(255,255,255,0.85);  /* 살짝 흰 배경으로 클릭 유도 */
  color:#111;                         /* 검은색 글씨 */
  font-size:12px;
  font-weight:800;
  letter-spacing:0.02em;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  box-shadow:0 2px 6px rgba(0,0,0,0.18);
}
.hero-all-btn:active{
  transform:translateY(1px);
  box-shadow:0 1px 3px rgba(0,0,0,0.22);
}
/* 강톡 배너 오른쪽 버튼 묶음 */
.hero-rt{
  display: flex;
  align-items: center;
  gap: 6px;
}

/* "이벤트 참여" 텍스트 버튼 */
.hero-event-btn{
  border: 0;
  background: transparent;
  padding: 0 4px;

  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--accent);           /* 핑크 계열 포인트 색 */
  text-decoration: underline;     /* 텍스트형 버튼 느낌 */

  cursor: pointer;
}
.hero-event-btn:active{
  opacity: 0.7;
}

/* 글쓰기 사진 첨부 미리보기 */
.attach-info{
  margin: 6px 0 4px;
  font-size: 12px;
  color: var(--muted);
}

.attach-preview{
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}

.attach-thumb{
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid var(--line);
}
/* 상세 글 첨부 이미지 영역 */
.detail-images{
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-img-wrap{
  border-radius: 12px;
  overflow: hidden;
  background: #000;
}

.detail-img{
  width: 100%;
  display: block;
  object-fit: contain;
}
/* 상세 시트 상단 카테고리 탭 (강톡/힐링 공용) */
.cat-filter-tabs{
  display:flex;
  align-items:center;
  gap:6px;
  padding:6px 10px 8px;
  overflow-x:auto;
  overflow-y:hidden;
  white-space:nowrap;
  -ms-overflow-style:none;
  scrollbar-width:none;
}
.cat-filter-tabs::-webkit-scrollbar{
  display:none;
}
.cat-filter-tabs .chip.xs{
  flex:0 0 auto;
}
/* 새 글 N 표시 */
.badge-new{
  margin-left:4px;
  font-size:11px;
  font-weight:900;
  color:#e53935;
}

/* 댓글 수 [2] */
.badge-cmt{
  margin-left:4px;
  font-size:11px;
  font-weight:700;
  color:#e53935;
}

/* mobile / web 뱃지 */
.badge-device{
  margin-left:6px;
  padding:2px 6px;
  border-radius:999px;
  border:1px solid var(--line);
  font-size:11px;
  font-weight:700;
  color:var(--muted);
}

</style>
