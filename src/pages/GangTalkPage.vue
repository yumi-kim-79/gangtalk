<template>
  <!-- 커뮤니티 카드 이미지 프리로드 -->
  <teleport to="head">
    <link rel="preload" as="image" href="/img/community/cat-gangtok.jpg" />
    <link rel="preload" as="image" href="/img/community/cat-healing.jpg" />
    <link rel="preload" as="image" href="/img/community/cat-store.jpg" />
    <link rel="preload" as="image" href="/img/community/cat-event.jpg" />
  </teleport>
  <section class="wrap compact">
    <!-- ✅ 상단 배너 슬라이더 (REJURAN 스타일 CSS 배너) -->
    <section class="gt-slider-bar">
      <div class="gt-slider-track" :style="{ transform: `translateX(-${sliderIdx * 100}%)` }">
        <div
          v-for="(slide, i) in sliderItems"
          :key="i"
          class="gt-slide"
          :class="slide.theme"
        >
          <div class="slide-content">
            <div class="slide-logo">{{ slide.logo }}</div>
            <div class="slide-brand">{{ slide.brand }}</div>
            <div class="slide-tagline">{{ slide.tagline }}</div>
          </div>
          <div class="slide-circle" :style="{ background: slide.circleColor }"></div>
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

    <!-- ===== 섹션 타이틀 ===== -->
    <h2 class="section-title">🔥 주제 별 커뮤니티</h2>

    <!-- ===== 커뮤니티 2x2 그리드 (이미지에 텍스트 포함, 코드 텍스트 숨김) ===== -->
    <section class="community-grid">
      <div class="grid-card" role="button" tabindex="0" @click="openCategoryPage('all')"
           :style="{ backgroundImage: `url('/img/community/cat-gangtok.jpg')`, backgroundColor: '#1e2040' }">
      </div>
      <div class="grid-card" role="button" tabindex="0" @click="openHealing"
           :style="{ backgroundImage: `url('/img/community/cat-healing.jpg')`, backgroundColor: '#c4a882' }">
      </div>
      <div class="grid-card" role="button" tabindex="0" @click="openFirstBiz"
           :style="{ backgroundImage: `url('/img/community/cat-store.jpg')`, backgroundColor: '#d1c4e9' }">
      </div>
      <div class="grid-card" role="button" tabindex="0" @click="openCategoryPage('event')"
           :style="{ backgroundImage: `url('/img/community/cat-event.jpg')`, backgroundColor: '#ffe0b2' }">
      </div>
    </section>

    <!-- ===== 베스트 탭 (pill 스타일, 작은 크기) ===== -->
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
        인기 댓글
      </button>
      <button
        type="button"
        class="pill-tab"
        :class="{ on: bestMode === 'likes' }"
        role="tab"
        @click="bestMode = 'likes'"
      >
        인기 추천수
      </button>
    </div>

    <!-- ===== 게시글 리스트 (카드형 + 구분선) ===== -->
    <section class="best-sec">
      <ul class="post-list">
        <li
          v-for="p in sortedPostList"
          :key="p.id"
          class="post-card"
          @click="openPost(p)"
        >
          <div class="pc-body">
            <span class="pc-nick">{{ authorName(p) }}</span>
            <div class="pc-title ellip">{{ p.title }}</div>
            <div class="pc-snippet ellip">{{ firstLine(p) }}</div>
            <div class="pc-footer">
              <span class="pc-time">{{ ymd(p.updatedAt || p.createdAt) }}</span>
              <span class="pc-stat"><svg class="pc-ico" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/></svg> {{ Number(p.likes || 0).toLocaleString() }}</span>
              <span class="pc-stat"><svg class="pc-ico" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="none" stroke="currentColor" stroke-width="2"/></svg> {{ Number(p.cmtCount || 0).toLocaleString() }}개</span>
            </div>
          </div>
          <img
            v-if="p.images && p.images.length"
            :src="p.images[0]"
            class="pc-thumb"
            alt=""
            loading="lazy"
          />
        </li>
        <li v-if="!sortedPostList.length" class="best-empty">
          아직 게시글이 없습니다.
        </li>
      </ul>
      <button
        v-if="hasMorePosts && sortedPostList.length"
        type="button"
        class="btn-load-more"
        :disabled="loadingMore"
        @click="loadMorePosts"
      >
        {{ loadingMore ? '불러오는 중...' : '더 보기' }}
      </button>
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
      <section class="cat-sheet v2" role="dialog" aria-modal="true">
        <!-- 헤더 -->
        <header class="v2-head">
          <button class="v2-back" type="button" @click="closeCatPage">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <strong class="v2-head-title">{{ catLabel }}</strong>
          <span class="spacer"></span>
          <button v-if="isAdmin" class="btn-mini" type="button" @click.stop="toggleAutoSeed">{{ AUTO_SEED ? '자동글 OFF' : '자동글 ON' }}</button>
          <button class="v2-write-btn" type="button" @click="openCreate">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
            글쓰기
          </button>
        </header>

        <!-- 카테고리 pill 탭 -->
        <div class="v2-cat-tabs">
          <button
            v-for="t in yaTabsInPage"
            :key="t.key"
            type="button"
            class="v2-pill"
            :class="{ on: catPage.filter === t.key }"
            @click="onCatFilterClick(t.key)"
          >
            <span v-if="t.icon" class="v2-pill-ico">{{ t.icon }}</span>
            {{ t.label }}
          </button>
        </div>

        <!-- 공지 카드 -->
        <div v-if="recentNotice" class="v2-notice" @click="openDetail(recentNotice)">
          <span class="v2-notice-pin">📌</span>
          <div class="v2-notice-body">
            <div class="v2-notice-title ellip">{{ recentNotice.title }}</div>
            <div class="v2-notice-meta">{{ authorName(recentNotice) }} · {{ timeAgo(recentNotice.updatedAt || recentNotice.createdAt) }}</div>
          </div>
          <template v-if="isAdmin">
            <div class="v2-notice-admin" @click.stop>
              <button class="btn-mini" type="button" @click="startNoticeEdit(recentNotice)">수정</button>
              <button class="btn-mini danger" type="button" @click="deleteNotice(recentNotice)">삭제</button>
            </div>
          </template>
        </div>

        <!-- 게시글 카드 리스트 -->
        <ul class="v2-post-list">
          <li v-for="p in catPosts" :key="p.id" class="v2-post-card" @click="openDetail(p)">
            <div class="v2-pc-main">
              <div class="v2-pc-top">
                <span class="v2-cat-badge">{{ catIcon(p.category) }} {{ catLabelFor(p.category) }}</span>
                <span class="v2-pc-nick">{{ authorName(p) }}</span>
                <span v-if="isNewPost(p)" class="v2-badge-new">N</span>
              </div>
              <div class="v2-pc-title ellip">{{ p.title }}</div>
              <div v-if="shouldShowSnippet(p)" class="v2-pc-snippet ellip">{{ firstLine(p) }}</div>
              <div class="v2-pc-footer">
                <span>{{ ymd(p.updatedAt || p.createdAt) }}</span>
                <span>👁 {{ Number(p.views||0).toLocaleString() }}</span>
                <span>❤️ {{ Number(p.likes||0).toLocaleString() }}</span>
                <span>💬 {{ Number(p.cmtCount||0).toLocaleString() }}</span>
              </div>
              <div class="v2-pc-admin" v-if="isAdmin" @click.stop>
                <button class="btn-mini" type="button" @click="startEdit(p)">수정</button>
                <button class="btn-mini danger" type="button" @click="deletePost(p)">삭제</button>
              </div>
            </div>
            <img v-if="p.images && p.images.length" :src="p.images[0]" class="v2-pc-thumb" alt="" loading="lazy" />
          </li>
          <li v-if="!catPosts.length" class="v2-empty">아직 등록된 글이 없습니다.</li>
        </ul>
      </section>
    </div>

    <!-- ========== 힐링톡(여행/건강/명언) 풀스크린 페이지 ========== -->
    <div v-if="healingPage.open" class="cat-mask" @click.self="closeHealingPage">
      <section class="cat-sheet v2" role="dialog" aria-modal="true">
        <header class="v2-head">
          <button class="v2-back" type="button" @click="closeHealingPage">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <strong class="v2-head-title">힐링톡 · {{ healLabel }}</strong>
          <span class="spacer"></span>
          <button v-if="isAdmin" class="btn-mini" type="button" @click.stop="toggleAutoSeed">{{ AUTO_SEED ? '자동글 OFF' : '자동글 ON' }}</button>
          <button class="v2-write-btn" type="button" @click="openCreate">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
            글쓰기
          </button>
        </header>

        <div class="v2-cat-tabs">
          <button
            v-for="t in healTabsInPage"
            :key="t.key"
            type="button"
            class="v2-pill"
            :class="{ on: healingPage.filter === t.key }"
            @click="onHealFilterClick(t.key)"
          >
            <span v-if="t.icon" class="v2-pill-ico">{{ t.icon }}</span>
            {{ t.label }}
          </button>
        </div>

        <div v-if="recentHealNotice" class="v2-notice" @click="openDetail(recentHealNotice)">
          <span class="v2-notice-pin">📌</span>
          <div class="v2-notice-body">
            <div class="v2-notice-title ellip">{{ recentHealNotice.title }}</div>
            <div class="v2-notice-meta">{{ authorName(recentHealNotice) }} · {{ timeAgo(recentHealNotice.updatedAt || recentHealNotice.createdAt) }}</div>
          </div>
          <template v-if="isAdmin">
            <div class="v2-notice-admin" @click.stop>
              <button class="btn-mini" type="button" @click="startNoticeEdit(recentHealNotice)">수정</button>
              <button class="btn-mini danger" type="button" @click="deleteNotice(recentHealNotice)">삭제</button>
            </div>
          </template>
        </div>

        <ul class="v2-post-list">
          <li v-for="p in healPosts" :key="p.id" class="v2-post-card" @click="openDetail(p)">
            <div class="v2-pc-main">
              <div class="v2-pc-top">
                <span class="v2-cat-badge">{{ healCatIcon(p.category) }} {{ healCatLabelFor(p.category) }}</span>
                <span class="v2-pc-nick">{{ authorName(p) }}</span>
                <span v-if="isNewPost(p)" class="v2-badge-new">N</span>
              </div>
              <div class="v2-pc-title ellip">{{ p.title }}</div>
              <div class="v2-pc-snippet ellip">{{ firstLine(p) }}</div>
              <div class="v2-pc-footer">
                <span>{{ ymd(p.updatedAt || p.createdAt) }}</span>
                <span>👁 {{ Number(p.views||0).toLocaleString() }}</span>
                <span>❤️ {{ Number(p.likes||0).toLocaleString() }}</span>
                <span>💬 {{ Number(p.cmtCount||0).toLocaleString() }}</span>
              </div>
              <div class="v2-pc-admin" v-if="isAdmin" @click.stop>
                <button class="btn-mini" type="button" @click="startEdit(p)">수정</button>
                <button class="btn-mini danger" type="button" @click="deletePost(p)">삭제</button>
              </div>
            </div>
            <img v-if="p.images && p.images.length" :src="p.images[0]" class="v2-pc-thumb" alt="" loading="lazy" />
          </li>
          <li v-if="!healPosts.length" class="v2-empty">아직 글이 없습니다.</li>
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

    <!-- ========== 글쓰기 모달 (v2 감성 디자인) ========== -->
    <div v-if="showGenModal" class="sheet-backdrop" @click.self="showGenModal=false">
      <div class="sheet v2-compose">
        <!-- 핸들바 -->
        <div class="v2-handle"></div>
        <header class="v2-compose-head">
          <strong class="v2-compose-title">{{ editTargetId ? '글 수정' : '새 글 작성' }}</strong>
          <button class="v2-close" type="button" @click="showGenModal=false">✕</button>
        </header>

        <!-- 카테고리 pill 태그 -->
        <div class="v2-compose-cats">
          <template v-if="composeBiz">
            <span class="v2-pill on">{{ composeBizStoreName }}</span>
          </template>
          <template v-else>
            <button
              v-for="c in composeCats"
              :key="c.key"
              class="v2-pill"
              :class="{ on: composeCat === c.key }"
              type="button"
              @click="composeCat = c.key"
            >{{ c.label }}</button>
          </template>
        </div>

        <!-- 닉네임 표시 -->
        <div class="v2-compose-user">
          <div class="v2-cmt-avatar sm">{{ (composeNick || '익')[0] }}</div>
          <input class="v2-nick-input" type="text" v-model="composeNick" placeholder="닉네임 (비우면 익명)" />
        </div>

        <!-- 입력 폼 -->
        <form @submit.prevent="confirmCreate" class="v2-compose-form">
          <input class="v2-title-input" type="text" v-model="composeTitle" placeholder="제목을 입력하세요" />
          <div class="v2-divider"></div>

          <div v-if="!composeBiz && composeCat==='vote'" class="vote-fields">
            <input class="v2-field" type="text" v-model="composeA" placeholder="항목 A" />
            <input class="v2-field" type="text" v-model="composeB" placeholder="항목 B" />
          </div>

          <textarea class="v2-body-input" rows="8" v-model="composeBody" placeholder="내용을 입력하세요..." v-if="composeCat!=='vote'"></textarea>

          <!-- 첨부 미리보기 -->
          <div v-if="composeImages.length" class="v2-attach-preview">
            <img v-for="(img, idx) in composeImages" :key="idx" :src="img.preview" class="v2-attach-thumb" />
          </div>

          <!-- 하단 툴바 -->
          <div class="v2-compose-toolbar">
            <button type="button" class="v2-tool-btn" @click="cToggleAttach">📷</button>
            <button type="button" class="v2-tool-btn" @click="goMyPosts">📝 내 글</button>
            <span class="spacer"></span>
            <span class="v2-char-count" v-if="composeBody">{{ composeBody.length }}자</span>
            <button class="v2-submit-btn" type="submit">{{ editTargetId ? '수정' : '등록' }}</button>
          </div>

          <!-- 사진 선택 input (숨김) -->
          <div v-if="cAttach.open" class="attach-pop compose-attach" :style="cAttach.style" @click.stop>
            <button class="attach-item" type="button" @click="cPickImage">사진 첨부 (최대 3장)</button>
            <button class="attach-item" type="button" @click="cCloseAttach">닫기</button>
            <input ref="cImgInput" type="file" accept="image/*" class="hidden" multiple @change="cOnImage" />
          </div>
        </form>
      </div>
    </div>

    <!-- ✅ 상세 페이지(풀스크린 시트) -->
    <div v-if="detail.open" class="detail-mask" @click.self="closeDetail">
      <section class="detail-sheet v2" role="dialog" aria-modal="true">
        <!-- 헤더 -->
        <header class="v2-head">
          <button class="v2-back" type="button" @click="closeDetail">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <span class="v2-head-title">게시글</span>
          <span class="spacer"></span>
        </header>

        <!-- 본문 -->
        <section class="v2-detail-body">
          <span class="v2-cat-badge" v-if="detail.post">{{ catIcon(detail.post.category) }} {{ catLabelFor(detail.post.category) }}</span>
          <h1 class="v2-detail-title">{{ detail.post?.title || '상세' }}</h1>
          <div class="v2-detail-meta">
            <span>{{ authorName(detail.post) }}</span>
            <span>{{ ymd(detail.post?.updatedAt || detail.post?.createdAt) }}</span>
          </div>

          <div v-if="detailImages.length" class="v2-detail-images">
            <img v-for="(img, idx) in detailImages" :key="idx" :src="img" class="v2-detail-img" :alt="`첨부 ${idx+1}`" loading="lazy" />
          </div>

          <div v-if="detailBodyText" class="v2-detail-content" v-html="detailBodyHtml"></div>
          <div v-else class="v2-detail-content muted">내용 없음</div>

          <!-- 추천 버튼 -->
          <div class="v2-like-wrap">
            <button class="v2-like-btn" type="button" @click="likeDetail">
              <span class="v2-like-heart">❤️</span>
              <span>{{ Number(detail.post?.likes || 0).toLocaleString() }}</span>
            </button>
          </div>
        </section>

        <!-- 댓글 -->
        <section class="v2-cmt-sec">
          <header class="v2-cmt-head">💬 댓글 {{ commentsCount }}</header>
          <ul class="v2-cmt-list">
            <li v-for="c in topComments" :key="c.id" class="v2-cmt-card">
              <div class="v2-cmt-avatar">{{ (c.author || '익')[0] }}</div>
              <div class="v2-cmt-body">
                <div class="v2-cmt-top">
                  <span class="v2-cmt-nick">익명</span>
                  <span class="v2-cmt-time">{{ timeAgo(c.createdAt) }}</span>
                  <span class="spacer"></span>
                  <button class="v2-cmt-action" type="button" @click="startReply(c)">답글</button>
                  <button class="v2-cmt-action danger" v-if="canDeleteComment(c)" type="button" @click="deleteComment(c)">삭제</button>
                </div>
                <div class="v2-cmt-text" v-html="renderCmt(c.body)"></div>

                <!-- 대댓글 -->
                <ul v-if="repliesOf(c.id).length" class="v2-reply-list">
                  <li v-for="r in repliesOf(c.id)" :key="r.id" class="v2-reply-card">
                    <div class="v2-cmt-avatar sm">{{ (r.author || '익')[0] }}</div>
                    <div class="v2-cmt-body">
                      <div class="v2-cmt-top">
                        <span class="v2-cmt-nick">익명</span>
                        <span class="v2-cmt-time">{{ timeAgo(r.createdAt) }}</span>
                        <span class="spacer"></span>
                        <button class="v2-cmt-action danger" v-if="canDeleteComment(r)" type="button" @click="deleteComment(r)">삭제</button>
                      </div>
                      <div class="v2-cmt-text" v-html="renderCmt(r.body)"></div>
                    </div>
                  </li>
                </ul>

                <!-- 대댓글 입력 -->
                <div v-if="replyForId === c.id" class="v2-reply-composer">
                  <textarea class="v2-field" rows="2" v-model="replyDraft" placeholder="답글을 입력하세요"></textarea>
                  <div class="v2-reply-actions">
                    <button class="btn-mini" type="button" @click="cancelReply">취소</button>
                    <button class="v2-submit-sm" type="button" @click="submitReply(c.id)">등록</button>
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </section>

        <!-- 댓글 입력 (하단 고정) -->
        <form class="v2-composer" @submit.prevent="submitComment">
          <input class="v2-composer-input" type="text" v-model="cmtDraft" placeholder="댓글을 남겨보세요..." />
          <button class="v2-send-btn" type="submit">
            <svg viewBox="0 0 24 24" width="20" height="20"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="#FF4D8D"/></svg>
          </button>
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
  doc, serverTimestamp, increment, limit, startAfter
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
  { theme: 'slide-rejuran', logo: 'ℜ REJURAN', brand: 'COSMETIC', tagline: 'REWRITE YOUR STORY', circleColor: 'rgba(0,180,180,0.35)' },
  { theme: 'slide-dark', logo: '강남톡방', brand: '강톡', tagline: '100% 비공개 커뮤니티', circleColor: 'rgba(255,107,157,0.3)' },
  { theme: 'slide-blue', logo: '힐링톡', brand: '명언·건강·여행', tagline: '일상에 쉼표를 더하다', circleColor: 'rgba(100,149,237,0.3)' },
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

