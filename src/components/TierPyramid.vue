<!-- src/components/TierPyramid.vue -->
<template>
  <section class="tier-box">
    <!-- 등급 배지 -->
    <div class="row">
      <span class="key">회원 등급</span>
      <span class="val gap">
        <span class="tier-badge" :data-tier="tier.key">
          <img class="tier-badge-img" :src="badgeSrc" :alt="tier.label" />
          {{ tier.label }}
        </span>
      </span>
    </div>

    <!-- 진행 바 (❌ 클릭 이동 없음) -->
    <div class="row no-link">
      <div class="tier-progress" aria-label="등급 진행도">
        <div class="bar">
          <div class="fill" :style="{ width: progressPct + '%' }"></div>
        </div>
        <div class="legend">
          <span class="cur">{{ tier.label }}</span>
          <span class="next" v-if="nextTier">
            다음: {{ nextTier.label }} ({{ fmtWon(pointToNext) }} 남음)
          </span>
          <span class="next" v-else>최고 등급 달성 🎉</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
/**
 * ✅ 이 컴포넌트는 클릭 내비게이션을 제공하지 않습니다.
 *    - @click 제거
 *    - router import/사용 제거
 */
import { computed } from 'vue'

const props = defineProps({
  points: { type: Number, default: 0 },
})

/** 등급표 정의 (낮은 → 높은 임계값) */
const TIERS = [
  { key:'daiso',       label:'다이소',      threshold: 10_000 },
  { key:'newbalance',  label:'뉴발란스',    threshold: 100_000 },
  { key:'nike',        label:'나이키',      threshold: 300_000 },
  { key:'ck',          label:'CK',          threshold: 500_000 },
  { key:'ysl',         label:'생로랑',      threshold: 1_000_000 },
  { key:'prada',       label:'프라다',      threshold: 5_000_000 },
  { key:'gucci',       label:'구찌',        threshold: 20_000_000 },
  { key:'lv',          label:'루이비통',    threshold: 30_000_000 },
  { key:'chanel',      label:'샤넬',        threshold: 50_000_000 },
  { key:'hermes',      label:'에르메스',    threshold: 100_000_000 },
]

const points = computed(() => Number(props.points || 0))

/** 현재 등급 */
const tier = computed(() => {
  let cur = TIERS[0]
  for (const t of TIERS) {
    if (points.value >= t.threshold) cur = t
    else break
  }
  return cur
})

/** 다음 등급 */
const nextTier = computed(() => {
  const idx = TIERS.findIndex(t => t.key === tier.value.key)
  return TIERS[idx + 1] || null
})

/** 진행률 */
const progressPct = computed(() => {
  if (!nextTier.value) return 100
  const base = tier.value.threshold
  const span = nextTier.value.threshold - base
  const prog = Math.max(0, Math.min(1, (points.value - base) / span))
  return Math.round(prog * 100)
})

/** 다음 등급까지 남은 포인트 */
const pointToNext = computed(() => {
  if (!nextTier.value) return 0
  return Math.max(0, nextTier.value.threshold - points.value)
})

/** 배지 이미지 경로 (public/tiers/badges/badge_*.png) */
const badgeSrc = computed(() => `/tiers/badges/badge_${tier.value.key}.png`)

/** 포맷터 */
function fmtWon(n=0){ return Math.floor(n).toLocaleString('ko-KR') + 'P' }
</script>

<style scoped>
.tier-box{ border:1px solid var(--line); border-radius:16px; background:var(--surface); padding:10px 12px; }
.row{ display:flex; align-items:center; justify-content:space-between; padding:8px 0; }
.row + .row{ border-top:1px dashed var(--line); }
.key{ color: var(--muted); white-space: nowrap; }
.val{ display:flex; align-items:center; gap:8px; }
.val.gap{ gap:10px; }

/* 🔒 클릭 막기용 - 포인터/링크 스타일 제거 */
.no-link{ cursor: default; }
.no-link * { cursor: default; }

/* 배지 */
.tier-badge{
  display:inline-flex; align-items:center; gap:8px;
  padding:4px 10px; border-radius:999px; font-size:12px; font-weight:900;
  border:1px solid var(--line); background:#fff;
}
.tier-badge-img{ width:20px; height:20px; object-fit:contain; display:block; }

/* 진행바 */
.tier-progress{ width:100%; }
.bar{ width:100%; height:10px; border-radius:999px; background:var(--surface); border:1px solid var(--line); overflow:hidden; }
.fill{ height:100%; width:0%; background:#ff2c8a; transition:width .35s ease; }
.legend{ margin-top:4px; display:flex; justify-content:space-between; font-size:12px; color:var(--muted); }
</style>
