import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { PartnersStackParamList } from '@/navigation/types';
import PartnersScreen from '@/screens/PartnersScreen';
import PartnerDetailScreen from '@/screens/PartnerDetailScreen';
import { useTheme } from '@/theme';

const Stack = createNativeStackNavigator<PartnersStackParamList>();

export default function PartnersStackNavigator() {
  const c = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{ headerTintColor: c.fg, headerStyle: { backgroundColor: c.surface } }}
    >
      <Stack.Screen
        name="PartnerList"
        component={PartnersScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PartnerDetail"
        component={PartnerDetailScreen}
        options={{ title: '제휴업체' }}
      />
    </Stack.Navigator>
  );
}
