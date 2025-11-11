<template>
  <article class="post" @click="open">
    <header class="head">
      <h3 class="title ellip2">{{ item.title }}</h3>
      <span v-if="item.category" class="tag">{{ catLabel }}</span>
    </header>

    <p v-if="item.subtitle" class="sub ellip2">{{ item.subtitle }}</p>

    <!-- 투표 미리보기: A/B 선택지를 칩으로 노출 -->
    <div v-if="isVote" class="poll">
      <span v-if="optA" class="chip">{{ optA }}</span>
      <span v-if="optB" class="chip">{{ optB }}</span>
    </div>

    <footer class="meta">
      <button class="view" @click.stop="emit('view', item.id)" title="조회수 증가">
        👁 {{ item.views ?? 0 }}
      </button>
      <span class="dot">·</span>
      <span class="time">{{ timeAgo(item.updatedAt) }}</span>
    </footer>
  </article>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  item: { type: Object, required: true },
})
const emit = defineEmits(['open', 'view'])

/* 카드 클릭 시: 조회수 + 열기까지 한번에 */
const open = () => {
  emit('view', props.item.id)
  emit('open', props.item)
}

const catMap = { var: '다양', anon: '익명', vote: '투표', biz: '업체' }
const catLabel = computed(() => catMap[props.item.category] || '게시판')

/* 투표 카드 여부 + 옵션 추출(A/B) */
const isVote = computed(() => props.item.category === 'vote')
const optA = computed(() => props.item.optA || props.item.poll?.a || '')
const optB = computed(() => props.item.optB || props.item.poll?.b || '')

/* time-ago 포맷 */
const timeAgo = (ts) => {
  if (!ts) return ''
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60); if (m < 60) return `${m}분전`
  const h = Math.floor(m / 60); if (h < 24) return `${h}시간전`
  const d = Math.floor(h / 24); return `${d}일전`
}
</script>

<style scoped>
/* 카드: 라운드/섀도우 통일 (벤치 테마와 톤 일치) */
.post{
  border:1px solid var(--line);
  background:var(--surface);
  border-radius: var(--radius-lg);
  box-shadow:0 12px 30px var(--shadow);
  padding:14px;
  display:flex; flex-direction:column; gap:8px;
  cursor:pointer;
  transition: transform .05s ease, border-color .15s ease, box-shadow .15s ease;
}
.post:active{ transform:scale(.99) }
.post:hover{ border-color: color-mix(in oklab, var(--fg), transparent 75%); }

/* 상단 */
.head{
  display:flex; align-items:center; justify-content:space-between; gap:8px;
}
.title{ margin:0; font-size: var(--fs-lg); line-height:1.25; }
.sub{ margin:0; color:var(--muted); font-size: var(--fs-md); }

/* 메타 */
.meta{
  display:flex; align-items:center; gap:6px;
  color:var(--muted); font-size: var(--fs-sm);
}
.dot{ opacity:.6 }
.view{
  height:26px; padding:0 10px; border-radius:999px;
  border:1px solid var(--line); background:var(--surface); color:var(--fg);
  font-weight:800;
}

/* 태그/칩 (테마의 스타일과 톤 맞춤) */
.tag{
  height:26px; padding:0 10px; border-radius:999px;
  background:var(--bg-subtle); color:var(--muted); font-size:12px;
  display:inline-flex; align-items:center;
}
.poll{ display:flex; gap:8px; margin-top:2px; }
.chip{
  height:28px; padding:0 12px; border-radius:999px;
  border:1px solid var(--line); background:var(--surface); color:var(--fg); font-weight:700;
}

/* 2줄 말줄임 */
.ellip2{
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;
  overflow:hidden;
}
</style>
