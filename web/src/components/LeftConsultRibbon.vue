<template>
  <!-- 고정 래퍼: 화면 세로 정중앙 -->
  <div class="consult-root">
    <!-- 펼쳐진 패널 -->
    <transition name="slide-in-left">
      <div v-if="phase === 'panel'" class="ribbon" @click.stop>
        <div class="ribbon-header">
          <strong>무료 상담</strong>
          <button class="btn-x" @click="dock()" aria-label="닫기">
            <svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <line x1="6" y1="6" x2="18" y2="18"/>
              <line x1="18" y1="6" x2="6" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="ribbon-body">
          <button class="tab" @click="onTap('무료법률상담')">
            <i class="ri-scales-3-line" />
            <span class="twolines">
              <b>{{ split6('무료법률상담').line1 }}</b>
              <em>{{ split6('무료법률상담').line2 }}</em>
            </span>
          </button>

          <button class="tab" @click="onTap('무료세무상담')">
            <i class="ri-receipt-tax-line" />
            <span class="twolines">
              <b>{{ split6('무료세무상담').line1 }}</b>
              <em>{{ split6('무료세무상담').line2 }}</em>
            </span>
          </button>

          <button class="tab" @click="onTap('무료창업상담')">
            <i class="ri-store-2-line" />
            <span class="twolines">
              <b>{{ split6('무료창업상담').line1 }}</b>
              <em>{{ split6('무료창업상담').line2 }}</em>
            </span>
          </button>
        </div>
      </div>
    </transition>

    <!-- 왼쪽 작은 아이콘(도킹 상태) -->
    <transition name="fade">
      <button
        v-if="phase === 'docked'"
        class="dock-btn"
        @click="openPanelFromDock()"
        aria-label="무료 상담 열기"
      >
        <span class="dock-label">무료상담</span>
      </button>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { adminInquiryService } from '@/services/adminInquiryService'

type Phase = 'hidden' | 'panel' | 'docked'

/** 자동 노출 타이밍: 2초 후 펼침, 5초 후 자동 도킹 */
const VISIBLE_DELAY_MS = 2000
const AUTO_DOCK_MS = 5000

const COOLDOWN_MS = 3 * 60 * 1000
const LS_KEY = 'consult_ribbon_last_shown_ms'
const SS_PHASE_KEY = 'consult_ribbon_phase'

const phase = ref<Phase>('hidden')
const router = useRouter()

let t1: number | null = null
let t2: number | null = null

function clearTimers() {
  if (t1) window.clearTimeout(t1)
  if (t2) window.clearTimeout(t2)
  t1 = t2 = null
}

function scheduleFirstShow() {
  const savedPhase = sessionStorage.getItem(SS_PHASE_KEY)
  if (savedPhase === 'docked') {
    phase.value = 'docked'
    return
  }

  const last = Number(localStorage.getItem(LS_KEY) ?? 0)
  const now = Date.now()
  if (now - last < COOLDOWN_MS) {
    phase.value = 'docked'
    sessionStorage.setItem(SS_PHASE_KEY, 'docked')
    return
  }

  t1 = window.setTimeout(() => {
    localStorage.setItem(LS_KEY, String(Date.now()))
    phase.value = 'panel'
    t2 = window.setTimeout(() => {
      dock()
      sessionStorage.setItem(SS_PHASE_KEY, 'docked')
    }, AUTO_DOCK_MS)
  }, VISIBLE_DELAY_MS)
}

function dock() {
  clearTimers()
  phase.value = 'docked'
  sessionStorage.setItem(SS_PHASE_KEY, 'docked')
}
function openPanelFromDock() { phase.value = 'panel' }

// 라우팅용 kind 매핑 (path: /consult/:kind)
function kindFromType(type: '무료법률상담'|'무료세무상담'|'무료창업상담') {
  if (type === '무료법률상담') return 'legal'
  if (type === '무료세무상담') return 'tax'
  return 'startup'
}

async function onTap(type: '무료법률상담' | '무료세무상담' | '무료창업상담') {
  try {
    // 1) 관리자 알림/스레드 생성
    await adminInquiryService.createInquiry(type)
  } catch (e) {
    // 알림 실패하더라도 페이지 이동은 계속
  } finally {
    // 2) 페이지 이동 (고객센터 레이아웃 복제)
    router.push({ name: 'ConsultHelp', params: { kind: kindFromType(type) } })
    // 3) 패널은 도킹
    dock()
  }
}

