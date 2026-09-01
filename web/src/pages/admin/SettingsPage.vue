<!--
  src/pages/admin/SettingsPage.vue
  관리자 설정 페이지 — 현황판 리셋 시각 조정.
  진단: docs/audit/2026-06-19-리셋시간-관리자조정-진단.md (방법 B)

  기능:
    - config/settings.resetHour (0~23) 조회/변경
    - 변경 저장 시 다음 매시 정각 트리거의 비교 시각 변경됨 (dailyResetHourly)
    - "지금 즉시 리셋" 버튼 (2중 confirm) — triggerResetNow Cloud Function 호출
    - 최근 리셋 정보 표시 (lastResetDate / lastResetAt / lastResetHour)

  범위 외: 주말 스킵, 켜고끄기 (의도) — 본 PR 은 시각 변경만.
-->
<template>
  <div class="adm-page">
    <header class="adm-page-head">
      <h2 class="adm-page-title">⚙️ 설정</h2>
      <p class="adm-page-sub">현황판 리셋 시각 (KST) 을 관리합니다. 매시 정각에 트리거되어 지정된 시각에 자동 리셋.</p>
    </header>

    <section class="adm-section">
      <header class="adm-section-head">
        <h3>현황판 리셋 시각</h3>
      </header>
      <p class="adm-hint">
        매일 지정된 시각(KST)에 <code>rooms_biz</code> 의 <code>needRooms / needPeople / matched</code> 가 0 으로 리셋됩니다.
        같은 날 두 번 이상 실행되지 않도록 <code>lastResetDate</code> 가드가 작동합니다.
      </p>

      <div class="adm-settings-grid">
        <label class="adm-field">
          <span>리셋 시각 (0~23)</span>
          <select v-model.number="form.resetHour" :disabled="saving">
            <option v-for="h in 24" :key="h - 1" :value="h - 1">
              {{ String(h - 1).padStart(2, '0') }}:00 ({{ h - 1 }}시)
            </option>
          </select>
        </label>

        <div class="adm-settings-actions">
          <button
            class="adm-btn primary"
            type="button"
            @click="onSaveResetHour"
            :disabled="saving || !dirty"
          >
            {{ saving ? '저장 중…' : (dirty ? '저장' : '저장됨') }}
          </button>
        </div>
      </div>

      <p v-if="saveMsg" :class="['adm-settings-msg', saveError ? 'is-error' : 'is-ok']">
        {{ saveMsg }}
      </p>
    </section>

    <section class="adm-section">
      <header class="adm-section-head">
        <h3>최근 리셋 정보</h3>
      </header>
      <div class="adm-settings-info">
        <div class="adm-settings-row">
          <span class="adm-settings-label">마지막 리셋 날짜</span>
          <span class="adm-settings-value">{{ lastInfo.date || '(아직 없음)' }}</span>
        </div>
        <div class="adm-settings-row">
          <span class="adm-settings-label">마지막 리셋 시각</span>
          <span class="adm-settings-value">{{ fmtTime(lastInfo.at) }}</span>
        </div>
        <div class="adm-settings-row">
          <span class="adm-settings-label">마지막 리셋 시각 (resetHour)</span>
          <span class="adm-settings-value">{{ lastInfo.hour != null ? `${lastInfo.hour}시` : '-' }}</span>
        </div>
        <div class="adm-settings-row">
          <span class="adm-settings-label">현재 설정된 resetHour</span>
          <span class="adm-settings-value">{{ form.resetHour != null ? `${form.resetHour}시` : '-' }}</span>
        </div>
      </div>
    </section>

    <section class="adm-section">
      <header class="adm-section-head">
        <h3>🔄 지금 즉시 리셋</h3>
      </header>
      <p class="adm-hint">
        시각 변경 직후 당일 바로 적용하고 싶을 때 사용합니다.
        실행 시 <code>rooms_biz</code> 전체가 즉시 0 으로 리셋되고 <code>lastResetDate</code> 가 오늘로 갱신됩니다.
        (같은 날 매시 스케줄러가 중복 실행하지 않음)
      </p>
      <button
        class="adm-btn danger"
        type="button"
        @click="onTriggerNow"
        :disabled="resetting"
      >
        {{ resetting ? '리셋 중…' : '🔄 지금 즉시 리셋' }}
      </button>
      <p v-if="resetMsg" :class="['adm-settings-msg', resetError ? 'is-error' : 'is-ok']">
        {{ resetMsg }}
      </p>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { db as fbDb } from '@/firebase'
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'

