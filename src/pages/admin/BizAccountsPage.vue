<!--
  src/pages/admin/BizAccountsPage.vue
  업체(Biz) 계정 관리 — 플랫폼 관리자(gangtalk815@gmail.com) 전용.
  - users 컬렉션에서 type='company' + accountKind='storeOwner' 조회
  - 신규 계정 생성 / 비번 재설정 / 가게 연결 모달
  - Cloud Functions: createBizAccount / resetBizPassword / linkStoreToBiz
-->
<template>
  <div class="adm-page">
    <header class="adm-page-head">
      <h2 class="adm-page-title">👥 업체 계정 관리</h2>
      <p class="adm-page-sub">업체용 로그인 계정을 생성하고 가게에 연결합니다.</p>
    </header>

    <section class="adm-section">
      <header class="adm-section-head">
        <h3>업체 계정 ({{ accounts.length }}개)</h3>
        <div class="adm-section-actions">
          <button class="adm-btn primary" type="button" @click="openCreate">
            + 새 업체 계정 생성
          </button>
        </div>
      </header>

      <ul class="adm-acc-list" v-if="accounts.length">
        <li v-for="a in accounts" :key="a.id" class="adm-acc-row">
          <div class="adm-acc-meta">
            <strong class="adm-acc-name">{{ a.company?.name || a.profile?.nickname || '(이름 없음)' }}</strong>
            <span class="adm-acc-email">{{ a.profile?.email || '-' }}</span>
            <span class="adm-acc-store">
              <template v-if="storesByEmail[(a.profile?.email||'').toLowerCase()]?.length">
                연결된 가게: <strong>{{ storesByEmail[(a.profile?.email||'').toLowerCase()].map(s => s.name).join(', ') }}</strong>
              </template>
              <template v-else>
                <span class="adm-acc-unlinked">연결된 가게 없음</span>
              </template>
            </span>
            <span class="adm-acc-time">{{ fmtTime(a.createdAt) }} 생성</span>
          </div>
          <div class="adm-acc-actions">
            <button class="adm-btn small" type="button" @click="openReset(a)">비번 재설정</button>
            <button class="adm-btn small" type="button" @click="openLink(a)">가게 연결</button>
          </div>
        </li>
      </ul>
      <p v-else class="adm-empty">아직 생성된 업체 계정이 없습니다.</p>
    </section>

    <!-- 신규 계정 생성 모달 -->
    <div v-if="modal === 'create'" class="adm-modal-mask" @click.self="modal = ''">
      <div class="adm-modal" role="dialog">
        <header class="adm-modal-head">
          <strong>새 업체 계정 생성</strong>
          <button class="adm-modal-close" type="button" @click="modal = ''">✕</button>
        </header>
        <div class="adm-modal-body">
          <label class="adm-field">
            <span>업체명 *</span>
            <input v-model.trim="form.storeName" type="text" placeholder="예: 라운지 G" />
          </label>
          <label class="adm-field">
            <span>이메일 *</span>
            <input v-model.trim="form.email" type="email" placeholder="biz@example.com" />
          </label>
          <label class="adm-field">
            <span>임시 비밀번호 (6자 이상) *</span>
            <input v-model="form.password" type="text" placeholder="업체에 전달할 임시 비번" />
          </label>
          <label class="adm-field">
            <span>연결할 가게 (선택)</span>
            <select v-model="form.storeId">
              <option value="">연결 안 함</option>
              <option v-for="s in stores" :key="s.id" :value="s.id">
                {{ s.name || '(이름 없음)' }} · {{ s.region || '-' }}
              </option>
            </select>
          </label>
          <p v-if="form.error" class="adm-form-error">{{ form.error }}</p>
        </div>
        <footer class="adm-modal-foot">
          <button class="adm-btn" type="button" @click="modal = ''">취소</button>
          <button class="adm-btn primary" type="button" :disabled="form.busy" @click="onCreate">
            {{ form.busy ? '생성 중…' : '계정 생성' }}
          </button>
        </footer>
      </div>
    </div>

    <!-- 비번 재설정 모달 -->
    <div v-if="modal === 'reset'" class="adm-modal-mask" @click.self="modal = ''">
      <div class="adm-modal" role="dialog">
        <header class="adm-modal-head">
          <strong>비밀번호 재설정</strong>
          <button class="adm-modal-close" type="button" @click="modal = ''">✕</button>
        </header>
        <div class="adm-modal-body">
          <p class="adm-modal-hint">{{ form.targetEmail }} 의 새 비밀번호를 설정합니다.</p>
          <label class="adm-field">
            <span>새 비밀번호 (6자 이상) *</span>
            <input v-model="form.password" type="text" placeholder="새 비번" />
          </label>
          <p v-if="form.error" class="adm-form-error">{{ form.error }}</p>
        </div>
        <footer class="adm-modal-foot">
          <button class="adm-btn" type="button" @click="modal = ''">취소</button>
          <button class="adm-btn primary" type="button" :disabled="form.busy" @click="onReset">
            {{ form.busy ? '변경 중…' : '비번 변경' }}
          </button>
        </footer>
      </div>
    </div>

    <!-- 가게 연결 모달 -->
    <div v-if="modal === 'link'" class="adm-modal-mask" @click.self="modal = ''">
      <div class="adm-modal" role="dialog">
        <header class="adm-modal-head">
          <strong>가게 연결</strong>
          <button class="adm-modal-close" type="button" @click="modal = ''">✕</button>
        </header>
        <div class="adm-modal-body">
          <p class="adm-modal-hint">{{ form.targetEmail }} 에 가게를 연결합니다.</p>
          <label class="adm-field">
            <span>연결할 가게 *</span>
            <select v-model="form.storeId">
              <option value="">선택…</option>
              <option v-for="s in stores" :key="s.id" :value="s.id">
                {{ s.name || '(이름 없음)' }} · {{ s.region || '-' }}
                <template v-if="s.ownerEmail"> (현재: {{ s.ownerEmail }})</template>
              </option>
            </select>
          </label>
          <p v-if="form.error" class="adm-form-error">{{ form.error }}</p>
        </div>
        <footer class="adm-modal-foot">
          <button class="adm-btn" type="button" @click="modal = ''">취소</button>
          <button class="adm-btn primary" type="button" :disabled="form.busy" @click="onLink">
            {{ form.busy ? '연결 중…' : '연결' }}
          </button>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { db as fbDb } from '@/firebase'
