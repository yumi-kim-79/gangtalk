import type { NavigatorScreenParams } from '@react-navigation/native';

/** 업체 탭 내부 스택 */
export type StoresStackParamList = {
  StoreList: undefined;
  StoreDetail: { storeId: string };
};

/** 하단 탭 */
export type MainTabParamList = {
  Home: undefined;
  Stores: NavigatorScreenParams<StoresStackParamList>;
  Community: undefined;
  Chats: undefined;
  Profile: undefined;
};

/** 루트 스택 */
export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  PostDetail: { postId: string };
  ChatRoom: { roomId: string; roomType: 'open' | 'biz' | 'direct' };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
