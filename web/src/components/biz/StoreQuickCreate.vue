<!-- src/components/biz/StoreQuickCreate.vue : 빠른 신청 버튼 → applications 컬렉션에 저장 -->
<template>
  <div class="sqc">
    <!-- 트리거 버튼 -->
    <button
      v-if="isEnterprise"
      class="sqc-btn"
      :class="kind"
      type="button"
      @click="open"
      :title="btnTitle"
      :aria-label="btnTitle"
    >
      <span class="dot" />
      {{ btnLabel }}
    </button>

    <!-- 입력 모달 -->
    <dialog ref="dlg" class="sqc-dlg" @close="onClose">
      <form class="sqc-form" @submit.prevent="save">
        <header class="sqc-head">
          <strong>{{ formTitle }}</strong>
        </header>

        <label>카테고리
          <input v-model.trim="form.category" placeholder="예) 네일, 성형외과, 카페" required />
        </label>
        <label>가게명
          <input v-model.trim="form.name" placeholder="상호명" required />
        </label>
        <label>담당자명
          <input v-model.trim="form.contactName" placeholder="홍길동" />
        </label>
        <label>연락 이메일
          <input v-model.trim="form.email" type="email" :placeholder="emailPlaceholder" />
        </label>
        <label>전화번호
          <input v-model.trim="form.phone" placeholder="010-0000-0000" />
        </label>
        <label>주소
          <input v-model.trim="form.address" placeholder="도로명 주소" />
        </label>
        <label>요청사항
          <textarea v-model.trim="form.message" rows="4" placeholder="요청/설명 사항을 적어주세요" />
        </label>

        <footer class="rows">
          <button type="button" class="btn" @click="close">취소</button>
          <div class="gap" />
          <!-- 클릭 시 바로 save() 호출 -->
          <button
            type="button"
            class="btn primary"
            @click.prevent="save"
          >
            {{ submitLabel }}
          </button>
        </footer>
      </form>
    </dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { db as fbDb } from '@/firebase'
import {
  collection, addDoc, serverTimestamp, doc, getDoc, getDocs, limit
} from 'firebase/firestore'
import { pushAdminInbox } from '@/lib/adminInbox' // ✅ 관리자 알림 인박스 유틸

/**
 * props
 * kind: 'ad' | 'store' | 'partner'
 *  - ad      : 광고 신청
 *  - store   : 업체등록 신청
 *  - partner : 제휴/파트너 신청
 * defaultCategory: 상위 페이지 기본 카테고리
 */
const props = defineProps({
  kind: { type: String, default: 'store' },
  defaultCategory: { type: String, default: '' }
})

const auth = getAuth()
const uid = ref('')
const isEnterprise = ref(false)

/**
 * ✅ 역할 판별 (새 구조 기준)
 * - users/{uid}.type === 'company'
 * - users/{uid}.accountKind:
 *    - kind === 'partner' → 'partnerOwner' 여야 버튼 노출
 *    - 나머지(ad/store)   → 'storeOwner' 여야 버튼 노출
 * - 예전 데이터(type만 company이고 accountKind 비어있는 경우)는 임시로 허용
 */
async function checkRole(user){
  uid.value = user?.uid || ''
  isEnterprise.value = false
  if (!uid.value) return

  try {
    const meSnap = await getDoc(doc(fbDb, 'users', uid.value))
    if (!meSnap.exists()) {
      console.warn('[StoreQuickCreate] checkRole: users 문서 없음', uid.value)
      return
    }

    const data = meSnap.data() || {}
    const type = String(data.type || data.profile?.type || '').toLowerCase()
    const kind = String(data.accountKind || '').toLowerCase()

    console.log('[StoreQuickCreate] checkRole data', { type, kind, kindProp: props.kind })

    if (type !== 'company') {
      // 서브컬렉션 company 로 보조 판정(아주 옛날 데이터)
      try{
        const sub = await getDocs(collection(fbDb, 'users', uid.value, 'company'), limit(1))
        if (!sub.empty) {
          isEnterprise.value = true
          console.log('[StoreQuickCreate] company subcollection 존재 → 임시 허용')
        }
      }catch(e){
        console.warn('[StoreQuickCreate] company subcollection check fail', e)
      }
      return
    }

    const isStoreOwner    = kind === 'storeowner'
    const isPartnerOwner  = kind === 'partnerowner'
    const noKindSpecified = !kind

    if (props.kind === 'partner') {
      // 제휴관 신청: 제휴관 담당자만 허용
      isEnterprise.value = isPartnerOwner || noKindSpecified
    } else {
      // 광고/업체등록: 가게찾기 사장님만 허용
      isEnterprise.value = isStoreOwner || noKindSpecified
    }

    console.log('[StoreQuickCreate] isEnterprise →', isEnterprise.value)
  } catch (e) {
    console.warn('[StoreQuickCreate] checkRole failed:', e)
    isEnterprise.value = false
  }
}

