<!-- src/pages/LegalConsultBoard.vue -->
<template>
  <main class="page">
    <header class="head">
      <button class="back" @click="$router.back()" aria-label="뒤로">←</button>
      <h1>법률상담 게시판</h1>
      <button
        class="add"
        type="button"
        aria-label="법률상담 글 작성"
        @click="toggleWrite"
      >
        ＋
      </button>
    </header>

    <!-- 상단 요약 + 안내/연결 버튼 -->
    <section class="card intro">
      <p class="intro-text">
        이 화면에는 <strong>현재 계정으로 작성된 법률상담 글</strong>만 표시됩니다.
      </p>
      <div class="intro-actions">
        <button class="intro-btn" type="button" @click="goLegalConsult">
          무료 법률상담 안내 보기
        </button>
        <button class="intro-btn primary" type="button" @click="callSupport">
          법률상담 연결 (전화)
        </button>
      </div>
    </section>

    <!-- 법률상담 글 작성 카드 -->
    <section
      v-if="showWrite"
      ref="writeCardEl"
      class="card write-card"
    >
      <h2 class="write-title">법률상담 글 작성</h2>
      <p class="write-help">
        아래 내용을 작성해 접수해 주세요. 담당자가 순차적으로 확인 후 연락드립니다.
      </p>

      <form class="write-form" @submit.prevent="submit">
        <label class="field">
          <span class="label">제목</span>
          <input
            v-model.trim="form.title"
            class="inp"
            type="text"
            required
            placeholder="예: 임대차 계약 관련 문의"
          />
        </label>

        <label class="field">
          <span class="label">의뢰인 이름</span>
          <input
            v-model.trim="form.userName"
            class="inp"
            type="text"
            placeholder="예: 홍길동"
          />
        </label>

        <label class="field">
          <span class="label">상세 내용</span>
          <textarea
            v-model.trim="form.content"
            class="inp textarea"
            rows="5"
            placeholder="사실관계와 궁금하신 점을 최대한 자세히 적어주세요."
          ></textarea>
        </label>

        <div class="field">
          <span class="label">요약 메모 (선택)</span>
          <input
            v-model.trim="form.summary"
            class="inp"
            type="text"
            placeholder="화면에 표시될 짧은 요약 (선택)"
          />
        </div>

        <div class="actions">
          <button
            type="button"
            class="btn ghost"
            @click="resetForm"
          >
            초기화
          </button>
          <button
            type="submit"
            class="btn primary"
            :disabled="submitting"
          >
            {{ submitting ? '등록 중...' : '법률상담 접수' }}
          </button>
        </div>
      </form>
    </section>

    <!-- 로딩/에러 -->
    <section class="card" v-if="loading">
      <p>불러오는 중...</p>
    </section>
    <section class="card error" v-else-if="error">
      <p>{{ error }}</p>
    </section>

    <!-- 목록 -->
    <section class="card list" v-else>
      <template v-if="items.length">
        <ul class="post-list">
          <li
            v-for="p in items"
            :key="p.id"
            class="post-item"
          >
            <button class="post-btn" type="button" @click="selectPost(p)">
              <div class="row1">
                <strong class="title">{{ p.title || '제목 없음' }}</strong>
                <span class="status" :class="p.status || 'pending'">
                  {{ statusLabel(p.status) }}
                </span>
              </div>
              <div class="row2">
                <span class="date">{{ formatDate(p.createdAt) }}</span>
                <span class="meta" v-if="p.userName">
                  의뢰인: {{ p.userName }}
                </span>
              </div>
              <p v-if="p.summary" class="summary">
                {{ p.summary }}
              </p>
            </button>
          </li>
        </ul>
      </template>
      <p v-else class="empty">
        아직 등록된 법률상담 글이 없습니다.
      </p>
    </section>

    <!-- 선택한 글 상세보기 (간단 버전, 나중에 확장 가능) -->
    <section v-if="selected" class="card detail-card">
      <header class="detail-head">
        <div>
          <h2 class="detail-title">{{ selected.title || '제목 없음' }}</h2>
          <p class="detail-meta">
            {{ formatDate(selected.createdAt) }}
            <span v-if="selected.userName"> · 의뢰인: {{ selected.userName }}</span>
          </p>
        </div>
        <span class="status" :class="selected.status || 'pending'">
          {{ statusLabel(selected.status) }}
        </span>
      </header>

      <p v-if="selected.summary" class="detail-summary">
        요약: {{ selected.summary }}
      </p>
      <pre class="detail-content">{{ selected.content || '내용이 없습니다.' }}</pre>

      <!-- 댓글 영역은 추후 상담자 UI에서 확장할 수 있도록 기본 구조만 -->
      <section class="comments">
        <h3>상담 메모 / 댓글</h3>
        <p class="comment-help">상담자가 남긴 메모가 이곳에 표시됩니다. (댓글 기능은 추후 확장)</p>
        <ul v-if="comments.length" class="comment-list">
          <li v-for="c in comments" :key="c.id" class="comment-item">
            <div class="comment-row1">
              <strong class="comment-author">{{ c.authorName || '상담자' }}</strong>
              <span class="comment-date">{{ formatDate(c.createdAt) }}</span>
            </div>
            <p class="comment-text">{{ c.text }}</p>
          </li>
        </ul>
        <p v-else class="comment-empty">아직 등록된 상담 메모가 없습니다.</p>
      </section>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { db, firebaseReady } from '@/firebase'
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
  CollectionReference,
  DocumentData,
} from 'firebase/firestore'
import { getAuth, onAuthStateChanged, User } from 'firebase/auth'

