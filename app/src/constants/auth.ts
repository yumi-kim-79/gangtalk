/** 인증 관련 상수 */

/** Cloud Functions 리전 — functions/index.js setGlobalOptions 와 일치해야 한다 */
export const FUNCTIONS_REGION = 'asia-northeast3';

/** 카카오 uid 접두사 (Cloud Function kakaoSignIn 과 동일 규칙) */
export const KAKAO_UID_PREFIX = 'kakao_';

export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 12;
export const PASSWORD_MIN = 6;
