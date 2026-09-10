#!/usr/bin/env bash
# 강톡 Play 업로드 키 준비 — 키스토어 + ~/.gradle/gradle.properties 설정.
#
#   ./scripts/android-make-upload-key.sh                    # 기본 경로
#   ./scripts/android-make-upload-key.sh ~/keys/my.keystore # 경로 지정
#
# 상태를 먼저 보고 필요한 것만 한다.
#   키스토어 없음 + 설정 없음 → 새로 만들고 설정까지
#   키스토어 있음 + 설정 없음 → 기존 키로 설정만 (덮어쓰지 않는다)
#   둘 다 있음               → 아무것도 안 하고 지문만 보여 준다
#
# 이 스크립트는 **맥 터미널에서** 실행한다 (키스토어는 개발 PC에만 둔다).
# 비밀번호는 인자로 받지 않는다 — 셸 히스토리에 남기지 않기 위해서다.
set -euo pipefail

DEST="${1:-$HOME/keys/gangtalk-upload.keystore}"
ALIAS="gangtalk"
PROPS="$HOME/.gradle/gradle.properties"

echo "🔑 강톡 Play 업로드 키 준비"
echo "═══════════════════════════════════════"
echo "  키스토어 : $DEST"
echo "  설정 파일: $PROPS"
echo ""

HAS_KEY=false;   [ -e "$DEST" ] && HAS_KEY=true
HAS_PROPS=false; grep -q "^GANGTALK_STORE_FILE=" "$PROPS" 2>/dev/null && HAS_PROPS=true

echo "  현재 상태: 키스토어 $([ "$HAS_KEY" = true ] && echo '있음' || echo '없음') / 설정 $([ "$HAS_PROPS" = true ] && echo '있음' || echo '없음')"
echo ""

show_fingerprint() {
  echo "▶ Firebase App Check 에 넣을 SHA-256 (비밀번호를 물어봅니다)"
  keytool -list -v -keystore "$DEST" -alias "$ALIAS" 2>/dev/null | grep "SHA256:" || {
    echo "   ⚠️  지문을 읽지 못했습니다. 별칭이 '$ALIAS' 가 맞는지 확인하세요:"
    echo "       keytool -list -keystore \"$DEST\""
  }
}

# ── 이미 다 되어 있는 경우 ────────────────────────────────
if [ "$HAS_KEY" = true ] && [ "$HAS_PROPS" = true ]; then
  echo "✅ 이미 준비되어 있습니다. 손대지 않습니다."
  echo ""
  echo "   설정된 값:"
  grep "^GANGTALK_" "$PROPS" | sed 's/PASSWORD=.*/PASSWORD=********/' | sed 's/^/     /'
  echo ""
  CONFIGURED="$(grep -m1 '^GANGTALK_STORE_FILE=' "$PROPS" | cut -d= -f2-)"
  if [ "$CONFIGURED" != "$DEST" ]; then
    echo "   ⚠️  설정된 키스토어 경로가 이 스크립트의 기본값과 다릅니다."
    echo "       설정: $CONFIGURED"
    echo "       기본: $DEST"
    echo "       빌드는 '설정' 쪽을 씁니다. 의도한 게 맞는지 확인하세요."
    DEST="$CONFIGURED"
  fi
  echo ""
  show_fingerprint
  echo ""
  echo "▶ 다음: cd ~/GangTalk && npm run build:android"
  exit 0
fi

# ── 키스토어 만들기 (없을 때만) ───────────────────────────
if [ "$HAS_KEY" = false ]; then
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
  echo "✅ 키스토어 생성: $DEST"
  echo ""
else
  echo "▶ 기존 키스토어를 그대로 씁니다 (덮어쓰지 않습니다)."
  echo "   $DEST"
  echo ""
fi

# ── gradle.properties 설정 ────────────────────────────────
echo "▶ $PROPS 에 설정을 추가합니다."
echo "   이 키스토어의 비밀번호를 입력해 주세요 (화면에 안 보입니다)."
printf "   비밀번호: "
read -rs PW
echo ""

# 입력한 비밀번호가 맞는지 먼저 확인한다.
# 틀린 값을 적어 두면 빌드가 한참 돌다가 서명 단계에서 실패한다.
if ! keytool -list -keystore "$DEST" -alias "$ALIAS" -storepass "$PW" >/dev/null 2>&1; then
  echo "❌ 비밀번호가 맞지 않거나 별칭 '$ALIAS' 가 없습니다. 설정을 쓰지 않고 중단합니다."
  echo "   키스토어 안의 별칭 확인:  keytool -list -keystore \"$DEST\""
  unset PW
  exit 1
fi
echo "   ✅ 비밀번호 확인됨"

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
show_fingerprint

cat <<'MSG'

═══════════════════════════════════════
다음 할 일

1) 키스토어를 안전한 곳에 백업하세요.
   이 파일을 잃으면 Play 에 업데이트를 올릴 수 없습니다.
   (비밀번호 관리자 / 외장 디스크 / 개인 클라우드 — 저장소에는 절대 넣지 말 것)

2) 위 SHA-256 이 Firebase 에 등록돼 있는지 확인:
   Firebase Console → App Check → 앱 탭 → Android → Play Integrity

3) AAB 빌드:
   cd ~/GangTalk && npm run build:android

4) Play Console 첫 업로드 뒤에 **한 번 더** 할 일이 있습니다.
   Play 가 자체 앱 서명 키를 새로 만들기 때문에 지문이 2개가 됩니다.
   Play Console → 설정 → 앱 무결성 → 앱 서명 키 인증서 → SHA-256 복사
   → 같은 Firebase App Check 화면에 **추가로** 등록
   이걸 빼먹으면 스토어에서 받은 앱만 문자 인증이 안 됩니다.
═══════════════════════════════════════
MSG
