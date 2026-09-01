/** 인증 관련 상수 */

/** Cloud Functions 리전 — functions/index.js setGlobalOptions 와 일치해야 한다 */
export const FUNCTIONS_REGION = 'asia-northeast3';

/** 카카오 uid 접두사 (Cloud Function kakaoSignIn 과 동일 규칙) */
export const KAKAO_UID_PREFIX = 'kakao_';

export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 12;
export const PASSWORD_MIN = 6;

/**
 * 소셜 로그인 노출 스위치.
 *
 * 2026-09-01: 카카오/애플 로그인은 **구현만 해두고 노출하지 않는다**.
 * 현재 서비스는 기존과 동일하게 이메일 + 문자 인증만 사용한다.
 *
 * 활성화 방법:
 *   1. 이 값을 true 로 변경
 *   2. docs/앱-인증-설정가이드.md 의 3~4번(카카오/애플 콘솔) 수행
 *   3. Cloud Functions 배포 (kakaoSignIn)
 *
 * 관련 코드는 모두 보존되어 있다:
 *   - services/auth.ts : signInWithKakao / signInWithApple
 *   - functions/index.js : kakaoSignIn
 *   - App.tsx : initializeKakaoSDK
 */
export const SOCIAL_LOGIN_ENABLED = false;
