import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initializeKakaoSDK } from '@react-native-kakao/core';
import RootNavigator from '@/navigation/RootNavigator';
import { env } from '@/config/env';
import { initAppCheck } from '@/services/appCheck';
import { SOCIAL_LOGIN_ENABLED } from '@/constants/auth';

export default function App() {
  useEffect(() => {
    // 문자 인증 Cloud Function 이 App Check 를 강제한다 — 토큰 공급자를 먼저 세운다.
    // 이게 없으면 sendSmsCode/verifySmsCode 가 거부돼 회원가입이 막힌다.
    initAppCheck();

    // 카카오 로그인은 네이티브 앱 키로 SDK 초기화가 선행돼야 한다.
    // 현재는 SOCIAL_LOGIN_ENABLED=false 라 초기화하지 않는다.
    if (SOCIAL_LOGIN_ENABLED && env.kakaoAppKey) {
      initializeKakaoSDK(env.kakaoAppKey);
    }
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar barStyle="dark-content" />
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
