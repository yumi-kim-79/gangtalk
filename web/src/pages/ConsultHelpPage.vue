<!-- src/pages/ConsultHelpPage.vue -->
<template>
  <main class="page consult-page">
    <header class="page-head">
      <h1>{{ title }}</h1>
      <p class="subtitle">궁금한 점을 빠르게 해결해 드립니다.</p>
    </header>

    <!-- 운영시간 -->
    <section class="card">
      <h2>운영시간</h2>
      <p class="hours">평일 10:00 ~ 19:00 (주말/공휴일 제외)</p>
      <p class="note">
        상담 접수는 24시간 가능하며, 근무 시간 내 순차적으로 답변 드립니다.
      </p>
    </section>

    <!-- 문의하기 -->
    <section class="card">
      <h2>문의하기</h2>
      <div class="contact-list">
        <div class="row">
          <span class="label">카카오톡채널</span>
          <div class="value">
            <code>@gangtalk</code>
            <button class="copy" @click="copy('@gangtalk')">복사</button>
          </div>
        </div>
        <div class="row">
          <span class="label">이메일</span>
          <div class="value">
            <code>gangtalk815@gmail.com</code>
            <button class="copy" @click="copy('gangtalk815@gmail.com')">복사</button>
          </div>
        </div>
      </div>

      <!-- ✅ 법률 상담 전용 액션 (legal 일 때만) -->
      <div v-if="kind === 'legal'" class="legal-actions">
        <button
          type="button"
          class="legal-write-btn"
          @click="goLegalBoard"
        >
          법률상담 글 작성
        </button>
        <button
          type="button"
          class="contact-call-btn"
          @click="callSupport"
        >
          상담 연결 (전화)
        </button>
      </div>

      <!-- 세무/창업 상담은 전화 버튼만 -->
      <button
        v-else
        type="button"
        class="contact-call-btn"
        @click="callSupport"
      >
        상담 연결 (전화)
      </button>
    </section>

    <!-- FAQ -->
    <section class="card">
      <h2>자주 묻는 질문 (FAQ)</h2>
      <details v-for="(q, i) in faqs" :key="i" class="faq">
        <summary>
          <span class="q">Q.</span>
          <span class="qt">{{ q.q }}</span>
        </summary>
        <div class="ans">
          <span class="a">A.</span>
          <div class="at" v-html="q.a"></div>
        </div>
      </details>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

type Kind = 'legal' | 'tax' | 'startup'

const route = useRoute()
const router = useRouter()

const kind = (route.params.kind as Kind) || 'legal'

const title = computed(() => {
  if (kind === 'legal') return '무료법률상담'
  if (kind === 'tax') return '무료세무상담'
  return '무료창업상담'
})

/* ================= 법률상담 게시판 이동 ================= */
/* 여기서도 name 대신 path 로 직접 이동 */
function goLegalBoard() {
  router.push('/legal-board')
}

/* ================= 상담연결(전화) =================
 * 실제 연락처 수정 위치:
 *  - 아래 SUPPORT_PHONE 값을 실제 담당자 번호로 바꾸면 됨
 *    예) '010-1234-5678'
 =================================================== */
const SUPPORT_PHONE = '010-0000-0000'

function callSupport() {
  const tel = SUPPORT_PHONE.replace(/[^0-9+]/g, '')
  if (!tel) return
  window.location.href = `tel:${tel}`
}

type FAQ = { q: string; a: string }

