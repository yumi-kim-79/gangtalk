<!-- ✅ src/pages/SafeContact.vue (iPhone 15 Pro 스타일 + 뒤로가기 보정) -->
<template>
  <main class="safe-contact">
    <!-- 상단 헤더 -->
    <header class="safe-head">
      <button class="back-btn" @click="goBack" aria-label="뒤로가기">←</button>
      <b class="title">{{ titleText }}</b>
    </header>

    <!-- iPhone 15 Pro 프레임 -->
    <div class="iphone15">
      <div class="frame">
        <!-- 상단 다이내믹 아일랜드 -->
        <div class="island"></div>

        <!-- 화면(앱 화면) -->
        <div class="screen">
          <div class="brand">{{ storeName || '업체' }}</div>

          <div class="input-wrap">
            <label>받는번호</label>
            <input type="text" class="input" :value="displayPhone" readonly />
          </div>

          <div v-if="isSms" class="input-wrap">
            <label>메시지</label>
            <textarea v-model="msg" placeholder="내용을 입력하세요 (선택)"></textarea>
          </div>

          <button class="action-btn" @click="doAction">
            {{ isSms ? '문자 전송' : '전화 걸기' }}
          </button>

          <p class="tip">
            모바일에서는 바로 {{ isSms ? '문자 앱으로 연결됩니다.' : '전화 앱으로 연결됩니다.' }}<br />
            데스크톱에서는 번호를 복사해 사용하세요.
          </p>
        </div>
      </div>
      <!-- 장식: 측면 버튼 (디자인용) -->
      <div class="side-btns"></div>
    </div>
  </main>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '@/firebase'
import { doc, getDoc } from 'firebase/firestore'

const route = useRoute()
const router = useRouter()

const mode = computed(() => String(route.params.mode || 'sms'))
const isSms = computed(() => mode.value === 'sms')
const storeId = computed(() => String(route.params.storeId || ''))
const storeName = ref(String(route.query.name || ''))
const passedPhone = ref(String(route.query.phone || ''))

const phone = ref('')
const msg = ref('')
const normalizeTel = (raw) => String(raw || '').replace(/[^\d+]/g, '')
const titleText = computed(() => (isSms.value ? '안심문자' : '안심전화'))
const displayPhone = computed(() => phone.value || '번호 불러오는 중...')

/* 뒤로가기: 항상 해당 업체 상세 페이지로 */
function goBack() {
  if (storeId.value) {
    router.push({ name: 'storeDetail', params: { id: storeId.value } })
  } else {
    router.back()
  }
}

/* 번호 확보: 쿼리에 없으면 Firestore에서 조회 */
async function ensurePhone() {
  const q = normalizeTel(passedPhone.value)
  if (q) {
    phone.value = q
    return
  }
  if (!storeId.value) return
  try {
    const s = await getDoc(doc(db, 'stores', storeId.value))
    const d = s.exists() ? s.data() : {}
    const v = normalizeTel(d?.safePhone || d?.phoneSafe || d?.safe || d?.phone || '')
    phone.value = v
    if (!storeName.value) storeName.value = d?.name || ''
  } catch (e) {
    console.warn('번호 조회 실패:', e)
  }
}
ensurePhone()

function doAction() {
  const p = normalizeTel(phone.value)
  if (!p) return alert('연결할 번호가 없습니다.')
  if (isSms.value) {
    const url = `sms:${p}${msg.value ? `?&body=${encodeURIComponent(msg.value)}` : ''}`
    window.location.href = url
  } else {
    window.location.href = `tel:${p}`
  }
}
</script>

<style scoped>
/* ===== 기본 레이아웃: 라이트모드에서도 검정 텍스트 고정 ===== */
.safe-contact{
  min-height:100vh;
  display:flex;
  flex-direction:column;
  align-items:center;
  padding:16px 12px 28px;
  background:#f6f7f8;
  color:#111;            /* ← 검정 고정 */
}
.safe-head{
  width:100%;
  max-width:460px;
  display:flex;
  align-items:center;
  gap:10px;
  margin-bottom:12px;
  color:#111;
}
.back-btn{
  width:36px; height:36px;
  border-radius:10px;
  border:1px solid #bbb;
  background:#fff;
  color:#111;            /* ← 검정 고정 */
  font-size:18px; font-weight:900;
  cursor:pointer;
}
.title{ font-size:16px; font-weight:900 }

/* ===== iPhone 15 Pro mockup (20% 축소) ===== */
.iphone15{
  position:relative;
  width:288px;              /* 기존 360px → 288px (20% 축소) */
  max-width:80vw;
  display:grid;
  place-items:center;
  margin-top:6px;
  transform:scale(0.95);
}
.frame{
  position:relative;
  width:100%;
  aspect-ratio: 9 / 19.5;
  border-radius:27px;        /* 기존 34px → 27px */
  padding:9.6px;             /* 기존 12px → 9.6px */
  background:
    radial-gradient(120% 120% at 0% 0%, #656565 0%, #999 35%, #e0e0e0 70%, #c0c0c0 100%);
  box-shadow:
    0 16px 28px rgba(0,0,0,.22),
    inset 0 0 0 1.6px rgba(255,255,255,.3),
    inset 0 0 0 5.6px #111;
}
.island{
  position:absolute;
  top:8px; left:50%; transform:translateX(-50%);
  width:96px; height:27px;     /* 기존 120x34 → 96x27 */
  background:#000;
  border-radius:16px;
  box-shadow: 0 0.8px 1.6px rgba(0,0,0,.35), inset 0 0 0 0.8px rgba(255,255,255,.05);
  z-index:3;
}
.screen{
  position:relative;
  width:100%;
  height:100%;
  border-radius:18px;
  background:#fff;
  padding:14px 13px;           /* 기존 18px → 14px */
  display:flex;
  flex-direction:column;
  gap:9px;
  color:#111;
  overflow:hidden;
}

/* 내부 콘텐츠 */
.brand{
  margin-top:18px;
  text-align:center;
  font-weight:900;
  font-size:16px;
  color:#111;
}
.input-wrap{
  display:flex; flex-direction:column; gap:6px;
}
label{ font-size:13px; font-weight:800; color:#222 }
.input, textarea{
  width:100%;
  border:1px solid #d5d5d5;
  border-radius:12px;
  padding:10px 12px;
  background:#fff;
  color:#111;              /* ← 검정 고정 */
  font-size:14px;
}
textarea{ min-height:96px; resize:vertical }

/* 버튼들 */
.action-btn{
  height:46px;
  border-radius:14px;
  border:0;
  background:#111;         /* 검정 버튼 */
  color:#fff;
  font-size:15px; font-weight:900;
  cursor:pointer;
  transition:transform .06s ease, opacity .2s ease;
}
.action-btn:active{ transform:translateY(1px) }
.action-btn:hover{ opacity:.92 }

/* 안내 */
.tip{
  font-size:12px; color:#444; text-align:center; line-height:1.42;
  margin-top:6px;
}

/* 측면 버튼(장식) */
.side-btns{
  position:absolute; right:-5px; top:70px;   /* 위치 비율도 살짝 조정 */
  width:2.5px; height:48px;
  border-radius:2px;
  background:#7e7e7e;
  box-shadow: inset 0 0 0 0.8px rgba(255,255,255,.4), 0 0 0 0.8px rgba(0,0,0,.2);
}
</style>
