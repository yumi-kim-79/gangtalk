import { useCallback, useEffect, useState } from 'react';
import { fetchMyRating, isFavorited, rateStore, toggleFavorite } from '@/services/favorites';
import { useRequireAuth } from '@/hooks/useRequireAuth';

/** 업체 상세의 찜 / 내 별점 상태 */
export function useFavorite(storeId: string) {
  const { uid, requireAuth } = useRequireAuth();
  const [favorited, setFavorited] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!uid) {
      setFavorited(false);
      setMyRating(0);
      return;
    }
    let alive = true;
    isFavorited(uid, storeId)
      .then(v => alive && setFavorited(v))
      .catch(() => {});
    fetchMyRating(uid, storeId)
      .then(v => alive && setMyRating(v))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [uid, storeId]);

  const toggle = useCallback(async () => {
    const me = requireAuth();
    if (!me || busy) return;
    setBusy(true);
    // 낙관적 반영 후 실패 시 되돌린다
    const prev = favorited;
    setFavorited(!prev);
    try {
      const next = await toggleFavorite(me, storeId);
      setFavorited(next);
    } catch {
      setFavorited(prev);
    } finally {
      setBusy(false);
    }
  }, [requireAuth, busy, favorited, storeId]);

  const rate = useCallback(
    async (score: number) => {
      const me = requireAuth();
      if (!me || busy) return;
      const prev = myRating;
      const next = score === myRating ? 0 : score;
      setMyRating(next);
      setBusy(true);
      try {
        await rateStore(me, storeId, next);
      } catch {
        setMyRating(prev);
      } finally {
        setBusy(false);
      }
    },
    [requireAuth, busy, myRating, storeId],
  );

  return { favorited, myRating, toggle, rate, busy };
}
