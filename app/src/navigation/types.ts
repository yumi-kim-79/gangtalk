import type { NavigatorScreenParams } from '@react-navigation/native';

/** 업체 탭 내부 스택 */
export type StoresStackParamList = {
  StoreList: undefined;
  StoreDetail: { storeId: string };
};

/** 채팅 탭 내부 스택 */
export type ChatStackParamList = {
  ChatList: undefined;
  ChatRoom: { roomId: string; title: string };
};

/** 로그인 모달 스택 */
export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

/** 강톡(게시판) 탭 내부 스택 */
export type CommunityStackParamList = {
  PostList: undefined;
  PostDetail: { postId: string };
  PostWrite: undefined;
};

/** 하단 탭 */
export type MainTabParamList = {
  Home: undefined;
  Stores: NavigatorScreenParams<StoresStackParamList>;
  Community: NavigatorScreenParams<CommunityStackParamList>;
  Chats: NavigatorScreenParams<ChatStackParamList>;
  Profile: undefined;
};

/** 루트 스택 */
export type RootStackParamList = {
  Splash: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  Auth: NavigatorScreenParams<AuthStackParamList>;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
