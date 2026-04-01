<!-- src/components/GuideOverlay.vue -->
<template>
  <!-- v-model 로 열린 상태일 때만 표시 -->
  <div v-if="modelValue" class="guide-mask" @click.self="close">
    <section class="guide-sheet" role="dialog" aria-modal="true">
      <!-- 상단 헤더 -->
      <header class="guide-head">
        <strong>강톡 이용 안내</strong>
        <button type="button" class="guide-close" @click="close">✕</button>
      </header>

      <!-- 슬라이드 영역 (옆으로 넘기기) -->
      <div
        class="guide-body"
        @touchstart.passive="onTouchStart"
        @touchmove.passive="onTouchMove"
        @touchend.passive="onTouchEnd"
      >
        <div class="guide-slides">
          <article
            v-for="(slide, idx) in localSlides"
            :key="slide.key || idx"
            class="guide-slide"
            :class="{ active: idx === index }"
          >
            <!-- 이미지 -->
            <div class="guide-img">
              <img
                v-if="slide.image"
                class="guide-img-el"
                :src="slide.image"
                :alt="slide.title || '강톡 이용 안내'"
              />
              <span v-else class="guide-img-ph">
                {{ slide.title || '강톡 이용 안내' }} 이미지 자리
              </span>
            </div>

            <!-- showText=false 이면 아래 텍스트는 안 보임 -->
            <template v-if="showText">
              <h3 v-if="slide.title" class="guide-title">
                {{ slide.title }}
              </h3>
              <p v-if="slide.desc" class="guide-desc">
                {{ slide.desc }}
              </p>
            </template>
          </article>
        </div>

        <!-- 하단 인디케이터 점 -->
        <div class="guide-dots">
          <button
            v-for="(slide, idx) in localSlides"
            :key="slide.key || 'dot_' + idx"
            type="button"
            class="dot"
            :class="{ on: idx === index }"
            @click="go(idx)"
          ></button>
        </div>
      </div>

      <!-- 하단 버튼 -->
      <footer class="guide-foot">
        <button
          v-if="index > 0"
          type="button"
          class="g-btn"
          @click="prev"
        >
          이전
        </button>

        <button
          v-if="index < localSlides.length - 1"
          type="button"
          class="g-btn primary"
          @click="next"
        >
          다음
        </button>

        <button
          v-else
          type="button"
          class="g-btn primary"
          @click="finish"
        >
          시작하기
        </button>
      </footer>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

/**
 * props
 * - v-model: modelValue (Boolean)
 * - slides: [{ key?, title?, desc?, image? }]
 * - showText: 이미지 아래에 텍스트(title/desc) 보여줄지 여부
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  slides: {
    type: Array,
    default: () => [],
  },
  showText: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['update:modelValue', 'finish'])

const index = ref(0)

// 슬라이드 없을 경우 기본 안내
const localSlides = computed(() => {
  if (props.slides && props.slides.length) return props.slides
  return [
    {
      key: 'main',
      title: '메인 현황판',
      desc: '맞출방 · 필요인원 · 혼잡도를 한눈에 볼 수 있는 메인 화면입니다.',
      image: '',
    },
    {
      key: 'finder',
      title: '가게 찾기',
      desc: '지역/유형/내 주변으로 원하는 업장을 빠르게 찾을 수 있어요.',
      image: '',
    },
  ]
})

// v-model 이 켜질 때마다 첫 장으로 초기화
watch(
  () => props.modelValue,
  (v) => {
    if (v) index.value = 0
  }
)

function close() {
  emit('update:modelValue', false)
}

function finish() {
  emit('finish')
  close()
}

function next() {
  if (index.value < localSlides.value.length - 1) index.value += 1
}
function prev() {
  if (index.value > 0) index.value -= 1
}
function go(i) {
  const n = Number(i)
  if (!Number.isFinite(n)) return
  if (n < 0 || n >= localSlides.value.length) return
  index.value = n
}

/* ─── 터치 스와이프 (옆으로 넘기기) ─── */
const touch = {
  active: false,
  x: 0,
  y: 0,
}

function onTouchStart(e) {
  const t = e.touches?.[0]
  if (!t) return
  touch.active = true
  touch.x = t.clientX
  touch.y = t.clientY
}

