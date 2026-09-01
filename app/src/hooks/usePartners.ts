import { useEffect, useMemo, useState } from 'react';
import {
  EMPTY_PARTNER_CONFIG,
  applyPartnerOrder,
  matchesPartnerQuery,
  subscribePartnerConfig,
  subscribePartners,
  type PartnerConfig,
} from '@/services/partners';
import type { Partner } from '@/types/partner';

/**
 * 제휴관 목록 + 관리자 설정(전체 순서 / 카테고리별 Top5).
 * 관리자 웹에서 순서를 저장하면 onSnapshot 으로 즉시 반영된다.
 */
export function usePartners(category: string, keyword: string) {
  const [raw, setRaw] = useState<Partner[]>([]);
  const [config, setConfig] = useState<PartnerConfig>(EMPTY_PARTNER_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubPartners = subscribePartners(
      rows => {
        setRaw(rows);
        setLoading(false);
      },
      () => {
        setError('제휴업체를 불러오지 못했습니다.');
        setLoading(false);
      },
    );
    const unsubConfig = subscribePartnerConfig(setConfig);
    return () => {
      unsubPartners();
      unsubConfig();
    };
  }, []);

  /** 관리자 순서를 적용한 전체 목록 — Top5 폴백도 이 순서를 기준으로 본다 */
  const all = useMemo(
    () => applyPartnerOrder(raw, config.order),
    [raw, config.order],
  );

  /** 하단 전체 목록 — 카테고리·검색어 적용 (순서는 유지) */
  const filtered = useMemo(
    () =>
      all.filter(p => {
        if (category !== 'all' && p.category !== category) return false;
        return matchesPartnerQuery(p, keyword);
      }),
    [all, category, keyword],
  );

  return { all, filtered, ranks: config.ranks, loading, error };
}
