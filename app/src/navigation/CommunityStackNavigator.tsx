import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { CommunityStackParamList } from '@/navigation/types';
import CommunityScreen from '@/screens/CommunityScreen';
import PostDetailScreen from '@/screens/PostDetailScreen';
import { useTheme } from '@/theme';

const Stack = createNativeStackNavigator<CommunityStackParamList>();

export default function CommunityStackNavigator() {
  const c = useTheme();
  return (
    <Stack.Navigator>
      <Stack.Screen name="PostList" component={CommunityScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="PostDetail"
        component={PostDetailScreen}
        options={{
          title: '게시글',
          headerTintColor: c.fg,
          headerStyle: { backgroundColor: c.surface },
        }}
      />
    </Stack.Navigator>
  );
}