const fns = getFunctions(undefined, 'asia-northeast3')
const fnTriggerResetNow = httpsCallable(fns, 'triggerResetNow')

const form = reactive({ resetHour: 7 })
const remote = reactive({ resetHour: 7 })
const lastInfo = reactive({ date: '', at: null, hour: null })

const saving = ref(false)
const saveMsg = ref('')
const saveError = ref(false)

const resetting = ref(false)
const resetMsg = ref('')
const resetError = ref(false)

const dirty = computed(() => Number(form.resetHour) !== Number(remote.resetHour))

/* config/settings 구독 */
let unsub = null
onMounted(() => {
  unsub = onSnapshot(
    doc(fbDb, 'config', 'settings'),
    (snap) => {
      const d = snap.exists() ? (snap.data() || {}) : {}
      const h = Number(d.resetHour)
      const validHour = Number.isFinite(h) && h >= 0 && h <= 23 ? h : 7
      remote.resetHour = validHour
      // 첫 로드 시에만 form 동기 (사용자 입력 중에는 외부 변경 덮어쓰지 않음)
      if (!dirty.value) form.resetHour = validHour

      lastInfo.date = String(d.lastResetDate || '')
      lastInfo.at = d.lastResetAt || null
      const lh = Number(d.lastResetHour)
      lastInfo.hour = Number.isFinite(lh) ? lh : null
    },
    (err) => {
      console.warn('[SettingsPage] config/settings subscribe error:', err?.code || err?.message)
    },
  )
})
onBeforeUnmount(() => { if (unsub) try { unsub() } catch {} })

async function onSaveResetHour() {
  if (saving.value) return
  const h = Number(form.resetHour)
  if (!Number.isFinite(h) || h < 0 || h > 23) {
    saveError.value = true
    saveMsg.value = 'resetHour 는 0~23 사이여야 합니다.'
    return
  }
  saving.value = true
  saveMsg.value = ''
  saveError.value = false
  try {
    await setDoc(doc(fbDb, 'config', 'settings'), {
      resetHour: h,
      updatedAt: serverTimestamp(),
    }, { merge: true })
    saveMsg.value = `리셋 시각이 ${h}시로 저장되었습니다. 다음 ${h}시 정각에 자동 리셋됩니다.`
  } catch (e) {
    saveError.value = true
    saveMsg.value = '저장 실패: ' + (e?.message || e?.code || e)
  } finally {
    saving.value = false
  }
}

async function onTriggerNow() {
  if (resetting.value) return
  const c1 = window.confirm(
    '⚠️ 지금 즉시 현황판을 리셋하시겠습니까?\n\n' +
    'rooms_biz 전체의 needRooms / needPeople / matched 가 0 으로 초기화됩니다.\n' +
    '같은 날 매시 스케줄러는 중복 실행하지 않습니다.',
  )
  if (!c1) return
  const c2 = window.confirm('정말 즉시 리셋하시겠습니까?\n되돌릴 수 없습니다.')
  if (!c2) return

  resetting.value = true
  resetMsg.value = ''
  resetError.value = false
  try {
    const res = await fnTriggerResetNow({})
    const data = res?.data || {}
    const count = data?.count != null ? data.count : '?'
    resetMsg.value = `리셋 완료. (대상 ${count}건)`
  } catch (e) {
    resetError.value = true
    const code = e?.code || ''
    if (code === 'functions/permission-denied') {
      resetMsg.value = '권한 없음 — 관리자(gangtalk815@gmail.com) 만 호출 가능.'
    } else {
      resetMsg.value = '리셋 실패: ' + (e?.message || code || e)
    }
  } finally {
    resetting.value = false
  }
}

function fmtTime(v) {
  if (!v) return '-'
  let ms = null
  if (typeof v?.toMillis === 'function') ms = v.toMillis()
  else if (v instanceof Date) ms = v.getTime()
  else { const n = Number(v); if (!Number.isNaN(n) && n > 0) ms = n }
  if (!ms) return '-'
  const d = new Date(ms)
  return d.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
}
</script>

