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

**현재 단계**: 강톡 탭 디자인 개편 완료, 웹앱 코드 점검 진행 중

---

## 다음 작업
1. 상단 슬라이더 배너 이미지 교체 (banner1~3.jpg → 실제 광고 이미지)
2. 전체 코드 구조 분석 및 문제점 파악
3. Capacitor 적용 전 웹앱 완성도 점검
4. 모바일 대응 UI/UX 검토

---

## 작업 로그

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
