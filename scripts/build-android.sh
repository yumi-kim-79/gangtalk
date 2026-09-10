#!/bin/bash
# Android 빌드 — AAB(Play 업로드용) + APK(실기기 테스트용)
#   bash scripts/build-android.sh          # 둘 다
#   bash scripts/build-android.sh --aab    # AAB만
#   bash scripts/build-android.sh --apk    # APK만
#   bash scripts/build-android.sh --apk --no-clean
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

DO_AAB=true; DO_APK=true; DO_CLEAN=true
for arg in "$@"; do
  case "$arg" in
    --aab) DO_APK=false ;;
    --apk) DO_AAB=false ;;
    --no-clean) DO_CLEAN=false ;;
  esac
done

echo "🤖 강톡 Android 빌드"
echo "═══════════════════════════════"
echo "AAB: $DO_AAB / APK: $DO_APK / clean: $DO_CLEAN"

# 서명 설정 확인.
# 2026-09-10: 여기서 GANGTALK_UPLOAD_STORE_FILE 을 찾고 있었는데,
#   정작 android/app/build.gradle 이 읽는 이름은 GANGTALK_STORE_FILE 이다.
#   이름이 어긋나 있으면 "설정했다고 생각했는데 디버그 키로 서명된 AAB" 가 나오고,
#   Play 업로드 단계에서야 알게 된다. 같은 이름을 본다.
PROPS="$HOME/.gradle/gradle.properties"
if ! grep -q "^GANGTALK_STORE_FILE=" "$PROPS" 2>/dev/null; then
  echo "❌ $PROPS 에 릴리스 서명 설정(GANGTALK_STORE_FILE 등)이 없습니다."
  echo "   이대로 빌드하면 debug.keystore 로 서명되어 Play Console 이 업로드를 거부합니다."
  echo ""
  echo "   업로드 키를 만들려면:"
  echo "     ./scripts/android-make-upload-key.sh"
  echo ""
  if [ "$DO_AAB" = true ]; then
    echo "   (AAB 빌드를 중단합니다. 테스트용 APK 만 필요하면 --apk 로 실행하세요)"
    exit 1
  fi
fi

[ "$DO_CLEAN" = true ] && bash "$SCRIPT_DIR/clean-build.sh"

# 디버그 키 지문 — 빌드 결과가 이 키로 서명됐으면 Play 업로드가 거부된다
debug_sha256() {
  keytool -list -v \
    -keystore "$REPO_ROOT/app/android/app/debug.keystore" \
    -alias androiddebugkey -storepass android -keypass android 2>/dev/null \
    | grep -m1 "SHA256:" | sed 's/.*SHA256: *//'
}

# 산출물이 실제로 어떤 키로 서명됐는지 확인한다.
# gradle 설정이 어긋나면 조용히 디버그 키로 서명되는데, 그걸 Play 업로드 단계에서야
# 알게 되면 빌드 시간을 통째로 버린다.
verify_signing() {
  local file="$1"
  local got dbg
  got="$(keytool -printcert -jarfile "$file" 2>/dev/null | grep -m1 "SHA256:" | sed 's/.*SHA256: *//')"
  dbg="$(debug_sha256)"
  if [ -z "$got" ]; then
    echo "   (서명 확인 생략 — keytool 이 지문을 읽지 못했습니다)"
    return 0
  fi
  if [ "$got" = "$dbg" ]; then
    echo "❌ 이 파일은 **디버그 키**로 서명됐습니다. Play 업로드가 거부됩니다."
    echo "   ~/.gradle/gradle.properties 의 GANGTALK_STORE_FILE 설정을 확인하세요."
    return 1
  fi
  echo "   서명 SHA-256: $got"
  return 0
}

cd "$REPO_ROOT/app/android"
if [ "$DO_AAB" = true ]; then
  ./gradlew bundleRelease
  AAB="$REPO_ROOT/app/android/app/build/outputs/bundle/release/app-release.aab"
  echo "✅ AAB: $AAB"
  verify_signing "$AAB" || exit 1
fi
if [ "$DO_APK" = true ]; then
  ./gradlew assembleRelease
  echo "✅ APK: app/android/app/build/outputs/apk/release/app-release.apk"
fi
