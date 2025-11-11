<!-- src/components/biz/BizManagerTabs.vue -->
<template>
  <section v-if="mode !== 'none'" class="biz-manage">
    <!-- 탭 헤더 -->
    <div class="tabs" v-if="visibleTabs.length > 1">
      <button
        v-for="t in visibleTabs"
        :key="t.key"
        class="tab"
        :class="{ active: tab === t.key }"
        :data-key="t.key"
        @click="tab = t.key"
      >
        {{ t.label }}
      </button>
      <div class="spacer" />
      <div v-if="category" class="cat-chip">{{ categoryLabel }}</div>
    </div>

    <!-- 컨텐츠 -->
    <div class="panel">
      <!-- ▣ (기업회원 전용) 신청 작성 -->
      <div v-if="tab==='create' && mode==='enterprise'" class="pane">
        <header class="pane-head">
          <strong>{{ displayCreateTitle }}</strong>
          <button class="btn primary" @click="openCreate">{{ displayCreateButton }}</button>
        </header>

        <p class="hint">
          신청 후 관리자가 확인합니다. (기업회원은 신청 목록을 별도로 볼 수 없고,
          관리자가 이메일/푸시로 접수 내용을 확인합니다)
        </p>
      </div>

      <!-- ▣ (관리자 전용) 신청 목록 -->
      <div v-if="tab==='recent' && mode==='admin'" class="pane">
        <header class="pane-head">
          <strong>신청목록</strong>
          <button class="btn" @click="reloadAdmin">새로고침</button>
        </header>

        <ul class="cards">
          <li v-for="a in adminAll" :key="a._id" class="card">
            <div class="row">
              <div>
                <strong class="name">
                  {{ a.companyName || a.name || '-' }}
                  <span class="type-chip">({{ typeLabel(a.type) }})</span>
                </strong>
                <span class="meta">
                  {{ a.phone || a.email || '-' }}
                </span>
                <div class="meta2">
                  담당: {{ a.contactName || '-' }}
                  <span class="sep">|</span>
                  작성자: {{ a.createdByEmail || a.createdByUid || '-' }}
                  <span class="sep">|</span>
                  {{ dt(a.createdAt) }}
                </div>
                <div class="extra" v-if="a.message">{{ a.message }}</div>
                <div class="extra" v-if="a.extra && (a.extra.category || a.extra.address)">
                  <span v-if="a.extra?.category">#{{ a.extra.category }}</span>
                  <span v-if="a.extra?.address"> · {{ a.extra.address }}</span>
                </div>
              </div>
              <div class="gap"></div>
              <button class="btn danger" @click="remove(a)">삭제</button>
            </div>
          </li>
        </ul>
        <Empty v-if="adminAll.length===0" label="표시할 신청이 없습니다" />
      </div>
    </div>

    <!-- 작성 모달 (기업회원용) -->
    <dialog ref="dlg">
      <form class="editor" @submit.prevent="save">
        <h3>{{ isAd ? '새 광고 신청' : createTitleText }}</h3>

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

        <div class="rows">
          <button type="button" class="btn" @click="closeDlg">취소</button>
          <div class="gap"></div>
          <button type="submit" class="btn primary">신청</button>
        </div>
      </form>
    </dialog>
  </section>
</template>

<script setup>
/* src/components/biz/BizManagerTabs.vue */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { fbDb } from '@/firebase.js'
import {
  collection, doc, getDoc, getDocs, query, where, orderBy, limit,
  addDoc, serverTimestamp, deleteDoc
} from 'firebase/firestore'

/* ── props ── */
const props = defineProps({
  category: { type: String, default: '' },        // 현재 페이지 카테고리
  /**
   * 'ad' | 'store' | 'partner' | 'all'
   * - 기업회원 모드: create 탭만 사용 → 'store'/'ad' 의미 유지
   * - 관리자 모드: 'all'이면 ads + applications 합쳐서 한 번만 표시
   */
  kind: { type: String, default: 'store' },
  createTitle: { type: String, default: '등록신청' },
  createButtonLabel: { type: String, default: '새 매장 등록 신청' },
  createTabLabel: { type: String, default: '등록신청' },
})

/* ── 광고/제휴 스위치(기업회원 작성 화면에서만 의미) ── */
const isAd = computed(() => props.kind === 'ad')
const createTitleText  = computed(() => props.kind === 'partner' ? '새 제휴 업체 신청' : '새 매장 등록 신청')

/* ── 제목/버튼 라벨 ── */
const displayCreateTitle = computed(() =>
  props.createTitle || (isAd.value ? '광고신청' : (props.kind === 'partner' ? '제휴 신청' : '등록신청'))
)
const displayCreateButton = computed(() =>
  props.createButtonLabel || (isAd.value ? '새 광고 신청' : (props.kind === 'partner' ? '새 제휴 신청' : '새 매장 등록 신청'))
)

/* ── 역할 판별 ── */
const mode = ref('none') // 'enterprise' | 'admin' | 'none'
const uid = ref('')
const auth = getAuth()

