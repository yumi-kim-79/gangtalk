<!--
  src/pages/admin/BizMyStorePage.vue
  업체 본인 가게 정보 수정 — 가게명/설명/주소/전화/영업시간/휴무일/대표이미지.
  stores/{id} 업데이트.
  본인 가게는 stores.ownerId === uid || stores.ownerEmail === email 로 찾는다.
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

        <label class="adm-field full">
          <span>대표 이미지 URL</span>
          <input v-model.trim="form.thumb" type="text" placeholder="https://..." />
          <img v-if="form.thumb" :src="form.thumb" class="adm-thumb-preview" alt="대표 이미지" />
        </label>
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
import { db as fbDb } from '@/firebase'
import {
  collection, doc, onSnapshot, updateDoc,
  query, where, serverTimestamp,
} from 'firebase/firestore'

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
})

watch(currentStore, (s) => {
  if (!s) return
  form.value = {
    name:       s.name || '',
    phone:      s.phone || '',
    desc:       s.desc || '',
    detailDesc: s.detailDesc || '',
    address:    s.address || '',
    hours:      s.hours || '',
    closed:     s.closed || '',
    thumb:      s.thumb || '',
  }
}, { immediate: true })

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
    await updateDoc(doc(fbDb, 'stores', s.id), {
      name: form.value.name,
      phone: form.value.phone,
      desc: form.value.desc,
      detailDesc: form.value.detailDesc,
      address: form.value.address,
      hours: form.value.hours,
      closed: form.value.closed,
      thumb: form.value.thumb,
      updatedAt: serverTimestamp(),
    })
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
.adm-field input, .adm-field textarea{
  padding:10px 12px;
  border:1.5px solid #eee; border-radius:8px;
  font-size:14px; background:#fff;
  font-family:inherit;
}
.adm-field input{ height:40px; padding:0 12px; }
.adm-field input:focus, .adm-field textarea:focus{
  outline:none; border-color:#ff2e7e;
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
:root[data-theme="dark"] .adm-selector select,
:root[data-theme="black"] .adm-field input,
:root[data-theme="black"] .adm-field textarea,
:root[data-theme="black"] .adm-selector select{ background:#222; border-color:#2a2a2a; color:#eee; }
</style>
