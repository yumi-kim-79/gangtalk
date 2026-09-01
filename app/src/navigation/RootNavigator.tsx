import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useAuth } from '@/hooks/useAuth';
import AuthStackNavigator from '@/navigation/AuthStackNavigator';
import MainTabNavigator from '@/navigation/MainTabNavigator';
import SplashScreen from '@/screens/SplashScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { initializing } = useAuth();

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
    </Stack.Navigator>
  );
}
