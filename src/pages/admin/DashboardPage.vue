<!--
  src/pages/admin/DashboardPage.vue
  관리자 대시보드 — 4개 통계 카드 + 최근 활동
-->
<template>
  <div class="adm-page">
    <header class="adm-page-head">
      <h2 class="adm-page-title">📊 대시보드</h2>
      <p class="adm-page-sub">강남톡방 운영 현황 요약</p>
    </header>

    <!-- 통계 카드 -->
    <section class="adm-stat-grid">
      <RouterLink to="/admin/stores" class="adm-stat-card">
        <div class="adm-stat-emoji">🏢</div>
        <div class="adm-stat-meta">
          <span class="adm-stat-label">현황판 노출 업소</span>
          <strong class="adm-stat-value">{{ stats.exposed }}</strong>
        </div>
      </RouterLink>

      <RouterLink to="/admin/top5" class="adm-stat-card">
        <div class="adm-stat-emoji">🏆</div>
        <div class="adm-stat-meta">
          <span class="adm-stat-label">Top5 등록 업소</span>
          <strong class="adm-stat-value">{{ stats.top5 }}</strong>
        </div>
      </RouterLink>

      <RouterLink to="/admin/banners" class="adm-stat-card">
        <div class="adm-stat-emoji">📢</div>
        <div class="adm-stat-meta">
          <span class="adm-stat-label">활성 배너</span>
          <strong class="adm-stat-value">{{ stats.banners }}</strong>
        </div>
      </RouterLink>

      <RouterLink to="/admin/stores?tab=pending" class="adm-stat-card pending">
        <div class="adm-stat-emoji">⏳</div>
        <div class="adm-stat-meta">
          <span class="adm-stat-label">승인 대기 업소</span>
          <strong class="adm-stat-value">{{ stats.pending }}</strong>
        </div>
      </RouterLink>
    </section>

    <!-- 최근 활동 -->
    <section class="adm-section">
      <header class="adm-section-head">
        <h3>최근 메시지함</h3>
        <RouterLink to="/admin/inbox" class="adm-link">모두 보기 ›</RouterLink>
      </header>
      <ul class="adm-activity-list" v-if="recent.length">
        <li v-for="m in recent" :key="m.id" class="adm-activity-item">
          <span class="adm-activity-dot" :class="{ unread: m.unread }" />
          <div class="adm-activity-body">
            <div class="adm-activity-title">{{ m.title || m.subject || m.message || '(제목 없음)' }}</div>
            <div class="adm-activity-meta">{{ fmtTime(m.createdAt) }}</div>
          </div>
        </li>
      </ul>
      <p v-else class="adm-empty">아직 메시지가 없습니다.</p>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink } from 'vue-router'
import { db as fbDb } from '@/firebase'
import {
  collection, doc, onSnapshot,
  query, where, orderBy, limit,
} from 'firebase/firestore'

const stores = ref([])
const marketing = ref({})
const recent = ref([])

let unsubStores = null
let unsubMarketing = null
let unsubInbox = null

onMounted(() => {
  unsubStores = onSnapshot(
    query(collection(fbDb, 'stores'), limit(500)),
    (snap) => {
      stores.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    },
    () => {},
  )

  unsubMarketing = onSnapshot(
    doc(fbDb, 'config', 'marketing'),
    (snap) => { marketing.value = snap.exists() ? (snap.data() || {}) : {} },
    () => {},
  )

  unsubInbox = onSnapshot(
    query(collection(fbDb, 'adminInbox'), orderBy('createdAt', 'desc'), limit(5)),
    (snap) => {
      recent.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    },
    () => {},
  )
})

onBeforeUnmount(() => {
  if (unsubStores) try { unsubStores() } catch {}
  if (unsubMarketing) try { unsubMarketing() } catch {}
  if (unsubInbox) try { unsubInbox() } catch {}
})

