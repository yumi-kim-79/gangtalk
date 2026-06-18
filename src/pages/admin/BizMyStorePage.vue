<!--
  src/pages/admin/BizMyStorePage.vue
  업체 본인 가게 정보 수정 — 가게명/카테고리/지역/설명/주소/전화/영업시간/휴무일/시급/대표이미지.
  stores/{id} 업데이트.
  본인 가게는 stores.ownerId === uid || stores.ownerEmail === email 로 찾는다.
  대표이미지는 파일 업로드 (Storage: stores/{storeId}/thumb-{ts}.jpg) 또는 URL 둘 다 가능.
-->
<template>
  <div class="adm-page">
    <header class="adm-page-head">
      <h2 class="adm-page-title">🏢 업체 정보 수정</h2>
      <p class="adm-page-sub">가게 정보를 수정하면 가게찾기/현황판에 반영됩니다.</p>
    </header>

    <!-- 가게 선택 -->
    <section v-if="myStores.length > 1" class="adm-section adm-selector">
      <label>
        <span>가게 선택</span>
        <select v-model="selectedStoreId">
          <option v-for="s in myStores" :key="s.id" :value="s.id">{{ s.name || '(이름 없음)' }}</option>
        </select>
      </label>
    </section>

    <section v-if="!loading && !myStores.length" class="adm-section empty-state">
      <p class="adm-empty">
        아직 연결된 가게가 없습니다.<br />
        관리자에게 가게 연결을 요청해 주세요.
      </p>
    </section>

    <section v-else-if="currentStore" class="adm-section">
      <h3 class="adm-section-title">{{ currentStore.name || '(이름 없음)' }} 정보 수정</h3>

      <div class="adm-form-grid">
        <label class="adm-field">
          <span>가게명 *</span>
          <input v-model.trim="form.name" type="text" placeholder="가게 이름" />
        </label>

        <label class="adm-field">
          <span>전화번호</span>
          <input v-model.trim="form.phone" type="tel" placeholder="010-0000-0000" />
        </label>

        <label class="adm-field">
          <span>카테고리</span>
          <select v-model="form.category">
            <option v-for="c in categoryOptions" :key="c.key" :value="c.key">{{ c.label }}</option>
          </select>
        </label>

        <label class="adm-field">
          <span>지역</span>
          <select v-model="form.region">
            <option v-for="r in regionOptions" :key="r" :value="r">{{ r }}</option>
          </select>
        </label>

        <label class="adm-field full">
          <span>한 줄 소개</span>
          <input v-model.trim="form.desc" type="text" maxlength="40" placeholder="가게 한 줄 소개 (16자 내외)" />
        </label>

        <label class="adm-field full">
          <span>상세 설명</span>
          <textarea v-model.trim="form.detailDesc" rows="4" placeholder="가게 상세 설명"></textarea>
        </label>

        <label class="adm-field full">
          <span>주소</span>
          <input v-model.trim="form.address" type="text" placeholder="가게 주소" />
        </label>

        <label class="adm-field">
          <span>영업시간</span>
          <input v-model.trim="form.hours" type="text" placeholder="예: 18:00 - 02:00" />
        </label>

        <label class="adm-field">
          <span>휴무일</span>
          <input v-model.trim="form.closed" type="text" placeholder="예: 매주 일요일" />
        </label>

        <label class="adm-field">
          <span>시급 / 일급 / 월급</span>
          <select v-model="form.wageType">
            <option v-for="w in wageTypeOptions" :key="w.key" :value="w.key">{{ w.label }}</option>
          </select>
        </label>

        <label class="adm-field">
          <span>금액 (원)</span>
          <input
            :value="wageDisplay"
            @input="onWageInput"
            type="text"
            inputmode="numeric"
            placeholder="예: 15000"
          />
        </label>

        <div class="adm-field full">
          <span>대표 이미지</span>
          <div class="adm-thumb-row">
            <input
              ref="fileInputRef"
              type="file"
              accept="image/*"
              class="adm-thumb-file"
              :disabled="uploading"
              @change="onPickImage"
            />
            <button
              type="button"
              class="adm-btn"
              :disabled="uploading"
              @click="triggerFilePick"
            >{{ uploading ? '업로드 중…' : '사진 선택' }}</button>
          </div>
          <input
            v-model.trim="form.thumb"
            type="text"
            placeholder="또는 이미지 URL 직접 입력 (https://...)"
          />
          <img v-if="form.thumb" :src="form.thumb" class="adm-thumb-preview" alt="대표 이미지" />
        </div>
      </div>

      <footer class="adm-section-foot">
        <button class="adm-btn primary big" type="button" :disabled="saving" @click="onSave">
          {{ saving ? '저장 중…' : '저장' }}
        </button>
      </footer>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { db as fbDb, storage as fbStorage } from '@/firebase'
