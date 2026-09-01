import { useEffect, useState } from 'react';
import { subscribeStore } from '@/services/stores';
import type { Store } from '@/types/store';

/** 업체 상세 단건 구독 */
export function useStore(id: string) {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeStore(
      id,
      s => {
        setStore(s);
        setLoading(false);
      },
      e => {
        setError(e instanceof Error ? e.message : '업체 정보를 불러오지 못했습니다.');
        setLoading(false);
      },
    );
    return unsub;
  }, [id]);

  return { store, loading, error };
}
