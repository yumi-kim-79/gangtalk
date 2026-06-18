<!-- src/pages/ChatOpen.vue -->
<template>
  <section class="chat-page">
    <!-- ✅ 상단: 뒤로가기 + 정사각형 업체 썸네일 + 텍스트 -->
    <header class="chat-hero">
      <button class="back-btn" type="button" @click="$router.back()">←</button>

      <div class="chat-hero-thumb" :style="thumbStyle">
        <!-- 썸네일이 없을 때 이니셜 표시 -->
        <span v-if="!storeThumb">{{ storeInitial }}</span>
      </div>

      <div class="hero-text">
        <div class="hero-store">{{ storeName || '업체명' }}</div>
        <div class="hero-sub">오픈 채팅방 · 누구나 참여 · 익명</div>
      </div>
    </header>

    <!-- ✅ 메시지 영역 -->
    <div
      class="msg-box"
      ref="msgBox"
    >
      <div v-if="!storeId">잘못된 접근입니다. (storeId 없음)</div>

      <div
        v-else
        v-for="m in messages"
        :key="m._id"
        class="msg"
        :class="{ me: m.me }"
      >
        <div class="bubble">{{ m.text }}</div>
        <div class="time">{{ m.time }}</div>
      </div>
    </div>

    <!-- ✅ 하단 탭바 바로 위에 고정되는 입력창 -->
    <form class="composer" @submit.prevent="send">
      <input v-model="draft" placeholder="메시지를 입력..." />
      <button type="submit">전송</button>
    </form>
  </section>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'
import { useRoute } from 'vue-router'
import { db as fbDb } from '@/firebase'
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  onSnapshot,
  serverTimestamp,
  orderBy,
  query,
} from 'firebase/firestore'
import { getStorage, ref as sRef, getDownloadURL } from 'firebase/storage'

const route = useRoute()
const storeId = computed(() => String(route.params.storeId || '').trim())
const msgBox = ref(null)
const messages = ref([])
const draft = ref('')
const auth = getAuth()
const me = ref(null)

/* ✅ 업체 이름 / 썸네일 URL */
const storeName = ref(String(route.query.name || ''))
// 👉 현황판에서 넘어온 썸네일을 먼저 사용하고,
//    나중에 Firestore에서 더 최신 thumb 이 있으면 덮어씌움
const storeThumb = ref(String(route.query.thumb || ''))

/* Firebase Storage (gs:// → https:// 변환용) */
const storage = getStorage()

/* gs:// 등 다양한 케이스를 실제 URL로 변환 */
async function resolveThumbUrl(raw) {
  const url = String(raw || '').trim()
  if (!url) return ''
  // 이미 브라우저에서 바로 쓸 수 있는 주소면 그대로 사용
  if (/^(data:|blob:|https?:\/\/|\/)/i.test(url)) return url
  // gs:// 경로면 Storage에서 다운로드 URL 받기
  if (url.startsWith('gs://')) {
    try {
      const refOnStorage = sRef(storage, url)
      return await getDownloadURL(refOnStorage)
    } catch (e) {
      console.warn('[ChatOpen] getDownloadURL 실패:', e)
      return ''
    }
  }
  // 그 외는 그대로 시도
  return url
}

