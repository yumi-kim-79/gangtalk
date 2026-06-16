# GangTalk 프로젝트 가이드

## 프로젝트 개요
- **앱 이름**: GangTalk (강톡)
- **목적**: 강남 지역 기반 로컬 커뮤니티 + 업체 디렉토리 + 채팅 + 포인트/티어 시스템
- **최종 목표**: 웹앱 → 구글플레이 + 애플 앱스토어 출시 (Capacitor 사용)

## 기술 스택
- **프론트엔드**: Vue 3 + Vite 7 (SPA/PWA, Node 20+ 필요)
- **백엔드**: Firebase (Firestore, Auth, Functions, Hosting)
- **앱 변환**: Capacitor (예정)
- **부가 도구**: GangTalkMacro (Python - 카카오톡 매크로)

## 빌드 & 배포
```bash
nvm use 20
npm run build
firebase deploy --only hosting
```

## 공통 스타일 기준 (전사 통일)
- **헤더 + 검색창은 `src/components/common/AppHeader.vue` 공통 컴포넌트 사용으로 단일화.**
  - 모든 페이지가 `<AppHeader v-model="검색어" @search="..." @filter-click="..." />` 형태로 사용
  - props: `modelValue` / `searchPlaceholder` / `showSearch`
  - emits: `update:modelValue` / `search` / `filterClick`
  - 헤더 = 로고(48×48) + 타이틀(핑크 20px) + 서브(회색 12px) + 알림벨 + 햄버거 카드 드롭다운
  - 검색창 = 돋보기 + input + 필터 SVG, height 48, radius 14, `box-shadow:0 2px 10px`
  - 햄버거 메뉴: 일정/달력 · 고객센터 · 즐겨찾기 · 로그인/로그아웃 (Firebase signOut)
- **고정 높이/패딩 토큰** (App.vue `<style>` 전역, 페이지 전환 시 점프 방지):
  - `--app-header-height: 64px;`
  - `--app-search-height: 48px;`
  - `--app-header-total:  130px;`
  - `--page-h-pad:        16px;` — **모든 페이지의 좌우 패딩은 `.page` (또는 `.wrap`) 에서 이 변수로 단일 적용**. 자식(AppHeader, 섹션 카드)은 자체 좌우 마진/패딩을 두지 않음.
- **카테고리 탭**은 페이지마다 데이터/로직이 달라 컴포넌트화하지 않음. 단 마크업·CSS 톤은 MainPage `mp-cat` 기준을 따른다 (페이지별 `sf-*` 등 prefix만 변경, 값은 동일).
- 페이지 고유 섹션(실시간 순위, 광고 배너, Top5 등)은 그대로 유지하되 헤더·검색은 반드시 AppHeader 사용.

## 작업 규칙 (반드시 준수)

### 시작할 때
1. 이 파일(CLAUDE.md)을 반드시 먼저 읽는다
2. `## 현재 상태`와 `## 작업 로그`를 확인해서 이전 작업 흐름을 파악한다
3. 작업 시작 전 현재 상태를 요약해서 사용자에게 보고한다

### 작업 중
1. 파일 수정 전 반드시 기존 코드를 읽고 이해한다
2. 한 번에 너무 많은 파일을 수정하지 않는다
3. 수정 이유를 간단히 설명하고 진행한다

### 작업 후
1. 작업이 끝나면 `## 작업 로그`에 날짜/내용/결과를 기록한다
2. `## 현재 상태`를 최신 상태로 업데이트한다
3. 다음에 해야 할 일을 `## 다음 작업`에 명시한다

---

## 현재 상태
- [ ] 웹앱 완성도 점검
- [ ] Capacitor 설치 및 설정
- [ ] Android 빌드 테스트
- [ ] iOS 빌드 테스트
- [ ] 구글플레이 등록
- [ ] 애플 앱스토어 등록

**현재 단계**: 도메인 분리 2단계 완료 — `/admin/*` 임시 라우트 + 전용 페이지 6개 구축 (`gangtalk815@gmail.com` 만 접근). 향후 `gangtalk815.com` 으로 도메인 분리 시 그대로 이전 가능.

---

## 다음 작업
1. **도메인 분리 3단계** — gangtalk815.com 별도 호스팅 분리
   - 별도 Vite entry 또는 모노레포 셋업 (admin 만 빌드)
   - Firebase Hosting 사이트 2개 (gangtox / gangtalk815)
   - Firestore Security Rules: `config/marketing`, `adminInbox`, `stores`(write) 는 admin 도메인 만 허용
   - Storage Rules: `marketing/adBanners*` 는 admin 만 쓰기
2. 관리자 페이지 보강 (필요 시)
   - 게시판 모더레이션 (board_posts 삭제/공지 고정) — `useMyPageCore` 에 함수 보존됨
   - 포인트 수동 지급 / 등급 수동 조정 UI
   - 배너 태그(tagPos) 드래그 편집 — 기존 AdminTools.vue 코드 재활용
3. 일반 사용자용 알림 컬렉션(user_inbox 등) 신설 검토 — 현재는 관리자 전용
3. 핫이슈 텍스트를 Firestore config에서 가져오도록 연동
4. 별점/리뷰 카운트 실제 데이터 연동
5. 힐링톡/우리가게/이벤트톡 실 서비스 오픈 (오픈 시 gc-disabled 제거 + 클릭 핸들러 부착)
6. CompanySection / AdminTools / ProfileEditSheet 톤도 동일하게 정리
7. Capacitor 적용 전 웹앱 완성도 점검
8. 이벤트 진행 시 `EVENT_OVERLAY_ENABLED = true` 로 복귀

---

## 작업 로그

### 2026-06-16: 도메인 분리 2단계 — 관리자 페이지 `/admin/*` 구축 (`feat/admin-pages`)
- **목적**: 향후 `gangtalk815.com` 으로 분리할 관리자 사이트의 페이지 6종 + 공통 레이아웃을 같은 코드베이스 안에 임시 구축. 라우터 가드(`gangtalk815@gmail.com` 만 통과)로 일반 회원 접근 차단
- **신규 파일**:
  - `src/layouts/AdminLayout.vue` — 핑크 그라디언트 상단바 + 좌측 사이드바(6 메뉴 + gangtox 바로가기 + 로그아웃) + 모바일 햄버거 드로어
  - `src/pages/admin/DashboardPage.vue` — 통계 카드 4개(노출 업소·Top5·활성 배너·승인 대기) + 최근 메시지 5건
  - `src/pages/admin/StoresManagePage.vue` — 3 탭
    - **노출 업소 관리**: `stores` 승인 업소 리스트 + `exposure.gangtalk` 토글 스위치 + 드래그 정렬 → `config/marketing.homeOrder` 저장
    - **수동 지표 업데이트**: 노출 업소별 `match` / `persons` / `wifi` 일괄 편집 → `stores/{id}` + `rooms_biz/{id}` 양방향 동기 (`needRooms / needPeople / need / totalNeeded / totalRooms / wifi`)
    - **승인 대기**: `applyStatus === 'pending'` 목록 + 승인(approved=true, applyStatus='approved', exposure.gangtalk=true) / 거절 버튼
  - `src/pages/admin/Top5ManagePage.vue` — 9개 카테고리 탭(하퍼/쩜오/텐카페/텐프로/바/일프로/노래방/가라오케/기타) + 드래그 정렬 + 검색 모달에서 업소 추가 + 제거 → `config/marketing.topRanks` 저장
  - `src/pages/admin/BannersManagePage.vue` — F(가게찾기) / P(제휴관) 두 그룹 탭 + 이미지 업로드(Firebase Storage `marketing/adBanners{Finder|P}/{ts}_{rand}.{ext}`) + 제목/설명/링크/배경색 편집 + 드래그 정렬 + 삭제 → `config/marketing/adBanners{Finder|P}/prod.adBanners` + 루트 `config/marketing.adBanners{Finder|P}` 인덱스 동시 저장
  - `src/pages/admin/NewsManagePage.vue` — 한줄 뉴스 CRUD (텍스트 + NEW 뱃지 + 위/아래 이동) → `config/marketing.newsline` 저장
  - `src/pages/admin/InboxPage.vue` — `adminInbox` 200건 리스트 + 클릭 토글 읽음 + 모두 읽음 처리
- **라우터** (`src/router/index.js`):
  - `/admin` (AdminLayout) 부모 라우트 + 6개 자식 (`/admin/dashboard|stores|top5|banners|news|inbox`) 추가
  - 모든 `/admin/*` 에 `meta.requiresAdmin: true`
  - `beforeEach` 6번째 단계: `requiresAdmin` 매칭 시 ① 비로그인 → `/auth` ② 로그인했지만 이메일 ≠ `gangtalk815@gmail.com` → `/`
- **저장 패턴 일관성**: 모든 페이지가 기존 사용자 페이지(`MainPage.vue` `saveOrders`, `StoreFinder.vue` `saveTopRanksNow`, `AdminTools.vue` 배너/뉴스)와 동일한 Firestore 경로/필드를 사용 → 회원 사이트 읽기 호환성 100% 유지
- **AdminLayout 다크모드 + 모바일 반응형**: 데스크탑 240px 고정 사이드바, 모바일 햄버거 드로어(80% 너비, backdrop 클릭으로 닫힘)
- **재사용한 기존 코드 패턴**:
  - `MainPage.vue:1606` `ADMIN_EMAIL = 'gangtalk815@gmail.com'`
  - `MainPage.vue:1791-1807` `saveOrders` → StoresManagePage 탭 1
  - `StoreFinder.vue:1533-1553` `saveTopRanksNow` → Top5ManagePage
  - `AdminTools.vue:372-510` 배너 저장 로직 → BannersManagePage (slim 인덱스 + fixed prod doc)
  - `useMyPageCore.js:1196-1217` `saveNewsline` → NewsManagePage
  - `AdminNotifyBell.vue` adminInbox 구독 → InboxPage

