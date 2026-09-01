#!/usr/bin/env bash
#
# 개발 캐시 정리 — 빌드 전에 돌려 디스크를 확보한다.
#
#   bash scripts/clean-dev.sh          # 기본: 재생성 빠른 것만 (수십초)
#   bash scripts/clean-dev.sh --deep   # node_modules / Pods 까지 (재설치 필요)
#
# 지우는 것은 전부 **다시 만들어지는 산출물**이다.
# 소스코드 · git · Xcode Archives(출시 빌드 dSYM) 는 건드리지 않는다.
set -u

DEEP=0
[ "${1:-}" = "--deep" ] && DEEP=1

# 정리 대상 프로젝트 — 필요하면 여기에 추가
PROJECTS=(
  "$HOME/GangTalk"
  "$HOME/ridetalk"
  "$HOME/StudioProjects"
)

before=$(df -k /System/Volumes/Data 2>/dev/null | awk 'NR==2{print $4}')
[ -z "$before" ] && before=$(df -k / | awk 'NR==2{print $4}')

say() { printf '\n\033[1;35m▶ %s\033[0m\n' "$1"; }
rmrf() { [ -n "${1:-}" ] && [ -e "$1" ] && rm -rf "$1" && echo "   지움  $1"; }

# ───────── 1) 프로젝트별 빌드 산출물 ─────────
for root in "${PROJECTS[@]}"; do
  [ -d "$root" ] || continue
  say "프로젝트 정리: $root"

  # Android
  while IFS= read -r d; do rmrf "$d"; done < <(
    find "$root" -type d \( -name build -o -name .gradle -o -name .cxx \) \
      -not -path "*/node_modules/*" -prune 2>/dev/null
  )

  # iOS — Pods 는 --deep 에서만 (pod install 이 오래 걸린다)
  while IFS= read -r d; do rmrf "$d"; done < <(
    find "$root" -type d -name "DerivedData" -prune 2>/dev/null
  )

  # 번들러 / 메트로 임시물
  while IFS= read -r d; do rmrf "$d"; done < <(
    find "$root" -maxdepth 4 -type d -name ".expo" -o -maxdepth 4 -type d -name "dist-admin" 2>/dev/null
  )

  if [ "$DEEP" = "1" ]; then
    while IFS= read -r d; do rmrf "$d"; done < <(
      find "$root" -type d \( -name node_modules -o -name Pods \) -prune 2>/dev/null
    )
  fi
done

# ───────── 2) Xcode / 시뮬레이터 ─────────
say "Xcode 캐시"
rmrf "$HOME/Library/Developer/Xcode/DerivedData"
rmrf "$HOME/Library/Developer/Xcode/iOS DeviceSupport"
rmrf "$HOME/Library/Developer/Xcode/watchOS DeviceSupport"
rmrf "$HOME/Library/Developer/Xcode/tvOS DeviceSupport"
rmrf "$HOME/Library/Developer/CoreSimulator/Caches"
echo "   ※ Xcode > Archives 는 출시 빌드의 dSYM 이라 건드리지 않습니다"

if command -v xcrun >/dev/null 2>&1; then
  say "사용 불가 시뮬레이터 제거"
  xcrun simctl delete unavailable 2>/dev/null && echo "   완료"
fi

# ───────── 3) 패키지 매니저 캐시 ─────────
say "패키지 매니저 캐시"
rmrf "$HOME/.gradle/caches"
rmrf "$HOME/Library/Caches/CocoaPods"
rmrf "$HOME/Library/Caches/Yarn"
rmrf "$HOME/Library/Caches/com.apple.dt.Xcode"
command -v npm      >/dev/null 2>&1 && npm cache clean --force >/dev/null 2>&1 && echo "   지움  npm cache"
command -v watchman >/dev/null 2>&1 && watchman watch-del-all  >/dev/null 2>&1 && echo "   지움  watchman 감시 목록"

# ───────── 결과 ─────────
after=$(df -k /System/Volumes/Data 2>/dev/null | awk 'NR==2{print $4}')
[ -z "$after" ] && after=$(df -k / | awk 'NR==2{print $4}')
freed=$(( (after - before) / 1024 / 1024 ))

say "완료"
df -h /System/Volumes/Data 2>/dev/null || df -h /
[ "$freed" -gt 0 ] && printf '\n\033[1;32m확보: 약 %s GB\033[0m\n' "$freed"

cat <<'NEXT'

다시 세팅하려면:
  cd ~/GangTalk       && npm --prefix web install && npm --prefix functions install
  cd ~/GangTalk/app   && npm install && (cd ios && pod install)
NEXT
