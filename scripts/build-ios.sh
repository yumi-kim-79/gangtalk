#!/bin/bash
# iOS 빌드 준비 — pod install 까지. Archive 는 Xcode 에서 수행.
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🍎 강톡 iOS 빌드 준비"
echo "═══════════════════════════════"

[ "$1" != "--no-clean" ] && bash "$SCRIPT_DIR/clean-build.sh"

cd "$REPO_ROOT/app"
bundle install
cd ios && bundle exec pod install

echo ""
echo "✅ pod install 완료"
echo "🔨 다음 단계 (Xcode):"
echo "   open $REPO_ROOT/app/ios/GangTalk.xcworkspace"
echo "   Product → Clean Build Folder → Archive"
