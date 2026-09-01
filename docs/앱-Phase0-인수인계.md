# 앱 전환 Phase 0 — 인수인계 (Mac 에서 직접 해야 할 작업)

브랜치: `feature/rn-app`
생성물: `app/` (React Native 스캐폴드), `scripts/` (빌드 스크립트), `.nvmrc`

기존 Vue 앱과 배포 경로는 **하나도 건드리지 않았습니다.** `npm run build` / `firebase deploy` 는 그대로 동작합니다.

---

## 0. 정리 (선택)

작업 중 git 잠금 파일을 옮겨둔 `_to_delete/` 폴더가 남아 있습니다. 내용 확인 후 삭제하세요.

```bash
cd ~/GangTalk
ls _to_delete      # 전부 빈 .lock 파일
rm -rf _to_delete
```

---

## 1. 의존성 설치

```bash
cd ~/GangTalk/app
nvm use 22
npm install
```

> 클라우드 쪽에서는 네트워크 프록시 제약으로 설치가 완료되지 않아 Mac 에서 직접 실행이 필요합니다.

---

## 2. Firebase 앱 등록 (`gangtalk-b8eb8`)

Firebase 콘솔 → 프로젝트 설정 → 내 앱

**Android 앱 추가**
- 패키지 이름: `com.appmonster.gangtalk`
- 다운로드한 `google-services.json` → `app/android/app/google-services.json`

**iOS 앱 추가**
- 번들 ID: `com.appmonster.gangtalk`
- 다운로드한 `GoogleService-Info.plist` → `app/ios/GangTalk/GoogleService-Info.plist`
- Xcode 에서 프로젝트에 **파일 추가**(드래그) 까지 해야 번들에 포함됩니다

> gradle 플러그인 등록(`com.google.gms:google-services`)과 `FirebaseApp.configure()` 는 이미 코드에 넣어뒀습니다. 설정 파일만 배치하면 됩니다.

---

## 3. iOS 네이티브 세팅

```bash
cd ~/GangTalk/app
npm run ios:setup     # bundle install + pod install
```

---

## 4. 검증

```bash
cd ~/GangTalk/app
npm run typecheck     # TS 오류 0 이어야 함
npm run lint
npm start             # Metro
npm run ios           # 시뮬레이터 (별도 터미널)
npm run android
```

성공하면 하단 탭 5개(홈/업체/강톡/채팅/마이)가 보이는 빈 앱이 뜹니다.

---

## 5. 앞으로 쓸 빌드 명령

```bash
npm run build:android          # AAB + APK
npm run build:android -- --apk # 실기기 테스트용 APK만
npm run build:ios              # pod install 까지, Archive 는 Xcode
npm run build:all              # 양쪽 동시
```

Play Console 업로드용 서명 키는 `~/.gradle/gradle.properties` 에 `GANGTALK_UPLOAD_*` 로 등록해야 합니다 (라이드톡 `RIDETALK_UPLOAD_*` 와 동일 방식). 미등록 시 `build-android.sh` 가 경고합니다.

---

## 6. 아직 결정하지 않은 것

- **디렉토리 재편** — 계획서상 기존 Vue 를 `web/`, 관리자 빌드를 `admin/` 으로 옮기기로 했으나, `firebase.json` · `vite.config.js` · `.firebaserc` 경로가 함께 바뀌어 배포가 잠시 깨질 수 있어 **이번에는 보류**했습니다. 배포 여유가 있을 때 별도 작업으로 진행하는 것을 권장합니다
- **소셜 로그인 도입 여부** — 현재 이메일 + SMS 만. 카카오 로그인을 넣을지 Phase 1 시작 전 결정 필요
- **수익화** — 광고/인앱결제 도입 여부 미정 (미도입 시 Phase 5 작업량 감소)

---

## 7. Phase 1 진입 조건

- [ ] `npm run typecheck` 통과
- [ ] iOS 시뮬레이터 / Android 에뮬레이터에서 앱 실행 확인
- [ ] Firebase 연결 확인 (로그인 시도 시 Auth 응답)
- [ ] Firestore 보안 백로그 처리 (`stores` 빈 `ownerId` 점유 룰 제거, `messages` participants 멤버십 검증)
