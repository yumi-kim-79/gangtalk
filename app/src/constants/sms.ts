/**
 * SMS 인증 실패 문구 — 웹 web/src/lib/smsMessages.js 와 **문안이 같아야 한다**.
 * 서버 reason 은 no_request / wrong_code / code_invalidated / expired 네 가지.
 */
export const SMS_VERIFY_FAIL_MESSAGE: Record<string, string> = {
  no_request: '해당 번호로 발송된 인증번호가 없습니다.\n먼저 "인증번호 발송"을 눌러 주세요.',
  wrong_code: '인증번호가 일치하지 않습니다.\n문자에 도착한 번호를 다시 확인해 주세요.',
  code_invalidated:
    '인증번호를 여러 번 잘못 입력해 무효화되었습니다.\n"인증번호 발송"부터 다시 진행해 주세요.',
  expired: '인증번호 입력 가능 시간(3분)이 지났습니다.\n"인증번호 발송"부터 다시 진행해 주세요.',
};

export const SMS_VERIFY_FAIL_DEFAULT = '인증에 실패했습니다.\n인증번호를 다시 확인해 주세요.';

export function smsVerifyFailMessage(reason?: string): string {
  return SMS_VERIFY_FAIL_MESSAGE[String(reason ?? '')] ?? SMS_VERIFY_FAIL_DEFAULT;
}
