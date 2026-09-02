import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  subscribeMyFavoriteIds,
  toggleFavorite,
  togglePartnerFavorite,
} from '@/services/favorites';
import { useRequireAuth } from '@/hooks/useRequireAuth';

/**
 * 내가 찜한 대상 집합 + 토글.
 *
 * 목록 화면(현황판·가게찾기·제휴관)에서 카드마다 개별 조회하면 요청이 N배로
 * 늘어난다. 한 번만 구독해 두고 카드는 집합만 참조한다.
 * 웹 MainPage 의 favSet / isFav(s) 와 같은 역할.
 */
export function useMyFavorites() {
  const { uid, requireAuth } = useRequireAuth();
  const [storeIds, setStoreIds] = useState<Set<string>>(new Set());
  const [partnerIds, setPartnerIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!uid) {
      setStoreIds(new Set());
      setPartnerIds(new Set());
      return;
    }
    return subscribeMyFavoriteIds(uid, ids => {
      setStoreIds(ids.store);
      setPartnerIds(ids.partner);
    });
  }, [uid]);

  const isStoreFav = useCallback((id: string) => storeIds.has(id), [storeIds]);
  const isPartnerFav = useCallback((id: string) => partnerIds.has(id), [partnerIds]);

  /* 구독이 결과를 되돌려 주므로 낙관적 갱신은 하지 않는다 — 스냅샷이 곧 정답 */
  const toggleStore = useCallback(
    async (storeId: string) => {
      const me = requireAuth();
      if (!me) return;
      await toggleFavorite(me, storeId).catch(() => {});
    },
    [requireAuth],
  );

  const togglePartner = useCallback(
    async (partnerId: string) => {
      const me = requireAuth();
      if (!me) return;
      await togglePartnerFavorite(me, partnerId).catch(() => {});
    },
    [requireAuth],
  );

  return useMemo(
    () => ({ storeIds, partnerIds, isStoreFav, isPartnerFav, toggleStore, togglePartner }),
    [storeIds, partnerIds, isStoreFav, isPartnerFav, toggleStore, togglePartner],
  );
}
