# GangTalk(강톡) 프로젝트 점검 보고서

> 분석 기준: GitHub `yumi-kim-79/gangtalk` 저장소 실제 코드 (클라이언트 Vue3 + Firestore Rules + Cloud Functions)
> 작성일: 2026-06-17 · 전제: **백엔드 최소화한 경량 사용자페이지 앱/웹**
> 표기: 🔴 즉시조치 · 🟠 높음 · 🟡 보통 · 🟢 낮음/품질

---

## 0. 우선순위 액션 (먼저 이것부터)

| # | 항목 | 심각도 | 한 줄 요약 |
|---|------|--------|-----------|
| 1 | CoolSMS 시크릿 공개 노출 | 🔴 | 유료 SMS 키가 공개 저장소에 평문 → **키 즉시 폐기/재발급** |
| 2 | `sendSmsCode` 남용 가능 | 🔴 | 인증·제한 없이 호출 → SMS 폭탄 + 과금 폭탄 |
| 3 | 가게(stores) 소유권 탈취 | 🟠 | ownerId 없는 가게를 아무나 점유 가능 |
| 4 | 채팅 전체 열람 | 🟠 | 모든 로그인 사용자가 모든 방 메시지 read 가능 |
| 5 | Maps/Firebase 공용 API 키 | 🟡 | 같은 키 Maps 겸용 → 도메인 제한 안 하면 과금 악용 |

---

## 1. 보안 (Security)

### 🔴 1-1. `functions/.env` 시크릿 공개 노출 — **가장 시급**
**현상:** `functions/.env`가 git에 추적되어 공개 저장소에 그대로 올라가 있음.
```
COOLSMS_API_KEY=NCSK****
COOLSMS_API_SECRET=ONDJ****   ← 유료 SMS 발송 시크릿
COOLSMS_SENDER=01059190815
```
- `git ls-files`로 `.env`, `functions/.env` 둘 다 추적됨을 확인.
- CoolSMS는 **건당 과금**되는 실서비스. 시크릿이 공개되면 제3자가 이 키로 임의 SMS를 발송해 **요금이 청구**되거나 발신번호를 도용할 수 있음.
- 파일을 지워도 **git 히스토리에 영구히 남기 때문에**, 파일 삭제만으로는 해결되지 않음.

**조치(순서대로):**
1. **CoolSMS 콘솔에서 해당 API Key/Secret 즉시 폐기 후 재발급** (이게 1순위. 노출된 키는 이미 유효하지 않게 만들어야 함)
2. `.env`, `functions/.env`를 git 추적에서 제거하고 `.gitignore`에 추가
   ```bash
   git rm --cached .env functions/.env
   printf "\n.env\nfunctions/.env\n" >> .gitignore
   ```
3. 서버 시크릿은 `.env` 대신 **Firebase Secret Manager** 사용 (코드에 이미 `defineSecret` import 되어 있음 — 이걸 실제로 적용)
   ```bash
   firebase functions:secrets:set COOLSMS_API_KEY
   firebase functions:secrets:set COOLSMS_API_SECRET
   ```
4. (선택) 히스토리에서 완전 제거가 필요하면 `git filter-repo`로 정리. 단, 이미 재발급했다면 우선순위는 낮음.

### 🔴 1-2. `sendSmsCode` 남용/비용 폭탄
**현상 (`functions/index.js` `sendSmsCode`):**
- `onCall`이지만 **App Check 미강제**(`enforceAppCheck` 없음), **로그인 요구 없음**(익명도 호출 가능), **쿨다운/횟수 제한 없음**.
- 누구나 임의의 번호로 반복 호출 → 특정인 **SMS 폭탄(괴롭힘)** + **CoolSMS 잔액 소진(과금)**.

**조치:**
- 콜러블에 App Check 강제: `onCall({ enforceAppCheck: true }, …)`
- 번호별/IP별 **쿨다운(예: 60초 1회, 1일 5회)** 추가 — `smsAuth/{phone}`에 마지막 발송시각 기록 후 차단.
- 인증 시도 횟수 제한(코드 검증 5회 실패 시 잠금).

### 🟠 1-3. 가게(stores) 소유권 탈취 가능
**현상 (`firestore.rules` `stores/{id}` update):**
```
|| (!('ownerId' in resource.data) && request.resource.data.ownerId == request.auth.uid)
|| (resource.data.ownerId == null && request.resource.data.ownerId == request.auth.uid)
```
- `ownerId`가 비어있는(또는 null) 가게 문서는 **아무 로그인 사용자나 자기 uid로 ownerId를 채워 점유** 가능 → 이후 수정/삭제 권한 획득.
- 관리자가 만든 ownerId 없는 가게가 표적이 됨.

**조치:** 빈 ownerId 점유 허용 두 절을 제거하거나 `isAdmin()`으로만 한정. 소유권 부여는 관리자 `linkStoreToBiz` 경로로만.