### 2026-06-16: AuthPage 여성회원 전용 정리 (`fix/authpage-female-only`)
- **목적**: 1단계 후속 — gangtox.com 회원가입 화면에서 기업/관리자 유형을 숨겨 일반 사용자가 여성회원으로만 가입하도록 유도
- **마크업** (`src/pages/AuthPage.vue`):
  - 회원유형 탭 "기업회원(가게찾기)" 버튼에 `v-if="false"` 추가 (`:42`)
  - 회원유형 탭 "관리자회원(제휴관)" 버튼에 `v-if="false"` 추가 (`:51`)
  - 가입폼 업체명/사업자등록번호/주소 입력 `<template>` 의 조건을 `v-if="who === 'biz' || who === 'admin'"` → `v-if="false && (who === 'biz' || who === 'admin')"` 로 변경
- **스크립트** (`:290`):
  - `who` 기본값을 `route.query.who` 기반 분기 → 항상 `'user'` 로 고정
  - 원본 분기 로직은 주석으로 보존 — 2단계 admin 도메인 신설 시 `false &&` / 주석 / `v-if="false"` 만 제거하면 즉시 복귀
- **로그인 폼은 변경 없음**: `who === 'biz' / 'admin'` 분기 (`onLogin` 함수) 가 이미 `who.value === 'user'` 기본값에서 자연스럽게 여성회원 경로로 흐름. 관리자 본인이 직접 가입한 계정으로 로그인하면 백엔드 role-mismatch 응답이 그대로 안내됨
- **보존되는 코드**: `signupBiz / signupAdmin`, `loginBiz / loginAdmin`, `storeName / businessNo / address` ref, role-mismatch 메시지 분기 — 모두 2단계 admin 도메인으로 그대로 이전 예정

### 2026-06-16: 도메인 분리 1단계 — gangtox.com 여성회원 전용 정리 (`refactor/remove-admin-from-user-site`)
- **목적**: 전체 프로젝트를 gangtox.com (여성회원) + gangtalk815.com (관리자/업체) 두 도메인으로 분리. 1단계는 회원 사이트에서 관리자 UI 만 숨기고 코드는 보존 (2단계에서 `/admin/*` 라우트로 이전)
- **패턴**: 모든 변경은 `v-if="false && (기존조건)"` 형태로 통일 — 2단계 복원 시 `false &&` 만 제거하면 원래 동작 복귀
- **MyPage.vue** (`:72`):
  - 운영자 전용 섹션 (`<section v-if="isAdmin">`) → `v-if="false && isAdmin"` — BizManagerTabs + AdminTools 통째로 차단
  - AdminNotifyBell import 는 이전부터 제거되어 있어 추가 작업 없음
- **AppHeader.vue** (`:171-188`):
  - `watch(currentUser, watchAdmin)` 호출 블록 주석 처리 → `admins/{uid}` 와 `adminInbox` 구독 더 이상 시작 안 함
  - `notifBadge` computed 를 `() => 0` 으로 교체 (원본은 주석 보존) — 알림벨 뱃지 항상 0
- **StoreFinder.vue** 6곳:
  - `:50` 배너 등록 CTA (원조건 `isEnterprise`)
  - `:157` 인기 순위 편집 툴바 (원조건 `canEdit`)
  - `:202` Top5 등록 버튼 (원조건 `isEnterprise`)
  - `:247` 드래그 핸들 (원조건 `canEdit && editMode`)
  - `:254` 하단 순서 편집 섹션 (원조건 `canEdit && editMode`)
  - `:292` 일반등록 버튼 (원조건 `isEnterprise`)
- **PartnersPage.vue** 4곳:
  - `:18` 배너 등록 CTA (원조건 `isEnterprise || canEdit`)
  - `:117` 현황판 순서 편집 툴바 (원조건 `canEdit`)
  - `:145` Top5 등록 버튼 (원조건 `isEnterprise || canEdit`)
  - `:191` 일반등록 버튼 (원조건 `isEnterprise || canEdit`)
- **GangTalkPage.vue** 5곳:
  - `:227, :252` 강톡 공지 카드/게시글 카드의 관리자 수정/삭제 버튼 (원조건 `isAdmin`)
  - `:299, :323` 힐링톡 공지/게시글 카드 동일 (원조건 `isAdmin`)
  - `:2307` 글쓰기 모달의 `composeCats` 에서 '공지' 카테고리 prepend 차단 (원조건 `isAdmin.value`)
  - 게시글/댓글 삭제/공지 작성 같은 **함수 자체는 유지** — 어차피 트리거 UI 가 숨겨져 호출 불가, 2단계에서 그대로 admin 페이지로 이전
- **router/index.js** (`:459`):
  - `requiredRole === 'admin'` 분기를 `/auth` 리다이렉트 → `/` (대시보드) 리다이렉트 로 변경
  - 원본 코드는 같은 블록에 주석으로 보존
  - 현재 코드베이스에 `meta.role === 'admin'` 라우트는 없음 (방어적 차단)
- **보존되는 코드**: `isAdmin / canEdit / isEnterprise` ref/computed, admin 데이터 구독 로직 (`useMyPageCore.js` 의 watchAdminDoc), AdminTools / AdminPendingLists / BizManagerTabs 컴포넌트 자체 — 모두 2단계에서 admin 도메인으로 그대로 이동 예정

### 2026-05-17: EventOverlay 임시 비활성화 (`feat/disable-event-overlay`)
- **MainPage.vue 마크업**: `<EventOverlay v-if="showEvent">` → `v-if="showEvent && EVENT_OVERLAY_ENABLED"`
- **상수 추가**: `const EVENT_OVERLAY_ENABLED = false` (스크립트, showEvent 정의 직전)
- **코드 보존**: 컴포넌트 (`src/components/EventOverlay.vue`), 상태 (`showEvent`, `decideShowEvent`, `openEventSafely`, `onCloseEvent`, `onDismissDay`, `EVENT_ENABLED`, `EVENT_KEY`, `EVENT_SESSION_KEY`, `EVENT_IMAGE`, `isHiddenByUser`) 전부 그대로 — 재활성화 시 추가 작업 없이 스위치 true 만 변경
- **CLAUDE.md "활성/비활성 스위치 메모" 섹션 추가**: 활성화 방법 / 위치 / 보존된 코드 명시

### 2026-05-15: 배너 로딩 지연 및 버벅거림 6가지 원인 수정 (`perf/banner-loading-optimization`)
1. **`useMarketingBanners` 단일 소스화 + getDownloadURL 캐시**:
   - 모듈 스코프 `const urlCache = new Map()` 추가, `resolveImg(gs://)` 가 캐시 우선 조회 → 같은 URL 의 토큰 재발급 차단
   - fixedDoc 1개만 onSnapshot 유지, subcoll/rootDoc 폴백은 `getDocs`/`getDoc` 1회로 변경 → 동시 onSnapshot 3개 → 1개
2. **PartnersPage `loadPartners` 중복 호출 차단**:
   - `let _lastAuthUid = null` 가드 추가
   - onMounted 초기 로드 후 `onAuthStateChanged` 콜백은 uid 변경 시에만 재로드 → 200개 partners 가 1회로 단축
3. **StoreFinder stores/rooms_biz `limit(100)` 추가**:
   - 기존 무제한 onSnapshot → 100개로 한정 → 초기 진입 데이터/네트워크 부담 ↓
4. **`v-lazy-bg` 커스텀 디렉티브 신규** (`src/directives/lazyBg.js`):
   - IntersectionObserver(rootMargin: 100px) 로 viewport 진입 시에만 `background-image` 설정
   - `main.js` 에서 `app.directive('lazy-bg', lazyBg)` 등록
   - StoreFinder `.m-thumb` + PartnersPage `.rs-thumb` 에 `v-lazy-bg="thumbUrl"` 적용 → 화면 밖 Top5 카드 썸네일 즉시 다운로드 차단
5. **첫 배너 이미지 preload `<teleport to="head">`**:
   - StoreFinder/PartnersPage 에 `firstBannerUrl` computed 추가
   - `<link rel="preload" as="image" :href="firstBannerUrl">` 가 데이터 준비되면 head 에 자동 삽입 → 첫 페인트 직후 즉시 표시 가능
6. **PartnersPage onMounted 우선순위 조정**:
   - `bindRatingEvents(true)` 를 `requestIdleCallback` (폴백 setTimeout) 으로 지연 → 첫 페인트 부담 ↓

### 2026-05-15: 자동 글 시더 완전 삭제 + 전체 성능 최적화 (`perf/remove-autoseed-and-optimize`)

#### 작업 1: 자동 글 시더 완전 삭제
- **GangTalkPage.vue 마크업**: 카테고리/힐링 시트 헤더의 "자동글 ON/OFF" 버튼 2곳 제거
- **GangTalkPage.vue 스크립트** 일괄 삭제:
  - `import { CATEGORY_TEMPLATES, BOT_NAMES } from '@/data/sim-templates'`
  - `import { nanoid } from 'nanoid'`
  - `const AUTO_SEED = ref(...)`, `let seedTimer = null`, `watch(AUTO_SEED, ...)`
  - `toggleAutoSeed / startAutoSeed / stopAutoSeed / seedLoop / seedPost / seedComment`
  - `pickTemplate / pickVoteAB / makeSeedId / tryAcquireLock / heartbeat / randPick / randDelayMs`
  - `SEED_CATS / SEED_LOCK_KEY` 상수
  - 자동 시더 전용 `onMounted` (userEmail 갱신은 기존 다른 onMounted 에 이미 존재 → 정상)
  - `onBeforeUnmount(() => stopAutoSeed())` 제거
  - `console.log('[sim-templates] ...')` 제거
