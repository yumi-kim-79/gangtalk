<!-- src/components/BrandLogo.vue -->
<template>
  <div class="logo" :style="{ '--s': size + 'px' }" role="img" aria-label="앱 로고">
    <svg class="svg" viewBox="0 0 120 120" aria-hidden="true">
      <!-- 핑크 라운디드 정사각 배경 -->
      <rect
        v-if="showSquare"
        x="6" y="6" width="108" height="108" rx="26"
        :fill="PINK"
      />

      <!-- 말풍선 -->
      <g :fill="bubble" :stroke="bubble">
        <ellipse cx="60" cy="58" rx="36" ry="28" />
        <path d="M60 86 L50 99 L52 84 Z" />
      </g>

      <!-- 안의 글자(강/강톡 등) -->
      <text
        x="60" y="58"
        text-anchor="middle" dominant-baseline="central"
        :fill="fg"
        style="font-weight:900; font-size:30px; letter-spacing:-0.02em;
               font-family:'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif;">
        {{ glyph }}
      </text>
    </svg>

    <!-- 오른쪽 워드마크: 기본 숨김, 필요 시 showWord=true -->
    <span v-if="showWord" class="word" :style="{ color: wordColor }">
      {{ label }}
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

/**
 * variant:    'pink-brown' | 'pink-white'
 * size:       아이콘 한 변(px)
 * glyph:      말풍선 안 텍스트(기본 '강톡')
 * label:      오른쪽 워드마크 텍스트(기본 '강남톡방')
 * showSquare: 배경 라운드 정사각형 표시 여부
 * showWord:   오른쪽 워드마크 표시 여부(기본 false → 아이콘만)
 * wordColor:  워드마크 컬러
 */
const props = defineProps({
  variant:    { type: String, default: 'pink-brown' },
  size:       { type: Number, default: 44 },
  glyph:      { type: String, default: '강톡' },
  label:      { type: String, default: '강남톡방' },
  showSquare: { type: Boolean, default: true },
  showWord:   { type: Boolean, default: false },   // ✅ 추가: 기본 아이콘만
  wordColor:  { type: String, default: '#FF2E7E' },
})

/* 팔레트 */
const PINK  = '#FF86B3'
const BROWN = '#4E342E'
const WHITE = '#FFFFFF'

/* 말풍선/전경 색상(테마) */
const bubble = computed(() => props.variant === 'pink-white' ? WHITE : BROWN)
const fg     = computed(() => props.variant === 'pink-white' ? BROWN : WHITE)

/* 외부에서 사용할 수 있도록 PINK 노출 */
defineExpose({ PINK })
</script>

<style scoped>
.logo{
  display:inline-flex;
  align-items:center;
  gap:10px;
}
.svg{
  width:var(--s);
  height:var(--s);
  display:block;
}
.word{
  font-weight:900;
  line-height:1;
  /* 아이콘 크기에 비례해서 자동 스케일 */
  font-size:calc(var(--s) * 0.55);
  letter-spacing:-0.02em;
  transform: translateY(1px); /* 수직정렬 보정 */
}
</style>