import {
  collection, onSnapshot, query, where, limit,
} from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'

const fns = getFunctions(undefined, 'asia-northeast3')
const fnCreateBiz = httpsCallable(fns, 'createBizAccount')
const fnResetPw   = httpsCallable(fns, 'resetBizPassword')
const fnLinkStore = httpsCallable(fns, 'linkStoreToBiz')

const accounts = ref([])
const stores = ref([])
let unsubAccounts = null
let unsubStores = null

onMounted(() => {
  unsubAccounts = onSnapshot(
    query(
      collection(fbDb, 'users'),
      where('type', '==', 'company'),
      where('accountKind', '==', 'storeOwner'),
      limit(500),
    ),
    (snap) => { accounts.value = snap.docs.map(d => ({ id: d.id, ...d.data() })) },
    (err) => { console.warn('[BizAccounts] users subscribe error:', err) },
  )
  unsubStores = onSnapshot(
    query(collection(fbDb, 'stores'), limit(500)),
    (snap) => { stores.value = snap.docs.map(d => ({ id: d.id, ...d.data() })) },
  )
})
onBeforeUnmount(() => {
  if (unsubAccounts) try { unsubAccounts() } catch {}
  if (unsubStores)   try { unsubStores() } catch {}
})

const storesByEmail = computed(() => {
  const map = {}
  for (const s of stores.value) {
    const e = String(s.ownerEmail || '').toLowerCase()
    if (!e) continue
    if (!map[e]) map[e] = []
    map[e].push(s)
  }
  return map
})

