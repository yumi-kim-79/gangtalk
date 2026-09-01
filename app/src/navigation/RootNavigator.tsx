import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useAuth } from '@/hooks/useAuth';
import AuthStackNavigator from '@/navigation/AuthStackNavigator';
import MainTabNavigator from '@/navigation/MainTabNavigator';
import SplashScreen from '@/screens/SplashScreen';
import DiaryScreen from '@/screens/DiaryScreen';
import SupportScreen from '@/screens/SupportScreen';
import { useTheme } from '@/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { initializing } = useAuth();
  const c = useTheme();

  if (initializing) return <SplashScreen />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      {/* 로그인은 어디서든 모달로 띄운다 — 탭을 벗어나지 않아 흐름이 끊기지 않는다 */}
      <Stack.Screen
        name="Auth"
        component={AuthStackNavigator}
        options={{ presentation: 'modal' }}
      />

      {/* 헤더 햄버거 메뉴 — 웹 AppHeader 의 드롭다운과 같은 항목 */}
      <Stack.Screen
        name="Diary"
        component={DiaryScreen}
        options={{
          headerShown: true,
          title: '일정/달력',
          headerTintColor: c.fg,
          headerStyle: { backgroundColor: c.surface },
        }}
      />
      <Stack.Screen
        name="Support"
        component={SupportScreen}
        options={{
          headerShown: true,
          title: '고객센터',
          headerTintColor: c.fg,
          headerStyle: { backgroundColor: c.surface },
        }}
      />
    </Stack.Navigator>
  );
}
