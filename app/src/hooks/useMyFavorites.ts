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
 *
 * 낙관적 반영(pending)을 둔다 — 스냅샷이 돌아오기까지 수백 ms 가 걸려
 * "눌러도 바로 체크가 안 된다" 로 보였기 때문이다.
 * 실패하면 원래대로 되돌리고 **에러를 던진다**. 조용히 삼키면
 * 왜 안 되는지 알 방법이 없다.
 */
export function useMyFavorites() {
  const { uid, requireAuth } = useRequireAuth();
  const [storeIds, setStoreIds] = useState<Set<string>>(new Set());
  const [partnerIds, setPartnerIds] = useState<Set<string>>(new Set());
  /** 서버 응답 전 임시 상태 — id → 찜 여부 */
  const [pending, setPending] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!uid) {
      setStoreIds(new Set());
      setPartnerIds(new Set());
      setPending({});
      return;
    }
    return subscribeMyFavoriteIds(uid, ids => {
      setStoreIds(ids.store);
      setPartnerIds(ids.partner);
      // 스냅샷이 도착하면 임시 상태는 버린다 (스냅샷이 정답)
      setPending({});
    });
  }, [uid]);

  const isStoreFav = useCallback(
    (id: string) => (id in pending ? pending[id] : storeIds.has(id)),
    [pending, storeIds],
  );
  const isPartnerFav = useCallback(
    (id: string) => (id in pending ? pending[id] : partnerIds.has(id)),
    [pending, partnerIds],
  );

  const run = useCallback(
    async (id: string, cur: boolean, fn: (me: string) => Promise<unknown>) => {
      const me = requireAuth();
      if (!me) return;
      setPending(p => ({ ...p, [id]: !cur }));
      try {
        await fn(me);
      } catch (e) {
        setPending(p => {
          const next = { ...p };
          delete next[id];
          return next;
        });
        throw e;
      }
    },
    [requireAuth],
  );

  const toggleStore = useCallback(
    (storeId: string) =>
      run(storeId, storeIds.has(storeId), me =>
        // 현재 상태를 넘겨 조회를 건너뛴다 (없는 문서 get 이 거부되는 문제 회피)
        toggleFavorite(me, storeId, storeIds.has(storeId)),
      ),
    [run, storeIds],
  );

  const togglePartner = useCallback(
    (partnerId: string) =>
      run(partnerId, partnerIds.has(partnerId), me =>
        togglePartnerFavorite(me, partnerId, partnerIds.has(partnerId)),
      ),
    [run, partnerIds],
  );

  return useMemo(
    () => ({ storeIds, partnerIds, isStoreFav, isPartnerFav, toggleStore, togglePartner }),
    [storeIds, partnerIds, isStoreFav, isPartnerFav, toggleStore, togglePartner],
  );
}