/* ===== 모달 상태 ===== */
const modal = ref('') // '' | 'create' | 'reset' | 'link'
const form = ref({
  storeName: '',
  email: '',
  password: '',
  storeId: '',
  targetUid: '',
  targetEmail: '',
  busy: false,
  error: '',
})

function resetForm() {
  form.value = {
    storeName: '', email: '', password: '', storeId: '',
    targetUid: '', targetEmail: '', busy: false, error: '',
  }
}

function openCreate() {
  resetForm()
  modal.value = 'create'
}
function openReset(a) {
  resetForm()
  form.value.targetUid = a.id
  form.value.targetEmail = a.profile?.email || ''
  modal.value = 'reset'
}
function openLink(a) {
  resetForm()
  form.value.targetUid = a.id
  form.value.targetEmail = a.profile?.email || ''
  modal.value = 'link'
}

/* ===== 액션 ===== */
async function onCreate() {
  if (form.value.busy) return
  form.value.error = ''
  const { storeName, email, password, storeId } = form.value
  if (!storeName || !email || !password) {
    form.value.error = '필수 항목을 입력해 주세요.'
    return
  }
  form.value.busy = true
  try {
    const res = await fnCreateBiz({ email, password, storeName, storeId: storeId || undefined })
    console.log('[createBizAccount] ok', res?.data)
    alert(`업체 계정 생성 완료: ${email}`)
    modal.value = ''
    resetForm()
  } catch (e) {
    console.error(e)
    form.value.error = '실패: ' + (e?.message || e?.code || e)
  } finally {
    form.value.busy = false
  }
}

async function onReset() {
  if (form.value.busy) return
  form.value.error = ''
  if (!form.value.password || form.value.password.length < 6) {
    form.value.error = '비밀번호는 6자 이상이어야 합니다.'
    return
  }
  form.value.busy = true
  try {
    await fnResetPw({ uid: form.value.targetUid, newPassword: form.value.password })
    alert('비밀번호가 변경되었습니다.')
    modal.value = ''
    resetForm()
  } catch (e) {
    console.error(e)
    form.value.error = '실패: ' + (e?.message || e?.code || e)
  } finally {
    form.value.busy = false
  }
}

async function onLink() {
  if (form.value.busy) return
  form.value.error = ''
  if (!form.value.storeId) {
    form.value.error = '연결할 가게를 선택해 주세요.'
    return
  }
  form.value.busy = true
  try {
    await fnLinkStore({
      storeId: form.value.storeId,
      bizUid: form.value.targetUid,
      bizEmail: form.value.targetEmail,
    })
    alert('가게가 연결되었습니다.')
    modal.value = ''
    resetForm()
  } catch (e) {
    console.error(e)
    form.value.error = '실패: ' + (e?.message || e?.code || e)
  } finally {
    form.value.busy = false
  }
}

