<!--
  src/pages/admin/InboxPage.vue
  관리자 메시지함 — adminInbox 컬렉션
-->
<template>
  <div class="adm-page">
    <header class="adm-page-head">
      <h2 class="adm-page-title">📬 메시지함</h2>
      <p class="adm-page-sub">사용자 문의 / 신청 알림 모음 (adminInbox)</p>
    </header>

    <section class="adm-section">
      <header class="adm-section-head">
        <h3>전체 메시지 ({{ messages.length }}개)</h3>
        <div class="adm-section-actions">
          <span class="adm-unread-tag" v-if="unreadCount > 0">미읽음 {{ unreadCount }}</span>
          <button class="adm-btn" type="button" :disabled="markingAll || unreadCount === 0" @click="markAllRead">
            {{ markingAll ? '처리 중…' : '모두 읽음 처리' }}
          </button>
        </div>
      </header>

      <ul class="adm-msg-list" v-if="messages.length">
        <li
          v-for="m in messages"
          :key="m.id"
          class="adm-msg-row"
          :class="{ unread: m.unread }"
          @click="toggleRead(m)"
        >
          <span class="adm-msg-dot" :class="{ unread: m.unread }" />
          <div class="adm-msg-body">
            <div class="adm-msg-head">
              <strong class="adm-msg-title">{{ m.title || m.subject || m.message || '(제목 없음)' }}</strong>
              <span class="adm-msg-time">{{ fmtTime(m.createdAt) }}</span>
            </div>
            <p class="adm-msg-text" v-if="m.body || m.content || m.detail">
              {{ m.body || m.content || m.detail }}
            </p>
            <p class="adm-msg-meta">
              <span v-if="m.from">발신: {{ m.from }}</span>
              <span v-if="m.type">유형: {{ m.type }}</span>
            </p>
          </div>
        </li>
      </ul>
      <p v-else class="adm-empty">메시지가 없습니다.</p>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { db as fbDb } from '@/firebase'
import {
  collection, doc, onSnapshot, updateDoc, getDocs,
  query, orderBy, where, limit, serverTimestamp,
} from 'firebase/firestore'

const messages = ref([])
const markingAll = ref(false)

let unsub = null

onMounted(() => {
  unsub = onSnapshot(
    query(collection(fbDb, 'adminInbox'), orderBy('createdAt', 'desc'), limit(200)),
    (snap) => {
      messages.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    },
  )
})
onBeforeUnmount(() => { if (unsub) try { unsub() } catch {} })

const unreadCount = computed(() =>
  messages.value.filter(m => m.unread === true).length,
)

async function toggleRead(m){
  try {
    await updateDoc(doc(fbDb, 'adminInbox', m.id), {
      unread: !m.unread,
      readAt: m.unread ? serverTimestamp() : null,
    })
  } catch (e) {
    console.warn('toggle read fail', e)
  }
}

async function markAllRead(){
  if (markingAll.value) return
  markingAll.value = true
  try {
    const qy = query(
      collection(fbDb, 'adminInbox'),
      where('unread', '==', true),
      limit(200),
    )
    const snap = await getDocs(qy)
    const ps = []
    snap.forEach(d => {
      ps.push(updateDoc(doc(fbDb, 'adminInbox', d.id), {
        unread: false,
        readAt: serverTimestamp(),
      }))
    })
    await Promise.allSettled(ps)
  } catch (e) {
    console.error(e)
    alert('일괄 읽음 처리 실패: ' + (e?.message || e))
  } finally {
    markingAll.value = false
  }
}

function fmtTime(v){
  if (!v) return ''
  const ms = v?.toDate ? v.toDate().getTime()
           : (typeof v?.seconds === 'number' ? v.seconds * 1000 : Number(v) || 0)
  if (!ms) return ''
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
</script>

<style scoped>
.adm-page{ max-width:1000px; margin:0 auto; }
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
.adm-section-actions{ display:flex; gap:6px; align-items:center; }

.adm-btn{
  height:34px; padding:0 14px;
  border:1px solid #eee; background:#fafafa; color:#333;
  border-radius:10px; font-weight:700; font-size:13px;
  cursor:pointer;
}
.adm-btn:disabled{ opacity:.6; cursor:not-allowed; }

.adm-unread-tag{
  background:#ff4d8d; color:#fff; font-size:11px;
  padding:3px 8px; border-radius:999px; font-weight:800;
}

.adm-msg-list{ list-style:none; margin:0; padding:0; }
.adm-msg-row{
  display:flex; gap:12px;
  padding:14px 12px;
  border-radius:10px;
  border-bottom:1px solid #f5f5f5;
  cursor:pointer;
  transition:background .12s;
}
.adm-msg-row:hover{ background:#fafafa; }
.adm-msg-row.unread{ background:#fff8fb; }
.adm-msg-row:last-child{ border-bottom:none; }

.adm-msg-dot{
  width:10px; height:10px; border-radius:50%;
  background:#ddd; flex:none; margin-top:8px;
}
.adm-msg-dot.unread{ background:#ff4d8d; }

.adm-msg-body{ flex:1; min-width:0; }
.adm-msg-head{
  display:flex; align-items:center; justify-content:space-between;
  gap:10px;
}
.adm-msg-title{ font-size:14px; font-weight:800; }
.adm-msg-time{ font-size:11px; color:#aaa; flex:none; }
.adm-msg-text{
  margin:6px 0 0; font-size:13px; color:#555;
  display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical;
  overflow:hidden;
}
.adm-msg-meta{
  margin:6px 0 0; font-size:11px; color:#888;
  display:flex; gap:10px;
}

.adm-empty{ color:#aaa; font-size:13px; padding:20px 0; text-align:center; }

:root[data-theme="dark"] .adm-section,
:root[data-theme="black"] .adm-section{ background:#1c1c1c; border-color:#2a2a2a; }
:root[data-theme="dark"] .adm-msg-row,
:root[data-theme="black"] .adm-msg-row{ border-bottom-color:#2a2a2a; }
:root[data-theme="dark"] .adm-msg-row:hover,
:root[data-theme="black"] .adm-msg-row:hover{ background:#242424; }
:root[data-theme="dark"] .adm-msg-row.unread,
:root[data-theme="black"] .adm-msg-row.unread{ background:#2a1a22; }
</style>