const POSTS_PER_PAGE = 10
const hasMorePosts = ref(true)
const loadingMore = ref(false)
let lastPostDoc = null
// "더 보기"로 추가 로드된 게시글을 별도 보관 (onSnapshot 덮어쓰기 방지)
const olderPosts = ref([])

async function subscribePosts () {
  try{
    const qRef = query(
      collection(fbDb, 'board_posts'),
      orderBy('updatedAt','desc'),
      orderBy('createdAt','desc'),
      limit(POSTS_PER_PAGE)
    )

    unsubPosts = onSnapshot(
      qRef,
      (snap)=>{
        const firstPage = snap.docs.map(d => normalizePost(d.id, d.data()))
        if (!lastPostDoc) {
          lastPostDoc = snap.docs[snap.docs.length - 1] || null
          hasMorePosts.value = snap.docs.length >= POSTS_PER_PAGE
          console.log('[gangtalk] 첫 로드:', firstPage.length, '개, hasMore:', hasMorePosts.value, 'lastDoc:', !!lastPostDoc)
        }
        // 첫 페이지 ID 세트
        const firstIds = new Set(firstPage.map(p => p.id))
        // olderPosts에서 첫 페이지와 중복되지 않는 것만 유지
        const kept = olderPosts.value.filter(p => !firstIds.has(p.id))
        posts.value = [...firstPage, ...kept]
        maybePatchRoomTitleFromPosts()
      },
      (err)=>{
        if (err?.code !== 'permission-denied') console.warn('board_posts onSnapshot error:', err)
      }
    )

  }catch(e){
    console.warn('board_posts 구독 실패:', e)
  }
}

