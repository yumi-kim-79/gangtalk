# BizSignupPage 회원 빌드(gangtox.com) 이동 — 구조/방법 진단

날짜: 2026-06-22
배경: PR #112 (`feat/biz-self-signup`) 의 BizSignupPage 가 admin 빌드(gangtalk815) 에 있어
SMS 함수의 `enforceAppCheck: true` 와 충돌해 "Unauthenticated" 발생.
선택된 방향: admin 빌드에서 제거 → **회원 빌드(gangtox.com) 로 이동**.
회원 빌드는 App Check 정상 (여성회원 SMS 가입 정상 작동 = 증거).
범위: 진단 전용. 코드 / 룰 / 함수 / PR / 배포 변경 0건.

---

## 0. TL;DR

- **회원 빌드 라우터 = `src/router/index.js`**, AuthPage 같은 단일 파일 패턴. BizSignupPage 추가 가능.
- **공개 라우트(비로그인 허용) 처리** = `publicForGuests = new Set(['auth', 'support'])` (line 430). `'bizSignup'` 만 추가하면 즉시 공개.
- **BizSignupPage 의 admin 의존성 = 사실상 0**. `AdminLayout`/admin CSS import 없음. 단 라우터 destination 2건 (`router.replace({ name: 'bizLogin' })`, `<a href="/biz/login">`) 만 도메인 간 이동용 외부 링크로 조정 필요.
- **App Check 작동 확인**: `firebase.js:115-116` 가 `IS_ADMIN_BUILD === false` 일 때 정상 reCAPTCHA Enterprise 초기화. AuthPage 가 `sendSmsCode` 호출하며 정상 작동 = 회원 빌드에서 SMS 즉시 통과 증거.
- **URL 권장**: `/biz-signup` (path) + `bizSignup` (name). admin 빌드의 `/biz/*` (업체 로그인 후 영역) 과 시각적 구분.
- **admin 빌드 정리** (PR #112 되돌리기): `router/admin.js` 의 `BizSignup` import + `/biz/signup` 라우트 + 가드 예외 제거. `BizLoginPage` 의 `<router-link>` → `<a href="https://gangtox.com/biz-signup">` 외부 링크.
- **주의**: 가입 직후 회원 빌드의 me.auth 가 `type:'company'` 로 set → 회원 라우트 가드와의 정합 검토 필요. 가입 완료 후 admin 도메인으로 이동(또는 안내 + 자동 로그아웃) 권장.

---

## 1. 회원 빌드 라우터 구조

### 1-1. 파일 위치 + 진입점
- **회원 빌드 entry**: `src/main.js` → `App.vue` → `src/router/index.js`
- **admin 빌드 entry**: `src/main-admin.js` → `AdminApp.vue` → `src/router/admin.js`
- 두 빌드는 **별도 entry / router / Layout** 사용. `vite.config.js` 의 `VITE_BUILD_TARGET=admin` 분기로 결정
- 같은 코드베이스라 컴포넌트는 양쪽에서 import 가능 (실제로 `router/index.js` 가 이미 `pages/admin/*` 일부를 import 중, 1단계 도메인 분리 잔존)

### 1-2. 회원 라우터의 공개 라우트 처리
```js
// src/router/index.js:430
const publicForGuests = new Set(['auth', 'support'])
```
- 이 Set 에 포함된 route name 은 비로그인이어도 진입 허용
- 가드 분기 (`:453`):
  ```js
  if (!logged && !publicForGuests.has(toName) && !isTabRoot) {
    return { path: '/auth', query: { next: to.fullPath, mode: 'signup' } }
  }
  ```
- → `publicForGuests` 에 `'bizSignup'` 추가만 하면 회원 빌드에서 비로그인 진입 즉시 가능

### 1-3. AuthPage 의 위치 — 패턴 참조 가능
- `import AuthPage from '@/pages/AuthPage.vue'` (정적 import, line 7)
- 라우트: `{ path: '/auth', name: 'auth', component: AuthPage }` (line 309)
- `publicForGuests` 에 `'auth'` 포함 → 비로그인 접근 허용
- **BizSignupPage 도 같은 패턴 적용 가능**

### 1-4. tabRoots 와의 관계
- `tabRoots = new Set(['dashboard', 'finder', 'chat', 'partners', 'mypage'])` — 비로그인 진입 허용 (페이지가 LoggedOut UI 직접 처리)
- BizSignupPage 는 탭이 아니므로 `tabRoots` 가 아닌 `publicForGuests` 가 적합

### 1-5. requiresAuth / needLoginOnClick 메타
- 보호 메타들. BizSignupPage 라우트엔 부착 안 함 (공개 가입 페이지)

### 1-6. 가드 race / role 처리
- 회원 빌드 가드는 `currentType()` 으로 'admin' / 'company' / 'user' / 'guest' 분류 (`normalizeType` line 49-55)
- 'company' 는 회원 빌드 가드에서 **거부되지 않음** — `requiresAuth` 통과, `requiredRole === 'company'` 케이스 통과 (line 480)
- 즉 업체 계정으로 회원 빌드에 로그인해도 가드 통과 — `/biz-signup` 가입 직후 화면이 자연스럽게 이어짐

---

## 2. BizSignupPage 의 admin 의존성 점검

### 2-1. import 모두 공용 (admin 전용 없음)
```js
// src/pages/admin/BizSignupPage.vue:291-299
import { ref, reactive, computed } from 'vue'              // vue 공용
import { useRouter } from 'vue-router'                     // vue-router 공용
import { getAuth } from 'firebase/auth'                    // Firebase 공용
import {
  collection, doc, setDoc, serverTimestamp,
} from 'firebase/firestore'                                // Firebase 공용
import { getFunctions, httpsCallable } from 'firebase/functions'  // Firebase 공용
import { db as fbDb } from '@/firebase'                    // 공용 모듈
import { me } from '@/store/user'                          // 공용 모듈
```
- `grep AdminLayout|admin\.css|import.*from.*admin` 결과 **0 매칭** → admin 전용 의존성 없음
- 모든 핵심 로직 (SMS 호출 / `me.signupBiz()` / stores 생성) 은 빌드 무관

### 2-2. 자체 shell, 외부 레이아웃 불필요
- `<template>` 가 `<main class="biz-signup-shell">` 단일 셸 시작 (line 28)
- `AdminLayout` 의존 0 — `BizLoginPage` 와 같은 자립 페이지 패턴
- 회원 빌드에서 그대로 마운트 가능

### 2-3. 라우터 종속 — 2건만 도메인 간 외부 링크로 조정 필요

| 위치 | 현재 (admin 빌드 가정) | 회원 빌드로 옮길 때 |
|---|---|---|
| `BizSignupPage.vue:284` | `<a href="/biz/login">로그인</a>` | `<a href="https://gangtalk815.com/biz/login">` |
| `BizSignupPage.vue:555` | `router.replace({ name: 'bizLogin' }).catch(...)` | `window.location.href = 'https://gangtalk815.com/biz/login'` (도메인 간 이동) |

- 회원 빌드의 router 에는 `bizLogin` route name 이 없음 (admin 라우터 전용)
- 가입 완료 후 업체 로그인은 admin 도메인에서 이뤄지므로 **외부 도메인 이동**이 자연스러움
- 또는 회원 빌드 안에서 안내 패널만 보여주고 사용자가 직접 admin 도메인 이동

### 2-4. SMS / 가입 / stores 생성 — 빌드 무관 동작
- `sendSmsCode`/`verifySmsCode` httpsCallable — 같은 region `asia-northeast3`, 같은 Firebase 프로젝트
- `me.signupBiz()` → `_fbSignupBiz` (store/user.js:548-) — `ensureFirebase()` 가 빌드 무관 작동
- `setDoc(doc(collection(fbDb, 'stores')).id, {...})` — Firestore 룰 `ownerId == request.auth.uid` 통과 (도메인 무관, Auth uid 기준)
- 결론: **이동 후 SMS 즉시 작동 + 가입 흐름 그대로**

---

## 3. App Check 작동 확인 (회원 빌드)

### 3-1. firebase.js 분기 (`src/firebase.js:115-134`)
```js
const appCheckProvider = (IS_ADMIN_BUILD || DISABLE_APPCHECK)
  ? null
  : (ENTERPRISE_SITE_KEY
      ? new ReCaptchaEnterpriseProvider(ENTERPRISE_SITE_KEY)  // ← 회원 빌드는 이쪽
      : (V3_SITE_KEY ? new ReCaptchaV3Provider(V3_SITE_KEY) : null))

const appCheck = appCheckProvider
  ? initializeAppCheck(app, { provider: appCheckProvider, isTokenAutoRefreshEnabled: true })
  : null                                                       // ← 회원 빌드: 정상 initializeAppCheck
```
- 회원 빌드: `IS_ADMIN_BUILD=false` + `DISABLE_APPCHECK=false` → reCAPTCHA Enterprise 키로 정상 초기화
- → `sendSmsCode` / `verifySmsCode` 의 `enforceAppCheck: true` 통과

### 3-2. AuthPage 가 증거
- `src/pages/AuthPage.vue:281-283` 가 같은 region 같은 함수명 httpsCallable
- 여성회원 가입에서 이미 정상 작동 → 회원 빌드의 App Check 환경 검증 완료
- BizSignupPage 도 같은 환경에서 같은 함수 호출 → 통과 보장

### 3-3. localhost 디버그 토큰
- `firebase.js:72` `LOCAL_DEBUG_TOKEN = '95ABB125-8AB9-4005-A90D-1F6D6620A6F4'` — 로컬 개발 시에도 SMS 가능
- 운영 빌드는 무관

---

## 4. 이동 방법 — 단계별 작업 항목

본 진단은 **수정 0건**. 아래는 별도 PR 에서 수행할 예정 항목.

### Step 1: 파일 이동
- 옵션 A: `src/pages/admin/BizSignupPage.vue` 그대로, 양쪽 router 가 import 공유
- **옵션 B (권장)**: `src/pages/BizSignupPage.vue` 로 이동 (admin 폴더에서 빼냄)
  - 이유: 회원 빌드 전용 페이지가 admin 폴더에 있으면 의미 혼동. 1단계 도메인 분리 정책과 정합
  - `git mv src/pages/admin/BizSignupPage.vue src/pages/BizSignupPage.vue`

### Step 2: 회원 빌드 router 에 라우트 추가
- `src/router/index.js`:
  ```js
  const BizSignupPage = () => import('@/pages/BizSignupPage.vue')
  
  // routes 배열에 추가:
  { path: '/biz-signup', name: 'bizSignup', component: BizSignupPage }
  ```
- `publicForGuests.add('bizSignup')` (line 430 의 Set 에 추가)
- 별도 메타 (`requiresAuth` / `needLoginOnClick`) 부착 안 함

### Step 3: BizSignupPage 의 라우터 destination 조정
- `<a href="/biz/login">` → `<a href="https://gangtalk815.com/biz/login" target="_blank" rel="noopener">`
  - 또는 같은 탭 이동: `target` 제거. 도메인 분리 정책 검토
- `router.replace({ name: 'bizLogin' })` (line 555) → 외부 도메인 이동 패턴:
  ```js
  function goLogin() {
    // 회원 빌드 → admin 도메인의 로그인 페이지로 외부 이동
    window.location.href = 'https://gangtalk815.com/biz/login'
  }
  ```
- 환경별 분기 (개발/운영) 고려:
  ```js
  const ADMIN_LOGIN_URL = import.meta.env.PROD
    ? 'https://gangtalk815.com/biz/login'
    : 'http://localhost:4173/biz/login'  // admin 빌드 로컬 포트
  ```

### Step 4: admin 빌드 정리 (PR #112 되돌리기)
- `src/router/admin.js`:
  - `const BizSignup = () => import('@/pages/admin/BizSignupPage.vue')` 제거
  - `{ path: '/biz/signup', name: 'bizSignup', component: BizSignup }` 라우트 제거
  - `beforeEach` 가드의 `if (to.name === 'bizLogin' || to.name === 'adminLogin' || to.name === 'bizSignup')` 에서 `|| to.name === 'bizSignup'` 제거
- `src/pages/admin/BizLoginPage.vue`:
  - `<router-link :to="{ name: 'bizSignup' }">업체 회원가입</router-link>` → `<a href="https://gangtox.com/biz-signup">업체 회원가입</a>`
  - `.adm-login-signup` CSS 그대로 유지 (스타일 호환)

### Step 5: TopBar 처리 (선택)
- `App.vue:32-37` 의 `hideTopBar` computed 에 `'bizSignup'` 추가하면 회원 가입 화면이 깔끔
  ```js
  if (n === 'dashboard' || n === 'finder' || n === 'gangtalk' || n === 'chat'
      || n === 'partners' || n === 'mypage' || n === 'bizSignup') return true
  ```
- 또는 AuthPage 처럼 TopBar 노출 유지 (일관성 차원)
- BizSignupPage 가 자체 brand header 보유 → hideTopBar 권장

### Step 6: 가입 완료 후 흐름 정리 (UX)
- 성공 패널 안내 텍스트 보강:
  - "업체 관리는 gangtalk815.com 에서 진행됩니다."
  - "로그인 페이지로 이동" 버튼 클릭 → 새 탭 또는 같은 탭으로 admin 도메인 이동
- 가입 직후 회원 빌드의 me.auth 가 'company' 로 set 됨 (`_fbSignupBiz`)
  - 회원 빌드 가드는 'company' 도 통과 → 회원 사이트 진입 가능 (의도된 동작 아닐 수 있음)
  - 옵션 1: 안내 패널만 보여주고 사용자가 직접 admin 이동
  - 옵션 2: 가입 직후 회원 빌드에서 자동 `me.signOut()` 후 admin 도메인 이동 (다음 로그인은 admin 도메인에서)
  - **옵션 2 권장** — 도메인 분리 정책 (gangtox=여성회원만, gangtalk815=업체 관리) 과 정합

---

## 5. URL 설계 옵션

| 옵션 | 회원 빌드 path | admin 빌드 path | 장단점 |
|---|---|---|---|
| **A** | `/biz-signup` | (제거) | path 가 짧고 의미 명확. 두 도메인 구분 분명 |
| B | `/biz/signup` | (제거) | admin 의 옛 URL 과 동일 → 외부 링크 호환성 좋음. 단 회원 도메인에서 `/biz/*` 가 1개뿐이라 어색 |
| C | `/signup-biz` | (제거) | 영어 일관성 |
| D | `/business-signup` | (제거) | 의미 가장 명확. 단 길음 |

**권장: A (`/biz-signup`)**
- admin 빌드의 `/biz/*` (업체 로그인 후 영역) 과 시각적으로 분리
- name `bizSignup` 은 양쪽 코드베이스에서 의미 통일 (한 명칭)
- 외부 링크 (예: 마케팅 페이지) 에서 짧게 노출

---

## 6. 도메인 분리 정책 검토

### 6-1. 현재 정책 (CLAUDE.md 상단)
- `gangtox.com` = 여성회원 (현황판/가게찾기/강톡/제휴관/마이페이지)
- `gangtalk815.com` = 관리자/업체 (운영/관리/지표 입력)

### 6-2. 본 이동이 정책에 미치는 영향
- **가입(공개)** 만 gangtox.com 에서 처리, **운영(로그인 후)** 은 gangtalk815.com 유지
- 일반적 SaaS 패턴: `www.*` / `app.*` 분리. 가입은 공개 도메인, 운영은 분리 도메인
- 데이터는 같은 Firestore → 어느 도메인에서 가입해도 같은 계정/가게

### 6-3. 사용자 입장 안내 명확화 필요
- 회원 빌드의 BizSignupPage 상단에:
  - "업체 회원가입은 강남톡방 메인 도메인에서 진행됩니다."
  - "가입 완료 후 관리는 gangtalk815.com 에서 이뤄집니다." (또는 자동 이동)
- 회원 빌드의 다른 페이지 (현황판 등) 에서 업체 가입 진입점:
  - 1순위: `gangtox.com/biz-signup` (회원 도메인 내부 라우트)
  - 2순위: gangtalk815.com 의 BizLogin 페이지 하단 링크가 가리키는 곳 = 같은 `gangtox.com/biz-signup` (외부 링크)

### 6-4. 향후 정책 변경 시
- admin 도메인에 reCAPTCHA Enterprise 키 등록 (이전 진단 방안 A) 이 가능해지면 본 페이지를 다시 admin 빌드로 이동 가능
- 본 PR 은 단기/중기 안정화. 장기적으로는 admin 도메인의 App Check 정식 등록이 정합

---

## 7. 주의점 / 회귀 위험

### 7-1. 가입 직후 me.auth 상태
- `_fbSignupBiz` (store/user.js:548-) 가 회원 빌드에서 호출되면 me.auth 가 `type:'company'` 로 set
- 회원 빌드의 가드 (`currentType()` → 'company') 는 'company' 를 통과시킴
- → 가입 직후 사용자가 회원 빌드의 다른 페이지 (예: `/dashboard`) 로 이동 가능. 의도와 다를 수 있음
- **대책**: 성공 패널에서 자동 `me.signOut()` 후 admin 도메인 이동 (또는 안내만)

### 7-2. 회원 빌드의 me.init else 분기
- PR #88 (`fix/referral-seq-race`) 에서 me.init else 분기가 users doc 자동 생성을 멈춤 → race 보호
- `_fbSignupBiz` 가 runTransaction 으로 users 직접 생성하므로 race 영향 없음
- 회원 빌드에서도 같은 보호 작동 → 안전

### 7-3. Firestore rules / Cloud Functions
- 변경 0건
- `stores create` 룰 `ownerId == auth.uid` — 도메인 무관 통과
- `sendSmsCode`/`verifySmsCode` `enforceAppCheck: true` — 회원 빌드 App Check 통과
- 이전 진단의 보안 등급 그대로 유지

### 7-4. 도메인 간 쿠키/세션
- Firebase Auth 는 도메인 단위로 indexedDB persistence 분리 — 가입 직후 admin 도메인 이동 시 자동 로그인 안 됨
- 사용자는 admin 도메인에서 다시 로그인 필요
- 안내 명확화 필요: "가입 완료. gangtalk815.com 에서 다시 로그인해 주세요"

### 7-5. PR #112 의 BizLoginPage 변경
- `BizLoginPage` 의 `<router-link to="bizSignup">` 가 회원 빌드 외부 도메인 이동으로 변경되면, admin 빌드 사용자는 회원 도메인으로 새로 진입 → 신규 가입 → 다시 admin 도메인으로 돌아옴
- 사용자 경험: 도메인 두 번 전환. 안내 / 자동 이동으로 부드럽게 처리

### 7-6. admin 빌드 BizSignupPage 잔존 파일
- Step 1 옵션 B (파일 이동) 시 `pages/admin/BizSignupPage.vue` 자체 삭제
- 옵션 A (양쪽 공유) 시 파일은 admin 폴더에 잔존 — 의미 혼동 위험 → 옵션 B 권장

### 7-7. router/index.js 의 기존 /admin 라우트
- 회원 빌드 router 가 이미 `/admin/*` 라우트 일부 import 중 (1단계 도메인 분리 잔존, `gangtalk815@gmail.com` 만 통과)
- BizSignupPage 추가는 별도 라우트 (`/biz-signup`) 라 기존 admin 라우트와 충돌 없음

---

## 8. 결론

- **이동은 안전**. BizSignupPage 의 admin 의존성은 사실상 0 (라우터 destination 2건만 외부 링크로 조정)
- **회원 빌드 라우터** = `src/router/index.js`. `publicForGuests.add('bizSignup')` + 라우트 추가만으로 비로그인 진입 가능
- **App Check** 는 회원 빌드에서 정상 (AuthPage 가 증거) — SMS 즉시 작동
- **권장 URL**: `/biz-signup` (path) + `bizSignup` (name)
- **권장 파일 위치**: `src/pages/BizSignupPage.vue` (admin 폴더에서 이동)
- **admin 빌드 정리**: `router/admin.js` 의 BizSignup 라우트/import/가드 모두 제거. `BizLoginPage` 의 router-link → 외부 도메인 링크
- **가장 큰 주의점**: 가입 직후 me.auth 가 'company' 상태로 회원 빌드에 남음 → 자동 `me.signOut()` + admin 도메인 이동 권장. 도메인 간 Auth 미공유라 어차피 admin 에서 재로그인 필요
- **변경 범위 (예상)**:
  - `src/pages/BizSignupPage.vue` (이동 + 라우터 destination 2건 조정)
  - `src/router/index.js` (라우트 + publicForGuests 추가)
  - `src/router/admin.js` (BizSignup 제거)
  - `src/pages/admin/BizLoginPage.vue` (router-link → 외부 링크)
  - `src/App.vue` (선택: hideTopBar 에 추가)
- **빌드**: 회원 빌드 (`npm run build`) + admin 빌드 (`npm run build:admin`) 양쪽
- **배포**: `firebase deploy --only hosting:prod,hosting:admin` 양쪽 (룰/Functions 무관)

---

**산출물**: 본 문서 1개. 코드 / 룰 / 함수 / 빌드 / PR / 배포 변경 0건.
