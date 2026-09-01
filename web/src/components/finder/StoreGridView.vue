<!-- StoreGridView.vue -->
<template>
  <section class="grid">
    <article
      v-for="s in filtered"
      :key="s.id"
      class="card"
      @click="openStore(s)"
    >
      <div class="thumb" :style="bgStyle(thumbOf(s))"></div>

      <div class="meta">
        <div class="title-line ellip1">
          <span class="t-name">{{ s.name }}</span>
          <span class="t-meta">ㅣ {{ s.region || '강남' }} · {{ mapCat[s.category] || '' }}</span>
        </div>

        <div class="desc ellip1">{{ introOf(s) }}</div>

        <div class="info-row">
          <span class="mgr" v-if="managerName(s)">{{ managerName(s) }}</span>
          <span class="star">⭐️</span>
          <b class="score">{{ fmtScore(s) }}</b>
          <span class="count">({{ likesOfFn(s) }})</span>
        </div>

        <div class="event-line" v-if="s.event || (Array.isArray(s.events) && s.events.length)">
          {{ s.event || s.events[0] }}
        </div>

        <div class="bottom">
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
  mapCat: { type: Object, required: true },
  thumbOf: { type: Function, required: true },
  wifiColor: { type: Function, required: true },
  payText: { type: Function, required: true },
  managerName: { type: Function, required: true },
  openStore: { type: Function, required: true },

  /* 유지용 시그니처 */
  showSheet: Function,
  openBizChat: Function,
  openManagerMenu: Function,
  tapStart: Function,
  tapMove: Function,
  tapEnd: Function,
  mouseStart: Function,
  mouseMove: Function,
  mouseEnd: Function,
  noop: Function,

  /* ✅ 안전 기본 구현(0 이상 클램프) */
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

/* likesOf는 ref(Function)이므로 호출 래퍼 */
const likesOfFn = (s) => (likesOf.value ? likesOf.value(s) : 0)

/* BG 스타일 */
function bgStyle(url){
  const u = String(url || '').trim()
  return u ? ({ backgroundImage:`url("${u.replace(/"/g,'\\"')}")` }) : ({})
}

/* 소개 텍스트 */
function introOf(s){
  const txt = s?.intro || s?.description || s?.desc || s?.adTitle || ''
  return String(txt || '').trim()
}

/* 평점 포맷: 평균만 */
function fmtScore(s){
  const base = Number(s?.rating ?? s?.rate ?? s?.stars ?? 0)
  return Number.isFinite(base) ? base.toFixed(1) : '0.0'
}
</script>

<style scoped>
.grid{
  display:grid;
  grid-template-columns:repeat(2, minmax(0,1fr));
  gap:8px;
}
.card{
  border:1px solid var(--line);
  border-radius:14px;
  background:var(--surface);
  color:var(--fg);
  box-shadow:0 4px 12px var(--shadow);
  overflow:hidden;
  display:flex;
  flex-direction:column;
  cursor:pointer;
}
.thumb{
  position:relative;
  width:100%;
  padding-top:66%;
  background-size:cover;
  background-position:center;
  background-color:#eee;
}
.meta{
  padding:8px;
  display:flex;
  flex-direction:column;
  gap:6px;
  min-width:0;
}
.title-line{
  font-size:13.5px;
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
.ellip1{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.desc{ font-size:12.5px; color:var(--muted); font-weight:800; }

.info-row{
  display:flex; align-items:center; gap:8px;
  color:#444; font-size:12px; font-weight:800;
}
.info-row .mgr{ color:#555; }
.info-row .star{ line-height:1; }
.info-row .score{ font-weight:900; }
.info-row .count{ opacity:.8; }

.bottom{ margin-top:auto; display:flex; justify-content:flex-end; }
.pay-text{ font-size:12.5px; font-weight:900; color:var(--accent); }

.pay, .chip.pill.r-pay, button.r-pay{
  all:unset !important;
  font-size:12.5px !important;
  font-weight:900 !important;
  color:var(--accent) !important;
}

.event-line{
  margin-top: 4px;
  font-size: 13px;
  font-weight: 700;
  color: #e06666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:root[data-theme="white"] .title-line .t-meta,
:root[data-theme="white"] .desc,
:root[data-theme="white"] .info-row{ color:#111 !important; }
:root[data-theme="white"] .title-line .t-meta{ opacity:.7 !important; }
</style>
