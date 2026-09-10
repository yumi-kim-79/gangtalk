#!/usr/bin/env bash
# 강톡 Play 업로드 키 생성 + ~/.gradle/gradle.properties 설정.
#
#   ./scripts/android-make-upload-key.sh                    # 기본 경로에 생성
#   ./scripts/android-make-upload-key.sh ~/keys/my.keystore # 경로 지정
#
# 이 스크립트는 **맥 터미널에서** 실행한다 (키스토어는 개발 PC에만 둔다).
# 비밀번호는 인자로 받지 않는다 — 셸 히스토리에 남기지 않기 위해서다.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="${1:-$HOME/keys/gangtalk-upload.keystore}"
ALIAS="gangtalk"
PROPS="$HOME/.gradle/gradle.properties"

echo "🔑 강톡 Play 업로드 키 만들기"
echo "═══════════════════════════════════════"
echo "  키스토어 : $DEST"
echo "  별칭     : $ALIAS"
echo "  설정 파일: $PROPS"
echo ""

if [ -e "$DEST" ]; then
  echo "❌ 이미 파일이 있습니다: $DEST"
  echo "   덮어쓰면 기존 키가 사라져 **이 앱의 업데이트를 영영 올릴 수 없습니다.**"
  echo "   (Play 앱 서명을 쓰면 업로드 키는 재발급 가능하지만, 재발급 요청 절차가 필요합니다)"
  echo "   다른 경로를 지정하거나, 기존 키를 그대로 쓰세요."
  exit 1
fi

if grep -q "^GANGTALK_STORE_FILE=" "$PROPS" 2>/dev/null; then
  echo "❌ $PROPS 에 이미 GANGTALK_STORE_FILE 설정이 있습니다."
  echo "   기존 설정:"
  grep "^GANGTALK_" "$PROPS" | sed 's/PASSWORD=.*/PASSWORD=********/' | sed 's/^/     /'
  echo "   새 키를 만들려면 위 줄들을 먼저 지우거나 백업하세요."
  exit 1
fi

mkdir -p "$(dirname "$DEST")"

echo "▶ 키스토어를 만듭니다. keytool 이 아래를 물어봅니다."
echo "   · 키 저장소 비밀번호  — 잊으면 복구 불가. 비밀번호 관리자에 저장하세요"
echo "   · 이름/조직/도시/국가 — 아무거나 넣어도 되지만 국가 코드는 KR"
echo ""

keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore "$DEST" \
  -alias "$ALIAS" \
  -keyalg RSA -keysize 2048 \
  -validity 10000

echo ""
echo "✅ 키스토어 생성 완료: $DEST"
echo ""

# ── gradle.properties 설정 ────────────────────────────────
echo "▶ $PROPS 에 설정을 추가합니다."
echo "   방금 정한 키 저장소 비밀번호를 다시 입력해 주세요 (화면에 안 보입니다)."
printf "   비밀번호: "
read -rs PW
echo ""

# PKCS12 는 키 비밀번호가 저장소 비밀번호와 같다
mkdir -p "$(dirname "$PROPS")"
touch "$PROPS"
{
  echo ""
  echo "# 강톡 Play 업로드 키 (android/app/build.gradle 이 이 이름들을 읽는다)"
  echo "GANGTALK_STORE_FILE=$DEST"
  echo "GANGTALK_STORE_PASSWORD=$PW"
  echo "GANGTALK_KEY_ALIAS=$ALIAS"
  echo "GANGTALK_KEY_PASSWORD=$PW"
} >> "$PROPS"
chmod 600 "$PROPS"
unset PW

echo "✅ 설정 완료 (권한 600)"
echo ""

# ── SHA-256 지문 ─────────────────────────────────────────
echo "▶ Firebase App Check 에 넣을 SHA-256 지문입니다."
echo "   (비밀번호를 한 번 더 물어봅니다)"
echo ""
keytool -list -v -keystore "$DEST" -alias "$ALIAS" | grep "SHA256:" || true

cat <<'MSG'

═══════════════════════════════════════
다음 할 일

1) 키스토어를 안전한 곳에 백업하세요.
   이 파일을 잃으면 Play 에 업데이트를 올릴 수 없습니다.
   (비밀번호 관리자 / 외장 디스크 / 개인 클라우드 — 저장소에는 절대 넣지 말 것)

2) 위 SHA-256 을 Firebase Console 에 등록:
   Firebase Console → App Check → 앱 탭 → Android → Play Integrity
   → "SHA-256 인증서 디지털 지문" 에 추가

3) AAB 빌드:
   cd ~/GangTalk && npm run build:android

4) Play Console 첫 업로드 뒤에 **한 번 더** 할 일이 있습니다.
   Play 가 자체 앱 서명 키를 새로 만들기 때문에 지문이 2개가 됩니다.
   Play Console → 설정 → 앱 무결성 → 앱 서명 키 인증서 → SHA-256 복사
   → 같은 Firebase App Check 화면에 **추가로** 등록
   이걸 빼먹으면 스토어에서 받은 앱만 문자 인증이 안 됩니다.
═══════════════════════════════════════
MSG