const faqs = computed<FAQ[]>(() => {
  if (kind === 'legal') {
    return [
      {
        q: '무료 범위는 어디까지인가요?',
        a: '기본 사실관계 확인 및 1차 법률적 판단, 절차 안내까지 무료입니다. 서면 작성이나 대리 업무는 별도 비용이 발생할 수 있어요.',
      },
      {
        q: '어떤 방식으로 상담하나요?',
        a: '카카오톡/이메일로 먼저 내용을 접수하시면 검토 후 채팅 또는 전화로 답변 드립니다. 필요한 경우 오프라인 면담을 연결해 드립니다.',
      },
      {
        q: '필요한 준비 자료가 있나요?',
        a: '관련 계약서, 상대방과 주고받은 메시지/이메일, 녹취/사진 등 입증 가능한 자료를 파일로 첨부해 주세요.',
      },
      {
        q: '답변까지 얼마나 걸리나요?',
        a: '운영시간 내 평균 1~3영업일 이내입니다. 사실관계 파악이 복잡한 경우 추가 시간이 필요할 수 있어요.',
      },
      {
        q: '법률 책임은 누가 지나요?',
        a: '제공되는 상담은 참고용 일반 정보입니다. 실제 진행은 변호사 선임 및 별도 위임계약 체결이 필요합니다.',
      },
    ]
  }
  if (kind === 'tax') {
    return [
      {
        q: '무료 상담 내용은 무엇인가요?',
        a: '기본 세목(부가가치세·종합소득세·원천세) 신고 안내, 증빙 준비, 절세 팁 등 1차 자문을 제공합니다.',
      },
      {
        q: '기장/신고 대행도 가능한가요?',
        a: '가능합니다. 기장/신고는 유료 서비스이며 필요 시 제휴 세무사와 연결해 드려요.',
      },
      {
        q: '사업자등록/4대보험 관련도 상담되나요?',
        a: '네. 신규 사업자등록 절차, 부가세 과세유형, 4대보험 가입/변경 등 기본 가이드를 드립니다.',
      },
      {
        q: '자료는 어떻게 제출하나요?',
        a: '매출/매입 내역, 카드·현금영수증, 세금계산서, 통장사본 등을 사진 또는 파일로 첨부해 주세요.',
      },
      {
        q: '세무조사/경정청구도 도와주나요?',
        a: '사안에 따라 가능하며 전문 세무사와 추가 상담을 연결합니다(별도 수임).',
      },
    ]
  }
  // startup
  return [
    {
      q: '창업 상담은 어떤 내용을 다루나요?',
      a: '업종·입지 검토, 인허가 필요 여부, 사업자등록 절차, 세무/노무 초기 체크리스트를 안내합니다.',
    },
    {
      q: '필수 인허가가 필요한지 어떻게 확인하나요?',
      a: '업종별 인허가 현황을 함께 확인하고, 필요 시 관할 지자체·협회 안내를 드립니다.',
    },
    {
      q: '임대차 계약 시 주의사항은?',
      a: '권리금·보증금·공용면적·시설공사 범위 등을 반드시 계약서에 명시하고, 특약 조항을 꼼꼼히 확인하세요.',
    },
    {
      q: '브랜드(상표) 관련도 상담되나요?',
      a: '간단한 상표검색/출원 가이드를 드리며, 전문 변리사 연결이 필요하면 연계합니다.',
    },
    {
      q: '창업 비용과 자금 조달은?',
      a: '초기 투자 항목(보증금·시설비·인테리어·장비·홍보비) 점검표와 정책자금/보증 안내를 제공합니다.',
    },
  ]
})

function copy(text: string) {
  navigator.clipboard?.writeText(text).then(() => {
    alert('복사되었습니다.')
  })
}
</script>

