#!/usr/bin/env bash
# iOS 출시용 IPA 를 만든다.
#
#   ./scripts/build-ios-ipa.sh
#   → ~/Desktop/GangTalkIPA/GangTalk.ipa
#
# 업로드는 Transporter 앱으로 한다 (App Store Connect 계정으로 로그인).
#
# ─────────────────────────────────────────────────────────────
# 왜 Xcode Organizer 를 안 쓰는가 (2026-09-17)
#
# 개발자 계정이 **개인(Individual)** 이라 App Store Connect 에 사용자를 추가해도
# Apple Developer Program 팀원이 되지 않는다. 그래서 개발자 포털 접근이 없고
# (Xcode > Apple Accounts 에서 Certificates, Identifiers & Profiles 가 ❌),
# Organizer 의 Distribute App 은 "No Account for Team" 으로 막힌다.
#
# 대신 계정 소유자의 웹 세션으로 인증서·프로파일을 직접 발급해 두고
# 수동 서명으로 빌드한다. 인증서·프로파일 만료는 2027-09-17.
#   인증서   Apple Distribution: young woo Song (KB36ALBH6R)
#   프로파일 GangTalk AppStore
#
# ─────────────────────────────────────────────────────────────
# 막히면 볼 것
#
# · "No signing certificate ... found"
#     CODE_SIGN_IDENTITY 가 구형 이름(iPhone Distribution)이면 못 찾는다.
#     Apple Distribution 이어야 한다.
#
# · codesign 이 키체인 암호를 계속 거부
#     맥 비밀번호를 바꾼 적이 있으면 로그인 키체인은 **옛 비밀번호**로 남는다.
#     옛 비밀번호를 넣거나, 키체인 접근에서 개인 키 > 정보 가져오기 >
#     접근 제어 > "모든 응용 프로그램 허용" 로 풀어 둔다.
#
# · "Signing for GangTalk requires a development team" (2026-09-17)
#     pbxproj 를 손보는 동안 Xcode 가 열려 있으면 Xcode 가 파일을 다시 쓴다.
#     실제로 Release 의 배포 설정(Manual / Apple Distribution / KB36ALBH6R /
#     GangTalk AppStore)이 통째로 **Debug 쪽으로 옮겨가고** Release 는
#     Automatic + 팀 없음으로 초기화됐다.
#     → pbxproj 를 고치기 전에 **Xcode 를 먼저 닫을 것.**
#     → 고친 뒤에도 Xcode 를 열지 말고 이 스크립트로 바로 빌드할 것.
#
# · Transporter: "Missing required icon file ... iPad ... 152x152 / 167x167"
#     아이콘이 없어서가 아니라 **iPad 를 지원한다고 선언해놓고** iPad 아이콘이
#     없어서 나는 불일치다. AppIcon.appiconset 에는 iphone / ios-marketing
#     idiom 만 있다. 강톡은 폰 전용이라 TARGETED_DEVICE_FAMILY = 1 로 둔다.
#     (iPad 를 지원하려면 아이콘 추가 + iPad 스크린샷까지 필요하다)
#
# · Signing & Capabilities 화면이 빨간 오류를 계속 보여줌
#     UI 캐시다. 디스크의 설정이 맞으면 CLI 빌드는 통과한다. 무시해도 된다.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IOS="$ROOT/app/ios"
ARCHIVE="$HOME/Desktop/GangTalk.xcarchive"
OUT="$HOME/Desktop/GangTalkIPA"

echo "▸ 아카이브"
cd "$IOS"
xcodebuild -workspace GangTalk.xcworkspace -scheme GangTalk \
  -configuration Release -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE" archive

echo
echo "▸ IPA 내보내기"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportOptionsPlist "$IOS/ExportOptions.plist" \
  -exportPath "$OUT"

echo
echo "완료: $OUT/GangTalk.ipa"
echo
echo "다음: Transporter 앱 실행 → App Store Connect 계정으로 로그인 →"
echo "      위 .ipa 를 끌어다 놓고 [전송]"
