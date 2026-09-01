// src/utils/authErrors.js
export function humanizeAuthError(e) {
  const code = e?.code || ''
  const msg  = e?.message || String(e || '')

  // Firebase/백엔드 코드 매핑
  if (/email-already-in-use/i.test(code)) return '이미 가입된 이메일입니다.'
  if (/invalid-email/i.test(code)) return '이메일 형식이 올바르지 않습니다.'
  if (/weak-password/i.test(code)) return '비밀번호가 너무 약합니다. 8자 이상으로 입력하세요.'
  if (/wrong-password|invalid-credential/i.test(code)) return '이메일 또는 비밀번호가 올바르지 않습니다.'
  if (/user-not-found/i.test(code)) return '가입 이력이 없습니다. 회원가입을 진행해 주세요.'
  if (/operation-not-allowed/i.test(code)) return '현재 로그인/회원가입이 비활성화되어 있습니다.'

  // 런타임/개발 오류
  if (/is not a function/i.test(msg)) {
    return '내부 기능이 아직 연결되지 않았습니다. 잠시 후 다시 시도해 주세요.'
  }

  // 스토어에서 던진 한국어 메시지면 그대로 노출
  if (/[가-힣]/.test(msg)) return msg

  // 폴백
  if (code) return `오류(${code})가 발생했습니다. 잠시 후 다시 시도해 주세요.`
  return '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
}
