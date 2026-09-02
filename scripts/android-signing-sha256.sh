#!/usr/bin/env bash
# 안드로이드 서명 키의 SHA-256 지문을 뽑는다.
# Firebase Console > App Check > Play Integrity 의 "SHA-256 인증서 디지털 지문" 에 넣는 값.
#
#   ./scripts/android-signing-sha256.sh                 # 릴리스 키 (gradle.properties 설정 필요)
#   ./scripts/android-signing-sha256.sh --debug         # 디버그 키
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ "${1:-}" == "--debug" ]]; then
  echo "디버그 키 (로컬 개발용)"
  keytool -list -v \
    -keystore "$ROOT/app/android/app/debug.keystore" \
    -alias androiddebugkey -storepass android -keypass android \
    | grep "SHA256:"
  exit 0
fi

PROPS="$HOME/.gradle/gradle.properties"
if [[ ! -f "$PROPS" ]]; then
  echo "❌ $PROPS 가 없습니다." >&2
  echo "   릴리스 키를 먼저 만들고 그 파일에 설정을 넣으세요." >&2
  exit 1
fi

get() { grep -m1 "^$1=" "$PROPS" | cut -d= -f2- || true; }
STORE="$(get GANGTALK_STORE_FILE)"
ALIAS="$(get GANGTALK_KEY_ALIAS)"

if [[ -z "$STORE" || -z "$ALIAS" ]]; then
  echo "❌ $PROPS 에 GANGTALK_STORE_FILE / GANGTALK_KEY_ALIAS 가 없습니다." >&2
  exit 1
fi
if [[ ! -f "$STORE" ]]; then
  echo "❌ 키스토어 파일이 없습니다: $STORE" >&2
  exit 1
fi

echo "릴리스(업로드) 키: $STORE  alias=$ALIAS"
echo "키스토어 비밀번호를 입력하세요 (화면에 표시되지 않습니다)"
keytool -list -v -keystore "$STORE" -alias "$ALIAS" | grep "SHA256:"
