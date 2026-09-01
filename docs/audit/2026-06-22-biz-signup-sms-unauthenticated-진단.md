# BizSignupPage SMS "Unauthenticated" 에러 — 원인 + 해결 방안 진단

날짜: 2026-06-22
대상 증상: `/biz/signup` (PR #112, `BizSignupPage.vue`) 에서 휴대폰 인증코드 발송 시
`문자 발송 중 오류가 발생했습니다.\n\n(Unauthenticated)` 에러 발생, 다음 단계 진행 불가
관련 PR: #112 (`feat/biz-self-signup`)
범위: 진단 전용. 코드 / 룰 / 함수 / 배포 변경 0건.

---

## 0. TL;DR

- `sendSmsCode` / `verifySmsCode` 두 Cloud Function 모두 **`onCall({ enforceAppCheck: true })`** 강제 (functions/index.js:149, 255)
- 그러나 **admin 빌드(gangtalk815)** 는 `src/firebase.js:115` 에서 `IS_ADMIN_BUILD === true` 일 때 **App Check 초기화를 통째로 스킵** (`appCheckProvider = null`)
- → admin 빌드의 모든 화면 (BizSignupPage 포함) 은 App Check 토큰이 없음 → `enforceAppCheck` 켜진 함수 호출 시 Firebase Functions runtime 이 **호출 자체를 거부 → `unauthenticated` HttpsError**
- 회원 빌드(gangtox.com)의 AuthPage 는 **동일한** `sendSmsCode` / `verifySmsCode` 함수를 호출하지만, 회원 빌드는 App Check 정상 초기화 → reCAPTCHA Enterprise 토큰 발급 → 통과
- **`req.auth`(로그인 여부) 가드는 두 함수 모두 없음** — Unauthenticated 의 원인은 로그인 여부가 아니라 App Check 토큰 부재

**해결 권장**: 방안 A (admin 도메인을 reCAPTCHA Enterprise 사이트 키 허용 목록에 등록 + `firebase.js IS_ADMIN_BUILD` 분기 풀기) — 보안 동등, 봇 차단 유지. 단 GCP 콘솔 사용자 수동 액션 1회 필요.

---

## 1. SMS 함수 정확한 시그니처

### 1-1. `sendSmsCode` (functions/index.js:147-249)

```js
exports.sendSmsCode = onCall(
  {
    enforceAppCheck: true,           // ← App Check 강제
    secrets: [COOLSMS_API_KEY, COOLSMS_API_SECRET, COOLSMS_SENDER],
  },
  async (req) => {
    // 1) 파라미터 정리/검증
    const rawPhone = safeStr(req.data?.phone || "");
    const phone = rawPhone.replace(/[^0-9]/g, "");
    if (!/^\d{10,11}$/.test(phone)) {
      throw new HttpsError("invalid-argument", "휴대폰 번호를 정확히 입력해 주세요.");
    }
    // ... (쿨다운/일일캡/코드 생성/발송)
  }
);
```

- **`enforceAppCheck: true`** (line 149) — App Check 토큰 없으면 함수 본체 실행 전에 Firebase Functions runtime 이 거부
- **`req.auth` 검사 0건** — grep 결과 `sendSmsCode` 본체 내 `req.auth` / `context.auth` 참조 없음
- 즉 "Unauthenticated" 의 발생 지점은 함수 본체가 아니라 **runtime 의 App Check 검증 단계**

### 1-2. `verifySmsCode` (functions/index.js:254-347)

```js
exports.verifySmsCode = onCall(
  { enforceAppCheck: true },         // ← App Check 강제, secrets 불필요
  async (req) => {
    const rawPhone = safeStr(req.data?.phone || "");
    const phone = rawPhone.replace(/[^0-9]/g, "");
    const code = safeStr(req.data?.code || "");
    // ...
  }
);
```

- 동일하게 `enforceAppCheck: true` + `req.auth` 검사 없음
- 즉 인증코드 발송이 성공해도 검증 단계에서 같은 에러로 막힘 (현재는 발송 단계에서 이미 막혀 verify 까지 못 감)

### 1-3. 다른 함수와의 대비

```bash
grep -nE "enforceAppCheck:\s*true" functions/index.js
# 결과:
# 149:    enforceAppCheck: true,       # sendSmsCode
# 255:  { enforceAppCheck: true },     # verifySmsCode
```

- **`enforceAppCheck: true` 인 함수는 SMS 2개뿐**
- 다른 admin 콜러블 (`createBizAccount` / `resetBizPassword` / `linkStoreToBiz` / `deleteStoreFull` / `deleteBizAccount`) 은 `{ cors: ADMIN_CORS }` 만 설정 — App Check 강제 없음 → admin 빌드에서 정상 호출됨
- 그래서 BizAccountsPage 의 새 계정 생성 / StoresManagePage 의 직접 등록 모달은 잘 작동 (PR #111). SMS 만 막히는 이유.

---

## 2. AuthPage 가 회원가입 시 SMS 보내는 방식

### 2-1. 호출 함수 — `BizSignupPage 와 100% 동일`

`src/pages/AuthPage.vue` (PR #14 SMS 도입 후):

```js
import { getFunctions, httpsCallable } from 'firebase/functions'
const fns = getFunctions(undefined, 'asia-northeast3')
const fnSendSmsCode   = httpsCallable(fns, 'sendSmsCode')   // ← 동일 함수
const fnVerifySmsCode = httpsCallable(fns, 'verifySmsCode') // ← 동일 함수
```

`src/pages/admin/BizSignupPage.vue:351-353` (PR #112):

```js
const fns = getFunctions(undefined, 'asia-northeast3')
const fnSendSmsCode   = httpsCallable(fns, 'sendSmsCode')
const fnVerifySmsCode = httpsCallable(fns, 'verifySmsCode')
```

**완전히 동일한 region, 동일한 함수명, 동일한 httpsCallable 패턴.**
차이는 단 하나 — **호출이 일어나는 빌드 타겟(=호스팅 도메인)**:
- AuthPage → 회원 빌드 → gangtox.com
- BizSignupPage → admin 빌드 → gangtalk815.com

### 2-2. AuthPage 의 회원가입 시점 — 미로그인 상태

- AuthPage 의 SMS 인증은 **사용자가 회원가입 폼을 작성하는 도중** (Auth 계정이 아직 생성되기 전) 에 호출됨
- 즉 `req.auth` 가 비어 있는 상태에서도 정상 작동 — `sendSmsCode` 가 `req.auth` 를 검사하지 않기 때문
- **회원가입 시점에 로그인 안 된 사용자가 SMS 를 받는 것이 원래 의도된 흐름**

### 2-3. 미로그인인데도 회원 빌드에서 통과되는 이유

회원 빌드는 **App Check 정상 초기화** → reCAPTCHA Enterprise 토큰 발급 → 함수 호출 시 헤더에 토큰 동봉 → runtime 통과:

```
src/firebase.js:115-116
const appCheckProvider = (IS_ADMIN_BUILD || DISABLE_APPCHECK)
  ? null                                  // ← admin 빌드는 null
  : (ENTERPRISE_SITE_KEY
      ? new ReCaptchaEnterpriseProvider(ENTERPRISE_SITE_KEY)
      : ...)
```

```
src/firebase.js:132-134
const appCheck = appCheckProvider
  ? initializeAppCheck(app, { provider: appCheckProvider, isTokenAutoRefreshEnabled: true })
  : null                                  // ← admin 빌드는 초기화 안 함
```

→ **회원 빌드는 App Check 인스턴스 보유 + 자동 토큰 발급, admin 빌드는 인스턴스 없음** = 같은 함수를 호출해도 결과가 다름

---

## 3. admin 빌드에서 App Check 가 꺼진 사유 (배경)

### 3-1. CLAUDE.md 작업 로그 인용 (2026-06-16 `fix/admin-cors-appcheck`)

> **근본 원인**: AppCheck 가 root cause. reCAPTCHA Enterprise 사이트 키(`6LcrdwgsAAAAAKuZv6l9kYvnyS83LED3cNz_Qsoz`) 의 허용 도메인 화이트리스트에 `gangtalk815.web.app` 미등록 → AppCheck 토큰 발급 실패 → Firebase 클라이언트 SDK 가 httpsCallable 요청을 중단 → 브라우저가 "CORS 에러" 로 표시 (오해 유발)
>
> **수정 1: 관리자 빌드에서 AppCheck 초기화 스킵** (`src/firebase.js`):
>   - `IS_ADMIN_BUILD = import.meta.env.VITE_BUILD_TARGET === 'admin'` 추가
>   - `appCheckProvider` 결정 시 admin 빌드면 `null` 로 단락 → `initializeAppCheck` 자체를 호출 안 함
>   - admin 빌드는 본인 인증된 운영자/업체만 사용하므로 AppCheck 가 사실상 불필요

### 3-2. 그 시점에 SMS 함수가 admin 빌드에서 호출되지 않았으므로 무영향

- 그 PR 당시 admin 빌드에는 **SMS 인증을 사용하는 화면이 없었음** (createBizAccount 등은 enforceAppCheck 미적용 → 영향 0)
- **본 PR #112 (BizSignupPage) 가 admin 빌드에서 처음으로 enforceAppCheck 함수를 호출** → 누락 발견

### 3-3. firebase.js 의 admin 분기 명시

```js
if (IS_ADMIN_BUILD) {
  console.info('[AppCheck] disabled in admin build (gangtalk815)')
}
```

(console 메시지 line 125) — 의도된 동작임. 다만 `enforceAppCheck` 함수 호출 시 어떻게 될지 고려 안 됐을 뿐.

---

## 4. 에러 발생 메커니즘 (단계별 재구성)

1. 사용자가 `https://gangtalk815.com/biz/signup` 진입 (admin 빌드)
2. `firebase.js` 모듈 로드 → `IS_ADMIN_BUILD === true` → `appCheckProvider = null` → `appCheck = null` (초기화 스킵)
3. 사용자가 폼에 휴대폰 번호 입력 + "인증번호 발송" 클릭
4. `BizSignupPage.onSendSms` → `fnSendSmsCode({ phone })` → Firebase Functions HTTP 요청
5. 클라이언트 SDK 가 App Check 토큰을 헤더에 동봉하려 시도 → **`appCheck === null` 이라 토큰 없음**
6. 서버 측 Firebase Functions runtime 이 `sendSmsCode` 의 `enforceAppCheck: true` 정책 확인 → **토큰 검증 실패 → `unauthenticated` HttpsError 반환** (함수 본체 진입 전)
7. 클라이언트가 catch 분기 → `e.code === 'functions/unauthenticated'` → 에러 매핑 분기에 해당 케이스 없음 → 폴백 메시지 `문자 발송 중 오류가 발생했습니다.\n\n(Unauthenticated)` 표시

### 4-1. 호출 함수 코드 (재확인)

`BizSignupPage.vue:361-389`:

```js
async function onSendSms() {
  // ...
  try {
    const res = await fnSendSmsCode({ phone: digits })
    if (res?.data?.ok) { /* 성공 */ }
  } catch (e) {
    console.error('sendSmsCode error:', e)
    const code = e?.code || ''
    const detail = e?.details || e?.message || ''
    if (code === 'functions/resource-exhausted' || String(detail).includes('sms-balance-empty')) {
      alert('현재 문자 발송 포인트(잔액)가 부족하여 인증문자를 보낼 수 없습니다.\n관리자에게 문의해 주세요.')
      return
    }
    // ← 'functions/unauthenticated' 분기가 없음 → 아래 폴백
    alert('문자 발송 중 오류가 발생했습니다.\n\n(' + (detail || code || 'unknown') + ')')
  } finally {
    sendingSms.value = false
  }
}
```

→ `(Unauthenticated)` 텍스트가 표시되는 이유: `e.message` 가 "Unauthenticated" (Firebase 의 영문 표준 메시지)

---

## 5. 해결 방안 비교

### 방안 A: **admin 도메인을 reCAPTCHA Enterprise 사이트 키에 등록 + IS_ADMIN_BUILD 분기 풀기** [권장]

#### 변경 내용
1. **GCP 콘솔 (사용자 수동, 1회)**:
   - Google Cloud Console → Security → reCAPTCHA Enterprise
   - 사이트 키 `6LcrdwgsAAAAAKuZv6l9kYvnyS83LED3cNz_Qsoz` 의 허용 도메인에 추가:
     - `gangtalk815.com`
     - `gangtalk815.web.app`
     - `gangtalk815.firebaseapp.com`
2. **`src/firebase.js`** — `IS_ADMIN_BUILD` 분기 제거 (또는 SMS 만 예외 처리)
3. **검증**: admin 빌드에서 App Check 토큰 정상 발급 → SMS 함수 통과

#### 장점
- 보안 등급 유지 (App Check + reCAPTCHA Enterprise 봇 차단)
- BizSignupPage 의 의도(미로그인 사용자가 SMS 인증 거치게 함)와 정합
- 코드 변경 최소 (firebase.js 1줄)
- 다른 admin 함수도 App Check 적용 가능 (선택적 강화)

#### 단점
- GCP 콘솔 작업 1회 필요 (사용자 수동)
- App Check 활성화 후 admin 빌드의 기존 동작 검증 필요 (회귀 0이라고 단정 불가)

#### 위험
- reCAPTCHA Enterprise 도메인 추가에 통상 수 분 ~ 수십 분 전파 시간
- 그 사이 admin 빌드에서 App Check 가 "활성화는 됐지만 토큰 발급 실패" 상태가 될 수 있음 — 그 단계가 끝날 때까지 SMS / 다른 enforceAppCheck 함수 사용 금지
- 전파 완료 후엔 정상

---

### 방안 B: **`sendSmsCode` / `verifySmsCode` 의 `enforceAppCheck` 풀기** [비권장]

#### 변경 내용
1. `functions/index.js:149, 255` — `enforceAppCheck: true` 옵션 제거
2. Functions 재배포

#### 장점
- GCP 콘솔 작업 불필요
- admin / 회원 빌드 양쪽에서 같은 함수가 동일하게 작동

#### 단점
- **봇 방어 등급 하락** — 함수 내부의 `60초 쿨다운` + `24h 5회 캡` + `5회 verify 실패 시 코드 무효화` 는 phone 번호 단위 캡. 봇이 **phone 번호를 매번 바꿔가며** 호출하면 → 각 phone 별 첫 발송은 통과 → CoolSMS 비용 폭증 + 무작위 번호로 스팸 발송
- 회원 빌드(gangtox.com)의 보안도 동시에 약화
- Sprint 0 (`feature/sprint0-sms-secret-hardening`, 2026-06-17) 의 보안 강화 의도 (`enforceAppCheck: true` 강제) 와 정반대 방향
- 보안 점검 보고서 1-2 의 권고를 후퇴시킴

---

### 방안 C: **admin 빌드 전용 SMS 함수 신설** (`sendSmsCodeOpen` 등) [비권장]

#### 변경 내용
1. `functions/index.js` 에 `sendSmsCodeOpen` / `verifySmsCodeOpen` 추가
   - `enforceAppCheck` 없음
   - 같은 cooldown/cap 로직 공유 (헬퍼로 추출)
2. BizSignupPage 가 새 함수 호출

#### 장점
- 회원 빌드(AuthPage)의 보안 유지
- admin 빌드만 영향

#### 단점
- 본질적으로 방안 B와 같은 보안 약화 (단지 회원 빌드만 안전)
- 함수 2개 추가 — 유지보수 부담 (코드 중복 또는 헬퍼 추출 필요)
- 향후 회원/admin 양쪽에서 같은 동작을 원할 때 또 분기 필요
- "admin 빌드에서만 봇 보호가 약하다" 가 정책적으로 정당화 어려움

---

### 방안 D: **임시: SMS 만 회원 도메인(gangtox.com)으로 우회** [비권장]

#### 변경 내용
- BizSignupPage 의 SMS 단계만 `gangtox.com` 서브도메인의 iframe / popup 으로 처리

#### 단점
- 도메인 분리 정책(gangtox=여성회원 / gangtalk815=admin/업체) 위반
- iframe postMessage 보안 처리 복잡
- 사용자 경험 저하 (창 띄움/도메인 변경 보임)
- 권장 안 함

---

## 6. 최종 권장 — 방안 A 단계별 실행 절차

### Step 1: GCP 콘솔 (사용자 수동, 1회)
1. [Google Cloud Console](https://console.cloud.google.com/) → **Security → reCAPTCHA Enterprise**
2. 사이트 키 `6LcrdwgsAAAAAKuZv6l9kYvnyS83LED3cNz_Qsoz` 클릭 → "Edit key"
3. **Allowed domains** 에 추가:
   - `gangtalk815.com` (운영)
   - `gangtalk815.web.app` (Firebase Hosting 기본)
   - `gangtalk815.firebaseapp.com` (Firebase Hosting 보조)
4. Save → 전파 대기 (수 분 ~ 수십 분)

### Step 2: 코드 변경 (별도 PR — 본 진단 범위 밖)
- `src/firebase.js:115-116` — `IS_ADMIN_BUILD` 조건 제거 또는 분기 조건 조정
- 안전망: `VITE_DISABLE_APPCHECK=true` 빌드 옵션은 그대로 유지 (긴급 우회용)
- `BizSignupPage.onSendSms` 의 catch 분기에 `functions/unauthenticated` 명시적 처리 추가 (UX 개선):
  ```js
  if (code === 'functions/unauthenticated') {
    alert('보안 검증에 실패했습니다. 페이지를 새로고침 후 다시 시도해 주세요.')
    return
  }
  ```

### Step 3: 검증
- admin 빌드 재배포 (`firebase deploy --only hosting:admin`)
- `/biz/signup` → SMS 발송 성공 확인
- `/admin/dashboard` → 기존 admin 페이지 회귀 0 확인
- Firebase Console → AppCheck → 토큰 발급 / 거부 통계 확인

### Step 4: 폴백
- 만약 reCAPTCHA Enterprise 키 등록이 어려운 경우 (예: GCP 권한 부족):
  - **임시 단기 폴백**: `functions/index.js:149` `enforceAppCheck: true` 한시 제거 + 재배포 → 방안 B
  - 단 60초 쿨다운 / 24h 5회 캡 / verify 5회 실패 캡은 그대로 → 봇 방어가 0 은 아니지만 약화됨
  - 정식 해결 후 반드시 되돌릴 것

---

## 7. 추가 발견 사항 (참고)

### 7-1. `BizSignupPage.onSendSms` 에 unauthenticated 분기 없음
- `BizSignupPage.vue:377-385` 의 catch 분기는 `resource-exhausted` (잔액 부족) 만 한국어로 매핑
- `unauthenticated` 케이스는 폴백 메시지 (`(Unauthenticated)`) 노출 → 사용자가 원인 파악 불가
- 별도 PR 에서 명시적 메시지 추가 권장

### 7-2. `enforceAppCheck` 가 켜진 함수 인벤토리
```
sendSmsCode    (functions/index.js:147)
verifySmsCode  (functions/index.js:254)
```
- 이 2개만 켜져 있음
- 향후 새 함수에 `enforceAppCheck: true` 추가 시 admin 빌드 호출 가능성 검토 필요

### 7-3. 회원 빌드(gangtox.com)에서는 App Check 정상
- 작업 로그 `2026-06-18 chore/cleanup-auth-diag-revert-workarounds` 참고
- `VITE_DISABLE_APPCHECK` 기본값 `'false'` → App Check 켬
- 별도 PR 에서 명시적으로 `'true'` 로 빌드한 경우만 끔 (디버깅 한정)

### 7-4. localhost 디버그 토큰
- `firebase.js:72` `LOCAL_DEBUG_TOKEN = '95ABB125-8AB9-4005-A90D-1F6D6620A6F4'`
- localhost 개발 시에는 admin 빌드라도 디버그 토큰으로 우회 가능
- 운영에서는 의미 없음

---

## 8. 결론

- **원인**: `sendSmsCode` / `verifySmsCode` 의 `enforceAppCheck: true` + admin 빌드의 App Check 미초기화 = 미스매치
- **AuthPage 와 BizSignupPage 가 같은 함수 호출**. 차이는 빌드 타겟의 App Check 활성 여부뿐
- **`req.auth` (로그인) 가드는 두 함수 모두 없음** — "Unauthenticated" 의 원인은 로그인 여부가 아님
- **권장**: 방안 A (reCAPTCHA Enterprise 사이트 키에 gangtalk815 도메인 등록 + `IS_ADMIN_BUILD` 분기 풀기)
- **수단**: 사용자 수동 GCP 콘솔 작업 1회 + 코드 1줄 수정 (별도 PR)
- **임시 폴백**: 정식 해결이 어려운 경우 `enforceAppCheck: true` 한시 제거 (방안 B), 단 봇 방어 약화 인지 후 단기간만
- **보안 영향**:
  - 방안 A: 보안 등급 유지 (현 회원 빌드와 동등). admin 도메인이 reCAPTCHA Enterprise 키에 정식 등록되는 것 → 더 깨끗한 정책
  - 방안 B: SMS 함수 봇 방어 약화. CoolSMS 비용 폭증 / 무작위 번호 스팸 위험. **권장 안 함**
  - 방안 C/D: 본질적으로 방안 B 와 같거나 더 복잡. 권장 안 함

---

**산출물**: 본 문서 1개. 코드 / 룰 / 함수 / 빌드 / PR / 배포 변경 0건.
