import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initializeKakaoSDK } from '@react-native-kakao/core';
import RootNavigator from '@/navigation/RootNavigator';
import { env } from '@/config/env';
import { SOCIAL_LOGIN_ENABLED } from '@/constants/auth';

export default function App() {
  useEffect(() => {
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
