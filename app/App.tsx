import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initializeKakaoSDK } from '@react-native-kakao/core';
import RootNavigator from '@/navigation/RootNavigator';
import { env } from '@/config/env';

export default function App() {
  useEffect(() => {
    // 카카오 로그인은 네이티브 앱 키로 SDK 초기화가 선행돼야 한다
    if (env.kakaoAppKey) {
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
