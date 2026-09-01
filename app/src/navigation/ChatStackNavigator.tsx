import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ChatStackParamList } from '@/navigation/types';
import ChatListScreen from '@/screens/ChatListScreen';
import ChatRoomScreen from '@/screens/ChatRoomScreen';
import { useTheme } from '@/theme';

const Stack = createNativeStackNavigator<ChatStackParamList>();

export default function ChatStackNavigator() {
  const c = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: c.fg,
        headerStyle: { backgroundColor: c.surface },
      }}
    >
      <Stack.Screen name="ChatList" component={ChatListScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={({ route }) => ({ title: route.params.title })}
      />
    </Stack.Navigator>
  );
}
