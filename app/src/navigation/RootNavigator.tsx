import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useAuth } from '@/hooks/useAuth';
import AuthStackNavigator from '@/navigation/AuthStackNavigator';
import MainTabNavigator from '@/navigation/MainTabNavigator';
import SplashScreen from '@/screens/SplashScreen';
import DiaryScreen from '@/screens/DiaryScreen';
import SupportScreen from '@/screens/SupportScreen';
import FavoritesScreen from '@/screens/FavoritesScreen';
import LegalScreen from '@/screens/LegalScreen';
import TiersScreen from '@/screens/TiersScreen';
import { useTheme } from '@/theme';

/** id 를 붙여야 중첩 스택 안에서도 getParent('Root') 로 확실히 루트를 잡을 수 있다 */
const Stack = createNativeStackNavigator<RootStackParamList, 'Root'>();

export default function RootNavigator() {
  const { initializing } = useAuth();
  const c = useTheme();

  if (initializing) return <SplashScreen />;

  return (
    <Stack.Navigator id="Root" screenOptions={{ headerShown: false }}>
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
      <Stack.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          headerShown: true,
          title: '찜한 업체',
          headerTintColor: c.fg,
          headerStyle: { backgroundColor: c.surface },
        }}
      />

      <Stack.Screen
        name="Tiers"
        component={TiersScreen}
        options={{
          headerShown: true,
          title: '회원 등급 · 포인트',
          headerTintColor: c.fg,
          headerStyle: { backgroundColor: c.surface },
        }}
      />

      {/* 이용약관 / 개인정보처리방침 — 웹으로 내보내지 않고 앱 안에서 연다 */}
      <Stack.Screen
        name="Legal"
        component={LegalScreen}
        options={({ route }) => ({
          headerShown: true,
          title: route.params?.kind === 'terms' ? '이용약관' : '개인정보처리방침',
          headerTintColor: c.fg,
          headerStyle: { backgroundColor: c.surface },
        })}
      />
    </Stack.Navigator>
  );
}
