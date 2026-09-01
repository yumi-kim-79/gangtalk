<template>
  <article class="store-card" :class="{ compact }" @click="$emit('open', item)">
    <!-- 썸네일 + 혼잡도 -->
    <div class="thumb" :style="{ backgroundImage:`url(${thumbUrl})` }">
      <span class="wifi" :class="wifiClass" aria-label="혼잡도">
        <!-- Wi-Fi 아이콘 (배지 44px, 아이콘 28px) -->
        <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm-4.243-3.757a6 6 0 0 1 8.486 0 1 1 0 0 0 1.414-1.414 8 8 0 0 0-11.314 0A1 1 0 1 0 7.757 16.243Zm-2.828-2.829a10 10 0 0 1 14.142 0 1 1 0 0 0 1.414-1.414 12 12 0 0 0-16.97 0A1 1 0 1 0 4.93 13.414Z"
          />
        </svg>
      </span>
    </div>

    <!-- 본문 -->
    <div class="body">
      <h3 class="name">{{ item.name }}</h3>
      <p class="sub muted">{{ item.region }} · {{ catLabel }}</p>

      <!-- 통계 -->
      <div class="stats">
        <div class="pill">
          <strong>{{ item.match ?? 0 }}</strong>
          <span>맞춤방</span>
        </div>
        <div class="pill">
          <strong>{{ item.persons ?? 0 }}</strong>
          <span>맞춤인원</span>
        </div>
      </div>

      <!-- 액션 -->
      <div class="actions" @click.stop>
        <button class="act" type="button"
                @click.stop.prevent="$emit('invite', item)"
                @touchstart.stop.prevent="$emit('invite', item)">초톡</button>
        <button class="act" type="button"
                @click.stop.prevent="$emit('manager', item)"
                @touchstart.stop.prevent="$emit('manager', item)">담당</button>
        <button class="act" type="button"
                @click.stop.prevent="$emit('chat', item)"
                @touchstart.stop.prevent="$emit('chat', item)">채팅</button>
        <button class="act" type="button"
                @click.stop.prevent="$emit('event', item)"
                @touchstart.stop.prevent="$emit('event', item)">이벤트</button>
      </div>

      <!-- 태그(선택) -->
      <div class="tags" v-if="(item.tags?.length)">
        <span v-for="t in item.tags" :key="t" class="tag">{{ t }}</span>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  item: { type: Object, required: true },
  compact: { type: Boolean, default: false },
})
defineEmits(['open','invite','manager','chat','event'])

const CAT_MAP = {
  hopper: '하퍼',
  point5: '쩜오',
  ten: '텐카페',
  onep: '1%',
  nrb: '노래방',
  kara: '가라오케',
  bar: '바',
  lounge: '라운지',
}
const catLabel = computed(() => CAT_MAP[props.item.category] ?? props.item.category)

const wifiClass = computed(() => {
  switch (props.item.status) {
    case '혼잡': return 'busy'
    case '보통': return 'mid'
    default:     return 'free'
  }
})

const FALLBACKS = [
  'https://images.unsplash.com/photo-1543007630-9710e4a00a20?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1532634896-26909d0d4b6a?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1498654200943-1088dd4438ae?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1455380579765-810023662ea2?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1542395975-d6d4a24c0f3b?q=80&w=1200&auto=format&fit=crop'
]
const hash = (s) => {
  const str = String(s ?? '')
  let h = 0
  for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0 }
  return Math.abs(h)
}
const thumbUrl = computed(() => {
  if (props.item.thumb && String(props.item.thumb).length > 3) return props.item.thumb
  const idx = hash(props.item.id ?? props.item.name) % FALLBACKS.length
  return FALLBACKS[idx]
})
</script>

<style scoped>
.store-card{
  border:1px solid var(--line);
  border-radius:16px;
  background:var(--surface);
  box-shadow:0 6px 16px var(--shadow);
  overflow:hidden;
  cursor:pointer;
}
.store-card:active{ transform:scale(.995) }

.thumb{
  position:relative;
  width:100%;
  padding-top:62%;
  background-size:cover;
  background-position:center;
}

/* ▼ 혼잡도 배지: 아이콘 크기에 맞춰(배지 44px / 아이콘 28px) */
.wifi{
  position:absolute; right:10px; bottom:10px;
  display:inline-flex; align-items:center; justify-content:center;
  width:44px; height:44px; border-radius:999px;
  border:1px solid var(--line); background:var(--surface);
  box-shadow:0 6px 16px var(--shadow);
  color:#67d26b;            /* 여유 */
}
.wifi.mid{ color:#f5b301 }  /* 보통 */
.wifi.busy{ color:#ff6b6b } /* 혼잡 */

.body{ padding:10px 12px 12px }
.name{ margin:0; font-weight:900; font-size:16px }
.sub{ margin:4px 0 8px }

.stats{
  display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:8px;
}
.pill{
  display:flex; align-items:center; justify-content:space-between;
  border:1px solid var(--line);
  border-radius:12px;
  padding:10px 12px;
  background:var(--surface);
  color:var(--fg);
  box-shadow:0 2px 8px var(--shadow);
}
.pill strong{ font-size:18px }

.actions{
  margin-top:8px;
  display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:8px;
}
.act{
  border:1px solid var(--line);
  background:var(--surface);
  color:var(--fg);
  border-radius:12px;
  padding:10px 0;
  font-weight:800;
}

.tags{ margin-top:10px; display:flex; gap:8px; flex-wrap:wrap }
.tag{
  border:1px solid var(--line);
  border-radius:999px;
  padding:6px 10px;
  font-weight:700;
  background:transparent;
  color:var(--fg);
}

.store-card.compact .thumb{ padding-top:58% }
.store-card.compact .pill strong{ font-size:16px }
</style>
