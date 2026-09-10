/**
 * 배너 → 업체 상세 연결. 웹 web/src/lib/bannerLink.js 와 **같은 규칙**이어야 한다.
 *   배너 제목 = 업체 등록 이름 / 배너 설명 = 담당자
 * 같은 이름이 여럿이면 담당자까지 맞는 것을 고르고, 그래도 여럿이면 연결하지 않는다.
 */
import type { Banner } from '@/services/banners';

const norm = (v: unknown) => String(v ?? '').replace(/\s+/g, '').toLowerCase();

type Named = {
  id: string;
  name?: string;
  manager?: string;
  managers?: { name?: string }[];
};

export function resolveBannerTarget<T extends Named>(banner: Banner, list: T[]): T | null {
  const wantName = norm(banner?.title);
  if (!wantName || !Array.isArray(list)) return null;

  const byName = list.filter(x => norm(x?.name) === wantName);
  if (byName.length === 1) return byName[0];
  if (!byName.length) return null;

  const wantMgr = norm(banner?.desc);
  if (!wantMgr) return null;
  const byMgr = byName.filter(x => {
    if (norm(x?.manager) === wantMgr) return true;
    const arr = Array.isArray(x?.managers) ? x.managers : [];
    return arr.some(g => norm(g?.name) === wantMgr);
  });
  return byMgr.length === 1 ? byMgr[0] : null;
}
