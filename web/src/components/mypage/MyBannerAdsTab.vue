<template>
  <section class="section">
    <header class="section-head">
      <h3 class="sub">내 배너광고</h3>
      <p class="muted">내가 신청한 배너 광고 내역을 확인할 수 있어요.</p>
    </header>

    <!-- 비어있음 -->
    <div v-if="loading" class="empty">불러오는 중…</div>
    <div v-else-if="items.length === 0" class="empty">신청한 배너 광고가 없습니다.</div>

    <!-- 목록 -->
    <ul v-else class="banner-list">
      <li v-for="b in items" :key="b.id" class="banner-item">
        <div class="row1">
          <strong class="title">{{ b.title || '(제목 없음)' }}</strong>
          <span class="pos">위치: {{ humanPos(b.position) }}</span>
        </div>

        <div class="row2">
          <span class="date">
            기간:
            <b>{{ fmt(b.startAt) }}</b> ~ <b>{{ fmt(b.endAt) }}</b>
          </span>

          <span
            class="badge"
            :class="{
              running: statusOf(b) === '진행',
              ended: statusOf(b) === '종료',
              pending: statusOf(b) === '검토중'
            }"
          >
            {{ statusOf(b) }}
          </span>
        </div>

        <div class="row3">
          <button
            class="btn danger tiny"
            :disabled="statusOf(b) !== '종료' || deletingId === b.id"
            @click="onDelete(b)"
            :title="statusOf(b) !== '종료' ? '종료된 항목만 삭제할 수 있어요' : '삭제'"
          >
            {{ deletingId === b.id ? '삭제 중…' : '삭제' }}
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { getAuth } from 'firebase/auth'
import { db as fbDb } from '@/firebase'
import {
  collection, query, where, orderBy, onSnapshot, deleteDoc, doc
} from 'firebase/firestore'

/**
 * 컬렉션 이름은 실제 사용 중인 값으로 맞춰 주세요.
 * - 예시1: 'bannerApplications'
 * - 예시2: 'ad_banners'
 */
const COLLECTION = 'bannerApplications'

const items = ref([])
const loading = ref(true)
const deletingId = ref(null)

let unsub = null

onMounted(() => {
  const uid = getAuth()?.currentUser?.uid
  if (!uid) {
    loading.value = false
    items.value = []
    return
  }

  // 내 신청건 실시간 구독
  const q = query(
    collection(fbDb, COLLECTION),
    where('ownerUid', '==', uid),
    orderBy('createdAt', 'desc')
  )
  unsub = onSnapshot(q, (snap) => {
    items.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    loading.value = false
  }, () => {
    loading.value = false
  })
})

onBeforeUnmount(() => {
  if (unsub) unsub()
})

/** 상태 계산
 * - 승인 + (현재시간이 start~end 사이) → 진행
 * - 그 외:
 *   - 승인됐지만 기간 밖 → 종료
 *   - 미승인/검토중 → 검토중  (원하시면 모두 ‘종료’로 바꿔도 OK)
 */
function statusOf(b) {
  const now = Date.now()
  const start = toMillis(b.startAt)
  const end = toMillis(b.endAt)
  const approved = b.approved === true || b.status === 'approved'

  if (approved && start && end && start <= now && now <= end) return '진행'
  if (approved && end && now > end) return '종료'
  return '검토중'
}

function toMillis(v) {
  // Firestore Timestamp 또는 숫자/문자열 모두 대응
  if (!v) return 0
  if (typeof v?.toMillis === 'function') return v.toMillis()
  const n = Number(v)
  if (!Number.isNaN(n) && n > 0) return n
  const t = new Date(v).getTime()
  return Number.isFinite(t) ? t : 0
}

function fmt(v) {
  const ms = toMillis(v)
  if (!ms) return '-'
  const d = new Date(ms)
  const y = d.getFullYear()
  const m = String(d.getMonth()+1).padStart(2,'0')
  const day = String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${day}`
}

function humanPos(pos) {
  // 위치코드 → 한글 라벨 (프로젝트에서 쓰는 실제 키에 맞춰 확장)
  switch (pos) {
    case 'PARTNER_TOP': return '제휴관 상단 배너'
    case 'FINDER_TOP':  return '가게찾기 상단 배너'
    default:            return pos || '지정 안됨'
  }
}

async function onDelete(b) {
  if (statusOf(b) !== '종료') return
  if (!confirm(`'${b.title || '배너'}' 항목을 삭제할까요?`)) return

  try {
    deletingId.value = b.id
    await deleteDoc(doc(fbDb, COLLECTION, b.id))
  } catch (e) {
    alert('삭제 중 오류가 발생했습니다. 콘솔을 확인해 주세요.')
    console.error(e)
  } finally {
    deletingId.value = null
  }
}
</script>

<style scoped>
.section { display: grid; gap: 12px; }
.section-head { display:flex; flex-direction: column; gap: 4px; }
.muted { color: #777; font-size: 13px; }

.empty { padding: 20px; text-align: center; color: #777; }

.banner-list { display: grid; gap: 12px; }
.banner-item {
  border: 1px solid #eee;
  border-radius: 16px;
  padding: 12px;
  display: grid;
  gap: 8px;
  background: #fff;
}
.row1 { display:flex; align-items:center; gap:8px; justify-content:space-between; }
.title { font-weight: 700; }
.pos { font-size: 12px; color:#666; }
.row2 { display:flex; align-items:center; gap:8px; justify-content:space-between; }
.date { font-size: 13px; color:#555; }
.badge {
  padding: 4px 8px; border-radius: 999px; font-size: 12px; font-weight: 700;
  border: 1px solid #ddd;
}
.badge.running { color:#0a7; border-color:#0a7; }
.badge.ended   { color:#d33; border-color:#d33; }
.badge.pending { color:#888; border-color:#888; }
.row3 { display:flex; justify-content:flex-end; }
.btn { padding: 6px 10px; border-radius: 10px; border: 1px solid #ddd; background:#fafafa; }
.btn.tiny { font-size: 12px; padding: 4px 8px; }
.btn.danger { color:#fff; background:#ff3b5c; border-color:#ff3b5c; }
.btn.danger:disabled { opacity: .5; cursor:not-allowed; }
</style>
