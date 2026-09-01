import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon, { type IconName } from '@/components/common/Icon';
import type { MainTabParamList } from '@/navigation/types';
import StoresStackNavigator from '@/navigation/StoresStackNavigator';
import HomeScreen from '@/screens/HomeScreen';
import CommunityStackNavigator from '@/navigation/CommunityStackNavigator';
import ChatStackNavigator from '@/navigation/ChatStackNavigator';
import ProfileStackNavigator from '@/navigation/ProfileStackNavigator';
import { fontSize, useTheme } from '@/theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

/** 탭 아이콘 컴포넌트를 렌더 밖에서 만들어 재마운트를 피한다 */
function tabIcon(name: IconName) {
  return function TabBarIcon({ color, size }: { color: string; size: number }) {
    return <Icon name={name} size={size} color={color} />;
  };
}

const HomeIcon = tabIcon('home');
const StoreIcon = tabIcon('store');
const BoardIcon = tabIcon('board');
const ChatIcon = tabIcon('chat');
const UserIcon = tabIcon('user');

export default function MainTabNavigator() {
  const c = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.line },
        tabBarLabelStyle: { fontSize: fontSize.xs },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: '홈', tabBarIcon: HomeIcon }}
      />
      <Tab.Screen
        name="Stores"
        component={StoresStackNavigator}
        options={{ title: '업체', tabBarIcon: StoreIcon }}
      />
      <Tab.Screen
        name="Community"
        component={CommunityStackNavigator}
        options={{ title: '강톡', tabBarIcon: BoardIcon }}
      />
      <Tab.Screen
        name="Chats"
        component={ChatStackNavigator}
        options={{ title: '채팅', tabBarIcon: ChatIcon }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{ title: '마이', tabBarIcon: UserIcon }}
      />
    </Tab.Navigator>
  );
}