### 🟠 1-4. 채팅 메시지 전체 열람
**현상 (`firestore.rules` `chats`/`chat_rooms`/`rooms`):**
```
match /messages/{msgId} { allow read: if signedIn(); … }
```
- **모든 로그인 사용자**가 **모든 방의 메시지**를 읽을 수 있음. 참여자 검증 없음.
- 전부 공개 그룹방이라면 의도된 동작이지만, 1:1/비공개 방이 하나라도 있으면 대화 내용 유출.

**조치:** 방 문서에 `participants: [uid…]` 두고 `allow read: if request.auth.uid in get(...).data.participants` 형태로 멤버십 체크. 전부 공개라면 "공개임"을 문서/룰 주석에 명시.

### 🟡 1-5. Maps/Firebase 공용 API 키 + 클라이언트 노출
**현상:** `src/firebase.js`의 `firebaseConfig.apiKey`와 `.env`의 `VITE_GMAPS_API_KEY`가 **동일한 키**(`AIza…IvqAk`).
- Firebase 웹 apiKey가 클라이언트에 노출되는 것 자체는 **정상**(프로젝트 식별자일 뿐, 보안은 App Check + Rules가 담당). → 이 부분은 취약점 아님.
- 다만 **같은 키를 Google Maps에도 쓰고 있어서**, 키에 Maps/Places/Geocoding API가 켜져 있고 **HTTP 리퍼러 제한이 없으면** 제3자가 이 키로 유료 Maps 호출을 일으켜 과금시킬 수 있음.

**조치:** GCP 콘솔에서 이 키에 **HTTP 리퍼러 제한**(gangtox.com, gangtalk815.com, *.web.app) + **API 제한**(필요한 API만) 설정. 가능하면 Maps용 키를 Firebase용과 분리.

### 🟡 1-6. 관리자 판별 모델 이원화
- Functions: `assertCallerIsAdmin`이 `email === 'gangtalk815@gmail.com'` 하드코딩.
- Rules: `isAdmin()`이 `admins/{uid}` 컬렉션 존재로 판별.
- 두 기준이 달라 혼선 + 관리자 추가/이관이 어려움. → **커스텀 클레임(admin:true)** 또는 `admins/{uid}` 컬렉션으로 통일 권장.

### 🟢 1-7. 열린 `/api` Express 엔드포인트 점검
- `app.use(cors({ origin: true }))`로 모든 origin 반사. `/pass/mock`(목업), `/sheets/vendors/update`(POST) 등이 **인증 없이 열려 있는지** 확인 필요.
- 프로덕션에서는 `/pass/mock` 같은 목업 라우트 제거, 쓰기 엔드포인트엔 토큰 검증 추가.

---

## 2. 버그 / 정합성 (Correctness)

### 🟡 2-1. 좋아요/조회/투표 카운터 조작 가능
**현상:** `board_posts`/`comments`/`replies` update에서
```
changesAreOnly(['views','likes','votesA','votesB','updatedAt'])
```
를 **아무 로그인 사용자**에게 허용 → 중복 방지가 없어 한 명이 likes/views를 무한 증가 가능.
- 경량 커뮤니티 기준에선 "허용 범위"지만, 인기글/투표가 의미를 가지려면 어뷰징 가능성을 알고 있어야 함.
**조치(원하면):** 좋아요는 `likes/{uid}` 서브문서 + Functions 집계(트랜잭션), 조회수는 디바운스/세션 1회.

### 🟡 2-2. 전역 카운터 레이스 컨디션
- `meta/counters`(가입순번 userSeq)와 `reserveReferralCode`(추천코드)가 **비-트랜잭션 read→write**.
- 동시 가입/동시 예약 시 같은 번호 충돌 또는 룰 거부로 일부 가입 실패 가능.
**조치:** `runTransaction`으로 감싸기. 트래픽 적으면 우선순위 낮음.

### 🟢 2-3. 죽은 코드 / 중복 정의
- `functions/authFunctions.js` **전체가 `index.js`에 import되지 않음** → 배포되지 않는 죽은 코드.
- 게다가 `index.js`와 **함수 이름·컬렉션이 어긋나게 중복**: `sms_codes`(authFunctions) vs `smsAuth`(index), `checkNickDuplicate` vs `checkNicknameDuplicate`.
- 나중에 실수로 둘 다 배포하면 충돌. → **`authFunctions.js` 삭제** 권장(실사용은 index.js).

---

## 3. 성능 (Performance)

> JS 번들은 이미 잘 최적화됨(라우트 동적 import, firebase manualChunks 5분할, vue-vendor 분리, 해시 캐시). 남은 이득은 **이미지**와 **실시간 리스너 비용**에 있음.

### 🟡 3-1. 실시간 리스너(onSnapshot) 120개
- `onSnapshot` 120곳 / cleanup 참조 288곳 → **정리 비율 자체는 양호**.
- 다만 화면당 동시 구독 수가 많을수록 **Firestore 읽기 = 과금**과 직결. 목록/정적 데이터는 `onSnapshot` 대신 1회 `get` + 페이지네이션으로 전환하면 읽기 비용↓, 모바일 배터리/네트워크↓.
- 점검 포인트: 현황판/게시판 목록이 실시간일 필요가 있는지. 상세·채팅만 실시간으로.

