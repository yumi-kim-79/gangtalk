import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { CommunityStackParamList } from '@/navigation/types';
import CommunityScreen from '@/screens/CommunityScreen';
import PostDetailScreen from '@/screens/PostDetailScreen';
import PostWriteScreen from '@/screens/PostWriteScreen';
import ChatListScreen from '@/screens/ChatListScreen';
import ChatRoomScreen from '@/screens/ChatRoomScreen';
import { useTheme } from '@/theme';

const Stack = createNativeStackNavigator<CommunityStackParamList>();

/**
 * 강톡 탭 — 게시판 + 채팅.
 * 웹도 GangTalkPage 한 화면에서 게시판과 채팅을 함께 다루므로 같은 스택에 둔다.
 */
export default function CommunityStackNavigator() {
  const c = useTheme();
  const header = { headerTintColor: c.fg, headerStyle: { backgroundColor: c.surface } };

  return (
    <Stack.Navigator screenOptions={header}>
      <Stack.Screen name="PostList" component={CommunityScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ title: '게시글' }} />
      <Stack.Screen name="PostWrite" component={PostWriteScreen} options={{ title: '글쓰기' }} />
      <Stack.Screen name="ChatList" component={ChatListScreen} options={{ title: '채팅방' }} />
      <Stack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={({ route }) => ({ title: route.params.title })}
      />
    </Stack.Navigator>
  );
}
