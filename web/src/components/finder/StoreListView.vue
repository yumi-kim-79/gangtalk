<!-- StoreListView.vue -->
<template>
  <section class="rows">
    <article
      v-for="s in filtered"
      :key="s.id"
      class="row-card"
      @click="openStore(s)"
      @touchstart.passive="tapStart"
      @touchmove.passive="tapMove"
      @touchend.stop.prevent="tapEnd(() => openStore(s))"
      @mousedown="mouseStart"
      @mousemove="mouseMove"
      @mouseup="mouseEnd(() => openStore(s))"
    >
      <!-- 썸네일 (좌측) -->
      <div class="l-thumb" :style="bgStyle(thumbOf(s))"></div>

      <!-- 우측(텍스트 고정행) -->
      <div class="r-right">
        <!-- 1) 업체명 ㅣ 지역 · 유형 -->
        <div class="title-line ellip1">
          <span class="t-name">{{ s.name }}</span>
          <span class="t-meta">ㅣ {{ s.region || '강남' }} · {{ mapCat[s.category] || '' }}</span>
        </div>

        <!-- 2) 소개 한 줄 -->
        <div class="desc ellip1">{{ introOf(s) }}</div>

        <!-- 3) 담당이름 · ⭐ 9.4(찜수) -->
        <div class="info-row">
          <span class="mgr" v-if="managerName(s)">{{ managerName(s) }}</span>
          <span class="star">⭐️</span>
          <b class="score">{{ fmtScore(s) }}</b>
          <span class="count">({{ likesOfFn(s) }})</span>
        </div>

        <!-- 4) 이벤트(없어도 높이 예약) -->
        <div class="event-line" :class="{ empty: !eventText(s) }">
          {{ eventText(s) || ' ' }}
        </div>

        <!-- 우하단: 일급 -->
        <div class="r-bottom">
          <div class="pay-text">일급 {{ payText(s) }}</div>
        </div>
      </div>
    </article>
  </section>
</template>

<script setup>
import { toRefs } from 'vue'

const props = defineProps({
  filtered: { type: Array, required: true },
  mapCat:   { type: Object, required: true },
  thumbOf:  { type: Function, required: true },
  wifiColor:{ type: Function, required: true },
  payText:  { type: Function, required: true },
  managerName:{ type: Function, required: true },
  openStore:{ type: Function, required: true },

  /* 기존 인터페이스 유지 */
  showSheet:{ type: Function, required: true },
  openBizChat:{ type: Function, required: true },
  openManagerMenu:{ type: Function, required: true },

  tapStart:{ type: Function, required: true },
  tapMove:{ type: Function, required: true },
  tapEnd:{ type: Function, required: true },
  mouseStart:{ type: Function, required: true },
  mouseMove:{ type: Function, required: true },
  mouseEnd:{ type: Function, required: true },
  noop:{ type: Function, required: true },

  /* ✅ 안전 기본 likesOf */
  likesOf: {
    type: Function,
    default: (s) => {
      const raw =
        s?.likes ??
        s?.wishCount ??
        s?.favs ??
        s?.favorites ??
        s?.favCount ??
        s?.hearts ??
        s?.wishes ??
        0
      const n = Number(raw)
      return Math.max(0, Number.isFinite(n) ? n : 0)
    },
  },
})

const { filtered, mapCat, thumbOf, payText, openStore, likesOf } = toRefs(props)
const likesOfFn = (s) => (likesOf.value ? likesOf.value(s) : 0)

/* BG 스타일 */
function bgStyle(url){
  const u = String(url || '').trim()
  return u ? ({ backgroundImage:`url("${u.replace(/"/g,'\\"')}")` }) : ({})
}

/* 소개 텍스트(우선순위) */
function introOf(s){
  const txt = s?.intro || s?.description || s?.desc || s?.adTitle || ''
  return String(txt || '').trim()
}

