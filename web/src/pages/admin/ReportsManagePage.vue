<!--
  src/pages/admin/ReportsManagePage.vue
  신고 관리 — Apple App Store 심사지침 1.2 의 "24시간 내 조치" 를 이행하는 화면.
  앱에서 접수된 reports/{id} 를 최신순으로 보여주고 처리 상태를 바꾼다.
-->
<template>
  <div class="adm-page">
    <header class="adm-page-head">
      <h2 class="adm-page-title">🚨 신고 관리</h2>
      <p class="adm-page-sub">
        앱에서 접수된 신고입니다. 심사지침상 <b>24시간 이내 검토</b>가 필요합니다.
      </p>
    </header>

    <div class="adm-viewtabs">
      <button
        v-for="t in tabs" :key="t.key" type="button"
        class="adm-viewtab" :class="{ active: tab === t.key }"
        @click="tab = t.key"
      >{{ t.label }} ({{ countOf(t.key) }})</button>
    </div>

    <section v-if="loading" class="adm-section empty-state">
      <p class="adm-empty">불러오는 중…</p>
    </section>

    <section v-else-if="!filtered.length" class="adm-section empty-state">
      <p class="adm-empty">
        {{ tab === 'pending' ? '미처리 신고가 없습니다.' : '해당하는 신고가 없습니다.' }}
      </p>
    </section>

    <ul v-else class="adm-rep-list">
      <li v-for="r in filtered" :key="r.id" class="adm-rep-row" :class="r.status">
        <div class="adm-rep-main">
          <div class="adm-rep-top">
            <span class="adm-rep-type">{{ typeLabel(r.targetType) }}</span>
            <span class="adm-rep-reason">{{ reasonLabel(r.reason) }}</span>
            <span class="adm-rep-badge" :class="r.status">{{ statusLabel(r.status) }}</span>
            <span class="adm-rep-time">{{ fmtTime(r.createdAt) }}</span>
          </div>

          <p v-if="r.excerpt" class="adm-rep-excerpt">{{ r.excerpt }}</p>
          <p v-if="r.detail" class="adm-rep-detail">“{{ r.detail }}”</p>

          <div class="adm-rep-meta">
            <span>신고자 <b>{{ r.reporterName || r.reporterUid }}</b></span>
            <span v-if="r.targetOwnerName || r.targetOwnerUid">
              대상 <b>{{ r.targetOwnerName || r.targetOwnerUid }}</b>
            </span>
            <span class="adm-rep-id">{{ r.targetType }}/{{ r.targetId }}</span>
          </div>
        </div>

        <div class="adm-rep-actions">
          <button
            v-if="r.status !== 'resolved'"
            class="adm-btn small primary" type="button"
            :disabled="!!busy[r.id]"
            @click="setStatus(r, 'resolved')"
          >조치 완료</button>
          <button
            v-if="r.status !== 'dismissed'"
            class="adm-btn small" type="button"
            :disabled="!!busy[r.id]"
            @click="setStatus(r, 'dismissed')"
          >반려</button>
          <button
            v-if="r.status !== 'pending'"
            class="adm-btn small" type="button"
            :disabled="!!busy[r.id]"
            @click="setStatus(r, 'pending')"
          >되돌리기</button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { db as fbDb } from '@/firebase'
import {
  collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc,
} from 'firebase/firestore'

const TYPE_LABEL = {
  post: '게시글', comment: '댓글', chat: '채팅', chotok: '초톡', user: '사용자',
}
const REASON_LABEL = {
  spam: '스팸·광고·도배',
  abuse: '욕설·혐오·괴롭힘',
  sexual: '음란물·성적 콘텐츠',
  illegal: '불법 정보·사기',
  privacy: '개인정보 노출',
  etc: '기타',
}
const STATUS_LABEL = { pending: '미처리', resolved: '조치 완료', dismissed: '반려' }

const typeLabel = (v) => TYPE_LABEL[v] || v || '-'
const reasonLabel = (v) => REASON_LABEL[v] || v || '-'
const statusLabel = (v) => STATUS_LABEL[v] || v || '-'

const tabs = [
  { key: 'pending', label: '미처리' },
  { key: 'resolved', label: '조치 완료' },
  { key: 'dismissed', label: '반려' },
  { key: 'all', label: '전체' },
]
const tab = ref('pending')

const rows = ref([])
const loading = ref(true)
const busy = ref({})
let unsub = null

onMounted(() => {
  unsub = onSnapshot(
    query(collection(fbDb, 'reports'), orderBy('createdAt', 'desc'), limit(300)),
    (snap) => {
      rows.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      loading.value = false
    },
    (e) => {
      console.warn('[Reports] subscribe fail', e)
      rows.value = []
      loading.value = false
    },
  )
})
onBeforeUnmount(() => { if (unsub) try { unsub() } catch {} })

