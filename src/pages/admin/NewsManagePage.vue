<!--
  src/pages/admin/NewsManagePage.vue
  뉴스/한줄 관리 — config/marketing.newsline 배열
-->
<template>
  <div class="adm-page">
    <header class="adm-page-head">
      <h2 class="adm-page-title">📰 뉴스/한줄 관리</h2>
      <p class="adm-page-sub">메인페이지 핫이슈 바에 노출되는 한줄 뉴스를 관리합니다.</p>
    </header>

    <section class="adm-section">
      <header class="adm-section-head">
        <h3>한줄 뉴스 목록 ({{ news.length }}개)</h3>
        <div class="adm-section-actions">
          <button class="adm-btn" type="button" @click="addNewsTop">+ 새 글(최상단)</button>
          <button class="adm-btn primary" type="button" :disabled="saving" @click="saveNews">
            {{ saving ? '저장 중…' : '저장' }}
          </button>
        </div>
      </header>

      <ul class="adm-news-list" v-if="news.length">
        <li v-for="(n, i) in news" :key="n.id || i" class="adm-news-row">
          <div class="adm-news-fields">
            <input
              class="adm-news-input"
              v-model.trim="n.text"
              type="text"
              placeholder="기사 한 줄을 입력하세요"
            />
            <label class="adm-chk">
              <input type="checkbox" v-model="n.badge" true-value="NEW" false-value="" />
              NEW
            </label>
          </div>
          <div class="adm-news-actions">
            <small class="adm-news-time">{{ fmtTime(n.createdAt) }}</small>
            <button class="adm-btn ghost small" :disabled="i===0" @click="move(i, -1)">위로</button>
            <button class="adm-btn ghost small" :disabled="i===news.length-1" @click="move(i, +1)">아래로</button>
            <button class="adm-btn ghost small danger" @click="remove(i)">삭제</button>
          </div>
        </li>
      </ul>
      <p v-else class="adm-empty">아직 작성된 뉴스가 없습니다. '새 글' 로 추가하세요.</p>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { getAuth } from 'firebase/auth'
import { db as fbDb } from '@/firebase'
import {
  doc, onSnapshot, setDoc, serverTimestamp,
} from 'firebase/firestore'

const news = ref([])
const saving = ref(false)
const loaded = ref(false)

let unsub = null

onMounted(() => {
  unsub = onSnapshot(
    doc(fbDb, 'config', 'marketing'),
    (snap) => {
      const data = snap.exists() ? (snap.data() || {}) : {}
      if (!loaded.value) {
        news.value = (Array.isArray(data.newsline) ? data.newsline : []).map((n, i) => ({
          id: n.id || `news_${Date.now()}_${i}`,
          text: String(n.text || ''),
          badge: String(n.badge || ''),
          createdAt: n.createdAt || Date.now(),
          author: n.author || '운영자',
        }))
        loaded.value = true
      }
    },
  )
})
onBeforeUnmount(() => { if (unsub) try { unsub() } catch {} })

function addNewsTop(){
  const auth = getAuth()
  const author = auth.currentUser?.email || '운영자'
  news.value = [{
    id: `news_${Date.now()}`,
    text: '',
    badge: 'NEW',
    createdAt: Date.now(),
    author,
  }, ...news.value]
}
function remove(i){
  if (!confirm('이 항목을 삭제할까요? (저장 시 반영)')) return
  const arr = news.value.slice()
  arr.splice(i, 1)
  news.value = arr
}
function move(i, dir){
  const ni = i + dir
  if (ni < 0 || ni >= news.value.length) return
  const arr = news.value.slice()
  const [it] = arr.splice(i, 1)
  arr.splice(ni, 0, it)
  news.value = arr
}

async function saveNews(){
  if (saving.value) return
  saving.value = true
  try {
    const payload = news.value
      .filter(n => (n.text || '').trim())
      .map(n => ({
        id: n.id,
        text: n.text,
        badge: n.badge || '',
        createdAt: n.createdAt || Date.now(),
        author: n.author || '운영자',
      }))
    await setDoc(
      doc(fbDb, 'config', 'marketing'),
      { newsline: payload, serverUpdatedAt: serverTimestamp(), updatedAt: Date.now() },
      { merge: true },
    )
    alert('저장되었습니다.')
  } catch (e) {
    console.error(e)
    alert('저장 실패: ' + (e?.message || e))
  } finally {
    saving.value = false
  }
}

function fmtTime(v){
  if (!v) return ''
  const ms = v?.toDate ? v.toDate().getTime()
           : (typeof v?.seconds === 'number' ? v.seconds * 1000 : Number(v) || 0)
  if (!ms) return ''
  const d = new Date(ms)
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
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
.adm-section-actions{ display:flex; gap:6px; }

.adm-btn{
  height:34px; padding:0 14px;
  border:1px solid #eee; background:#fafafa; color:#333;
  border-radius:10px; font-weight:700; font-size:13px;
  cursor:pointer;
}
.adm-btn.primary{ background:#ff2e7e; border-color:#ff2e7e; color:#fff; }
.adm-btn.primary:disabled{ opacity:.6; }
.adm-btn.ghost{ background:#fff; }
.adm-btn.small{ height:28px; padding:0 10px; font-size:12px; border-radius:8px; }
.adm-btn.danger{ color:#c0392b; }
.adm-btn:disabled{ opacity:.6; cursor:not-allowed; }

.adm-news-list{ list-style:none; margin:0; padding:0; }
.adm-news-row{
  padding:12px 0;
  border-bottom:1px solid #f5f5f5;
  display:flex; flex-direction:column; gap:8px;
}
.adm-news-row:last-child{ border-bottom:none; }
.adm-news-fields{ display:flex; gap:10px; align-items:center; }
.adm-news-input{
  flex:1; height:36px; padding:0 12px;
  border:1px solid #eee; border-radius:8px;
  font-size:14px; background:#fff;
}
.adm-news-input:focus{ outline:none; border-color:#ff2e7e; }
.adm-chk{
  display:inline-flex; align-items:center; gap:4px;
  font-size:12px; font-weight:700; color:#666;
}
.adm-news-actions{
  display:flex; gap:6px; align-items:center;
  font-size:11px;
}
.adm-news-time{ color:#aaa; flex:1; }

.adm-empty{ color:#aaa; font-size:13px; padding:20px 0; text-align:center; }

:root[data-theme="dark"] .adm-section,
:root[data-theme="black"] .adm-section{ background:#1c1c1c; border-color:#2a2a2a; }
:root[data-theme="dark"] .adm-news-input,
:root[data-theme="black"] .adm-news-input{ background:#222; border-color:#2a2a2a; color:#eee; }
:root[data-theme="dark"] .adm-news-row,
:root[data-theme="black"] .adm-news-row{ border-bottom-color:#2a2a2a; }
</style>
