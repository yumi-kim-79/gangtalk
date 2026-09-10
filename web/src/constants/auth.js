/**
 * 가입·로그인 공통 규칙 — 웹 단일 출처.
 * 앱 대응: app/src/constants/auth.ts (같은 값이어야 한다)
 *
 * 예전에는 화면마다 8자/6자가 섞여 있었다. 앱에서 만든 6자 계정이 웹 가입 폼의
 * 기준에는 미달이라, 같은 서비스인데 규칙이 둘이었다.
 */
export const PASSWORD_MIN = 6
export const PASSWORD_HINT = `${PASSWORD_MIN}자 이상`
