import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon, { type IconName } from '@/components/common/Icon';
import type { MainTabParamList } from '@/navigation/types';
import StoresStackNavigator from '@/navigation/StoresStackNavigator';
import CommunityStackNavigator from '@/navigation/CommunityStackNavigator';
import PartnersStackNavigator from '@/navigation/PartnersStackNavigator';
import ProfileStackNavigator from '@/navigation/ProfileStackNavigator';
import HomeScreen from '@/screens/HomeScreen';
import { fontSize, useTheme } from '@/theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

/** 탭 아이콘 컴포넌트를 렌더 밖에서 만들어 재마운트를 피한다 */
function tabIcon(name: IconName) {
  return function TabBarIcon({ color, size }: { color: string; size: number }) {
    return <Icon name={name} size={size} color={color} />;
  };
}

const HomeIcon = tabIcon('home');
const FindIcon = tabIcon('find');
const ChatIcon = tabIcon('chat');
const DealIcon = tabIcon('deal');
const UserIcon = tabIcon('user');

/** 라벨·아이콘·순서는 웹 components/BottomNav.vue 와 동일하게 맞춘다 */
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
        options={{ title: '현황판', tabBarIcon: HomeIcon }}
      />
      <Tab.Screen
        name="Stores"
        component={StoresStackNavigator}
        options={{ title: '가게찾기', tabBarIcon: FindIcon }}
      />
      <Tab.Screen
        name="Community"
        component={CommunityStackNavigator}
        options={{ title: '강톡', tabBarIcon: ChatIcon }}
      />
      <Tab.Screen
        name="Partners"
        component={PartnersStackNavigator}
        options={{ title: '제휴관', tabBarIcon: DealIcon }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{ title: '마이페이지', tabBarIcon: UserIcon }}
      />
    </Tab.Navigator>
  );
}