async function loadMorePosts() {
  console.log('[더보기] 클릭 — hasMore:', hasMorePosts.value, 'loading:', loadingMore.value, 'lastDoc:', !!lastPostDoc)
  if (!hasMorePosts.value || loadingMore.value || !lastPostDoc) return
  loadingMore.value = true
  try {
    const qRef = query(
      collection(fbDb, 'board_posts'),
      orderBy('updatedAt','desc'),
      orderBy('createdAt','desc'),
      startAfter(lastPostDoc),
      limit(POSTS_PER_PAGE)
    )
    const snap = await getDocs(qRef)
    const more = snap.docs.map(d => normalizePost(d.id, d.data()))
    console.log('[더보기] 추가 로드:', more.length, '개, 기존:', posts.value.length, '개')
    // 기존 olderPosts에 append
    olderPosts.value = [...olderPosts.value, ...more]
    // posts도 append
    posts.value = [...posts.value, ...more]
    lastPostDoc = snap.docs[snap.docs.length - 1] || lastPostDoc
    hasMorePosts.value = snap.docs.length >= POSTS_PER_PAGE
    console.log('[더보기] 결과 — 전체:', posts.value.length, '개, hasMore:', hasMorePosts.value)
  } catch(e) {
    console.warn('더 보기 실패:', e)
  } finally {
    loadingMore.value = false
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

// 전체 게시글 리스트 (탭별 정렬, "더 보기"용)
const sortedPostList = computed(() => {
  const all = posts.value.filter(p => !p.isNotice)
  if (bestMode.value === 'comments') {
    return all.slice().sort((a, b) => Number(b.cmtCount || 0) - Number(a.cmtCount || 0))
  }
  if (bestMode.value === 'likes') {
    return all.slice().sort((a, b) => Number(b.likes || 0) - Number(a.likes || 0))
  }
  return all.slice().sort((a, b) => Number(b.views || 0) - Number(a.views || 0))
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
    const qRef = query(collection(fbDb, 'stores'), orderBy('updatedAt','desc'), limit(50))
    // onSnapshot이 첫 결과도 전달하므로 getDocs 중복 호출 제거
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
  padding: 10px 14px;
  margin-top: var(--gt-topbar-h);
  background: #fff;
  color: #111;
}

/* ===== 상단 배너 슬라이더 ===== */
.gt-slider-bar{
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 16px;
  height: 200px;
  background: #1a1a2e;
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
  position: relative;
  overflow: hidden;
}
.gt-slide.slide-rejuran{ background: linear-gradient(135deg, #1a1a2e 0%, #2d1b3d 50%, #1a1a2e 100%); }
.gt-slide.slide-dark{ background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%); }
.gt-slide.slide-blue{ background: linear-gradient(135deg, #0d1b2a 0%, #1b2838 100%); }

.slide-content{
  position: relative;
  z-index: 2;
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.slide-logo{
  font-size: 20px;
  font-weight: 300;
  color: #fff;
  letter-spacing: 0.08em;
}
.slide-brand{
  font-size: 13px;
  font-weight: 400;
  color: rgba(255,255,255,0.7);
  letter-spacing: 0.15em;
  text-transform: uppercase;
}
.slide-tagline{
  font-size: 12px;
  font-weight: 400;
  color: rgba(255,255,255,0.55);
  letter-spacing: 0.05em;
  font-style: italic;
  margin-top: 4px;
}
.slide-circle{
  position: absolute;
  right: -30px;
  top: 50%;
  transform: translateY(-50%);
  width: 200px;
  height: 200px;
  border-radius: 50%;
  z-index: 1;
}

.gt-slider-dots{
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  z-index: 3;
}
.gt-dot{
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(255,255,255,0.4);
  cursor: pointer;
  transition: background 0.2s;
}
.gt-dot.on{
  background: #fff;
}

/* ===== 섹션 타이틀 ===== */
.section-title{
  font-size: 17px;
  font-weight: 900;
  margin: 0 0 12px 2px;
  color: #111;
}

/* ===== 2x2 커뮤니티 그리드 ===== */
.community-grid{
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 18px;
}
.grid-card{
  position: relative;
  border-radius: 16px;
  height: 130px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.15s;
  box-sizing: border-box;
  background-size: 100% 100%;
  background-position: center;
  background-repeat: no-repeat;
  line-height: 0;
  font-size: 0;
}
.grid-card:active{ transform: scale(0.97); }

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

/* ===== 베스트 탭 (pill, 작은 크기) ===== */
.best-tabs{
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
}
.pill-tab{
  height: 30px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  background: #fff;
  color: #888;
  border: 1px solid #e0e0e0;
  transition: background 0.15s, color 0.15s;
}
.pill-tab.on{
  background: #ff6b9d;
  color: #fff;
  border-color: #ff6b9d;
}

/* ===== 게시글 리스트 ===== */
.best-sec{
  margin-top: 0;
}
.post-list{
  list-style: none;
  padding: 0;
  margin: 0;
}

/* ===== 게시글 카드 (구분선 스타일) ===== */
.post-card{
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  background: transparent;
}
.post-card:first-child{
  padding-top: 0;
}
.post-card:active{ opacity: 0.7; }
.pc-body{
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.pc-nick{
  font-size: 11.5px;
  font-weight: 600;
  color: #999;
}
.pc-title{
  font-size: 14.5px;
  font-weight: 800;
  line-height: 1.35;
  color: #111;
}
.pc-snippet{
  font-size: 12.5px;
  color: #888;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-footer{
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 5px;
  font-size: 11.5px;
  color: #aaa;
}
.pc-stat{
  display: flex;
  align-items: center;
  gap: 3px;
  color: #ff6b9d;
}
.pc-ico{
  width: 13px;
  height: 13px;
}
.pc-time{
  color: #aaa;
}
.pc-thumb{
  width: 72px;
  height: 72px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
  background: #f5f5f5;
}
.best-empty{
  font-size: 12px;
  color: #aaa;
  padding: 16px 0;
  text-align: center;
}
.btn-load-more{
  display: block;
  width: 100%;
  margin-top: 12px;
  padding: 10px 0;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  background: #fff;
  color: #666;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.btn-load-more:active{ background: #f5f5f5; }
.btn-load-more:disabled{ opacity: 0.5; cursor: default; }
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

/* ============================================================
   V2 감성 디자인 (20대 여성 타겟)
   ============================================================ */

/* --- 공통 헤더 --- */
.v2-head{
  display:flex; align-items:center; gap:8px;
  padding:12px 16px; background:#fff;
  border-bottom:1px solid #f0f0f0;
  position:sticky; top:0; z-index:2;
}
.v2-back{
  width:36px; height:36px; border-radius:50%; border:none;
  background:#f5f5f5; display:flex; align-items:center; justify-content:center; cursor:pointer;
}
.v2-head-title{ font-size:17px; font-weight:800; color:#111; }
.v2-write-btn{
  display:inline-flex; align-items:center; gap:4px;
  height:34px; padding:0 14px; border-radius:999px; border:none;
  background:linear-gradient(135deg,#FF4D8D,#E91E8C); color:#fff;
  font-size:13px; font-weight:700; cursor:pointer;
}

/* --- 카테고리 pill 탭 --- */
.v2-cat-tabs{
  display:flex; gap:8px; padding:12px 16px; overflow-x:auto;
  -ms-overflow-style:none; scrollbar-width:none;
}
.v2-cat-tabs::-webkit-scrollbar{ display:none; }
.v2-pill{
  flex:0 0 auto; height:32px; padding:0 14px; border-radius:999px;
  border:1px solid #e8e8e8; background:#fff; color:#888;
  font-size:13px; font-weight:600; cursor:pointer;
  display:inline-flex; align-items:center; gap:4px;
}
.v2-pill.on{
  background:linear-gradient(135deg,#FF4D8D,#E91E8C); color:#fff; border-color:transparent;
}
.v2-pill-ico{ font-size:14px; }

/* --- 공지 카드 --- */
.v2-notice{
  margin:0 16px 12px; padding:12px 16px; border-radius:14px;
  background:#FFE4EF; display:flex; align-items:center; gap:10px; cursor:pointer;
}
.v2-notice-pin{ font-size:16px; }
.v2-notice-body{ flex:1; min-width:0; }
.v2-notice-title{ font-size:13.5px; font-weight:700; color:#111; }
.v2-notice-meta{ font-size:11px; color:#E91E8C; margin-top:2px; }

/* --- 게시글 카드 리스트 --- */
.v2-post-list{ list-style:none; padding:0 16px; margin:0; }
.v2-post-card{
  display:flex; gap:12px; padding:16px 0;
  border-bottom:1px solid #f0f0f0; cursor:pointer;
}
.v2-post-card:last-child{ border-bottom:none; }
.v2-pc-main{ flex:1; min-width:0; display:flex; flex-direction:column; gap:4px; }
.v2-pc-top{ display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.v2-cat-badge{
  display:inline-flex; align-items:center; gap:3px;
  padding:2px 8px; border-radius:999px;
  background:#FFE4EF; color:#E91E8C;
  font-size:11px; font-weight:700;
}
.v2-pc-nick{ font-size:11.5px; color:#999; }
.v2-badge-new{
  padding:1px 6px; border-radius:999px;
  background:#FF4D8D; color:#fff;
  font-size:10px; font-weight:800;
}
.v2-pc-title{ font-size:14.5px; font-weight:800; color:#111; line-height:1.35; }
.v2-pc-snippet{ font-size:12.5px; color:#888; line-height:1.4; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.v2-pc-footer{ display:flex; gap:10px; font-size:11px; color:#aaa; margin-top:4px; }
.v2-pc-thumb{
  width:72px; height:72px; border-radius:12px; object-fit:cover;
  flex-shrink:0; background:#f5f5f5;
}
.v2-pc-admin{ margin-top:6px; display:flex; gap:6px; }
.v2-empty{ padding:40px 0; text-align:center; color:#ccc; font-size:13px; }

/* --- 상세 페이지 --- */
.detail-sheet.v2{ background:#fff; }
.v2-detail-body{ padding:20px 16px 0; }
.v2-detail-title{ font-size:20px; font-weight:900; color:#111; margin:8px 0 6px; line-height:1.4; }
.v2-detail-meta{ font-size:12px; color:#aaa; display:flex; gap:8px; margin-bottom:16px; }
.v2-detail-images{ display:flex; flex-direction:column; gap:8px; margin-bottom:16px; }
.v2-detail-img{ width:100%; border-radius:14px; display:block; }
.v2-detail-content{
  font-size:15px; line-height:1.8; color:#333; word-break:break-word;
  padding-bottom:20px; border-bottom:1px solid #f0f0f0; margin-bottom:8px;
}
.v2-like-wrap{ display:flex; justify-content:center; padding:16px 0; }
.v2-like-btn{
  display:inline-flex; align-items:center; gap:8px;
  height:44px; padding:0 28px; border-radius:999px; border:none;
  background:linear-gradient(135deg,#FF4D8D,#E91E8C); color:#fff;
  font-size:15px; font-weight:800; cursor:pointer;
  box-shadow:0 4px 16px rgba(255,77,141,0.35);
}
.v2-like-heart{ font-size:18px; }

/* --- 댓글 섹션 --- */
.v2-cmt-sec{ padding:0 16px 100px; }
.v2-cmt-head{ font-size:15px; font-weight:800; color:#111; padding:12px 0 8px; }
.v2-cmt-list{ list-style:none; padding:0; margin:0; }
.v2-cmt-card{
  display:flex; gap:10px; padding:12px 0;
  border-bottom:1px solid #f5f5f5;
}
.v2-cmt-avatar{
  width:34px; height:34px; border-radius:50%;
  background:linear-gradient(135deg,#FFE4EF,#ffd6e5); color:#E91E8C;
  display:flex; align-items:center; justify-content:center;
  font-size:14px; font-weight:800; flex-shrink:0;
}
.v2-cmt-avatar.sm{ width:26px; height:26px; font-size:11px; }
.v2-cmt-body{ flex:1; min-width:0; }
.v2-cmt-top{ display:flex; align-items:center; gap:6px; margin-bottom:4px; }
.v2-cmt-nick{ font-size:13px; font-weight:700; color:#111; }
.v2-cmt-time{ font-size:11px; color:#bbb; }
.v2-cmt-action{
  font-size:11px; border:none; background:none; color:#aaa; cursor:pointer; padding:0 2px;
}
.v2-cmt-action.danger{ color:#FF4D8D; }
.v2-cmt-text{ font-size:13.5px; color:#333; line-height:1.5; }
.v2-reply-list{ list-style:none; padding:8px 0 0; margin:0; }
.v2-reply-card{ display:flex; gap:8px; padding:8px 0; }
.v2-reply-composer{ margin-top:8px; }
.v2-reply-actions{ display:flex; justify-content:flex-end; gap:6px; margin-top:6px; }
.v2-submit-sm{
  height:28px; padding:0 14px; border-radius:999px; border:none;
  background:#FF4D8D; color:#fff; font-size:12px; font-weight:700; cursor:pointer;
}
.v2-field{
  width:100%; border:1px solid #eee; border-radius:10px; padding:8px 12px;
  font-size:13px; background:#fafafa; color:#111; resize:none;
}

/* --- 댓글 입력 (하단 고정) --- */
.v2-composer{
  position:sticky; bottom:0; z-index:3;
  display:flex; align-items:center; gap:8px;
  padding:10px 16px; background:#fff;
  border-top:1px solid #f0f0f0;
  padding-bottom:max(10px, env(safe-area-inset-bottom));
}
.v2-composer-input{
  flex:1; height:38px; border:1px solid #eee; border-radius:999px;
  padding:0 16px; font-size:13.5px; background:#f8f8f8; color:#111;
}
.v2-composer-input::placeholder{ color:#bbb; }
.v2-send-btn{
  width:38px; height:38px; border-radius:50%; border:none;
  background:#FFE4EF; display:flex; align-items:center; justify-content:center; cursor:pointer;
}

/* --- 글쓰기 모달 --- */
.v2-compose{
  max-height:calc(100vh - 60px); overflow:auto; border-radius:20px 20px 0 0;
  padding-bottom:max(16px, env(safe-area-inset-bottom));
}
.v2-handle{
  width:40px; height:4px; border-radius:2px; background:#ddd;
  margin:10px auto 6px;
}
.v2-compose-head{
  display:flex; align-items:center; justify-content:space-between;
  padding:8px 16px 12px;
}
.v2-compose-title{ font-size:18px; font-weight:900; color:#111; }
.v2-close{
  width:32px; height:32px; border-radius:50%; border:none;
  background:#f5f5f5; font-size:16px; color:#999; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
}
.v2-compose-cats{
  display:flex; gap:8px; padding:0 16px 12px; overflow-x:auto;
  -ms-overflow-style:none; scrollbar-width:none;
}
.v2-compose-cats::-webkit-scrollbar{ display:none; }
.v2-compose-user{
  display:flex; align-items:center; gap:10px; padding:0 16px 12px;
}
.v2-nick-input{
  flex:1; border:none; background:none; font-size:14px; color:#111; font-weight:600;
}
.v2-nick-input::placeholder{ color:#ccc; font-weight:400; }
.v2-compose-form{ padding:0 16px; }
.v2-title-input{
  width:100%; border:none; background:none; padding:8px 0;
  font-size:17px; font-weight:800; color:#111;
}
.v2-title-input::placeholder{ color:#ccc; font-weight:400; }
.v2-divider{ height:1px; background:#f0f0f0; margin:4px 0 8px; }
.v2-body-input{
  width:100%; border:none; background:none; padding:8px 0;
  font-size:14.5px; line-height:1.7; color:#333; resize:none;
}
.v2-body-input::placeholder{ color:#ccc; }
.v2-attach-preview{ display:flex; gap:8px; padding:8px 0; }
.v2-attach-thumb{
  width:56px; height:56px; border-radius:10px; object-fit:cover;
}
.v2-compose-toolbar{
  display:flex; align-items:center; gap:8px; padding:12px 0 8px;
  border-top:1px solid #f0f0f0; margin-top:8px;
}
.v2-tool-btn{
  border:none; background:none; font-size:14px; color:#888; cursor:pointer; padding:4px 6px;
}
.v2-char-count{ font-size:12px; color:#ccc; }
.v2-submit-btn{
  height:34px; padding:0 20px; border-radius:999px; border:none;
  background:linear-gradient(135deg,#FF4D8D,#E91E8C); color:#fff;
  font-size:13.5px; font-weight:700; cursor:pointer;
}

/* v2 시트 배경 흰색 */
.cat-sheet.v2{ background:#fff; }

</style>
