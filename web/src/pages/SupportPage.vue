<!-- src/pages/SupportPage.vue -->
<template>
  <main class="container" style="padding-bottom:120px;">

    <!-- ✅ 작성자 전용: 법률상담 게시판 (고객센터 타이틀 위에 위치) -->
    <section
      v-if="isWriter"
      class="card shadow legal-board-card"
    >
      <div class="legal-board-head">
        <h3 class="sec-ttl">법률상담 게시판</h3>
        <span class="legal-badge">작성자 전용</span>
      </div>
      <p class="legal-board-desc">
        접수된 법률 상담 글과 답변을 한 곳에서 관리하는 내부용 게시판입니다.
      </p>

      <div class="legal-board-actions">
        <button
          type="button"
          class="legal-board-btn"
          @click="goLegalBoard"
        >
          법률상담 게시판 열기
        </button>
        <button
          type="button"
          class="legal-connect-btn"
          @click="callSupport"
        >
          법률상담 연결 (전화)
        </button>
      </div>
    </section>

    <!-- 고객센터 헤더 -->
    <header class="page-head">
      <h2>고객센터</h2>
      <div class="hours">
        <span class="label">운영시간</span>
        <span class="time">10:00 ~ 19:00 (주말/공휴일 제외)</span>
      </div>
    </header>

    <!-- 연락처 카드: 채널 ID와 이메일만 노출 -->
    <section class="card shadow contact-card">
      <h3 class="sec-ttl">문의하기</h3>
      <ul class="kv">
        <li class="row">
          <span class="k">카카오톡채널</span>
          <span class="v nowrap">
            @{{ kakaoId }}
            <button class="mini-btn" @click="copy(`@${kakaoId}`)">복사</button>
            <!-- 채널 URL이 준비되면 열기 버튼 자동 노출 -->
            <button v-if="kakaoUrl" class="mini-btn" @click="open(kakaoUrl)">열기</button>
          </span>
        </li>
        <li class="row">
          <span class="k">이메일</span>
          <span class="v nowrap">
            <a :href="`mailto:${email}`">{{ email }}</a>
            <button class="mini-btn" @click="copy(email)">복사</button>
          </span>
        </li>
      </ul>
      <!-- ⚠ 여기에는 일반 상담 연결 버튼 제거됨 -->
    </section>

    <!-- FAQ -->
    <section class="card shadow faq-card">
      <h3 class="sec-ttl">자주 묻는 질문 (FAQ)</h3>
      <ul class="faq-list">
        <li v-for="(f, i) in faqs" :key="i" class="faq-item">
          <button class="faq-q" @click="toggleFAQ(i)" :aria-expanded="openIndex === i">
            <span class="q">Q.</span>
            <span class="txt">{{ f.q }}</span>
            <span class="arrow" :class="{ on: openIndex === i }">▾</span>
          </button>
          <div class="faq-a" v-show="openIndex === i">
            <span class="a">A.</span>
            <div class="ans" v-html="f.a"></div>
          </div>
        </li>
      </ul>
    </section>
  </main>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { me as user } from '@/store/user.js'

const router = useRouter()

/* 📞 법률상담 연결 전화번호
   → 실제 번호로 바꾸고 싶으면 여기 값만 수정하면 됨 */
const SUPPORT_PHONE = '010-5919-0815'

/* ========== 작성자(상담자/관리자) 판별 ==========
   👉 지금은 "로그인만 되어 있으면" 카드가 보이도록 처리
================================================ */
const isWriter = computed(() => {
  const a = (user && (user.auth?.value ?? user.auth)) || {}
  const logged =
    !!a.loggedIn ||
    !!a.uid ||
    !!a.email
  return logged
})

/* ========== 법률상담 게시판 이동 ========== */
/*  이름 매칭 문제를 피하기 위해 name 대신 path 로 직접 이동 */
function goLegalBoard () {
  router.push('/legal-board')
}

/** 채널 ID만 노출. 실제 URL이 생기면 kakaoUrl 에 넣어주면 됩니다. */
const kakaoId  = 'gangtalk'
const kakaoUrl = '' // 예: 'https://pf.kakao.com/_XXXXXXXX' (생성 후 채워넣기)

/** 문의 이메일 */
const email = 'gangtalk815@gmail.com'

function open (url) { window.open(url, '_blank') }

async function copy (text) {
  try {
    await navigator.clipboard.writeText(text)
    alert('복사되었습니다.')
  } catch {
    alert('복사에 실패했습니다. 길게 눌러 직접 복사해주세요.')
  }
}

/* ========== 상담연결(전화) ========== */
function callSupport () {
  const tel = SUPPORT_PHONE.replace(/[^0-9+]/g, '')
  if (!tel) return
  window.location.href = `tel:${tel}`
}

