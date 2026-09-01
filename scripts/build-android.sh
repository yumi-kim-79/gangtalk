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

if ! grep -q "GANGTALK_UPLOAD_STORE_FILE" "$HOME/.gradle/gradle.properties" 2>/dev/null; then
  echo "⚠️  ~/.gradle/gradle.properties 에 GANGTALK_UPLOAD_* 서명 설정이 없습니다."
  echo "    release 빌드가 debug.keystore 로 서명되어 Play Console 업로드가 거부됩니다."
fi

[ "$DO_CLEAN" = true ] && bash "$SCRIPT_DIR/clean-build.sh"

cd "$REPO_ROOT/app/android"
if [ "$DO_AAB" = true ]; then
  ./gradlew bundleRelease
  echo "✅ AAB: app/android/app/build/outputs/bundle/release/app-release.aab"
fi
if [ "$DO_APK" = true ]; then
  ./gradlew assembleRelease
  echo "✅ APK: app/android/app/build/outputs/apk/release/app-release.apk"
fi