/* 이벤트 텍스트(없을 때 빈 문자열) */
function eventText(s){
  if (s?.event) return String(s.event).trim()
  const arr = Array.isArray(s?.events) ? s.events : []
  return arr.length ? String(arr[0] || '').trim() : ''
}

/* 평점 포맷 */
function fmtScore(s){
  const base = Number(s?.rating ?? s?.rate ?? s?.stars ?? 0)
  return Number.isFinite(base) ? base.toFixed(1) : '0.0'
}
</script>

<style scoped>
/* 전체 여백 */
.rows{ display:flex; flex-direction:column; gap:8px }

/* 카드: 컴팩트 + 균일 */
.row-card{
  display:grid;
  grid-template-columns:96px 1fr;     /* 좌: 썸네일, 우: 텍스트 */
  align-items:stretch;
  gap:8px;
  border:1px solid var(--line);
  border-radius:12px;
  background:var(--surface);
  color:var(--fg);
  box-shadow:0 3px 10px var(--shadow);
  padding:8px;
  cursor:pointer;
}

/* 썸네일: 얇게 + 칸에 꽉 차게(왜곡 허용) */
.l-thumb{
  width:100%;
  aspect-ratio: 12 / 5;               /* 96:40 -> 얇은 배너 형태 */
  border-radius:10px;
  background:#f2f2f4;
  background-size: 100% 100%;         /* 비율 무시하고 칸에 맞춤 */
  background-position:center;
  background-repeat:no-repeat;
  overflow:hidden;
}

/* 우측: 고정 4행(제목/소개/정보/이벤트) + 하단 급여 */
.r-right{
  position:relative;                   /* 급여를 우하단 고정하기 위해 */
  grid-column:2 / -1;
  min-width:0;

  /* 행 높이 고정으로 카드 높이 균일화 */
  display:grid;
  grid-template-rows: 18px 16px 16px 16px;  /* 각각 한 줄씩 고정 */
  row-gap:2px;                              /* 간격 최소화 */
}

/* ── 타이포(행 높이 = line-height로 고정) ── */
.title-line{
  font-size:13px;
  line-height:18px;                    /* 행1 */
  font-weight:900;
  min-width:0;
}
.title-line .t-name, .title-line .t-meta{ display:inline; }
.title-line .t-meta{
  margin-left:6px;
  color:#666;
  font-weight:700;
  font-size:12px;
}

.desc{
  font-size:12px;
  line-height:16px;                    /* 행2 */
  color:var(--muted);
  font-weight:800;
}

.info-row{
  display:flex; align-items:center;
  gap:6px;
  font-size:12px;
  line-height:16px;                    /* 행3 */
  color:#444; font-weight:800;
}
.info-row .mgr{ color:#555; }
.info-row .star{ line-height:1 }
.info-row .score{ font-weight:900; }
.info-row .count{ opacity:.8 }

/* 이벤트: 항상 1행 높이 예약, 내용 없으면 숨김만 */
.event-line{
  font-size:13px;
  line-height:16px;                    /* 행4 */
  font-weight:700;
  color:#e06666;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.event-line.empty{ visibility:hidden; } /* 공간 유지 */

.ellip1{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

/* 우하단 급여: 항상 같은 자리 */
.r-bottom{
  position:absolute;
  right:0; bottom:0;
  display:flex; align-items:center; justify-content:flex-end;
}
.pay-text{ font-size:12.5px; font-weight:900; color:var(--accent); }

/* (호환) */
.pay, .chip.pill.r-pay, button.r-pay{
  all:unset !important;
  font-size:12.5px !important;
  font-weight:900 !important;
  color:var(--accent) !important;
}

/* 화이트 테마 대비 강화 */
:root[data-theme="white"] .row-card .title-line .t-meta,
:root[data-theme="white"] .row-card .desc,
:root[data-theme="white"] .row-card .info-row{ color:#111 !important; }
:root[data-theme="white"] .row-card .title-line .t-meta{ opacity:.7 !important; }
</style>
