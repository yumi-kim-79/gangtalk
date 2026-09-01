#!/usr/bin/env bash
#
# 개발 캐시 정리 — 단계를 나눠 "빌드 속도를 희생하지 않고" 공간을 확보한다.
#
#   bash scripts/clean-dev.sh            기본  — 빌드 속도에 영향 없는 순수 쓰레기만
#   bash scripts/clean-dev.sh --builds   빌드 산출물까지 (다음 빌드가 풀 빌드가 된다)
#   bash scripts/clean-dev.sh --deep     node_modules / Pods / 의존성 캐시까지 (재설치 필요)
#
# 왜 나눴나: DerivedData·Pods·.gradle 은 **다음 빌드를 빠르게 해 주는 캐시**다.
# 매번 지우면 빌드가 매번 15~25분이 된다. 공간이 급할 때만 --builds / --deep 을 쓴다.
#
# 어느 단계도 소스 · git · Xcode Archives(출시 빌드 dSYM) 는 건드리지 않는다.
set -u

LEVEL=basic
case "${1:-}" in
  --builds) LEVEL=builds ;;
  --deep)   LEVEL=deep ;;
  "")       ;;
  *) echo "사용법: $0 [--builds|--deep]"; exit 1 ;;
esac

PROJECTS=("$HOME/GangTalk" "$HOME/ridetalk" "$HOME/StudioProjects")

avail() { df -k /System/Volumes/Data 2>/dev/null | awk 'NR==2{print $4}' || df -k / | awk 'NR==2{print $4}'; }
before=$(avail)

say()  { printf '\n\033[1;35m▶ %s\033[0m\n' "$1"; }
rmrf() { [ -n "${1:-}" ] && [ -e "$1" ] && rm -rf "$1" && echo "   지움  $1"; }

# ───────── 1) 기본 — 다시 만들어도 빌드가 느려지지 않는 것들 ─────────
say "실기기 심볼 캐시 · 시뮬레이터"
rmrf "$HOME/Library/Developer/Xcode/iOS DeviceSupport"
rmrf "$HOME/Library/Developer/Xcode/watchOS DeviceSupport"
rmrf "$HOME/Library/Developer/Xcode/tvOS DeviceSupport"
rmrf "$HOME/Library/Developer/CoreSimulator/Caches"
command -v xcrun >/dev/null 2>&1 && xcrun simctl delete unavailable 2>/dev/null \
  && echo "   지움  사용 불가 시뮬레이터"

say "임시 캐시"
rmrf "$HOME/Library/Caches/com.apple.dt.Xcode"
rmrf "$HOME/Library/Developer/Xcode/Products"
command -v watchman >/dev/null 2>&1 && watchman watch-del-all >/dev/null 2>&1 \
  && echo "   지움  watchman 감시 목록"
find /tmp -maxdepth 1 -name "metro-*" -mtime +1 -exec rm -rf {} + 2>/dev/null \
  && echo "   지움  오래된 metro 임시파일"

echo "   ※ Xcode > Archives 는 출시 빌드의 dSYM 이라 건드리지 않습니다"

if [ "$LEVEL" = "basic" ]; then
  say "완료 (기본)"
  echo "   DerivedData · Pods · .gradle 은 남겨뒀습니다 — 다음 빌드가 빠릅니다."
  echo "   공간이 더 필요하면: bash $0 --builds"
fi

# ───────── 2) --builds — 빌드 산출물 (다음 빌드가 풀 빌드) ─────────
if [ "$LEVEL" != "basic" ]; then
  say "빌드 산출물 — 다음 빌드는 풀 빌드가 됩니다"
  rmrf "$HOME/Library/Developer/Xcode/DerivedData"
  for root in "${PROJECTS[@]}"; do
    [ -d "$root" ] || continue
    while IFS= read -r d; do rmrf "$d"; done < <(
      find "$root" -type d \( -name build -o -name .cxx \) \
        -not -path "*/node_modules/*" -prune 2>/dev/null
    )
    while IFS= read -r d; do rmrf "$d"; done < <(
      find "$root" -maxdepth 4 -type d -name ".gradle" -prune 2>/dev/null
    )
  done
fi

# ───────── 3) --deep — 의존성까지 (재설치 필요) ─────────
if [ "$LEVEL" = "deep" ]; then
  say "의존성 — 재설치가 필요합니다"
  rmrf "$HOME/.gradle/caches"
  rmrf "$HOME/Library/Caches/CocoaPods"
  rmrf "$HOME/Library/Caches/Yarn"
  command -v npm >/dev/null 2>&1 && npm cache clean --force >/dev/null 2>&1 \
    && echo "   지움  npm cache"
  for root in "${PROJECTS[@]}"; do
    [ -d "$root" ] || continue
    while IFS= read -r d; do rmrf "$d"; done < <(
      find "$root" -type d \( -name node_modules -o -name Pods \) -prune 2>/dev/null
    )
  done
fi

after=$(avail)
freed=$(( (after - before) / 1024 ))
say "결과"
df -h /System/Volumes/Data 2>/dev/null || df -h /
[ "$freed" -gt 0 ] && printf '\n\033[1;32m확보: 약 %s MB\033[0m\n' "$freed"

if [ "$LEVEL" = "deep" ]; then
cat <<'NEXT'

재설치:
  cd ~/GangTalk     && npm --prefix web install && npm --prefix functions install
  cd ~/GangTalk/app && npm install && (cd ios && pod install)
NEXT
fi