const stats = computed(() => {
  const exposed = stores.value.filter(s => {
    const exp = s.exposure || {}
    return exp.gangtalk === undefined ? true : !!exp.gangtalk
  }).length
  const pending = stores.value.filter(s =>
    String(s.applyStatus || '').toLowerCase() === 'pending'
  ).length

  const topRanks = marketing.value.topRanks || {}
  const top5Set = new Set()
  Object.values(topRanks).forEach(arr => {
    if (Array.isArray(arr)) arr.forEach(id => top5Set.add(String(id)))
  })

  const bannersF = Array.isArray(marketing.value.adBannersFinder) ? marketing.value.adBannersFinder.length : 0
  const bannersP = Array.isArray(marketing.value.adBannersP) ? marketing.value.adBannersP.length : 0

  return {
    exposed,
    pending,
    top5: top5Set.size,
    banners: bannersF + bannersP,
  }
})

function fmtTime(v){
  if (!v) return ''
  const ms = v?.toDate ? v.toDate().getTime()
           : (typeof v?.seconds === 'number' ? v.seconds * 1000 : Number(v) || 0)
  if (!ms) return ''
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
</script>

<style scoped>
.adm-page{ max-width:1100px; margin:0 auto; }
.adm-page-head{ margin-bottom:18px; }
.adm-page-title{ margin:0; font-size:22px; font-weight:900; }
.adm-page-sub{ margin:4px 0 0; font-size:13px; color:#888; }

.adm-stat-grid{
  display:grid;
  grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));
  gap:14px;
  margin-bottom:24px;
}
.adm-stat-card{
  display:flex; align-items:center; gap:14px;
  padding:18px 20px;
  background:#fff;
  border:1px solid #f0f0f0;
  border-radius:14px;
  box-shadow:0 2px 10px rgba(0,0,0,.04);
  text-decoration:none;
  color:inherit;
  transition: transform .12s, box-shadow .12s;
}
.adm-stat-card:hover{
  transform:translateY(-2px);
  box-shadow:0 6px 16px rgba(255,77,141,.12);
  border-color:#ffd6e4;
}
.adm-stat-card.pending{ border-color:#ffe4ef; background:#fff8fb; }
.adm-stat-emoji{ font-size:32px; line-height:1; flex:none; }
.adm-stat-meta{ display:flex; flex-direction:column; gap:4px; min-width:0; }
.adm-stat-label{ font-size:12px; color:#888; font-weight:600; }
.adm-stat-value{ font-size:28px; font-weight:900; color:#ff2e7e; }

.adm-section{
  background:#fff;
  border:1px solid #f0f0f0;
  border-radius:14px;
  padding:16px 20px;
}
.adm-section-head{
  display:flex; align-items:center; justify-content:space-between;
  margin-bottom:10px;
}
.adm-section-head h3{ margin:0; font-size:15px; font-weight:800; }
.adm-link{ color:#ff2e7e; text-decoration:none; font-size:13px; font-weight:700; }

.adm-activity-list{ list-style:none; margin:0; padding:0; }
.adm-activity-item{
  display:flex; align-items:flex-start; gap:10px;
  padding:10px 0;
  border-bottom:1px solid #f5f5f5;
}
.adm-activity-item:last-child{ border-bottom:none; }
.adm-activity-dot{
  width:8px; height:8px; border-radius:50%;
  background:#ddd; flex:none; margin-top:8px;
}
.adm-activity-dot.unread{ background:#ff4d8d; }
.adm-activity-body{ flex:1; min-width:0; }
.adm-activity-title{ font-size:14px; font-weight:700; }
.adm-activity-meta{ font-size:11px; color:#999; margin-top:2px; }
.adm-empty{ color:#aaa; font-size:13px; padding:10px 0; }

:root[data-theme="dark"] .adm-stat-card,
:root[data-theme="black"] .adm-stat-card,
:root[data-theme="dark"] .adm-section,
:root[data-theme="black"] .adm-section{
  background:#1c1c1c; border-color:#2a2a2a;
}
:root[data-theme="dark"] .adm-activity-item,
:root[data-theme="black"] .adm-activity-item{
  border-bottom-color:#2a2a2a;
}
</style>
