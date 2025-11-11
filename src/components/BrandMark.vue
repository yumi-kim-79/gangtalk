<template>
  <div class="brand" :style="{ height: size + 'px' }" role="img" aria-label="강남톡방">
    <svg class="ic" :width="size" :height="size" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="sd" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" flood-color="#ff2e7e55"/>
        </filter>
      </defs>
      <g filter="url(#sd)">
        <path d="M10 4 h28 a10 10 0 0 1 10 10 v14 a10 10 0 0 1-10 10 h-16 l-7.5 6.5 a2.5 2.5 0 0 1-4-1.9V38 H10 a10 10 0 0 1-10-10 V14 A10 10 0 0 1 10 4 Z"
              :fill="bubble"/>
      </g>
      <path d="M12 8 h24 a8 8 0 0 1 8 8 v10 a8 8 0 0 1-8 8 H20 l-6 5 v-5 h-2 a8 8 0 0 1-8-8 V16 A8 8 0 0 1 12 8 Z"
            :fill="inner"/>
      <text x="24" y="22" :fill="wordIn"
            :font-weight="theme === 'pinkWhite' ? 900 : 800"
            font-size="13" text-anchor="middle" dominant-baseline="central"
            font-family="Pretendard, 'Noto Sans KR', system-ui, -apple-system, 'Segoe UI', sans-serif">강톡</text>
    </svg>

    <span class="word" :style="{ color: wordColor }">강남톡방</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  theme: { type: String, default: 'pinkBrown' }, // 'pinkBrown' | 'pinkWhite'
  size:  { type: Number, default: 40 },          // 아이콘 한 변(px)
  wordColor: { type: String, default: '#FF2E7E' }
})

const bubble = '#FF4B8D'
const inner  = '#FF6CA3'
const wordIn = computed(() => props.theme === 'pinkWhite' ? '#FFFFFF' : '#3E2723')
</script>

<style scoped>
.brand{
  display:flex; align-items:center; gap:10px;
}
.ic{ flex:0 0 auto; display:block }
.word{
  font-weight:900; font-size:22px; letter-spacing:-0.4px;
  transform: translateY(1px);
}
</style>
