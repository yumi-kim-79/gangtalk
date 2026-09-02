import type { NavigatorScreenParams } from '@react-navigation/native';

/** 업체 탭 내부 스택 */
export type StoresStackParamList = {
  StoreList: undefined;
  StoreDetail: { storeId: string };
  /** 초톡방 — 업체가 붙여넣은 카톡 내용 보기 */
  Chotok: { storeId: string; storeName: string };
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
  /** 차단 목록 (Apple 심사지침 1.2) */
  BlockedUsers: undefined;
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
  /** 헤더 햄버거 메뉴 — 어느 탭에서든 열린다 */
  Diary: undefined;
  Support: undefined;
  /**
   * 즐겨찾기.
   * 마이 탭 안(`ProfileStack.Favorites`)에도 같은 화면이 있지만,
   * 헤더 메뉴에서는 **루트 스택**으로 띄운다.
   * 탭 안으로 밀어 넣으면 그 탭의 스택 상태로 남아
   * 나중에 마이페이지 탭을 눌렀을 때 찜한 업체가 먼저 뜬다.
   */
  Favorites: undefined;
  /** 이용약관 / 개인정보처리방침 — 스토어 심사상 앱 안에서 열려야 한다 */
  Legal: { kind: 'terms' | 'privacy' };
  /** 등급표 + 포인트 적립 기준 (웹 TierTable / PointRuleModal) */
  Tiers: { points: number };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
