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
