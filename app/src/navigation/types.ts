import type { NavigatorScreenParams } from '@react-navigation/native';

/** 업체 탭 내부 스택 */
export type StoresStackParamList = {
  StoreList: undefined;
  StoreDetail: { storeId: string };
};

/** 강톡(게시판) 탭 내부 스택 */
export type CommunityStackParamList = {
  PostList: undefined;
  PostDetail: { postId: string };
};

/** 하단 탭 */
export type MainTabParamList = {
  Home: undefined;
  Stores: NavigatorScreenParams<StoresStackParamList>;
  Community: NavigatorScreenParams<CommunityStackParamList>;
  Chats: undefined;
  Profile: undefined;
};

/** 루트 스택 */
export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  ChatRoom: { roomId: string; roomType: 'open' | 'biz' | 'direct' };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
