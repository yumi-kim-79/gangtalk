<!-- src/components/StatusCard.vue -->
<template>
  <article class="card" :class="{ compact }">
    <!-- 상단: 로고/이름/지역·유형 + 혼잡도(아이콘만) -->
    <div class="top">
      <div class="avatar">
        <img v-if="logo" :src="logo" alt="" />
        <span v-else class="ph">Λ</span>
      </div>

      <div class="meta">
        <h3 class="name ellip">{{ name }}</h3>
        <small class="muted ellip">{{ region || '-' }} · {{ type || '-' }}</small>
      </div>

      <!-- 혼잡도: 와이파이 아이콘 -->
      <span class="wifi" :class="status" :title="status" aria-label="혼잡도">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M2.5 8.5a14.5 14.5 0 0 1 19 0" />
          <path d="M6 12a9.5 9.5 0 0 1 12 0" />
          <path d="M9.5 15.5a4.5 4.5 0 0 1 5 0" />
          <circle cx="12" cy="19" r="1.7" fill="currentColor" stroke="none"/>
        </svg>
      </span>
    </div>

    <!-- 중단: 지표 2개 -->
    <div class="stats">
      <div class="pill">
        <strong>{{ matchRooms }}</strong>
        <small class="muted">맞춤방</small>
      </div>
      <div class="pill">
        <strong>{{ persons }}</strong>
        <small class="muted">맞춤인원</small>
      </div>
    </div>

    <!-- 하단: 액션 4개 -->
    <div class="actions" @click.stop>
      <button class="act" type="button"
              @click.stop.prevent="openSheet('invite')"
              @touchstart.stop.prevent="openSheet('invite')">초톡</button>
      <button class="act" type="button"
              @click.stop.prevent="openSheet('manager')"
              @touchstart.stop.prevent="openSheet('manager')">담당</button>
      <button class="act" type="button"
              @click.stop.prevent="openBizChat()"
              @touchstart.stop.prevent="openBizChat()">채팅</button>
      <button class="act" type="button"
              @click.stop.prevent="openSheet('event')"
              @touchstart.stop.prevent="openSheet('event')">이벤트</button>
    </div>

    <!-- 바텀시트 팝업 -->
    <div v-if="sheet.open" class="action-mask" @click.self="closeSheet">
      <section class="action-sheet" role="dialog" aria-modal="true">
        <header class="as-header">
          <strong>{{ name }}</strong>
          <button class="as-close" aria-label="닫기" @click="closeSheet">✕</button>
        </header>

        <!-- 초톡 보기 -->
        <div v-if="sheet.type==='invite'" class="as-body">
          <h4 class="as-title">초대톡 보기</h4>
          <ul class="list">
            <li v-for="(msg, i) in invites" :key="i" class="li">
              <span class="dot">•</span><span>{{ msg }}</span>
            </li>
          </ul>
          <div class="as-actions">
            <button class="btn primary" @click="openBizChat()">초톡 열기</button>
            <button class="btn" @click="closeSheet">닫기</button>
          </div>
        </div>

        <!-- 담당자 정보 -->
        <div v-else-if="sheet.type==='manager'" class="as-body">
          <h4 class="as-title">담당자 연결</h4>
          <div class="kv"><span class="k">담당자</span><span class="v">{{ manager || '미지정' }}</span></div>
          <div class="kv"><span class="k">연락처</span><span class="v">
            <a v-if="phone" :href="`tel:${phone}`">{{ phone }}</a><span v-else>-</span>
          </span></div>
          <div class="kv" v-if="talkId"><span class="k">연결톡</span><span class="v">@{{ talkId }}</span></div>

          <div class="as-actions">
            <button class="btn primary" @click="openConnectTalk()">연결톡 열기</button>
            <button class="btn" :disabled="!phone" @click="callPhone(phone)">전화걸기</button>
            <button class="btn" :disabled="!phone" @click="copyToClipboard(phone)">번호복사</button>
          </div>
        </div>

        <!-- 이벤트 -->
        <div v-else-if="sheet.type==='event'" class="as-body">
          <h4 class="as-title">이벤트</h4>
          <ul class="list">
            <li v-for="(ev, i) in events" :key="i" class="li">
              <span class="badge small">EVENT</span><span>{{ ev }}</span>
            </li>
          </ul>
          <div v-if="!events || events.length===0" class="empty muted">진행 중인 이벤트가 없습니다.</div>
          <div class="as-actions">
            <button class="btn primary" @click="openBizChat()">이벤트 문의</button>
            <button class="btn" @click="closeSheet">닫기</button>
          </div>
        </div>
      </section>
    </div>
  </article>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  id: [String, Number],
  logo: String,
  name: { type: String, required: true },
  region: String,
  type: String,
  matchRooms: { type: [Number, String], default: 0 },
  persons: { type: [Number, String], default: 0 },
  status: { type: String, default: '보통' }, // '혼잡' | '보통' | '여유'
  compact: { type: Boolean, default: false },

  /* 팝업에 필요한 데이터 */
  manager: String,
  phone: String,
  talkId: String,
  events: { type: Array, default: () => [] },
  invites: { type: Array, default: () => [] },
})

const router = useRouter()

/* 바텀시트 상태 */
const sheet = ref({ open:false, type:'' })
const openSheet  = (type) => { sheet.value = { open:true, type } }
const closeSheet = () => { sheet.value.open = false }