### 🟡 3-2. 이미지 미최적화 (남은 최대 성능 이득)
- `public/` 총 **9.3MB**, **webp 0개**(png 33 / jpg 8).
- 무거운 것: 워드마크 PNG **2.3MB**(`public/brand/gangnamtalk-wordmar01.png`), 배너 PNG 3종.
- **조치:** PNG/JPG → **webp(또는 avif)** 변환 + 실제 표시 크기로 리사이즈. 로고/배너만 바꿔도 초기 로딩 체감이 크게 개선됨. `firebase.json` 캐시 헤더는 이미 잘 잡혀 있어, 포맷만 바꾸면 됨.

### 🟢 3-3. 배포본에 섞인 불필요 에셋
- `public/img/reference/target-design.png` **2MB** — 디자인 **참고용 이미지가 배포본에 포함**됨. 사용자에게 전송될 필요 없음 → 제거.

### 🟢 3-4. console.* 245개 프로덕션 노출
- `vite.config.js`에 console 제거 설정 없음 → 빌드 결과에 로그 245개 그대로 포함(소량 용량 + 내부정보 노출).
- **조치:** 한 줄 추가.
  ```js
  // vite.config.js → defineConfig({ ... })
  esbuild: { drop: ['console', 'debugger'] },
  // (에러 로그는 남기고 싶으면 pure: ['console.log','console.info','console.debug'])
  ```

---

## 4. 코드 품질 / 저장소 위생 (Maintainability)

### 🟠 4-1. 저장소에 Python 가상환경 통째로 커밋 ⚠️
- `GangTalkMacro/.venv/`가 **통째로 커밋**됨: `cv2.pyd`(약 **67MB**), 각종 Windows `.dll`/`.pyd`, numpy 바이너리 등.
- 전체 추적 파일 **7,203개** 중 상당수가 이 가상환경. 클론·CI가 무거워지고, 웹앱 레포에 데스크탑 매크로 가상환경이 섞여 있는 구조.
- **조치:**
  ```bash
  git rm -r --cached GangTalkMacro/.venv
  echo "GangTalkMacro/.venv/" >> .gitignore
  ```
  (GangTalkMacro 자체가 이 레포에 있을 이유가 없다면 별도 레포로 분리 권장)

### 🟢 4-2. 잡파일 정리
- `--cors-file=cors.json` (0바이트) — `gsutil cors set` 명령 오타로 생성된 **쓰레기 파일**. 삭제.
- 루트 `배너이미지.png`(1.17MB), `개발자 아이콘*.png` 등 루트 산재 에셋 → `public/`로 이동 또는 제거.

### 🟢 4-3. `functions/index.js` 84KB 단일 파일
- 약 2,500줄 모놀리식. 도메인별(sms / referral / biz / pass / digest) 파일 분리하면 유지보수 용이. **우선순위 낮음**(동작엔 문제 없음).

### 🟢 4-4. Service Worker 강제 해제
- `vite.config.js`가 매 로드마다 모든 SW를 `unregister`. 과거 stale 캐시 회피 목적은 이해되나, **PWA/오프라인을 포기**하고 매 로드 소량 비용 발생.
- Capacitor 앱 전환 예정이면 무방. 웹 PWA를 쓸 계획이면 재검토.

---

## 5. 잘 되어 있는 부분 (유지)

- ✅ 라우트 **동적 import** 코드 스플리팅 (핵심 3페이지만 정적)
- ✅ Firebase **manualChunks 5분할** + vue-vendor 분리 + 해시 파일명 캐시 전략
- ✅ `firebase.json` **캐시 헤더**(정적 자산 immutable, html no-cache) 정교함
- ✅ **App Check(reCAPTCHA Enterprise)** 적용 + 운영/로컬 디버그 토큰 분기
- ✅ Auth 퍼시스턴스 **IndexedDB→Local→Memory 폴백**
- ✅ 관리자 빌드 `X-Robots-Tag: noindex` + AppCheck 스킵 분기
- ✅ Rules의 `connectRequests`/`partnerRequests`/`extendRequests`는 소유자/관리자 분리가 **꼼꼼**

---

## 6. 권장 처리 순서 (요약)

1. **(오늘) CoolSMS 키 폐기·재발급** → `.env`류 git 추적 제거 + `.gitignore` → Secret Manager 전환
2. **(오늘) `sendSmsCode`** App Check 강제 + 쿨다운/횟수 제한
3. **(이번 주) Rules**: stores 빈 ownerId 점유 절 제거, 채팅 participants 멤버십 체크
4. **(이번 주) Maps/Firebase 키** GCP 리퍼러·API 제한
5. **(정리)** `GangTalkMacro/.venv`·`--cors-file=cors.json`·reference 이미지 추적 제거, `authFunctions.js` 삭제
6. **(성능)** 이미지 webp 변환, `esbuild drop console`
7. **(여유 시)** 카운터 트랜잭션화, 좋아요/조회 어뷰징 방지, 관리자 판별 통일

> 1·2번은 실제 금전·괴롭힘 피해로 이어질 수 있어 분리해서 빠르게, 나머지는 기존 워크플로우(브랜치→PR→CLAUDE.md 갱신→배포)로 묶어 처리하면 됩니다.