async function resolveRole(u){
  if(!u){ mode.value = 'none'; uid.value = ''; return }
  uid.value = u.uid

  // 1) 관리자
  const adminDoc = await getDoc(doc(fbDb, 'admins', u.uid))
  if (adminDoc.exists()) { mode.value = 'admin'; return }

  // 2) 기업회원
  const userDoc = await getDoc(doc(fbDb, 'users', u.uid))
  if (userDoc.exists()) {
    const data = userDoc.data() || {}
    const rawType = (data.type || data.profile?.type || '').toString().toLowerCase()
    if (['enterprise','company','biz','partner'].includes(rawType)) {
      mode.value = 'enterprise'
      return
    }
  }
  mode.value = 'none'
}

onMounted(() => {
  resolveRole(auth.currentUser)
  onAuthStateChanged(auth, resolveRole)
})

/* ── 탭 구성 ── */
const tab = ref('create')
const tabs = computed(() => ([
  { key: 'create', label: props.createTabLabel || '등록신청', role: ['enterprise'] },
  { key: 'recent', label: '신청목록', role: ['admin'] },
]))
const visibleTabs = computed(() => tabs.value.filter(t => t.role.includes(mode.value)))
watch(mode, v => { tab.value = v === 'admin' ? 'recent' : 'create' }, { immediate: true })

/* ── 날짜 표시 ── */
function dt(v){
  try {
    if (v?.seconds) return new Date(v.seconds*1000).toLocaleString()
    return new Date(v).toLocaleString()
  } catch { return '' }
}
const typeLabel = (t) => t === 'ad' ? '광고' : (t === 'store' ? '업체' : '제휴')

/* ── 관리자: 신청 로딩 ── */
const adminAll = ref([])

/**
 * ✅ 관리자 모드 로딩 규칙
 * - kind === 'ad'        → ads만
 * - kind === 'store' 등  → applications만
 * - kind === 'all'       → ads + applications 합쳐서 최신순
 */
async function reloadAdmin(){
  if (mode.value !== 'admin') return

  // helpers
  const mapAds = (docs) => docs.map(d => {
    const x = d.data() || {}
    return {
      _col: 'ads',
      _id: d.id,
      type: 'ad',
      companyName: x.companyName || x.name || '',
      contactName: x.contactName || '',
      phone: x.phone || '',
      email: x.email || '',
      message: x.message || '',
      extra: { category: x.extra?.category || x.category || '', address: x.extra?.address || x.address || '' },
      createdByUid: x.createdByUid || x.ownerId || '',
      createdByEmail: x.createdByEmail || '',
      createdAt: x.createdAt,
    }
  })

  const mapApps = (docs) => docs.map(d => {
    const x = d.data() || {}
    const t = (x.type || 'partner').toString()
    return {
      _col: 'applications',
      _id: d.id,
      type: t, // 'store' | 'partner'
      companyName: x.companyName || x.name || '',
      contactName: x.contactName || '',
      phone: x.phone || '',
      email: x.email || '',
      message: x.message || '',
      extra: x.extra || {},
      createdByUid: x.createdByUid || '',
      createdByEmail: x.createdByEmail || '',
      createdAt: x.createdAt,
    }
  })

  const needAds = (props.kind === 'ad' || props.kind === 'all')
  const needApps = (props.kind !== 'ad')  // 'store' | 'partner' | 'all'

  const rows = []

  if (needAds) {
    const qAds = query(
      collection(fbDb, 'ads'),
      where('kind', '==', 'ad'),
      orderBy('createdAt', 'desc'),
      limit(200)
    )
    const snapAds = await getDocs(qAds)
    rows.push(...mapAds(snapAds.docs))
  }

  if (needApps) {
    const qApps = query(
      collection(fbDb, 'applications'),
      orderBy('createdAt', 'desc'),
      limit(400)
    )
    const snapApps = await getDocs(qApps)
    rows.push(...mapApps(snapApps.docs))
  }

  // 합치고 최신순 정렬
  adminAll.value = rows.sort((a,b) => {
    const ta = (a.createdAt?.seconds || 0) * 1000
    const tb = (b.createdAt?.seconds || 0) * 1000
    return tb - ta
  })
}

onMounted(reloadAdmin)
watch([mode, () => props.kind], reloadAdmin)

/* ── 삭제(관리자) ── */
async function remove(a){
  if (mode.value !== 'admin') return
  const name = a.companyName || a.name || a._id
  if (!confirm(`'${name}' 신청을 삭제할까요?`)) return
  try {
    await deleteDoc(doc(fbDb, a._col, a._id))
    adminAll.value = adminAll.value.filter(x => x._id !== a._id)
    alert('삭제했습니다.')
  } catch (e) {
    console.warn('delete error', e)
    alert('삭제 중 오류가 발생했습니다. (권한/네트워크 확인)')
  }
}

