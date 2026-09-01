<!-- src/components/VoteDetailModal.vue -->
<template>
  <div class="sheet" @click.self="$emit('close')">
    <div class="sheet-body">
      <header class="row" style="justify-content:space-between;align-items:center;">
        <h3 class="ttl">{{ post.title }}</h3>
        <button class="x" @click="$emit('close')">✕</button>
      </header>

      <p class="muted" v-if="post.subtitle">{{ post.subtitle }}</p>

      <div class="box">
        <div class="row lab">
          <strong>현재 현황</strong>
          <small class="muted">{{ total }}표</small>
        </div>

        <div class="bar">
          <div class="seg a" :style="{ width: percentA + '%' }"></div>
          <div class="seg b" :style="{ width: percentB + '%' }"></div>
        </div>

        <div class="rows">
          <div class="row item">
            <span class="name">A. {{ post.optA }}</span>
            <span class="num">{{ post.votes.a }}표 ({{ percentA }}%)</span>
          </div>
          <div class="row item">
            <span class="name">B. {{ post.optB }}</span>
            <span class="num">{{ post.votes.b }}표 ({{ percentB }}%)</span>
          </div>
        </div>
      </div>

      <footer>
        <div class="row" style="gap:10px;">
          <button
            class="btn vote"
            :class="{ picked: my === 'a' }"
            @click="doVote('a')"
          >
            A 투표 ({{ post.optA }})
          </button>
          <button
            class="btn vote"
            :class="{ picked: my === 'b' }"
            @click="doVote('b')"
          >
            B 투표 ({{ post.optB }})
          </button>
        </div>
        <small class="muted" v-if="my" style="display:block;margin-top:8px;">
          내 선택: <b>{{ my === 'a' ? post.optA : post.optB }}</b> (변경 가능)
        </small>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { db, currentUid } from '@/store/data.js'

const props = defineProps({
  postId: { type: String, required: true },
})

const post = computed(() => db.general.find(p => p.id === props.postId) || {})
const total = computed(() => (post.value.votes?.a || 0) + (post.value.votes?.b || 0))
const percentA = computed(() => {
  const t = total.value || 1
  return Math.round(((post.value.votes?.a || 0) / t) * 100)
})
const percentB = computed(() => 100 - percentA.value)
const my = computed(() => db.myVote(props.postId, currentUid))

const doVote = (choice) => {
  db.vote(props.postId, choice, currentUid)
}
</script>

<style scoped>
.sheet{
  position:fixed; inset:0; z-index:60;
  background:color-mix(in oklab, var(--bg), transparent 30%);
  display:flex; align-items:flex-end;
}
.sheet-body{
  width:100%;
  background:var(--surface);
  border-top-left-radius:18px; border-top-right-radius:18px;
  max-height:calc(100vh - 12px);
  overflow:auto;
  padding:16px 16px calc(16px + var(--bottom-nav-h,80px) + env(safe-area-inset-bottom));
  box-shadow:0 -12px 24px rgba(0,0,0,.18);
}
.ttl{ margin:0 }
.x{
  width:36px; height:36px; border-radius:10px;
  border:1px solid var(--line); background:var(--surface);
}
.box{
  margin-top:8px; border:1px solid var(--line); border-radius:16px;
  background:var(--surface); padding:14px;
}
.lab{ justify-content:space-between; align-items:center; margin-bottom:8px; }
.bar{
  position:relative; height:14px; border-radius:999px; overflow:hidden;
  background:color-mix(in oklab, var(--muted), transparent 80%);
}
.seg{ height:100%; }
.seg.a{ background:color-mix(in oklab, var(--accent), transparent 25%); }
.seg.b{ background:color-mix(in oklab, #00b894, transparent 25%); }

.rows{ margin-top:8px; display:flex; flex-direction:column; gap:6px; }
.item{ justify-content:space-between; }

footer{ position:sticky; bottom:0; padding-top:12px; margin-top:12px;
  background:linear-gradient(180deg,color-mix(in oklab, var(--surface), transparent 40%) 0%, var(--surface) 40%);
  box-shadow:0 -6px 12px var(--shadow);
}
.btn.vote{
  flex:1; height:44px; border-radius:12px;
  border:1px solid var(--line); background:var(--surface); font-weight:800;
}
.btn.vote.picked{ border-color:var(--accent); color:var(--accent); }
</style>
