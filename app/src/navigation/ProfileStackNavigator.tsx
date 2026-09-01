import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '@/navigation/types';
import ProfileScreen from '@/screens/ProfileScreen';
import ProfileEditScreen from '@/screens/ProfileEditScreen';
import FavoritesScreen from '@/screens/FavoritesScreen';
import MyPostsScreen from '@/screens/MyPostsScreen';
import BlockedUsersScreen from '@/screens/BlockedUsersScreen';
import DeleteAccountScreen from '@/screens/DeleteAccountScreen';
import { useTheme } from '@/theme';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  const c = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: c.fg,
        headerStyle: { backgroundColor: c.surface },
      }}
    >
      <Stack.Screen
        name="ProfileHome"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProfileEdit"
        component={ProfileEditScreen}
        options={{ title: '프로필 수정' }}
      />
      <Stack.Screen name="Favorites" component={FavoritesScreen} options={{ title: '찜한 업체' }} />
      <Stack.Screen name="MyPosts" component={MyPostsScreen} options={{ title: '내가 쓴 글' }} />
      <Stack.Screen
        name="BlockedUsers"
        component={BlockedUsersScreen}
        options={{ title: '차단 목록' }}
      />
      <Stack.Screen
        name="DeleteAccount"
        component={DeleteAccountScreen}
        options={{ title: '회원탈퇴' }}
      />
    </Stack.Navigator>
  );
}
