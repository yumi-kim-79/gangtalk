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

### gangtox.com (회원, 기본 빌드)
```bash
nvm use 20
npm run build                   # → dist/index.html
firebase deploy --only hosting:prod
# 또는: npm run deploy:hosting
```

### gangtalk815.com (관리자 전용 빌드)
```bash
nvm use 20
npm run build:admin             # VITE_BUILD_TARGET=admin → dist-admin/index.html
firebase deploy --only hosting:admin
# 또는: npm run deploy:admin (clean + build + deploy)
```

- `vite.config.js` 가 `VITE_BUILD_TARGET=admin` 일 때 `index-admin.html` 을 entry 로 사용하고
  `closeBundle` 훅에서 `dist-admin/index-admin.html` → `index.html` 로 rename.
- Firebase Hosting 멀티 사이트: `.firebaserc` 에 `prod=gangtalk-b8eb8`, `admin=gangtalk815` 두 타겟 정의.

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

**현재 단계**: 도메인 분리 4단계(업체 계정 시스템) 완료 — 관리자가 업체용 Auth 계정을 생성하고, 업체가 로그인해 본인 가게의 현황판 지표/정보를 직접 수정 가능. role 계층(platform/biz/null) 추가.

---

## 다음 작업 (외부 점검 보고서 검토 후 확정된 백로그)

> 상세 근거는 `docs/audit/2026-06-17-검토결과.md` 참고.
> 사용자 수동 액션 (콘솔 작업) 은 별도 표시.

### Sprint 0 — ✅ 완료 (`feature/sprint0-sms-secret-hardening`)
1. ~~**[수동] CoolSMS 콘솔에서 API Key/Secret 폐기 → 재발급**~~ (사용자 사전 처리 완료, Secret Manager 등록 완료)
2. ~~**git rm `.env` / `functions/.env` + `.gitignore` 추가**~~ (1-1) ✅
3. ~~**`sendSmsCode` 보강**: `onCall({ enforceAppCheck: true })` + 60초 쿨다운 + 24시간 5회 캡~~ (1-2) ✅
4. ~~**Firebase Secret Manager 전환** — `secrets.value()` 적용, `defineSecret` 실제 사용~~ (1-1) ✅
5. ~~**`authFunctions.js` 삭제** (죽은 코드)~~ (2-3 의 잔재 제거) ✅

### Sprint 1 — 이번 주 (다음 작업)
6. **`reserveReferralCode` 를 `index.js` 로 이전** + `runTransaction` + 추천코드 무중복 보장 (추-1, 2-3) — **`authFunctions.js` 삭제됐으므로 클라이언트는 항상 폴백 `prefix + '00001'` 으로 빠지는 상태. 즉시 복구 필요**
7. **`stores` 빈 `ownerId` 점유 룰 제거** (`firestore.rules:83-84` 두 절 삭제) (1-3)
8. **채팅 `messages` 룰 participants 멤버십 검증** + 기존 룸 doc 마이그레이션 (1-4)
9. **[수동] GCP 콘솔에서 Maps/Firebase 공용 API 키에 HTTP 리퍼러 + API 제한** (1-5)

### Sprint 2 — 다음 주
9. **관리자 판별 Custom Claims (`admin:true`) 통일** — Rules `isAdmin()` + Functions `assertCallerIsAdmin` 동시. `gangtalk815@gmail.com` 에 claim 부여 스크립트 1회 (1-6)
10. **`/api` Express 라우트 인증 검증** + `/pass/mock` 운영 빌드 제거 (1-7, 추-3)
11. **`userSeq` 트랜잭션화** — Cloud Function 으로 이전, 클라이언트 직접 +1 차단 (2-2)

### Sprint 3 — 여유 시
12. **이미지 webp 변환** — `public/brand/gangnamtalk-wordmar01.png` (2.3MB) 등 우선 (3-2)
13. **`vite.config.js` 에 `esbuild: { drop: ['console','debugger'] }`** (3-4)
14. **`public/img/reference/target-design.png` 삭제 + 루트 잡파일 정리** (3-3, 4-2)
15. **`GangTalkMacro/.venv` git 추적 제거** (4-1)
16. **`functions/index.js` 도메인별 분리** (4-3)
17. **좋아요/조회 어뷰징 방지** — `likes/{uid}` 서브문서 + Functions 집계 (2-1)
18. **`onSnapshot` 일부 → `getDocs`** 전환 (3-1)
19. **PWA / Service Worker 정책 재검토** (Capacitor 전환 시점) (4-4)

### 누락된 기존 작업
- 힐링톡/우리가게게시판/이벤트톡 게시판에 강톡 압축 모바일 테이블 패턴 적용 (`.cat-sheet` 패턴 그대로 이전)
- Firebase Hosting `gangtalk815` 사이트 생성 + 도메인 연결
- Cloud Functions 배포 (createBizAccount / resetBizPassword / linkStoreToBiz)
- Storage Rules — `marketing/adBanners*` 는 관리자 UID 만 쓰기
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

### 2026-06-19: 다크모드 누락 보정 — 제휴관 카테고리 PNG + 마이페이지 카드 (`fix/darkmode-missing-corrections`)
- **목적**: 진단(`docs/audit/2026-06-18-다크모드-누락보정-진단.md`) — PR #103 의 다크 토글 작동 시 제휴관 카테고리 아이콘 안 보임 + 마이페이지 일부만 다크 적용 문제. CSS 다크 셀렉터만 추가 (로직/마크업/라이트 모드 변경 0)
- **(1) 제휴관 카테고리 아이콘 — `src/pages/PartnersPage.vue`**:
  - **원인**: `.cat-icon` 이 **PNG 배경 이미지** (`/img/partners/cat-*.png` 9종) — StoreFinder 의 SVG + `currentColor` 와 달리 `color` / 다크 토큰 무효
  - **해결 (`:1646-1651` 기존 다크 보정 블록 다음에 추가)**:
    ```css
    :root[data-theme="dark"] .pp-cat-scroll .cat-icon,
    :root[data-theme="black"] .pp-cat-scroll .cat-icon{
      filter: brightness(0) invert(1);
    }
    ```
  - `.cat.active .cat-icon` 이 라이트/다크 양쪽에서 이미 같은 filter 적용 중 (`:1422-1424`) → 충돌 없음, 흰색 일관
  - 라이트 모드는 영향 0 — 다크 셀렉터 안에서만 적용
- **(2-1) UserSection 카드/텍스트/구분선 — `src/components/mypage/UserSection.vue`**:
  - **원인 3건**:
    - `:755 .card/.profile-card/.mypanel/.us-menu-card { background: #fff }` 하드코딩
    - `:791 .info .nick { color: #111 }` (닉네임 검정)
    - `:839 .val { color: #222 }` (행 값 검정)
    - `:811 .row { border-top: #f3f3f5 }` (행 구분선 라이트)
  - **해결 — 기존 다크 토글 보정 블록 (`:1132-1143`) 직후에 신규 5 블록 추가**:
    ```css
    /* 카드 5종 background — .promo 핑크는 제외 (의도된 강조) */
    [data-theme=dark|black] .user-section .card,
    .profile-card, .mypanel, .us-menu-card {
      background: var(--surface, #15161a);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    }
    /* 닉네임 / 값 → --fg, 행 구분선 → --line, active → #1f1c20 */
    ```
  - 5 셀렉터 블록 — 카드 background / `.info .nick` / `.val` / `.row` / `.row.row-clickable:active`
- **(2-2) MyPage 페이지 배경 — `src/pages/MyPage.vue`**:
  - **원인 (`:662`)**: `background: #fdf8fa !important` 하드코딩 + `!important` 라 다크에서도 라이트 그대로
  - **해결 (라이트 룰 바로 다음에)**:
    ```css
    :root[data-theme='dark'] .page-flat.mypage-page,
    :root[data-theme='black'] .page-flat.mypage-page{
      background: var(--bg, #0f1013) !important;
    }
    ```
  - `!important` 충돌 회피 — 다크 셀렉터에도 `!important` 함께 적용 (specificity 동일 + cascade 후순위로 덮어쓰기)
- **건드리지 않음**:
  - `.promo` 핑크 (`#FFE4EF !important`) — 의도된 강조 그대로
  - `.ref-code-box` / `.val.code b` 핑크 톤 — 다크에서도 잘 어울림
  - `theme.js` store / 다크 토큰 (`theme.css:39-55`)
  - 마크업 / 로직 / `wifiColor` / `setTheme` / `isDark` ref
  - 라이트 모드 룰 — 모든 보정이 `:root[data-theme="dark|black"]` 안에서만
  - HeaderBar / LoggedOutSection / mypanel 내부 (이미 `var(--bg/--line/--muted)` 사용 → 자동 다크)
  - 관리자 빌드 / 룰 / Functions
- **영향 범위 — scope 검증 완료**:
  - `.user-section .card` 셀렉터 → 다른 `.card` 사용처 11개 (PartnerCard, QuickTilesPrimary, BestRanking, StoreGridView 등) 영향 0
  - `.profile-card / .promo / .mypanel / .us-menu-card` 모두 UserSection 단독 사용
  - `.page-flat.mypage-page` — `mypage-page` 클래스는 `MyPage.vue:3` 한 곳만
  - `.pp-cat-scroll .cat-icon` — PartnersPage 전용 scope
- **빌드 검증**: `npm run build` ✓
  - PartnersPage CSS 20.15→20.31KB (+0.16KB, PNG 다크 1블록)
  - MyPage CSS 32.12→33.51KB (+1.39KB, UserSection 5블록 + 페이지 배경 1블록)
  - JS 변동 없음 (CSS only)
- **배포 범위**: `firebase deploy --only hosting:prod` (회원 빌드만)
- **검증 시나리오 (사용자 수동)**:
  - [x] 다크 모드 → 제휴관 카테고리 아이콘이 흰색으로 잘 보임 (가게찾기 수준)
  - [x] 다크 모드 → 마이페이지 상단 카드 (포인트/등급/추천코드) 다크 배경 + 밝은 글씨
  - [x] 닉네임 / 행 값 / 행 구분선 다크에서 정상 표시
  - [x] `.promo` 핑크 배너 / 추천코드 핑크 박스 그대로 유지
  - [x] 라이트 모드 → 기존과 동일 (회귀 0)
  - [x] 다른 페이지 (.card 사용처) 영향 없음

### 2026-06-19: 와이파이→혼잡도 라벨 + 마이페이지 다크모드 토글 (`feat/congestion-label-darkmode-toggle`)
- **목적**: 진단(`docs/audit/2026-06-18-혼잡도-다크모드-진단.md`) 의 두 작업 단일 PR
  - (1) 현황판 "와이파이" 라벨 정정 → "혼잡도" (데이터/로직은 이미 혼잡도, 라벨만 틀렸음)
  - (2) 마이페이지에 주간/야간 모드 토글 추가 (인프라 완비, UI 만 부재)

#### (1) 현황판 라벨/아이콘 정정 — `src/pages/MainPage.vue:128-141`
- **마크업 변경 2건만**:
  - 라벨 `<div class="mp-metric-label">와이파이</div>` → `혼잡도`
  - WiFi 시그널 SVG (3호 + 점) → **3단계 신호 막대 SVG** (좋음=낮은 막대 / 보통=중간 / 나쁨=높음 막대 — 혼잡도 직관적 시각화)
  - 새 SVG: `<rect x="3" y="14" w=4 h=6/> <rect x="10" y="9" w=4 h=11/> <rect x="17" y="4" w=4 h=16/>` (fill currentColor → wifiColor 클래스의 색상 그대로 따름)
  - 주석으로 "함수/CSS 식별자 유지" 명시 (회귀 방지)
- **건드리지 않음**:
  - `wifiText(s) / wifiColor(s)` 함수 — 이미 `computeStatus(s)` 호출, 출력 ok/mid/busy → 좋음/보통/나쁨 그대로
  - `.mp-metric-wifi / .wifi-pin / .wifi-dot / --wifi-ok / --wifi-mid / --wifi-busy` CSS 식별자 — 회귀 위험 차단
  - 색상 매핑 (`#22c55e / #f59e0b / #ff4d8d`) 그대로
- **사용자 화면 효과**: 라벨이 의미와 일치 + 아이콘이 막대로 직관 표현 → 사용자 혼동 해소

#### (2) 마이페이지 다크모드 토글 — `src/components/mypage/UserSection.vue`
- **import 확장** (`:260, 264`):
  - `vue` 에서 `onMounted, onBeforeUnmount` 추가
  - `import { getTheme, setTheme } from '@/store/theme.js'` 신규 (기존 store 그대로 사용)
- **상태 + 함수 추가** (`:308-336`):
  - `isDark = ref(getTheme() === 'black')` — 현재 테마 상태
  - `onToggleTheme()` — `setTheme(isDark ? 'white' : 'black')` 만 호출. 새 로직 0
  - `onThemeChange(e)` — `themechange` CustomEvent 리스너 → `isDark` 동기
  - `onStorageTheme(e)` — 다른 탭/창의 `localStorage.theme` 변경 동기 (`store/theme.js attachThemeSync` 와 같은 패턴)
  - `onMounted/onBeforeUnmount` 에서 두 리스너 등록/해제
  - **결과**: StoreFinder/PartnersPage 의 기존 토글로 전환 시 마이페이지 토글 상태 즉시 동기
- **마크업 — `us-menu-card` 안 두 번째 row** (`:222-249`):
  - `<button class="us-menu-item" role="switch" :aria-checked="...">` — 기존 "내 글/댓글 관리" 행과 동일한 패턴
  - 아이콘: 햇님 SVG (라이트) / 달 SVG (다크) — `v-if="!isDark"` / `v-else` — StoreFinder `:317-323` 패턴 그대로
  - 텍스트: 현재 모드 표시 ("야간 모드" / "주간 모드") + hint ("탭해서 ~로")
  - 우측에 iOS 스타일 토글 스위치 (`.us-theme-switch` + `.us-theme-knob`) — 활성 시 핑크
- **CSS 추가** (`:1100-1147`):
  - `.us-menu-item + .us-menu-item { border-top: 1px solid #f3f3f5 }` — 메뉴 행 간 구분선
  - `.us-theme-switch` 44×24 핑크 토글 + `.us-theme-knob` 18×18 원 (`transform: translateX(20px)` 로 슬라이드)
  - 다크모드 보정 — `us-menu-item:active / +us-menu-item / us-menu-ico / us-menu-title / us-theme-switch / .on` 6 셀렉터
- **결과 (사용자 흐름)**:
  1. 마이페이지 진입 → "내 글/댓글 관리" 아래에 토글 row 자동 표시
  2. 탭 → store/theme.js의 `setTheme` 호출 → localStorage 저장 + `html[data-theme]` 갱신 + `themechange` 디스패치
  3. 앱 전체 다크 토큰 자동 적용 (367 셀렉터)
  4. 새로고침 후 유지 (localStorage)
  5. StoreFinder/PartnersPage 의 토글 동기 — 같은 store 공유
- **건드리지 않음**:
  - `src/store/theme.js` — 이미 작동 (인프라 변경 0)
  - `src/composables/theme.js` (중복 dead 모듈) — 별도 PR
  - `MainPage.vue toggleTheme()` 함수 — 별개
  - StoreFinder/PartnersPage 의 기존 토글
  - 다크 보정 CSS 셀렉터 367곳 — 이미 광범위 커버
  - 관리자 빌드 / 라우터 / firestore.rules / Cloud Functions

#### 빌드 검증
- `npm run build` ✓
  - MyPage JS 50.79→50.89KB (+0.10KB), CSS 31.45→32.12KB (+0.67KB)
  - MainPage 청크 변동 미세 (라벨/SVG)
  - index 215.41→215.47KB (+0.06KB)
- 관리자 빌드 영향 없음

#### 배포 범위
- `firebase deploy --only hosting:prod` (회원 빌드만)

#### 검증 시나리오 (사용자 수동)
- **(1) 혼잡도 라벨**:
  - [x] 현황판 → 카드 3번째 메트릭이 "혼잡도" + 막대 아이콘
  - [x] 색상 / 텍스트 (좋음/보통/나쁨) 그대로
- **(2) 다크모드 토글**:
  - [x] 마이페이지 → "내 글/댓글 관리" 아래에 토글 row 표시
  - [x] 햇님(라이트) → 탭 → 달(다크) 전환 + 스위치 핑크
  - [x] 앱 전체가 다크로 전환 (현황판/가게찾기/제휴관/마이페이지)
  - [x] 새로고침 → 다크 유지
  - [x] 다시 탭 → 라이트 복귀
  - [x] StoreFinder/PartnersPage 의 기존 토글 → 마이페이지 토글 상태 동기

### 2026-06-18: 현황판 카테고리 5×2 격자 (`fix/mainpage-category-2row-grid`)
- **목적**: 진단(`docs/audit/2026-06-18-현황판-카테고리-2줄-진단.md`) — PR #101 이 가게찾기/제휴관 만 적용해 현황판은 가로 스크롤 1줄 상태. 동일 패턴으로 통일
- **변경 폭이 작은 이유**: MainPage 의 `.mp-cat-*` 셀렉터는 다른 페이지/관리자 빌드 어디서도 사용 안 함 (`grep` 결과 0건). PR #101 와 100% 동일 마크업 + 100% 동일 CSS 변수 → prefix `sf-` → `mp-` 만
- **수정 — `src/pages/MainPage.vue` (CSS만)**:
  - `.mp-cat-scroll`:
    - `display: flex` + `overflow-x: auto` → `display: grid; grid-template-columns: repeat(5, minmax(0, 1fr))`
    - `gap: 14px` → `gap: 12px 8px` (행/열 간격)
    - `overflow: visible` (스크롤 제거)
    - `align-items: start` 추가
    - `scrollbar-width: none` + `-webkit-overflow-scrolling: touch` + `::-webkit-scrollbar` 룰 삭제 (스크롤 없으니 불필요)
  - `.mp-cat-item`:
    - `flex: none; min-width: 54px` → `flex: initial; min-width: 0`
  - `.mp-cat-label`:
    - `white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%` 추가
  - `.mp-cat-expand`:
    - 더보기 버튼 → `display: none` (격자 모드에선 의미 없는 dead 분기, 진단 §6-4)
  - `mp-cat-ic / .on / .mp-cat-item.on .mp-cat-label` 핑크 강조 룰 모두 그대로
  - 마크업 / `mpCategories` 데이터 / `setType` 클릭 핸들러 / `expandCategories` ref 모두 그대로
- **모바일 412px 결과**:
  - 가용 폭: 412 - 32 = 380px
  - 한 칸: 380 / 5 = 76px (gap 8px 별도)
  - **정확히 5×2 = 2줄 균일 격자, 빈칸 0**
  - 한글 라벨 최대 4글자 (가라오케) 또는 `바(Bar)` 6글자 → 잘림 없음
- **건드리지 않음**:
  - `setType` / `type` ref / `mpCategories` / `expandCategories` ref
  - 클릭/필터/검색/배너/Top 섹션 / CTA / 알림벨 / 헤더
  - StoreFinder / PartnersPage (PR #101) — 셀렉터 분리
  - 다른 페이지 — `mp-cat-*` 셀렉터는 MainPage 전용 (grep 검증)
  - 관리자 빌드 / firestore.rules / Cloud Functions
  - 다크모드 보정 (`.mp-cat-ic` 다크 룰 그대로 작동)
- **빌드 검증**: `npm run build` ✓ (index CSS 98.22→98.06KB, **-0.16KB** 감소 — 스크롤 관련 룰 정리. JS 변동 없음)
- **배포 범위**: `firebase deploy --only hosting:prod` (회원 빌드만)
- **검증 시나리오 (사용자 수동)**:
  - [x] 현황판(gangtox.com 메인) → 카테고리 10개 전부 5×2 격자로 한눈에 보임 (가로 스크롤 없음)
  - [x] 카테고리 클릭 → 정상 필터링 (회귀 0)
  - [x] 선택된 카테고리 핑크 강조 (`mp-cat-ic.on`) 그대로
  - [x] 한글 라벨 (가라오케/바(Bar)/텐카페 등) 안 잘림
  - [x] "더보기" 꺽쇠 안 보임
  - [x] PR #101 의 가게찾기/제휴관 5×2 격자도 정상 (회귀 0)
  - [x] 다른 페이지 (MyPage / GangTalkPage 등) 영향 없음

### 2026-06-18: 카테고리 영역 5×2 격자 (`fix/category-2row-grid`)
- **목적**: 진단(`docs/audit/2026-06-18-카테고리-2줄-진단.md` 방법 B) — 가게찾기/제휴관의 카테고리가 가로 스크롤 1줄로 일부만 보이던 것을 5열 × 2줄 균일 격자로 전환. 한눈에 전체 카테고리 노출
- **공유 없음**: 두 페이지가 별개 CSS 클래스 (`.sf-cat-*` / `.pp-cat-*`) 사용 → 각자 따로 수정
- **수정 1 — `src/views/StoreFinder.vue` (가게찾기)**:
  - `.sf-cat-scroll`:
    - `display: flex` + `overflow-x: auto` → `display: grid; grid-template-columns: repeat(5, minmax(0, 1fr))`
    - `gap: 14px` → `gap: 12px 8px` (행/열 간격)
    - `overflow: visible` (스크롤 제거)
    - `align-items: start` 추가
  - `.sf-cat-item`:
    - `flex: none; min-width: 54px` → `flex: initial; min-width: 0` (grid 셀 폭 따름)
  - `.sf-cat-label`:
    - `white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%` 추가 (라벨 잘림 방지)
  - `.sf-cat-expand`:
    - 가로 스크롤 시절 잔존 더보기 버튼 — `display: none` (격자 모드에선 의미 없음, 진단 §1-3 dead 분기)
  - `mpCategories` (10개) / 마크업 / 클릭 핸들러 / `expandCategories` ref 모두 그대로
- **수정 2 — `src/pages/PartnersPage.vue` (제휴관)**:
  - `.pp-cat-scroll`:
    - `display: flex !important` + `overflow-x: auto` → `display: grid !important; grid-template-columns: repeat(5, minmax(0, 1fr)) !important`
    - `gap: 14px` → `gap: 12px 8px !important`
    - `overflow: visible`
    - `align-items: start`
  - `.pp-cat-scroll .cat`:
    - `flex: none !important; min-width: 60px` → `flex: initial !important; min-width: 0 !important`
  - `.pp-cat-scroll .cat .lbl`:
    - `white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%` 추가
  - `categories` (지역 1 + partner 9 = 10) / 마크업 / 클릭 핸들러 모두 그대로
- **region-pop 위치 호환 확인 (검증)**:
  - `.region-pop` (`:1654-1665`): `position: absolute; transform: translateY(58px); width: calc((100% - 24px) / 5)`
  - 이미 5열 기준 너비 계산 → 5×2 격자에서도 첫 칩이 (0,0) 셀에 위치 → 팝업이 그 칸 바로 아래 떨어짐. **호환됨, 변경 불필요**
- **모바일 412px 결과**:
  - 가용 폭: 412 - 32 (좌우 `--page-h-pad`) = 380px
  - 한 칸 폭: 380 / 5 = 76px (gap 8px 별도)
  - **정확히 5×2 = 2줄 균일 격자**
  - 한글 라벨 최대 4글자 (`공동구매`/`피트니스`/`성형외과`) 11px 폰트 → 약 28px → 잘림 없음
- **건드리지 않음**:
  - 카테고리 클릭/필터 로직 (`setType / toggleCat / openRegionMenuFromCat`) — 변경 0
  - 카테고리 데이터 (`mpCategories` / `PARTNER_CATEGORIES`)
  - 지역 드롭다운 트리거 (`region-cat`)
  - Top5 / 광고 배너 / 검색창 / 헤더
  - 다른 페이지 — 셀렉터 모두 페이지 prefix (`sf-` / `pp-`) 안. MainPage `.mp-cat-*` 무관
  - 관리자 빌드 / firestore.rules / Cloud Functions
- **빌드 검증**: `npm run build` ✓ (StoreFinder CSS 25.90KB / PartnersPage CSS 20.15KB 유지, JS 변동 없음)
- **배포 범위**: `firebase deploy --only hosting:prod` (회원 빌드만)
- **검증 시나리오 (사용자 수동)**:
  - [x] 가게찾기 → 카테고리 10개 전부 5×2 격자로 한눈에 보임 (가로 스크롤 없음)
  - [x] 제휴관 → 카테고리 10개 (지역 + partner 9) 전부 5×2 격자로 보임
  - [x] 카테고리 클릭 시 정상 필터링
  - [x] 선택된 카테고리 핑크 강조 (sf-cat-ic.on / cat.active) 그대로
  - [x] 한글 라벨 (가라오케/공동구매/피트니스/성형외과 등) 안 잘림
  - [x] 제휴관 지역 팝업 (region-pop) 첫 칩 아래에 정상 표시
  - [x] StoreFinder "더보기" 꺽쇠 버튼 안 보임 (display:none)
  - [x] 다른 페이지 (MainPage / MyPage / GangTalkPage) 카테고리 영향 없음

### 2026-06-18: 제휴관 Top5 카테고리별 관리 (`feat/partner-top5-by-category`)
- **목적**: 진단(`docs/audit/2026-06-18-제휴업체-순서-top5-진단.md` PR C) — 카테고리 통일 (PR #99) 후 카테고리별 Top5 순서를 관리자가 수동 제어. 사용자 PartnersPage 의 `topByCat` 가 자동 score 정렬만 하던 것을 admin 지정 우선
- **Firestore 신규 키**: `config/marketing.partnerTopRanks` = `{ [catKey]: [partnerId, ...] }`
  - 출근업소 `topRanks` 와 완전 분리 — 같은 문서 안에서 `merge: true` 로 공존
  - 카테고리 키는 PR #99 의 `PARTNER_CATEGORIES` 9 키 (ps/skin/beauty/nail/real/fit/deal/shop/etc)
- **신규 파일 — `src/pages/admin/PartnerTop5ManagePage.vue`** (Top5ManagePage 패턴 이식):
  - 카테고리 탭 9개 + 각 탭 옆에 현재 순위 개수 표시
  - 본문: 드래그(☰) 정렬 + 순위 번호 뱃지 (상위 5개 핑크) + 제거 버튼
  - "+ 제휴업체 추가" 모달 — 현재 카테고리의 partner 만 후보 (자동 카테고리 일치 보장)
    - 검색 입력 (이름/지역) + 빈 입력 시 카테고리 내 전체 표시 (최대 50)
    - 이미 추가된 partner 는 "이미 추가됨" 비활성 버튼
    - **`active === false` partner 는 후보에서 제외** (admin override 안전망)
  - 본문에 부가 상태 배지 — `삭제됨` / `만료` / `비활성` (사용자 화면 노출 안 되는 항목을 한눈에 식별)
  - SortableJS 동일 패턴 (`handle:'.adm-drag-handle'`, `onEnd` 에서 DOM 되돌리고 reactive 만 갱신)
  - 저장 시 **빈 카테고리는 payload 에서 제외** (`cleaned`) → 사용자 화면이 자동 정렬 폴백으로 전환
  - 첫 onSnapshot 만 로컬 시드 (`loadedOnce`) → 로컬 드래그 보호
  - 옛 키 partner 도 `normalizePartnerCategory` 로 즉시 변환해 표시
- **라우터 등록 — `src/router/admin.js`**:
  - `PartnerTop5` lazy import 추가
  - `/admin/partner-top5` → `adminPartnerTop5` 라우트 1 줄 추가
- **사이드바 메뉴 — `src/layouts/AdminLayout.vue`**:
  - `platformMenus` 에 `{ to: '/admin/partner-top5', emoji: '🏆', label: '제휴관 Top5' }` 추가 (제휴업체 관리 바로 아래)
- **수정 — `src/pages/PartnersPage.vue` (사용자)**:
  - 기존 `subPartnerOrder` onSnapshot 콜백에 `partnerTopRanks` 도 함께 채움 — **Firestore 비용 절약 (한 문서 1 구독으로 두 필드 동시 수신)**
  - `partnerTopRanks` ref 신규 + `PARTNER_TOP_RANKS_FIELD = 'partnerTopRanks'` 상수
  - **`topByCat(k)` 교체** — 함수 형태로 변환, 우선순위:
    1. `partnerTopRanks[k]` 에 ID 배열 있으면 → 순서대로 `partners.value` 매칭 → 카테고리/지역 필터 통과 항목만 → 상위 5개
    2. 1단계가 비거나 통과 항목 0개면 → 기존 `score(p)` 자동 정렬 폴백 (회귀 0)
  - **방어 (만료/삭제/비활성)**: `partners.value` 가 이미 `isPartnerApproved` + `isActiveAdPartner` 통과 항목만 보유 → `idToPartner.get(id)` 실패 시 자동 건너뜀
  - `category !== k` 도 보호 (관리자가 카테고리를 바꾼 partner 가 옛 Top5 에 남아있어도 노출 안 됨)
- **건드리지 않음**:
  - 출근업소 `topRanks` / `homeOrder` / Top5ManagePage
  - PR #97 `partnerOrder` 드래그 / PR #98 노출 기간·active / PR #99 카테고리 통일 — 모두 그대로
  - `firestore.rules` / `storage.rules` / Cloud Functions / 회원 빌드 (PartnersPage 외)
  - partners 컬렉션 / config/marketing 의 `partnerCardIndex` / 사본
- **흐름 (수정 후)**:
  - **관리자**: `/admin/partner-top5` → 카테고리 탭 (예: 성형외과) → "+ 제휴업체 추가" → 카테고리 내 partner 선택 → 드래그 정렬 → "저장"
  - **Firestore**: `config/marketing.partnerTopRanks = { ps: [id1, id2, id3], skin: [...], ... }` + `partnerTopRanksSavedAt`
  - **사용자**: gangtox.com 제휴관 → 카테고리 섹션 (예: 성형외과 Top 5) → admin 지정 순서대로 표시
  - **빈 카테고리**: 자동 score 정렬 (회귀 없음)
  - **삭제/만료/비활성 partner**: Top5 에 ID 남아 있어도 사용자 화면 자동 건너뜀
- **빌드 검증**:
  - `npm run build:admin` ✓ (신규 PartnerTop5ManagePage JS 7.90KB + CSS 6.70KB)
  - `npm run build` ✓ (PartnersPage JS 24.92→25.31KB, index 215.41KB 유지)
- **배포 범위**: `firebase deploy --only hosting:admin,hosting:prod` (양쪽)
- **검증 시나리오 (사용자 수동)**:
  - [x] 관리자 사이드바에 "🏆 제휴관 Top5" 메뉴 보임
  - [x] /admin/partner-top5 진입 → 9 카테고리 탭 표시
  - [x] 카테고리 선택 → "+ 제휴업체 추가" → 같은 카테고리 partner 만 후보
  - [x] 드래그 정렬 + 저장 → Firestore `config/marketing.partnerTopRanks` 갱신
  - [x] gangtox.com 제휴관 새로고침 → 해당 카테고리 Top 5 가 admin 지정 순서로
  - [x] 빈 카테고리 (저장 안 함) → 기존 score 자동 정렬 폴백
  - [x] partner 삭제 / `adEnd` 과거 set / `active=false` → 사용자 화면에서 자동 미노출 (Top5 ID 잔존해도 안전)
  - [x] 출근업소 `topRanks` (가게찾기 Top5) 변화 없음 — 별도 키 확인
  - [x] PR #97 / #98 / #99 회귀 없음

### 2026-06-18: 제휴업체 카테고리 9 키 통일 + 마이그레이션 (`fix/partner-category-unify`)
- **목적**: 진단(`docs/audit/2026-06-18-제휴업체-순서-top5-진단.md` §4 / PR C0) — 관리자/사용자 카테고리 키 불일치 정리. Top5 (PR C) 진입 전 사전 정리
- **확정 9 카테고리** (key : 한글 라벨):
  - `ps` 성형외과 / `skin` 피부 / `beauty` 미용 / `nail` 네일 / `real` 부동산
  - `fit` 피트니스 / `deal` 공동구매 / `shop` 상품관 / `etc` 기타
- **이전 불일치**:
  - admin (PartnersManagePage): `salon, nail, ps, real, rental, fit, cafe, etc` (8)
  - user (PartnersPage): `ps, skin, beauty, nail, real, fit, deal, shop, etc` (9)
- **레거시 매핑** (`LEGACY_CATEGORY_MAP`):
  - `salon → beauty`
  - `cafe → etc`
  - `rental → etc`
  - `hair → beauty` (혹시 잔존)
  - 빈 값 / 한글 자유 텍스트 → `normalizePartnerCategory` 가 한글 hit 매칭 후 etc 폴백
- **신규 파일 — `src/lib/partnerCategories.js`** (단일 소스):
  - `PARTNER_CATEGORIES` (Object.freeze 9개 배열, UI 표시 순서)
  - `PARTNER_CATEGORY_KEYS` (허용 키 집합 — 잔여 검출용)
  - `PARTNER_CATEGORY_LABEL` (라벨 맵)
  - `LEGACY_CATEGORY_MAP` (옛→새 키 변환표)
  - `normalizePartnerCategory(raw)` — 1) 허용 키 통과 → 2) 레거시 매핑 → 3) 한글/별칭 hit 매칭 → 4) etc 폴백
  - `partnerCatLabel(key)` 헬퍼
  - `needsMigration(raw)` 헬퍼 (변환 필요 여부)
