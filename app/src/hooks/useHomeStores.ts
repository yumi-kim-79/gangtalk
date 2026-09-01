import { useEffect, useMemo, useState } from 'react';
import { EXPOSURE_KEY_DASHBOARD } from '@/constants/stores';
import { applyHomeOrder, subscribeHomeOrder } from '@/services/dashboard';
import {
  filterStores,
  mergeRoomsBiz,
  subscribeRoomsBiz,
  subscribeStores,
} from '@/services/stores';
import type { RoomsBizDoc, StoreDoc } from '@/types/store';

/**
 * 홈(현황판) 목록.
 * 업체찾기와 달리 exposure.dashboard 를 보고, 관리자 지정 순서(config/marketing.homeOrder)를 따른다.
 */
export function useHomeStores(category: string, keyword: string) {
  const [rawStores, setRawStores] = useState<StoreDoc[]>([]);
  const [roomsBiz, setRoomsBiz] = useState<Map<string, RoomsBizDoc>>(new Map());
  const [homeOrder, setHomeOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomsReady, setRoomsReady] = useState(false);
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
    const unsubRooms = subscribeRoomsBiz(map => {
      setRoomsBiz(map);
      setRoomsReady(true);
    });
    const unsubOrder = subscribeHomeOrder(setHomeOrder);
    return () => {
      unsubStores();
      unsubRooms();
      unsubOrder();
    };
  }, []);

  const merged = useMemo(() => mergeRoomsBiz(rawStores, roomsBiz), [rawStores, roomsBiz]);

  const stores = useMemo(() => {
    const filtered = filterStores(merged, {
      category,
      region: 'all',
      sort: 'tc',
      keyword,
      exposureKey: EXPOSURE_KEY_DASHBOARD,
    });
    return applyHomeOrder(filtered, homeOrder);
  }, [merged, category, keyword, homeOrder]);

  /** rooms_biz 도착 전에는 맞출방/필요인원/혼잡도를 확정값으로 보여주면 안 된다 (웹과 동일) */
  return { stores, all: merged, loading, roomsReady, error };
}