const router = useRouter()

const loading     = ref(true)
const error       = ref('')
const items       = ref<any[]>([])
const showWrite   = ref(true)
const submitting  = ref(false)
const writeCardEl = ref<HTMLElement | null>(null)

const selected    = ref<any | null>(null)
const comments    = ref<any[]>([])
let commentsUnsub: (() => void) | null = null

const form = ref({
  title: '',
  userName: '',
  content: '',
  summary: '',
})

const auth = getAuth()

/** Auth 정보 한 번 가져오는 헬퍼 */
function getAuthInfoOnce(): Promise<{ uid: string; email: string }> {
  return new Promise(resolve => {
    const current = auth.currentUser
    if (current) {
      resolve({ uid: current.uid, email: current.email || '' })
      return
    }
    const off = onAuthStateChanged(auth, (u: User | null) => {
      off()
      resolve({ uid: u?.uid || '', email: u?.email || '' })
    })
  })
}

/* ===== 목록 구독 ===== */
let listUnsub: (() => void) | null = null

onMounted(async () => {
  try {
    await firebaseReady

    const { uid, email } = await getAuthInfoOnce()
    console.log('[LEGAL] auth info', { uid, email })

    if (!uid && !email) {
      loading.value = false
      items.value = []
      return
    }

    const colRef = collection(db, 'legal_consults') as CollectionReference<DocumentData>

    // 이메일이 있으면 이메일 기준, 없으면 uid 기준으로 필터
    const qRef = email
      ? query(
          colRef,
          where('writerEmail', '==', email),
          orderBy('createdAt', 'desc'),
          limit(50),
        )
      : query(
          colRef,
          where('writerUid', '==', uid),
          orderBy('createdAt', 'desc'),
          limit(50),
        )

    listUnsub = onSnapshot(
      qRef,
      snap => {
        items.value = snap.docs.map(d => ({
          id: d.id,
          ...d.data(),
        }))
        console.log('[LEGAL] items snapshot', items.value)
        loading.value = false
      },
      err => {
        console.error(err)
        error.value = '법률상담 목록을 불러오지 못했습니다.'
        loading.value = false
      },
    )
  } catch (e) {
    console.error(e)
    error.value = '법률상담 목록을 불러오지 못했습니다.'
    loading.value = false
  }
})

onBeforeUnmount(() => {
  if (listUnsub) listUnsub()
  if (commentsUnsub) commentsUnsub()
})

/* ===== 상태 표시 ===== */
function statusLabel (s: string | undefined) {
  if (s === 'done') return '완료'
  if (s === 'answer') return '답변중'
  return '접수'
}

