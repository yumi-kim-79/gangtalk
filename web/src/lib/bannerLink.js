/**
 * 배너 → 업체 상세 연결.
 *
 * 배너에는 별도 업체 id 를 두지 않고, 관리자가 입력한
 *   제목  = 업체 등록 이름
 *   설명  = 담당자 이름
 * 두 값으로 실제 문서를 찾아 상세로 보낸다. (2026-09-10 요청)
 *
 * 이름은 공백·대소문자를 무시하고 비교한다. 같은 이름이 여러 개면
 * 담당자까지 맞는 것을 고르고, 그래도 여러 개면 연결하지 않는다
 * (엉뚱한 업체로 보내는 것보다 아무 데도 안 가는 편이 낫다).
 */
const norm = (v) => String(v ?? '').replace(/\s+/g, '').toLowerCase()

export function resolveBannerTarget(banner, list) {
  const wantName = norm(banner?.title)
  if (!wantName || !Array.isArray(list)) return null

  const byName = list.filter(x => norm(x?.name) === wantName)
  if (byName.length === 1) return byName[0]
  if (!byName.length) return null

  const wantMgr = norm(banner?.desc)
  if (!wantMgr) return null
  const byMgr = byName.filter(x => {
    const m = norm(x?.manager || x?.managerName)
    if (m && m === wantMgr) return true
    const arr = Array.isArray(x?.managers) ? x.managers : []
    return arr.some(g => norm(g?.name) === wantMgr)
  })
  return byMgr.length === 1 ? byMgr[0] : null
}

/** 관리자 화면에서 "이 이름이 실제 업체와 연결되는가" 를 보여 주기 위한 판정 */
export function bannerLinkState(banner, list) {
  if (!norm(banner?.title)) return { ok: false, msg: '업체 이름을 입력하면 상세로 연결됩니다' }
  const hit = resolveBannerTarget(banner, list)
  if (hit) return { ok: true, msg: `연결됨 → ${hit.name}` }
  const dup = (list || []).filter(x => norm(x?.name) === norm(banner?.title)).length
  if (dup > 1) return { ok: false, msg: '같은 이름이 여러 곳입니다. 담당자까지 입력해 주세요' }
  return { ok: false, msg: '해당 이름의 업체를 찾지 못했습니다' }
}
