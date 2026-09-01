import type { NavigatorScreenParams } from '@react-navigation/native';

/** 업체 탭 내부 스택 */
export type StoresStackParamList = {
  StoreList: undefined;
  StoreDetail: { storeId: string };
};

/** 제휴관 탭 내부 스택 */
export type PartnersStackParamList = {
  PartnerList: undefined;
  PartnerDetail: { partnerId: string };
};

/** 마이 탭 내부 스택 */
export type ProfileStackParamList = {
  ProfileHome: undefined;
  ProfileEdit: undefined;
  Favorites: undefined;
  MyPosts: undefined;
  DeleteAccount: undefined;
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
  ChatList: undefined;
  ChatRoom: { roomId: string; title: string };
};

/** 하단 탭 */
export type MainTabParamList = {
  /** 현황판 (웹 /dashboard) */
  Home: undefined;
  /** 가게찾기 (웹 /find) */
  Stores: NavigatorScreenParams<StoresStackParamList>;
  /** 강톡 — 게시판 + 채팅 (웹 /gangtalk) */
  Community: NavigatorScreenParams<CommunityStackParamList>;
  /** 제휴관 (웹 /partners) */
  Partners: NavigatorScreenParams<PartnersStackParamList>;
  /** 마이페이지 (웹 /mypage) */
  Profile: NavigatorScreenParams<ProfileStackParamList>;
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
