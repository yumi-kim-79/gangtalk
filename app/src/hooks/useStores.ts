import { useEffect, useMemo, useState } from 'react';
import { STORE_CATEGORIES } from '@/constants/stores';
import {
  buildTopSections,
  filterStores,
  mergeRoomsBiz,
  subscribeRoomsBiz,
  subscribeStoreTopRanks,
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
  const [ranks, setRanks] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubRanks = subscribeStoreTopRanks(setRanks);
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
      unsubRanks();
    };
  }, []);

  const merged: Store[] = useMemo(
    () => mergeRoomsBiz(rawStores, roomsBiz),
    [rawStores, roomsBiz],
  );

  const stores = useMemo(() => filterStores(merged, filter), [merged, filter]);

  /** 카테고리별 Top5 — 검색 중에는 목록에 집중하도록 숨긴다 */
  const topSections = useMemo(
    () =>
      filter.keyword.trim()
        ? []
        : buildTopSections(merged, ranks, STORE_CATEGORIES, {
            category: filter.category,
            region: filter.region,
            sort: filter.sort,
          }),
    [merged, ranks, filter.keyword, filter.category, filter.region, filter.sort],
  );

  return { stores, topSections, total: merged.length, loading, error };
}
