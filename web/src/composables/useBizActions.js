
// src/composables/useBizActions.js
import { ref } from 'vue'
import { useRouter } from 'vue-router'

/* ─────────────────────────────────────────────────────────────
 * 🔧 규칙
 *  - rooms_biz 문서ID는 “업체명 키” 그대로 사용 (예: drama, youandme, labels)
 *  - 기본 방ID 규칙: {업체명}_room_01  (예: drama_room_01)
 *  - 웹/매크로/시트 모두 동일 경로 사용:
 *      /rooms_biz/{업체명}/rooms/{업체명}_room_01/messages
 *
 * 🧩 기존 코드 호환
 *  - openBizChat(store)를 그대로 쓰되, 내부에서 업체명 키를 자동 추출합니다.
 *  - store 객체에 아래 중 하나가 존재하면 랜덤ID가 아닌 값으로 사용합니다.
 *      store.storeId | store.vendorId | store.vendorKey | store.slug | store.name
 *  - 위 후보가 모두 없거나 랜덤ID로 보이면 마지막으로 store.id 를 검사(랜덤이면 배제).
 * ───────────────────────────────────────────────────────────── */

/** 랜덤 DocID처럼 보이면 true (파이어스토어 auto-id 패턴) */
function looksRandomId(v = '') {
  const s = String(v || '')
  return /^[A-Za-z0-9_-]{15,}$/.test(s)
}

/** 업체명 키(=rooms_biz 문서ID로 쓸 값) 추출 */
function bizIdOf(store) {
  const cand = [
    store?.storeId,     // 권장 필드
    store?.vendorId,    // 과거 매핑
    store?.vendorKey,   // 슬러그 형태
    store?.slug,        // 슬러그를 쓰는 경우
    store?.name         // 한글/영문 이름 → 공백 제거 & 소문자화는 아래에서
  ]
    .map(x => (x ?? '').toString().trim())
    .filter(Boolean)

  const picked = cand.find(v => !looksRandomId(v))
  if (picked) return picked.replace(/\s+/g, '').toLowerCase()

  const id = (store?.id ?? '').toString().trim()
  if (id && !looksRandomId(id)) return id.replace(/\s+/g, '').toLowerCase()

  return ''
}

/** 기본 방ID: {업체명}_room_01 */
function defaultRoomIdOf(bizId) {
  const k = (bizId || '').toLowerCase()
  return k ? `${k}_room_01` : ''
}

export function useBizActions () {
  const router = useRouter()
  const sheet = ref({ open:false, type:'', store:null })

  const showSheet  = (type, store) => { sheet.value = { open:true, type, store } }
  const closeSheet = () => { sheet.value.open = false }

  /** ✅ 강톡 - 업체톡 (업체명 기반 경로로 이동) */
  const openBizChat = (store, opts = {}) => {
    const bizId  = (opts.storeId || bizIdOf(store))
    if (!bizId) {
      alert('업체 ID를 결정할 수 없습니다. (storeId/vendorId/name 중 하나가 필요)')
      return
    }
    const roomId = opts.roomId || defaultRoomIdOf(bizId)
    const name   = opts.name   || store?.displayName || store?.name || bizId

    // 기존 '/gangtalk?room=...' 경로 대신, ChatBiz 라우트로 통일
    router.push({
      name: 'ChatBiz',                          // 라우터에 { path:'/chat-biz/:storeId', name:'ChatBiz' } 가 있어야 함
      params: { storeId: bizId },               // 👉 rooms_biz 문서ID = 업체명
      query:  { roomId, name }                  // 👉 기본 방 규칙 {업체명}_room_01
    })
  }

  /** 담당자 연결톡(기존 동작 유지) */
  const openConnectTalk = (s) => {
    router.push({ path:'/connect', query:{ to:`manager-${s.id}`, name:s.manager, store:s.name } })
  }

  const callPhone = (phone) => { if (phone) window.location.href = `tel:${phone}` }
  const copyToClipboard = async (text) => {
    if (!text) return
    try { await navigator.clipboard.writeText(text); alert('복사되었습니다.') }
    catch { alert('복사 실패') }
  }

  return {
    sheet, showSheet, closeSheet,
    openBizChat, openConnectTalk,
    callPhone, copyToClipboard,
    // 유틸도 외부에서 재사용할 수 있게 export
    bizIdOf, defaultRoomIdOf
  }
}
