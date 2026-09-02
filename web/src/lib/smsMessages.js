/**
 * SMS 인증 실패 문구 — 웹·앱 공통 문안.
 *
 * 서버(functions/index.js verifySmsCode)가 돌려주는 reason 은 네 가지뿐이다.
 *   no_request        발송 기록 없음
 *   wrong_code        번호 불일치 (아직 재시도 가능)
 *   code_invalidated  5회 실패로 코드 무효화 → 반드시 재발송
 *   expired           발송 후 3분 경과
 *
 * 이 표를 나눠 두면 화면마다 안내가 달라진다. 실제로 그랬다.
 *   - AuthPage 는 code_invalidated 를 안 다뤄서 "다시 확인하세요"로 오안내했다
 *     (재확인이 아니라 재발송이 필요한 상태다)
 *   - BizSignupPage 는 서버가 보내지도 않는 'mismatch' 를 다루고 wrong_code 를 빠뜨렸다
 * 앱(app/src/constants/sms.ts)도 같은 문안을 쓴다.
 */
export const SMS_VERIFY_FAIL_MESSAGE = {
  no_request:
    '해당 번호로 발송된 인증번호가 없습니다.\n먼저 "인증번호 발송"을 눌러 주세요.',
  wrong_code:
    '인증번호가 일치하지 않습니다.\n문자에 도착한 번호를 다시 확인해 주세요.',
  code_invalidated:
    '인증번호를 여러 번 잘못 입력해 무효화되었습니다.\n"인증번호 발송"부터 다시 진행해 주세요.',
  expired:
    '인증번호 입력 가능 시간(3분)이 지났습니다.\n"인증번호 발송"부터 다시 진행해 주세요.',
}

export const SMS_VERIFY_FAIL_DEFAULT =
  '인증에 실패했습니다.\n인증번호를 다시 확인해 주세요.'

export function smsVerifyFailMessage(reason) {
  return SMS_VERIFY_FAIL_MESSAGE[String(reason || '')] || SMS_VERIFY_FAIL_DEFAULT
}
