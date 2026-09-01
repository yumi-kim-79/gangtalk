import { useEffect, useMemo, useState } from 'react';
import {
  filterStores,
  mergeRoomsBiz,
  subscribeRoomsBiz,
  subscribeStores,
  type StoreFilter,
} from '@/services/stores';
import type { RoomsBizDoc, Store, StoreDoc } from '@/types/store';

/**
 * stores + rooms_biz 두 컬렉션을 동시에 구독해 병합한 목록을 돌려준다.
 * 필터·정렬은 메모이즈해 스크롤 중 재계산을 피한다.
 */
export function useStores(filter: StoreFilter) {
  const [rawStores, setRawStores] = useState<StoreDoc[]>([]);
  const [roomsBiz, setRoomsBiz] = useState<Map<string, RoomsBizDoc>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubStores = subscribeStores(
      rows => {
        setRawStores(rows);
        setLoading(false);
      },
      e => {
        setError(e instanceof Error ? e.message : '업체 목록을 불러오지 못했습니다.');
        setLoading(false);
      },
    );
    const unsubRooms = subscribeRoomsBiz(setRoomsBiz);
    return () => {
      unsubStores();
      unsubRooms();
    };
  }, []);

  const merged: Store[] = useMemo(
    () => mergeRoomsBiz(rawStores, roomsBiz),
    [rawStores, roomsBiz],
  );

  const stores = useMemo(() => filterStores(merged, filter), [merged, filter]);

  return { stores, total: merged.length, loading, error };
}