onMounted(()=>{
  console.log('[StoreQuickCreate] MOUNT', { kind: props.kind })
  checkRole(auth.currentUser)
  onAuthStateChanged(auth, checkRole)
})

/* 라벨/제목 */
const btnLabel    = computed(() =>
  props.kind === 'ad' ? '광고 신청' : (props.kind === 'partner' ? '제휴 신청' : '업체등록 신청')
)
const btnTitle    = computed(() =>
  props.kind === 'ad' ? '광고 등록을 신청합니다' : (props.kind === 'partner' ? '제휴 등록을 신청합니다' : '내 업체 등록을 신청합니다')
)
const formTitle   = computed(() =>
  props.kind === 'ad' ? '광고 신청' : (props.kind === 'partner' ? '제휴 신청' : '업체등록 신청')
)
const submitLabel = computed(() => '신청')

/* 모달 & 폼 */
const dlg  = ref(null)
const emailPlaceholder = computed(() => auth.currentUser?.email || '연락 받을 이메일')
const form = ref({
  category: props.defaultCategory || '', name:'', phone:'', address:'',
  contactName:'', email: auth.currentUser?.email || '', message:''
})

function open(){
  console.log('[StoreQuickCreate] open()', { defaultCategory: props.defaultCategory, kind: props.kind })
  form.value = {
    category: props.defaultCategory || '', name:'', phone:'', address:'',
    contactName:'', email: auth.currentUser?.email || '', message:''
  }
  if (dlg.value?.showModal) dlg.value.showModal()
  else dlg.value?.setAttribute('open','open')
}
function close(){
  if (dlg.value?.close) dlg.value.close()
  else dlg.value?.removeAttribute('open')
}
function onClose(){}

