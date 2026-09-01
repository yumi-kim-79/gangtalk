#!/bin/bash
# 빌드 캐시 정리 — Metro/Watchman/Gradle/DerivedData
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🧹 빌드 캐시 정리"
watchman watch-del-all 2>/dev/null || true
rm -rf "$TMPDIR"/metro-* "$TMPDIR"/haste-map-* 2>/dev/null || true
rm -rf "$REPO_ROOT/app/ios/build" 2>/dev/null || true
if [ -d "$REPO_ROOT/app/android" ]; then
  (cd "$REPO_ROOT/app/android" && ./gradlew clean -q) || true
fi
echo "✅ 정리 완료"