const countOf = (key) =>
  key === 'all' ? rows.value.length : rows.value.filter(r => (r.status || 'pending') === key).length

const filtered = computed(() =>
  tab.value === 'all'
    ? rows.value
    : rows.value.filter(r => (r.status || 'pending') === tab.value),
)

async function setStatus(r, status) {
  if (busy.value[r.id]) return
  busy.value = { ...busy.value, [r.id]: true }
  try {
    await updateDoc(doc(fbDb, 'reports', r.id), {
      status,
      reviewedAt: serverTimestamp(),
    })
  } catch (e) {
    console.error(e)
    alert('상태 변경 실패: ' + (e?.message || e))
  } finally {
    const next = { ...busy.value }
    delete next[r.id]
    busy.value = next
  }
}

function fmtTime(v) {
  const ms = v?.toDate ? v.toDate().getTime()
           : (typeof v?.seconds === 'number' ? v.seconds * 1000 : Number(v) || 0)
  if (!ms) return ''
  const d = new Date(ms)
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
</script>

<style scoped>
.adm-page{ max-width:900px; margin:0 auto; }
.adm-page-head{ margin-bottom:12px; }
.adm-page-title{ margin:0; font-size:19px; font-weight:900; }
.adm-page-sub{ margin:3px 0 0; font-size:12px; color:#999; }

.adm-viewtabs{ display:flex; gap:6px; margin-bottom:10px; flex-wrap:wrap; }
.adm-viewtab{
  padding:7px 14px; border:1px solid #eee; border-radius:999px;
  background:#fff; font-size:13px; font-weight:700; color:#888; cursor:pointer;
}
.adm-viewtab.active{ border-color:#ff2e7e; background:#ff2e7e; color:#fff; }

.adm-section{ background:#fff; border:1px solid #f0f0f0; border-radius:14px; padding:20px; }
.adm-section.empty-state{ text-align:center; }
.adm-empty{ color:#aaa; font-size:14px; margin:0; }

.adm-rep-list{ list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:8px; }
.adm-rep-row{
  background:#fff; border:1px solid #f0f0f0; border-left:4px solid #ff2e7e;
  border-radius:12px; padding:14px;
  display:flex; gap:12px; align-items:flex-start; flex-wrap:wrap;
}
.adm-rep-row.resolved{ border-left-color:#21c36b; }
.adm-rep-row.dismissed{ border-left-color:#ccc; opacity:.7; }
.adm-rep-main{ flex:1; min-width:0; }

.adm-rep-top{ display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.adm-rep-type{
  font-size:11px; font-weight:800; color:#666;
  background:#f5f5f5; padding:2px 8px; border-radius:999px;
}
.adm-rep-reason{ font-size:14px; font-weight:800; color:#333; }
.adm-rep-badge{
  font-size:11px; font-weight:800; padding:2px 8px; border-radius:999px;
  background:#ffeaf2; color:#ff2e7e;
}
.adm-rep-badge.resolved{ background:#e9f7ef; color:#21c36b; }
.adm-rep-badge.dismissed{ background:#f5f5f5; color:#999; }
.adm-rep-time{ margin-left:auto; font-size:11px; color:#bbb; }

.adm-rep-excerpt{
  margin:8px 0 0; padding:8px 10px; background:#fafafa; border-radius:8px;
  font-size:13px; color:#555; word-break:break-all;
}
.adm-rep-detail{ margin:6px 0 0; font-size:13px; color:#777; }
.adm-rep-meta{
  margin-top:8px; display:flex; gap:10px; flex-wrap:wrap;
  font-size:11px; color:#999;
}
.adm-rep-meta b{ color:#666; }
.adm-rep-id{ color:#ccc; }

.adm-rep-actions{ display:flex; gap:6px; flex-wrap:wrap; }
.adm-btn{
  height:34px; padding:0 14px; border:1px solid #eee; background:#fafafa; color:#333;
  border-radius:8px; font-weight:700; font-size:13px; cursor:pointer; white-space:nowrap;
}
.adm-btn.primary{ background:#ff2e7e; border-color:#ff2e7e; color:#fff; }
.adm-btn.small{ height:32px; padding:0 12px; font-size:12px; }
.adm-btn:disabled{ opacity:.5; cursor:not-allowed; }

@media (max-width:480px){
  .adm-rep-actions{ width:100%; }
  .adm-rep-actions .adm-btn{ flex:1; }
}

:root[data-theme="dark"] .adm-rep-row,
:root[data-theme="black"] .adm-rep-row,
:root[data-theme="dark"] .adm-section,
:root[data-theme="black"] .adm-section{ background:#1c1c1c; border-color:#2a2a2a; color:#eee; }
:root[data-theme="dark"] .adm-rep-excerpt,
:root[data-theme="black"] .adm-rep-excerpt{ background:#242424; color:#ccc; }
</style>