/* ✅ 저장: applications에 단일화 + 강력 디버깅 */
async function save(){
  const user = auth.currentUser

  console.log('[StoreQuickCreate] save() 호출', {
    uid: uid.value,
    authUid: user?.uid,
    isEnterprise: isEnterprise.value,
    kind: props.kind,
    form: { ...form.value }
  })

  // 1) 로그인 체크
  if (!user) {
    alert('로그인이 필요합니다. 먼저 로그인 후 다시 시도해 주세요.')
    close()
    return
  }

  // 2) 역할 체크 (제한된 계정만 허용)
  if (!isEnterprise.value) {
    if (props.kind === 'partner') {
      alert('관리자회원(제휴관 담당자)만 제휴/광고 신청을 할 수 있습니다.')
      window.location.href = '/auth?mode=login&who=admin'
    } else {
      alert('기업회원(가게찾기 업체 사장님)만 광고/업체 등록을 신청할 수 있습니다.')
      window.location.href = '/auth?mode=login&who=biz'
    }
    return
  }

  // 3) 필수값 체크
  const category = (form.value.category || '').trim()
  const name     = (form.value.name || '').trim()

  if (!category || !name) {
    alert('카테고리와 가게명을 모두 입력해 주세요.')
    return
  }

  uid.value = uid.value || user.uid

  // kind → type 매핑: ad | partner | store
  const type =
    props.kind === 'ad' ? 'ad' :
    (props.kind === 'partner' ? 'partner' : 'store')

  const payload = {
    type,                                           // 'ad' | 'partner' | 'store'
    companyName: name,
    contactName: form.value.contactName || '',
    phone: (form.value.phone || '').trim(),
    email: (form.value.email || user.email || '').trim(),
    message: form.value.message || '',
    extra: {
      category,
      address: form.value.address || ''
    },
    createdByUid: uid.value,
    createdByEmail: user.email || '',
    status: 'pending',
    createdAt: serverTimestamp(),
  }

  console.log('[StoreQuickCreate] addDoc payload', payload)

  try{
    // 1) Firestore 저장
    const refDoc = await addDoc(collection(fbDb, 'applications'), payload)
    console.log('[StoreQuickCreate] addDoc 성공, id =', refDoc.id)

    // 1-1) 디버그용: 방금 쓴 문서를 다시 읽어서 존재 여부 확인
    try {
      const checkSnap = await getDoc(doc(fbDb, 'applications', refDoc.id))
      console.log(
        '[StoreQuickCreate] getDoc 검사',
        { id: refDoc.id, exists: checkSnap.exists(), data: checkSnap.data() }
      )
      if (!checkSnap.exists()) {
        alert(`신청이 서버에 제대로 저장되지 않았습니다.\nID: ${refDoc.id}`)
        return
      }
    } catch (checkErr) {
      console.warn('[StoreQuickCreate] getDoc 검사 실패', checkErr)
      // 검사 실패해도 일단 계속 진행 (alert는 띄움)
    }

    // 2) ✅ 관리자 알림 등록 (마이페이지 상단 종 아이콘에 N 표시)
    try{
      const kindForInbox =
        type === 'ad' ? 'adApply' :
        (type === 'partner' ? 'partnerApply' : 'storeApply')

      const title =
        type === 'ad' ? `[광고신청] ${name}` :
        (type === 'partner' ? `[제휴신청] ${name}` : `[업체등록신청] ${name}`)

      const body = category

      await pushAdminInbox({
        kind: kindForInbox,
        title,
        body,
        meta: {
          applicationId: refDoc.id,
          ownerId: uid.value,
          companyName: name,
          type
        }
      })
      console.log('[StoreQuickCreate] pushAdminInbox 완료')
    }catch(e){
      console.warn('[StoreQuickCreate] pushAdminInbox fail:', e?.message || e)
    }

    close()
    alert('신청이 접수되었습니다. 운영자가 확인 후 연락드릴게요.\n(신청 ID: ' + refDoc.id + ')')
  }catch(e){
    console.error('[StoreQuickCreate] save error:', e)
    alert('신청 중 오류가 발생했습니다.\n' + (e?.message || e))
  }
}
</script>

<style scoped>
.sqc { position: relative; }

/* 트리거 버튼 */
.sqc-btn{
  --h: 34px;
  height: var(--h);
  padding: 0 12px 0 10px;
  border-radius: 10px;
  border: 1px solid #e9e9ef;
  background: #ffffffcc;
  color:#333;
  display:inline-flex; align-items:center; gap:8px;
  font-weight:700; font-size:14px;
  box-shadow: 0 6px 14px rgba(0,0,0,.06);
  backdrop-filter: blur(4px);
}
.sqc-btn .dot{
  width:8px; height:8px; border-radius:50%;
  background:#ff2e87;
  box-shadow:0 0 0 3px rgba(255,46,135,.15);
}
.sqc-btn.ad     { color:#0a8f42; border-color:#dff5e7; background:#f3fff7; }
.sqc-btn.store  { color:#ff2e87; border-color:#ffd3e7; background:#fff3f8; }
.sqc-btn.partner{ color:#2563eb; border-color:#dbeafe; background:#eff6ff; }
.sqc-btn:active { transform: translateY(1px); }

/* 모달 */
dialog::backdrop{ background: rgba(0,0,0,.35); }
.sqc-dlg{ border:none; border-radius:14px; padding:0; }
.sqc-form{ padding:16px; width:92vw; max-width:520px; }
.sqc-head{ margin-bottom:12px; }
.sqc-form label{ display:block; margin:8px 0; }
.sqc-form input, .sqc-form textarea{
  width:100%; padding:10px; border:1px solid #e6e6ea; border-radius:10px;
}
.sqc-form textarea{ resize: vertical; min-height: 88px; }
.rows{ display:flex; align-items:center; gap:8px; margin-top:12px; }
.btn{ padding:8px 12px; border-radius:10px; background:#f6f6f8; }
.btn.primary{ background:#ff2e87; color:#fff; font-weight:700; }
.gap{ flex:1; }

/* 배너 좌상단 고정 배치용(옵션) */
.sqc.abs-top-left{
  position:absolute; left:8px; top:8px; z-index:2;
}
</style>
