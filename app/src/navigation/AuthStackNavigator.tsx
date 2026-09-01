import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/types';
import LoginScreen from '@/screens/LoginScreen';
import SignupScreen from '@/screens/SignupScreen';
import { useTheme } from '@/theme';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStackNavigator() {
  const c = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: c.fg,
        headerStyle: { backgroundColor: c.surface },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: '로그인' }} />
      <Stack.Screen name="Signup" component={SignupScreen} options={{ title: '회원가입' }} />
    </Stack.Navigator>
  );
}
