import { useEffect, useState } from 'react';
import { fallbackThumb, resolveThumb, thumbCandidate } from '@/services/stores';
import type { Store } from '@/types/store';

/**
 * 업체 썸네일 URL. gs:// 경로면 Storage 다운로드 URL 로 변환한다.
 * 변환 결과는 서비스 레이어에서 캐시하므로 재렌더 시 재요청하지 않는다.
 *
 * 사진이 하나도 없으면 카테고리별 기본 이미지를 돌려준다 —
 * 웹(MainPage.vue:1218-1219, StoreFinder.vue:1144-1147)과 같은 규칙.
 * 이전에는 빈 문자열을 돌려줘 앱에서만 이니셜 사각형이 떴다.
 */
export function useThumb(store: Store): string {
  const raw = thumbCandidate(store);
  // 상대경로(/…)도 웹처럼 그대로 쓴다
  const immediate = /^(data:|blob:|https?:\/\/|\/)/i.test(raw) ? raw : '';
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

  return uri || fallbackThumb(store.category);
}
