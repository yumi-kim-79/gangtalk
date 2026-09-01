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
      <p class="adm-page-sub">업체용 로그인 계정을 생성합니다. 업소 등록은 업체가 직접 진행합니다.</p>
    </header>

    <!-- 권한/구독 오류 배너 -->
    <div v-if="subscribeError" class="adm-error-banner">
      <strong>⚠️ 업체 계정 목록을 불러올 수 없습니다.</strong>
      <p>{{ subscribeError }}</p>
      <p class="adm-error-hint">
        firestore.rules 의 <code>/users/{uid}</code> 규칙에 <code>isAdmin()</code> 읽기 허용이
        포함되어 있는지 확인하고 <code>firebase deploy --only firestore:rules</code> 로 배포해 주세요.
      </p>
    </div>

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
                연결된 업소: <strong>{{ storesByEmail[(a.profile?.email||'').toLowerCase()].map(s => s.name).join(', ') }}</strong>
              </template>
              <template v-else>
                <span class="adm-acc-unlinked">연결된 업소 없음</span>
              </template>
            </span>
            <span class="adm-acc-time">{{ fmtTime(a.createdAt) }} 생성</span>
          </div>
          <div class="adm-acc-actions">
            <button class="adm-btn small" type="button" @click="openReset(a)">비번 재설정</button>
            <button class="adm-btn small" type="button" @click="openLink(a)">업소 연결</button>
            <button
              v-if="!isAdminEmail(a.profile?.email)"
              class="adm-btn small danger"
              type="button"
              :disabled="!!deleting[a.id]"
              @click="deleteAccount(a)"
              title="이 업체 계정과 연결된 출근업소를 모두 삭제합니다"
            >{{ deleting[a.id] ? '삭제 중…' : '계정 삭제' }}</button>
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
          <div class="adm-create-notice">
            <strong>💡 업소 연결은 불필요합니다</strong>
            <span>계정 생성 후 업체가 직접 로그인해 출근업소를 등록합니다. 등록 신청이 들어오면 <code>업소 관리 → 승인 대기</code> 탭에 표시됩니다.</span>
          </div>
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
          <p class="adm-modal-hint">{{ form.targetEmail }} 에 업소를 연결합니다.</p>
          <p class="adm-modal-subhint">
            ※ 일반적인 경우 업체가 직접 등록(자가등록) 하므로 본 기능은 불필요합니다.
            기존 업소의 소유자(ownerEmail) 를 수정하거나 데이터 마이그레이션 시에만 사용하세요.
          </p>
          <label class="adm-field">
            <span>연결할 업소 *</span>
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
const fnDeleteBiz = httpsCallable(fns, 'deleteBizAccount')

const ADMIN_EMAIL = 'gangtalk815@gmail.com'
function isAdminEmail(email) {
  return String(email || '').toLowerCase() === ADMIN_EMAIL
}

const accounts = ref([])
const stores = ref([])
const subscribeError = ref('')
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
    (snap) => {
      subscribeError.value = ''
      accounts.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    },
    (err) => {
      console.warn('[BizAccounts] users subscribe error:', err)
      const code = String(err?.code || '')
      if (code.includes('permission-denied')) {
        subscribeError.value = '권한 부족: 관리자 계정으로 users 컬렉션을 list 할 수 없습니다 (Firestore rules).'
      } else {
        subscribeError.value = String(err?.message || err)
      }
    },
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
  const { storeName, email, password } = form.value
  if (!storeName || !email || !password) {
    form.value.error = '필수 항목을 입력해 주세요.'
    return
  }
  form.value.busy = true
  try {
    // storeId 전달 안 함 — 업체가 자가등록 (BizMyStorePage 신규 등록 모드).
    // createBizAccount 의 storeId 는 선택적 파라미터라 함수 시그니처 변경 0.
    const res = await fnCreateBiz({ email, password, storeName })
    console.log('[createBizAccount] ok', res?.data)
    alert(
      `업체 계정 생성 완료: ${email}\n\n` +
      `이제 업체가 로그인해 직접 출근업소를 등록할 수 있습니다.\n` +
      `등록 신청이 들어오면 '업소 관리 → 승인 대기' 탭에서 승인해 주세요.`
    )
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
    form.value.error = '연결할 업소를 선택해 주세요.'
    return
  }
  form.value.busy = true
  try {
    await fnLinkStore({
      storeId: form.value.storeId,
      bizUid: form.value.targetUid,
      bizEmail: form.value.targetEmail,
    })
    alert('업소가 연결되었습니다.')
    modal.value = ''
    resetForm()
  } catch (e) {
    console.error(e)
    form.value.error = '실패: ' + (e?.message || e?.code || e)
  } finally {
    form.value.busy = false
  }
}

/* ===== 업체 계정 완전 삭제 (Cloud Function deleteBizAccount) =====
 * Auth 계정 + users 문서 + 연결된 출근업소(stores) 모두 삭제.
 * 2중 confirm + 중복 클릭 방지.
 * 관리자 본인(gangtalk815) 계정은 v-if 로 버튼 자체가 숨겨짐 + 백엔드도 차단.
 */
const deleting = ref({})