- **`src/data/sim-templates.js` 파일 삭제** (1350라인)
- localStorage 키 `gt_auto_seed / gt_seed_lock` 더 이상 쓰지 않음 (기존 값은 그대로 남되 무해)

#### 작업 2: 전체 성능 최적화
- **`vite.config.js` Firebase 청크 5분할**:
  - 이전: `firebase` 단일 833KB
  - 이후: `firebase-firestore` 397KB · `firebase-auth` 205KB · `firebase-core` 137KB · `firebase-storage` 43KB · `firebase-extras` 32KB · `firebase-functions` 18KB
  - 페이지가 실제 필요로 하는 모듈만 로드 → 초기 진입 부담 ↓
- **`index` 번들**: 261KB → **212KB** (-19%) — sim-templates 1350라인 + 자동 시더 200라인 + nanoid 의존성 제거 효과
- **`StoreFinder.vue`** 배너 `<img>` 에 `loading="lazy" + decoding="async"` 추가
- **이미지 lazy loading 점검**: GangTalkPage `pc-thumb / v2-pc-thumb / v2-detail-img / gt-slide-img` 이미 적용됨, PartnersPage `banner-img` 이미 적용됨
- **리스너 점검**: 모든 페이지(MainPage / StoreFinder / PartnersPage / GangTalkPage / AppHeader) 가 `onUnmounted` 또는 `onBeforeUnmount` 에서 unsubscribe 정상 처리 중 — 추가 누수 없음

### 2026-05-15: 강톡 카테고리/상세 시트 CSS 변수 미정의 멈춤 수정 (`fix/gangtalk-sheet-mask-top`)
- **원인 (진짜 멈춤 범인)**: `.cat-mask` 와 `.detail-mask` 의 `top: var(--gt-topbar-h)` 가 미정의 변수 참조
  - 이전 `feat/gangtalk-page-redesign-v2` 작업에서 루트 클래스를 `<section class="wrap compact">` → `<main class="page gt-page">` 로 변경하면서 `.wrap.compact` 안에 있던 `--gt-topbar-h: 0px` 정의가 함께 사라짐
  - `var(--gt-topbar-h)` 가 미정의 → CSS spec 상 invalid → `top` 속성 무효화 → `top: auto` 기본값 → `position: fixed` 풀스크린 시트가 viewport 상단을 기준으로 위치를 잡지 못해 비정상 표시 → 사용자에게 "멈춤"으로 인식
- **수정**:
  - `.cat-mask top: var(--gt-topbar-h) → top: 0`
  - `.detail-mask top: var(--gt-topbar-h) → top: 0`
  - `.gt-page` 에 안전망으로 `--gt-topbar-h: 0px` + `--gt-ad-h: 0px` 변수 정의 (자식 컴포넌트가 참조해도 안전하도록)
- **다른 mask 클래스 점검**: `.chat-mask`, `.ref-mask`, `.healing-mask` 는 CSS 룰 자체 없음 (마크업만 존재) → 영향 없음. `.sheet-backdrop` 은 `var(--gt-topbar-h)` 미사용

### 2026-05-15: 강톡 카드 클릭 멈춤 차단 + 3개 카드 클릭 비활성 (`fix/gangtalk-community-click`)
- **원인 진단 — 강톡 카드 클릭 시 화면 멈춤**:
  - `openCategoryPage('all')` 함수 자체는 정상
  - 원인은 함수 안에서 호출하는 `startListTicker(...)`. 이 ticker 는 `setTimeout` 으로 `updateDoc(board_posts/{id}, { views: increment(1), likes: increment(1), updatedAt: serverTimestamp() })` 를 반복 호출
  - board_posts 의 write 권한이 없는 **일반 사용자**가 카드 클릭 시 Firestore Security Rules 가 매번 거부 → 콘솔 에러 폭주 + 응답성 저하 → 사용자 입장에서 "멈춤"으로 인식
  - 활동성 시뮬레이션 목적인 ticker 는 관리자에게만 의미가 있으므로 가드 추가
- **수정 1 (`startListTicker`)**: 함수 진입부에 `if (!isAdmin.value) return` 가드 → 일반 사용자/비로그인 사용자에게는 ticker 시작 안 함
- **수정 2 (3개 카드 클릭 비활성화)**:
  - 마크업 `<button @click="openHealing">` / `<button @click="openFirstBiz">` / `<button @click="openCategoryPage('event')">` → 클릭 핸들러 제거하고 `<div class="gc-card ... gc-disabled" aria-disabled="true">` 로 교체
  - CSS `.gc-card.gc-disabled { cursor: default }`, `.gc-card.gc-disabled:active { transform: none }` 추가
  - 클릭해도 토스트 없이 완전 무반응 (서비스 준비중 pill 만 시각적으로 안내)
- **강톡 카드**는 그대로 유지 — 클릭 시 정상적으로 카테고리 풀스크린 시트 진입

### 2026-05-15: 마이페이지 포인트 잘림 + 추천코드 정렬 수정 (`fix/mypage-points-referral-layout`)
- **문제 1 — 보유 포인트 상단 잘림** 원인: `.row:first-of-type { padding-top: 6px }` 가 다른 행 14 보다 부족해 첫 행이 비좁게 잘려 보임
  - `.profile-card padding: 20px → 24px 20px` (상단 여유 +4)
  - `.rows margin: 16px → 20px` (프로필↔행 간격 +4)
  - `.row:first-of-type padding-top: 6px → 14px` (다른 행과 동일)
- **문제 2 — 내 추천코드 버튼 정렬**: 단일 row 안에 코드+복사+추천인보기 가로 3개라 좁은 화면에서 어색
  - 마크업을 `<li class="row row-stack ref-row">` 세로 3행으로 변경
    1. `.key` 레이블 (좌)
    2. `.ref-code-row` = `<code class="ref-code-box">` (flex:1, 핑크 테두리, monospace) + `<button class="ref-copy-btn">` (40×40 아이콘 SVG 복사)
    3. `<button class="ref-show-link">내 추천인 보기 ›</button>` (우측 정렬, 핑크 텍스트 링크, white-space:nowrap)
  - `.row-stack { display:flex; flex-direction:column; align-items:stretch; gap:10px }`
  - 다크모드 보정 추가

### 2026-05-15: 마이페이지 심플 디자인 개편 (`feat/mypage-redesign`)
- **MyPage.vue**:
  - `<AdminNotifyBell v-if="isAdmin" />` 마운트 + import 제거 (AppHeader 알림벨과 중복)
  - HeaderBar 감싸는 `<section>` flex 컨테이너 제거 → `<HeaderBar>` 단독 배치
  - `.page-flat.mypage-page` 배경 `#fdf8fa` 강제, 섹션 간 `margin: 0 0 16px` 일괄
- **HeaderBar.vue 전면 교체**:
  - `<h2>여성회원</h2>` → `.member-pill` 핑크 그라디언트 pill 뱃지 (`data-type="company"` 시 보라 그라디언트)
  - `<button class="btn">프로필 수정</button>` → 36×36 원형 아이콘 버튼(연필 SVG)
  - `<button class="btn">로그아웃</button>` → 회색 텍스트 링크 (`#999`, hover 핑크)
- **UserSection.vue 디자인 톤 업**:
  - 카드 공통: `background:#fff; border-radius:16; box-shadow:0 4px 16px rgba(0,0,0,.05); border:none`
  - 프로필 카드: padding 20, 아바타 원형 56, 닉 17/900 / 이메일 12/회색
  - 행 구분: `dashed var(--line)` → `1px solid #f3f3f5`, 라벨 13/500 회색, 값 14
  - 포인트 행 값을 핑크(`#ff4d8d`) 800 강조
  - 추천코드 박스: `font-family:monospace; padding:4 10; border:1.5px solid #ffd6e4; background:#fff5f8; color:#ff4d8d; border-radius:10`
  - 보조 버튼: 28px 둥근 알약, hover 시 핑크 테두리
  - **추천 리워드 promo 카드**: 연핑크 `#FFE4EF` 배경 + soft shadow, 핵심 텍스트 핑크 강조, 흰색 둥근 알약 CTA
  - **"내 글/댓글 관리" 타일** → 메뉴 카드 (`📝 + 텍스트 + 화살표`) 패턴. 펼침 시 화살표 90° 회전
