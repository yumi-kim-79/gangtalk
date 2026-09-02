import { useEffect, useState } from 'react';
import { subscribeBanners, type Banner, type BannerKind } from '@/services/banners';

/** 마케팅 배너 구독 훅. ready 는 첫 응답이 온 뒤 true (스켈레톤 종료용) */
export function useBanners(kind: BannerKind) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setBanners([]);
    setReady(false);
    return subscribeBanners(kind, setBanners, () => setReady(true));
  }, [kind]);

  return { banners, ready };
}