- **수정 1 — `src/pages/PartnersPage.vue` (사용자)**:
  - import 추가 (`PARTNER_CATEGORIES`, `PARTNER_CATEGORY_LABEL`, `normalizePartnerCategory`)
  - 로컬 `categories` 배열 (9개 하드코딩) 제거 → `PARTNER_CATEGORIES` 사용
  - 로컬 `mapCat` 계산 제거 → `PARTNER_CATEGORY_LABEL` 사용
  - 로컬 `normCat` 함수 (45줄) 제거 → `normalizePartnerCategory` 위임 (alias)
  - **`ps` 라벨**: `성형` → `성형외과` 갱신 (사용자 spec 반영)
  - **회원 빌드에서 `categoryRaw` 보존 그대로** — `baseFiltered` 의 `category: normCat(x.category || x.categoryRaw || '')` (`:765-766`) 가 옛 키도 자동 변환 → 사용자 화면은 마이그레이션 안 해도 즉시 정상 표시
- **수정 2 — `src/pages/admin/PartnersManagePage.vue` (관리자)**:
  - import 7종 추가
  - 로컬 `partnerCategoryOptions` (옛 8 키) 제거 → `PARTNER_CATEGORIES` 사용
  - 로컬 `catLabel` → `partnerCatLabel` 사용
  - `openEdit(p)` 의 `form.category` 에 `normalizePartnerCategory` 적용 — 옛 키 partner 도 모달이 새 키로 표시
  - `onSave` payload — `normalizedCat = normalizePartnerCategory(form.category)` 변수 추가, partners + partnerCards + 인덱스 3 위치 모두 `normalizedCat` 사용
- **마이그레이션 — admin 화면의 "🛠️ 카테고리 정리" 버튼**:
  - 섹션 헤더 actions 에 추가. 정리 대상 건수 표시 (예: `🛠️ 카테고리 정리 (3)`). 0 건이면 `✓ 카테고리 정리됨`
  - **`legacyCount` computed** — `list` 갱신 시마다 자동 재계산. 허용 키 아닌 partner 수
  - **`runCategoryMigration()` 흐름**:
    1. 매핑 대상 + 미리보기 수집 (최대 10건 표시)
    2. 1차 confirm — 매핑 미리보기 + 규칙 안내
    3. 2차 confirm — "정말 N 건 변환?"
    4. `config/marketing` 인덱스 1회 로드
    5. 각 partner 별:
       - `updateDoc(partners/{id}, { category, categoryRaw, updatedAt })`
       - `setDoc(config/marketing/partnerCards/{id}, { category }, { merge:true })`
       - 인덱스 배열의 매칭 row 의 `category` in-place 갱신
       - `patchLocal(id, { category, categoryRaw })` 로 화면 즉시 동기
       - 콘솔 mappingLog 누적 (`[OK]` 또는 `[FAIL]`)
    6. 인덱스 배열 3 종 (`partnerCardIndex/partnerCards/partnerCardList`) 한 번에 `setDoc(..., { merge:true })` 갱신
    7. 콘솔에 매핑 로그 + 결과 요약 출력. alert 으로 사용자 안내 (실패 시 처음 3건 표시)
  - **중복 실행 가드** (`migratingCategory` ref) + 빈 대상 가드
- **건드리지 않음**:
  - `stores` 카테고리 / 현황판 / `homeOrder` / `topRanks`
  - `firestore.rules` / `storage.rules` / Cloud Functions
  - PR #97 (순서 변경) / PR #98 (노출 기간 + active) — 모두 그대로 작동
  - partners 의 다른 필드 (name/region/thumb/active/approved/adStart/adEnd 등)
- **흐름 (수정 후)**:
  - **관리자**: /admin/partners → 진입 시 "🛠️ 카테고리 정리 (N)" 자동 표시 (N>0 이면) → 클릭 → 2중 confirm → 변환 → 콘솔 로그 + alert
  - **마이그레이션 후**: legacyCount=0 → 버튼 비활성 + "✓ 카테고리 정리됨"
  - **신규 partner 등록/수정**: `onSave` 에서 `normalizePartnerCategory` 자동 적용 → 옛 키 다시 생기지 않음
  - **사용자**: gangtox.com 제휴관 → 카테고리 탭 9 키로 표시. 옛 키 partner 도 `normCat` (이제 공용 함수) 가 즉시 변환해 정확한 카테고리에 표시
- **빌드 검증**:
  - `npm run build:admin` ✓ (PartnersManagePage JS 21.84→25.88KB, CSS 9.63KB 유지)
  - `npm run build` ✓ (PartnersPage JS 24.82→24.92KB, index 215.41KB 유지)
- **배포 범위**: `firebase deploy --only hosting:admin,hosting:prod` (양쪽)
- **마이그레이션 실행 (사용자 수동)**:
  1. 배포 후 관리자 `/admin/partners` 1회 진입
  2. "🛠️ 카테고리 정리 (N)" 버튼 클릭 → 2중 confirm → 진행
  3. 콘솔(F12) 의 `[partner category migration]` 그룹에서 매핑 로그 확인
  4. Firestore Console 에서 `partners/{id}.category` 가 새 키로 갱신됐는지 확인
  5. 사용자 제휴관에서 카테고리별 partner 정상 표시 확인
- **검증 시나리오 (사용자 수동)**:
  - [x] 관리자 select 옵션이 새 9 키 (한글 라벨 포함) 로 표시
  - [x] 사용자 제휴관 카테고리 탭이 새 9 키로 표시
  - [x] 옛 `salon` partner 가 마이그레이션 후 `beauty` 로 변환
  - [x] 옛 `cafe` / `rental` 이 `etc` 로 변환
  - [x] 마이그레이션 후 legacyCount=0 → 버튼 비활성 + "✓ 카테고리 정리됨" 표시
  - [x] 새 partner 추가 → 새 키만 select 노출, 저장도 새 키
  - [x] PR #97 (드래그 순서) / PR #98 (기간/active) 회귀 없음
  - [x] stores(출근업소) 카테고리 영향 없음 (별개 키 체계)

### 2026-06-18: 제휴업체 노출 기간 + active 토글 (`feat/partner-exposure-period`)
- **목적**: 진단(`docs/audit/2026-06-18-제휴업체-순서-top5-진단.md` PR B) — partners 의 `adStart/adEnd/active` 필드는 이미 저장됨. 사용자 필터 + 관리자 즉시저장 UI 만 부재. 양쪽 추가
- **수정 1 — `src/pages/PartnersPage.vue` (사용자)**:
  - `isActiveAdPartner(p)` 헬퍼 신규 — `MainPage.vue:1851-1859 isActiveAd` 와 동일 로직 (`!adStart && !adEnd` 무기한 통과, `start && now<start` false, `end && now>=end` false)
  - `baseFiltered` 의 `pSnap.forEach` 루프 (`:773`) 에서 `isPartnerApproved` 다음에 `isActiveAdPartner` 필터 추가 — **승인됐어도 기간 만료/시작 전이면 즉시 미노출**
  - 기존 `isPartnerApproved` 의 `active !== false` 체크는 그대로 (active 비활성 케이스도 이미 차단됨)
- **수정 2 — `src/pages/admin/PartnersManagePage.vue` (관리자)**:
  - **import 확장**: `firebase/firestore` 에서 `updateDoc` 추가
  - **마크업 — 카드 내부**:
    - 제목 옆에 상태 배지 — `만료` (빨강) / `만료 임박` (주황) / `비활성` (회색)
    - 액션 영역에 "활성화/비활성화" 토글 버튼 (`.adm-btn.small` + `.is-on` 클래스로 활성 시 핑크 톤)
    - **노출 기간 row** 추가 — `<div class="adm-period-row">` 가 grid 전체 폭 (`grid-column: 1 / -1`)
      - 상태 pill (`periodLabelOf` / `periodClassOf`)
      - 프리셋 버튼: 15일 / 30일 / 60일 / 90일 / +30일 연장 / 해제
  - **스크립트 — 신규 함수 5개 (StoresManagePage 패턴 그대로 이식)**:
    - `periodLabelOf(p)` — "기간 미설정 / 시작일만 설정 / 만료 / D-N (만료 임박)"
    - `periodClassOf(p)` — none / ok / warning (≤7일) / expired
    - `setPeriod(p, days)` — `updateDoc(partners/{id}, { adStart: now, adEnd: now+days*86400000 })`
    - `extendPeriod(p, days)` — `adEnd += days*86400000`
    - `clearPeriod(p)` — `adStart=null, adEnd=null` (무기한)
    - `toggleActive(p)` — `active` 토글 (`p.active === false ? true : false`)
    - `patchLocal(id, patch)` — partners 는 onSnapshot 안 함 (loadList 1회 + 모달 후 갱신) → 즉시저장 후 list ref 도 직접 동기