/* 시간 포맷 */
const clock = (ms) => {
  const d = new Date(ms)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

const norm = (id, x) => ({
  _id: id,
  text: x.text || '',
  me:
    (x.authorUid && me.value && x.authorUid === me.value.uid) ||
    false,
  time: clock(x.createdAt?.toMillis?.() || Date.now()),
})

function scrollBottom() {
  nextTick(() => {
    const el = msgBox.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

/* ✅ 채팅방 타이틀 (필요시 다른 곳에서 사용 가능) */
const openRoomTitle = computed(() => {
  const nm = storeName.value || storeId.value
  return nm ? `${nm} 채팅방` : '오픈 채팅방'
})

/* ✅ 이니셜 (썸네일 없을 때 네모 안에 표시) */
const storeInitial = computed(() => {
  const nm = (storeName.value || '').trim()
  return nm ? nm[0] : '상'
})

/* ✅ 정사각형 썸네일 배경 스타일 */
const thumbStyle = computed(() => {
  if (!storeThumb.value) return {}
  return {
    backgroundImage: `url(${storeThumb.value})`,
  }
})

async function ensureRoom(rid) {
  const roomRef = doc(fbDb, 'rooms_open', rid)
  const s = await getDoc(roomRef)
  if (!s.exists()) {
    await setDoc(
      roomRef,
      {
        createdAt: serverTimestamp(),
        type: 'open',
        storeId: rid,
      },
      { merge: true },
    )
  }
}

async function send() {
  const t = draft.value.trim()
  const rid = storeId.value
  if (!t || !rid) return
  try {
    await addDoc(collection(fbDb, 'rooms_open', rid, 'messages'), {
      text: t,
      authorUid: me.value?.uid || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    draft.value = ''
    scrollBottom()
  } catch (e) {
    console.error('메시지 전송 실패:', e)
    alert('전송 권한이 없습니다. 관리자에게 문의해주세요.')
  }
}

let unsubs = []

onMounted(async () => {
  // 1) 익명 로그인
  try {
    if (!auth.currentUser) await signInAnonymously(auth)
  } catch (e) {
    console.warn(
      '익명 로그인 실패(규칙이 public read/write이면 무시 가능):',
      e,
    )
  }

  // 2) 현재 사용자 캐시
  unsubs.push(
    onAuthStateChanged(auth, (u) => {
      me.value = u || null
    }),
  )

  // 3) storeId 가드
  const rid = storeId.value
  if (!rid) {
    console.warn('[ChatOpen] route.params.storeId 없음')
    return
  }

  // 3-1) 점포 정보(이름, thumb 후보들) 로딩
  try {
    const sSnap = await getDoc(doc(fbDb, 'stores', rid))
    if (sSnap.exists()) {
      const d = sSnap.data() || {}
      // 이름은 문서의 name 우선
      storeName.value = d.name || storeName.value || rid

      // ✅ MainPage와 동일한 우선순위로 썸네일 후보 선택
      const cand =
        d.thumb ||
        d.cover ||
        d.coverImg ||
        (Array.isArray(d.images) && d.images[0]) ||
        (Array.isArray(d.photos) && d.photos[0]) ||
        d.img ||
        d.banner ||
        d.logo ||
        ''

      const resolved = await resolveThumbUrl(cand)
      // Firestore 에서 더 좋은 썸네일을 찾았을 때만 덮어쓰기
      if (resolved) {
        storeThumb.value = resolved
      }
    } else {
      // 문서가 없어도, 처음에 쿼리로 넘어온 썸네일(storeThumb)은 그대로 유지
      storeName.value = storeName.value || rid
      // storeThumb.value 건드리지 않음 ❗
    }
  } catch (e) {
    console.warn('[ChatOpen] store 정보 로딩 실패:', e)
  }

  // 4) 방 보장
  await ensureRoom(rid)

  // 5) 메시지 구독
  const qRef = query(
    collection(fbDb, 'rooms_open', rid, 'messages'),
    orderBy('createdAt', 'asc'),
  )
  unsubs.push(
    onSnapshot(
      qRef,
      (qs) => {
        messages.value = qs.docs.map((d) => norm(d.id, d.data()))
        scrollBottom()
      },
      (err) => {
        console.error('구독 실패:', err)
      },
    ),
  )
})

onBeforeUnmount(() => unsubs.forEach((u) => typeof u === 'function' && u()))
</script>

<style scoped>
/* 전체 화면: 상단 고정 탑바(약 56px) + 하단 탭바(약 56px)를 고려 */
.chat-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 56px);  /* 하단 탭바 높이 */
  box-sizing: border-box;
  padding-top: 56px;           /* ✅ 상단 강남톡방 고정배너 높이만 내려줌 */
}

/* ===== 상단 헤더: 뒤로가기 + 정사각형 썸네일 + 텍스트 ===== */
.chat-hero {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-bottom: 1px solid #eee;
  background: #fff;
}

/* 뒤로가기 버튼 */
.back-btn {
  border: none;
  background: #f5f5f5;
  color: #333;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
}

/* 정사각형 썸네일 */
.chat-hero-thumb {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background-color: #f0f2f5;
  background-size: cover;
  background-position: center;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  color: #888;
}

/* 텍스트 영역 */
.hero-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.hero-store {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.hero-sub {
  font-size: 12px;
  color: #888;
}

/* ===== 메시지 영역 ===== */
.msg-box {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 10px 10px 80px; /* 하단 여백 유지 */
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  background: #fff;
}

.msg {
  max-width: 78%;
}
.msg.me {
  align-self: flex-end;
  text-align: right;
}
.bubble {
  display: inline-block;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 10px;
  background: #fff;
}
.time {
  font-size: 11px;
  opacity: 0.6;
  margin-top: 2px;
}

/* ✅ 화면 하단 고정 + 하단탭 바로 위에 딱 붙도록 */
.composer {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 56px;              /* 하단 탭바 높이만큼 띄우기 */
  width: 100%;
  max-width: 430px;          /* 모바일 프레임 폭 맞춤 */
  display: flex;
  gap: 6px;
  padding: 8px;
  border-top: 1px solid #eee;
  background: rgba(255, 255, 255, 0.95); /* 살짝 투명 흰색 */
  box-sizing: border-box;
}

.composer input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.composer button {
  padding: 0 14px;
  border-radius: 8px;
  border: none;
  background: #ff2d83;
  color: #fff;
  font-weight: 700;
}
</style>
