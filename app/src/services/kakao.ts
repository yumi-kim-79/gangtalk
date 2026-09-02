/**
 * 카카오 SDK 초기화 상태를 한 곳에서 관리한다.
 *
 * 왜 필요한가 (2026-09-02, Android 로그아웃 시 앱 종료):
 *   @react-native-kakao/user 의 네이티브 구현은 `UserApiClient.instance` 를 쓰는데,
 *   SDK 가 초기화되지 않았으면 이 getter 가 IllegalStateException 을 던진다.
 *   그 throw 가 `onMain { }` 블록 **안에서** 발생해 promise reject 가 아니라
 *   uncaught native exception 이 되고, **JS 의 try/catch 로 잡히지 않아 앱이 죽는다.**
 *   (iOS 는 promise 를 reject 해서 try/catch 로 잡히므로 증상이 안 보였다)
 *
 *   현재 SOCIAL_LOGIN_ENABLED=false 라 App.tsx 가 SDK 를 초기화하지 않는데,
 *   signOut() 은 조건 없이 kakaoLogout() 을 부르고 있었다.
 *
 *   초기화 여부를 App.tsx 와 auth.ts 두 곳에서 각자 판단하면 언젠가 또 어긋난다.
 *   그래서 이 모듈이 "초기화했는가" 를 유일한 근거로 들고 있는다.
 */
import { initializeKakaoSDK } from '@react-native-kakao/core';
import { logout as kakaoLogout } from '@react-native-kakao/user';
import { env } from '@/config/env';
import { SOCIAL_LOGIN_ENABLED } from '@/constants/auth';

let initialized = false;

/** 앱 시작 시 1회. 소셜 로그인이 꺼져 있거나 앱 키가 없으면 아무것도 하지 않는다 */
export function initKakao(): void {
  if (initialized) return;
  if (!SOCIAL_LOGIN_ENABLED || !env.kakaoAppKey) return;
  try {
    initializeKakaoSDK(env.kakaoAppKey);
    initialized = true;
  } catch (e) {
    console.warn('[Kakao] SDK 초기화 실패:', e instanceof Error ? e.message : e);
  }
}

/** 카카오 SDK 를 호출해도 되는 상태인가 */
export function isKakaoReady(): boolean {
  return initialized;
}

/**
 * 로그아웃. 초기화되지 않았으면 **호출 자체를 하지 않는다.**
 * 네이티브가 죽는 경로라 try/catch 로는 막을 수 없다.
 */
export async function safeKakaoLogout(): Promise<void> {
  if (!initialized) return;
  try {
    await kakaoLogout();
  } catch {
    // 카카오로 로그인한 사용자가 아니면 실패한다 — 무시
  }
}