/* ── (기업회원) 작성/저장 ── */
const dlg = ref(null)
const emailPlaceholder = computed(() => auth.currentUser?.email || '연락 받을 이메일')
const form = ref({
  name:'', category: props.category || '', phone:'', address:'',
  contactName:'', email: auth.currentUser?.email || '', message:''
})

function openCreate(){
  form.value = {
    name:'', category: props.category || '', phone:'', address:'',
    contactName:'', email: auth.currentUser?.email || '', message:''
  }
  dlg.value?.showModal()
}
function closeDlg(){ dlg.value?.close() }

/** 기업회원 저장: 광고→ads / 그 외→applications (kind='all'은 관리자 전용이므로 사용 안 됨) */
const appTypeForCreate = computed(() =>
  (props.kind === 'ad' ? 'ad' : (props.kind === 'store' ? 'store' : 'partner'))
)

async function save(){
  if(!uid.value) return
  if(!form.value.name || !form.value.category) return

  if (appTypeForCreate.value === 'ad') {
    await addDoc(collection(fbDb, 'ads'), {
      kind: 'ad',
      type: 'ad',
      name: form.value.name,
      companyName: form.value.name,
      contactName: form.value.contactName || '',
      phone: form.value.phone || '',
      email: (form.value.email || auth.currentUser?.email || '').trim(),
      message: form.value.message || '',
      category: form.value.category || '',
      address: form.value.address || '',
      extra: { category: form.value.category || '', address: form.value.address || '' },
      ownerId: uid.value,
      createdByUid: uid.value,
      createdByEmail: auth.currentUser?.email || '',
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } else {
    await addDoc(collection(fbDb, 'applications'), {
      type: appTypeForCreate.value,                // 'store' | 'partner'
      companyName: form.value.name,
      contactName: form.value.contactName || '',
      phone: form.value.phone || '',
      email: (form.value.email || auth.currentUser?.email || '').trim(),
      message: form.value.message || '',
      extra: { category: form.value.category || '', address: form.value.address || '' },
      createdByUid: uid.value,
      createdByEmail: auth.currentUser?.email || '',
      status: 'pending',
      createdAt: serverTimestamp(),
    })
  }

  closeDlg()
}

/* ── 외부 이벤트로 폼 열기(배너/버튼) ── */
let openBizCreateHandler = null
onMounted(() => {
  openBizCreateHandler = () => { if (mode.value==='enterprise') openCreate() }
  window.addEventListener('open-biz-create', openBizCreateHandler)
})
onUnmounted(() => {
  if (openBizCreateHandler) {
    window.removeEventListener('open-biz-create', openBizCreateHandler)
    openBizCreateHandler = null
  }
})

/* ── 공용 컴포넌트 ── */
const Empty = { props: { label: String }, template: `<div class="empty">{{ label }}</div>` }
const categoryLabel = computed(() => props.category || '전체')
</script>

<style scoped>
.biz-manage { margin: 8px 0 16px; border: 1px solid #eee; border-radius: 14px; background: #fff; }
.tabs { display:flex; align-items:center; padding:10px; gap:6px; border-bottom:1px solid #f1f1f1; }
.tab { padding:8px 12px; border-radius:20px; background:#f6f6f8; }
.tab.active { background:#ff2e87; color:#fff; font-weight:700; }
.spacer { flex:1; }
.cat-chip { font-size:12px; padding:4px 8px; border:1px solid #eee; border-radius:14px; background:#fafafa; }

.panel { padding:10px; }
.pane-head { display:flex; align-items:center; gap:8px; }
.pane-head .btn { margin-left:auto; }
.hint { margin:8px 0 14px; color:#777; font-size:13px; }

.cards { display:grid; grid-template-columns:1fr; gap:10px; }
.card { border:1px solid #eee; border-radius:12px; padding:10px; background:#fff; }
.row { display:flex; align-items:flex-start; gap:8px; }
.name { font-weight:900; }
.type-chip { font-weight:700; font-size:12px; color:#777; margin-left:4px; }
.meta { display:block; font-size:12px; color:#666; }
.meta2 { font-size:12px; color:#888; margin-top:4px; }
.sep { margin: 0 6px; color:#ccc; }
.extra { font-size:12px; color:#555; margin-top:4px; }
.gap { flex:1; }

dialog::backdrop { background: rgba(0,0,0,.35); }
dialog { border:none; border-radius:14px; padding:0; }
.editor { padding:16px; width:92vw; max-width:520px; }
.editor h3 { margin-bottom:12px; }
.editor label { display:block; margin:8px 0; }
.editor input, .editor textarea { width:100%; padding:10px; border:1px solid #e6e6ea; border-radius:10px; }
.editor textarea { resize: vertical; min-height: 88px; }
.editor .rows { display:flex; align-items:center; gap:8px; margin-top:12px; }

.btn { padding:8px 12px; border-radius:10px; background:#f6f6f8; }
.btn.primary { background:#ff2e87; color:#fff; font-weight:700; }
.btn.danger { background:#ef4444; color:#fff; }
.empty { padding:24px; text-align:center; color:#888; }
</style>
