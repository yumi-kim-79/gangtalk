import type { NavigatorScreenParams } from '@react-navigation/native';

/** 하단 탭 */
export type MainTabParamList = {
  Home: undefined;
  Stores: undefined;
  Community: undefined;
  Chats: undefined;
  Profile: undefined;
};

/** 루트 스택 */
export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  StoreDetail: { storeId: string };
  PostDetail: { postId: string };
  ChatRoom: { roomId: string; roomType: 'open' | 'biz' | 'direct' };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
