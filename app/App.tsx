import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from '@/navigation/RootNavigator';
import { initAppCheck } from '@/services/appCheck';
import { initKakao } from '@/services/kakao';

export default function App() {
  useEffect(() => {
    // 문자 인증 Cloud Function 이 App Check 를 강제한다 — 토큰 공급자를 먼저 세운다.
    // 이게 없으면 sendSmsCode/verifySmsCode 가 거부돼 회원가입이 막힌다.
    initAppCheck();

    // 카카오 SDK — 초기화 여부는 services/kakao 가 단독으로 관리한다.
    // (초기화 안 된 상태에서 SDK 를 부르면 Android 는 네이티브에서 죽는다)
    initKakao();
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
