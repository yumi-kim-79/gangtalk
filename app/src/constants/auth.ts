/** 인증 관련 상수 */

/** Cloud Functions 리전 — functions/index.js setGlobalOptions 와 일치해야 한다 */
export const FUNCTIONS_REGION = 'asia-northeast3';

/** 카카오 uid 접두사 (Cloud Function kakaoSignIn 과 동일 규칙) */
export const KAKAO_UID_PREFIX = 'kakao_';

/* 웹과 반드시 같아야 하는 값들.
 * - 닉네임: web/src/services/authService.js:33-37  (2~20자)
 *   앱이 12자였을 때, 웹에서 13자 이상으로 만든 사용자는
 *   앱 프로필 수정 화면에서 입력이 잘려 저장 자체가 막혔다.
 * - 비밀번호: web/src/pages/AuthPage.vue:92,158  (minlength 8)
 *   앱이 6자였을 때, 웹 규칙을 통과 못 하는 계정이 앱에서 만들어졌다. */
export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 20;
/** 웹 web/src/constants/auth.js 와 같은 값이어야 한다 (화면마다 6/8 이 섞여 있었다) */
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
