<template>
  <main class="container" style="padding-bottom:80px;">
    <header class="row top" style="justify-content:space-between;align-items:center;">
      <button class="back" @click="router.back()">←</button>
      <h2 class="ttl">투표게시판</h2>
      <span style="width:32px;"></span>
    </header>

    <section v-if="post" class="card shadow vote-card">
      <h3 class="title">{{ post.title }}</h3>
      <p class="muted sub" v-if="post.subtitle">{{ post.subtitle }}</p>

      <div class="options">
        <button
          class="opt"
          :disabled="hasVoted"
          @click="vote(0)"
        >
          <div class="name">{{ aText }}</div>
          <div class="stat">
            <strong>{{ aVotes }}</strong>표
            <small class="muted">({{ aPct }}%)</small>
          </div>
        </button>

        <button
          class="opt"
          :disabled="hasVoted"
          @click="vote(1)"
        >
          <div class="name">{{ bText }}</div>
          <div class="stat">
            <strong>{{ bVotes }}</strong>표
            <small class="muted">({{ bPct }}%)</small>
          </div>
        </button>
      </div>

      <p class="muted time">업데이트 · {{ timeAgo(post.updatedAt) }}</p>
      <p v-if="hasVoted" class="ok">이미 투표하셨어요. 감사합니다!</p>
    </section>

    <section v-else class="card shadow" style="padding:24px;">
      존재하지 않는 투표입니다.
    </section>
  </main>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db, uid } from '@/store/data.js'

const route = useRoute()
const router = useRouter()

const post = computed(() => db.general.find(p => p.id === route.params.id))

const aText  = computed(() => post.value?.poll?.options?.[0]?.text || '항목 A')
const bText  = computed(() => post.value?.poll?.options?.[1]?.text || '항목 B')
const aVotes = computed(() => post.value?.poll?.options?.[0]?.votes ?? 0)
const bVotes = computed(() => post.value?.poll?.options?.[1]?.votes ?? 0)
const total  = computed(() => aVotes.value + bVotes.value)
const aPct   = computed(() => total.value ? Math.round((aVotes.value/total.value)*100) : 0)
const bPct   = computed(() => total.value ? Math.round((bVotes.value/total.value)*100) : 0)
const hasVoted = computed(() => {
  if (!post.value?.poll?.votedBy) return false
  return post.value.poll.votedBy.includes(uid())
})

const vote = (idx) => {
  if (!post.value) return
  db.voteGeneral(post.value.id, idx, uid())
  alert('투표가 반영되었어요!')
}

const timeAgo = (ts) => {
  const sec = Math.floor((Date.now() - ts) / 1000)
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec/60); if (m < 60) return `${m}분전`
  const h = Math.floor(m/60);  if (h < 24) return `${h}시간전`
  const d = Math.floor(h/24);  return `${d}일전`
}
</script>

<style scoped>
.top .back{
  width:32px;height:32px;border-radius:10px;border:1px solid var(--line);
  background:var(--surface);font-weight:800;
}
.ttl{ margin:0 }
.vote-card{ padding:18px }
.title{ margin:0 0 6px 0 }
.sub{ margin:0 0 12px 0 }
.options{ display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:8px }
.opt{
  border:1px solid var(--line); background:var(--surface); border-radius:16px;
  padding:16px; text-align:center; box-shadow:0 8px 20px var(--shadow);
}
.opt:disabled{ opacity:.75 }
.name{ font-weight:800; margin-bottom:6px }
.stat{ font-size:14px }
.time{ margin-top:14px }
.ok{ margin-top:8px; color:var(--accent); font-weight:800 }
</style>
