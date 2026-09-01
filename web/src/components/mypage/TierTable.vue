<template>
  <section class="tier-table">
    <table>
      <thead>
        <tr>
          <th>순위</th>
          <th>등급</th>
          <th>기준 포인트</th>
          <th>상태</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(t, i) in tiers" :key="t.key" :class="{ now: t.key === current.key, done: points >= t.threshold }">
          <td class="rank">{{ i + 1 }}</td>
          <td class="name">
            <img class="logo" :src="logoSrc(t.key)" :alt="t.name" loading="lazy" decoding="async" />
            <strong>{{ t.name }}</strong>
          </td>
          <td class="thres">
            {{ formatKRW(t.threshold) }} P
            <span class="muted">({{ shortKRW(t.threshold) }})</span>
          </td>
          <td class="state">
            <span v-if="points >= t.threshold" class="badge ok">달성</span>
            <span v-else class="badge wait">대기</span>
          </td>
        </tr>
      </tbody>
    </table>
    <p class="hint">* 내 포인트: <b>{{ formatKRW(points) }} P</b></p>
  </section>
</template>

<script setup>
/**
 * 등급표 단독 컴포넌트
 * - props.points: 현재 보유 포인트(Number)
 * - TIERS: 요청한 순서/기준(다이소~에르메스)
 * - 로고 파일은 public/tiers/badges/*.png 사용
 */

const props = defineProps({ points: { type: Number, default: 0 } })
const points = props.points || 0

// 기준표 (요청값)
const TIERS = [
  { key: 'daiso',      name: '다이소',     threshold: 10_000 },
  { key: 'newbalance', name: '뉴발란스',   threshold: 100_000 },
  { key: 'nike',       name: '나이키',     threshold: 300_000 },
  { key: 'ck',         name: 'CK',         threshold: 500_000 },
  { key: 'ysl',        name: '생로랑',     threshold: 1_000_000 },
  { key: 'prada',      name: '프라다',     threshold: 5_000_000 },
  { key: 'gucci',      name: '구찌',       threshold: 20_000_000 },
  { key: 'lv',         name: '루이비통',   threshold: 30_000_000 },
  { key: 'chanel',     name: '샤넬',       threshold: 50_000_000 },
  { key: 'hermes',     name: '에르메스',   threshold: 100_000_000 },
]

const tiers = TIERS
const current = (() => {
  let cur = TIERS[0]
  for (const t of TIERS) {
    if (points >= t.threshold) cur = t; else break
  }
  return cur
})()

const LOGOS = {
  daiso:      '/tiers/badges/badge_daiso.png',
  newbalance: '/tiers/badges/badge_newbalance.png',
  nike:       '/tiers/badges/badge_nike.png',
  ck:         '/tiers/badges/badge_ck.png',
  ysl:        '/tiers/badges/badge_ysl.png',
  prada:      '/tiers/badges/badge_prada.png',
  gucci:      '/tiers/badges/badge_gucci.png',
  lv:         '/tiers/badges/badge_lv.png',
  chanel:     '/tiers/badges/badge_chanel.png',
  hermes:     '/tiers/badges/badge_hermes.png',
}

function logoSrc(key){ return LOGOS[key] || '' }
function shortKRW(n){
  const v = Number(n)||0
  if (v >= 100_000_000) return (v/100_000_000).toFixed(v%100_000_000===0?0:1)+'억'
  if (v >= 10_000)      return (v/10_000).toFixed(v%10_000===0?0:1)+'만'
  return v.toLocaleString('ko-KR')
}
function formatKRW(n){ return (Number(n)||0).toLocaleString('ko-KR') }
</script>

<style scoped>
.tier-table{ width:100%; }
table{ width:100%; border-collapse:separate; border-spacing:0; border:1px solid var(--line); border-radius:12px; overflow:hidden; background:#fff; }
thead th{ background:#fafafa; font-weight:800; padding:10px; border-bottom:1px solid var(--line); }
tbody td{ padding:10px; border-top:1px solid var(--line); vertical-align:middle; }
tbody tr:first-child td{ border-top:0; }
.rank{ width:56px; text-align:center; font-weight:800; }
.name{ display:flex; align-items:center; gap:10px; }
.logo{ width:32px; height:32px; border-radius:8px; object-fit:contain; border:1px solid var(--line); background:#fff; }
.thres{ white-space:nowrap; }
.muted{ color:#666; margin-left:6px; font-size:12px; }
.state{ width:72px; text-align:center; }
.badge{ display:inline-flex; align-items:center; justify-content:center; min-width:42px; height:24px; padding:0 10px; border-radius:999px; font-size:12px; border:1px solid var(--line); background:#fff; }
.badge.ok{ background:#eaffea; border-color:#cfe9cf; color:#135c22; }
.badge.wait{ background:#fff5e6; border-color:#ffe0b2; color:#7a4b00; }
.now{ background:#fff9fb; }
.hint{ margin-top:8px; color:#444; font-size:13px; }
</style>