/** 4글자/2글자 두 줄로 고정 출력 */
function split6(text: string) {
  const t = (text || '').replace(/\s+/g, '')
  return { line1: t.slice(0, 4), line2: t.slice(4, 6) }
}

onMounted(() => { scheduleFirstShow() })
onUnmounted(() => { clearTimers() })
</script>

<style scoped>
/* 루트: 화면 왼쪽, 세로 정중앙 */
.consult-root{
  position: fixed;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10010;
}

/* ===== 패널 ===== */
.ribbon{
  width: 96px;
  background: #fff;
  border: 1px solid #f0cddd;
  border-top-right-radius: 12px;
  border-bottom-right-radius: 12px;
  box-shadow: 2px 6px 12px rgba(0,0,0,.14);
  padding: 6px 6px 8px;
  margin-left: -1px;
}
.ribbon-header{
  display:flex; align-items:center; justify-content:space-between;
  margin-bottom: 4px;
}
.ribbon-header strong{
  font-size: 12px; color:#cc2a5d; font-weight: 800;
}

/* 닫기(X) — 중앙 + 얇은 선 */
.btn-x{
  width: 26px; height: 26px;
  border-radius: 8px; border: 1px solid #eaeaea;
  background:#fff !important;
  cursor:pointer;
  display:flex; align-items:center; justify-content:center;
}
.x-icon{ width: 18px; height: 18px; }
.btn-x .x-icon{
  fill:none !important;
  stroke:#000 !important;
  stroke-width:1.35 !important;
  stroke-linecap:round; stroke-linejoin:round;
}

/* 버튼 리스트 */
.ribbon-body{ display:flex; flex-direction:column; gap:6px; }

/* 아이콘 위 / 텍스트 아래 — 중앙 정렬 */
.tab{
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:6px; padding:6px 8px;
  border-radius:10px; background:#fff4f7; border:1px solid #ffc3d8;
  color:#cc2a5d; cursor:pointer; text-align:center;
}
.tab i{ font-size:16px; color:#e91e63; }

/* 4글자/2글자 두 줄 - 중앙 */
.twolines{
  display:flex; flex-direction:column; align-items:center; text-align:center;
  line-height:1.05; white-space:nowrap;
}
.twolines b{ font-size:12px; font-weight:800; letter-spacing:-0.2px; }
.twolines em{ font-size:11px; font-style:normal; opacity:.95; letter-spacing:-0.2px; }

/* ===== 도킹 버튼 (왼쪽 박스) — 폭 절반 + 세로 텍스트(검정) ===== */
.dock-btn{
  position:absolute; left:0; top:50%;
  transform: translate(0, -50%);
  width: 16px;
  height: 60px;
  padding: 6px 0;
  border-radius: 12px;
  border: 1px solid #ffd1e2;
  background:#fff0f6;
  color:#000;
  cursor:pointer;
  box-shadow: 0 6px 14px rgba(0,0,0,.14);
  display:flex; align-items:center; justify-content:center;
}
.dock-label{
  writing-mode: vertical-rl;
  text-orientation: upright;  /* 그대로 사용해도 OK (upright로 바꿔도 무방) */
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.5px;
  color:#000;
  line-height: 1;

  /* ✅ 세로 글자 줄바꿈/분리 방지 */
  white-space: nowrap;      /* 줄바꿈 금지 */
  word-break: keep-all;     /* 한글 단어 분리 금지 */
  overflow: hidden;         /* 혹시 모를 넘침 방지 */
}


/* 애니메이션 */
.slide-in-left-enter-active,
.slide-in-left-leave-active{ transition: transform .28s cubic-bezier(.22,1,.36,1), opacity .18s ease; }
.slide-in-left-enter-from,
.slide-in-left-leave-to{ transform: translateX(-110%); opacity: 0; }
.fade-enter-active, .fade-leave-active{ transition: opacity .18s ease; }
.fade-enter-from, .fade-leave-to{ opacity: 0; }
</style>
