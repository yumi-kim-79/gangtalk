import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { StoresStackParamList } from '@/navigation/types';
import StoreListScreen from '@/screens/StoreListScreen';
import StoreDetailScreen from '@/screens/StoreDetailScreen';
import ChotokScreen from '@/screens/ChotokScreen';
import { useTheme } from '@/theme';

const Stack = createNativeStackNavigator<StoresStackParamList>();

export default function StoresStackNavigator() {
  const c = useTheme();
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="StoreList"
        component={StoreListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="StoreDetail"
        component={StoreDetailScreen}
        options={{
          title: '업체 상세',
          headerTintColor: c.fg,
          headerStyle: { backgroundColor: c.surface },
        }}
      />
      <Stack.Screen
        name="Chotok"
        component={ChotokScreen}
        options={({ route }) => ({
          title: `${route.params.storeName} 초톡방`,
          headerTintColor: c.fg,
          headerStyle: { backgroundColor: c.surface },
        })}
      />
    </Stack.Navigator>
  );
}
