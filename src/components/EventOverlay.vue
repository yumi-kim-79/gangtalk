<!-- src/components/EventOverlay.vue -->
<template>
  <div class="evt-mask" role="dialog" aria-modal="true">
    <!-- 배너(이미지) -->
    <div class="evt-center">
      <!-- 필요 시 a 태그로 래핑해서 특정 링크로 보낼 수도 있음 -->
      <img
        class="evt-img"
        :src="imageUrl"
        alt="강남톡방 오픈 이벤트"
        decoding="async"
        loading="eager"
      />
    </div>

    <!-- 하단 액션 -->
    <div class="evt-actions">
      <button class="evt-btn ghost" type="button" @click="$emit('dismiss-day')">
        하루종일 열지 않기
      </button>
      <button class="evt-btn primary" type="button" @click="$emit('close')">
        닫기
      </button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  imageUrl: {
    type: String,
    default: '/event/gangtox-open.png', // ← /public 기준 경로
  },
})
</script>

<style scoped>
.evt-mask{
  position: fixed; inset: 0; z-index: 100000; /* 탭바보다 위 */
  background: color-mix(in oklab, #000, transparent 10%);
  display: grid;
  grid-template-rows: 1fr auto;
}
.evt-center{
  display: grid; place-items: center;
  padding: clamp(8px, 2vw, 18px);
}
.evt-img{
  width: min(920px, 96vw);
  height: auto;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0,0,0,.35);
  background: #fff;
}
/* 버튼 바 */
.evt-actions{
  position: sticky; bottom: 0;
  display: flex; gap: 8px; justify-content: center;
  padding: 12px clamp(10px, 4vw, 24px) max(12px, env(safe-area-inset-bottom));
  background: color-mix(in oklab, rgba(0,0,0,.72), transparent 0%);
  backdrop-filter: blur(6px);
}
.evt-btn{
  flex: 0 0 auto;
  min-width: 140px; height: 44px;
  padding: 0 14px; border-radius: 12px; font-weight: 800;
  border: 1px solid rgba(255,255,255,.25);
  color: #fff; background: transparent;
}
.evt-btn.ghost{ background: transparent; }
.evt-btn.primary{
  background: #ff2e87;
  border-color: #ff2e87;
  color: #111; -webkit-text-fill-color:#111;
}
@media (max-width: 360px){
  .evt-btn{ min-width: 120px; height: 42px; }
}
</style>
