<!-- src/pages/StoreManagers.vue -->
<template>
  <main class="detail">
    <!-- ===== 상단: 업체 기본 정보(기존 상세와 유사) ===== -->
    <section class="top container">
      <div class="split">
        <!-- 왼쪽: 대표 이미지 -->
        <div class="hero-card" :style="heroStyle" aria-label="업체 대표 이미지"></div>

        <!-- 오른쪽: 상호 + 지역/업종 -->
        <div class="right-card">
          <div class="right-top">
            <h1 class="right-name ellip">{{ store.name || '가게' }}</h1>
            <p class="right-meta ellip">
              <span class="loc">{{ store.region || '-' }}</span>
              <span class="dot">·</span>
              <span class="cat">{{ catLabel }}</span>
            </p>

            <!-- 한 줄 소개(있으면) -->
            <p v-if="listIntro" class="right-intro ellip">
              {{ listIntro }}
            </p>

            <!-- 상단 작은 안내 -->
            <p class="mgr-hint">
              이 페이지는 <b>담당자 정보 전용</b> 화면입니다.
              현황판에서 선택한 업체의 담당자를 한눈에 볼 수 있어요.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 소개 ===== -->
    <section class="container">
      <h2 class="sec">소개</h2>
      <p class="para" v-if="fullDesc">{{ fullDesc }}</p>
      <p class="para muted" v-else>소개가 아직 등록되지 않았어요.</p>

      <!-- ===== 담당자 목록 ===== -->
      <h2 class="sec">담당자</h2>

      <div v-if="managers.length" class="mgr-list">
        <article
          v-for="(m, i) in managers"
          :key="(m.name || 'mgr') + '_' + i"
          class="mgr-card"
        >
          <header class="mgr-head">
            <div class="mgr-name-wrap">
              <h3 class="mgr-name">{{ m.name || '담당자' }}</h3>
              <span v-if="m.role || m.title" class="mgr-role">
                {{ m.role || m.title }}
              </span>
            </div>
            <span class="mgr-tag">담당</span>
          </header>

          <div class="mgr-body">
            <!-- 연락처 -->
            <div class="kv">
              <span class="k">연락처</span>
              <span class="v v-row">
                <template v-if="m.phone">
                  <a :href="`tel:${normalizeTel(m.phone)}`">{{ m.phone }}</a>
                  <button class="linkbtn" type="button" @click="copyPhone(m.phone)">
                    복사
                  </button>
                </template>
                <span v-else>미등록</span>
              </span>
            </div>

            <!-- 연결톡/카카오 ID -->
            <div class="kv">
              <span class="k">연결톡</span>
              <span class="v v-row">
                <template v-if="m.talkId">
                  <span>@{{ m.talkId }}</span>
                  <button class="linkbtn" type="button" @click="openTalk(m)">
                    연결
                  </button>
                </template>
                <span v-else>미등록</span>
              </span>
            </div>

            <!-- 기타 메모 -->
            <div
              v-if="m.memo || m.note || m.desc"
              class="kv kv-memo"
            >
              <span class="k">메모</span>
              <span class="v memo-text">
                {{ m.memo || m.note || m.desc }}
              </span>
            </div>
          </div>
        </article>
      </div>

      <div v-else class="mgr-empty">
        등록된 담당자가 없습니다.
        <br />
        업체 편집 화면에서 담당자를 추가해 주세요.
      </div>

      <!-- 하단: 뒤로가기 -->
      <div class="manage">
        <button class="btn-edit" type="button" @click="goBack">
          ← 현황판으로 돌아가기
        </button>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, reactive, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '@/firebase'
import { doc, onSnapshot } from 'firebase/firestore'

const route = useRoute()
const router = useRouter()

/* ───── 기본 스토어 구조(빈값) ───── */
const emptyStore = {
  id: '',
  name: '가게',
  region: '강남',
  category: 'lounge',
  thumb: '',
  hero: '',
  desc: '',
  detailDesc: '',
  longDesc: '',
  fullDesc: '',
  managers: [],
  manager: '',
  phone: '',
  talkId: '',
}

const store = reactive({ ...emptyStore })

/* ───── Firestore 구독 ───── */
let unsub = null

function subStore(id) {
  if (unsub) {
    try { unsub() } catch {}
    unsub = null
  }
  if (!id) return

  unsub = onSnapshot(doc(db, 'stores', String(id)), (snap) => {
    if (!snap.exists()) return
    const raw = snap.data() || {}
    Object.assign(store, emptyStore, { id: snap.id }, raw)
    try {
      sessionStorage.setItem('lastStoreManagers', JSON.stringify(store))
    } catch {}
  })
}

onMounted(() => {
  subStore(route.params.id)
})
watch(
  () => route.params.id,
  (nv) => subStore(nv)
)
onUnmounted(() => {
  if (typeof unsub === 'function') unsub()
})

/* ───── 표시용 계산값 ───── */
const CAT_MAP = {
  hopper: '하퍼',
  point5: '쩜오',
  ten: '텐카페',
  tenpro: '텐프로',
  onep: '1%',
  nrb: '노래방',
  kara: '가라오케',
  bar: '바',
  lounge: '라운지',
}
const catLabel = computed(() => CAT_MAP[store.category] ?? store.category)

/* 한 줄 소개(목록용 intro 느낌) */
const listIntro = computed(() => (store.desc || '').trim())

/* 상세 소개: detailDesc / longDesc / fullDesc 우선 */
const fullDesc = computed(() =>
  (store.detailDesc ||
    store.longDesc ||
    store.fullDesc ||
    store.desc ||
    ''
  ).trim()
)

