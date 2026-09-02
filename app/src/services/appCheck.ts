/**
 * App Check 초기화.
 *
 * 문자 인증 Cloud Function 두 개가 App Check 를 **강제**한다:
 *   functions/index.js  sendSmsCode   onCall({ enforceAppCheck: true })
 *   functions/index.js  verifySmsCode onCall({ enforceAppCheck: true })
 *
 * 앱이 App Check 토큰을 붙이지 않으면 두 호출이 모두 거부돼
 * **회원가입 자체가 불가능**하다 (소셜 로그인은 비활성 상태라 이메일+문자가 유일 경로).
 * 이 파일이 그 토큰 공급자를 세운다.
 *
 * ── 콘솔에서 해야 하는 일 ────────────────────────────────
 *  1) Firebase Console > App Check > 앱 등록
 *     - iOS   : App Attest (실기기 전용) — 시뮬레이터는 지원 안 함 → 디버그 토큰 필요
 *     - Android: Play Integrity
 *  2) 시뮬레이터/에뮬레이터에서 돌릴 때는 첫 실행 로그에 찍히는 디버그 토큰을
 *     Console > App Check > 앱 > "디버그 토큰 관리" 에 등록
 *     (또는 .env 의 APPCHECK_DEBUG_TOKEN 에 미리 발급한 토큰을 넣어 고정)
 * ────────────────────────────────────────────────────────
 */
import { initializeAppCheck } from '@react-native-firebase/app-check';
import { env } from '@/config/env';
import { app } from '@/services/firebase';

let started = false;

/**
 * 앱 시작 시 1회 호출. 실패해도 앱은 계속 뜬다
 * (App Check 가 없으면 문자 인증만 막히고 나머지 기능은 동작한다).
 */
export async function initAppCheck(): Promise<void> {
  if (started) return;
  started = true;

  const debugToken = env.appCheckDebugToken || undefined;

  // RNFirebase 런타임은 provider 의 `providerOptions.{android,apple}` 만 읽는다
  // (dist/module/namespaced.js: configureProvider). 클래스 인스턴스 대신
  // 옵션 객체를 그대로 넘기는 형태가 타입/런타임 모두에서 유효하다.
  const providerOptions = {
    // 개발 빌드는 debug 공급자 — 시뮬레이터/에뮬레이터는 기기 무결성 검사를 통과할 수 없다
    android: {
      provider: env.isDev ? 'debug' : 'playIntegrity',
      debugToken,
    },
    apple: {
      // 배포 타깃이 iOS 15.1 이라 App Attest(iOS 14+)로 전 사용자가 커버된다.
      // DeviceCheck 폴백을 쓰면 Firebase 콘솔에 Apple 개발자 .p8 키를 올려야 하는데
      // 대상 기기가 없으므로 불필요하다.
      provider: env.isDev ? 'debug' : 'appAttest',
      debugToken,
    },
    isTokenAutoRefreshEnabled: true,
  } as const;

  try {
    await initializeAppCheck(app, {
      provider: { providerOptions },
      isTokenAutoRefreshEnabled: true,
    });
  } catch (e) {
    // 초기화 실패를 삼키되 로그는 남긴다 — 문자 인증 실패의 원인이 여기일 수 있다
    console.warn(
      '[AppCheck] 초기화 실패:',
      e instanceof Error ? e.message : e,
      '\n문자 인증(sendSmsCode/verifySmsCode)이 거부될 수 있습니다.',
    );
  }
}