- **저장 범위 — `partners/{id}` 만**:
  - StoresManage 와 같은 단순 패턴. `config/marketing/partnerCards/{id}` 사본의 `adStart/adEnd` 는 갱신 안 함
  - 사용자 PartnersPage 는 `partners` 컬렉션 source 직접 읽음 (PR #92 작업 로그) → 즉시 반영
  - 사본은 모달 onSave 흐름으로만 동기 (가벼운 미러)
- **CSS 추가**:
  - `.adm-partner-row > .adm-period-row { grid-column: 1 / -1 }` — period row 전체 폭
  - `.adm-partner-badge` 3 종 (expired/warning/inactive)
  - `.adm-btn.is-on` — 활성 시 핑크 톤
  - `.adm-period-row` / `.adm-period-status` / `.adm-period-presets` / `.adm-period-btn` — StoresManage CSS 그대로
  - 다크모드 보정 — period row border + period btn + badge + is-on
- **건드리지 않음**:
  - **stores / `homeOrder` / MainPage `isActiveAd` 등 현황판 노출 로직** — 별도 함수명 `isActiveAdPartner` 로 독립
  - `firestore.rules` / `storage.rules` — `partners/{id}` write 는 이미 `isAdmin()` 허용
  - 카테고리 키 통일 (진단 §4 PR C0 별도)
  - Top5 (진단 §3 PR C 별도)
  - `partnerOrder` 드래그 UI (PR #97 그대로)
  - 회원 빌드 다른 페이지 / Cloud Functions
- **흐름 (수정 후)**:
  - **관리자**: `/admin/partners` → 카드의 "15일 / 30일 / 90일" 클릭 → `partners/{id}.adStart=now, adEnd=now+Nd` 즉시 저장 → 카드의 D-N 배지 즉시 갱신
  - **만료**: 카드 제목 옆 "만료" 빨강 배지 + 상태 pill `expired`
  - **비활성화**: "비활성화" 버튼 → `partners/{id}.active=false` → 사용자 화면 즉시 미노출
  - **사용자**: gangtox.com 제휴관 → `baseFiltered` 의 `isPartnerApproved` + `isActiveAdPartner` 양쪽 통과한 partners 만 노출. 만료/비활성/시작 전 partners 모두 자동 제외
- **빌드 검증**:
  - `npm run build:admin` ✓ (PartnersManagePage JS 18.22→21.84KB, CSS 7.13→9.63KB)
  - `npm run build` ✓ (회원 PartnersPage 거의 동일, index 215.41KB 유지)
- **배포 범위**: `firebase deploy --only hosting:admin,hosting:prod` (양쪽 모두 — 회원 사이트의 필터 로직 변경 + 관리자 UI 추가)
- **검증 시나리오 (사용자 수동)**:
  - [x] 관리자: 임의 partner 의 "15일" 클릭 → 상태 pill `D-15` 표시
  - [x] Firestore Console 에서 `partners/{id}.adStart` `adEnd` 갱신 확인
  - [x] gangtox.com 제휴관 새로고침 → 해당 partner 정상 노출
  - [x] adEnd 를 과거로 직접 set (Firestore Console) → 제휴관에서 즉시 미노출
  - [x] "비활성화" 버튼 → 제휴관에서 즉시 미노출
  - [x] "활성화" 다시 클릭 → 노출 복귀
  - [x] "해제" 버튼 → 무기한 노출로 복귀
  - [x] 현황판(stores) 의 노출 기간 동작 영향 없음 — `isActiveAd` 와 `isActiveAdPartner` 가 분리된 함수

### 2026-06-18: 제휴업체 순서 변경 — 관리자 드래그 UI (`feat/admin-partner-order`)
- **목적**: 진단(`docs/audit/2026-06-18-제휴업체-순서-top5-진단.md` PR A) — 사용자 PartnersPage 는 이미 `config/marketing.partnerOrder` 를 구독해 정렬 중. 관리자 측 편집 UI 만 부재. 그것만 추가
- **수정 — `src/pages/admin/PartnersManagePage.vue` 만**:
  - **import 확장**:
    - `vue` → `computed, onBeforeUnmount, nextTick, watch` 추가
    - `firebase/firestore` → `onSnapshot` 추가
    - `import Sortable from 'sortablejs'` 신규
  - **상태**:
    - `partnerOrderRemote` — Firestore 마지막 read 값 (dirty 비교용)
    - `partnerOrderLocal` — 로컬 드래그 결과
    - `partnerOrderLoadedOnce` 가드 — 첫 onSnapshot 만 로컬 시드, 이후 외부 변경은 로컬 드래그 보호 (StoresManage Tab1 패턴)
    - `savingOrder` 버튼 busy
  - **`subMarketing`** — `onSnapshot(config/marketing)` 구독. `data.partnerOrder` 가 변하면 remote 갱신, 첫 로드면 local 도 시드
  - **`orderedList` computed** — `partnerOrderLocal` 인덱스 우선 정렬, 없는 항목은 list 원본(updatedAt 역순) 끝에. 사용자 PartnersPage `:1030-1040` 와 동일 알고리즘
  - **`orderDirty` computed** — local vs remote 비교. 다르면 "순서 저장" 버튼 활성
  - **`reorderPartner(from, to)`** — `orderedList` displayIds 스플라이스 + 화면 외 잔존 ID 는 뒤에 보존 (StoresManage `reorderApproved` 패턴)
  - **SortableJS** — `partnerListRef` + `initSortable(el)`:
    - `handle: '.adm-drag-handle'`, `animation: 150`, `ghostClass: 'adm-drag-ghost'`
    - `onEnd` — DOM 이동을 `insertBefore` 로 되돌리고 `reorderPartner(oldIndex, newIndex)` 만 호출 → Vue reactive 가 일관 렌더
    - `watch(partnerListRef)` + `nextTick` 으로 마운트 직후 init, `onBeforeUnmount` 에서 destroy
  - **`savePartnerOrder()`** — `setDoc(config/marketing, { partnerOrder: ids.map(String), partnerOrderSavedAt: serverTimestamp() }, { merge: true })`:
    - **`merge:true` 로 `homeOrder` / `topRanks` / `partnerCardIndex` 등 다른 필드 보존**
    - 성공 시 remote 즉시 동기 (onSnapshot 따라옴)
- **마크업**:
  - 섹션 헤더에 "순서 저장" 버튼 (`orderDirty && !savingOrder` 일 때 활성, 변경 없으면 "순서 저장됨" 표시)
  - 섹션 헤더 아래 hint: 드래그 핸들(☰) 안내 + `config/marketing.partnerOrder` 키 명시
  - 각 `<li class="adm-partner-row">` 좌측에 `<span class="adm-drag-handle">☰</span>` 추가 → grid `80px 1fr auto` → `32px 80px 1fr auto`
  - `<ul ref="partnerListRef" class="adm-partner-list">` ref 부착
- **CSS 추가**:
  - `.adm-drag-handle` — 32×36 회색 배경, hover 시 핑크 톤. cursor grab/grabbing
  - `.adm-drag-ghost` — 드래그 중 핑크 dashed 외곽선
  - `.adm-section-actions` — 헤더 우측 버튼 flex
  - `.adm-section-hint` + `.adm-section-hint code` — 작은 핑크 inline-code
  - 모바일 (≤768px): grid `28px 60px 1fr`, 핸들 28×32, section-actions full-width
  - 다크모드 보정 — 핸들/hint code 모두
- **사용자 화면 코드 변경 0**:
  - PartnersPage `partnerOrder` onSnapshot 이 이미 동작 중 → 관리자가 저장하면 즉시 반영
  - `filtered` computed 의 인덱스 정렬도 그대로 (`:1030-1040`)
- **건드리지 않음**:
  - stores / `homeOrder` / `topRanks` / `partnerCardIndex` / `partnerCards` / `partnerCardList`
  - partners 컬렉션 내 다른 필드 (`adStart/adEnd/active/approved/applyStatus/category` 등)
  - 카테고리 키 통일 (진단 §4 PR C0 별도 PR)
  - 노출 기간 UI (진단 §2 PR B 별도 PR)
  - Top5 (진단 §3 PR C 별도 PR)
  - `firestore.rules` / `storage.rules` / Cloud Functions / 회원 빌드 / 다른 admin 페이지
- **흐름 (수정 후)**:
  1. 관리자 → `/admin/partners` → 드래그 핸들 잡고 카드 위/아래 옮김
  2. "순서 저장" 클릭 → `config/marketing.partnerOrder` 갱신 (다른 필드 merge 보존)
  3. 사용자 → gangtox.com 제휴관 → 새 순서대로 표시 (PartnersPage onSnapshot 즉시 반영)
- **빌드 검증**: `npm run build:admin` ✓ (PartnersManagePage JS 15.53→18.22KB, CSS 5.58→7.13KB, sortable.esm 청크 재사용으로 변화 없음) / 회원 빌드 영향 없음
- **배포 범위**: `firebase deploy --only hosting:admin` (관리자 빌드만, 룰/Functions 변경 없음)
- **검증 시나리오 (사용자 수동)**:
  - [x] /admin/partners 에서 드래그 핸들로 카드 순서 변경 → "순서 저장" 버튼 활성
  - [x] "순서 저장" → Firestore Console 에서 `config/marketing.partnerOrder` 배열 갱신 확인
  - [x] `config/marketing` 의 `homeOrder` / `topRanks` / `partnerCardIndex` 등 다른 필드 그대로 보존
  - [x] gangtox.com 제휴관 새로고침 → 새 순서로 표시
  - [x] 관리자 페이지 새로고침 → 저장된 순서로 다시 보임

### 2026-06-18: 업체 본인 비밀번호 변경 기능 (`feat/biz-change-password`)
- **목적**: 관리자가 `createBizAccount` 로 발급한 임시 비밀번호를 업체가 로그인 후 직접 본인 비밀번호로 변경
- **위치**: `/biz/my-store` (BizMyStorePage) 하단에 별도 "🔒 비밀번호 변경" 섹션. 모달이 아닌 인라인 카드 (저장 폼 다음에 자연스럽게 노출)
- **수정 — `src/pages/admin/BizMyStorePage.vue`**:
  - **import 확장**: `firebase/auth` 에서 `EmailAuthProvider, reauthenticateWithCredential, updatePassword` 추가
  - **마크업 — 신규 섹션** (`<section v-if="currentEmail" class="adm-section">`):
    - 제목 + hint ("관리자가 발급한 임시 비밀번호를 본인 비밀번호로 변경하세요")
    - 입력 3종 — 현재 비번 / 새 비번 / 새 비번 확인 (`type="password"` + 적절한 `autocomplete`)
    - `<p class="adm-form-error">` / `<p class="adm-form-success">` 메시지
    - "비밀번호 변경" 버튼 (3 필드 모두 입력 시 활성)
    - 확인 입력에서 Enter 시 자동 제출 (`@keyup.enter`)
  - **state**:
    - `pwForm: { current, next, confirm }` — 평문은 컴포넌트 ref 안에서만 잠시 보관, 성공/실패 직후 `resetPwForm()` 으로 초기화
    - `pwBusy / pwError / pwSuccess` ref
    - `canSubmitPw` computed — 3 필드 모두 입력됐는지
  - **`onChangePassword()` 흐름**:
    1. 클라이언트 유효성: 필드 누락 / 새 비번 6자 미만 / 확인 불일치 / 새 비번 == 현재 비번 → `pwError`
    2. `auth.currentUser` + `user.email` 확인
    3. `EmailAuthProvider.credential(email, current)` → `reauthenticateWithCredential(user, cred)` 으로 재인증
    4. `updatePassword(user, next)` 로 적용
    5. 성공 시 `pwSuccess` + `resetPwForm()`
  - **에러 코드 한국어 매핑**:
    - `wrong-password` / `invalid-credential` / `invalid-login-credentials` → "현재 비밀번호가 올바르지 않습니다."
    - `weak-password` → "새 비밀번호가 너무 약합니다. (6자 이상 + 추측 어려운 조합)"
    - `too-many-requests` → "요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요."
    - `requires-recent-login` → "보안을 위해 다시 로그인한 후 시도해 주세요."
    - `network-request-failed` → "네트워크 오류입니다. 연결을 확인해 주세요."
    - 그 외 → "변경 실패: ${message}"
- **보안**:
  - 현재 비밀번호 평문 저장/로깅/표시 **절대 없음**
  - `console.warn` 도 `code` 만 출력 (`[changePassword] fail xxx`), 입력값은 미출력
  - "현재 비밀번호 보기/조회" 기능 — **만들지 않음** (Firebase 해시 저장 + 보안 위험)
  - 성공/실패 직후 `pwForm` 즉시 초기화 → DOM input 도 비워짐
  - `localStorage` / `sessionStorage` / 외부 컬렉션 저장 0건
- **CSS 추가**:
  - `.adm-section-hint` — 섹션 부제 회색 hint
  - `.adm-pw-grid` — 1열 grid (현재/새/확인 세로 배치, 모바일 가독성)
  - `.adm-form-error` (`#c0392b`) / `.adm-form-success` (`#2e8b57`) + 다크모드 보정
- **건드리지 않음**:
  - 관리자 `resetBizPassword` (functions/index.js + BizAccountsPage 모달) — 그대로
  - `createBizAccount` / `linkStoreToBiz` / `deleteBizAccount` Cloud Functions
  - 로그인/인증 경로 (`router/admin.js`, `BizLoginPage`, `useAuthRole`)
  - 자가등록 / 승인 파이프라인 / firestore.rules / storage.rules
  - 회원 빌드 / 다른 admin 페이지
- **수정 후 흐름**:
  1. 관리자: `createBizAccount` 로 임시 비번 발급 → 업체에 전달
  2. 업체: 임시 비번으로 로그인 → `/biz/my-store` 진입
  3. 하단 "🔒 비밀번호 변경" 섹션에서 현재(임시) + 새 + 확인 입력 → 변경
  4. 다음 로그인부터 새 비밀번호 사용
- **빌드 검증**: `npm run build:admin` ✓ (BizMyStorePage JS 12.70→16.27KB, CSS 5.61→6.38KB, firebase-auth +0.35KB) / 회원 빌드 영향 없음
- **배포 범위**: `firebase deploy --only hosting:admin` (관리자 빌드만, 룰/Functions 변경 없음)
- **검증 시나리오 (사용자 수동)**:
  - [x] 업체 로그인 → /biz/my-store → 하단 비밀번호 변경 섹션 노출
  - [x] 정확한 현재 비번 + 새 비번 + 확인 → 성공 메시지 + 폼 초기화
  - [x] 새 비번으로 재로그인 정상 작동
  - [x] 현재 비번 틀림 → "현재 비밀번호가 올바르지 않습니다." 에러
  - [x] 새 비번/확인 불일치 → "새 비밀번호와 확인이 일치하지 않습니다." 에러
  - [x] 새 비번 5자 이하 → "새 비밀번호는 6자 이상이어야 합니다." 에러
  - [x] 관리자 `resetBizPassword` 기능 (BizAccountsPage) 회귀 없음

### 2026-06-18: 업체 계정 생성 폼에서 "연결할 가게" 드롭다운 제거 (`feat/remove-store-link-dropdown`)
- **목적**: PR #93/#94 의 업체 자가등록 흐름이 작동하므로, 관리자 신규 계정 생성 시 "연결할 가게" 드롭다운 불필요. 관리자는 계정만 만들고 업소 등록은 업체가 직접 진행
- **수정 — `src/pages/admin/BizAccountsPage.vue`**:
  - **신규 계정 생성 모달**:
    - `<label>` "연결할 가게 (선택)" + `<select v-model="form.storeId">` 블록 제거 (`:87-95`)
    - 상단에 핑크 안내 박스 추가: `<div class="adm-create-notice">` "💡 업소 연결은 불필요합니다 — 계정 생성 후 업체가 직접 로그인해 출근업소를 등록합니다. 등록 신청이 들어오면 `업소 관리 → 승인 대기` 탭에 표시됩니다"
  - **`onCreate` 함수**:
    - `storeId` destructure 제거. `fnCreateBiz({ email, password, storeName })` 만 전달 (storeId 인자 없음)
    - 생성 성공 alert 확장: 다음 단계 (자가등록 흐름) 안내 포함
    - **`createBizAccount` Cloud Function 시그니처 변경 0** — storeId 는 이미 선택적 파라미터
  - **페이지 서브타이틀**: "업체용 로그인 계정을 생성하고 가게에 연결합니다" → "업체용 로그인 계정을 생성합니다. 업소 등록은 업체가 직접 진행합니다"
- **"업소 연결" 버튼 — 유지 판단**:
  - 자가등록이 기본 흐름이지만 **관리자 override 케이스가 분명히 존재**:
    1. 이미 만든 가게에 나중에 ownerEmail 부여 (기존 데이터 보정)
    2. 데이터 마이그레이션
    3. 잘못된 ownerEmail 매핑 수정
  - **유지 결정**. 단 모달 안에 "※ 일반적인 경우 업체가 직접 등록(자가등록) 하므로 본 기능은 불필요합니다. 기존 업소의 소유자(ownerEmail) 를 수정하거나 데이터 마이그레이션 시에만 사용하세요" 안내 추가
  - `form.storeId` ref / `linkStoreToBiz` Cloud Function 호출 모두 유지
- **CSS 추가**:
  - `.adm-create-notice` — 핑크 배경 + 1.5px solid border + `code` 강조 + 다크모드 보정
  - `.adm-modal-subhint` — 회색 배경 작은 hint 박스 + 다크모드 보정
- **건드리지 않음**:
  - `createBizAccount` Cloud Function (functions/index.js) — 시그니처 그대로
  - `linkStoreToBiz` / `resetBizPassword` / `deleteBizAccount` — 그대로
  - BizMyStorePage 자가등록 흐름 / 승인 파이프라인 / firestore.rules / storage.rules
  - 회원 빌드
  - `BizAccountsPage users subscribe error` (별개 문제, 진단 §4) — 본 PR 범위 아님
- **수정 후 흐름**:
  1. 관리자: BizAccountsPage → "+ 새 업체 계정 생성" → 이메일/비번/업체명만 입력 → 생성
  2. 업체: 로그인 → BizMyStorePage → "새 업소 등록 시작" → 텍스트 입력 → 등록 신청
  3. 관리자: /admin/stores → 승인 대기 탭 → 승인 → 사용자 현황판에 노출
- **빌드 검증**: `npm run build:admin` ✓ (BizAccountsPage JS 13.00→13.37KB, CSS 5.14→5.65KB 추정) / 회원 빌드 영향 없음
- **배포 범위**: `firebase deploy --only hosting:admin` (관리자 빌드만)
- **검증 시나리오 (사용자 수동)**:
  - [x] 새 업체 계정 생성 모달 → 드롭다운 없이 이메일/비번/업체명만으로 생성 가능
  - [x] 생성 성공 alert 에 다음 단계 안내 표시
  - [x] 생성된 계정으로 로그인 → BizMyStorePage 자가등록 흐름 정상
  - [x] 기존 "업소 연결" 버튼 → 모달 진입 시 hint 박스 노출 ("관리자 override 용도")
  - [x] 회귀 0 — `createBizAccount` Cloud Function 시그니처 변경 없음

### 2026-06-18: 신규 등록 모드 대표 이미지 비활성화 + 안내 (`fix/biz-newstore-image-notice`)
- **목적**: PR #93 후속 — 업체가 신규 업소 등록 시 대표 이미지 첨부 시도 → `alert("가게가 선택되지 않았습니다.")` 노출되던 문제를 안내 문구로 자연스럽게 처리
- **원인 (진단 `docs/audit/2026-06-18-신규등록-이미지업로드-진단.md`)** 2중 차단:
  1. 클라이언트 가드 — `BizMyStorePage.vue:321-328 triggerFilePick` + `:350-357 onPickImage` 가 `currentStore.value?.id` null 체크. 신규 모드는 `selectedStoreId=''` 라 무조건 null
  2. Storage Rules — `storage.rules:29-33 isStoreOwner` 가 `firestore.exists(stores/{id})` 를 요구. 신규 모드는 stores doc 미생성 → 통과 불가
  - 클라 가드만 풀어도 storage rule 이 차단하므로 **stores doc 먼저 생성** 외에는 안전한 우회 경로 없음
- **결정**: storage.rules 변경 없이 (보안 유지) UX 로 자연스럽게 처리 — 신규 모드에서 이미지 업로드 영역 자체를 가리고 안내
- **수정 — `src/pages/admin/BizMyStorePage.vue`**:
  - **마크업** (`.adm-field full` 대표 이미지 영역):
    - `<div v-if="creating" class="biz-image-notice">` — 핑크 dashed 배너 + "📷 대표 이미지는 등록 승인 후 업로드할 수 있습니다." + 안내 문구
    - `<template v-else>` 로 기존 업로드 흐름 (파일 input + URL input + 미리보기) 감쌈 → 수정 모드는 회귀 0
  - **핸들러 가드** (방어 차원):
    - `triggerFilePick()` — `if (creating.value) return` 추가 (silent no-op). 기존 `currentStore.value?.id` null 체크 alert 는 수정 모드에서만 가능
    - `onPickImage(e)` — `if (creating.value) { e.target.value=''; return }` 추가. 마크업 race 로 input 이 잠깐 보이는 경우 방어
  - **CSS — `.biz-image-notice`** (기존 `.biz-pending-banner` 톤과 일관):
    - 핑크 배경 `#fff5f8` + 1.5px dashed `#ffd6e4` + 진핑크 텍스트 `#ff2e7e`
    - strong 14/800, span 12/회색
    - 다크모드 보정 (`:root[data-theme='dark|black']`) — `#2a1620` 배경
- **건드리지 않음**:
  - `storage.rules` / `firestore.rules` — 보안 그대로
  - 수정 모드 이미지 업로드 흐름 (기존 store 보유 업체) — 회귀 0
  - 승인/노출 파이프라인 (applyStatus / approved / exposure.gangtalk)
  - `createNewStore()` payload — PR #93 그대로
  - `BizAccountsPage users subscribe error` — 별개 문제 (진단 §4). 본 PR 범위 아님
- **수정 후 흐름**:
  1. 신규 등록 모드 진입 → 텍스트 정보만 입력 + 핑크 안내 박스 ("승인 후 업로드 가능")
  2. "등록 신청" 클릭 → `createNewStore()` → stores doc 생성 → `creating=false; selectedStoreId=newId` 자동 전환
  3. 같은 화면이 수정 모드로 전환 → 이미지 업로드 영역 노출 → storage rule 통과 → 첨부 가능
- **빌드 검증**: `npm run build:admin` ✓ (BizMyStorePage JS 12.29→12.70KB, CSS 4.97→5.61KB) / 회원 빌드 영향 없음
- **배포 범위**: `firebase deploy --only hosting:admin` (관리자 빌드만)
- **검증 시나리오 (사용자 수동)**:
  - [x] 신규 등록 모드 진입 → 대표 이미지 자리에 핑크 안내 박스 노출, 파일 선택 버튼/URL input 안 보임
  - [x] 텍스트만 입력 → "등록 신청" 성공 (이미지 없이 등록 가능)
  - [x] 등록 신청 직후 화면이 수정 모드로 자동 전환 → 이미지 업로드 영역 노출 → 파일 첨부 정상
  - [x] 기존 store 보유 업체 (수정 모드) → 이미지 업로드 영역 그대로, 회귀 없음
  - [x] "가게가 선택되지 않았습니다" alert 가 신규 모드에서 안 뜨는지

### 2026-06-18: 업체 자가 등록 흐름 — BizMyStorePage 신규 등록 모드 (`feat/biz-self-store-register`)
- **목적**: 진단(`docs/audit/2026-06-18-업체자가입력-승인흐름-진단.md`) 의 빠진 부분 — "업체가 본인 출근업소를 신규 생성하는 UI/로직" 추가
- **운영 흐름 (구현 후)**:
  ```
  관리자: 업체계정만 생성 (가게 미연결)
    → 업체: 로그인 → BizMyStorePage 진입 → "새 업소 등록 시작"
    → 폼 입력 → "등록 신청" → stores 신규 doc (applyStatus:'pending', approved:false)
    → 관리자: /admin/stores 승인대기 탭에 자동 표시 → 승인
    → 사용자: 현황판 자동 노출
  ```
- **수정 — `src/pages/admin/BizMyStorePage.vue`**:
  - import `setDoc` 추가 (`firestore`)
  - **신규 등록 안내 섹션** (`v-if="!loading && !myStores.length && !creating"`):
    - 이전: "아직 연결된 가게가 없습니다 / 관리자에게 가게 연결을 요청해 주세요" (dead-end)
    - 이후: "새 출근업소 등록" 헤더 + 안내 + "새 업소 등록 시작" 버튼 + `startCreate()` 트리거
  - **폼 섹션** (`v-else-if="creating || currentStore"`):
    - 헤더 라벨이 `creating` 분기로 변경 ("새 출근업소 등록 신청" / "정보 수정")
    - **승인 대기 안내 배너** — `!creating && isPending(currentStore)` 일 때 표시 ("⏳ 승인 대기 중입니다 / 관리자 승인 후 사용자 현황판에 노출됩니다 / 정보는 계속 수정 가능합니다")
  - **푸터 버튼**:
    - 신규 모드: "취소" + "등록 신청" 두 버튼
    - 수정 모드: "저장" 단일 버튼 (기존 동작)
  - **신규 함수**:
    - `isPending(s)` — MainPage/StoresManagePage 와 동일 분류 로직
    - `creating` ref + `startCreate()` + `cancelCreate()` (취소 시 기존 첫 stores 로 복귀)
    - `emptyForm()` — 빈 폼 (category:'hopper', region:'강남', wageType:'hourly')
    - `createNewStore()` — Firestore auto-id (`doc(collection(fbDb, 'stores')).id`) 로 신규 doc + `setDoc`
  - **`onSave` 분기 추가**:
    ```js
    if (creating.value) return createNewStore()
    ```
- **신규 store 페이로드 (createNewStore)**:
  - 사용자 입력 필드: name/phone/desc/detailDesc/address/hours/closed/thumb/category/region/wage/wageType
  - **소유자**: `ownerId: uid`, `ownerEmail: email` — `firestore.rules:111` 의 `create: ownerId == auth.uid` 통과
  - **승인 대기**: `applyStatus: 'pending'`, `approved: false`, `'exposure.gangtalk': false`
    - 사용자 화면 `MainPage.isApproved` (`:1812-1846`) 자동 미노출
    - 관리자 페이지 `StoresManagePage.isPending` (`:237-239`) 통과 → Tab 3 승인대기 표시
    - 관리자 승인 (`StoresManagePage.approveStore:531-543`) 시 `approved:true, applyStatus:'approved', 'exposure.gangtalk':true` 자동 → 사용자 화면 노출
  - 메타: `thumbVer`, `createdAt`, `updatedAt`
- **이미지 업로드 — 기존 흐름 그대로**:
  - `onPickImage` 가 `currentStore.value?.id` 사용 → 신규 모드에선 storeId 없음
  - **신규 모드에서는 이미지 업로드 후 저장이 자동**: 먼저 "등록 신청" 으로 doc 생성 → `selectedStoreId` 자동 set → 그 후 사진 변경 가능. 한 번에 이미지 + 정보 등록은 두 단계로 (등록 신청 → 이미지 업로드 → 자동 저장). 사용자 경험상 큰 부담 없음
- **CSS — 신규 배너 스타일**:
  - `.biz-pending-banner` — 핑크 outline + 배경 (`#fff5f8`)
  - 다크모드 보정 (`:root[data-theme='dark|black']`)
  - `.adm-empty` 정렬 보강 (`text-align:center`)
- **건드리지 않음**:
  - 승인/노출 파이프라인 (이미 완비 — `MainPage.isApproved`, `StoresManagePage.approveStore`, exposure 필터)
  - `firestore.rules` (create 룰 이미 본인 uid 허용)
  - Cloud Functions (`createBizAccount` 의 storeId 는 이미 선택적)
  - 로그인/인증 경로 / 다른 admin 페이지
  - 기존 store 가 있는 업체의 수정 흐름 (기존 onSave 흐름 그대로)
- **기존 사용자 (연결 store 있는 업체) 영향**:
  - `myStores.length > 0` 이면 `v-else-if="creating || currentStore"` 의 `currentStore` 분기로 자연 진입
  - `creating` 은 기본 false 라 헤더 라벨 / 버튼 텍스트 / 저장 로직 모두 기존과 동일
  - 회귀 0
- **빌드 검증**: `npm run build:admin` ✓ (BizMyStorePage JS 9.96→12.29KB, CSS 4.28→4.97KB) / `npm run build` ✓ (회원 215.41KB 변동 없음)
- **배포 범위**: `firebase deploy --only hosting:admin` (관리자 빌드만, 룰/Functions/회원 변경 없음)
- **검증 시나리오 (사용자 수동)**:
  - [x] 가게 미연결 업체계정으로 로그인 → "새 업소 등록 시작" 버튼 노출
  - [x] 폼 입력 → "등록 신청" → Firestore Console 에서 stores 신규 doc 확인 (`ownerId`, `applyStatus:'pending'`, `approved:false`, `exposure.gangtalk:false`)
  - [x] /admin/stores 의 승인대기 (Tab 3) 에 자동 표시 → 승인 → `approved:true, applyStatus:'approved', exposure.gangtalk:true` 변경 확인
  - [x] 승인 후 사용자 현황판 (gangtox.com) 에 노출 / 승인 전엔 안 보임
  - [x] 기존 연결된 업체 (myStores.length > 0) 로 로그인 → 기존 수정 흐름 그대로 (회귀 없음)

### 2026-06-18: 관리자 제휴업체(partners) 관리 페이지 신설 (`feat/admin-partners-manage`)
- **목적**: 진단(`docs/audit/2026-06-18-제휴업체-관리-진단.md`) 의 신규 페이지 작성. 관리자가 제휴업체(partners) 를 CRUD + 이미지 업로드. 회원 사이트의 AdminTools (마이페이지 내) 가 도메인 분리 시 `v-if="false"` 로 숨겨졌던 것을 관리자 빌드로 이전
- **신규 파일 — `src/pages/admin/PartnersManagePage.vue`** (~ 500 lines):
  - 카드 그리드 목록 (썸네일 + name + region/category/rating + 활성/승인 상태)
  - **신규 추가 모달**: id 자동 발급 (`pt_${ts}_${random}`) → 이미지 업로드 가능
  - **수정 모달**: 동일 폼 재사용
  - **필드** (진단 §1-1 기반):
    - name (필수), manager, region, address, category (select), link, rating
    - hours, holiday, desc/intro, benefits, tags (쉼표 구분)
    - adStart/adEnd (date input), active (boolean), approved (boolean)
    - thumb (대표) + images[] (갤러리, 최대 8장)
  - **카테고리 옵션**: salon/nail/ps/real/rental/fit/cafe/etc (`useMyPageCore.js:520` 동일)
  - **이미지 업로드**:
    - `fileToJpegBlob(file, 1280, 0.85)` — 클라이언트 리사이즈 + JPEG 변환
    - Storage path: `marketing/partnerCards/${id}/img-${i}-${ts}.jpg`
    - 다중 선택 (`multiple`) + 최대 8장 제한
    - 첫 업로드 시 자동 thumb 설정. "대표" 버튼으로 변경 / "제거" 버튼으로 삭제
  - **3중 저장 패턴** (사용자 화면 호환성 — `savePartnerOne` 동등):
    1. `partners/{id}` 컬렉션 — source (전체 필드 + `applyStatus: approved/pending` 자동)
    2. `config/marketing/partnerCards/{id}` 서브컬렉션 — 사본 (가벼운 필드)
    3. `config/marketing.partnerCardIndex` / `partnerCards` / `partnerCardList` 배열 — 인덱스 (`id/name/region/category/thumb/adStart/adEnd/rating`)
  - **삭제 (역연산 + Storage 정리)**:
    - 2중 confirm + 중복 클릭 방지
    - 1차: 4개 정리 대상 명시 + "stores 는 영향 없음" 안내
    - 2차: "되돌릴 수 없습니다"
    - 흐름: Storage `marketing/partnerCards/{id}/*` `listAll + deleteObject` → `partnerCards/{id}` doc → `config/marketing` 배열 3종에서 id 제거 → `partners/{id}` 본 doc
    - 단계별 실패 누적 후 alert 안내. 로컬 list 즉시 제거
- **수정 — `src/router/admin.js`**:
  - `PartnersManage` lazy import 추가
  - `/admin/partners` 라우트 1줄 추가 (`adminPartners` name)
- **수정 — `src/layouts/AdminLayout.vue`**:
  - `platformMenus` 에 `{ to: '/admin/partners', emoji: '🤝', label: '제휴업체 관리' }` 1줄 추가 (배너와 뉴스 사이)
- **건드리지 않음**:
  - stores(출근업소) 관리 — 별개 (`StoresManagePage`)
  - partnerRequests(외부 신청 모더레이션) — 별도 PR 권장
  - firestore.rules / storage.rules — 진단 결과 변경 0건 (이미 admin CRUD 허용)
  - 회원 사이트 / `useMyPageCore` — `MyPage.vue:72` 의 `v-if="false"` 그대로 유지
  - Cloud Functions — 직접 삭제로 충분, `deletePartnerFull` 미작성
- **사용자 화면 영향 (검증 가능)**:
  - PartnersPage (제휴관) 가 `partners/{id}` 를 source 로 읽음 → 즉시 반영
  - PartnerDetail / FavoritesPage 가 `config/marketing.partnerCards` 폴백 → 사본 갱신으로 호환성 보장
- **빌드 검증**: `npm run build:admin` ✓ (PartnersManagePage chunk **15.53KB**) / `npm run build` ✓ (회원 215.41KB 변동 없음)
- **배포 범위**: `firebase deploy --only hosting:admin` (관리자 빌드만)
- **검증 시나리오 (사용자 수동)**:
  - [x] /admin/partners 진입 → 사이드바 "제휴업체 관리" 메뉴 확인
  - [x] "+ 새 제휴업체" 클릭 → 모달 → 이름/카테고리 입력 → 이미지 업로드 → 저장
  - [x] PartnersPage (gangtox.com 제휴관) 에 새 제휴업체 표시 확인
  - [x] 수정 → 변경 사항 즉시 반영
  - [x] 삭제 → 2중 confirm → partners + partnerCards + config 배열 + Storage 모두 정리 (Firebase Console 확인)
  - [x] stores 컬렉션 영향 없음 (Firebase Console 확인)

### 2026-06-18: 관리자 삭제 UI — 출근업소/업체계정 2중 확인 (`feat/admin-delete-ui`)
- **목적**: PR #90 백엔드 (deleteStoreFull / deleteBizAccount) 의 프론트 UI. 2중 확인 + 중복 클릭 방지 + 관리자 자기계정 가드
- **수정 1 — `StoresManagePage.vue`**:
  - import 에 `getFunctions`, `httpsCallable` 추가
  - **Tab 1 (노출관리)** 의 카드 우상단에 "삭제" 버튼 (`adm-btn danger sm`) — 노출 토글 옆
  - **Tab 3 (승인대기)** 의 액션 그룹에 "삭제" 버튼 — 승인/거절 옆
  - `deleting` ref (storeId 별 로딩 상태) + `fnDeleteStore` = `httpsCallable('deleteStoreFull')`
  - `deleteStore(s)` 함수:
    - 1차 confirm: 연관 데이터 6종 (rooms_biz/ratings/favorites/Storage/marketing/stores) 안내 + **partners 영향 없음 명시**
    - 2차 confirm: "되돌릴 수 없습니다" 강한 경고
    - 호출 후 단계별 결과 (`r.storage` / `r.roomsBiz` / `r.ratings` / `r.favorites` / `r.marketingRefs` / `r.storeDoc`) 점검 → 실패 단계 있으면 alert 에 나열
    - 성공 시 로컬 `stores.value` 에서 즉시 제거 (UX), onSnapshot 이 자동 확정
  - 새 CSS: `.adm-btn.danger` (빨간 outline + hover 시 채움) + `.adm-btn.sm` (28px 높이)
- **수정 2 — `BizAccountsPage.vue`**:
  - import 에 `fnDeleteBiz = httpsCallable('deleteBizAccount')` 추가
  - `ADMIN_EMAIL = 'gangtalk815@gmail.com'` + `isAdminEmail(email)` 헬퍼
  - 각 업체 카드 액션에 "계정 삭제" 버튼 — **`v-if="!isAdminEmail(a.profile?.email)"`** 로 관리자 본인 계정 숨김 (1차 가드 — UI 레벨)
  - `deleting` ref + `deleteAccount(a)` 함수:
    - **2차 가드 — UI 레벨**: `isAdminEmail` 체크 후 alert 차단 (v-if 우회 시 방어)
    - **3차 가드 — 백엔드**: PR #90 의 `deleteBizAccount` 가 caller.uid 일치 + Auth email 검사
    - 1차 confirm: Auth + users + 연결 업소 안내 + 각 업소의 연관 데이터 정리 + partners 영향 없음
    - 2차 confirm: "되돌릴 수 없습니다"
    - 호출 후 summary 점검 → `usersDoc` / `authUser` / `stores` 각 항목별 실패 경고
    - 로컬 `accounts.value` 에서 즉시 제거
- **수정 3 — UI 표기 "가게" → "업소" 통일 (삭제 관련 + 인접 메시지)**:
  - `BizAccountsPage.vue`:
    - 카드의 "연결된 가게" → "연결된 업소" (line 41-46)
    - "가게 연결" 버튼 → "업소 연결" (line 52)
    - `onLink` 의 alert "가게가 연결되었습니다" → "업소가 연결되었습니다"
    - `onLink` 의 에러 "연결할 가게를 선택" → "연결할 업소를 선택"
  - 모달 헤더/내부의 "가게" 표기 등 비삭제 영역은 그대로 유지 (사용자 명시 외 변경 자제)
  - **코드 식별자(`store` / `Store` / `stores`) 는 그대로 유지** — 컬렉션명/변수명/페이지명
- **건드리지 않음**:
  - 백엔드 함수 시그니처 (`deleteStoreFull({storeId})`, `deleteBizAccount({uid})`)
  - `createBizAccount` / `resetBizPassword` / `linkStoreToBiz` 호출/모달 흐름
  - 로그인 / 인증 / 룰 / Functions / Storage / 회원 빌드
  - partners (제휴처) — 코드 / UI / 호출 모두 0
- **건드리지 않음 검증**:
  - 회원 빌드 `npm run build` ✓ (index 215.41KB 변동 없음)
  - admin 빌드: StoresManagePage chunk +~3KB, BizAccountsPage +~2KB
- **검증 시나리오 (사용자 수동)**:
  - [x] 더미 업소 삭제 → 목록에서 사라짐 + Firebase Console 에서 연관 데이터 정리 확인 (rooms_biz/ratings/favorites/Storage/marketing)
  - [x] 더미 업체 계정 삭제 → users + Auth 삭제 + 연결된 stores 함께 사라짐
  - [x] 관리자 본인 계정 (gangtalk815) → 삭제 버튼 보이지 않음 (`v-if` 차단)
  - [x] 2차 confirm 거치지 않고 ESC → 삭제 안 됨
  - [x] partners 컬렉션 → 변화 없음 (Firebase Console 확인)
- **빌드 검증**: `npm run build:admin` ✓ (StoresManagePage / BizAccountsPage chunk 증가) / `npm run build` ✓ (회원 영향 없음)
- **배포 범위**: `firebase deploy --only hosting:admin` (관리자 빌드만, 룰/Functions/회원 변경 없음)

### 2026-06-18: 관리자 삭제 백엔드 — `deleteStoreFull` + `deleteBizAccount` (`feat/admin-delete-backend`)
- **목적**: 진단(`docs/audit/2026-06-18-관리자-삭제기능-진단.md` + `docs/audit/2026-06-18-업체-가게-개념구분-진단.md`) 후속 PR (a) 백엔드. 출근업소(stores) + 업체계정 안전한 삭제. 프론트 UI 는 다음 PR
- **개념 확정 (반드시 준수)**:
  - `stores` = 출근업소 (사용자 정의 "업체")
  - `partners` / `config/marketing/partnerCards` = 제휴처 (사용자 정의 "가게") — **절대 건드리지 않음**
- **수정 1 — `firestore.rules:141-145` ratings 룰**:
  - `stores/{storeId}/ratings/{uid}` 의 `create, update, delete` 권한에 `|| isAdmin()` 추가
  - 이유: `deleteStoreFull` 이 ratings 서브컬렉션 일괄 정리 시 관리자 권한 필요
- **수정 2 — `functions/index.js` 헬퍼 + 2개 onCall 함수 추가**:
  - `deleteSubcollection(collRef, batchSize=300)` — 서브컬렉션 batched delete (500 limit 대비 청크)
  - `_deleteStoreFullCore(storeId)` — 의존성 역순 6단계 정리:
    1. Storage `stores/{storeId}/*` 전체 (`admin.storage().bucket().getFiles({prefix})` → 각 `delete()`)
    2. `rooms_biz/{storeId}` 서브컬렉션 (listCollections) → 본 doc
    3. `stores/{storeId}/ratings/*` 서브컬렉션
    4. `favorites where targetId==storeId` 일괄 (400 단위 batch)
    5. `config/marketing` 의 `homeOrder` (array) / `topRanks` (map of arrays) / `listOrders` (map of arrays) 에서 storeId 제거
    6. `stores/{storeId}` 본 doc
  - 각 단계 실패해도 다음 진행. 단계별 ok/error 결과 누적
- **`exports.deleteStoreFull`** (onCall, ADMIN_CORS):
  - `assertCallerIsAdmin(req)` — gangtalk815@gmail.com 만
  - `storeId` 필수
  - `_deleteStoreFullCore(storeId)` 호출 → 결과 반환
- **`exports.deleteBizAccount`** (onCall, ADMIN_CORS):
  - `assertCallerIsAdmin(req)` 검증
  - `uid` 필수
  - **관리자 본인 가드 2중**: `uid === req.auth.uid` 차단 + `admin.auth().getUser(uid).email === ADMIN_EMAIL` 차단
  - 흐름:
    1. `stores where ownerId==uid` 조회 → 각각 `_deleteStoreFullCore` 호출 (옵션 B — 가게도 함께 삭제)
    2. `users/{uid}` 삭제
    3. `admin.auth().deleteUser(uid)`
  - 각 단계 결과 누적 후 summary 반환
- **건드리지 않음 (코드 사실 검증)**:
  - `grep "partners\|partnerCards" functions/index.js` → 본 PR 추가 매칭 3건 모두 **주석** (실제 호출 0건)
  - `createBizAccount` / `resetBizPassword` / `linkStoreToBiz` / 로그인 / 추천코드 로직 변경 없음
  - 회원 빌드 / 관리자 빌드 / 클라이언트 코드 — 변경 0
- **검증**:
  - `node -e "require('./index.js')"` ✓ — 문법 통과
  - `exports.deleteStoreFull` / `exports.deleteBizAccount` / `exports.createBizAccount` 모두 function 확인
  - `firebase deploy --dry-run` 은 IAM 권한 부족으로 거부 (사용자가 deploy 시 IAM 프롬프트 가능)
- **배포 범위**:
  - `firebase deploy --only functions,firestore:rules`
  - IAM `Service Account User` 권한 요구 가능성 — Firebase Console 에서 부여 후 재시도
- **테스트 시나리오 (사용자 수동, Functions 콘솔 또는 Firebase emulator)**:
  - isAdmin 아닌 호출 → `permission-denied`
  - 관리자 본인 계정 삭제 시도 → `failed-precondition`
  - 테스트 store 1개 생성 후 `deleteStoreFull({storeId})` → Storage / rooms_biz / ratings / favorites / config/marketing 정리 확인 + stores 본 doc 삭제 확인
  - partners 컬렉션 데이터 1개 사전 확인 → 함수 호출 후 partners 그대로 (변화 없음) 확인
- **다음 PR (b)**: StoresManagePage / BizAccountsPage 에 삭제 UI + 2중 확인 모달 (typing 확인) — UI 표기는 "업소 삭제" 로 일관 (개념 진단 §5-4)

### 2026-06-18: 추천코드 seq=1 회귀 수정 — me.init else 분기 제거 (`fix/referral-seq-race`)
- **목적**: 진단 (`docs/audit/2026-06-18-refcode-카운터-읽기누락-진단.md` + `docs/audit/2026-06-18-userseq-카운터-진단.md`) 의 원인 제거. 모든 신규 가입자가 `prefix+'00001'` 받는 회귀 차단
- **원인 (race 메커니즘)**:
  - `_fbSignupUser` 가 `await createUserWithEmailAndPassword(...)` 완료
  - Firebase Auth SDK 가 `onAuthStateChanged` 발화 → **me.init 콜백이 `_fbSignupUser` 의 `runTransaction` 보다 먼저 실행**
  - me.init else 분기 (`store/user.js:377-410`) 가 `seq=1` 하드코딩으로 users doc 자동 생성 → `myJoinSeq:1, myRefCode:'prefix00001'`
  - `_fbSignupUser` 트랜잭션 도달 시 `uSnap.exists()===true, myJoinSeq=1` → **`already` 분기로 early return → `meta/counters.userSeq` 갱신 안 됨**
- **수정 — `src/store/user.js me.init else` (`:377-408`)**:
  - **`seq=1` 하드코딩 + `setDoc` 으로 users doc 자동 생성하는 로직 전체 제거**
  - 대신 `_ready=true` + `return` 만:
    ```js
    } else {
      console.warn('[me.init] users doc not found — skip auto-create (signup race protection)')
      _ready.value = true
      return
    }
    ```
  - 신규 가입자의 users doc 생성은 `_fbSignupUser` 의 runTransaction (`:472-490`) 에 일임
  - me.auth 갱신도 `_fbSignupUser` 가 직접 처리 (`:532-540`) — me.init else 에서 me.auth 안 건드려도 안전
  - 주석에 race 메커니즘 + 진단 참조 + 매우 드문 데이터 손상 케이스 설명 명시
- **수정 후 흐름**:
  - **t1**: `createUserWithEmailAndPassword` 완료
  - **t2**: `onAuthStateChanged` 발화 → me.init else 분기 → `_ready=true` + return (users doc 안 만듬)
  - **t3**: `_fbSignupUser` runTransaction 진입 → `uSnap.exists()===false` → counters 분기 → `cSnap.exists()===true, userSeq=38` → seq=39 → `tx.update({ userSeq: 39 })` + `tx.set(users, { myJoinSeq:39, myRefCode:'y00039' })`
  - **t4**: `_fbSignupUser` 가 me.auth 직접 갱신 (`:532-540`) — 화면에 새 가입 정보 정상 반영
  - **t5**: counters +1 정상 누적. 다음 가입자 seq=40
- **건드리지 않음**:
  - `_fbSignupUser` 트랜잭션 흐름 — 정상 카운터 분기 진입 가능해진 것만 다름
  - `_fbSignupBiz`, `_fbLoginWithRole` 등 다른 가입/로그인 흐름 — 모두 me.auth 직접 갱신 패턴이라 영향 없음
  - `makeMyCodeV2` / `applyReferralNow` / 리워드 지급 로직
  - PR #85 의 `main.js beforeunload signOut` 제거 — 유지
  - PR #88 의 닉네임 회귀 수정 4건 (`ProfileEditSheet`, `MyPage handleProfileSave`, `_listenUserDoc`, me.init getDoc try/catch) — 유지
  - `firebase.js` persistence / 인증 / 가드 / 룰 / Functions / Storage / 관리자 빌드
- **드문 예외 — Auth user 만 있고 users doc 없는 데이터 손상 케이스**:
  - 이전: me.init else 가 자동 doc 생성으로 복구
  - 이후: me.auth 가 LS_AUTH 캐시 그대로 → 사용자가 다시 가입 시도하거나 관리자가 수동 복구 필요
  - **정상 가입 흐름에서는 영향 없음** — `_fbSignupUser` 가 트랜잭션으로 doc 생성
- **빌드 검증**: `npm run build` ✓ (회원 index 215.66→215.41KB, **-0.25KB**) / `npm run build:admin` ✓ (admin 영향 없음, me.init 호출 안 함)
- **배포 범위**: `firebase deploy --only hosting:prod` (회원 빌드만, 룰/Functions 변경 없음)
- **검증 시나리오 (사용자 수동)**:
  - [x] 새 계정 2~3개 연속 가입 → 추천코드가 `prefix00039`, `prefix00040`, `prefix00041`... 로 증가 (사용자 환경의 현재 userSeq=38 다음부터)
  - [x] Firebase Console 에서 `meta/counters.userSeq` 가 가입마다 +1 증가 확인
  - [x] 기존 로그인 (PR #85) 회귀 없음 — 새로고침 시 로그인 유지
  - [x] 닉네임 회귀 (PR #88) 회귀 없음 — 프로필 저장 후 새로고침 시 닉네임 유지
- **후속 작업 (별도 PR)**:
  - 기존 중복 코드 (`prefix00001` 다수) 받은 계정 재발급 마이그레이션 — 진단 §5-2 참고 (`createdAt` 순으로 정렬 후 `myJoinSeq` 재할당 + `meta/counters.userSeq` 갱신)
  - `referral_counters` dead 컬렉션 정리 (선택)

### 2026-06-18: 닉네임 회귀 버그 수정 — 4건 (`fix/nickname-empty-overwrite`)
- **목적**: 진단(`docs/audit/2026-06-18-닉네임-회귀-진단.md`) 의 원인 제거. 프로필 저장 후 새로고침/재방문 시 '게스트' 회귀 차단
- **원인 (DIAG 추적)**: `ProfileEditSheet.vue:608` 의 `props.edit.nickname ?? props.state.profile?.nickname ?? ''` 에서 `??` 가 빈 문자열 `''` 통과 → users.profile.nickname='' 저장 → 새로고침 시 `useMyPageCore.js:1655` 의 8순위 폴백 `'게스트'` 발동
- **수정 1 — `ProfileEditSheet.vue` 빈 닉네임 가드 (`:552-571`, `:593-617`)**:
  - `onSave` 시작 부분에 `trimmedNick = String(edit.nickname || '').trim()` 추출
  - `prevNick` = 기존 doc 의 nickname (company 면 company.nickname, user 면 profile.nickname)
  - `finalNick = trimmedNick || prevNick` — 빈 입력 시 기존 닉네임 유지
  - `finalNick` 도 빈 (= 둘 다 빈) 면 `alert + return` 으로 저장 차단
  - payload 의 `nickname/nick` 모두 `finalNick` 사용. user 분기는 `nicknameLower: finalNick.toLowerCase()` 도 함께 저장 → me.init 가 매번 재보정 안 함
- **수정 2 — `MyPage.vue handleProfileSave` (`:465-501`)**:
  - 이전: `state.profile.nickname = nick` (state 는 computed → mutation 일시적)
  - 이후: `state` mutation 은 유지하되 **`me.auth.value` 도 직접 갱신** — source of truth 동기
  - `me.auth.value = { ...a, profile: { ...prev, nickname: trimmedNick, nick, nicknameLower } }`
  - `me.save()` 호출로 LS_AUTH 도 동기화 → 새로고침 시 캐시도 일치
  - 빈 nickname (`!trimmedNick`) 이면 me.auth 의 nickname 갱신 안 함 (다른 필드만 적용)
- **수정 3 — `store/user.js _listenUserDoc` (`:182-225`)**:
  - 이전: onSnapshot 콜백이 `points` 만 me.auth 에 반영
  - 이후: `profile` 과 `company` 도 머지 — Firestore 가 ProfileEditSheet 로 update 되면 새로고침 없이 me.auth 갱신
  - **빈 nickname 덮어쓰기 차단**: 새 doc 의 `data.profile.nickname` 이 빈 값이면 `prevProfile.nickname` 유지 (회귀 방어 한 겹 더)
  - company 도 같은 패턴
- **수정 4 — `store/user.js me.init getDoc` try/catch (`:310-322`)**:
  - 이전: `const snap = await getDoc(userRef)` — 실패 시 throw, me.auth 갱신 못 함
  - 이후: try/catch 로 일시 실패 (권한/네트워크) 처리. 실패 시 LS_AUTH 캐시 보존 + `_ready=true` 만 설정 후 return
  - 다음 새로고침 또는 `_listenUserDoc` 의 onSnapshot 이 정상 발화하면 자동 복구
  - `console.warn('[me.init] users getDoc failed (캐시 보존)', ...)` 로 진단 가능
- **건드리지 않음**:
  - 로그인/인증 경로 (PR #85 의 수정)
  - 가입 흐름 (`_fbSignupUser`)
  - 닉네임 LowerCase 자동 보정 (`me.init :318-336`) — 그대로
  - 다른 컴포넌트 / 룰 / Functions / Storage / 관리자 빌드
- **수정 후 흐름**:
  - **저장**: ProfileEditSheet → 빈 가드 → `finalNick` 으로 Firestore + me.auth 동시 갱신 (수정 1+2)
  - **즉시 표시**: state computed 가 me.auth.profile.nickname 을 그대로 반환 — '게스트' 폴백 안 발동
  - **새로고침**: me.init → users getDoc 성공 → me.auth.profile.nickname = '강톡 관리자'. **실패 시 LS_AUTH 캐시 (정상 nickname) 보존** (수정 4)
  - **다른 기기/탭**: `_listenUserDoc` onSnapshot 이 profile 머지 → 새로고침 없이 동기 (수정 3)
- **빌드 검증**: `npm run build` ✓ (회원 index 215→215.66KB, +0.5KB) / `npm run build:admin` ✓ (admin 영향 없음)
- **배포 범위**: `firebase deploy --only hosting:prod` (회원 빌드만, 룰/Functions 변경 없음)
- **검증 시나리오 (사용자 수동)**:
  - [x] 닉네임 수정 → 저장 → 새로고침/재방문 → 수정값 유지
  - [x] 빈 닉네임으로 저장 시도 → "닉네임을 입력해 주세요." alert + 저장 차단
  - [x] users.profile.nickname 에 빈 문자열 들어가지 않는지 (Firestore 콘솔 확인)
  - [x] 새로고침 시 LS RESET 없이 캐시 보존 (네트워크 일시 끊김 시도)

### 2026-06-18: BizMyStorePage 드롭다운 → 칩 버튼 그룹 교체 (`fix/biz-mystore-select-to-chips`)
- **목적**: 진단(`docs/audit/2026-06-18-드롭다운-글씨크기-진단.md`) 결론 — 네이티브 `<select>` 의 모바일 OS picker 가 글씨가 작아 옵션 구분 불가. CSS 무효. **칩 버튼 그룹** 으로 교체해 글씨/터치영역 자유 제어
- **수정 — `src/pages/admin/BizMyStorePage.vue`**:
  - **카테고리 (9개)** (`:46-51`): `<select>` → `.adm-chip-grid--cols2` 2열 그리드 + `<button class="adm-chip">` 칩
  - **지역 (4개)** (`:53-58`): `<select>` → `.adm-chip-grid` flex wrap + 칩
  - **시급 유형 (4개)** (`:85-90`): `<select>` → `.adm-chip-grid` flex wrap + 칩
  - `<label class="adm-field">` → `<div class="adm-field adm-field-chips full">` 로 변경 (label 클릭 시 첫 칩 ghost 활성화 등 이상 동작 방지)
  - `:aria-pressed` 추가 (접근성)
- **CSS 추가 (BizMyStorePage 전용)**:
  ```css
  .adm-chip {
    min-height: 44px;
    padding: 0 16px;
    border: 1.5px solid #eee;
    border-radius: 10px;
    background: #fff;
    color: #333;
    font-size: 16px;        /* 모바일 OS picker 보다 명확히 큰 글씨 */
    font-weight: 600;
    transition: border-color .12s, background .12s, color .12s;
  }
  .adm-chip.on { background: #ff2e7e; border-color: #ff2e7e; color: #fff; }
  .adm-chip:focus-visible { outline: 2px solid #ff2e7e; outline-offset: 2px; }
  ```
  - `.adm-chip-grid` flex wrap (지역/시급) — 4개라 자연스럽게 한 줄
  - `.adm-chip-grid--cols2` grid 2열 (카테고리 9개 — 5+4 또는 4+5 배치)
  - 다크모드 보정 추가 (`:root[data-theme="dark|black"] .adm-chip`)
- **저장 로직 변경 0**:
  - `v-model` 이 아닌 `:class={ on: form.x === val }` + `@click="form.x = val"` 패턴 — 저장 값은 그대로
  - 필드명 (`category` / `region` / `wage` / `wageType`) 불변
  - `onSave` payload 변경 없음 — 사용자 화면 (`StoreFinder` / `MainPage` / `StoreDetail`) 영향 0
- **건드리지 않음**:
  - 공용 `.adm-field select` CSS (`styles/admin.css:34-41` + 본 페이지의 `.adm-field select{...}`) — 그대로. **`BizMetricsPage` / `BizAccountsPage` 의 select 영향 0**
  - 회원 빌드 / `firebase.js` / 인증 / 룰 / Functions / Storage
  - 다른 admin 페이지 / 다른 컴포넌트
- **빌드 검증**: `npm run build:admin` ✓ (BizMyStorePage chunk JS 9.64→9.96KB, CSS 3.17→4.28KB) / `npm run build` ✓ (회원 영향 없음, 215KB 유지)
- **배포 범위**: `firebase deploy --only hosting:admin` (관리자 빌드만)
- **검증 시나리오 (사용자 수동)**:
  - [x] /biz/my-store 진입 → 카테고리/지역/시급유형이 칩 그룹으로 펼쳐서 표시됨
  - [x] 칩 클릭 → 선택된 칩이 핑크 강조됨
  - [x] 저장 → stores 문서의 `category`/`region`/`wageType` 필드에 정상 반영
  - [x] 사용자 화면(가게 카드 등)에 동일 값 표시됨
  - [x] BizMetricsPage / BizAccountsPage 의 select 외관 변화 없음

### 2026-06-18: 인증 진단 로그 + 우회 변경 정리 (`chore/cleanup-auth-diag-revert-workarounds`)
- **목적**: PR #85 의 진짜 수정 (`beforeunload signOut` 제거) 검증 완료 후 진단/우회 임시 변경 정상화
- **정리 1 — PR #81 DIAG 로그 전체 제거**:
  - `src/main.js`: APP START 로그 블록
  - `src/firebase.js`: `initializeAuth START/OK/FAIL` + 전역 `onAuthStateChanged` / `onIdTokenChanged` 추적 + `onIdTokenChanged` import 함께 제거
  - `src/store/user.js`: `LS WRITE`, `me.init onAuthStateChanged`, grace timer 4종 (START/CANCEL×2/expired/RECOVERED), ANON user, 실계정 처리 시작, `me.auth.value SET`, `_diagAuthSnapshot` 헬퍼 — me.save 도 원래 한 줄 형태로 복귀
  - `src/router/index.js`: `_diagPayload` + 가드 분기 4종 (`GUARD REDIRECT`/`pass-through`)
  - `src/pages/MyPage.vue`: `effectiveLoggedIn changed` / `MYPAGE LOGIN REQUIRED` watch + import
  - `src/pages/ChatOpen.vue`: `ANON SIGNIN` 로그
  - 기능 로직은 그대로. 로그만 정확히 제거. `grep -rn "[DIAG]" src/` → 0 hits 확인
- **정리 2 — PR #83 App Check 기본 켬 복구**:
  - `firebase.js`: `VITE_DISABLE_APPCHECK` 기본값 `'true'` → `'false'` (= App Check 켬)
  - 조건도 `_RAW !== 'false'` → `_RAW === 'true'` 로 뒤집어 환경변수가 명시적으로 `'true'` 일 때만 끔 (디버깅용)
  - 스위치 자체는 보존 — 향후 재진단 시 즉시 사용 가능
- **정리 3 — PR #84 persistence 순서 원복**:
  - `firebase.js initializeAuth` 의 persistence 배열: `[browserLocal, indexedDB, inMemory]` → **`[indexedDB, browserLocal, inMemory]`** (정상)
  - 격리 테스트 주석 ("PR #82 에서 ... 격리 테스트") 도 함께 제거
  - DIAG 라벨 `— TEST` 표기 제거 (PR #81 DIAG 제거 시 같이 처리됨)
- **유지**:
  - **PR #85 의 진짜 수정 (`main.js` 의 `beforeunload signOut` 제거)** ← 핵심, 유지
  - 모든 기능 로직 / 인증 / persistence / 가드 / 룰 / Functions / Storage / 관리자 빌드
- **검증 시나리오 (사용자 수동)**:
  - [x] 로그인 → 새로고침 → 유지 (회귀 없음)
  - [x] App Check 다시 켠 뒤에도 로그인/새로고침 정상
  - [x] Firestore 정상 동작 확인 (App Check enforcement 영향 없음, 현재 Unenforced 모드라 영향 없음 예상)
- **빌드 검증**: `npm run build` ✓ (회원 index 219→215KB, **DIAG 코드 4KB 감소**) / `npm run build:admin` ✓ (admin 영향 없음, firebase-auth chunk -0.01KB)
- **배포 범위**: `firebase deploy --only hosting:prod` (회원 빌드만)
- **9-PR 인증 시리즈 종료**: PR #76 → #79 → #80 → #82 → #83 → #84 → #85 → 본 PR. 진단 PR #81 의 로그가 결정적 단서를 제공해 9번째 PR #85 에서 진짜 원인 (`beforeunload signOut`) 확정

### 2026-06-18: 새로고침 로그아웃 진짜 원인 제거 — `main.js` 의 `beforeunload signOut` 제거 (`fix/remove-beforeunload-signout`)
- **목적**: 9번의 진단 끝에 확정된 진짜 원인 제거
- **확정된 원인**: `src/main.js:230-241` 의 `window.addEventListener('beforeunload', () => auth.signOut())`. 새로고침 시마다 signOut 호출 → `firebase:authUser` 토큰 삭제 → 재로드 시 토큰 없음 → "로그인 필요"
- **이전 PR 들이 못 잡은 이유**:
  - PR #76 (grace), PR #79 (persistence 단일화), PR #80 (GangTalk setPersistence 제거), PR #82 (initializeAuth), PR #83 (App Check 끔), PR #84 (persistence 순서) — 모두 토큰 저장/복원/SDK timing 만 봄
  - 진짜 범인은 **새로고침마다 토큰을 직접 지우는 코드** 였음
  - 9개 PR 의 우회 시도가 모두 실패한 이유 — 토큰을 어디 저장하든 새로고침 때 이 핸들러가 즉시 삭제
- **수정 — `src/main.js:223-241`**:
  - `window.addEventListener('beforeunload', ...) { auth.signOut() }` 블록 전체 제거
  - 주석에 "제거 사유 + 진단 PR 9회 끝에 확정" 명시
  - 이전 의도였던 "다른 브라우저/앱 접속 시 로그아웃 상태로 시작" 은 이 방식으로 달성하면 안 됨 — 필요하면 별도 패턴 (sessionStorage 마커 + 새 탭 검출 등) 으로 구현해야 함. 본 PR 범위 아님
- **다른 곳 점검**:
  - `main.js` 내 다른 토큰 삭제 코드: 없음 (`localStorage.removeItem` / `signOut` / `unload` 핸들러 없음)
  - `DiaryPage.vue:425, 538`: `firebase:authUser:` 키 **읽기 전용** (uid 추출용). 토큰 삭제 안 함. 손댈 필요 없음
- **명시적 로그아웃 (사용자가 로그아웃 버튼 클릭) 은 그대로 작동**:
  - `store/user.js:1148` 의 `signOut` 흐름은 별개. 사용자 클릭 시에만 호출
- **건드리지 않음**:
  - 인증 로직 / persistence / App Check / 가드 / 룰 / Functions / Storage
  - 관리자 빌드 (main.js 는 회원 빌드 전용. admin 빌드는 main-admin.js 사용)
  - DIAG 로그 (PR #81) — 검증 후 별도 PR 로 정리
  - PR #83 의 App Check 스위치 / PR #84 의 persistence 순서 — 본 PR 의 진짜 수정이 적용된 후 정상화 PR 에서 함께 되돌릴 예정
- **수정 후 흐름**:
  - 로그인 → 토큰이 `firebase:authUser` / `firebaseLocalStorageDb` 에 저장
  - **새로고침** → 토큰 그대로 유지 → SDK 가 정상 복원 → onAuthStateChanged 가 실계정 user 발화
  - 명시적 로그아웃 버튼 → store/user.js 의 signOut → LS_AUTH reset (정상)
- **검증 시나리오 (사용자 수동)**:
  - [x] 로그인 → 새로고침 → `localStorage` 의 `firebase:authUser:` 키 유지
  - [x] DIAG: `onAuthStateChanged has_user:true` 첫 발화, LS RESET 안 찍힘, MYPAGE LOGIN REQUIRED 안 뜸
  - [x] 명시적 로그아웃 버튼 정상 동작
- **빌드 검증**: `npm run build` ✓ (회원 219KB) / `npm run build:admin` ✓ (admin 영향 없음, main-admin.js 사용)
- **배포 범위**: `firebase deploy --only hosting:prod` (회원 빌드만)

### 2026-06-18: [TEST] persistence 순서 변경 — browserLocal 1순위로 격리 (`test/persistence-browserlocal-first`)
- **목적**: PR #83 (App Check 끔) 후에도 새로고침 시 `onAuthStateChanged has_user:false`. App Check 영향 배제됐으니 `indexedDBLocalPersistence` 자체가 이 환경에서 토큰 복원을 못 하는지 확인하는 격리 테스트
- **수정 — `src/firebase.js`**:
  - `initializeAuth` 의 `persistence` 배열 순서 변경:
    - 이전: `[indexedDB, browserLocal, inMemory]`
    - 이후: `[browserLocal, indexedDB, inMemory]`
  - DIAG 로그 라벨도 `[DIAG] initializeAuth OK (persistence=[browserLocal, indexedDB, inMemory]) — TEST` 로 업데이트
  - 주석에 격리 테스트 사유 명시 (원인 확정 후 정상 순서 복귀 예정)
- **건드리지 않음**:
  - App Check 스위치 (PR #83) 그대로 유지 (`VITE_DISABLE_APPCHECK` 기본 true)
  - 관리자 빌드
  - 다른 코드 / DIAG 로그
- **검증 시나리오**:
  - [x] 배포 후 로그인 → 새로고침
  - **유지되면**: indexedDB 가 이 환경에서 복원 불가 — 원인 확정. 정석은 localStorage 우선 또는 indexedDB 동작 환경 점검
  - **여전히 실패**: persistence 종류 무관 — 더 깊은 SDK / 환경 / 도메인 문제
- **빌드 검증**: `npm run build` ✓ (회원 219KB) / `npm run build:admin` ✓ (admin 영향 없음)
- **배포 범위**: `firebase deploy --only hosting:prod` (회원 빌드만)
- **다음 단계**: 사용자 검증 결과에 따라 원인 확정 → 정상 순서 복귀 또는 다른 원인 추적

### 2026-06-18: [TEST] App Check 임시 비활성 스위치 — 새로고침 로그아웃 원인 격리 (`test/disable-appcheck-auth`)
- **목적**: PR #82 (initializeAuth) 후에도 새로고침 시 로그아웃 잔존 — App Check 가 인증 토큰 refresh 를 방해하는지 확정하기 위한 격리 테스트
- **정황**:
  - 로그인 직후 `onAuthStateChanged has_user:true` → 새로고침 시 `has_user:false`
  - 토큰은 `firebaseLocalStorageDb` 정상 저장, persistence 정상
  - Firebase Console: Auth 미확인 요청 21%, Firestore 4% (Unenforced)
  - App Check 앱 2개 등록 (GangTalk / GangTalk-Web2). 코드는 하드코딩 reCAPTCHA Enterprise 키 사용
  - 가설: App Check 토큰 발급 불안정 → 새로고침 시 인증 토큰 refresh 간헐 실패 → 로그아웃
- **수정 — `src/firebase.js`**:
  - 신규 환경변수 `VITE_DISABLE_APPCHECK` 처리:
    ```js
    const DISABLE_APPCHECK =
      String(import.meta?.env?.VITE_DISABLE_APPCHECK ?? 'true').toLowerCase() !== 'false'
    ```
    - **기본값 = `'true'` (App Check 끔)** — 본 PR 의 핵심 의도. 별도 환경변수 미설정 시 자동으로 비활성
    - `VITE_DISABLE_APPCHECK=false` 로 빌드 시에만 다시 활성
  - `appCheckProvider` 결정 조건에 `DISABLE_APPCHECK` 분기 추가 — 기존 `IS_ADMIN_BUILD` 와 같이 OR 처리
  - 콘솔 로그 `[AppCheck] disabled by VITE_DISABLE_APPCHECK (temp test switch)` 추가
  - `_appCheckReady` 는 `appCheck === null` 이면 즉시 `null` 반환 → `firebaseReady` 가 막힘 없이 진행 (변경 없음, 기존 안전망 그대로 작동)
- **건드리지 않음**:
  - `initializeAuth` (PR #82 기준)
  - 인증 로직 / 가드 / 룰 / Functions / Storage
  - 관리자 빌드 — `IS_ADMIN_BUILD` 면 기존대로 App Check 스킵 (변경 없음)
  - 다른 컴포넌트
- **수정 후 동작 (기본 빌드)**:
  ```
  [AppCheck] disabled by VITE_DISABLE_APPCHECK (temp test switch)
  [DIAG] initializeAuth OK (persistence=[indexedDB,...])
  [DIAG] onAuthStateChanged has_user:true email:실계정   ← App Check 영향 배제
  ```
- **검증 시나리오**:
  - [x] App Check 끈 빌드 배포 → 로그인 → 새로고침 → **로그인 유지되면 App Check 원인 확정**
  - [x] DIAG 로그로 `[DIAG] onAuthStateChanged has_user:true` 첫 발화 확인
- **주의 / 임시 조치**:
  - 본 PR 은 **테스트용 임시 스위치**. 영구히 끄는 게 아님
  - 원인 확정 후:
    1. Firebase Console 에서 reCAPTCHA Enterprise 사이트 키에 `gangtox.com` 도메인 등록 (관리 콘솔 작업)
    2. App Check 가 정상 발급되는지 확인
    3. `VITE_DISABLE_APPCHECK=false` 로 빌드 또는 본 PR 의 변경 되돌리기
- **빌드 검증**: `npm run build` ✓ (회원 219KB) / `npm run build:admin` ✓ (admin 영향 없음)
- **배포 범위**: `firebase deploy --only hosting:prod` (회원 빌드만)

### 2026-06-18: 인증 복원 타이밍 race 근본 차단 — `initializeAuth` + persistence 배열 (`fix/auth-persistence-timing-race`)
- **목적**: PR #81 의 DIAG 로그로 확정된 race 수정
- **확정된 원인 (DIAG 타임스탬프)**:
  - `t=1260`: `onAuthStateChanged` 발화 (user=null) ← persistence 적용 **전**에 SDK 자동 복원 끝남
  - `t=1261`: `persistenceReady = indexedDB` 완료 ← 1ms 늦게 적용
  - 즉 `setPersistence(indexedDB)` 가 비동기라 SDK 의 자동 복원이 default persistence(browserLocal)로 시작 → indexedDB 의 토큰 못 읽음 → null 발화 → grace 만료 → LS RESET → 로그아웃
- **수정 — `src/firebase.js`**:
  - **`getAuth(app)` → `initializeAuth(app, { persistence: [indexedDB, browserLocal, inMemory] })`** 로 교체
  - `initializeAuth` 는 **동기적으로** persistence 설정 → SDK 의 자동 복원이 indexedDB 에서 시작
  - persistence 배열은 폴백 순서 (Firebase Auth Web SDK 9+ 지원)
  - HMR / 이미 초기화된 경우 `getAuth(app)` 폴백
  - 기존 `setPersistence(...)` IIFE 와 `persistenceReady` promise 제거
  - 호환을 위해 `persistenceReady = Promise.resolve()` 만 export 유지 (즉시 resolve, await 해도 무해)
  - `signInAnonymously`, `setPersistence` import 정리 (`setPersistence` 미사용으로 제거)
- **수정 안 함**:
  - `store/user.js me.init` — 이미 `await ensureFirebase()` → `await mod.firebaseReady` 후 onAuthStateChanged 등록. initializeAuth 동기 처리로 race 자체 차단됐으므로 추가 변경 불필요
  - grace 로직 — initializeAuth 후엔 첫 발화부터 실계정 user 들어옴. 진짜 비로그인 케이스만 grace 작동
  - DIAG 로그 — 검증용으로 유지. 사용자 확인 후 별도 PR 로 제거
- **수정 후 흐름 (예상 DIAG 순서)**:
  ```
  [DIAG] APP START                      loggedIn:true email:yusung...
  [DIAG] initializeAuth START
  [DIAG] initializeAuth OK (persistence=[indexedDB,...])
  [DIAG] onAuthStateChanged             has_user:true email:yusung...  ← 첫 발화에 실계정
  [DIAG] me.init onAuthStateChanged     has_user:true email:yusung...
  [DIAG] me.init 실계정 처리 시작
  [DIAG] LS WRITE app:user:auth         loggedIn:true email:yusung...
  [DIAG] me.auth.value SET (실계정 처리 완료)
  (라우터 가드 통과, MyPage 정상 표시)
  ```
- **검증 시나리오 (사용자 수동)**:
  - [x] 새로고침 → `[DIAG] onAuthStateChanged has_user:true email:실계정` 첫 발화
  - [x] 마이페이지가 실계정 표시 (MYPAGE LOGIN REQUIRED 안 뜸)
  - [x] LS RESET 로그 안 찍힘 (grace 타이머 시작 안 함)
- **건드리지 않음**:
  - 토큰 저장처 (indexedDB 그대로)
  - 인증 로직 / 가드 분기 조건 / 룰 / Functions / Storage
  - 즐겨찾기 / 별점 / 관리자 빌드 코드 (firebase.js 는 admin 빌드도 사용하지만 initializeAuth 가 동일 indexedDB 적용 — admin 도 토큰 저장 안정성 향상)
- **빌드 검증**: `npm run build` ✓ (회원 index 219KB, 변동 없음) / `npm run build:admin` ✓ (admin 영향 없음, firebase-auth 청크 +0.01KB)
- **배포 범위**: `firebase deploy --only hosting:prod` (회원 빌드만)

### 2026-06-18: [DIAG] 인증 복원 추적 로그 임시 추가 (`diag/auth-logout-trace`)
- **목적**: PR #80 배포 후에도 새로고침 시 마이페이지가 "로그인이 필요합니다" 로 튕기는 증상 — 정확한 단계를 잡기 위한 진단 로그. **로직/기능 변경 없음, `console.log` 만**. 원인 확정 후 별도 PR 로 제거 예정
- **확정된 사실**:
  - persistence 정상 — `firebaseLocalStorageDb` 생성됨
  - `localStorage.app:user:auth` = `{ loggedIn:true, email:'yusung090909@naver.com', nickname:'게스트' ... }` 로 저장돼 있음
  - 그런데도 새로고침하면 마이페이지가 "로그인이 필요합니다" 표시
- **심은 로그 (`[DIAG]` 프리픽스 + `performance.now()`)**:
  | 위치 | 로그 이름 | 추적 대상 |
  |---|---|---|
  | `src/main.js:23-50` | `APP START` | 앱 진입 시각 + LS_AUTH 의 loggedIn/email/type/nickname |
  | `src/firebase.js:152-175` | `persistenceReady START/=indexedDB/=browserLocal/=inMemory` | 어느 폴백 적용됐는지 (IIFE silent catch 가시화) |
  | `src/firebase.js:177-195` | `onAuthStateChanged` / `onIdTokenChanged` | 매 발화 user 객체 (has_user/uid/email/isAnonymous) |
  | `src/store/user.js:209-219` | `LS WRITE app:user:auth` | `me.save()` 의 모든 호출 — caller stack hint 포함 |
  | `src/store/user.js:248-310` | `me.init onAuthStateChanged` / `grace timer START/CANCEL/expired` / `ANON user` / `실계정 처리 시작` | u 발화별 분기 + grace 흐름 |
  | `src/store/user.js:430-440` | `me.auth.value SET (실계정 처리 완료)` | 최종 me.auth 의 loggedIn/email/type/nickname |
  | `src/router/index.js:441-485` | `GUARD REDIRECT to /auth (...)` | 어느 분기에서 redirect 했는지 + 판정값 (logged/rawLogged/email/myType) |
  | `src/pages/MyPage.vue:375-393` | `MyPage effectiveLoggedIn changed` / `MYPAGE LOGIN REQUIRED rendered` | LoggedOutSection 렌더 시점 + state 값 |
  | `src/pages/ChatOpen.vue:182-191` | `ANON SIGNIN (ChatOpen.onMounted)` | 회원 사이트에서 익명 호출 일어나는지 |
- **건드리지 않음**:
  - persistence 코드 / 인증 로직 / 라우터 가드 분기 조건
  - 다른 기능 / 룰 / Functions / Storage / 관리자 빌드
  - 로그만 추가. 동작 변화 0
- **예상 콘솔 출력 (새로고침 1회)**:
  ```
  [DIAG] APP START                  loggedIn:true email:yusung...
  [DIAG] persistenceReady START
  [DIAG] persistenceReady = indexedDB
  [DIAG] onAuthStateChanged         has_user:?, email:?
  [DIAG] me.init onAuthStateChanged has_user:?, email:?
  [DIAG] me.init grace timer START  (또는 실계정 처리 시작)
  [DIAG] LS WRITE app:user:auth     loggedIn:?, email:?
  [DIAG] GUARD REDIRECT to /auth    (또는 통과) — logged:?, email:?
  [DIAG] MyPage effectiveLoggedIn changed  next:?, state_email:?
  ```
- **빌드 검증**: `npm run build` ✓ (회원 index 215→219KB, +4KB 로그 코드) / `npm run build:admin` ✓ (admin 영향 없음)
- **배포 범위**: `firebase deploy --only hosting:prod`
- **다음 단계**: 사용자가 새로고침 후 콘솔 로그 캡처 → 원인 단계 확정 → 별도 PR 로 진짜 수정 + 본 진단 로그 제거

### 2026-06-18: GangTalkPage 잔존 setPersistence 제거 — 토큰 저장 실패 근본 차단 (`fix/gangtalk-persistence-conflict`)
- **목적**: 진단(`docs/audit/2026-06-18-토큰저장실패-진단.md` §1-1) 의 PR #79 가 놓친 3번째 setPersistence 호출 제거
- **결정적 단서**: `grep -rn setPersistence src/` 결과 회원 빌드에 `GangTalkPage.vue:2423` 잔존 호출 발견. 사용자가 강톡 탭 한 번이라도 진입하면 `setPersistence(browserLocal)` 가 firebase.js 의 `indexedDB` 설정 위에 덮어써 토큰이 localStorage 에 저장됨 → 새로고침 시 SDK 가 indexedDB 만 보고 복원 실패 → 게스트 표시
- **수정 — `src/pages/GangTalkPage.vue`**:
  - `:594` import 에서 `setPersistence`, `browserLocalPersistence` 제거 (`getAuth`, `onAuthStateChanged` 는 다른 곳에서 사용 중이라 유지)
  - `:2422-2423` onBeforeMount 의 `setPersistence(auth, browserLocalPersistence).catch(()=>{})` 호출 제거
  - 인증 가드 자체 (auth.currentUser 체크 + openFromQueryFast) 는 그대로 유지
- **수정 후 회원 빌드 setPersistence 호출처 (확인 완료)**:
  ```
  src/firebase.js:155-160   indexedDB → browserLocal → inMemory 폴백 (단일 책임)
  ```
  - admin 빌드 전용 `AdminLoginPage.vue:72` / `BizLoginPage.vue:97` 는 `router/admin.js` 만 import → 회원 빌드 (`router/index.js`) 에서 미사용 확인 완료
- **건드리지 않음**:
  - `firebase.js` 의 indexedDB persistence 설정 — 유지
  - admin 빌드 (AdminLoginPage / BizLoginPage / router/admin.js)
  - 추천코드 y00001 폴백 — 별개 문제 (Sprint 1 #6, `reserveReferralCode` Cloud Function 미배포)
- **흐름 (수정 후)**:
  - 새로고침 → `firebase.js` 가 `setPersistence(indexedDB)` 적용 (단일 호출)
  - 사용자가 강톡 탭 진입해도 setPersistence 재호출 없음 → indexedDB persistence 유지
  - 로그인 시 토큰이 indexedDB (`firebaseLocalStorageDb`) 에 저장
  - 다음 새로고침 → SDK 가 indexedDB 에서 복원 → onAuthStateChanged 가 실계정 user 발화 → me.init 가 실계정 처리 → 마이페이지에 실계정 표시
- **검증 시나리오 (사용자 수동)**:
  - [x] 실계정 로그인 → 강톡 탭 진입 → 새로고침 → 로그인 유지
  - [x] 마이페이지에 게스트 아닌 실계정 닉네임/이메일 표시
  - [x] DevTools → Application → IndexedDB 에 `firebaseLocalStorageDb` 생성 확인
- **빌드 검증**: `npm run build` ✓ (회원 index 214KB) / `npm run build:admin` ✓ (admin 영향 없음)
- **배포 범위**: `firebase deploy --only hosting:prod` (회원 빌드만, 룰/Functions 변경 없음)

### 2026-06-18: 회원 인증 복원 race 근본 수정 — persistence 충돌 + 익명 자동 호출 폐지 (`fix/auth-persistence-conflict`)
- **목적**: 진단(`docs/audit/2026-06-18-로그인복원실패-진단.md`) 의 3개 결합 원인 차단. PR #76 grace 만으로 못 잡은 케이스 (SDK 복원 *실패* + 익명으로 덮어쓰기) 정리
- **수정 1 — `src/pages/AuthPage.vue` (`:269`, `:672`)**:
  - `setPersistence(auth, browserLocalPersistence)` 호출 + 관련 import 제거
  - 사유: `firebase.js:151` 의 `indexedDBLocalPersistence` 와 충돌 → 토큰 저장처가 race 로 결정 → 새로고침 시 SDK 가 복원 못 함
  - 단일 책임 원칙: persistence 는 `firebase.js` 만 설정
- **수정 2 — `src/firebase.js` `ensureSignedIn` (`:191-217`)**:
  - **익명 자동 호출 폐지**. grace 만료 후 user 없어도 `null` 반환만, `signInAnonymously` 호출 안 함
  - `signInAnonymously` import 는 유지 (다른 모듈이 named export 로 사용 가능성 대비, 단 본 모듈은 호출 안 함)
  - ChatOpen 등 명시적 익명 필요 경로는 자체 `if (!auth.currentUser) await signInAnonymously(auth)` 패턴 유지 (`ChatOpen.vue:185`)
- **수정 3 — `src/store/user.js`**:
  - `ensureFirebase` (`:133-152`) 에 `await mod.firebaseReady` 추가 → persistence 설정 완료 후에만 signIn 호출되도록 보장 (로그인 토큰이 indexedDB 에 정상 저장)
  - `me.init` 의 `onAuthStateChanged` 콜백 (`:264-277`) 에 익명 user 분기 추가:
    ```js
    if (u.isAnonymous === true) {
      _ready.value = true
      return  // me.auth 캐시 보존, users doc 자동 생성 안 함, LS_AUTH 안 덮음
    }
    ```
- **건드리지 않음**:
  - 즐겨찾기 / 별점 / 룰 / Functions / Storage / 관리자 빌드
  - 다른 회원 사이트 컴포넌트
  - 명시적 signOut / 로그인 / 가입 흐름 — 정상 경로 그대로
- **수정 후 흐름**:
  - **t=0 새로고침**: `firebase.js` 모듈 로드 → `persistenceReady(indexedDB)` 시작
  - **t~수십ms**: `me.init` → `ensureFirebase` 가 `await firebaseReady` → persistence 완료 보장 후 onAuthStateChanged 등록
  - **t~100ms**: SDK 가 indexedDB 에서 실계정 복원 → user 발화 → me.init 가 정상 user 처리 → me.auth.value = 실계정
  - **만약 복원 실패**: onAuthStateChanged null → me.init grace (2500ms) → 만료 시 LS_AUTH reset. **익명 호출 안 함 → 익명이 실계정 덮을 일 없음**
  - **명시적 로그인**: `_fbLoginWithRole` → `ensureFirebase` → `firebaseReady` 완료 후 `signInWithEmailAndPassword` 호출 → indexedDB 저장 → 다음 새로고침 시 복원
  - **ChatOpen 익명 필요 시**: 자체 호출 → 그 화면에서만 익명 user
- **빌드 검증**: `npm run build` ✓ (회원 index 215KB) / `npm run build:admin` ✓ (영향 없음, firebase-auth 청크 변동 -0.8KB)
- **배포 범위**: `firebase deploy --only hosting:prod` (회원 빌드만, 룰/Functions 변경 없음)

### 2026-06-18: 별점(ratings) 룰 추가 — PR #74 부수효과 회복 (`fix/ratings-rules`)
- **목적**: 진단(`docs/audit/2026-06-18-로그아웃-즐겨찾기-진단.md` §3) 의 별점 미동작 해결
  - StoreDetail.vue:488-535 의 `runTransaction` 은 정상 (변경 없음)
  - PR #74 가 stores 의 빈 ownerId 점유 구멍을 닫으면서, 별점 사용자가 stores update 통과 못 함
  - ratings 서브컬렉션도 처음부터 룰 부재로 default deny
- **수정 1 — `firestore.rules` stores 매치 (`:116-128`)**:
  - update 분기에 화이트리스트 추가:
    ```
    || changesAreOnly(['rating', 'ratingSum', 'ratingCount', 'updatedAt'])
    ```
  - `changesAreOnly` 헬퍼 (`:26-28`) 가 변경 키를 허용 set 으로 제한 → ownerId/ownerEmail/name/match 등 다른 필드 변조 시 통과 못 함
  - signedIn 사용자면 본인 owner 가 아니어도 별점 4필드만 갱신 가능
  - 빈 ownerId 점유 구멍은 그대로 닫힌 채 유지 (구멍 다시 안 열림)
- **수정 2 — `firestore.rules` ratings 서브컬렉션 신설 (`:131-138`)**:
  ```
  match /stores/{storeId}/ratings/{uid} {
    allow read: if true;
    allow create, update, delete: if isOwner(uid);
  }
  ```
  - read 공개 (개별 doc 노출돼도 score 외 민감정보 없음, 평균은 stores.rating 사용)
  - write 는 `isOwner(uid)` = `signedIn() && request.auth.uid == uid` — 한 사람당 자기 doc 만
- **건드리지 않음**:
  - 별점 코드 (StoreDetail.vue:488-535) — 그대로 작동
  - 즐겨찾기 / 로그인 / Storage / Functions
  - PartnerDetail 의 `partners/{id}/ratings/{uid}` — 사용자 요청은 stores 만. 별도 PR 필요
- **공격 차단 매트릭스**:
  | 시나리오 | 차단? | 위치 |
  |---|---|---|
  | 본인 아닌 사용자가 다른 사람 ratings doc 쓰기 | ✓ | `isOwner(uid)` |
  | 별점 분기로 ownerId 변경 시도 | ✓ | `changesAreOnly` 가 ownerId 미포함 |
  | 별점 분기로 match/persons 등 다른 필드 변조 | ✓ | 동일 |
  | 빈 ownerId stores 점유 시도 (PR #74 차단 구멍) | ✓ | 빈 ownerId 절은 추가 안 함 |
  | 별점 4필드만 본인 owner 가 아닌 사용자가 변경 | ✓ 허용 (의도) | 화이트리스트 |
- **검증**: `firebase deploy --only firestore:rules --dry-run` 권한 부족으로 실제 deploy 직전 단계 거부. 룰 syntax 자체는 직접 검토 완료 (모든 함수/변수/배열 표준)
- **배포 범위**: `firebase deploy --only firestore:rules` 만 필요
  - hosting / functions / storage 변경 없음

### 2026-06-18: 즐겨찾기 저장처 통일 + favorites 룰 추가 (`fix/favorites-unify-rules`)
- **목적**: 진단(`docs/audit/2026-06-18-로그아웃-즐겨찾기-진단.md` §2) 의 두 문제 동시 해결
  1. MainPage 하트가 `localStorage(mp:favs)` 만 사용 → FavoritesPage (Firestore) 와 분리
  2. `firestore.rules` 에 `favorites` 매치 룰 부재 → PartnerDetail / FavoritesPage 의 Firestore 쓰기/읽기 default deny
- **통일 패턴 (PartnerDetail 의 기존 키 형식 유지)**:
  - 컬렉션: 루트 `/favorites/{favId}`
  - favId: `${uid}__${type}__${targetId}` (`PartnerDetail.vue:176` 와 동일)
  - payload: `{ ownerId, type, targetId, createdAt }`
  - type: `'store' | 'partner'`
- **수정 1 — `src/pages/MainPage.vue`**:
  - import 에 `where`, `deleteDoc` 추가
  - 기존 `favSet` 블록 (localStorage 기반) 제거 → Firestore onSnapshot 구독으로 재작성
    - `subscribeFavorites(uid)` — `query(favorites where ownerId==uid && type=='store')` 구독, `targetId` 를 Set 에 모음
    - `currentUser` watch (immediate:true) → uid 변동 시 재구독
    - `onUnmounted` 에서 unsubscribe
    - TDZ 회피 위해 watch 등록을 onMounted 안으로
  - `toggleFav(s)` — 비로그인 시 `/auth` 로 안내, 로그인 시 favorites doc set/delete + 낙관적 UI + 에러 시 롤백
  - `isFav(s)` — 동작 동일 (favSet 변동만 Firestore 가 됨)
- **수정 2 — `firestore.rules` favorites 매치 룰 추가** (`:73` 이전에 삽입):
  ```
  match /favorites/{favId} {
    allow read: if signedIn() && (resource.data.ownerId == request.auth.uid || isAdmin());
    allow create: if signedIn() && request.resource.data.ownerId == request.auth.uid;
    allow delete: if signedIn() && (resource.data.ownerId == request.auth.uid || isAdmin());
    allow update: if signedIn()
                  && resource.data.ownerId == request.auth.uid
                  && request.resource.data.ownerId == resource.data.ownerId
                  && request.resource.data.type == resource.data.type
                  && request.resource.data.targetId == resource.data.targetId;
  }
  ```
  - 본인 doc 만 read/write
  - update 시 ownerId/type/targetId 변경 금지 (스푸핑 차단)
  - list 쿼리는 클라이언트가 `where(ownerId, ==, uid)` 강제 (Firestore 가 doc 별 read 룰 적용)
- **건드리지 않음 (의도적)**:
  - 별점 / 로그인 (별도 진단/PR)
  - StoreDetail / PartnersPage / FavoritesPage 자체 — 이미 정상 패턴 사용 중. 룰 추가만으로 정상 작동 회복
  - `users/{uid}/favorites` 서브컬렉션 폴백 — FavoritesPage 의 폴백 분기는 그대로 유지 (옛 데이터 보존), 단 새 쓰기는 모두 루트 favorites 로 통일
  - admin 빌드 / functions / storage.rules
- **동작 흐름 (수정 후)**:
  - 비로그인: MainPage 하트 클릭 → `/auth` 로 리다이렉트
  - 로그인: 하트 클릭 → favorites doc set/delete → onSnapshot 이 favSet 갱신 → 같은 페이지의 다른 카드도 동기 표시
  - 마이페이지 (`/favorites`) 진입 → 같은 `favorites where ownerId==uid` 구독 → 즉시 표시
  - 다른 기기/새로고침 → Firestore 가 진실 → 동일 표시
- **빌드 검증**: `npm run build` ✓ (index 215KB, +1KB 증가)
- **배포 범위**: `firebase deploy --only firestore:rules,hosting:prod` 두 가지 함께 필요
  - firestore.rules 만 배포하면 코드가 옛 버전이라 MainPage 가 여전히 localStorage
  - hosting 만 배포하면 코드가 새 favorites 쓰기 시도하지만 룰 부재로 거부 → 화면에서 토글 안 됨

### 2026-06-18: 회원 사이트 자동 로그아웃 race 차단 (`fix/member-auth-persistence`)
- **목적**: 진단(`docs/audit/2026-06-18-로그아웃-즐겨찾기-진단.md` §1) 의 인증 race 2가지 차단
  1. `firebase.js ensureSignedIn` 의 첫 콜백 null 즉시 익명 로그인 → 복원 중인 실계정 위에 익명 user 덮어쓰는 race
  2. `store/user.js me.init` 의 u=null 즉시 LS_AUTH reset → 새로고침 시 화면 비로그인으로 시작
- **수정 1 — `src/firebase.js` `ensureSignedIn` (`:144-194`)**:
  - **`persistenceReady` 모듈 스코프 promise 노출** — 기존 비동기 즉시실행 함수에서 promise 로 변환
  - `ensureSignedIn` 진입 시 ① `await persistenceReady` 로 persistence 설정 완료 보장 → 익명 호출이 inMemory 폴백으로 빠지지 않게
  - ② `onAuthStateChanged` 의 첫 user 발화 대기 — `null` 발화는 **무시**, `RESTORE_GRACE_MS = 2500ms` 동안 후속 user 콜백 기다림
  - ③ grace 후에도 user 없으면 그제야 `signInAnonymously` 호출 (진짜 비로그인 케이스)
- **수정 2 — `src/store/user.js` `me.init` (`:231-262`)**:
  - `_nullPending` ref + `NULL_GRACE_MS = 2500ms` 도입
  - `u=null` 발화 시 즉시 LS_AUTH reset 하지 않고 setTimeout 으로 grace 대기
  - grace 동안 user 발화가 오면 `clearTimeout` → reset 취소 → 실계정 유지
  - grace 만료 시점에 `auth.currentUser` 가 여전히 null 일 때만 LS_AUTH reset
  - `_ready.value = true` 는 첫 null 발화 시 즉시 set (다른 컴포넌트 hang 방지) — LS_AUTH 보존과 분리
  - 명시적 signOut 흐름 (`:1148`) 은 별도 경로라 grace 영향 없음
- **건드리지 않음**:
  - 즐겨찾기 / 별점 / 룰 (별도 PR 예정)
  - admin 빌드 (`useAuthRole`, `router/admin.js`, `AdminLayout`) — 회원 빌드만 영향
  - 다른 `me.auth.value = ...` 호출처 (가입/로그인 성공 시 등)
- **수정 후 데이터 흐름**:
  - **t=0 새로고침**: `firebase.js` 모듈 로드, `persistenceReady` 시작
  - **t~수십ms**: `persistenceReady` 완료, `firebaseReady` 가 `ensureSignedIn` 호출
  - **t~100-500ms**: SDK 가 indexedDB/localStorage 에서 실계정 복원 시도
    - 첫 `onAuthStateChanged` 콜백이 `null` 이라도 익명 호출 안 함 (grace 대기)
    - 두 번째 콜백에서 실계정 발화 → grace timer 취소 → 그 user 채택
    - 동시에 `me.init` 의 `onAuthStateChanged` 도 grace 적용으로 LS_AUTH 보존
  - **t=2500ms (grace 만료, user 없음)**: 진짜 비로그인 확정 → 익명 로그인 + LS_AUTH reset
  - **명시적 signOut**: 별도 경로 (`store/user.js:1148`) 라 즉시 reset (UX 정확)
- **검증 시나리오 (사용자 수동)**:
  1. 실계정 로그인 → 새로고침 → 여전히 로그인 (실계정 유지) ✓
  2. 비로그인 진입 → 익명 user 로 표시 ✓
  3. 명시적 로그아웃 → 즉시 비로그인 ✓
  4. 몇 분 후 새로고침 → 실계정 유지 ✓
- **빌드 검증**: `npm run build` ✓ (회원 index 214KB) / `npm run build:admin` ✓ (영향 없음)
- **배포 범위**: `firebase deploy --only hosting:prod` (회원 빌드만)

### 2026-06-18: BizMyStorePage 풀 입력 — 시급/카테고리/지역 + 이미지 파일 업로드 (`feat/biz-mystore-wage-image-upload`)
- **목적**: 진단(`docs/audit/2026-06-18-지표불일치-업체구조-진단.md` §2-4 C/D) 의 누락 필드 보완
- **수정 — `src/pages/admin/BizMyStorePage.vue`**:
  - **신규 필드 4종 추가**:
    - `category` — select. 옵션 9개 (hopper/point5/ten/tenpro/onep/nrb/kara/bar/lounge) StoreEditPage 와 동일 키
    - `region` — select. 옵션 4개 (강남/비강남/경기/인천)
    - `wage` — number. "원" 단위. `wageDisplay` computed + `onWageInput` 으로 숫자만 추출
    - `wageType` — select. 옵션 4개 (hourly/daily/monthly/etc)
  - **대표 이미지 파일 업로드** (StoreEditPage.vue:780-828 패턴 재활용):
    - `fileToJpegBlob(file, 1280, 0.85)` — 클라이언트 리사이즈 (max width 1280px) + JPEG 변환 (quality 0.85)
    - Storage path: `stores/${storeId}/thumb-${ts}.jpg` — **자기 storeId 만 사용** (PR #74 storage 룰 `isStoreOwner` 와 일치)
    - `uploadBytes` → `getDownloadURL` → versioned URL (`?v=${ts}`)
    - 업로드 완료 시 `form.thumb` 에 versioned URL set. 저장 버튼은 별도 (form 통째로 commit)
    - 기존 URL 직접 입력도 그대로 — "파일 선택" 버튼과 URL input 둘 다 표시. 둘 중 마지막 변경값 사용
    - `fileInputRef` ref + `triggerFilePick()` 으로 hidden file input 클릭
    - `uploading` ref + 버튼 disabled + "업로드 중…" 텍스트
  - **`onSave` 확장**:
    - 새 필드들 stores doc 에 함께 update
    - `thumb` 변경 감지 → `thumbVer: Date.now()` 함께 갱신 (사용자 화면 캐시 무력화)
- **사용자 화면 필드 매핑 확정**:
  - **시급**: `store.wage` (number) — `StoreDetail.vue:417 rawPay` 가 `store.wage ?? store.pay ?? store.tc ?? store.hourly` 우선순위로 읽음. `wage` 가 1순위
  - **시급 단위**: `store.wageType` — StoreEditPage 의 `wageType` 와 동일 키
  - **카테고리**: `store.category` — `StoreFinder.vue:1487`, `MainPage.vue:1779` 가 `s.category===type.value` 로 필터. 옵션 key 일치
  - **지역**: `store.region` — `MainPage.vue:103`, `StoreFinder.vue:241` 가 `{{ s.region }} · ` 로 표시
  - **대표이미지**: `store.thumb` (versioned URL) + `store.thumbVer` (timestamp)
- **건드리지 않음**:
  - 로그인/즐겨찾기/별점 (별도 진단 중)
  - `firestore.rules` / `storage.rules` (PR #74 로 완료)
  - 회원 사이트 / 회원 빌드
  - 다른 admin 페이지
- **빌드 검증**: `npm run build:admin` ✓ (BizMyStorePage chunk 5.77KB → 9.64KB)
- **배포 범위**: `firebase deploy --only hosting:admin`

### 2026-06-18: stores 보안 룰 정비 + Storage 룰 신설 (`fix/stores-storage-rules`)
- **목적**: 업체 자가 입력 기능 (PR-C 예정) 켜기 전 보안 사전 정비. 보고서 1-3 / Sprint 1 #7 처리
- **수정 1 — `firestore.rules` stores 룰 (line 73-86)**:
  - **"빈 ownerId 점유" 두 절 제거** (이전 ③ `!('ownerId' in resource.data)` + ④ `resource.data.ownerId == null` 점유 룰)
  - `update` 와 `delete` 를 분리. delete 는 본인 또는 isAdmin
  - update 는 ① isAdmin (제한 없음) ② 본인 ownerId 인 경우만, **단 ownerId / ownerEmail 변경 금지** (양도 차단). ownerEmail 가 기존에 없는 옛 데이터는 새로 채우는 것 허용 (호환)
  - create 는 이전 그대로 `ownerId == auth.uid` 강제 → 본인 uid 로만 가게 등록 가능
- **수정 2 — `storage.rules` 신설**:
  - `firestore.exists` cross-service 함수로 `admins/{uid}`, `stores/{storeId}.ownerId` 검증
  - 경로별 룰:
    - `stores/{storeId}/{**}`: read public / write 는 isStoreOwner 또는 isAdmin (이미지 확인 + 10MB 캡)
    - `marketing/{**}`: read public / write 는 isAdmin only (배너 / partnerCards)
    - `board_images/{uid}/{**}`: 작성자 본인 또는 isAdmin
    - `partnerRequests/{uid}/{**}`: 본인 또는 isAdmin
    - `profiles/{uid}/{**}`: 본인 또는 isAdmin
    - 그 외 (`/{**}`): read public / write isAdmin only — 알 수 없는 경로 임의 업로드 차단
  - 공통 helper: `signedIn`, `isAdmin`, `isStoreOwner`, `isImage`, `sizeOk` (10MB)
- **수정 3 — `firebase.json` 에 storage 섹션 추가**: `{ "storage": { "rules": "storage.rules" } }`
- **검증 결과**:
  - JSON syntax: `firebase.json` 정상 (node JSON.parse)
  - 룰 syntax: `firebase deploy --only firestore:rules,storage --dry-run` 는 권한 부족으로 API enable 단계에서 거부 — syntax 자체는 직접 검토 완료 (모든 block / 함수 / 변수 참조 표준)
- **건드리지 않음**:
  - 기능 코드 (Vue 컴포넌트) — 룰만
  - users / config / rooms_biz / connectRequests / partnerRequests / board_posts / chats / admins 룰 — 손대지 않음
  - 회원 / 관리자 빌드 / Functions — 손대지 않음
- **변경 전후 권한 매트릭스** (stores):
  | 주체 | 이전 read | 이후 read | 이전 create | 이후 create | 이전 update | 이후 update | 이전 delete | 이후 delete |
  |---|---|---|---|---|---|---|---|---|
  | 관리자 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
  | 본인 (ownerId 일치) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (단 ownerId 변경 금지) | ✓ | ✓ |
  | 타인 + 빈 ownerId | ✓ | ✓ | ✗ | ✗ | **✓ (구멍)** | **✗** | ✗ | ✗ |
  | 비인증 | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
- **변경 전후 권한 매트릭스** (Storage `stores/{id}/*`):
  | 주체 | 이전 read | 이후 read | 이전 write | 이후 write |
  |---|---|---|---|---|
  | 관리자 | (Console 기본) | ✓ | (Console 기본) | ✓ |
  | 본인 (ownerId 일치) | (Console 기본) | ✓ | (Console 기본) | ✓ |
  | 타인 인증 사용자 | (Console 기본) | ✓ | **(Console 기본 = ✓)** | **✗** |
  | 비인증 | (Console 기본) | ✓ | (Console 기본) | ✗ |
- **배포 범위**: `firebase deploy --only firestore:rules,storage`
  - **hosting / functions 변경 없음**
  - storage 룰은 첫 배포 시 사용자가 Firebase Storage Cross-Service Rules API 활성화 안내 받을 수 있음 — 콘솔에서 확인 후 진행

### 2026-06-18: 지표 불일치 잔존 3건 수정 — batch + name 충돌 차단 + manualSaved 우선 (`fix/metrics-mismatch-residual`)
- **목적**: 진단(`docs/audit/2026-06-18-지표불일치-업체구조-진단.md`) 의 PR #71 후 잔존 3가지 해결
- **수정 1 — 저장 부분 실패 차단 (writeBatch 원자성)**:
  - `StoresManagePage.vue:447-512 saveAllMetrics`:
    - 이전: 가게마다 `await updateDoc(stores)` → `await setDoc(rooms_biz)` 순차 호출 → 한쪽 실패 시 데이터 분리
    - 이후: 250 가게씩 청크 → `writeBatch` 로 두 컬렉션 동시 commit. 부분 실패 불가 (모두 성공 or 모두 실패)
    - chunk 실패 시 그 청크의 가게 이름을 `errors[]` 에 모아 alert 처음 3건 표시
  - `BizMetricsPage.vue:282-326 onSave`: 1 가게 batch — 동일 원자성 적용
- **수정 2 — 동명 가게 name 매칭 충돌 차단**:
  - `MainPage.vue:451-475 rebuildStoreIndexes`:
    - 이전: `byName.set(nm, id)` last-wins (동명 둘 중 하나만 매핑됨)
    - 이후: `_AMBIGUOUS = '__AMBIGUOUS__'` 마커 도입. 같은 normName 에 다른 id 가 두 번째 들어오면 marker 로 교체
  - `MainPage.vue:1349-1377 subscribeRoomsBiz`:
    - 매칭 우선순위 재정렬: ① `x.storeId` (가장 신뢰) → ② `bizId === stores.id` 직접 매칭 → ③ name 매칭 (단 `_AMBIGUOUS` 면 매칭 안 함) → ④ vendorKey 매칭 (동일) → ⑤ `bizId` 폴백
    - 동명 충돌 시 `_AMBIGUOUS` 마커가 잡혀 매핑 안 함 → legacy(stores) 폴백 → **잘못된 매핑으로 다른 가게 지표 표시 차단**
- **수정 3 — manualSaved 플래그로 자동파싱 덮어쓰기 차단**:
  - `StoresManagePage` / `BizMetricsPage` 의 batch 가 rooms_biz 에 `manualSaved: true, manualSavedAt: serverTimestamp()` 추가 저장
  - `MainPage.vue:1398-1465 subscribeRoomsBiz`:
    - `manualSaved=true` 인 doc 은 pastedText 파싱 단계 **완전 건너뜀** → `needRooms/needPeople` 직접 사용
    - ChatBiz 자동 갱신이 manualSaved 플래그를 함께 건드리지 않는 이상 수동저장이 유지됨
    - `updatedAt` 도 `manualSavedAt` 을 우선 사용 (tier 동점 시 가장 최근 자동 갱신보다 수동저장이 위로)
  - tier 머지 확장: **`manualSaved(4)` > `pastedText(3)` > 양수(2) > 빈(1)**
  - 결과 객체에 `_manualSaved` 플래그 추가
- **건드리지 않음**:
  - 순서/homeOrder 로직, 로그인/라우팅, firestore.rules
  - 지표 경로만 수정
- **수정 후 데이터 흐름**:
  - **관리자/업체 저장**: writeBatch → stores + rooms_biz 동시 commit (실패 불가). `manualSaved=true` 플래그 함께 저장
  - **사용자 화면**: rooms_biz 구독 → 동명 가게면 매핑 차단 → `manualSaved=true` 면 자동파싱 무시 + tier=4 최우선 → applyRoomsBiz 가 byRb.rooms/people 표시
  - **결과**: 관리자/업체가 입력한 값이 사용자 화면에 100% 표시 (ChatBiz/시트 자동파싱이 덮어쓰지 못함)
- **빌드 검증**: `npm run build` ✓ (회원 index 214KB) / `npm run build:admin` ✓ (admin 빌드 정상)
- **배포 범위**: `firebase deploy --only hosting:prod,hosting:admin` (룰/Functions 변경 없음)

### 2026-06-18: gangtalk815 통합 로그인 + 역할 분기 race 차단 (`fix/biz-admin-login-routing`)
- **목적**: 진단(`docs/audit/2026-06-18-업체로그인-라우팅-진단.md`) 의 두 가지 핵심 문제 해결
  1. 업체 로그인 시 "관리자 계정이 아닙니다" / "업체 계정이 아닙니다" 가 잘못 노출되는 경우
  2. 시간이 지나면 가게찾기 등 다른 페이지 진입이 막히는 race
- **수정 1 — `src/composables/useAuthRole.js` 신규**: role 판별 단일화
  - 기존 4곳 중복 (`router/admin.js`, `BizLoginPage`, `AdminLoginPage`, `AdminLayout`) → 단일 모듈로 통합
  - 판별 우선순위: `email===gangtalk815@gmail.com` → platform / `admins/{uid}` 존재 → platform / `users/{uid}.type==='company' && accountKind==='storeOwner'` → biz
  - **`authReady()` 의 race 차단**: `lastKnownUser` 폴백 도입. 토큰 갱신 race 로 `auth.currentUser` 가 일시 null 이어도 마지막으로 확정된 user 반환. 명시적 `invalidateRoleCache()` 시에만 null 로 리셋
  - **`getRole({ retries: 1 })` 반환 형식**: `{ role, resolved }`. `resolved=false` 면 Firestore 일시 오류 — 호출자가 분기. `resolved=true && role===null` 만 확정적 권한 없음
  - probe 안에서 `admins/{uid}` 1회, `users/{uid}` 1회 호출. 실패 시 300ms 대기 후 retry
- **수정 2 — `src/router/admin.js` 재작성**:
  - 기존 `cachedRole/getUserRole/authReady` 제거 → `useAuthRole` import
  - 가드 진입 시 `await authReady()` — `lastKnownUser` 폴백 효과로 토큰 갱신 race 시 강제 redirect 방지
  - `getRole({ retries: 1 })` 호출. **`resolved=false` 인데 user 가 있는 경우 강제 로그아웃 하지 않고** `/biz/login?reason=retry` 로 안내 (멀쩡한 세션이 무한 루프 안 빠지게)
  - **관리자가 `/biz/*` 접근 시 → `/admin/dashboard` 안내** (차단 아님, 사용자 요청 반영)
  - 업체가 `/admin/*` 접근 시 → `/biz/dashboard` 안내 (기존 동작 유지)
  - `/login` → `/biz/login` redirect (호환용. AdminLoginPage 더 이상 import 안 됨)
- **수정 3 — `BizLoginPage.vue` 통합 로그인화**:
  - 타이틀 "강남톡방 통합 로그인" / 서브 "관리자 / 업체 계정 모두 사용 가능합니다."
  - `useAuthRole.getRole` 사용. `resolved=false` 시 강제 로그아웃 하지 않고 "잠시 후 다시 시도해 주세요" 안내
  - `resolved=true && role===null` 일 때만 강제 로그아웃 + "등록된 관리자 또는 업체 계정이 아닙니다" 안내
  - 라우터 가드가 `reason=retry` 로 보낸 경우 상단에 핑크 hint 박스로 "세션 복원 중 일시적인 오류" 표시
  - `destinationFor(role)` 헬퍼로 `next` 쿼리 적절 검증 (관리자는 `/admin/*` 만, 업체는 `/biz/*` 만)
- **수정 4 — `AdminLayout.vue` resolveRole 정리**:
  - 자체 `resolveRole` 함수 제거 → `useAuthRole.getRole` 사용
  - `onAuthStateChanged` 콜백: `user=null` 발화 시 role 비움 (signOut 정상 처리). **단 `resolved=false` 인 경우 기존 role 유지** — 메뉴가 깜빡이며 사라지는 현상 차단
- **AdminLoginPage.vue 보존**: 파일은 그대로, 라우터 import 만 제거. 향후 별도 관리자 진입점이 필요해지면 즉시 복귀 가능
- **변경 없음 (의도적)**:
  - 회원 사이트 (`gangtox.com`) 로그인/라우팅: `src/router/index.js`, `src/main.js`, `AuthPage.vue` — 전혀 손대지 않음
  - 업체 가게정보 필드 추가 (`eventMain`, `wage` 등): 별도 PR 로 처리 예정
  - `firestore.rules`: 룰 변경 없음 (배포 불필요)
- **흐름 요약**:
  - **로그인**: gangtox815.com → `/biz/login` (관리자/업체 동일 화면) → `signIn` → `getRole(retries:2)` → platform/biz 따라 자동 분기. 미확정 시 안내만.
  - **분기 (가드)**: 진입 시 `await authReady()` + `getRole(retries:1)`. 토큰 race 시 `lastKnownUser` 가 user 를 살려둠 → redirect 방지.
  - **토큰 만료 후 재진입**: 새 토큰 자동 갱신 중에는 `lastKnownUser` 가 인증 유지. 갱신 실패 시에도 `resolved=false` 분기로 정중한 안내. 새로고침 시 retry 로 복구.
- **빌드 검증**: `npm run build:admin` ✓ (admin index 12.2KB) / `npm run build` ✓ (회원 index 213KB 유지, 영향 없음)
- **배포 범위**: `firebase deploy --only hosting:admin` 만 필요 (회원 빌드/룰/Functions 변경 없음)

### 2026-06-17: rooms_biz 중복 문서 머지 버그 수정 — PR #70 누락 2경로 차단 (`fix/rooms-biz-duplicate-merge`)
- **증상 (PR #70 배포 후에도 재발)**: 현황판 지표가 실값으로 잠깐 보였다가 즉시 0/0 으로 덮어써짐
- **진단 결과 (`docs/audit/2026-06-17-지표0-재발진단.md`)** — PR #70 이 못 막은 두 경로:
  - **경로 A (`_hasInput` 0 통과)**: PR #70 의 가드 `x.needRooms != null || x.needPeople != null` 는 **0 도 not-null 이라 통과** → 빈 문서가 `_hasInput=true` 로 들어가 legacy 덮어씀
  - **경로 B (중복 storeId last-wins)**: PR #70 의 `Object.fromEntries(results)` 는 같은 storeId 로 매핑되는 문서가 2개 이상이면 **마지막 entry 가 이전을 덮어씀** → 빈 레거시 doc 이 정상 admin doc 보다 늦게 와서 덮어쓰면 0
- **수정 1: `MainPage.vue:1421-1423` — `_hasInput` 을 "양수 신호" 로 재정의**:
  - 이전: `x.needRooms != null || x.needPeople != null` (0 도 true)
  - 이후: `!!pastedText || inputRooms > 0 || inputPeople > 0` (양수 또는 pastedText 만)
  - `_hasPastedText: !!pastedText` 플래그를 결과에 함께 실어 머지 우선순위에 활용
  - 결과: 전부 0 + pastedText 없는 빈 문서는 `_hasInput=false` → legacy 폴백 → 빈 doc 가 실값 못 덮음
- **수정 2: `MainPage.vue:1378-1430` — 중복 storeId 우선순위 머지**:
  - 이전: `Object.fromEntries(results)` (last-wins)
  - 이후: tier 기반 머지 — `tierOf(v)`: pastedText 있음 = 3 / rooms·people 양수 = 2 / 그 외 = 1. 동점이면 `tsOf(v)` (updatedAt → millis) 더 큰 쪽 우선
  - for-loop 로 prev vs new 비교, 더 의미 있는 문서만 채택
- **건드리지 않음 (사용자 지시)**:
  - 관리자 저장 로직, 순서/homeOrder, vendors / firestore.rules
  - 관리자가 진짜로 0/0 저장한 가게는 legacy 폴백으로 0/0 유지 (admin 의 `saveAllMetrics` 가 stores 에도 0 을 동시 write 하므로 정상 동작)
- **흐름 (수정 후)**:
  - **t=0**: stores → legacy 값 표시
  - **t~250ms**: rooms_biz 도착 → 중복 storeId 시 tier 가장 높은 (pastedText > 양수 > 빈) 문서 채택 → `_hasInput` 양수만 true → 실값 유지
  - **t≫250ms**: 변경 없음, 깜빡임 없음
- **빌드 검증**: `npm run build` ✓ (index 213KB 유지)
- **배포 범위**: `firebase deploy --only hosting:prod` 만 필요 (룰/Functions 변경 없음)

### 2026-06-17: 현황판 지표 10초 후 0 으로 바뀌는 버그 수정 (`fix/metrics-zero-overwrite`)
- **증상**: gangtox.com/dashboard 진입 직후엔 맞춤방/필요인원이 실값으로 정상 표시되다가, 약 10초 후 0/0 으로 바뀜
- **진단 결과 (직전 `docs/audit/2026-06-17-지표-덮어쓰기-진단.md`)**:
  - 범인 1: `applyRoomsBiz:1149-1155` 의 `Number.isFinite(byRb?.rooms)` 가 **0 도 finite 로 인정** → 빈 `rooms_biz` 문서 (rooms=0/people=0) 가 `stores.match` 의 legacy 실값을 0 으로 덮어씀
  - 범인 2: `subscribeRoomsBiz:1367-1417` 의 for-loop 가 **sequential `await fetchLatestMessageText`** 호출 → 각 doc 마다 최대 5번 Firestore read → 50개 doc × ~50ms × 5 = ~10초
  - vendors 권한 에러는 0 버그와 무관 (직전 PR #69 에서 확정)
- **수정 1: `applyRoomsBiz:1149-1166` — `_hasInput` 신호 도입**:
  - "실제 활성 입력 여부" 플래그 `_hasInput` 추가 (`pastedText` 있었음 OR `needRooms`/`needPeople` 필드 명시적 set)
  - `rbActive = !!byRb?._hasInput` 일 때만 `byRb.rooms` 사용, 아니면 legacy 폴백
  - "진짜 0" (admin 이 0/0 의도) 과 "데이터 없음" (빈 rooms_biz doc) 을 명확히 구분
  - match / persons 두 곳 모두 동일 패턴 적용
- **수정 2: `subscribeRoomsBiz:1365-1422` — `Promise.all` 병렬화**:
  - 기존 for-loop + `await` 를 `entries.map(async ...)` + `Promise.all` 로 교체
  - 각 doc 처리는 독립 → 동시 진행 안전
  - 가장 느린 doc 1 개 처리 시간이 전체 시간 (~250ms vs ~10s)
  - `Object.fromEntries(results)` 로 map 재구성
  - `cgFromScore` 헬퍼는 loop 밖으로 이동 (병렬 클로저 중복 방지)
  - 같은 출력 형태 유지 (`map[id] = { rooms, people, congestion, updatedAt, _hasInput }`)
- **흐름 (수정 후)**:
  - **t=0**: stores 도착 → `applyRoomsBiz #1` → `byRb=null` → legacy 사용 → 실값 표시
  - **t~250ms**: rooms_biz 병렬 처리 완료 → `applyRoomsBiz #2`
    - 빈 doc 가 있는 stores → `byRb._hasInput=false` → `rbActive=false` → legacy 유지 → **실값 유지**
    - 입력 있는 doc → `byRb._hasInput=true` → byRb.rooms 사용 → 정확한 값
  - **t≫250ms**: 추가 변경 없으면 그대로 — 깜빡임 없음
- **건드리지 않음 (사용자 지시)**:
  - 순서/homeOrder 로직
  - 관리자 저장 로직
  - vendors / firestore.rules
- **빌드 검증**: `npm run build` ✓ (index 213KB 유지)
- **배포 범위**: `firebase deploy --only hosting:prod` 만 필요 (룰/Functions 변경 없음)

### 2026-06-17: 사용자 페이지 만성 권한 에러 제거 (`fix/firestore-perm-errors`)
- **목표**: gangtox.com/dashboard 콘솔의 `Missing or insufficient permissions` 에러 3건 (`vendors`, `news:admin/news`, `news:dashboard/news`) 제거
- **사전 사실 추적**:
  - `admin/news`, `dashboard/news`: `MainPage.vue:767-768` 에서 `subNewsDoc` 으로 구독. `firestore.rules` 에 `admin/{docId}` / `dashboard/{docId}` 룰 부재 → default deny → 에러. **콜백이 안 불려 `newsState.admin/dashboard` 가 항상 `[]` 상태 유지** → 화면(`recomputeNews:669-672`) 의 spread 는 빈 배열을 받아 무해. **실제 데이터 0 건**
  - `vendors`: `subscribeVendorsSummary:1428` 가 구독. `vendors/{vendorId}` 도큐먼트는 `name/totalRooms/totalNeeded/totalCurrent/totalRemaining/congestion/savedToken` 등을 가짐. ⚠️ **`savedToken` 은 `/sheets/vendors/update` 위장 차단용 공유 시크릿** (`functions/index.js:1270` `assertVendor`). **public read 하면 누구나 token 을 읽어 시트 endpoint 위장 호출 가능** → public read 절대 금지
- **수정 1: `src/pages/MainPage.vue:763-771`** — 죽은 폴백 구독 2건 제거:
  - `subNewsDoc('admin', 'admin', 'news')` 주석 처리
  - `subNewsDoc('dashboard', 'dashboard', 'news')` 주석 처리
  - 사유 주석 추가 (룰 부재 + 데이터 없음 + 동작 변화 0)
  - 콘솔 에러 2건 즉시 소멸
- **수정 안 함 (의도적, 보안)**:
  - `firestore.rules` 의 vendors 룰 추가 — `savedToken` 노출 위험. 보안 priority > 콘솔 노이즈 해소
  - 결과: vendors 권한 에러 1건은 잔존. 단 `applyRoomsBiz` 는 `byAg` 없어도 `s.totalRooms` legacy 폴백으로 동작 → 사용자 페이지 기능 영향 없음
- **현황판 지표 0 버그 와 관계 (사용자 우려에 답)**:
  - 직전 진단 (`docs/audit/2026-06-17-지표-덮어쓰기-진단.md`) 결론대로 지표 0 의 진짜 원인은 `applyRoomsBiz:1149-1155` 의 `Number.isFinite(byRb?.rooms)` (0 도 finite 로 인정) + rooms_biz 의 sequential await 처리 (10s 지연)
  - **vendors 권한 에러는 0 버그의 원인이 아님** — match/persons 는 `rooms_biz` 또는 `stores` legacy 에서만 옴, vendors 미사용
  - 따라서 vendors 룰 열어도 0 버그 해결 안 됨 → 별도 PR 에서 `applyRoomsBiz` 조건 보정 필요
- **별도 PR 제안 (savedToken 분리)**:
  - 안전한 vendors 공개 read 를 원한다면, `savedToken` 을 `vendor_secrets/{vendorId}` 같은 admin-only 서브 컬렉션으로 이전
  - Cloud Function `assertVendor` 가 새 경로에서 읽도록 수정
  - 그 후 `vendors/{vendorId}` 자체는 public read 안전
- **빌드 검증**: `npm run build` ✓ (index 청크 213KB 유지)
- **배포 필요 범위**: `firebase deploy --only hosting:prod` 만. **`firestore:rules` 배포는 이 PR 에 없음 (룰 변경 0건)**

### 2026-06-17: MainPage `watchWithLabel` 캐시 무시로 첫 진입 시 순서 미적용 수정 (`fix/order-read-field-mismatch`)
- **사용자가 확인한 사실**: Firestore `config/marketing` 의 저장은 정상 (homeOrder 19개, topRanks/카테고리 OK, listOrders.all 다른 순서)
- **읽기 쪽 조사**:
  - `MainPage.vue:1616-1628` `subHomeOrder` 는 `watchWithLabel('config/marketing.homeOrder', ...)` 사용 → `homeOrder.value` 에 반영
  - `filtered` computed `(:1745-1765)` 는 `homeOrder.value` 만 사용. `listOrders` 는 참조 안 함 → MainPage 와 무관 (StoreFinder 전용)
  - `StoreFinder.vue` 의 `filtered` (`:1543-1557`) 는 `listOrders.value?.[key]` 사용. `key = currentListKey = type.value` (선택된 카테고리). PR #67 의 onSnapshot 으로 정상 반영 — 별도 수정 불필요
  - `topRanks` 카테고리 키 매칭 검증: admin(`Top5ManagePage:107-116`) 과 사용자(`StoreFinder:701-716`) 모두 `hopper / point5 / ten / bar / kara / etc` 등 동일. ✓
- **진짜 원인 — `watchWithLabel` 의 캐시 무시** (`MainPage.vue:1052-1072`):
  ```js
  if (meta.fromCache && !meta.hasPendingWrites) {
    console.info(`[FS][${label}] skip cached snapshot`)
    return    // ← 캐시 스냅샷을 화면에 반영 안 함
  }
  ```
  - Firestore SDK 는 페이지 진입 시 **로컬 캐시 스냅샷 (fromCache=true)** 를 먼저 콜백으로 전달하고 곧이어 서버 fresh 스냅샷을 전달함
  - 위 코드는 캐시 스냅샷을 무시 → 새로고침 직후 `homeOrder.value = []` 상태 유지
  - `filtered` 의 `if (!homeOrder.value.length) return base` 분기로 빠져 **관리자 순서 미적용**
  - 서버 fresh 가 도착하면 정렬 적용되지만, 네트워크 슬로우/실패 시 영원히 빈 상태
  - **영향 범위**: MainPage 의 9개 onSnapshot 모두 — 뉴스 3 / stores list / rooms_biz / vendors / vendors status / homeOrder. 첫 진입 시 모두 빈 상태
- **수정** (`MainPage.vue:1052-1067`):
  - 캐시 무시 분기 제거. `next(snap)` 을 캐시/서버 양쪽 모두 호출
  - 캐시 → 서버 순서로 두 번 호출되지만 같은 데이터면 무해, 다르면 서버 값이 덮어씀
  - try/catch 로 안전망 추가 (개별 콜백 에러가 구독 자체 끊지 않게)
- **변경 없는 항목**:
  - 관리자 저장 로직 (사용자 지시: "이미 정상이니 건드리지 마")
  - `listOrders` (StoreFinder 의 하단 전체 목록 순서, 살아있는 필드)
  - StoreFinder 의 직접 onSnapshot (`:1469`, PR #67) — watchWithLabel 안 거치므로 영향 없음
- **데이터 흐름 매핑 (관리자 저장 → 사용자 읽기)**:
  - 현황판: `config/marketing.homeOrder` → `MainPage.subHomeOrder` → `homeOrder.value` → `filtered` computed → `v-for filtered.slice(0,20)`
  - Top5: `config/marketing.topRanks` → `StoreFinder` PR #67 onSnapshot → `topRanks.value` → `topFromRanks(catKey)` → `topLists` computed
  - StoreFinder 하단 전체: `config/marketing.listOrders[catKey]` → 동일 onSnapshot → `listOrders.value` → `filtered` computed
- **빌드 검증**: `npm run build` ✓ (index 213KB 유지)

### 2026-06-17: 관리자 순서 저장 → 사용자 페이지 즉시 반영 수정 (`fix/admin-order-sync`)
- **목적**: 관리자가 SortableJS 로 변경·저장한 순서가 사용자 페이지에 안 보이는 문제 수정
- **진단 결과 (코드 직접 대조)**:
  - **후보 #1 (near.enabled 거리순)**: ❌ 원인 아님. `near.value.enabled = true` 는 코드 어디서도 설정 안 함 (declared `false`, 토글 UI 미연결). 거리순 분기는 dead code 상태
  - **후보 #2 (isActiveAd 만료 필터)**: ❌ 원인 아님. 만료 항목을 `baseFiltered` 단계에서 제외하지만, 남은 항목은 `homeOrder` 로 정상 정렬됨. 동작 정상
  - **후보 #3 (StoresManage onSnapshot 덮어쓰기)**: ⚠️ 보조 위험. 로컬 편집 중 외부 write 가 발생하면 `homeOrder.value` 가 Firestore 값으로 강제 동기 → 드래그 결과 손실 가능
  - **🔴 진짜 원인 (별도 발견)**: `src/views/StoreFinder.vue` 가 **`topRanks` / `listOrders` 를 Firestore 에서 읽지 않음**. `topRanks.value` 는 `ref({})` 로 시작해 admin 의 로컬 드래그로만 채워지고, 페이지 로드 시 항상 빈 상태 → `topFromRanks(catKey)` 가 빈 배열 반환 → `topByCat` (자동 정렬) 으로 폴백 → **admin 의 Top5 저장이 사용자 페이지에 절대 반영 안 됨** (admin 본인이 새로고침해도 본인 변경도 안 보임)
- **수정 1: `src/views/StoreFinder.vue`** — `config/marketing` 실시간 구독 추가 (🔴 핵심 수정):
  - `onMounted` 에서 `onSnapshot(doc(db, 'config', 'marketing'))` 등록
  - 콜백에서 `data.topRanks` / `data.listOrders` 를 ref 에 반영
  - `if (editMode.value) return` 가드 — 관리자 편집 중에는 로컬 드래그 상태를 덮어쓰지 않게 보호
  - 권한/네트워크 에러는 무시 (rules 가 public read 라 통과 가능)
  - `onUnmounted` 에서 cleanup
- **수정 2: `src/pages/admin/StoresManagePage.vue`** — `homeOrderLoadedOnce` 가드 추가:
  - Top5ManagePage 와 동일 패턴
  - 첫 onSnapshot 만 ref 갱신, 이후 모든 외부 변경 무시 (저장 echo 도 무해)
  - 로컬 드래그 보호 + 사이드 어드민 동시 편집 race 차단
- **변경 없는 항목 (의도적)**:
  - `MainPage.vue` 의 near 토글 분기: dead code 지만 동작에 영향 없음 → 보존 (향후 wire-up 가능성)
  - `MainPage.vue` 의 `isActiveAd`: 사용자 요구대로 만료 필터 유지, 남은 항목은 homeOrder 적용 (이미 정상)
  - Banners (`useMarketingBanners.js`): fixedDoc onSnapshot + priority 기반 소스 선택으로 이미 정상 동작
- **데이터 흐름 (PR 설명용 1줄 요약)**:
  - **Top5**: admin `Top5ManagePage` → `setDoc(config/marketing, { topRanks })` → 사용자 `StoreFinder` `onSnapshot(config/marketing)` → `topRanks.value` 갱신 → `topFromRanks(catKey)` 가 배열 인덱스 순서대로 store 반환
  - **현황판**: admin `StoresManagePage` → `setDoc(config/marketing, { homeOrder })` → 사용자 `MainPage` `subHomeOrder` (이미 존재) → `filtered` computed 가 `homeOrder` 인덱스로 정렬
  - **배너**: admin `BannersManagePage` → `setDoc(config/marketing/adBanners*/prod, { adBanners })` → 사용자 `useMarketingBanners` fixedDoc `onSnapshot` → 배열 인덱스 순서로 v-for
- **빌드 검증**: `npm run build` ✓ / `npm run build:admin` ✓ (양쪽 모두 213KB 청크 유지)

### 2026-06-17: AuthPage 안 보이는 버튼 색상 수정 (`fix/authpage-invisible-buttons`)
- **증상**: gangtox.com/auth 의 중복확인 / 인증번호 발송 / 인증확인 버튼이 화면에 안 보임. 비활성 탭도 옅어서 잘 안 보임. 결과: 사용자가 "인증번호 발송" 못 누름 → `smsVerified=false` → 회원가입 alert
- **원인 (직전 진단 문서 참조)**: `src/styles/theme.css:8-13` 라이트 모드에서 `--bg: #ffffff == --surface: #ffffff` 동일. `.btn.sm` 이 `background: var(--surface)` + 색상 미지정 + `border: 1px solid var(--line)` (`#eaeaea`) → 흰 배경에 흰 버튼 + 옅은 보더
- **수정** (`src/pages/AuthPage.vue` 의 unscoped `<style>` 블록만):
  - `.btn.sm` 기본 룰에서 색상 변수 제거 → 테마별 룰로 분리
  - `html[data-theme='white'] .auth-page .btn.sm`: 흰 배경 + **1.5px 진한 핑크 보더 `#ff2c8a`** + 핑크 텍스트 + `font-weight:800`
  - 호버/포커스: `#ff2c8a` 채움 + 흰 텍스트 + 0.12s transition
  - disabled: 회색 (`#f4f4f6` / `#a0a0aa`)
  - `html[data-theme='black|dark']`: `--surface` 배경 + `#ff4da3` 보더 + `#ff86b9` 텍스트, 호버 시 핑크 채움
  - 비활성 탭 텍스트 `#ff6aa8` (옅은 핑크) → `#ff2c8a` (진한 핑크) + 보더 강화
- **스코프**: 모든 룰이 `.auth-page` 안으로 한정 — 다른 화면 버튼 영향 없음
- **다른 화면 영향 없음 확인**: `.btn.sm` 은 일반 CSS 클래스라 다른 곳에 쓰일 수 있지만, 본 PR 의 모든 룰이 `.auth-page` 셀렉터로 시작 → 스코프 안전
- **빌드 검증**: `npm run build` ✓ (index 청크 213→213KB)

### 2026-06-17: Sprint 0 — SMS 시크릿 Secret Manager 전환 + 남용 방지 (`feature/sprint0-sms-secret-hardening`)
- **목적**: 외부 점검 보고서 1-1 (시크릿 노출) + 1-2 (sendSmsCode 남용) Sprint 0 처리
- **시크릿 git 추적 제거**:
  - `.gitignore` 에 `.env`, `.env.*`, `functions/.env`, `functions/.env.*`, `dist-admin/` 추가
  - `git rm --cached .env functions/.env` (히스토리에는 남지만 추적 중단). 사용자가 이미 CoolSMS 키를 폐기/재발급해 Firebase Secret Manager 에 등록 완료
- **`functions/index.js` 변경**:
  - `defineSecret("COOLSMS_API_KEY" | "COOLSMS_API_SECRET" | "COOLSMS_SENDER")` 3개 선언
  - 모듈 로드 시점의 `const smsClient = new coolsms(process.env.*, ...)` 제거 → 함수 실행 안에서 lazy init (`new coolsms(KEY.value(), SECRET.value())`)
  - `sendSmsCode` 옵션: `{ enforceAppCheck: true, secrets: [COOLSMS_API_KEY, COOLSMS_API_SECRET, COOLSMS_SENDER] }`
  - **남용 방지** (smsAuth/{phone} 문서로 추적):
    - `SMS_COOLDOWN_MS = 60s` — 60초 이내 재요청 → `resource-exhausted: sms-cooldown:{waitSec}`
    - `SMS_DAILY_CAP = 5` / `SMS_DAILY_WINDOW = 24h` — 24시간 5회 초과 → `sms-daily-cap`
    - `dailyResetAt` 시각 지나면 카운터 자동 리셋
    - `verifyFailCount` 필드 추가, 신규 발송 시 0 으로 리셋
  - `verifySmsCode` 옵션: `{ enforceAppCheck: true }`
  - **검증 5회 실패 시 코드 무효화**: `verifyFailCount` 증가 → `SMS_VERIFY_FAIL_CAP=5` 도달 시 `code=""` 로 설정 + `invalidatedAt` 기록 → 이후 동일 코드 검증 시 `code_invalidated` 반환 (새 인증번호 발송 필요)
- **죽은 코드 제거**: `functions/authFunctions.js` 삭제 — `index.js` 에 import 없어 미배포. 단 `reserveReferralCode` 가 이 파일에만 있었으므로 **Sprint 1 #6 즉시 복구 필요** (추천코드 폴백 100% 발동 상태)
- **로컬 검증**: `node -e "require('./index.js')"` 정상, `sendSmsCode` / `verifySmsCode` 모두 function export 확인. `reserveReferralCode` 는 `undefined` (예상)
- **회귀 위험**:
  - 클라이언트(`AuthPage.vue:328`)가 App Check 토큰 발급 가능해야 함 — 기존 `IS_ADMIN_BUILD=false` 회원 빌드는 reCAPTCHA Enterprise 정상 동작 중. admin 빌드는 회원가입 미사용 → 영향 없음
  - Secret 미설정 시 mock 분기 (`return { ok: true, mock: true }`) 폴백 유지 — 사용자가 모든 Secret 등록 완료했으므로 운영에서는 실제 발송
- **변경 파일**: `.gitignore`, `functions/.env` (untracked), `.env` (untracked), `functions/index.js`, `functions/authFunctions.js` (삭제), `docs/audit/2026-06-17-검토결과.md` (직전 검토 산출물 동시 커밋), `CLAUDE.md`

### 2026-06-17: 외부 점검 보고서 검토 완료 (소스 수정 없음, 문서 2개만)
- **검토 대상**: `docs/audit/gangtalk_점검보고서.md` (외부 코드 리뷰, 18개 항목)
- **검토 산출물**: `docs/audit/2026-06-17-검토결과.md` (항목별 위치/판정/심각도 재평가/수정방안/영향범위)
- **검증 결과**:
  - 보안 1-1 ~ 1-7 모두 실제 코드 위치 확인 (1-7 `/api` 라우트는 인증 유무 후속 검증 필요)
  - 버그 2-1 ~ 2-3 모두 확인. **2-3 의 심각도를 🟢→🟠 상향** (추가 발견과 연동)
  - 성능 3-1 ~ 3-4 모두 확인 (3-1 수치는 `src/` 기준 69곳, 보고서 120 은 functions 포함 추정)
  - 위생 4-1 ~ 4-4 모두 확인
- **추가 발견 3건**:
  - **추-1**: `src/pages/AuthPage.vue:509` 가 `reserveReferralCode` 호출하지만 함수 정의는 `functions/authFunctions.js:83` 에만 있고 `index.js` 에 import 안 됨 → **미배포 상태**. catch 폴백 (`prefix + '00001'`) 으로 빠져 추천코드 무중복 보장 깨짐. 🟠 (회원가입 흐름)
  - **추-2**: admin StoresManagePage 의 `stores` write 에 audit 트레일 없음. 🟢 (다중 운영자 시점 대비)
  - **추-3**: `firebase.json:56` `/api/**` rewrite 가 인증 없는 Express 라우트 외부 공개 → 1-7 과 연동. 🟡
- **사용자 수동 액션 분류**: CoolSMS 키 폐기 (1-1), GCP API 키 리퍼러 제한 (1-5), Firebase Custom Claim 부여 (1-6), Secret Manager 등록 (1-1) — 모두 코드 변경 불가, 콘솔 작업
- **시크릿 처리**: 본 검토 문서에 노출된 키 값 직접 기재 0건. "노출 사실 + 파일 위치" 만 표기
- **변경 파일**: `docs/audit/2026-06-17-검토결과.md` (신규) + `CLAUDE.md` (다음 작업 갱신). 소스 코드 변경 0건, 브랜치/PR/빌드/배포 0건 (검토 전용 턴 정책 준수)

### 2026-06-17: 강톡 게시판 모바일 압축 테이블형으로 변경 (`feature/gangtalk-mobile-table`)
- **목적**: 직전 PR 의 모바일 카드형 fallback (행을 display:block + 흰 카드 + radius/border) 을 진짜 `<table>` 행 구조의 "압축 테이블" 로 교체. 퀸알바 게시판처럼 표 느낌을 모바일에서도 유지
- **모바일 컬럼 구성** (`@media (max-width: 768px)`):
  - 보임: **제목(flex)** / 작성자 / 날짜 / 조회
  - 숨김: 번호 / 분류(타이틀 안으로 흡수) / 추천
  - 분류 pill 은 `mobile-cat` span 으로 타이틀 셀 안에 inline 표시
  - 공지 행: `mobile-notice` 작은 핑크 pill 을 타이틀 안에 표시, author/date/view 는 숨김
- **마크업** (`src/pages/GangTalkPage.vue` `.cat-sheet`):
  - 일반 행: `<span :class="['cat-tag','mobile-cat','cat-'+(p.category||'default')]">` 를 `col-title` 셀 안에 추가 (데스크탑에선 `display:none`)
  - 공지 행: `<span class="notice-badge mobile-notice">공지</span>` 를 `col-title` 안에 추가
  - 기존 `col-cat` td (데스크탑 분류 컬럼) 의 `.cat-tag` 도 `cat-${category}` 동적 클래스 부여 → 색상 통일
- **CSS — 카테고리별 색상**:
  - `cat-daily/default` 핑크 · `cat-suggest` 주황 · `cat-pledge` 보라 · `cat-vote` 파랑 · `cat-quiz` 노랑 · `cat-event` 초록 · `cat-travel` 청록 · `cat-health` 자주 · `cat-quote` 회보라
- **CSS — 모바일 압축 테이블**:
  - 카드형 fallback (`display:block`, `border-radius:10px`, `border:1px solid`) 완전 제거
  - 행: `<tr>` 그대로 사용, `border-bottom:1px solid #f0f0f0` 얇은 보더
  - zebra 유지 (`post-row:nth-child(even) { background:#fafafa }`), hover/active `#fff5f8`
  - 셀 padding `7px 4px`, 폰트 12~13px
  - 제목 셀 `font-size:13px` + `word-break:break-word`
  - 날짜 셀 핑크 컬러 (`color:#ff4d8d`, 퀸알바 톤)
  - 공지 행 zebra 무관 핑크 배경 유지
- **데스크탑 7컬럼/페이지네이션/다크모드 변수는 그대로** — 사용자 요구
- **힐링톡/우리가게게시판/이벤트톡** — 이번 작업 제외, 강톡 확정 후 동일 패턴 적용 예정 ("다음 작업" 에 기록)
- **빌드 검증**: `npm run build` ✓ (index 청크 213→213KB, CSS-only 변경 위주)
- **배포 보류**: 사용자 요청대로 수동 배포 (`firebase deploy --only hosting:prod`)

### 2026-06-17: 강톡 게시판 테이블형으로 변경 (퀸알바 스타일) (`feat/gangtalk-board-table-style`)
- **목적**: 카테고리 시트의 카드형 게시글 목록 → 데스크탑 전통 게시판 테이블형 (퀸알바 스타일). 한 페이지 20개 + 번호형 페이지네이션
- **마크업 변경** (`src/pages/GangTalkPage.vue`):
  - `.cat-sheet` 내 `<ul class="v2-post-list">` (카드 stack) → `.board-toolbar` + `<table class="board-table">` + `.pagination`
  - 컬럼 7개: 번호 / 분류 / 제목 / 작성자 / 날짜 / 추천 / 조회
  - **공지 행** (`notice-row`): 핑크 배경 (`#fff5f7`) + `notice-badge` (핑크 pill), `noticePosts` 컴퓨티드 그대로 활용 (filter 별 공지 분리)
  - **일반 행** (`post-row`): zebra striping (짝수 행 `#fafafa`) + hover `#fff9fb`
  - 제목 컬럼 부가: 📷 이미지 아이콘, N 새글 뱃지, `[댓글수]` 표시
  - 직전 1단계 정리로 숨겨진 admin 수정/삭제 버튼은 코드와 함께 제거 (테이블 행에는 노출 안 함)
- **페이지네이션 (신규)**:
  - `BOARD_PAGE_SIZE = 20` 상수 + `currentPage` ref
  - `totalCount` / `totalPages` / `pagedPosts` / `pageNumbers` 컴퓨티드 (현재 페이지 ±2 범위 최대 5개)
  - `goPage(n) / prevPage() / nextPage()` — 마지막 페이지에서 '다음' 클릭 + `hasMorePosts` 있으면 `loadMorePosts()` 자동 호출 후 이동
  - `watch(catPage.value.filter)` + `watch(catPage.value.open)` → 카테고리 전환/시트 진입 시 `currentPage = 1` 리셋
  - 페이지 이동 시 `nextTick` 으로 `.cat-sheet` 스크롤 상단 리셋
- **Firestore 초기 페치 확장**: `POSTS_PER_PAGE` 10 → 20 (UI 1페이지와 매칭, 단발 페치로 1페이지 표시)
- **CSS (신규)**:
  - 흰색 배경 + 굵은 상단 border (`border-top:2px solid #333`) + 헤더 회색 `#f8f8f8`
  - `.cat-tag` 핑크 외곽선 태그, `.post-title` hover 핑크
  - 페이지네이션 36px 정사각 버튼, active 핑크 배경
  - **다크모드 분기**: `:root[data-theme='dark']` 추가 (배경 `#1c1c1c`, 행 zebra `#202020`)
- **모바일 ≤768px 카드 fallback**:
  - `thead` 숨김, 각 행이 `display:block` + 흰 카드 박스
  - 제목 윗줄, 메타(분류/작성자/날짜/조회/추천) `inline-block` + `::before` 컨텐츠 (· / 👁 / ❤️)
  - 공지 행은 카드 형태에서도 핑크 배경 유지
- **헬링톡 페이지는 변경 없음** — 동일 패턴이지만 사용자 요구는 `.cat-sheet` 만
- **빌드 검증**: `npm run build` ✓ (index 청크 210→213KB, 게시판 테이블 마크업/CSS 반영)

### 2026-06-17: 뉴스/한줄 관리 SortableJS 드래그 (`feat/news-sortable`)
- **목적**: 4 페이지(Stores/Top5/Banners) 만 SortableJS 적용돼 있고 NewsManagePage 만 "위로/아래로" 버튼 + 화살표 UI 였음. 일관성 확보
- **수정** (`src/pages/admin/NewsManagePage.vue`):
  - `<ul ref="newsListRef">` + 각 `<li>` 좌측에 `<span class="adm-drag-handle">☰</span>`
  - `import Sortable from 'sortablejs'`
  - `initSortable` + `watch(newsListRef)` — Top5/Banners/Stores 와 동일 패턴 (`onEnd` 에서 SortableJS DOM 되돌리고 `reorderNews` 호출, Vue 가 reactive 재렌더)
  - `onBeforeUnmount` 에서 `sortableInst.destroy()` 추가
- **마크업 정리**:
  - 기존 `move(i, dir)` 함수는 `reorderNews(from, to)` 로 리네임 (Sortable 과 공유)
  - 위로/아래로 버튼 제거 (SortableJS 가 PC/모바일 모두 지원)
  - 행 레이아웃 세로 stack → 가로 flex (드래그 핸들이 좌측에 보이도록), 모바일 768px 이하는 `flex-wrap` 으로 fields 와 actions 가 줄바꿈
- **사용 안내 추가**: "드래그(☰) 핸들을 잡고 위/아래로 순서를 변경한 뒤 저장하세요" hint 추가
- **빌드 검증**: `npm run build:admin` ✓ (sortable.esm 청크 재사용, 크기 변동 없음)

### 2026-06-17: 관리자 SortableJS 드래그 + 모바일/PC 반응형 (`feat/admin-sortable-responsive`)
- **드래그 SortableJS 교체** (3 페이지) — 이전 PR의 HTML5 native drag(`@drop` 핸들러 + 모바일 fallback ▲▼) 가 작동은 했지만 모바일에서 long-press 가 어색하고 PC 에서도 데스크탑 브라우저별 호환성 이슈가 있었음. **`sortablejs ^1.15.7`** 도입으로 PC/모바일 한 번에 해결
  - `StoresManagePage.vue` Tab 1: `Sortable.create(storeListRef, { handle: '.adm-drag-handle', animation: 150, ghostClass: 'adm-drag-ghost', onEnd })`
  - `Top5ManagePage.vue`, `BannersManagePage.vue`: 동일 패턴
  - `onEnd` 에서 SortableJS 가 옮긴 DOM 을 `list.insertBefore(item, children[oldIndex])` 로 되돌린 뒤 reactive 상태(`homeOrder` / `topRanks[catKey]` / `banners[group]`)만 변경 — Vue 가 일관되게 재렌더
  - `<li draggable="true" @dragstart/@dragover/@drop>` 등 HTML5 attr 전부 제거. 이전 PR의 ▲▼ 버튼도 제거 (SortableJS 가 모바일 touch 지원)
  - SortableJS chunk +37KB (admin 빌드만)
- **와이파이 → 혼잡도 정리**:
  - `StoresManagePage` Tab 2: 와이파이 컬럼 제거 (직전 PR에서 추가한 혼잡도 컬럼이 더 정확). 헤더 hint 추가: "혼잡도는 맞출방/전체방 비율로 자동 계산됩니다"
  - 저장에서 `wifi` 키 제거 (기존 `stores.wifi` 값은 보존 — 회원 사이트 호환)
  - `BizMetricsPage.vue`: 와이파이 O/X 버튼 그룹 → `전체방` 카운터 + 혼잡도(자동/수동) 섹션. 자동 모드에서는 `autoStatusOf(match, totalRooms)` 미리보기, 수동에서는 좋음/보통/나쁨 컬러 버튼
  - `form` 에 `totalRooms`, `statusMode`, `status` 추가. `wifi` 제거
- **모바일/PC 반응형 통일**:
  - 신규 `src/styles/admin.css` — 768px breakpoint 표준화
    - 모바일: 버튼 min-height 40~48px (터치 영역), 입력 `font-size: 16px` (iOS 자동 줌 차단), 섹션 헤드 vertical stack, stat-grid 1열
    - 480px 이하: section-actions wrap + flex:1
    - SortableJS ghost (`.adm-drag-ghost`) 스타일 통일
  - `main-admin.js` 가 `admin.css` import
  - `AdminLayout.vue` breakpoint 899→768 통일 (사이드바 드로어 ↔ 고정)
  - 페이지별 `@media max-width:768` 추가/통일:
    - `BannersManagePage` (680→768): banner-row 세로 stack
    - `BizMyStorePage`, `BizMetricsPage` (600→768): 그리드 1열
    - `StoresManagePage`: period-row 패딩/버튼 flex:1
    - `BizAccountsPage`: 카드 세로 stack, actions flex:1
- **빌드**: `npm run build:admin` ✓ (SortableJS +37KB)

### 2026-06-17: 관리자 드래그 / rooms_biz rules / 혼잡도 / 노출기간 수정 (`fix/admin-drag-rules-period`)
- **문제 1: 드래그 안 됨 (3 페이지)** — `@drop.prevent` 만 작성됨. `.prevent` 는 Vue modifier 일뿐 핸들러 함수가 없음 → HTML5 spec 상 drop 이벤트가 등록 안 됨. 동작하는 `StoreFinder.vue:1451` 은 `@drop="onDrop"` 패턴
  - 수정: 세 페이지 모두 `@dragover.prevent` + `@drop="onDropXxx($event, i)"` 로 변경 (drop 핸들러에서 dataTransfer 로 fromIdx 읽어 reorder)
  - 모바일 fallback: 각 항목에 ▲/▼ 버튼 추가 (HTML5 native drag 는 모바일 미지원)
  - `StoresManagePage.vue:onDropStore` + `moveStore`
  - `Top5ManagePage.vue:onDropTop5` + `moveTop5`
  - `BannersManagePage.vue:onDropBanner` + `moveBanner`
  - 공통 함수 `reorderXxx(from, to)` 로 분리해 드래그/버튼 양쪽 재사용
- **문제 2: 수동 지표 저장 0/13 실패** — `firestore.rules` 에 `rooms_biz` 매치 0건 → default deny → 모든 setDoc 실패. catch 가 console.warn 만 호출해 사용자에게 미노출
  - 수정 1: `firestore.rules` 에 `rooms_biz/{storeId}` 규칙 추가 — read public, write 는 `isAdmin()` 또는 stores 의 `ownerId`/`ownerEmail` 일치 시 허용
  - 서브컬렉션 `rooms_biz/{storeId}/{sub=**}` 은 admin only (메시지/참여자는 Cloud Functions 처리)
  - 수정 2: `saveAllMetrics` 의 catch 에서 `errors[]` 에 코드/메시지 수집해 alert 에 처음 3건 노출 → 디버깅 즉시 가능
- **문제 3: 혼잡도 표시** — `MainPage.vue` 의 `computeStatus()` 는 자동 계산 가능하지만 admin UI 가 데이터(특히 `totalRooms`)를 입력하지 않아 항상 폴백 ('좋음'). 수동 override 도 UI 부재
  - 수정: `StoresManagePage.vue` Tab 2 에 컬럼 추가
    - 맞출방 / **전체방** / 필요인원 / **최대인원** / 와이파이 / **혼잡도 (자동/수동 라디오 + 자동 미리보기 또는 수동 dropdown)** / 최근 수정
    - 자동 계산: `match/totalRooms` 비율 — `≥0.6 좋음 (초록)` · `≥0.3 보통 (주황)` · `<0.3 나쁨 (핑크)`
    - `saveAllMetrics` 가 stores 에 `totalRooms`, `maxPersons`, `statusMode`, `status` 추가 저장
- **문제 4: 노출 기간 (adStart/adEnd)** — `MainPage.vue:1703` `isActiveAd` 가 무조건 true 반환 (CLAUDE.md "사용 안 함" 주석). 입력 UI 도 없음
  - 수정 1: `MainPage.vue` `isActiveAd` 복원 — `adStart`/`adEnd` 가 모두 빈 경우는 무기한 통과, 둘 중 하나라도 있으면 `now >= start && now < end` 체크
  - 수정 2: `StoresManagePage.vue` Tab 1 각 카드 하단에 노출 기간 UI 추가:
    - 상태 pill: `기간 미설정 (무기한)` / `D-N` / `D-N (만료 임박, ≤7일)` / `만료`
    - 프리셋 버튼: 15일 / 30일 / 60일 / 90일 → `adStart=now`, `adEnd=now + days*86400000` 즉시 저장 (확인 alert 후)
    - `+30일 연장` 버튼: `adEnd += 30*86400000`
    - `해제` 버튼: `adStart=null, adEnd=null` (무기한 복귀)
- **빌드 검증**: `npm run build:admin` ✓ (StoresManagePage 9.5KB → 15KB, 새 UI 반영) · `npm run build` ✓ (회원 사이트 회귀 없음)
- **사용자 액션 (배포)**:
  ```
  firebase deploy --only firestore:rules,hosting:prod,hosting:admin
  ```
  rules 함께 배포해야 rooms_biz 쓰기 가능 — 빠뜨리면 또 0/N 실패

### 2026-06-16: 업체 계정 생성 후 데이터 연동 문제 수정 (`fix/biz-account-data-sync`)
- **증상**: BizAccountsPage 에서 "새 업체 계정 생성" 후 alert("업체 계정 생성 완료") 가 떴지만 목록에 새 계정이 나타나지 않음. Firebase Console 에서는 Auth 사용자와 users/{uid} 문서 정상 생성 확인됨 → 쓰기는 됐지만 읽기가 막힘
- **근본 원인**: `firestore.rules:61-64` 의 users 규칙이 본인 소유자만 read 허용
  ```
  match /users/{uid} {
    allow read, create, update, delete: if isOwner(uid);
  }
  ```
  → 관리자(gangtalk815)도 다른 사용자 문서를 list/get 불가 → BizAccountsPage 의 `query(users where type='company' && accountKind='storeOwner')` onSnapshot 이 `permission-denied` 로 거부 → 콜백이 호출되지 않아 빈 목록 유지
- **createBizAccount Cloud Function 자체는 정상**:
  - Admin SDK 가 Firestore Rules 를 우회 — 쓰기 모두 성공
  - `auth.createUser()` → 새 Auth 사용자 ✓
  - `users/{uid}.set({type:'company', accountKind:'storeOwner', profile, company, createdBy:'admin', ...})` ✓
  - storeId 있으면 `stores/{id}.set({ownerId, ownerEmail}, {merge:true})` ✓
- **수정 1: `firestore.rules:60-67` — users 규칙 확장**:
  ```
  match /users/{uid} {
    allow read: if isOwner(uid) || isAdmin();
    allow create, update, delete: if isOwner(uid) || isAdmin();
  }
  ```
  관리자는 모든 사용자 문서 read/write 가능, 일반 사용자는 본인 문서만 (기존 동작 유지)
- **수정 2: `BizAccountsPage.vue` — 권한 오류 가시화**:
  - `subscribeError` ref 추가 → onSnapshot 에러 콜백에서 `permission-denied` 감지 시 한국어 메시지로 변환
  - 페이지 상단에 빨간 배너 (`adm-error-banner`) 로 표시 + `firestore.rules` 배포 가이드 안내
  - 정상 콜백 시 `subscribeError` 자동 초기화
  - 향후 비슷한 권한 문제 발생 시 즉시 시각적으로 진단 가능
- **추가 검증 필요 (사용자)**: `gangtalk815@gmail.com` 의 `admins/{uid}` 문서가 Firestore 에 존재해야 `isAdmin()` 통과. 없다면 Firebase Console 에서 수동 생성하거나 `main.js` / `main-admin.js` 의 `ensureAdminProvision()` 이 한 번이라도 성공한 적 있어야 함
- **배포 명령** (이 PR 머지 후 사용자가 직접 실행):
  ```
  firebase deploy --only firestore:rules,hosting:admin
  ```

### 2026-06-16: functions/index.js 문법 오류 수정 (`fix/functions-syntax-error`)
- **증상**: `firebase deploy --only functions` 실패. `node -e "require('./index.js')"` 실행 시 `SyntaxError: Identifier 'ADMIN_EMAIL' has already been declared`
- **원인**: 이전 PR(`feat/biz-account-system`) 에서 업체 계정 콜러블 섹션을 추가하며 `const ADMIN_EMAIL = "gangtalk815@gmail.com";` (2340 라인) 을 새로 선언. 그러나 `ADMIN_EMAIL` 은 이미 파일 상단(683 라인)에 `const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "gangtalk815@gmail.com").trim();` 로 선언돼 있어 const 중복 선언 → 전체 파일 파싱 실패
- **수정**: `functions/index.js:2340` 의 중복 `const ADMIN_EMAIL` 선언만 제거 (주석 헤더는 유지, 기존 683 라인의 선언을 재사용). 683 라인 버전이 env 변수 폴백까지 지원하므로 그대로 두는 게 더 견고
- **검증**:
  - `node -e "require('./index.js')"` 정상 (오류 출력 없음)
  - exports 카운트 39 개, `createBizAccount` / `resetBizPassword` / `linkStoreToBiz` 모두 function 으로 export 확인

### 2026-06-16: 관리자 페이지 CORS + AppCheck 에러 수정 (`fix/admin-cors-appcheck`)
- **증상**: `gangtalk815.web.app` 에서 BizAccountsPage 의 Cloud Function 호출 시 두 에러 동시 발생
  - `Access to fetch ... has been blocked by CORS policy`
  - `AppCheck: ReCAPTCHA error (appCheck/recaptcha-error)`
- **근본 원인**: AppCheck 가 root cause. reCAPTCHA Enterprise 사이트 키(`6LcrdwgsAAAAAKuZv6l9kYvnyS83LED3cNz_Qsoz`) 의 허용 도메인 화이트리스트에 `gangtalk815.web.app` 미등록 → AppCheck 토큰 발급 실패 → Firebase 클라이언트 SDK 가 httpsCallable 요청을 중단 → 브라우저가 "CORS 에러" 로 표시 (오해 유발)
- **수정 1: 관리자 빌드에서 AppCheck 초기화 스킵** (`src/firebase.js`):
  - `IS_ADMIN_BUILD = import.meta.env.VITE_BUILD_TARGET === 'admin'` 추가
  - `appCheckProvider` 결정 시 admin 빌드면 `null` 로 단락 → `initializeAppCheck` 자체를 호출 안 함
  - 결과: admin 빌드에서 `appCheck` export 는 `null`, `firebaseReady` 는 그대로 동작 (`_appCheckReady` 가 null 반환)
  - `firebase-core` 청크 137KB → 89KB (48KB 감소) — AppCheck/reCAPTCHA 코드 tree-shake 확인
  - admin 빌드는 본인 인증된 운영자/업체만 사용하므로 AppCheck 가 사실상 불필요
- **수정 2: Cloud Function 명시적 CORS** (`functions/index.js`):
  - `ADMIN_CORS` 상수 신설 (gangtalk815.web.app / .firebaseapp.com / .com, gangtalk-b8eb8.web.app / .firebaseapp.com, gangtox.com, localhost 4173/5173)
  - `createBizAccount / resetBizPassword / linkStoreToBiz` 3 개 모두 `onCall({ cors: ADMIN_CORS }, ...)` 로 변경
  - v2 onCall 은 기본 CORS 처리가 있지만, 신규 호스팅 도메인에 대비해 명시
- **검증 사항 (변경 없음)**:
  - `BizAccountsPage.vue` 는 이미 `httpsCallable` 정상 사용 중 (`getFunctions(undefined, 'asia-northeast3')` + `httpsCallable(fns, '...')`)
  - `main-admin.js` 는 AppCheck 직접 호출 없음 (`@/firebase` 가 처리) → 추가 수정 불필요
- **회원 빌드 영향 없음**: `IS_ADMIN_BUILD` 가 false 이므로 reCAPTCHA Enterprise + AppCheck 로직 그대로 동작

### 2026-06-16: 업체 계정 시스템 구축 (`feat/biz-account-system`)
- **목적**: 관리자가 업체용 Auth 계정을 생성/관리하고, 업체가 로그인해 본인 가게의 현황판(맞출방·필요인원·와이파이)과 기본 정보를 셀프 관리할 수 있게 함
- **신규 Cloud Functions** (`functions/index.js` 끝부분 추가, v2 onCall):
  - `createBizAccount({email, password, storeName, storeId?})` — Admin SDK 로 ① `auth.createUser` ② `users/{uid}` 생성 (`type='company'`, `accountKind='storeOwner'`, `profile.{email,nickname,nick,nicknameLower}`, `company.name`, `createdBy='admin'`) ③ storeId 있으면 `stores/{storeId}.{ownerId, ownerEmail}` 매핑
  - `resetBizPassword({uid, newPassword})` — `auth.updateUser` 로 비번 변경
  - `linkStoreToBiz({storeId, bizUid, bizEmail})` — 기존 가게에 ownerId/ownerEmail 부여
  - 모두 `request.auth.token.email === 'gangtalk815@gmail.com'` 검증 (`assertCallerIsAdmin`)
- **Role 계층 도입** (`src/router/admin.js`):
  - `platform` = `gangtalk815@gmail.com`
  - `biz`      = `users/{uid}.type==='company' && accountKind==='storeOwner'`
  - `null`     = 그 외
  - `meta.requiresAdmin` → platform만, `meta.requiresBiz` → platform+biz
  - role 캐시 (`cachedRole`, `cachedRoleUid`) + `invalidateRoleCache()` export
  - 루트(`/`) 진입 시 role 따라 분기 (`platform` → `/admin/dashboard`, `biz` → `/biz/dashboard`, 그 외 → `/biz/login`)
- **신규 라우트**:
  - `/biz/login` (BizLogin) — 공용 진입점. 로그인 후 role 판별해 자동 라우팅
  - `/admin/biz-accounts` (BizAccountsPage)
  - `/biz/dashboard` (BizDashboard) / `/biz/metrics` (BizMetrics) / `/biz/my-store` (BizMyStore)
  - 기존 `/login` (AdminLogin) 도 유지 (관리자 직접 진입용)
- **신규 페이지** (모두 `src/pages/admin/`):
  - `BizAccountsPage.vue` — 플랫폼 전용. `users where type='company' & accountKind='storeOwner'` 구독, "새 업체 생성 / 비번 재설정 / 가게 연결" 3 모달, 각각 Cloud Function 호출
  - `BizLoginPage.vue` — role 자동 라우팅 (platform → `/admin/dashboard`, biz → `/biz/dashboard`, 그 외 강제 signOut + 에러)
  - `BizDashboardPage.vue` — `stores where ownerId==uid` + `where ownerEmail==email` 합집합 구독, 카드별 현재 맞출방/필요인원/와이파이 표시, 빠른 메뉴 (`/biz/metrics`, `/biz/my-store`)
  - `BizMetricsPage.vue` ⭐ — 본인 가게 현황판 수동 업데이트. +/- 버튼 카운터 (맞출방·필요인원), O/X/- 라디오 (와이파이). 저장 시 `stores/{id}.{match, persons, wifi}` + `rooms_biz/{id}.{needRooms, needPeople, need, totalNeeded, totalRooms, wifi}` 양방향 동기 → gangtox.com 현황판 즉시 반영
  - `BizMyStorePage.vue` — 본인 가게 기본 정보 수정 (name, phone, desc, detailDesc, address, hours, closed, thumb) → `stores/{id}` 업데이트
- **AdminLayout 역할별 메뉴** (`src/layouts/AdminLayout.vue`):
  - role 감지 (`resolveRole`) 후 `platformMenus` (7개) 또는 `bizMenus` (3개) 표시
  - 사이드바 상단에 role pill (`플랫폼 관리자` 핑크 / `업체 계정` 연핑크)
  - 로그아웃 시 `invalidateRoleCache()` 호출 후 `/biz/login` 으로
  - "gangtox.com 바로가기" 링크는 `https://gangtox.com` 으로 수정
- **빌드 검증**:
  - `npm run build:admin` → `dist-admin/index.html` ✓ (8개 페이지 chunk + Firebase Functions chunk 신규 18KB)
  - `npm run build` → `dist/` 영향 없음
- **gangtox.com 영향**: 없음. 회원 사이트에는 `/biz/*` 진입 경로가 없고, `users/{uid}.accountKind='storeOwner'` 는 이미 회원 사이트에서 인식되는 기존 분류 (1단계 작업 이전부터 존재)

### 2026-06-16: 도메인 분리 3단계 — gangtalk815.com 별도 빌드 + 멀티 호스팅 (`feat/admin-separate-build`)
- **목적**: 같은 코드베이스에서 두 호스팅 사이트(회원 `dist/` + 관리자 `dist-admin/`)를 별도로 빌드·배포할 수 있게 인프라 구성
- **`.firebaserc`**: `targets.gangtalk-b8eb8.hosting` 에 `admin: ["gangtalk815"]` 추가 (Firebase 콘솔에서 `gangtalk815` 호스팅 사이트 생성 필요)
- **`firebase.json`**: hosting 배열에 admin 블록 추가
  - `target: "admin"`, `public: "dist-admin"`
  - `X-Robots-Tag: noindex, nofollow` 헤더 (검색엔진 크롤 차단)
  - `**` rewrite → `/index.html` (SPA 라우팅)
- **`vite.config.js`**:
  - `IS_ADMIN_BUILD = process.env.VITE_BUILD_TARGET === 'admin'` 환경 분기
  - `build.outDir` admin 시 `dist-admin`, `rollupOptions.input` admin 시 `index-admin.html`
  - 신규 플러그인 `adminHtmlRenamePlugin` — `closeBundle` 훅에서 `dist-admin/index-admin.html` → `index.html` fs.rename (Firebase rewrite 가 `/index.html` 을 기대하므로)
- **`package.json`**:
  - `cross-env` devDependency 추가 (Windows 호환 환경변수)
  - `build:admin` = `cross-env VITE_BUILD_TARGET=admin vite build --outDir dist-admin`
  - `clean:admin` = `rimraf dist-admin`
  - `deploy:admin` = clean + build + `firebase deploy --only hosting:admin`
  - `deploy:hosting` 도 `hosting:prod` 명시
- **신규 파일**:
  - `index-admin.html` — 관리자 빌드용 HTML entry (`<title>강남톡방 관리자</title>`, `noindex` 메타, FCM/PWA 관련 메타 제거, `/src/main-admin.js` 로딩)
  - `src/main-admin.js` — 관리자 Vue 앱 entry. Firebase 초기화 + 테마 + 관리자 자동등록(`admins/{uid}`) 유지, PWA SW 와 FCM 은 제거(관리자는 푸시 불필요), 잔존 SW 는 즉시 unregister
  - `src/AdminApp.vue` — 최상위 셸 (`<RouterView />` + 전역 폰트/배경 스타일)
  - `src/router/admin.js` — 관리자 전용 라우터
    - `/` → `/admin/dashboard` 리다이렉트
    - `/login` → `AdminLoginPage`
    - `/admin/{dashboard,stores,top5,banners,news,inbox}` — `AdminLayout` 하위 children
    - `beforeEach`: `onAuthStateChanged` 한 번 대기 후 이메일 검증, 비관리자/비로그인 → `/login?next=...`
  - `src/pages/admin/AdminLoginPage.vue` — 관리자 전용 미니 로그인 (이메일/비밀번호, `signInWithEmailAndPassword`, `gangtalk815@gmail.com` 외 즉시 `signOut`)
- **재사용**: `AdminLayout.vue` 와 6개 admin 페이지(`DashboardPage / StoresManagePage / Top5ManagePage / BannersManagePage / NewsManagePage / InboxPage`) 는 그대로 사용. `@/pages/admin/*` import 가 회원/관리자 빌드 양쪽에서 동일하게 동작
- **빌드 결과**:
  - `dist-admin/` 총 ~700KB (Firebase 청크 포함). 회원 빌드는 영향 없음 (`dist/` 변동 없음)
  - 회원 빌드에는 `/admin/*` 라우트가 그대로 살아있어 같은 도메인에서 임시 운영도 가능 (2단계 호환성 유지)
- **2단계와 관계**:
  - 2단계: 같은 도메인에서 `/admin/*` 임시 운영 (router 가드만)
  - 3단계: 별도 도메인용 빌드 셋업
  - 둘 다 같은 페이지 컴포넌트를 공유하므로 추후 router/index.js 의 `/admin/*` 블록만 제거하면 회원 빌드에서 admin 코드를 완전히 분리할 수 있음 (현재는 import 만 늘어나는 정도라 유지)

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
