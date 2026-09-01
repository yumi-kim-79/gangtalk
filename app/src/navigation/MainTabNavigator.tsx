import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '@/navigation/types';
import HomeScreen from '@/screens/HomeScreen';
import StoreListScreen from '@/screens/StoreListScreen';
import CommunityScreen from '@/screens/CommunityScreen';
import ChatListScreen from '@/screens/ChatListScreen';
import ProfileScreen from '@/screens/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: '홈' }} />
      <Tab.Screen
        name="Stores"
        component={StoreListScreen}
        options={{ title: '업체' }}
      />
      <Tab.Screen
        name="Community"
        component={CommunityScreen}
        options={{ title: '강톡' }}
      />
      <Tab.Screen
        name="Chats"
        component={ChatListScreen}
        options={{ title: '채팅' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: '마이' }}
      />
    </Tab.Navigator>
  );
}
