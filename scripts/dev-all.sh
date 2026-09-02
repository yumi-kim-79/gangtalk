#!/usr/bin/env bash
# 개발 빌드를 Android · iOS 에 한 번에 설치한다.
#
#   cd ~/GangTalk/app && npm run dev:all
#
# - Metro 는 한 번만 띄운다 (이미 8081 이 떠 있으면 그대로 재사용)
# - 두 플랫폼을 병렬로 빌드하고, 끝나면 각각 성공/실패를 알려 준다
# - 한쪽이 실패해도 다른 쪽은 계속 진행한다
#
# 출시용 릴리스 빌드(AAB/Archive)는 `npm run build:all` 쪽이다. 이건 개발용.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../app" && pwd)"
LOG_DIR="$APP_DIR/.devlogs"
mkdir -p "$LOG_DIR"

cd "$APP_DIR"

echo "🚀 강톡 개발 빌드 (Android + iOS)"
echo "═══════════════════════════════════════"

# ── Metro ──────────────────────────────────────────────
if lsof -ti :8081 >/dev/null 2>&1; then
  echo "📡 Metro 이미 실행 중 (8081) — 재사용"
  METRO_PID=""
else
  echo "📡 Metro 시작…"
  npx react-native start > "$LOG_DIR/metro.log" 2>&1 &
  METRO_PID=$!
  # 번들러가 뜰 때까지 잠깐 기다린다
  for _ in $(seq 1 30); do
    lsof -ti :8081 >/dev/null 2>&1 && break
    sleep 1
  done
  echo "   → 로그: $LOG_DIR/metro.log"
fi

# ── 병렬 빌드 ──────────────────────────────────────────
echo "🤖 Android 빌드 시작…"
npx react-native run-android --no-packager > "$LOG_DIR/android.log" 2>&1 &
AND_PID=$!

echo "🍎 iOS 빌드 시작…"
npx react-native run-ios --no-packager > "$LOG_DIR/ios.log" 2>&1 &
IOS_PID=$!

echo "   (둘 다 병렬로 돕니다. 처음이면 수 분 걸립니다)"
echo

wait $AND_PID && AND_ST=0 || AND_ST=$?
wait $IOS_PID && IOS_ST=0 || IOS_ST=$?

echo "═══════════════════════════════════════"
if [ "$AND_ST" -eq 0 ]; then
  echo "✅ Android 설치 완료"
else
  echo "❌ Android 실패 (exit=$AND_ST) — 마지막 30줄:"
  tail -30 "$LOG_DIR/android.log" | sed 's/^/     /'
fi

if [ "$IOS_ST" -eq 0 ]; then
  echo "✅ iOS 설치 완료"
else
  echo "❌ iOS 실패 (exit=$IOS_ST) — 마지막 30줄:"
  tail -30 "$LOG_DIR/ios.log" | sed 's/^/     /'
fi

echo
echo "전체 로그: $LOG_DIR/{android,ios,metro}.log"
if [ -n "$METRO_PID" ]; then
  echo "📡 Metro(PID $METRO_PID)는 계속 실행 중입니다. 끝내려면: kill $METRO_PID"
fi

# 둘 중 하나라도 실패하면 실패로 종료
[ "$AND_ST" -eq 0 ] && [ "$IOS_ST" -eq 0 ]