/* 안전한 네비게이션: 존재하는 라우트로만 이동 */
function pushFirstAvailable(candidates){
  for(const loc of candidates){
    const r = router.resolve(loc)
    if (r.matched && r.matched.length){
      router.push(loc)
      return true
    }
  }
  alert('채팅 화면 라우트가 등록되지 않았습니다.\nrouter에 bizChat(/gangtalk/room/:roomId) 라우트를 추가하세요.')
  return false
}
const roomId = () => `store-${encodeURIComponent(props.id ?? props.name)}`

/* 이동/연결 함수들 */
const openBizChat = () => {
  const rid = roomId()
  pushFirstAvailable([
    { name:'bizChat', params:{ roomId: rid }, query:{ title: props.name } }, // 권장: 이름 라우트
    { path:`/gangtalk/room/${rid}`, query:{ title: props.name } },           // 동적 경로
    { path:'/gangtalk', query:{ room: rid, title: props.name } },            // 쿼리 방식
  ])
}
const openConnectTalk = () => {
  const to = `manager-${props.id ?? props.name}`
  pushFirstAvailable([
    { name:'managerChat', query:{ to, name: props.manager, store: props.name } },
    { path:'/connect',    query:{ to, name: props.manager, store: props.name } },
  ])
}
const callPhone = (phone) => { if (phone) window.location.href = `tel:${phone}` }
const copyToClipboard = async (text) => {
  if (!text) return
  try { await navigator.clipboard.writeText(text); alert('복사되었습니다.') }
  catch { alert('복사에 실패했어요.') }
}
</script>

<style scoped>
.card{
  border:1px solid var(--line);
  background:var(--surface);
  color:var(--fg);
  border-radius:14px;
  padding:12px;
  display:flex; flex-direction:column; gap:10px;
}

/* 상단 */
.top{ display:flex; align-items:center; gap:10px; }
.avatar{
  width:48px; height:48px; border-radius:14px; overflow:hidden;
  background: color-mix(in oklab, var(--muted), transparent 80%);
  display:flex; align-items:center; justify-content:center; font-weight:900;
}
.avatar img{ width:100%; height:100%; object-fit:cover; }
.meta{ flex:1; min-width:0; display:flex; flex-direction:column; }
.name{ margin:0; font-size:16px; font-weight:800; }
.muted{ color:var(--muted); }

/* 혼잡도: 와이파이 아이콘만 */
.wifi{
  display:inline-flex; align-items:center; justify-content:center;
  width:32px; height:32px; border-radius:10px;
  background: color-mix(in oklab, var(--muted), transparent 92%);
  border:1px solid color-mix(in oklab, var(--fg), transparent 88%);
  color: var(--fg);
}
.wifi.여유 { color:#10a66a; }
.wifi.보통 { color:#f39c12; }
.wifi.혼잡 { color:#e74c3c; }

/* 지표 */
.stats{ display:grid; grid-template-columns: repeat(2, 1fr); gap:8px; }
.pill{
  border:1px solid var(--line); border-radius:12px; padding:10px;
  display:flex; align-items:center; justify-content:center; gap:8px;
}
.pill strong{ font-size:18px; }

/* 액션 */
.actions{ display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; }
.act{
  border:1px solid var(--line); background:var(--surface); color:var(--fg);
  border-radius:12px; padding:10px; font-weight:700; transition:transform .06s ease, background .15s;
}
.act:active{ transform:scale(.98); background: color-mix(in oklab, var(--accent), transparent 90%); }

/* 두칸보기(컴팩트) */
.card.compact{ padding:10px; gap:8px; }
.card.compact .avatar{ width:40px; height:40px; border-radius:12px; }
.card.compact .name{ font-size:15px; }
.card.compact .pill strong{ font-size:16px; }
.card.compact .act{ padding:8px; font-size:13px; }
.card.compact .wifi{ width:28px; height:28px; border-radius:8px; }

/* 바텀시트 */
.action-mask{ position:fixed; inset:0; background:rgba(0,0,0,.35); display:grid; place-items:end center; z-index:9999; }
.action-sheet{
  width:100%; max-width:680px; background:var(--surface); color:var(--fg);
  border-top-left-radius:18px; border-top-right-radius:18px;
  box-shadow:0 -10px 30px rgba(0,0,0,.25); padding:12px 14px 14px; animation:slideUp .16s ease-out;
}
@keyframes slideUp{ from{ transform:translateY(16px); opacity:.7 } to{ transform:none; opacity:1 } }
.as-header{ display:flex; justify-content:space-between; align-items:center; padding:4px 2px 10px; border-bottom:1px solid var(--line) }
.as-close{ width:32px; height:32px; border-radius:999px; border:1px solid var(--line); background:var(--surface) }
.as-body{ padding:12px 2px 2px }
.as-title{ margin:0 0 10px; font-size:16px }
.kv{ display:flex; justify-content:space-between; gap:10px; padding:8px 0; border-bottom:1px dashed var(--line) }
.kv .k{ color:var(--muted) } .kv .v{ font-weight:700 }
.list{ display:flex; flex-direction:column; gap:8px; margin-bottom:10px }
.li{ display:flex; gap:8px; align-items:flex-start }
.dot{ color:var(--muted) }
.badge.small{ font-size:11px; border:1px solid var(--line); border-radius:999px; padding:2px 6px; margin-right:6px; background:var(--surface) }
.empty{ padding:8px 0 2px }
.as-actions{ display:flex; gap:8px; flex-wrap:wrap; padding:6px 0 2px }
.btn{ flex:1; min-width:120px; height:42px; border-radius:12px; border:1px solid var(--line); background:var(--surface); font-weight:800; }
.btn.primary{ background: color-mix(in oklab, var(--accent), white 85%); border-color: var(--accent) }

/* 유틸 */
.ellip{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
</style>
