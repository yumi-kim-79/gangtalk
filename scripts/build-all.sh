#!/bin/bash
# iOS + Android 동시 빌드 — Android(수 분) 백그라운드, iOS pod install 병렬
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🚀 강톡 전체 빌드"
echo "═══════════════════════════════"
bash "$SCRIPT_DIR/clean-build.sh"

echo "🤖 Android 빌드 시작 (백그라운드)..."
(cd "$REPO_ROOT/app/android" && ./gradlew bundleRelease) &
ANDROID_PID=$!

echo "📦 iOS pod install (병렬)..."
cd "$REPO_ROOT/app" && bundle install
cd "$REPO_ROOT/app/ios" && bundle exec pod install

echo "⏳ Android 빌드 완료 대기..."
wait $ANDROID_PID && ANDROID_STATUS=0 || ANDROID_STATUS=$?

AAB="$REPO_ROOT/app/android/app/build/outputs/bundle/release/app-release.aab"
if [ "$ANDROID_STATUS" -eq 0 ] && [ -f "$AAB" ]; then
  echo "✅ Android 완료 ($(du -sh "$AAB" | awk '{print $1}')) — $AAB"
else
  echo "❌ Android 빌드 실패 (exit=$ANDROID_STATUS)"
fi

echo "🔨 iOS: open $REPO_ROOT/app/ios/GangTalk.xcworkspace → Archive"
