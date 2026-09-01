<!-- src/pages/TierLadderView.vue -->
<template>
  <main class="tier-page">
    <!-- 헤더 -->
    <header class="topbar">
      <button class="back" type="button" aria-label="뒤로가기" @click="goBack">←</button>
      <h1 class="title">회원 등급표</h1>
      <span class="spacer"></span>
    </header>

    <!-- 등급 그리드 (1위 → 10위) -->
    <section class="grid">
      <article
        v-for="(t, idx) in TIERS_DESC"
        :key="t.key"
        class="card"
      >
        <div class="rank">{{ idx + 1 }}</div>

        <div class="logo-wrap">
          <img class="logo" :src="badgeSrc(t.key)" :alt="t.label" loading="lazy" />
          <div class="label">{{ t.label }}</div>
        </div>

        <div class="points">
          {{ t.threshold.toLocaleString('ko-KR') }} P
          <small class="hint">({{ shortUnit(t.threshold) }})</small>
        </div>

        <div class="status">
          <span
            class="dot"
            :class="statusClass(t)"
            :title="statusText(t)"
          ></span>
          <span class="status-text">{{ statusText(t) }}</span>
        </div>
      </article>
    </section>

    <!-- 범례 -->
    <footer class="legend">
      <span class="item"><i class="dot done"></i> 도달</span>
      <span class="item"><i class="dot near"></i> 근접(80% 이상)</span>
      <span class="item"><i class="dot wait"></i> 대기</span>
    </footer>
  </main>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { me } from '@/store/user.js'

const router = useRouter()
const goBack = () => history.length > 1 ? router.back() : router.push('/mypage')

/** 등급표(최상위→최하위) */
const TIERS_DESC = [
  { key:'hermes',     label:'에르메스',   threshold: 100_000_000 },
  { key:'chanel',     label:'샤넬',       threshold: 50_000_000  },
  { key:'lv',         label:'루이비통',   threshold: 30_000_000  },
  { key:'gucci',      label:'구찌',       threshold: 20_000_000  },
  { key:'prada',      label:'프라다',     threshold: 5_000_000   },
  { key:'ysl',        label:'생로랑',     threshold: 1_000_000   },
  { key:'ck',         label:'CK',         threshold: 500_000     },
  { key:'nike',       label:'나이키',     threshold: 300_000     },
  { key:'newbalance', label:'뉴발란스',   threshold: 100_000     },
  { key:'daiso',      label:'다이소',     threshold: 10_000      },
]

/** 사용자 포인트(없으면 0) */
const userPoints = computed(() => {
  // me 스토어에 있는 값들 중 존재하는 걸 우선 사용
  const v1 = me?.profile?.value?.points
  const v2 = me?.value?.points
  const v3 = me?.points
  return Number(v1 ?? v2 ?? v3 ?? 0)
})

/** 배지 이미지 경로 (public/tiers/badges/badge_*.png) */
const badgeSrc = (key) => `/tiers/badges/badge_${key}.png`

/** 표시용 짧은 단위 */
function shortUnit(n){
  if (n >= 100_000_000) return '1억+'
  if (n >= 10_000_000)  return `${Math.round(n/1_000_000)}00만`
  if (n >= 1_000_000)   return `${Math.round(n/100_000)/10}백만`
  if (n >= 100_000)     return `${Math.round(n/10_000)}만`
  if (n >= 10_000)      return `${Math.round(n/10_000)}만`
  return n.toLocaleString('ko-KR')
}

/** 상태(도달·근접·대기) */
function statusClass(t){
  const p = userPoints.value
  if (p >= t.threshold) return 'done'
  // 하위 티어의 기준치를 찾아 80% 근접 여부 평가
  const idx = TIERS_DESC.findIndex(x=>x.key===t.key)
  const nextLower = TIERS_DESC[idx+1] // 바로 아래 티어
  // 근접: 현재 티어 기준치의 80% 이상이면서 아직 미달
  const nearLine = Math.floor(t.threshold * 0.8)
  if (p >= nearLine && p < t.threshold) return 'near'
  return 'wait'
}
function statusText(t){
  const cls = statusClass(t)
  return cls==='done' ? '도달' : (cls==='near' ? '근접' : '대기')
}
</script>

<style scoped>
/* ===== Page Base ===== */
.tier-page{
  padding: 10px 12px 24px;
  background: var(--page-bg);
  min-height: 100dvh;
}

/* 라이트/다크 테마 배경 */
:root[data-theme="white"] .tier-page{ --page-bg:#f6f7f8; --card-bg:#fff; --card-fg:#111; --line:#e6e6e6; --muted:#888; --chip-done:#1f9c5a; --chip-near:#d4a017; --chip-wait:#b0b0b0; --back:#000; }
:root[data-theme="black"] .tier-page{ --page-bg:#17181a; --card-bg:#222427; --card-fg:#f3f4f6; --line:#3a3c40; --muted:#a0a3a8; --chip-done:#3ddc84; --chip-near:#ffcd4d; --chip-wait:#8b8f97; --back:#fff; }

/* ===== Topbar ===== */
.topbar{
  display:flex; align-items:center; gap:8px;
  margin: 2px 0 10px;
}
.back{
  width:36px; height:36px; border-radius:10px;
  border:1px solid var(--line); background: var(--card-bg);
  color: var(--back); font-size:20px; font-weight:900;
}
.title{ margin:0; font-size:18px; font-weight:900; color:var(--card-fg); }
.spacer{ flex:1 }

/* ===== Grid ===== */
.grid{
  display:grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

/* ===== Card ===== */
.card{
  position:relative;
  border:1px solid var(--line);
  background: var(--card-bg);
  color: var(--card-fg);
  border-radius: 12px;
  padding: 10px 12px 12px;
  min-height: 120px;
  display:flex;
  flex-direction:column;
  justify-content:space-between;
}

/* 순위(오른쪽 위) — 1이 가장 높은 등급 */
.rank{
  position:absolute; top:8px; right:10px;
  font-weight:900; font-size:12px; color: var(--muted);
}

/* 로고 + 등급명(로고 밑 가로 표시) */
.logo-wrap{
  display:flex; align-items:center; gap:10px;
}
.logo{
  width:36px; height:36px; object-fit:contain; display:block;
}
.label{
  font-size:15px; font-weight:900;
}

/* 포인트 줄 */
.points{
  margin-top:6px;
  font-size:14px; font-weight:800;
}
.points .hint{
  font-size:11px; color:var(--muted); margin-left:6px;
}

/* 상태 */
.status{
  margin-top:4px; display:flex; align-items:center; gap:6px; color:var(--muted); font-size:12px;
}
.dot{
  width:8px; height:8px; border-radius:999px; display:inline-block; background:var(--chip-wait);
}
.dot.done{ background: var(--chip-done); }
.dot.near{ background: var(--chip-near); }
.dot.wait{ background: var(--chip-wait); }

/* ===== Legend ===== */
.legend{
  display:flex; align-items:center; gap:14px;
  margin-top: 12px; padding: 8px 4px; color:var(--muted); font-size:12px;
}
.legend .item{ display:flex; align-items:center; gap:6px; }
.legend .dot{ width:8px; height:8px; border-radius:999px; display:inline-block; }
.legend .dot.done{ background: var(--chip-done); }
.legend .dot.near{ background: var(--chip-near); }
.legend .dot.wait{ background: var(--chip-wait); }
</style>