- **결과**: 마이페이지 전체가 다른 페이지(#fdf8fa 배경 + 흰 카드 + 핑크 포인트) 와 일관된 톤

### 2026-05-15: AppHeader 알림벨 실제 알림 기능 연결 (`fix/appheader-notif-bell`)
- **AppHeader 알림벨** 의 `notifBadge = ref(3)` 하드코딩 제거 → 실제 Firestore `adminInbox` 연동
  - `currentUser` (auth watch) 변화 시 `admins/{uid}` 문서 존재 여부 구독 → `isAdmin`
  - `isAdmin === true` 일 때만 `adminInbox.where('unread','==',true).orderBy('createdAt','desc').limit(50)` 구독 → `unreadCount`
  - `notifBadge` computed: 비로그인 0 / 비관리자 0 / 관리자 = `unreadCount`
  - 클릭 시 관리자면 `markAllRead()` (미읽음 25건 batch `updateDoc unread:false, readAt: serverTimestamp()`) 후 `router.push('/mypage?view=apps')`. 비관리자/비로그인은 그냥 `/mypage` 이동
- **자원 정리**: `onBeforeUnmount` 에서 admin/inbox watch 모두 해제
- **참고**: 현재 일반 사용자용 알림 컬렉션이 없어(`user_inbox` 등 미존재) 비관리자 뱃지는 0. 향후 신설 시 같은 자리에서 분기만 추가하면 됨
- **로그인 여부 분기**: 뱃지 자체가 `notifBadge > 0` 일 때만 표시되므로 비로그인 시 자동으로 안 보임 (`v-if="notifBadge > 0"`)
- **레거시 컴포넌트**: `AdminNotifyBell.vue` / `BellButton.vue` 는 별도 사용처에서 그대로 동작 (이번 변경 없음)

### 2026-05-14: 마이페이지 상단 AppHeader 적용 (`feat/mypage-appheader`)
- **App.vue `hideTopBar`** 에 `'mypage'` 라우트 추가 → 마이페이지 진입 시 TopBar 자동 숨김
- **MyPage.vue**: `import AppHeader from '@/components/common/AppHeader.vue'` 추가
- 루트 `<main class="page-flat">` → `<main class="page-flat mypage-page">` 로 식별 클래스 추가
- 헤더 위치에 `<AppHeader :show-search="false" />` 삽입 (검색창 없이 헤더만)
- **`.page-flat.mypage-page` 룰**: `padding-top: 0 + padding-left/right: max(var(--page-h-pad, 16px), env(...))` 강제로 외부 `mypage.css` 의 `.page-flat{ padding:12px 16px 96px }` 좌우 16 을 var 로 통일 (하단 96 은 그대로)
- 기존 달력/헤드폰/하트/다크모드 버튼은 AppHeader 햄버거 카드 드롭다운에 포함되어 있어 별도 추가 없음
- **결과**: 5개 바텀탭 모두 동일한 AppHeader + `--page-h-pad: 16px` 사용. TopBar 의존 페이지 0개

### 2026-05-14: 검색창 input 스타일 페이지 통일 (`fix/mainpage-search-input-style`)
- **원인 진단**: MainPage `:deep(input[type="search"])` 룰이 `font-size:16px !important; font-weight:300 !important;` + placeholder opacity 0.65 로 AppHeader 의 `.app-search-input` (font-size:14, weight:500) 을 덮어써 현황판에서만 검색창 글씨가 다르게 보였음
- **MainPage**: 검색창 input 강제 룰 (`:deep(input[type="search"]), :deep(.search-input), :deep(.searchbar input), :deep(.search input[type="text"])` + placeholder 변종 4개) 일괄 삭제
- **StoreFinder**: 동일한 deadcode `.search-wrap :deep(input)` 룰 삭제 (AppHeader 마이그레이션 후 `.search-wrap` 마크업 자체가 없어 매칭 안 됐지만 향후 오염 차단)
- **AppHeader**: `.app-search-input` 톤 단일 강제 (`!important`)
  - `font-size: 15px`
  - `color: var(--fg, #333)`
  - `font-weight: 500`
  - `line-height: 1.2`
  - placeholder: `color: #aaa; font-weight: 400; font-size: 15px; opacity: 1`
- **결과**: 4개 탭(현황판/가게찾기/강톡 검색창은 비노출/제휴관) 검색창 글씨가 모두 동일한 톤

### 2026-05-14: 검색창 placeholder 전 페이지 통일 (`fix/search-placeholder-unify`)
- **AppHeader 기본값 유지**: `searchPlaceholder: { default: '업체명, 지역, 업종을 검색해보세요' }` (이미 통일된 상태)
- **PartnersPage**: `<AppHeader :search-placeholder="searchPH">` → prop 제거 → 기본값 사용. `const searchPH = '시술명, 시술부위, 이벤트를 입력해 보세요.'` 상수 삭제
- **StoreFinder**: AppHeader 에는 placeholder prop 을 전달 안 했었지만, 옛 SearchBar 시절 유산인 `const searchPlaceholder = '업체명, 담당자명을 입력해 보세요.'` 잔존 상수 삭제 (deadcode 제거)
- **MainPage**: 변경 없음 (이미 기본값 사용 중)
- **GangTalkPage**: `<AppHeader :show-search="false">` 라 검색창 비노출, 무관
- **결과**: 4개 탭(현황판/가게찾기/강톡/제휴관) 의 검색창이 모두 동일 placeholder 사용

### 2026-05-14: 제휴관 가게찾기 스타일로 통일 + 실시간순위 제거 (`feat/partners-redesign`)
- **App.vue `hideTopBar`** 에 `'partners'` 라우트 추가 → 제휴관 진입 시 TopBar 자동 숨김
- **`<AppHeader>` 적용**: 기존 `<section class="top"><SearchBar>` + 티커 마크업 전체 제거 → `<AppHeader v-model="q" :search-placeholder="searchPH" @search="doSearch" @filter-click="openFilter" />`
- **실시간 순위 티커 제거**: `.hot-box / .hot-ticker / .ticker-list / .ticker-item / .ticker-window` 마크업·CSS 전부 제거
- **티커 JS 정리**: `loopedRanks / displayRank / tickerWinRef / tickerItemH / tickerIndex / useTransition / tickerMs / measureTickerItemH / tickerStyle / tickerTimer / startTicker / onMounted+onUnmounted (티커용)` 전부 삭제
- **`hotRanks10 / hotSheet / openHotSheet / closeHotSheet / openPartnerFromHot / openHotDetail` 유지** — Top10 바텀시트는 그대로
- **`openFilter` 신규** (`cat='all'` 리셋) — AppHeader 의 필터 버튼 이벤트 핸들러
- **`.page` 패딩**: `8px 12px 92px` → `padding-top:0 + padding-left/right: max(var(--page-h-pad,16), env(...))` + bottom 유지
- **카테고리 (`sf-cat-scroll` 톤)**: `<section class="cats pp-cat">` + `<div class="cat-grid pp-cat-scroll">`, 기존 PNG 아이콘 유지 (`.cat-icon`) but 원형 컨테이너(`.cat-ico-circle` 48×48) 안에 포함, 가로 스크롤 1줄, active 시 핑크 그라디언트 + 흰 텍스트 (PNG 아이콘에 `filter: brightness(0) invert(1)`)
- **지역 드롭다운**: `.region-cat` 카테고리 첫 칸에 유지, 라벨 `{지역명} 🔽` 으로 통일
- **배너 (`sf-banners` 톤)**: `<section class="banners pp-banners">` + 핑크 인디케이터 3점 (active 시 18px pill)
- **Top5 (`sf-tops` 톤)**: 섹션 헤더 `<strong class="pp-top-ttl"><span class="spark">✨</span> {label} Top 5</strong>` + "더보기 ›" 버튼, 카드 `min-width:200, radius:14, shadow, thumb height:140, name 16/800, sub 12 muted, price 14/900 #ff2e7e`
- **List Head (`sf-list-head` 톤)**: `padding:8px 0`, 카운트/등록 버튼 정렬
- **다크모드 보정** 추가: `.pp-cat-scroll .cat-ico-circle`, `.pp-top-sec .rs-card` 다크 surface

### 2026-05-14: 배너 상단 여백 + 강톡 카드 연보라 (`fix/gangtalk-spacing-color`)
- **`.gt-slider-bar margin-top: 0 → 8px`**: AppHeader 와 배너 사이에 작은 숨 공간 확보
- **강톡 카드 배경**: `#1a1a2e` (진한 네이비) → `#7C6B9E` (연보라). 흰 텍스트/우하단 화살표는 유지

### 2026-05-14: 강톡 카드 정리 + 헤더-배너 간격 제거 (`fix/gangtalk-card-and-spacing`)
- **AppHeader `showSearch=false` 모드 보강**: 검색창 없는 페이지에서 wrap min-height 가 130 으로 남아 헤더 아래 공백이 컸음
  - `.app-header-wrap.no-search { min-height: var(--app-header-height, 64px) }` 헤더만 차지
  - `.app-header.no-search { padding-bottom: 0 }` 하단 패딩 제거
  - 템플릿에서 `:class="{ 'no-search': !showSearch }"` 토글
- **강톡 카드**: 배경 이미지 + 오버레이 제거, 솔리드 `#1a1a2e` 배경 + 흰색 텍스트 + 우하단 화살표만 유지
- **힐링톡 카드**: 배경 이미지 + 강한 오버레이 제거, 솔리드 `#FFF0F5` 배경 + 핑크 텍스트 + 서비스 준비중 pill
- **4개 카드 모두 좌상단 핑크 사각 아이콘 뱃지 완전 제거** (`.gc-badge` 마크업/CSS 삭제)
- **배경 이미지 관련 CSS 정리**: `.gc-bg-img / .gc-overlay / .gc-overlay--strong / .gc-badge` 룰 전부 제거
- **`.gt-slider-bar margin-top: 0`** 명시로 AppHeader 바로 아래 배너가 붙도록 보장
- **preload 태그 제거**: `<teleport to="head">` 의 `cat-gangtok.jpg / cat-healing.jpg` 프리로드 모두 제거 (더 이상 사용 안 함)

### 2026-05-14: 강톡 탭 AppHeader + 실사 배너 + 커뮤니티 카드 개편 v2 (`feat/gangtalk-page-redesign-v2`)
- **App.vue `hideTopBar`** 에 `'gangtalk' / 'chat'` 라우트 추가 → 강톡 탭 진입 시 전역 TopBar 숨김
- **GangTalkPage 헤더 적용**:
  - 자체 헤더 없이 TopBar 의존하던 구조 → `<AppHeader :show-search="false" />` 사용 (검색창 미노출)
  - 루트 `<section class="wrap compact">` → `<main class="page gt-page">` 로 교체
  - `.wrap.compact { margin-top: var(--gt-topbar-h, 56px) }` 제거 (TopBar 없으니 불필요)
  - `.gt-page` 좌우 패딩 `var(--page-h-pad)` 적용 — 전 페이지 일관성
- **광고 배너 슬라이더**: REJURAN 스타일 CSS 그라디언트 → **실사 이미지 슬라이더**
  - `sliderItems` 데이터: `{ theme/logo/brand/tagline/circleColor }` → `{ image: '/img/banners/banner-01~03.png' }`
  - 마크업: `<div class="slide-content">` + `<div class="slide-circle">` → `<img class="gt-slide-img" object-fit:cover>`
  - 높이 200 → 180, radius 16
  - **좌하단 카운트 인디케이터**: `<div class="gt-slider-count">1 / 3</div>` (검정 반투명 pill)
  - **우하단 핑크 점 인디케이터**: `.gt-dot.on { background:#ff4d8d, width:18px, radius:999 }` (active 시 pill 형태)
  - 4초 자동 전환 유지 (`setInterval` 그대로)
- **주제별 커뮤니티 카드 개편** (4개 모두 새 구조):
  - 섹션 헤더에 "전체보기 ›" 버튼 추가 (`gt-section-more`)
  - 인라인 스타일 카드 → `.gc-card / .gc-bg-img / .gc-overlay / .gc-badge / .gc-body / .gc-title / .gc-sub / .gc-arrow / .gc-soon` 클래스 기반
  - **강톡**: 배경 이미지 유지 + 좌상단 💬 핑크 사각 뱃지 + 중앙 "강톡" + 하단 "100% 비공개 게시판" + 우하단 ›
  - **힐링톡**: 배경 이미지 유지 + 강한 오버레이(`gc-overlay--strong`) + 좌상단 ❤️ 뱃지 + "힐링톡" 흰색 + "명언·건강·여행·다이어트" + "서비스 준비중" pill
  - **우리 가게 게시판**: 배경 이미지 제거, `#F5EFE8` 연베이지 + 🏪 뱃지 + 핑크 굵은 타이틀 + 회색 서브 + "서비스 준비중" pill
  - **이벤트톡**: `#FFF0F5` 연핑크 + 🎉 뱃지 + 핑크 굵은 타이틀 + "서비스 준비중" pill
  - 카드 공통 `border-radius:16px; height:130px; overflow:hidden`
- **이미지 프리로드 정리**: 사용하지 않는 cat-store/cat-event 제거, cat-gangtok/cat-healing 만 유지

### 2026-05-14: 페이지 전환 시 가로 크기 불일치 수정 (`fix/page-horizontal-padding`)
- **분석 결과** (페이지마다 좌우 패딩이 모두 달랐음):
  - MainPage `.page`: 좌우 12px
  - StoreFinder `.page`: 좌우 0 + 섹션별 `margin:0 16px` 중복
  - GangTalkPage `.wrap.compact`: 좌우 14px
  - AppHeader `.app-header / .app-search`: 좌우 4px
- **신규 전역 토큰**: `App.vue :root { --page-h-pad: 16px; }`
- **단일 책임 원칙**: 좌우 패딩은 `.page` (또는 `.wrap`) 가 책임, 자식(AppHeader / 섹션 / 카드)은 자체 좌우 마진/패딩 두지 않음
- **변경 파일**:
  - `App.vue`: `--page-h-pad: 16px` 추가
  - `MainPage.vue`: `.page padding-left/right: max(12px,...)` → `max(var(--page-h-pad,16px), env(...))` 로 통일
  - `StoreFinder.vue`:
    - `.page padding-left/right: var(--page-h-pad)` 로 통일
    - `.sf-search-wrap margin:0 16px` → `0`
    - `.sf-banners margin:0 16px 8px` → `0 0 8px`
    - `.sf-cat margin:0 16px` → `0`
    - `.sf-tops padding:20px 16px` → `20px 0`
    - `.sf-list-head padding:8px 16px` → `8px 0`
  - `GangTalkPage.vue`: `.wrap padding:14px` → `14px var(--page-h-pad)`, `.wrap.compact padding:10px 14px` → `10px var(--page-h-pad)`
  - `AppHeader.vue`: `.app-header padding:16px 4px 12px` → `16px 0 12px`, `.app-search padding:0 4px 10px` → `0 0 10px`
- **결과**: 모든 페이지의 콘텐츠 좌우 시작점이 정확히 16px 로 잠겨 페이지 전환 시 가로 이동 없음

### 2026-05-14: 페이지 전환 시 화면 점프 4가지 원인 수정 (`fix/page-transition-jump`)
- **수정 1: `.page padding-top` 통일** — 상단 여백 책임을 AppHeader 로 일원화
  - `MainPage .page { padding-top: 8px → 0 }`
  - `AppHeader .app-header { padding: 8/12 → 16/12 }` (상단 16 으로 늘려 흡수)
  - StoreFinder `.page` 는 기존 `padding:0` 유지 → 양 페이지 콘텐츠 시작점 일치
- **수정 2: StoreFinder 첫 섹션 v-if 점프 차단**
  - `<section class="sf-search-wrap" v-if="hotRanks10.length">` → `v-show` + 빈 상태에서도 동일 높이의 `.sf-hot--skeleton` 카드 자리 보유
  - `<section v-if="oneBanner.length">` 위에 `v-if="!oneBanner.length"` 스켈레톤 섹션 추가 (높이 180 + 인디케이터 3개)
- **수정 3: 첫 카드 패딩/마진/radius 통일**
  - 두 페이지 모두 `padding: 12px 16px; margin: 0 0 14px; border-radius: 14px;`
  - StoreFinder `.sf-search-wrap` 의 bottom 14 마진 제거 → 카드가 직접 책임
  - `.sf-hot { min-height:62px; box-sizing:border-box }` 추가
- **수정 4: `body.has-fixed-topbar` 잔존 차단**
  - `App.vue` 의 `hideTopBar` watcher 와 `onMounted` 가 클래스 제거를 `await nextTick()` 이후 실행
  - TopBar `onMounted` 가 클래스 add → 다음 프레임에 watcher 가 remove → 한 프레임 짧은 깜빡임 차단

### 2026-05-14: 공통 AppHeader 컴포넌트 추출 (`refactor/common-app-header`)
- **신규 `src/components/common/AppHeader.vue`**: 헤더 + 검색창 + 햄버거 카드 드롭다운 단일 컴포넌트
  - props: `modelValue` / `searchPlaceholder` (기본 `업체명, 지역, 업종을 검색해보세요`) / `showSearch` (기본 true)
  - emits: `update:modelValue` / `search` / `filterClick`
  - 내부 상태: `notifBadge`, `currentUser`, `isAuthReady`, `menuOpen`, `menuItems`, `signOut` 등 — Firebase Auth 구독 자체 보유
  - 마크업 prefix: `.app-header / .app-brand / .app-icon-btn / .app-bell-badge / .app-search-box / .app-menu-card`
  - 다크모드 자체 대응
- **App.vue 전역 토큰** 추가 (페이지 전환 점프 차단용):
  - `--app-header-height: 64px;`
  - `--app-search-height: 48px;`
  - `--app-header-total:  130px;`
  - AppHeader 내부 `.app-header-wrap{ min-height: var(--app-header-total) }` 로 항상 동일 면적 점유
- **MainPage.vue 마이그레이션**:
  - 기존 `<header class="mp-header">` + `<section class="mp-search">` 마크업 제거 → `<AppHeader v-model="q" @search="doSearch" @filter-click="openFilter" />`
  - `notifBadge / openNotif / menuOpen / toggleMenu / menuItems / onMenuItem / menuOpen watch / signOut` import 모두 제거 (AppHeader 가 담당)
  - `mp-header / mp-search / mp-icon-btn / mp-bell-badge / mp-menu-* / mp-dd-*` CSS 블록 일괄 제거
  - CTA 배너용 별도 auth 구독 (currentUser/isAuthReady/isLoggedIn) 은 유지
- **StoreFinder.vue 마이그레이션**:
  - 기존 `<header class="sf-header">` + `<section class="sf-search">` 마크업 제거 → `<AppHeader v-model="q" @search="doSearch" @filter-click="openFilter" />`
  - `notifBadge / goNotif / menuOpen / toggleMenu / menuItems / onMenuItem / menuOpen watch / signOut / currentUser / isAuthReady / isLoggedIn` 모두 제거
  - `sf-header / sf-search / sf-icon-btn / sf-bell-badge / sf-menu-* / sf-dd-* / sf-search-box / sf-search-ic / sf-search-input / sf-search-filter` CSS 일괄 제거
  - 다크모드 보정 셀렉터에서도 헤더·검색·메뉴 항목 제거 (페이지 고유 sf-hot / sf-cat-ic 만 유지)
- **공통 스타일 기준 갱신**: CLAUDE.md "공통 스타일 기준" 섹션을 AppHeader 사용 강제 + 고정 높이 토큰 명시로 재작성

### 2026-05-14: 가게찾기 헤더/검색/카테고리 현황판 스타일로 통일 (`feat/storefinder-unify-with-mainpage`)
- **공통 스타일 기준 확정**: 모든 페이지의 헤더 / 검색창 / 카테고리는 `MainPage.vue` 의 마크업 + CSS 값을 그대로 따른다 (CLAUDE.md 상단에 명시)
- **헤더**: `sf-header` HTML 은 이전부터 `mp-header` 와 동일 구조, 이번에 CSS 값까지 완전 동일하게 정렬
  - padding `8px 4px 12px`, 로고 48×48 radius 12, 타이틀 20 핑크 `#ff2e7e`, 서브 12 `var(--muted)`, 아이콘 버튼 38×38 투명/border-none, 뱃지 16×16 `#ff4d8d` `+2px solid var(--bg)`
  - sticky 제거 (MainPage 와 일관)
- **검색**: `SearchBar.vue` 컴포넌트 사용 제거, MainPage 와 동일한 직접 마크업 사용
  - `sf-search > sf-search-box`: height 48, padding `0 14px`, radius 14, `box-shadow:0 2px 10px rgba(0,0,0,.05)`, border `1px solid var(--line)`
  - 좌측 돋보기 SVG `.sf-search-ic`, 가운데 `<input class="sf-search-input">` placeholder `업체명, 지역, 업종을 검색해보세요`, 우측 필터 SVG `.sf-search-filter`
  - 실시간 순위 카드는 별도 `<section class="sf-search-wrap">` 으로 분리 유지
- **카테고리**: 기존 `.cats > .cat-grid > .cat` 마크업/CSS 전체 제거 → `<section class="sf-cat"> > .sf-cat-scroll > .sf-cat-item` 으로 교체
  - `mpCategories` 배열(SVG 아이콘 포함, 10개) StoreFinder 에도 동일하게 추가
  - 'all' 카테고리는 setType 대신 **`openRegionMenuFromCat($event)`** 호출 — 지역 드롭다운 기능 유지
  - 라벨 표시: 'all' = `{지역명} 🔽`, 그 외 = `c.label`
  - 원형 아이콘 48 + 라벨, 선택 시 핑크 그라디언트 + 라벨 핑크 800
  - `expandCategories` ref + 펼치기 버튼(현황판과 동일)
- **레거시 제거**: `.cat-grid` / `.cat` / `.cat[data-key="all"]` / `.ico .badge` / `.lbl-region` / `.cat[data-key="kara"] .lbl` 전부 제거
- **다크모드**: `.sf-search-shell` / `.cat-grid .cat ... .ico` 셀렉터 → `.sf-search-box` / `.sf-cat-ic` 로 갱신
- **import 정리**: `SearchBar` import 제거 (코멘트로 사유 명시)
- **유지**: 실시간 순위 (`sf-hot`), 광고 배너 (`sf-banners`), Top5 (`sf-tops`), 업소 목록, 모든 모달/시트/편집 모드/기업회원 CTA — 그대로

### 2026-05-14: 가게찾기 전체 UI 톤 업그레이드 (`feat/storefinder-ui-polish`)
- **배경**: `var(--bg)` → `#fdf8fa` 밝은 연핑크 흰색
- **`.page` 패딩**: `8px 12px` → `0 0 ...` (각 섹션이 좌우 16px 여백 직접 책임)
- **헤더**: 패딩 8/4 → 16/20, 로고 48→52, 타이틀 20→22, 서브 12→13, 아이콘 버튼 38→40 + `border:1.5px solid #eee` + `background:#fff`, 뱃지 색 `#ff3d3d` 빨간 원
- **검색**: 높이 52px, 패딩 `0 16px`, radius 14, 흰색 + `box-shadow:0 2px 12px rgba(0,0,0,.08)`, SearchBar 내부 input 폰트 15px
- **실시간 순위**: 카드형 (흰색, radius 12, padding 12/16, `box-shadow:0 2px 10px`), 핑크 원형 22px 뱃지, 점 구분자 자동(::before "·"), 더보기 13px
- **광고 배너**: 좌우 여백 16, banner radius 16, `banner-img height 180px`, 인디케이터 active pill 형태
- **카테고리 v2 (2줄 그리드 복원)**:
  - HTML 에서 `sf-cat-scroll` 클래스 제거, `.cat-grid{ display:grid; grid-template-columns:repeat(6,1fr); row-gap:12, column-gap:8 }`
  - 공통 `.cat` 박스/테두리/그림자 제거, transparent
  - `[data-key="all"]` = 핑크 그라디언트 박스 64px + 흰 텍스트 14px (지역명 + 🔽)
  - 일반 카테고리 = 원형 48×48 흰 배경 + 1.5px `#eee` 테두리 + 16px 굵은 글자
  - `.active` 일반 = 원형 핑크 그라디언트 + 흰 글자 + 라벨 핑크 800
  - 레거시 `transform:scale(.8)` 라벨 축소 룰 + `font-size: calc(var(--cat-font)*.85)` 등 제거
- **Top5**: 섹션 패딩 `20px 16px`, 헤더 17px, 카드 min-width 200, radius 14, image height 140 (padding-top 비율 → 고정 px), meta padding 12, 업체명 16/800, 일급 14/900 `#ff2e7e`, 담당자 12/`#888`, soft shadow `0 4px 14px`
- **List Head**: 좌우 여백 16 통일
- **다크모드 보정**: `sf-page / sf-header` 배경 var(--bg), `sf-icon-btn` 다크 surface, 카테고리 일반 아이콘 ico 다크 배경

### 2026-05-14: 가게찾기 카테고리 CSS 충돌 수정 + 헤더 sticky (`fix/storefinder-category-css`)
- **레거시 `.cat-grid` grid → flex**: `display:grid` + `grid-template-columns:repeat(6,...)` 제거, `display:flex; flex-wrap:nowrap; overflow-x:auto;` 로 교체해 새 `sf-cat-scroll` 가로 스크롤과 일관
- **레거시 `.cat .lbl` 폰트 강제 룰 삭제**: `.cat[data-key]:not([data-key="all"]) .lbl{ font-size: calc(var(--cat-font)*.5) !important }` + `.cat:not([data-key="all"]) .lbl{ ... }` 두 룰 완전 제거 (라벨이 ~4.3px 로 축소되던 버그 해결)
- **새 디자인 `.sf-cat-scroll :deep(.cat .lbl)` 에 `!important` 추가**: 다른 외부 CSS 가 다시 덮어쓰지 못하도록 font-size/weight/color 모두 보강
- **`.sf-header` sticky 처리**: `position:sticky; top:env(safe-area-inset-top,0); z-index:100; background:var(--bg,#fafafa)` 추가 — 스크롤 시 헤더가 상단에 고정되도록

### 2026-05-14: 가게찾기 디자인 개편 v2 + CTA Auth 타이밍 수정 (`feat/storefinder-redesign-v2`)
- **MainPage CTA 타이밍 수정**: Firebase Auth 초기화 직후 `currentUser` 가 잠시 `null` 로 읽혀 CTA 가 깜빡이던 문제 해결
  - `currentUser` 초기값 `null` → `undefined`
  - `isAuthReady` ref 신규, `onAuthStateChanged` 첫 발화 시 `true`
  - CTA 조건: `v-if="!isLoggedIn"` → `v-if="isAuthReady && !isLoggedIn"`
- **App.vue**: `isDashboard` → `hideTopBar` 로 확장 (`dashboard` + `finder` 둘 다 자체 헤더 사용). `body.has-fixed-topbar` 제거 watcher 도 동일 적용
- **StoreFinder 헤더 추가**: MainPage 와 동일한 헤더
  - 좌측: `/icons/icon-192.png` 48×48 로고 + "강남톡방" 핑크 20px + "강남의 모든 공간, 한눈에." 회색 12px
  - 우측: 알림벨(notifBadge 뱃지) + 햄버거 카드 드롭다운 (일정/달력·고객센터·즐겨찾기·로그인/로그아웃, 외부·ESC 닫힘, scale+opacity 애니메이션)
  - `signOut` import, `notifBadge / isAuthReady / currentUser / menuOpen / menuItems / onMenuItem` 신규
- **검색창**: SearchBar 컴포넌트는 유지, `sf-search-shell` 래퍼로 둥근 카드 + box-shadow 스타일
- **실시간 순위 티커**: 기존 `hotRanks10 / tickerStyle / openHotSheet` 기능 유지, 새 마크업으로 1줄 가로 + 핑크 원형 순위 뱃지 + "더보기 ›"
- **광고 배너**: 기존 oneBanner/onBannerClick 그대로 유지, 하단 핑크 인디케이터 점 3개 추가
- **카테고리 탭**: 기존 cat-grid + 지역 드롭다운 기능 유지, `sf-cat-scroll` 가로 스크롤 + `:deep(.cat .ico)` 원형 48px + 선택 시 핑크 그라디언트
- **Top5 섹션**: 기존 topLists 기능 유지, "✨ {{ label }} Top 5" + "더보기 ›" 헤더 추가
- **목록 헤드/툴**: 기존 정렬/뷰토글/다크모드/새로고침 그대로, `sf-list-head` 톤 정리
- **모든 모달/시트 유지**: 담당자 드롭다운, 액션시트, BizManagerTabs 등록 패널, Top10 시트
- **다크모드 보정**: 새 sf-* 클래스 전부 다크 테마 대응

### 2026-05-14: 로고 이미지화 + 카드형 드롭다운 + 도움말 삭제 + CTA 정리 (`feat/mainpage-logo-menu-cta`)
- **헤더 로고**: `BrandLogo` SVG → `<img src="/icons/icon-192.png">` (48×48px, border-radius 12px)
- **타이틀 크기**: 18px → 20px, 핑크(#ff2e7e) 유지
- **서브타이틀**: 11px → 12px
- **햄버거 메뉴**: 전체화면 슬라이드 패널 → 우측 상단 카드형 드롭다운 (width 200px, border-radius 16px, scale+opacity 진입 애니메이션, 항목 간 얇은 구분선)
- **외부 클릭/ESC 닫힘**: `document.addEventListener('click')` + ESC 핸들러, scroll lock 제거
- **도움말 완전 삭제**:
  - 메뉴 항목 4개로 축소: 일정/달력 · 고객센터 · 즐겨찾기 · 로그인/로그아웃
  - `TopBar.vue`: 도움말 버튼 + `.round-icon.help` CSS 제거
  - `router/index.js`: `/help` 라우트 제거, `publicForGuests`에서 `'help'` 제거, 주석 갱신
  - `src/pages/HelpPage.vue`: 파일 삭제 (`ConsultHelpPage.vue`는 별개 기능이므로 유지)
- **CTA 배너**: 명세 정렬 — ✨를 좌측 맨 위로, 그라디언트 → 단색 `#FFE4EF`, 패딩 18px 20px, 타이틀 색 진하게

### 2026-05-14: 현황판 TopBar 제거 + 햄버거 슬라이드 메뉴 추가 (`fix/mainpage-header-cleanup`)
- **App.vue**: `route.name === 'dashboard'` 일 때 `<TopBar v-if="!isDashboard">` 로 숨김 + `body.has-fixed-topbar` 클래스 자동 제거 (다른 페이지는 TopBar 정상 노출)
- **MainPage 로고**: `<span>강톡</span>` → `BrandLogo` SVG 컴포넌트 사용 (핑크 라운디드 정사각 + 말풍선)
- **타이틀 색상**: `var(--fg)` → 핑크 `#ff2e7e` (BrandLogo와 통일)
- **햄버거 슬라이드 패널**: 우측에서 슬라이드 인, dimmed 외부 클릭/ESC/X 버튼으로 닫기, body scroll lock, 다크모드 대응
- **메뉴 항목**: ❓도움말(`/help`) · 📅일정/달력(`/diary`) · 🎧고객센터(`/support`) · ❤️즐겨찾기(`/favorites`) · 로그인/로그아웃(Firebase signOut)
- `signOut` import 추가, `menuOpen/closeMenu/menuItems/onMenuItem` 헬퍼 신설

### 2026-05-14: 현황판 메인페이지 전면 디자인 개편 (`feat/mainpage-redesign`)
- **헤더**: 로고+타이틀+서브타이틀 / 알림벨(빨간 뱃지) + 햄버거 메뉴
- **검색창**: 둥근 흰색 카드형, 좌측 돋보기 + 우측 필터 아이콘
- **핫이슈 배너**: 핑크 그라디언트 pill 라벨 + 텍스트 + 화살표
- **카테고리 탭**: 가로 스크롤, SVG 아이콘+텍스트 세로 배치, 선택시 핑크 원형 배경
- **인기 업소 카드**: 정사각 썸네일+🔥인기 뱃지 / 업체명+지역업종+하트 / ⭐별점+리뷰 / 맞출방·필요인원·와이파이 3칸 그리드
- **CTA 배너**: 비로그인 시 연핑크 카드(가입 유도 + 로그인 버튼)
- **레거시 제거**: 뉴스 한줄, type-chip row, view-tools (다크모드/내주변/뷰모드/새로고침), 한줄/두칸 뷰 분기, 액션 칩(초톡/담당/채팅/게시판)
- **보존**: 스크립트의 stores 구독/rooms_biz/vendors/auth/admin 편집 모드 로직 + 하단 액션시트/포털 모달
- **새 헬퍼**: mpCategories(아이콘 SVG 포함), notifBadge, hotIssue, openNotif/openMenu/goEventDetail/goAllStores/goLogin/openFilter, favSet(localStorage), ratingOf/reviewCountOf/wifiText, isLoggedIn(computed)

### 2026-04-02: 커뮤니티 카드 이미지 상하단 어둡게 편집 (`fix/community-card-image-darkening`)
- Pillow로 4개 이미지 상단 30%, 하단 30% 검정 그라디언트 적용 (최대 alpha 160)
- 이미지 자체가 어두워져서 카드 경계 흰선 완전 해소

### 2026-04-02: 커뮤니티 카드 상하단 그라디언트 오버레이 추가 (`fix/community-card-gradient-overlay`)
- 각 카드 img 위에 linear-gradient 오버레이 추가 (상단 15%, 하단 25% 어둡게)
- 이미지 상하단 밝은 부분이 카드 경계에서 흰선으로 보이는 문제 완화

### 2026-04-02: URL ?theme= 쿼리 파라미터 전면 제거 (`fix/remove-url-theme-params`)
- **근본 원인**: BottomNav.vue에 `theme: 'light'` 하드코딩, router/index.js/MainPage/PartnersPage 등 여러 곳에서 URL 쿼리로 theme 전달
- BottomNav.vue: `theme: 'light'` 제거
- router/index.js: beforeEach에서 query.theme 읽기 제거, 리다이렉트 query에서 theme 제거
- GangTalkPage.vue: openBiz query에서 theme 제거, URL replaceState에서 theme 제거
- PartnersPage.vue: 자체 applyTheme/watch 제거 → store/theme.js 사용
- UserSection.vue: router.push query에서 theme 제거

### 2026-04-02: App.vue onMounted 테마 적용 + MainPage/StoreFinder onMounted 보강 (`fix/darkmode-app-vue-onmounted`)
- App.vue: onMounted에서 applyThemeToDom(getTheme()) + attachThemeSync() 추가
- MainPage.vue: 첫 onMounted에 applyThemeToDom(getTheme()) 추가
- StoreFinder.vue: 첫 onMounted에 applyThemeToDom(getTheme()) 추가

### 2026-04-02: 다크모드 현황판/가게찾기 수정 + 카드 인라인 교체 (`fix/darkmode-mainpage-storeboard-card`)
- MainPage.vue: URL 쿼리 기반 테마 → store/theme.js setTheme/getTheme 사용, 모든 router.push에서 theme 쿼리 제거
- StoreFinder.vue: applyThemeFromQuery/watch/onMounted 제거 → getTheme/setTheme 사용
- 커뮤니티 카드: CSS 클래스 방식 완전 폐기 → 인라인 스타일로 교체 (position:absolute + object-fit:cover + display:block)

### 2026-04-02: 다크모드 유지 + 카드 흰선 v2 (`fix/darkmode-persist-and-card-line-v2`)
- **다크모드**: TopBar의 URL 쿼리 기반 테마 관리를 제거, localStorage만 사용하도록 통일
  - TopBar: 자체 norm/applyThemeToDom/setUrlTheme → store/theme.js의 setTheme/getTheme 사용
  - main.js afterEach: to.query.theme 제거, localStorage만 참조
- **카드 흰선**: aspect-ratio를 이미지 실제 비율(650/336)로 맞추고, object-fit: fill로 변경

### 2026-04-02: 다크모드 유지 + 카드 흰선 완전 제거 (`fix/darkmode-persist-and-card-line`)
- main.js: normalizeTheme/applyThemeToDom/attachThemeSync 사용으로 테마 일관성 확보
- afterEach에서 localStorage 중복 저장 제거 (setTheme이 이미 처리)
- 카드: height:130px → aspect-ratio:16/9, font-size:0, line-height:0, vertical-align:bottom

### 2026-04-02: 커뮤니티 카드 img 태그로 교체 (`fix/community-card-img-tag`)
- background-image 방식 → img 태그 + object-fit:cover 방식으로 변경
- position:absolute + width/height:100% 로 카드 꽉 채움

### 2026-04-02: 커뮤니티 카드 이미지 꽉 채우기 (`fix/community-card-image-fill`)
- background-size: cover → 100% 100% 변경 (카드 하단 여백 제거)

### 2026-04-02: 야간모드 커뮤니티 카드 gap 배경색 제거 (`fix/darkmode-card-gap`)
- gap: 10px → column-gap: 6px, row-gap: 4px 로 줄여서 행 간 선 최소화

### 2026-04-02: 야간모드 커뮤니티 카드 흰색 선 제거 (`fix/darkmode-community-card-border`)
- 인라인 backgroundColor 제거 (밝은 고정색이 다크모드에서 새어 보임)
- background-color: var(--surface) 로 통일
- background-size: cover, border/outline: none 추가

### 2026-04-02: 개선 페이지 야간모드 적용 (`feat/darkmode-apply-redesigned-pages`)
- GangTalkPage v2 CSS: 하드코딩 #fff/#111/#888 등 → var(--bg)/var(--fg)/var(--muted)/var(--line)/var(--surface)/var(--accent-weak) 전면 교체
- StoreBoard v2 CSS: 동일하게 CSS 변수 교체
- 핑크 그라디언트/accent 색상은 다크모드에서도 유지 (의도적)
- pill-tab, post-card, section-title, btn-load-more 등 메인 페이지 영역도 교체

### 2026-04-02: 힐링톡/우리가게 게시판 UI 강톡 스타일 통일 (`feat/healing-storeboard-ui-redesign`)
- **힐링톡**: 구 ql-list/ql-row 스타일 → v2 카드형(v2-post-list/v2-post-card), pill 탭, 핑크 공지 카드, 글쓰기 버튼 핑크 그라디언트
- **StoreBoard.vue**: 전면 교체 → v2 헤더/카드 리스트/글쓰기 모달(핸들바+테두리없는 입력+핑크 등록)

### 2026-04-02: 강톡 게시판 UI 전면 개선 (`feat/board-ui-redesign`)
- **게시판 목록**: 카테고리 pill 탭(핑크 그라디언트), 공지 핑크 카드, 카드형 게시글(카테고리뱃지+닉네임+제목+미리보기+썸네일+통계), N뱃지
- **게시글 상세**: 카테고리뱃지+큰제목+닉네임/날짜, 본문(넓은 줄간격), 핑크 그라디언트 추천버튼(하트+숫자), 원형아바타 댓글카드, 하단고정 둥근입력창+전송아이콘
- **글쓰기 모달**: 핸들바+타이틀, 가로스크롤 pill 카테고리, 원형아바타+닉네임, 테두리없는 입력창+구분선, 하단 툴바(📷+글자수+핑크 등록버튼)

### 2026-04-02: 더 보기 디버그 및 리스트 수정 (`fix/load-more-debug`)
- **핵심 버그 발견**: bestTop3가 `.slice(0,3)`으로 항상 3개만 표시 → sortedPostList(전체 정렬)로 교체
- 디버그 console.log 추가: 첫 로드 개수, 더보기 클릭 시 lastDoc/추가개수/전체개수

### 2026-04-02: 더 보기 버튼 목록 교체→추가 방식 수정 (`fix/load-more-append`)
- onSnapshot이 첫 페이지를 덮어쓰면서 "더 보기"로 추가된 게시글이 사라지는 문제 수정
- olderPosts를 별도 ref로 보관하여 onSnapshot 갱신 시에도 유지
- loadMorePosts에서 posts에 append, olderPosts에도 append

### 2026-04-02: 전체 성능 최적화 24개 문제 수정 (`perf/global-performance-optimization`)
- **높음 6건**: UserSection board_posts limit(100)+getDoc, AdminTools limit(200), useMyPageCore connectRequests limit(100), PartnersPage partners limit(200)
- **중간 12건**: BizManagerTabs 3개 쿼리 limit(100), useMyPageCore stores/connectRequests/partnerRequests/extendRequests limit(100), ChatPage/PartnersPage lazy loading
- **낮음 6건**: useMyPageCore config 서브컬렉션 limit(50), partners limit(200), UserSection getDocs→getDoc, TierLadderView lazy loading

### 2026-04-02: 강톡 페이지 6단계 성능 최적화 (`perf/optimize-gangtalk-page`)
1. **힐링톡 흰선**: height 120→130px, background-size: 100% 100%로 완전 채움
2. **게시글 페이지네이션**: limit(10) 적용, "더 보기" 버튼, startAfter 커서 기반
3. **리스너 최적화**: stores limit(50), getDocs 중복 호출 제거 (onSnapshot이 첫 결과 전달)
4. **이미지 lazy loading**: 썸네일 loading="lazy", 커뮤니티 카드 preload
5. **Firebase 쿼리**: 모든 쿼리 limit 적용, 중복 getDocs 제거
6. **번들 최적화**: Firebase/Vue 별도 chunk 분리, 15개 페이지 dynamic import 전환
   - 결과: 1,520KB 단일번들 → index 272KB + firebase 833KB + vue 98KB + 페이지별 chunk

### 2026-04-02: 힐링톡 하단 흰선 완전 제거 v2 (`fix/healing-white-line-v2`)
- 원인: background-color:#ddd가 이미지 서브픽셀 갭에서 노출됨
- 각 카드에 이미지 하단 색상과 동일한 backgroundColor 인라인 설정
- background-size: calc(100%+2px) calc(100%+2px)로 1px 여유 확보
- 불필요한 -webkit-mask-image, backface-visibility, isolation 제거

### 2026-04-02: 힐링톡 카드 하단 흰선 제거 (`fix/healing-card-white-line`)
- line-height:0, font-size:0 추가 (인라인 요소 공백에 의한 하단 갭 제거)
- -webkit-mask-image + isolation:isolate 추가 (WebKit 서브픽셀 클리핑 강제)

### 2026-04-02: 커뮤니티 카드 텍스트 임시 숨김 (`fix/community-card-hide-text`)
- 이미지 자체에 텍스트가 포함되어 있어 코드 텍스트/오버레이 전부 제거
- 카드는 배경 이미지만 표시 (overlay, grid-text, grid-title, grid-sub CSS 삭제)

### 2026-04-02: 커뮤니티 카드 텍스트 겹침 및 하단 선 수정 (`fix/community-card-text-overlap`)
- **오버레이**: border-radius 제거 (부모 overflow:hidden으로 처리), 불투명도 0.3→0.35
- **하단 선 수정**: background-repeat:no-repeat, backface-visibility:hidden 추가
- **텍스트 가독성**: text-shadow 추가, padding 12px

### 2026-04-02: 커뮤니티 카드 이미지 적용 및 오타 수정 (`fix/community-card-images`)
- **오타 수정**: 배너 텍스트 "강남특방" → "강남톡방"
- **그리드 카드**: 색상 배경 → 실제 배경 이미지 4장 적용 (cat-gangtok/healing/store/event.jpg)
- **카드 스타일**: background-size: cover, 어두운 오버레이(rgba 0,0,0,0.3), 제목 핑크(#ff4d8d) 가운데 정렬, 서브텍스트 흰색

### 2026-04-02: 목표 디자인 100% 일치 수정 (`feat/gangtalk-design-exact-match`)
- **상단 배너**: 이미지 슬라이더 → REJURAN 스타일 CSS 배너 (어두운 배경, 청록색 원형, 200px 높이, 인디케이터 점 3개)
- **섹션 타이틀**: "🔥 주제 별 커뮤니티" 굵은 폰트 좌측 정렬 추가
- **2x2 그리드**: 네이비(강톡, 자물쇠+핑크 비공개), 핑크(힐링톡), 연보라(우리가게), 연주황(이벤트), 120px 높이
- **pill 탭**: 작은 크기, 핑크 배경+흰 텍스트(선택), 흰 배경+회색 테두리(미선택)
- **게시글 리스트**: 구분선 스타일, 닉네임→제목→미리보기→날짜/좋아요/댓글, SVG 아이콘, 썸네일 우측

### 2026-04-02: 강톡 탭 디자인 개편 (`feat/gangtalk-page-redesign`)
- **상단 배너**: 텍스트 광고(마키 애니메이션) → 이미지 슬라이더 (자동 4초 넘김, 페이지 인디케이터 점 표시)
- **커뮤니티 섹션**: 힐링톡/강톡 히어로 배너 → 2x2 그리드 카드 (강톡, 힐링톡, 우리 가게 게시판, 이벤트 참여)
- **인기글/인기댓글/인기추천수 탭**: chip 버튼 → pill 버튼 스타일 (선택시 핑크색 `#ff6b9d` 배경)
- **게시글 리스트**: rank + 메타 행 → 카드형 (닉네임, 제목, 내용 미리보기, 썸네일, 시간/좋아요/댓글수)
- **우리가게 게시판 섹션 제거**: 2x2 그리드 카드에서 바로 접근하도록 변경
- **네온 효과 제거**: 히어로 배너의 neon 글로우/애니메이션 제거 (깔끔한 디자인)
- **레이아웃**: 광고 바 고정 영역 제거로 콘텐츠 영역 확대

### 2026-04-02
- GitHub 저장소 생성 및 코드 업로드 완료
- 저장소: https://github.com/yumi-kim-79/gangtalk
- CLAUDE.md 파일 생성

---

## 프로젝트 구조 요약
```
GangTalk/
├── src/
│   ├── pages/        # 주요 페이지 (30개+)
│   ├── components/   # 컴포넌트
│   ├── store/        # 상태관리
│   ├── router/       # 라우팅
│   ├── services/     # Firebase 서비스
│   ├── composables/  # 재사용 로직
│   └── styles/       # CSS/테마
├── functions/        # Firebase Cloud Functions
├── public/           # 정적 파일
├── GangTalkMacro/    # Python 매크로 (별도)
└── dist/             # 빌드 결과물
```

## 주요 페이지 목록
- MainPage.vue - 메인 홈
- ChatPage.vue / ChatBiz.vue / ChatOpen.vue - 채팅
- PartnersPage.vue / PartnerDetail.vue - 업체 디렉토리
- MyPage.vue - 마이페이지
- AuthPage.vue - 인증
- StoreDetail.vue / StoreBoard.vue - 업체 상세
- TierLadderView.vue - 티어 시스템
- DashboardPage.vue - 대시보드

## 주의사항
- `.env` 파일에 Firebase 설정 키가 있으므로 외부 노출 금지
- `GangTalkMacro/.venv/` 는 용량이 크므로 git에서 제외 필요
- `dist/` 폴더는 빌드 결과물이므로 직접 수정 금지

## 활성/비활성 스위치 메모
- **EventOverlay 비활성화 상태** — 이벤트 있을 때 활성화 필요
  - 위치: `src/pages/MainPage.vue` 의 `const EVENT_OVERLAY_ENABLED = false`
  - 활성화 방법: 위 상수를 `true` 로 변경
  - 컴포넌트 코드 (`src/components/EventOverlay.vue`) / 상태 (`showEvent`, `decideShowEvent`, `onCloseEvent`, `onDismissDay`) 는 그대로 보존
  - localStorage 키: `event:open202510:hideUntil`, `event:open202510:seenSession`

- **관리자 UI 전 페이지 숨김 (도메인 분리 1단계)** — 2단계에서 `/admin/*` 라우트 신설 시 복귀
  - 패턴: `v-if="false && (기존조건)"` — `false &&` 만 제거하면 원래 동작
  - 위치:
    - `src/pages/MyPage.vue:72` (운영자 섹션 전체)
    - `src/views/StoreFinder.vue:50,157,202,247,254,292` (배너/Top5/일반등록/편집 툴바)
    - `src/pages/PartnersPage.vue:18,117,145,191` (배너/Top5/일반등록/편집 툴바)
    - `src/pages/GangTalkPage.vue:227,252,299,323` (공지/게시글 수정·삭제 버튼)
    - `src/pages/GangTalkPage.vue:2307` (글쓰기 모달 '공지' 카테고리)
    - `src/pages/AuthPage.vue:42,51` (기업/관리자 회원유형 탭) — `v-if="false"`
    - `src/pages/AuthPage.vue:222` (업체명/사업자번호/주소 입력) — `v-if="false && (...)"`
    - `src/pages/AuthPage.vue:290` (who 기본값) — 항상 `'user'` 강제, 원본은 주석 보존
  - 관련 데이터/함수 (`isAdmin`, `canEdit`, `isEnterprise`, watchAdmin, AdminTools, BizManagerTabs 컴포넌트, `signupBiz / signupAdmin / loginBiz / loginAdmin / storeName / businessNo / address`) 는 모두 보존
  - AppHeader 알림벨: `src/components/common/AppHeader.vue:171-188` — `watchAdmin` 호출 주석, `notifBadge = computed(() => 0)` 으로 임시 처리
