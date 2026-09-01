<!-- src/components/mypage/AdminNewsManager.vue -->
<template>
  <section class="admin-card">
    <header class="admin-card__header">
      <h3>기사한줄 관리</h3>
      <button class="save" :disabled="saving" @click="onSave">저장</button>
    </header>

    <div class="hint">최신 1개는 메인 상단, 나머지는 리스트에 노출됩니다.</div>

    <ul class="news-list">
      <li v-for="(n, i) in items" :key="n._id" class="news-item">
        <div class="row">
          <input v-model="n.title" class="title" type="text" placeholder="제목" />
          <label class="chk">
            <input type="checkbox" v-model="n.isNew" />
            <span>NEW</span>
          </label>
        </div>

        <div class="row">
          <input v-model="n.url" class="url" type="text" placeholder="링크(선택)" />
          <span class="age">{{ ageText(n.createdAt) }}</span>
        </div>

        <div class="cmds">
          <button @click="moveUp(i)"   :disabled="i===0">위로</button>
          <button @click="moveDown(i)" :disabled="i===items.length-1">아래로</button>
          <button class="danger" @click="removeAt(i)">삭제</button>
        </div>
      </li>
    </ul>

    <div class="footer">
      <button @click="addOne">+ 새 글(상단)</button>
      <button class="save" :disabled="saving" @click="onSave">저장</button>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db as fbDb } from '@/firebase'

const saving = ref(false)
const items  = ref([])

/* === 유틸 === */
const newId = () => Math.random().toString(36).slice(2, 10)
const nowMs = () => Date.now()

function normalize(raw) {
  const arr = Array.isArray(raw) ? raw : []
  return arr.map(v => ({
    _id: v?._id || v?.id || newId(),
    title: String(v?.title || ''),
    url: v?.url ? String(v.url) : '',
    isNew: !!v?.isNew,
    createdAt: typeof v?.createdAt === 'number' ? v.createdAt : nowMs(),
  }))
}

function ageText(ts) {
  if (!ts) return ''
  const diff = Math.max(0, nowMs() - ts)
  const day = Math.floor(diff / (24*60*60*1000))
  if (day === 0) return '오늘 작성'
  return `${day}일 전 작성`
}

/* === 배열 이동: 표준 splice 만 사용 === */
function arrayMove(arr, from, to) {
  if (!Array.isArray(arr)) return
  if (from === to) return
  if (from < 0 || from >= arr.length) return
  if (to   < 0 || to   >= arr.length) return
  const el = arr.splice(from, 1)[0]
  arr.splice(to, 0, el)
}

/* === 액션 === */
function addOne() {
  items.value.unshift({
    _id: newId(),
    title: '',
    url: '',
    isNew: true,
    createdAt: nowMs(),
  })
}

function removeAt(i) {
  items.value.splice(i, 1)
}

function moveUp(i) {
  arrayMove(items.value, i, i - 1)
}

function moveDown(i) {
  arrayMove(items.value, i, i + 1)
}

async function onSave() {
  if (!fbDb) return
  saving.value = true
  try {
    // 빈 제목은 저장에서 제외 (노출 안정성)
    const payload = items.value
      .filter(x => String(x.title || '').trim().length > 0)
      .map(({ _id, title, url, isNew, createdAt }) => ({
        id: _id, title: String(title || ''), url: String(url || ''), isNew: !!isNew, createdAt: Number(createdAt)||nowMs(),
      }))

    await setDoc(
      doc(fbDb, 'config', 'news'),
      { items: payload, updatedAt: serverTimestamp() },
      { merge: true },
    )
    alert('저장되었습니다.')
  } catch (e) {
    console.error('[AdminNewsManager] save error:', e)
    alert('저장 중 오류가 발생했습니다. 콘솔을 확인하세요.')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const snap = await getDoc(doc(fbDb, 'config', 'news'))
    items.value = snap.exists() ? normalize(snap.data()?.items) : []
  } catch (e) {
    console.warn('[AdminNewsManager] load error:', e)
    items.value = []
  }
})
</script>

<style scoped>
.admin-card { border: 1px solid var(--c-border,#e5e7eb); border-radius: 12px; padding: 14px; background: var(--c-bg,#fff); }
.admin-card__header{ display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
.hint{ font-size:12px; color:#888; margin-bottom:10px; }
.save{ background:#111; color:#fff; border:none; padding:6px 12px; border-radius:8px; }
.news-list{ list-style:none; padding:0; margin:0; display:grid; gap:12px; }
.news-item{ border:1px solid #eee; border-radius:10px; padding:10px; }
.row{ display:flex; gap:8px; align-items:center; margin-bottom:6px; }
.title, .url{ flex:1; padding:8px; border:1px solid #ddd; border-radius:8px; }
.chk{ display:flex; align-items:center; gap:6px; font-size:12px; color:#666; }
.age{ font-size:12px; color:#999; white-space:nowrap; }
.cmds{ display:flex; gap:6px; margin-top:4px; }
.cmds button{ padding:6px 10px; border:1px solid #ddd; border-radius:8px; background:#fafafa; }
.cmds .danger{ border-color:#ffb4b4; color:#b40000; background:#fff5f5; }
.footer{ display:flex; justify-content:space-between; margin-top:12px; }
</style>