async function deleteAccount(a) {
  if (!a?.id || deleting.value[a.id]) return
  // 가드 — UI 에서도 한 번 더 차단 (v-if 외 추가 안전망)
  if (isAdminEmail(a.profile?.email)) {
    alert('관리자 본인 계정은 삭제할 수 없습니다.')
    return
  }

  const email = a.profile?.email || '(이메일 없음)'
  const companyName = a.company?.name || a.profile?.nickname || '(이름 없음)'
  const linkedStores = storesByEmail.value[(email || '').toLowerCase()] || []
  const linkedNames = linkedStores.map(s => s.name).filter(Boolean).join(', ') || '(연결된 업소 없음)'

  // 1차 확인
  const c1 = window.confirm(
    `'${companyName}' (${email}) 업체 계정을 삭제하시겠습니까?\n\n` +
    `다음 항목이 모두 삭제됩니다:\n` +
    `· Firebase Auth 계정 (로그인 영구 차단)\n` +
    `· users 문서\n` +
    `· 연결된 출근업소: ${linkedNames}\n` +
    `  (각 업소의 지표/별점/즐겨찾기/이미지도 함께 정리)\n\n` +
    `※ 제휴처(partners) 는 영향받지 않습니다.`
  )
  if (!c1) return

  // 2차 확인 — 더 강한 경고
  const c2 = window.confirm(
    `정말 '${email}' 업체 계정과 연결된 모든 데이터를 삭제하시겠습니까?\n` +
    `되돌릴 수 없습니다.`
  )
  if (!c2) return

  deleting.value = { ...deleting.value, [a.id]: true }
  try {
    const res = await fnDeleteBiz({ uid: a.id })
    const summary = res?.data?.summary
    const fails = []
    if (summary) {
      if (summary.usersDoc && !summary.usersDoc.ok) fails.push(`users(${summary.usersDoc.error || 'unknown'})`)
      if (summary.authUser && !summary.authUser.ok) fails.push(`auth(${summary.authUser.error || 'unknown'})`)
      const storesFails = (summary.stores || []).filter(s =>
        !s.storeDoc?.ok || !s.storage?.ok || !s.roomsBiz?.ok || !s.ratings?.ok || !s.favorites?.ok || !s.marketingRefs?.ok
      )
      if (storesFails.length) fails.push(`stores(${storesFails.length}건 일부 실패)`)
    }
    if (fails.length) {
      alert(`'${email}' 삭제 — 일부 단계 실패:\n` + fails.join('\n'))
    } else {
      alert(`'${email}' 업체 계정을 삭제했습니다.\n연결된 업소 ${summary?.stores?.length || 0}개도 함께 정리되었습니다.`)
    }
    // 로컬 리스트 즉시 제거 (onSnapshot 이 곧 반영)
    accounts.value = accounts.value.filter(x => x.id !== a.id)
  } catch (e) {
    console.error('[deleteAccount] fail', e)
    alert(`삭제 실패: ${e?.message || e?.code || e}`)
  } finally {
    const next = { ...deleting.value }
    delete next[a.id]
    deleting.value = next
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

.adm-error-banner{
  background:#fff5f5; border:1px solid #ffd0d0;
  border-radius:10px; padding:12px 16px; margin-bottom:14px;
  color:#c0392b; font-size:13px;
}
.adm-error-banner strong{ display:block; margin-bottom:4px; font-size:14px; }
.adm-error-banner p{ margin:2px 0; font-size:12px; }
.adm-error-banner .adm-error-hint{ color:#666; }
.adm-error-banner code{
  background:#fff; padding:1px 5px; border-radius:4px;
  font-size:11px; color:#c0392b;
}

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
.adm-btn.danger{
  color:#d92626; border-color:#f3b0b0; background:#fff;
}
.adm-btn.danger:hover:not(:disabled){
  background:#d92626; color:#fff; border-color:#d92626;
}
.adm-btn.danger:disabled{ opacity:.5; cursor:not-allowed; }

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

/* 모바일 보강 */
@media (max-width:768px){
  .adm-acc-row{ flex-direction:column; align-items:stretch; gap:10px; }
  .adm-acc-actions{ width:100%; }
  .adm-acc-actions .adm-btn{ flex:1; }
}

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
.adm-modal-subhint{
  font-size:12px; color:#999; line-height:1.5;
  margin:0 0 4px;
  padding:8px 10px;
  background:#fafafa; border-radius:8px;
}

/* 신규 계정 생성 모달 — 자가등록 안내 박스 */
.adm-create-notice{
  display:flex; flex-direction:column; gap:4px;
  padding:12px 14px;
  background:#fff5f8;
  border:1.5px solid #ffd6e4;
  border-radius:10px;
  color:#ff2e7e;
  margin-bottom:4px;
}
.adm-create-notice strong{ font-size:13px; font-weight:800; }
.adm-create-notice span{ font-size:12px; color:#666; line-height:1.5; }
.adm-create-notice code{
  background:#fff; padding:1px 5px; border-radius:4px;
  font-size:11px; color:#ff2e7e; border:1px solid #ffd6e4;
}
:root[data-theme="dark"] .adm-create-notice,
:root[data-theme="black"] .adm-create-notice{
  background:#2a1620; border-color:#3a2030; color:#ff86b9;
}
:root[data-theme="dark"] .adm-create-notice span,
:root[data-theme="black"] .adm-create-notice span{ color:#999; }
:root[data-theme="dark"] .adm-create-notice code,
:root[data-theme="black"] .adm-create-notice code{
  background:#1c1c1c; border-color:#3a2030; color:#ff86b9;
}
:root[data-theme="dark"] .adm-modal-subhint,
:root[data-theme="black"] .adm-modal-subhint{
  background:#222; color:#888;
}

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