/** FAQ */
const faqs = ref([
  {
    q: '회원가입 없이 사용할 수 있나요?',
    a: '일부 화면은 열람만 가능하지만, 채팅/게시판/제휴 문의 등 주요 기능은 회원가입이 필요합니다.'
  },
  {
    q: '가게 정보가 잘못되었어요. 수정 요청은 어디서 하나요?',
    a: '해당 가게 상세 화면의 <b>[게시판]</b> 또는 고객센터 이메일(<a href="mailto:gangtalk815@gmail.com">gangtalk815@gmail.com</a>)로 알려주세요.'
  },
  {
    q: '현황판 숫자(맞출방/필요인원)는 얼마나 자주 업데이트되나요?',
    a: '운영자가 수시로 업데이트하며, 일부 항목은 자동 수집됩니다. 새로고침 버튼을 눌러 최신 정보를 확인하세요.'
  },
  {
    q: '카카오톡 채널로 접속이 안 돼요.',
    a: '채널 URL 연결이 아직 준비되지 않았거나 일시 장애일 수 있어요. 잠시 후 다시 시도하거나 고객센터로 문의해주세요.'
  },
  {
    q: '광고/제휴는 어떻게 진행하나요?',
    a: '이메일(<a href="mailto:gangtalk815@gmail.com">gangtalk815@gmail.com</a>) 또는 카카오톡 채널(@gangtalk)로 연락 주세요. 담당자가 안내드립니다.'
  }
])

const openIndex = ref(0)
function toggleFAQ (i) {
  openIndex.value = (openIndex.value === i) ? -1 : i
}
</script>

<style scoped>
.container{
  max-width:720px;
  margin:0 auto;
  /* ✅ 상단 고정 탑바에 가리지 않도록 위쪽 여유 추가 */
  padding:calc(var(--topbar-h, 56px) + 8px) 14px 24px;
}

.page-head{ display:flex; flex-direction:column; gap:6px; margin-bottom:10px; }
h2{ margin:0; font-size:20px; font-weight:900; }
.hours{ display:flex; align-items:center; gap:8px; color:var(--muted); }
.hours .label{ font-weight:800; }
.hours .time{ font-weight:600; }

.card{
  border:1px solid var(--line);
  border-radius:14px;
  background:var(--surface);
  color:var(--fg);
  padding:14px;
  margin-top:10px;
}
.shadow{ box-shadow:0 4px 12px var(--shadow); }
.sec-ttl{ margin:0 0 8px; font-size:16px; font-weight:900; }

/* ===== 문의하기 영역 ===== */
.kv{ list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:10px; }
.kv .row{ display:flex; justify-content:space-between; gap:10px; }
.kv .k{ color:var(--muted); font-weight:700; }
.kv .v{ font-weight:800; display:flex; align-items:center; gap:6px; }
.kv .v.nowrap{ white-space:nowrap; flex-wrap:nowrap; }

.mini-btn{
  height:26px; padding:0 8px; border-radius:999px;
  border:1px solid var(--line); background:var(--surface);
  font-weight:800; font-size:12px; color:var(--fg);
}

/* ===== FAQ ===== */
.faq-list{ list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:8px; }
.faq-item{ border:1px solid var(--line); border-radius:12px; overflow:hidden; background:var(--bg); }
.faq-q{
  width:100%; text-align:left; border:0; background:var(--surface);
  padding:12px; font-weight:900; display:flex; align-items:center; gap:8px;
}
.faq-q .q{ color:#ff6a6a; } /* Q. 는 기존처럼 강조색 유지 */
.faq-q .arrow{ margin-left:auto; transition:transform .15s ease; }
.faq-q .arrow.on{ transform:rotate(180deg); }

/* 화이트 모드에서 질문 텍스트를 확실히 검정으로 */
:root[data-theme="white"] .faq-q .txt{
  color:#111 !important;
}

.faq-a{ padding:12px; display:flex; gap:8px; border-top:1px dashed var(--line); background:var(--surface); }
.faq-a .a{ color:#21c36b; font-weight:900; }
.faq-a .ans{ font-weight:600; }
a{ color:inherit; text-decoration: underline; text-underline-offset: 2px; }

/* ===== 법률상담 게시판 카드 ===== */
.legal-board-card{
  border-color:#ffd9e0;
  /* ✅ 아래쪽에 여유를 줘서 '고객센터'랑 간격 확보 */
  margin-bottom:16px;
}

.legal-board-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  margin-bottom:6px;
}
.legal-badge{
  padding:2px 8px;
  border-radius:999px;
  background:#ffe9ef;
  color:#d6375b;
  font-size:11px;
  font-weight:700;
}
.legal-board-desc{
  font-size:13px;
  color:#555;
  margin-bottom:10px;
}
.legal-board-actions{
  display:flex;
  gap:8px;
  margin-top:4px;
}
.legal-board-btn,
.legal-connect-btn{
  flex:1;
  height:38px;
  border-radius:10px;
  font-weight:800;
  cursor:pointer;
}
.legal-board-btn{
  border:1px solid #ff6b6b;
  background:#fff;
  color:#ff3b60;
}
.legal-connect-btn{
  border:1px solid #ff6b6b;
  background:#ff6b6b;
  color:#fff;
}
</style>