<style scoped>
.adm-page{ max-width:900px; margin:0 auto; }
.adm-page-head{ margin-bottom:16px; }
.adm-page-title{ margin:0; font-size:22px; font-weight:900; }
.adm-page-sub{ margin:6px 0 0; font-size:13px; color:#777; }

.adm-section{
  background:#fff; border:1px solid #eee; border-radius:14px;
  padding:18px 20px; margin-bottom:16px;
}
.adm-section-head{ margin-bottom:10px; }
.adm-section-head h3{ margin:0; font-size:15px; font-weight:800; }

.adm-hint{
  margin:0 0 14px; padding:10px 12px;
  background:#fafafa; border:1px solid #eee; border-radius:8px;
  font-size:12px; color:#666; line-height:1.6;
}
.adm-hint code{
  background:#fff; padding:1px 6px; border-radius:4px;
  border:1px solid #eee;
  font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color:#ff2e7e; font-weight:700; font-size:11px;
}

.adm-settings-grid{
  display:flex; gap:12px; align-items:flex-end; flex-wrap:wrap;
}
.adm-field{ display:flex; flex-direction:column; gap:4px; min-width:240px; }
.adm-field span{ font-size:12px; font-weight:700; color:#666; }
.adm-field select{
  height:40px; padding:0 12px;
  border:1px solid #eee; border-radius:8px;
  background:#fff; font-size:14px; color:#333;
}
.adm-field select:focus{ outline:none; border-color:#ff2e7e; }
.adm-field select:disabled{ opacity:.6; cursor:not-allowed; }

.adm-settings-actions{ display:flex; gap:8px; }

.adm-btn{
  height:40px; padding:0 16px;
  border:1px solid #eee; background:#fff; color:#333;
  border-radius:8px; font-size:13px; font-weight:700; cursor:pointer;
  transition: background .12s, border-color .12s, color .12s;
}
.adm-btn:hover:not(:disabled){ border-color:#ff2e7e; color:#ff2e7e; }
.adm-btn.primary{ background:#ff2e7e; border-color:#ff2e7e; color:#fff; }
.adm-btn.primary:hover:not(:disabled){ background:#e0246b; border-color:#e0246b; color:#fff; }
.adm-btn.danger{ background:#fff; border-color:#c0392b; color:#c0392b; }
.adm-btn.danger:hover:not(:disabled){ background:#c0392b; color:#fff; }
.adm-btn:disabled{ opacity:.5; cursor:not-allowed; }

.adm-settings-msg{
  margin:10px 0 0; padding:8px 12px;
  border-radius:6px; font-size:13px;
}
.adm-settings-msg.is-ok{
  background:#f0fdf4; border:1px solid #bbf7d0; color:#2e8b57;
}
.adm-settings-msg.is-error{
  background:#fff5f5; border:1px solid #fecaca; color:#c0392b;
}

.adm-settings-info{
  display:flex; flex-direction:column; gap:6px;
}
.adm-settings-row{
  display:flex; gap:10px; align-items:center;
  font-size:13px;
}
.adm-settings-label{
  min-width:200px; color:#888; font-weight:600;
}
.adm-settings-value{
  flex:1; color:#222; font-weight:700;
  word-break:break-all;
}

@media (max-width:560px){
  .adm-settings-grid{ flex-direction:column; align-items:stretch; }
  .adm-field{ min-width:0; }
  .adm-settings-actions{ width:100%; }
  .adm-btn{ flex:1; }
  .adm-settings-row{ flex-direction:column; align-items:flex-start; gap:2px; }
  .adm-settings-label{ min-width:0; font-size:11px; }
}

/* 다크모드 */
:root[data-theme="dark"] .adm-section,
:root[data-theme="black"] .adm-section{ background:#1c1c1c; border-color:#2a2a2a; color:#eee; }
:root[data-theme="dark"] .adm-hint,
:root[data-theme="black"] .adm-hint{ background:#222; border-color:#2a2a2a; color:#aaa; }
:root[data-theme="dark"] .adm-hint code,
:root[data-theme="black"] .adm-hint code{ background:#1c1c1c; border-color:#3a2030; color:#ff86b9; }
:root[data-theme="dark"] .adm-field select,
:root[data-theme="black"] .adm-field select{ background:#222; border-color:#2a2a2a; color:#eee; }
:root[data-theme="dark"] .adm-btn,
:root[data-theme="black"] .adm-btn{ background:#222; border-color:#2a2a2a; color:#ddd; }
:root[data-theme="dark"] .adm-settings-label,
:root[data-theme="black"] .adm-settings-label{ color:#999; }
:root[data-theme="dark"] .adm-settings-value,
:root[data-theme="black"] .adm-settings-value{ color:#eee; }
:root[data-theme="dark"] .adm-settings-msg.is-ok,
:root[data-theme="black"] .adm-settings-msg.is-ok{
  background:#0a2010; border-color:#205a30; color:#80ff80;
}
:root[data-theme="dark"] .adm-settings-msg.is-error,
:root[data-theme="black"] .adm-settings-msg.is-error{
  background:#2a1010; border-color:#5a2020; color:#ff8080;
}
</style>