function formatDate (ts: any) {
  if (!ts) return ''
  try {
    const d: Date = ts.toDate ? ts.toDate() : new Date(ts)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  } catch {
    return ''
  }
}

/* ===== 상단 버튼 동작 ===== */
function goLegalConsult () {
  router.push({ name: 'ConsultHelp', params: { kind: 'legal' } })
}

/**
 * 상담 연결(전화)
 *  - 실제 번호: 01059190815
 */
const SUPPORT_PHONE = '01059190815'

function callSupport () {
  const tel = SUPPORT_PHONE.replace(/[^0-9+]/g, '')
  if (!tel) return
  window.location.href = `tel:${tel}`
}

/* ===== 글쓰기 카드 토글 / 전송 ===== */
function toggleWrite () {
  showWrite.value = !showWrite.value
  if (showWrite.value) {
    nextTick(() => {
      if (writeCardEl.value) {
        writeCardEl.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  }
}

function resetForm () {
  form.value = {
    title: '',
    userName: '',
    content: '',
    summary: '',
  }
}

async function submit () {
  if (!form.value.title.trim()) {
    alert('제목을 입력해 주세요.')
    return
  }

  try {
    submitting.value = true

    const { uid, email } = await getAuthInfoOnce()
    console.log('[LEGAL] submit auth', { uid, email })

    if (!uid && !email) {
      alert('로그인 후 이용해 주세요.')
      return
    }

    await addDoc(collection(db, 'legal_consults'), {
      writerUid: uid || null,
      writerEmail: email || null,
      title: form.value.title.trim(),
      userName: form.value.userName.trim() || null,
      content: form.value.content.trim() || null,
      summary: form.value.summary.trim() || null,
      status: 'pending',
      createdAt: serverTimestamp(),
    })

    alert('법률상담이 접수되었습니다.')
    resetForm()
    showWrite.value = false
  } catch (e) {
    console.error(e)
    alert('법률상담 등록에 실패했습니다. 잠시 후 다시 시도해주세요.')
  } finally {
    submitting.value = false
  }
}

/* ===== 글 선택 / 댓글 구독 (읽기 전용 기본 버전) ===== */
function selectPost(p: any) {
  selected.value = p

  if (commentsUnsub) {
    commentsUnsub()
    commentsUnsub = null
  }

  try {
    const col = collection(db, 'legal_consults', p.id, 'comments')
    commentsUnsub = onSnapshot(
      query(col, orderBy('createdAt', 'asc')),
      snap => {
        comments.value = snap.docs.map(d => ({
          id: d.id,
          ...d.data(),
        }))
      },
      err => {
        console.error('[LEGAL] comments error', err)
        comments.value = []
      }
    )
  } catch (err) {
    console.error('[LEGAL] comments setup error', err)
    comments.value = []
  }
}
</script>

<style scoped>
.page{
  max-width:720px;
  margin:0 auto;
  padding:16px 14px 24px;
}

.head{
  display:flex;
  align-items:center;
  gap:8px;
  margin-bottom:10px;
}
.back{
  width:32px; height:32px;
  border-radius:999px;
  border:1px solid var(--line);
  background:var(--surface);
  font-size:18px;
}
.add{
  margin-left:auto;
  width:32px; height:32px;
  border-radius:999px;
  border:1px solid var(--line);
  background:#ff6b6b;
  color:#fff;
  font-size:20px;
  font-weight:900;
}
h1{
  margin:0;
  font-size:20px;
  font-weight:900;
}

.card{
  border:1px solid var(--line);
  border-radius:14px;
  background:var(--surface);
  color:var(--fg);
  padding:14px;
  margin-bottom:10px;
}

/* 상단 안내 */
.intro-text{
  margin:0 0 8px;
  font-size:13px;
}
.intro-actions{
  display:flex;
  gap:8px;
}
.intro-btn{
  flex:1;
  height:36px;
  border-radius:10px;
  border:1px solid #ff6b6b;
  background:#fff;
  color:#ff3b60;
  font-weight:800;
  font-size:13px;
  cursor:pointer;
}
.intro-btn.primary{
  background:#ff6b6b;
  color:#fff;
}

/* 글쓰기 카드 */
.write-card{
  margin-top:4px;
}
.write-title{
  margin:0 0 4px;
  font-size:16px;
  font-weight:900;
}
.write-help{
  margin:0 0 10px;
  font-size:13px;
  color:#777;
}
.write-form{
  display:flex;
  flex-direction:column;
  gap:10px;
}
.field{
  display:flex;
  flex-direction:column;
  gap:4px;
}
.label{
  font-size:13px;
  font-weight:700;
}
.inp{
  border-radius:10px;
  border:1px solid var(--line);
  background:var(--bg);
  padding:8px 10px;
  font-size:14px;
}
.textarea{
  min-height:96px;
  resize:vertical;
}
.actions{
  display:flex;
  justify-content:flex-end;
  gap:8px;
}
.btn{
  min-width:96px;
  height:34px;
  border-radius:10px;
  border:1px solid var(--line);
  font-weight:800;
  cursor:pointer;
}
.btn.ghost{
  background:var(--bg);
}
.btn.primary{
  background:#ff6b6b;
  border-color:#ff6b6b;
  color:#fff;
}

/* 에러/목록 */
.error p{ color:#ff4d6a; margin:0; }

.post-list{
  list-style:none;
  padding:0;
  margin:0;
  display:flex;
  flex-direction:column;
  gap:10px;
}
.post-item{
  border:1px solid var(--line);
  border-radius:10px;
  background:var(--bg);
  padding:0;
}
.post-btn{
  width:100%;
  text-align:left;
  border:0;
  background:transparent;
  padding:10px;
}
.row1{
  display:flex;
  align-items:center;
  gap:8px;
  margin-bottom:4px;
}
.title{
  flex:1;
  font-size:14px;
}
.status{
  padding:2px 8px;
  border-radius:999px;
  font-size:11px;
  font-weight:700;
  border:1px solid #ddd;
}
.status.pending{
  background:#fff7e6;
  border-color:#ffdd99;
  color:#c97a00;
}
.status.answer{
  background:#e6f3ff;
  border-color:#aed1ff;
  color:#1d4ed8;
}
.status.done{
  background:#e6ffe9;
  border-color:#a8e5b8;
  color:#1b8f3a;
}
.row2{
  display:flex;
  gap:8px;
  font-size:12px;
  color:#777;
}
.row2 .meta{ margin-left:auto; }

.summary{
  margin:6px 0 0;
  font-size:13px;
  color:#444;
}
.empty{
  margin:0;
  font-size:13px;
  color:#777;
}

/* 상세 보기 */
.detail-card{
  margin-top:4px;
}
.detail-head{
  display:flex;
  justify-content:space-between;
  gap:8px;
  align-items:flex-start;
  margin-bottom:6px;
}
.detail-title{
  margin:0;
  font-size:16px;
  font-weight:900;
}
.detail-meta{
  margin:2px 0 0;
  font-size:12px;
  color:#777;
}
.detail-summary{
  margin:6px 0 4px;
  font-size:13px;
  font-weight:700;
}
.detail-content{
  margin:0;
  padding:10px;
  border-radius:10px;
  background:var(--bg);
  font-size:13px;
  white-space:pre-wrap;
}

/* 댓글 */
.comments{
  margin-top:12px;
  border-top:1px dashed var(--line);
  padding-top:10px;
}
.comments h3{
  margin:0 0 4px;
  font-size:14px;
  font-weight:800;
}
.comment-help{
  margin:0 0 6px;
  font-size:12px;
  color:#777;
}
.comment-list{
  list-style:none;
  padding:0;
  margin:0;
  display:flex;
  flex-direction:column;
  gap:6px;
}
.comment-item{
  padding:6px 8px;
  border-radius:8px;
  background:var(--bg);
  border:1px solid var(--line);
}
.comment-row1{
  display:flex;
  justify-content:space-between;
  gap:8px;
  font-size:12px;
  margin-bottom:2px;
}
.comment-author{
  font-weight:700;
}
.comment-date{
  color:#888;
}
.comment-text{
  margin:0;
  font-size:13px;
}
.comment-empty{
  margin:0;
  font-size:12px;
  color:#777;
}
</style>
