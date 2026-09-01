/** partners 컬렉션 도메인 타입 */
export interface Partner {
  id: string;
  name: string;
  manager: string;
  region: string;
  address: string;
  category: string;
  categoryRaw: string;
  rating: number;
  thumb: string;
  link: string;
  tags: string[];
  /** 소개 (intro / desc / about / bio 폴백) */
  intro: string;
  /** 혜택·이벤트 문구 */
  benefits: string;
  favs: number;
  lat?: number;
  lng?: number;
}
