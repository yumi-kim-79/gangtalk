import { useCallback, useEffect, useMemo, useState } from 'react';
import { STORE_CATEGORIES } from '@/constants/stores';
import {
  EMPTY_STORE_MARKETING,
  applyListOrder,
  buildTopSections,
  filterStores,
  mergeRoomsBiz,
  subscribeRoomsBiz,
  subscribeStoreMarketing,
  subscribeStores,
  type StoreFilter,
  type StoreMarketing,
} from '@/services/stores';
import type { RoomsBizDoc, Store, StoreDoc } from '@/types/store';

/**
 * stores + rooms_biz 두 컬렉션을 동시에 구독해 병합한 목록을 돌려준다.
 * 필터·정렬은 메모이즈해 스크롤 중 재계산을 피한다.
 */
export function useStores(filter: StoreFilter) {
  const [rawStores, setRawStores] = useState<StoreDoc[]>([]);
  const [roomsBiz, setRoomsBiz] = useState<Map<string, RoomsBizDoc>>(new Map());
  const [marketing, setMarketing] = useState<StoreMarketing>(EMPTY_STORE_MARKETING);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /* 새로고침 — 구독을 끊고 다시 건다. onSnapshot 이라 평소엔 필요 없지만
     웹 가게찾기에 새로고침 버튼이 있어 같은 조작을 제공한다. */
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    const unsubMarketing = subscribeStoreMarketing(setMarketing);
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
      unsubMarketing();
    };
  }, [epoch]);

  const merged: Store[] = useMemo(
    () => mergeRoomsBiz(rawStores, roomsBiz),
    [rawStores, roomsBiz],
  );

  /**
   * 필터·정렬 후 관리자 지정 목록 순서(listOrders) 적용.
   * 검색 중에는 연관순이 우선이라 웹과 동일하게 지정 순서를 쓰지 않는다.
   */
  const stores = useMemo(() => {
    const list = filterStores(merged, filter);
    if (filter.keyword.trim()) return list;
    return applyListOrder(list, marketing.listOrders[filter.category] ?? [], filter.sort);
  }, [merged, filter, marketing.listOrders]);

  /** 카테고리별 Top5 — 검색 중에는 목록에 집중하도록 숨긴다 */
  const topSections = useMemo(
    () =>
      filter.keyword.trim()
        ? []
        : buildTopSections(merged, marketing.topRanks, STORE_CATEGORIES, {
            category: filter.category,
            region: filter.region,
            sort: filter.sort,
          }),
    [merged, marketing.topRanks, filter.keyword, filter.category, filter.region, filter.sort],
  );

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setEpoch(e => e + 1);
  }, []);

  return {
    stores,
    topSections,
    total: merged.length,
    /** 관리자가 지정한 실시간 순위 (없으면 빈 배열 → 찜 수 자동) */
    hotRankIds: marketing.hotRanks,
    loading,
    error,
    reload,
  };
}
