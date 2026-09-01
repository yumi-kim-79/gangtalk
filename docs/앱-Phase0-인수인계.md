# 앱 전환 Phase 0 — Mac 실행 명령서

브랜치: `feature/rn-app`

## 바뀐 디렉토리 구조

```
GangTalk/
├── app/         # React Native 앱 (신규, 주력)
├── web/         # 기존 Vue — 회원 웹 + 관리자 웹 (빌드 타겟 2종)
├── functions/   # Cloud Functions (그대로)
├── scripts/     # 앱 빌드 스크립트 (신규)
├── docs/
├── package.json # 루트에서 web/app/functions 명령 위임 (신규)
└── firebase.json / firestore.rules / storage.rules
```

Hosting public 경로는 `web/dist`, `web/dist-admin` 으로 수정 완료.
**배포는 항상 루트에서** 실행합니다 (firebase.json 이 루트에 있음).

---

## 1. 정리 + 웹 정상 동작 확인 (먼저 이것부터)

> **주의 — zsh 에서 명령어 뒤에 `#` 주석을 붙이지 마세요.**
> macOS 기본 zsh 는 대화형 셸에서 `interactive_comments` 가 꺼져 있어 `#` 뒤 문자열이
> 주석이 아니라 **인자로 그대로 전달**됩니다. `npm run web:build  # → web/dist` 처럼 쓰면
> `vite build # → web/dist` 가 실행되어 `#` 을 프로젝트 루트로 잡고 빌드가 실패합니다.


```bash
cd ~/GangTalk
rm -rf _to_delete pglite-debug.log

nvm install 22
nvm use 22
npm --prefix web install
npm run web:build
npm run web:build:admin
```

빌드 2종이 성공하면 재편이 정상입니다. 배포까지 확인하려면:

```bash
npm run deploy:hosting
npm run deploy:admin
```

---

## 2. 앱 의존성 설치

```bash
cd ~/GangTalk/app
npm install
```

> 클라우드 쪽 리눅스 VM 은 프록시 제약으로 npm install 이 끝까지 가지 않아 Mac 에서 직접 실행이 필요합니다.

---

## 3. Firebase 앱 등록 (`gangtalk-b8eb8`)

Firebase 콘솔 → 프로젝트 설정 → 내 앱

**Android 추가** — 패키지 이름 `com.appmonster.gangtalk`
```bash
# 다운로드한 파일을 아래 경로로
mv ~/Downloads/google-services.json ~/GangTalk/app/android/app/google-services.json
```

**iOS 추가** — 번들 ID `com.appmonster.gangtalk`
```bash
mv ~/Downloads/GoogleService-Info.plist ~/GangTalk/app/ios/GangTalk/GoogleService-Info.plist
```
> iOS 는 파일을 옮긴 뒤 **Xcode 에서 프로젝트에 드래그해 추가**해야 번들에 포함됩니다.

gradle 플러그인 등록과 `FirebaseApp.configure()` 는 이미 코드에 넣어뒀습니다.

---

## 4. iOS 네이티브 세팅

```bash
cd ~/GangTalk/app
npm run ios:setup
```

---

## 5. 검증

```bash
cd ~/GangTalk
npm run app:typecheck
npm --prefix app run lint

cd app
npm start
npm run ios
npm run android
```

성공 기준: 하단 탭 5개(홈/업체/강톡/채팅/마이)가 보이는 빈 앱이 실행됨.

---

## 6. 앞으로 쓸 빌드 명령

```bash
cd ~/GangTalk
npm run build:android
bash scripts/build-android.sh --apk
bash scripts/build-android.sh --apk --no-clean
npm run build:ios
npm run build:all
```

Play Console 업로드용 서명 키는 `~/.gradle/gradle.properties` 에 등록:

```properties
GANGTALK_UPLOAD_STORE_FILE=gangtalk-upload.keystore
GANGTALK_UPLOAD_KEY_ALIAS=gangtalk-upload
GANGTALK_UPLOAD_STORE_PASSWORD=********
GANGTALK_UPLOAD_KEY_PASSWORD=********
```

키스토어 신규 생성이 필요하면:

```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore ~/GangTalk/app/android/app/gangtalk-upload.keystore \
  -alias gangtalk-upload -keyalg RSA -keysize 2048 -validity 10000
```

> 이 키스토어를 잃어버리면 같은 앱으로 업데이트를 못 올립니다. 안전한 곳에 백업하세요.

---

## 7. Phase 1 진입 전 결정할 것

- **소셜 로그인** — 현재 이메일 + SMS 만. 카카오 로그인 추가 여부
- **수익화** — 광고/인앱결제 도입 여부 (미도입 시 Phase 5 작업량 감소)
- **Firestore 보안 백로그** — `stores` 빈 `ownerId` 점유 룰 제거, `messages` participants 멤버십 검증. 앱 배포 후엔 고치기 어려우므로 Phase 1 전 처리 권장