import {
  collection, doc, onSnapshot, updateDoc,
  query, where, serverTimestamp,
} from 'firebase/firestore'
import {
  ref as sRef, uploadBytes, getDownloadURL,
} from 'firebase/storage'

/* 사용자 화면이 읽는 필드 매핑 (StoreDetail.vue:417, StoreFinder/MainPage 의 mapCat) */
const categoryOptions = [
  { key:'hopper',  label:'하퍼' },
  { key:'point5',  label:'쩜오' },
  { key:'ten',     label:'텐카페' },
  { key:'tenpro',  label:'텐프로' },
  { key:'onep',    label:'1%' },
  { key:'nrb',     label:'노래방' },
  { key:'kara',    label:'가라오케' },
  { key:'bar',     label:'바' },
  { key:'lounge',  label:'라운지' },
]
const regionOptions = ['강남', '비강남', '경기', '인천']
const wageTypeOptions = [
  { key:'hourly',  label:'시급' },
  { key:'daily',   label:'일급' },
  { key:'monthly', label:'월급' },
  { key:'etc',     label:'기타' },
]

const route = useRoute()

const currentEmail = ref('')
const currentUid = ref('')
const loading = ref(true)
const stores = ref([])
const selectedStoreId = ref('')

let unsubAuth = null
let unsubStoresByUid = null
let unsubStoresByEmail = null

function startStoresWatch(uid, email) {
  if (unsubStoresByUid)  try { unsubStoresByUid()  } catch {}
  if (unsubStoresByEmail) try { unsubStoresByEmail() } catch {}
  stores.value = []

  const merged = new Map()
  const onResult = () => {
    stores.value = Array.from(merged.values())
    if (!selectedStoreId.value || !merged.has(selectedStoreId.value)) {
      const fromQuery = String(route.query.storeId || '')
      if (fromQuery && merged.has(fromQuery)) selectedStoreId.value = fromQuery
      else if (stores.value[0]) selectedStoreId.value = stores.value[0].id
    }
    loading.value = false
  }
  if (uid) {
    unsubStoresByUid = onSnapshot(
      query(collection(fbDb, 'stores'), where('ownerId', '==', uid)),
      (snap) => { for (const d of snap.docs) merged.set(d.id, { id: d.id, ...d.data() }); onResult() },
      () => { loading.value = false },
    )
  }
  if (email) {
    unsubStoresByEmail = onSnapshot(
      query(collection(fbDb, 'stores'), where('ownerEmail', '==', email)),
      (snap) => { for (const d of snap.docs) merged.set(d.id, { id: d.id, ...d.data() }); onResult() },
      () => { loading.value = false },
    )
  }
  if (!uid && !email) loading.value = false
}

onMounted(() => {
  const auth = getAuth()
  unsubAuth = onAuthStateChanged(auth, (u) => {
    currentEmail.value = String(u?.email || '').toLowerCase()
    currentUid.value = u?.uid || ''
    startStoresWatch(currentUid.value, currentEmail.value)
  })
})
onBeforeUnmount(() => {
  if (unsubAuth) try { unsubAuth() } catch {}
  if (unsubStoresByUid)  try { unsubStoresByUid()  } catch {}
  if (unsubStoresByEmail) try { unsubStoresByEmail() } catch {}
})