<style scoped>
/* ───── 기본(라이트) ───── */
.page{
  padding: 16px 16px 88px;
  background: var(--bg, #fafafa);
  color: var(--fg, #111);
}
.page-head{ margin: 8px 4px 12px; }
.page-head h1{ font-size: 20px; font-weight: 800; }
.subtitle{ color:#888; margin-top:4px; font-size: 13px; }

.card{
  background:#fff;
  border:1px solid var(--line, #eee);
  border-radius: 14px;
  box-shadow: 0 6px 16px rgba(0,0,0,.06);
  padding:14px;
  margin-bottom:12px;
}
.card h2{ font-size: 16px; font-weight: 800; margin-bottom: 10px; }

.hours{ font-weight:700; }
.note{ color:#777; font-size: 13px; margin-top: 6px; }

/* 문의하기 */
.contact-list .row{
  display:flex; align-items:center; justify-content:space-between;
  gap:10px; padding:10px 0; border-top:1px solid #f2f2f2;
}
.contact-list .row:first-child{ border-top:none; }
.label{ color:#666; font-size: 13px; }
.value{ display:flex; align-items:center; gap:8px; }
.value code{
  background:#f7f7f7; border:1px solid #eee; padding:6px 8px; border-radius:8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color:#111; -webkit-text-fill-color:#111;
}
.copy{
  border:1px solid #ddd; background:#fff; padding:6px 10px; border-radius:8px; cursor:pointer;
  color:#000 !important; -webkit-text-fill-color:#000 !important;
}

/* 법률 상담 전용 버튼 */
.legal-actions{
  display:flex;
  gap:8px;
  margin-top:12px;
}
.legal-write-btn,
.contact-call-btn{
  flex:1;
  height:40px;
  border-radius:10px;
  font-weight:800;
  font-size:14px;
  cursor:pointer;
}
.legal-write-btn{
  border:1px solid #ff6b6b;
  background:#fff;
  color:#ff3b60;
}
.contact-call-btn{
  border:1px solid #ff6b6b;
  background:#ff6b6b;
  color:#fff;
}

/* FAQ */
.faq{
  border:1px solid #f1f1f1; border-radius:12px; padding:10px 12px; margin-bottom:8px;
  background:#fff;
}
.faq summary{
  list-style:none; cursor:pointer; display:flex; align-items:flex-start; gap:8px;
}
.faq summary::-webkit-details-marker{ display:none; }
.q{ color:#e54; font-weight:800; }
.qt{ flex:1; font-weight:700; color:#222; }
.ans{ display:flex; gap:8px; padding:10px 2px 2px; }
.a{ color:#2a9d5b; font-weight:800; }
.at{ color:#333; }

/* ───── 다크(black) 테마 ───── */
:global(html[data-theme="black"] .consult-page){
  --bg:      #0f1012;
  --fg:      #f5f5f7;
  --surface: #17181b;
  --line:    #2a2b31;
  --muted:   #aeb4bb;
  --shadow:  rgba(0,0,0,.55);

  background: var(--bg) !important;
  color: var(--fg) !important;
}

:global(html[data-theme="black"] .consult-page .subtitle){
  color: var(--muted) !important;
}

:global(html[data-theme="black"] .consult-page .card){
  background: var(--surface) !important;
  border: 1px solid var(--line) !important;
  box-shadow: 0 4px 12px var(--shadow) !important;
}
:global(html[data-theme="black"] .consult-page .card h2),
:global(html[data-theme="black"] .consult-page .hours){
  color:#fff !important;
}
:global(html[data-theme="black"] .consult-page .note){
  color: var(--muted) !important;
}
:global(html[data-theme="black"] .consult-page .label){
  color: var(--muted) !important;
}
:global(html[data-theme="black"] .consult-page .value code){
  background:#0f1114 !important;
  border-color:#262a31 !important;
  color:#e9eef5 !important;
  -webkit-text-fill-color:#e9eef5 !important;
}
:global(html[data-theme="black"] .consult-page .copy){
  background:#2b2f36 !important;
  border-color:#3a3f47 !important;
  color:#cfd4dc !important;
  -webkit-text-fill-color:#cfd4dc !important;
}
:global(html[data-theme="black"] .consult-page .contact-list .row){
  border-top-color:#2a2e35 !important;
}
:global(html[data-theme="black"] .consult-page .faq){
  background: var(--surface) !important;
  border-color: var(--line) !important;
}
:global(html[data-theme="black"] .consult-page .qt){
  color:#eef0f3 !important;
}
:global(html[data-theme="black"] .consult-page .at){
  color:#c7cbd3 !important;
}
:global(html[data-theme="black"] .consult-page .q){
  color:#ff6a6a !important;
}
:global(html[data-theme="black"] .consult-page .a){
  color:#21c36b !important;
}
:global(html[data-theme="black"] .consult-page .legal-write-btn){
  background:#262730 !important;
  border-color:#ff6b88 !important;
  color:#ff9fb7 !important;
}
:global(html[data-theme="black"] .consult-page .contact-call-btn){
  background:#ff4d6a !important;
  border-color:#ff4d6a !important;
}
</style>