function onTouchMove() {
  if (!touch.active) return
}

function onTouchEnd(e) {
  if (!touch.active) return
  const t = e.changedTouches?.[0]
  touch.active = false
  if (!t) return

  const dx = t.clientX - touch.x
  const dy = t.clientY - touch.y

  // 가로 스와이프만 인식
  if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return

  if (dx < 0) {
    // 왼쪽으로 밀기 → 다음
    next()
  } else {
    // 오른쪽으로 밀기 → 이전
    prev()
  }
}
</script>

<style scoped>
.guide-mask {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.55);
  display: grid;
  place-items: center;
}

/* 모달 전체: 화면 안에서 스크롤 가능하도록 max-height + flex */
.guide-sheet {
  width: 100%;
  max-width: 440px;
  max-height: 100dvh;
  border-radius: 18px;
  background: var(--surface);
  color: var(--fg);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  padding: 12px 14px 10px;
  display: flex;
  flex-direction: column;
}

/* 헤더 */
.guide-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 2px 8px;
  border-bottom: 1px solid var(--line);
}
.guide-head strong {
  font-size: 16px;
  font-weight: 900;
}
.guide-close {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--surface);
  display: grid;
  place-items: center;
  font-weight: 900;
}

/* 본문: 남은 영역 전체 + 세로 스크롤 */
.guide-body {
  flex: 1;
  padding: 10px 2px 4px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 슬라이드 */
.guide-slides {
}

.guide-slide {
  display: none;
  flex-direction: column;
  gap: 8px;
}
.guide-slide.active {
  display: flex;
}

/* 이미지 박스: 비율 고정 X, 높이 제한만 */
.guide-img {
  width: 100%;
  border-radius: 14px;
  background: #111;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

/* 이미지: 가로 100%, 세로는 비율 유지 + 모달 높이 안으로 */
.guide-img-el {
  width: 100%;
  height: auto;
  max-height: 70vh; /* 화면 70% 안에 들어오도록 (필요시 조절) */
  object-fit: contain;
}

.guide-img-ph {
  font-size: 13px;
  color: #fff;
  opacity: 0.8;
  text-align: center;
  padding: 0 12px;
}

/* 텍스트 */
.guide-title {
  margin: 4px 2px 0;
  font-size: 16px;
  font-weight: 800;
}
.guide-desc {
  margin: 0 2px;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.5;
  color: var(--muted);
}

/* 인디케이터 점 */
.guide-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 4px;
}
.guide-dots .dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  border: 0;
  background: rgba(0, 0, 0, 0.2);
}
.guide-dots .dot.on {
  width: 18px;
  background: var(--accent);
}

/* 하단 버튼 */
.guide-foot {
  display: flex;
  gap: 8px;
  padding-top: 6px;
  border-top: 1px solid var(--line);
  margin-top: 6px;
}
.g-btn {
  flex: 1;
  min-width: 0;
  height: 40px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--surface);
  font-weight: 800;
  font-size: 14px;
}
.g-btn.primary {
  background: color-mix(in oklab, var(--accent), white 85%);
  border-color: var(--accent);
}

/* 화이트 모드 색상 */
:root[data-theme='white'] .guide-sheet {
  background: #ffffff;
  color: #111111;
}
:root[data-theme='white'] .guide-head strong {
  color: #111111;
}
:root[data-theme='white'] .guide-title {
  color: #111111;
}
:root[data-theme='white'] .guide-desc {
  color: #555555;
}
:root[data-theme='white'] .guide-close {
  background: #ffffff;
  border-color: #dddddd;
  color: #111111; /* ← X 아이콘 글자색을 진한 검정으로 */
}

:root[data-theme='white'] .g-btn {
  background: #ffffff;
  border-color: #dddddd;
  color: #111111;
}
:root[data-theme='white'] .g-btn.primary {
  background: #ffe3f2;
  border-color: #ff2c8a;
  color: #111111;
}
:root[data-theme='white'] .guide-dots .dot {
  background: rgba(0, 0, 0, 0.16);
}
:root[data-theme='white'] .guide-dots .dot.on {
  background: #ff2c8a;
}
</style>