const myStores = computed(() => stores.value)
const currentStore = computed(() => stores.value.find(s => s.id === selectedStoreId.value) || null)

const form = ref({
  name: '', phone: '', desc: '', detailDesc: '',
  address: '', hours: '', closed: '', thumb: '',
  category: 'hopper', region: '강남',
  wage: 0, wageType: 'hourly',
})

watch(currentStore, (s) => {
  if (!s) return
  const cat = String(s.category || 'hopper').toLowerCase()
  form.value = {
    name:       s.name || '',
    phone:      s.phone || '',
    desc:       s.desc || '',
    detailDesc: s.detailDesc || '',
    address:    s.address || '',
    hours:      s.hours || '',
    closed:     s.closed || '',
    thumb:      s.thumb || '',
    category:   categoryOptions.some(c => c.key === cat) ? cat : 'hopper',
    region:     regionOptions.includes(s.region) ? s.region : '강남',
    wage:       Number(s.wage || 0),
    wageType:   wageTypeOptions.some(w => w.key === s.wageType) ? s.wageType : 'hourly',
  }
}, { immediate: true })

/* 시급 금액 입력 (숫자만 추출) */
const wageDisplay = computed(() => {
  const n = Number(form.value.wage || 0)
  return n ? String(n) : ''
})
function onWageInput(e) {
  const digits = String(e.target.value || '').replace(/[^\d]/g, '')
  form.value.wage = digits ? Number(digits) : 0
}

/* 대표이미지 파일 업로드 (StoreEditPage.vue:780-828 패턴 재활용) */
const fileInputRef = ref(null)
const uploading = ref(false)

function triggerFilePick() {
  if (uploading.value) return
  if (!currentStore.value?.id) {
    alert('가게가 선택되지 않았습니다.')
    return
  }
  try { fileInputRef.value?.click() } catch {}
}

async function fileToJpegBlob(file, maxW = 1280, quality = 0.85) {
  const img = new Image()
  const dataUrl = await new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result))
    fr.onerror = reject
    fr.readAsDataURL(file)
  })
  await new Promise(res => { img.onload = res; img.src = dataUrl })
  const scale = Math.min(1, maxW / img.width)
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, w, h)
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
  return blob || file
}

async function onPickImage(e) {
  const file = (e.target.files || [])[0]
  if (!file) return
  const storeId = currentStore.value?.id
  if (!storeId) {
    alert('가게가 선택되지 않았습니다.')
    return
  }
  uploading.value = true
  try {
    const blob = await fileToJpegBlob(file, 1280, 0.85)
    const ts = Date.now() + '_' + Math.random().toString(36).slice(2, 6)
    // 업로드 경로는 자기 가게 ID 만 사용 — storage.rules 가 isStoreOwner 로 차단해도
    // 코드에서도 자기 storeId 만 쓰도록 명시 (PR #74 storage 룰과 일치).
    const path = `stores/${storeId}/thumb-${ts}.jpg`
    const refOnStorage = sRef(fbStorage, path)
    await uploadBytes(refOnStorage, blob, {
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=60',
    })
    const url = await getDownloadURL(refOnStorage)
    const versioned = `${url}${url.includes('?') ? '&' : '?'}v=${ts}`
    form.value.thumb = versioned
  } catch (err) {
    console.warn('이미지 업로드 실패:', err)
    alert('이미지 업로드에 실패했습니다.\n' + (err?.message || err))
  } finally {
    uploading.value = false
    try { e.target.value = '' } catch {}
  }
}

