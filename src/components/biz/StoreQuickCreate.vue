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
          <button type="submit" class="btn primary">{{ submitLabel }}</button>
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
import { pushAdminInbox } from '@/lib/adminInbox' // ✅ 관리자 알림 인박스 유틸 추가

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

/** 기업회원 판정 */
async function checkRole(user){
  uid.value = user?.uid || ''
  isEnterprise.value = false
  if(!uid.value) return

  try{
    const me = await getDoc(doc(fbDb, 'users', uid.value))
    const t = String(me.data()?.type || me.data()?.profile?.type || '').toLowerCase()
    const ALLOWED = new Set(['enterprise','company','biz','partner'])
    let ok = ALLOWED.has(t)
    if (!ok) {
      // 보조 판정: 서브컬렉션 'company' 유무
      try{
        const sub = await getDocs(collection(fbDb, 'users', uid.value, 'company'), limit(1))
        if (!sub.empty) ok = true
      }catch{}
    }
    isEnterprise.value = ok
  }catch{
    isEnterprise.value = false
  }
}
onMounted(()=>{
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
  form.value = {
    category: props.defaultCategory || '', name:'', phone:'', address:'',
    contactName:'', email: auth.currentUser?.email || '', message:''
  }
  dlg.value?.showModal()
}
function close(){ dlg.value?.close() }
function onClose(){}

/* 저장: applications에 단일화 */
async function save(){
  if(!uid.value) return
  if(!form.value.name || !form.value.category) return

  // kind → type 매핑: ad | partner | store
  const type =
    props.kind === 'ad' ? 'ad' :
    (props.kind === 'partner' ? 'partner' : 'store')

  const payload = {
    type,                                           // 'ad' | 'partner' | 'store'
    companyName: form.value.name,
    contactName: form.value.contactName || '',
    phone: (form.value.phone || '').trim(),
    email: (form.value.email || auth.currentUser?.email || '').trim(),
    message: form.value.message || '',
    extra: {
      category: form.value.category || '',
      address: form.value.address || ''
    },
    createdByUid: uid.value,
    createdByEmail: auth.currentUser?.email || '',
    status: 'pending',
    createdAt: serverTimestamp(),
  }

  try{
    // 1) Firestore 저장
    const refDoc = await addDoc(collection(fbDb, 'applications'), payload)

    // 2) ✅ 관리자 알림 등록 (마이페이지 상단 종 아이콘에 N 표시)
    try{
      const kindForInbox =
        type === 'ad' ? 'adApply' :
        (type === 'partner' ? 'partnerApply' : 'storeApply')

      const title =
        type === 'ad' ? `[광고신청] ${form.value.name}` :
        (type === 'partner' ? `[제휴신청] ${form.value.name}` : `[업체등록신청] ${form.value.name}`)

      const body = form.value.category ? `${form.value.category}` : ''

      await pushAdminInbox({
        kind: kindForInbox,
        title,
        body,
        meta: {
          applicationId: refDoc.id,
          ownerId: uid.value,
          companyName: form.value.name,
          type
        }
      })
    }catch(e){
      console.warn('pushAdminInbox fail:', e?.message || e)
    }

    close()
    alert('신청이 접수되었습니다. 운영자가 확인 후 연락드릴게요.')
  }catch(e){
    console.error(e)
    alert('신청 중 오류가 발생했습니다.')
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
