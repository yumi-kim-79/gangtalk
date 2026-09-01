/** 강톡 공통 도메인 타입 (Firestore 스키마 기준, 점진적으로 확장) */

export type UserRole = 'platform' | 'biz' | null;

export interface AppUser {
  uid: string;
  email: string | null;
  nickname?: string;
  role?: UserRole;
  tier?: string;
  point?: number;
}

export interface Store {
  id: string;
  name: string;
  category?: string;
  address?: string;
  phone?: string;
  ownerId?: string;
  lat?: number;
  lng?: number;
}

export interface BoardPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  createdAt?: number;
}