const saving = ref(false)
async function onSave() {
  const s = currentStore.value
  if (!s) return
  if (saving.value) return
  if (!form.value.name) {
    alert('가게명을 입력해 주세요.')
    return
  }
  saving.value = true
  try {
    // thumb 변경 감지 — 새 URL 이면 thumbVer 함께 갱신 (사용자 화면 캐시 무력화)
    const thumbChanged = String(form.value.thumb || '') !== String(s.thumb || '')
    const payload = {
      name:       form.value.name,
      phone:      form.value.phone,
      desc:       form.value.desc,
      detailDesc: form.value.detailDesc,
      address:    form.value.address,
      hours:      form.value.hours,
      closed:     form.value.closed,
      thumb:      form.value.thumb,
      category:   form.value.category,
      region:     form.value.region,
      wage:       Number(form.value.wage || 0),
      wageType:   form.value.wageType,
      updatedAt:  serverTimestamp(),
    }
    if (thumbChanged) payload.thumbVer = Date.now()
    await updateDoc(doc(fbDb, 'stores', s.id), payload)
    alert('저장되었습니다.')
  } catch (e) {
    console.error(e)
    alert('저장 실패: ' + (e?.message || e))
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.adm-page{ max-width:900px; margin:0 auto; }
.adm-page-head{ margin-bottom:18px; }
.adm-page-title{ margin:0; font-size:22px; font-weight:900; }
.adm-page-sub{ margin:4px 0 0; font-size:13px; color:#888; }

.adm-section{
  background:#fff; border:1px solid #f0f0f0; border-radius:14px;
  padding:24px; margin-bottom:14px;
}
.adm-section.empty-state{ text-align:center; }
.adm-empty{ color:#aaa; font-size:14px; margin:0; }
.adm-selector label{ display:flex; flex-direction:column; gap:6px; }
.adm-selector span{ font-size:12px; font-weight:700; color:#666; }
.adm-selector select{
  height:40px; padding:0 12px;
  border:1.5px solid #eee; border-radius:10px;
  font-size:14px; background:#fff;
}
.adm-section-title{
  margin:0 0 18px; font-size:18px; font-weight:900;
}

.adm-form-grid{
  display:grid; grid-template-columns:1fr 1fr;
  gap:14px;
}
.adm-field{ display:flex; flex-direction:column; gap:4px; }
.adm-field.full{ grid-column:1 / -1; }
.adm-field span{ font-size:12px; font-weight:700; color:#666; }
.adm-field input, .adm-field textarea, .adm-field select{
  padding:10px 12px;
  border:1.5px solid #eee; border-radius:8px;
  font-size:14px; background:#fff;
  font-family:inherit;
}
.adm-field input{ height:40px; padding:0 12px; }
.adm-field select{ height:40px; padding:0 12px; }
.adm-field input:focus, .adm-field textarea:focus, .adm-field select:focus{
  outline:none; border-color:#ff2e7e;
}

.adm-thumb-row{
  display:flex; gap:8px; align-items:center;
  margin-bottom:8px;
}
.adm-thumb-file{
  display:none;
}
.adm-thumb-preview{
  margin-top:8px;
  max-width:200px; max-height:140px;
  border-radius:8px;
  object-fit:cover;
}

.adm-section-foot{
  display:flex; justify-content:flex-end;
  margin-top:20px;
  padding-top:16px;
  border-top:1px solid #f5f5f5;
}
.adm-btn{
  height:46px; padding:0 28px;
  border:1px solid #eee; background:#fafafa; color:#333;
  border-radius:10px; font-weight:700; font-size:14px;
  cursor:pointer;
}
.adm-btn.primary{ background:#ff2e7e; border-color:#ff2e7e; color:#fff; }
.adm-btn.big{ height:50px; font-size:15px; }
.adm-btn:disabled{ opacity:.6; cursor:not-allowed; }

@media (max-width:768px){
  .adm-form-grid{ grid-template-columns:1fr; }
}

:root[data-theme="dark"] .adm-section,
:root[data-theme="black"] .adm-section{ background:#1c1c1c; border-color:#2a2a2a; color:#eee; }
:root[data-theme="dark"] .adm-field input,
:root[data-theme="dark"] .adm-field textarea,
:root[data-theme="dark"] .adm-field select,
:root[data-theme="dark"] .adm-selector select,
:root[data-theme="black"] .adm-field input,
:root[data-theme="black"] .adm-field textarea,
:root[data-theme="black"] .adm-field select,
:root[data-theme="black"] .adm-selector select{ background:#222; border-color:#2a2a2a; color:#eee; }
</style>