function fmtTime(v) {
  if (!v) return ''
  const ms = v?.toDate ? v.toDate().getTime()
           : (typeof v?.seconds === 'number' ? v.seconds * 1000 : Number(v) || 0)
  if (!ms) return ''
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
</script>

<style scoped>
.adm-page{ max-width:1100px; margin:0 auto; }
.adm-page-head{ margin-bottom:14px; }
.adm-page-title{ margin:0; font-size:22px; font-weight:900; }
.adm-page-sub{ margin:4px 0 0; font-size:13px; color:#888; }

.adm-section{
  background:#fff; border:1px solid #f0f0f0; border-radius:14px;
  padding:16px 20px;
}
.adm-section-head{
  display:flex; align-items:center; justify-content:space-between;
  gap:10px; margin-bottom:10px; flex-wrap:wrap;
}
.adm-section-head h3{ margin:0; font-size:15px; font-weight:800; }

.adm-btn{
  height:34px; padding:0 14px;
  border:1px solid #eee; background:#fafafa; color:#333;
  border-radius:10px; font-weight:700; font-size:13px;
  cursor:pointer; white-space:nowrap;
}
.adm-btn.primary{ background:#ff2e7e; border-color:#ff2e7e; color:#fff; }
.adm-btn.primary:disabled{ opacity:.6; cursor:not-allowed; }
.adm-btn.small{ height:30px; padding:0 10px; font-size:12px; border-radius:8px; }

.adm-acc-list{ list-style:none; margin:0; padding:0; }
.adm-acc-row{
  display:flex; align-items:center; gap:14px;
  padding:14px 0;
  border-bottom:1px solid #f5f5f5;
}
.adm-acc-row:last-child{ border-bottom:none; }
.adm-acc-meta{ flex:1; min-width:0; display:flex; flex-direction:column; gap:3px; }
.adm-acc-name{ font-size:15px; font-weight:800; }
.adm-acc-email{ font-size:13px; color:#444; }
.adm-acc-store{ font-size:12px; color:#666; }
.adm-acc-unlinked{ color:#bbb; }
.adm-acc-time{ font-size:11px; color:#aaa; }
.adm-acc-actions{ display:flex; gap:6px; flex:none; }

.adm-empty{ color:#aaa; font-size:13px; padding:20px 0; text-align:center; }

/* 모달 */
.adm-modal-mask{
  position:fixed; inset:0; background:rgba(0,0,0,.4);
  z-index:1000;
  display:flex; align-items:center; justify-content:center;
  padding:16px;
}
.adm-modal{
  width:100%; max-width:480px;
  background:#fff; border-radius:16px;
  box-shadow:0 12px 40px rgba(0,0,0,.25);
  display:flex; flex-direction:column;
  max-height:85vh;
}
.adm-modal-head{
  display:flex; align-items:center; justify-content:space-between;
  padding:14px 18px; border-bottom:1px solid #eee;
}
.adm-modal-head strong{ font-size:15px; font-weight:800; }
.adm-modal-close{
  background:transparent; border:none; font-size:18px;
  width:28px; height:28px; border-radius:50%; cursor:pointer;
}
.adm-modal-body{ padding:14px 18px; overflow-y:auto; display:flex; flex-direction:column; gap:12px; }
.adm-modal-foot{
  display:flex; gap:8px; justify-content:flex-end;
  padding:12px 18px;
  border-top:1px solid #eee;
}
.adm-modal-hint{ font-size:13px; color:#666; margin:0 0 4px; }

.adm-field{ display:flex; flex-direction:column; gap:4px; }
.adm-field span{ font-size:12px; font-weight:700; color:#666; }
.adm-field input, .adm-field select{
  height:40px; padding:0 12px;
  border:1.5px solid #eee; border-radius:8px;
  font-size:14px; background:#fff;
}
.adm-field input:focus, .adm-field select:focus{
  outline:none; border-color:#ff2e7e;
}
.adm-form-error{
  margin:0; color:#c0392b; font-size:13px;
}

:root[data-theme="dark"] .adm-section,
:root[data-theme="black"] .adm-section,
:root[data-theme="dark"] .adm-modal,
:root[data-theme="black"] .adm-modal{ background:#1c1c1c; border-color:#2a2a2a; color:#eee; }
:root[data-theme="dark"] .adm-acc-row,
:root[data-theme="black"] .adm-acc-row,
:root[data-theme="dark"] .adm-modal-head,
:root[data-theme="black"] .adm-modal-head,
:root[data-theme="dark"] .adm-modal-foot,
:root[data-theme="black"] .adm-modal-foot{ border-color:#2a2a2a; }
:root[data-theme="dark"] .adm-field input,
:root[data-theme="dark"] .adm-field select,
:root[data-theme="black"] .adm-field input,
:root[data-theme="black"] .adm-field select{ background:#222; border-color:#2a2a2a; color:#eee; }
</style>
