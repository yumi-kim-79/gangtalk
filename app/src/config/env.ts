/**
 * 환경변수 단일 진입점.
 * 화면·서비스에서 react-native-config 를 직접 import 하지 않는다.
 */
import Config from 'react-native-config';

export const env = {
  /** 웹 관리자 도메인 (앱에서는 링크로만 사용) */
  adminWebUrl: Config.ADMIN_WEB_URL ?? 'https://gangtalk815.com',
  /** 회원 웹 도메인 — 공유 링크 생성용 */
  webUrl: Config.WEB_URL ?? 'https://gangtox.com',
  /** 지도 API 키 (Android/iOS 별도 발급) */
  mapsApiKey: Config.MAPS_API_KEY ?? '',
  /** 카카오 네이티브 앱 키 — 카카오 개발자 콘솔 > 앱 키 */
  kakaoAppKey: Config.KAKAO_APP_KEY ?? '',
  isDev: __DEV__,
} as const;
