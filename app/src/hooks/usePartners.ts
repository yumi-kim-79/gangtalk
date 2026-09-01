import { useEffect, useMemo, useState } from 'react';
import { subscribePartnerTopRanks, subscribePartners } from '@/services/partners';
import type { Partner } from '@/types/partner';

/** 제휴관 목록 + 카테고리별 Top5 순서 */
export function usePartners(category: string, keyword: string) {
  const [all, setAll] = useState<Partner[]>([]);
  const [ranks, setRanks] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubPartners = subscribePartners(
      rows => {
        setAll(rows);
        setLoading(false);
      },
      () => {
        setError('제휴업체를 불러오지 못했습니다.');
        setLoading(false);
      },
    );
    const unsubRanks = subscribePartnerTopRanks(setRanks);
    return () => {
      unsubPartners();
      unsubRanks();
    };
  }, []);

  /** 하단 전체 목록 — 카테고리·검색어 적용 */
  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return all.filter(p => {
      if (category !== 'all' && p.category !== category) return false;
      if (!q) return true;
      return `${p.name} ${p.intro} ${p.benefits} ${p.tags.join(' ')} ${p.region}`
        .toLowerCase()
        .includes(q);
    });
  }, [all, category, keyword]);

  return { all, filtered, ranks, loading, error };
}
