import { useEffect, useState } from 'react';
import { resolveThumb, thumbCandidate } from '@/services/stores';
import type { Store } from '@/types/store';

/**
 * 업체 썸네일 URL. gs:// 경로면 Storage 다운로드 URL 로 변환한다.
 * 변환 결과는 서비스 레이어에서 캐시하므로 재렌더 시 재요청하지 않는다.
 */
export function useThumb(store: Store): string {
  const raw = thumbCandidate(store);
  const immediate = /^(data:|https?:\/\/)/i.test(raw) ? raw : '';
  const [uri, setUri] = useState(immediate);

  useEffect(() => {
    if (immediate || !raw) {
      setUri(immediate);
      return;
    }
    let alive = true;
    resolveThumb(raw).then(u => {
      if (alive) setUri(u);
    });
    return () => {
      alive = false;
    };
  }, [raw, immediate]);

  return uri;
}