/* 대표 이미지 */
const heroStyle = computed(() => {
  const img =
    store.hero ||
    store.thumb ||
    'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?q=80&w=1600&auto=format&fit=crop'
  return {
    backgroundImage:
      `linear-gradient(180deg,rgba(0,0,0,.18),rgba(0,0,0,.38)), url(${img})`,
  }
})

/* ───── 담당자 리스트 ───── */
const managers = computed(() => {
  const arr = Array.isArray(store.managers) ? store.managers : []
  if (arr.length) return arr

  // 레거시 단일 필드 → 1명짜리 배열로 변환
  if (store.manager || store.phone || store.talkId) {
    return [
      {
        name: store.manager || '담당',
        phone: store.phone || '',
        talkId: store.talkId || '',
      },
    ]
  }
  return []
})

/* ───── 공통 유틸 ───── */
const normalizeTel = (raw) => String(raw || '').replace(/[^\d+]/g, '')

async function copyPhone(phone) {
  const v = String(phone || '').trim()
  if (!v) return
  try {
    await navigator.clipboard.writeText(v)
    alert('전화번호가 복사되었습니다.')
  } catch {
    alert('복사에 실패했어요. 직접 선택해서 복사해 주세요.')
  }
}

function openTalk(mgr) {
  const id = mgr?.talkId || ''
  if (!id) return
  // 연결톡 규칙이 따로 있으면 여기서 링크 생성
  // 예시: /connect-talk?user=@talkId
  router.push({
    path: '/chat-open',
    query: { talkId: id, storeId: store.id },
  })
}

/* 뒤로가기 */
function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/main')
  }
}
</script>

<style scoped>
.detail{
  padding-bottom: calc(92px + env(safe-area-inset-bottom));
  color: var(--fg);
}
.container{ padding: 10px 14px }
.muted{ color:var(--muted) }
.ellip{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap }

/* ===== 상단 분할 ===== */
.top .split{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap:10px;
  align-items:stretch;
}

/* 사진 카드 */
.hero-card{
  position:relative;
  width:100%;
  aspect-ratio:1/1;
  border-radius:12px;
  background-size:cover;
  background-position:center;
  box-shadow:0 4px 12px var(--shadow);
  border:1px solid var(--line);
  overflow:hidden;
}

/* 오른쪽 정보 패널 */
.right-card{
  height:100%;
  border:1px solid var(--line);
  border-radius:12px;
  background:var(--surface);
  box-shadow:0 4px 12px var(--shadow);
  padding:12px;
  display:flex;
  flex-direction:column;
  justify-content:flex-start;
  gap:6px;
}
.right-name{
  margin:0 0 2px;
  font-size:18px;
  font-weight:900;
  line-height:1.15;
}
.right-meta{
  margin:0;
  font-size:12.5px;
  color:var(--muted);
}
.right-meta .dot{ margin:0 4px }
.right-intro{
  margin:4px 0 0;
  font-size:13px;
  font-weight:800;
}
.mgr-hint{
  margin:6px 0 0;
  font-size:11.5px;
  color:var(--muted);
}

/* ===== 본문 ===== */
.sec{
  margin:12px 0 6px;
  font-size:14px;
  font-weight:900;
}
.para{
  line-height:1.45;
  font-size:13px;
}

/* ===== 담당자 카드 리스트 ===== */
.mgr-list{
  display:flex;
  flex-direction:column;
  gap:10px;
  margin-top:4px;
}
.mgr-card{
  border:1px solid var(--line);
  border-radius:12px;
  background:var(--surface);
  box-shadow:0 4px 10px var(--shadow);
  padding:10px 12px;
}
.mgr-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:6px;
  margin-bottom:6px;
}
.mgr-name-wrap{
  display:flex;
  align-items:center;
  gap:6px;
}
.mgr-name{
  margin:0;
  font-size:15px;
  font-weight:900;
}
.mgr-role{
  font-size:11.5px;
  padding:2px 6px;
  border-radius:999px;
  border:1px solid var(--line);
  color:var(--muted);
}
.mgr-tag{
  font-size:11px;
  padding:3px 8px;
  border-radius:999px;
  border:1px solid var(--accent);
  background:color-mix(in oklab, var(--accent), white 90%);
  font-weight:900;
  color:var(--accent);
}
.mgr-body{
  border-top:1px dashed var(--line);
  padding-top:6px;
  display:flex;
  flex-direction:column;
  gap:2px;
}

.kv{
  display:flex;
  justify-content:space-between;
  gap:10px;
  padding:4px 0;
  font-size:12.5px;
}
.kv .k{
  color:var(--muted);
  white-space:nowrap;
}
.kv .v{
  font-weight:700;
  text-align:right;
}
.v-row{
  display:flex;
  align-items:center;
  justify-content:flex-end;
  gap:8px;
}
.kv-memo{
  align-items:flex-start;
}
.memo-text{
  white-space:pre-line;
  text-align:left;
}

/* 담당자 없음 */
.mgr-empty{
  margin-top:6px;
  padding:18px 8px;
  text-align:center;
  font-size:13px;
  color:var(--muted);
}

/* 하단 버튼 */
.manage{
  margin:14px 0 2px;
  display:flex;
  justify-content:flex-start;
}
.btn-edit{
  border:1px solid var(--accent);
  color:#fff;
  background:var(--accent);
  padding:9px 12px;
  border-radius:10px;
  font-weight:900;
  font-size:12.5px;
}

/* 공용 링크 버튼 */
.linkbtn{
  border:1px solid var(--accent);
  background: color-mix(in oklab, var(--accent), white 88%);
  color:var(--fg);
  border-radius:10px;
  padding:4px 10px;
  font-weight:800;
  font-size:12px;
  cursor:pointer;
}

/* 초소형 화면 대응 */
@media (max-width: 360px){
  .right-name{ font-size:17px; }
}
</style>
