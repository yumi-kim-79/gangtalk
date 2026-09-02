/**
 * 초대 문구 — 웹·앱 공통.
 * 앱 쪽 대응: app/src/constants/invite.ts (문안·URL 형식이 같아야 한다)
 *
 * 이전에는 두 문구가 달랐다.
 *   웹  "강남톡방 초대 링크입니다 / 추천코드 / 가입 링크"  — 리워드 언급 없음
 *   앱  "가입하면 서로 20,000P 를 받아요"
 * 링크도 웹은 `/auth?ref=` 라 로그인 화면으로 떨어졌다. 가입 화면으로 바로
 * 가는 `?mode=signup&ref=` 가 맞다 (AuthPage.vue:305 이 mode 를 읽는다).
 */
export const REFERRAL_REWARD_POINT = 20000

export function inviteUrl(code, base) {
  const origin =
    base ||
    (typeof window !== 'undefined' && window.location?.origin) ||
    'https://gangtox.com'
  return `${String(origin).replace(/\/+$/, '')}/auth?mode=signup&ref=${encodeURIComponent(code)}`
}

export function inviteMessage(code, base) {
  return [
    '강남톡방에 초대합니다!',
    `제 추천코드 ${code} 로 가입하면 서로 ${REFERRAL_REWARD_POINT.toLocaleString('ko-KR')}P 를 받아요.`,
    inviteUrl(code, base),
  ].join('\n')
}

/** 리워드 금액 표기 — 웹은 '12,000 원'(띄어쓰기), 앱은 '12,000원' 이었다. 앱 표기로 통일 */
export function rewardWon(n = 0) {
  return `${Math.floor(Number(n) || 0).toLocaleString('ko-KR')}원`
}
