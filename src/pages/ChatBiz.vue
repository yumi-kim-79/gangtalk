<!-- src/pages/ChatBiz.vue -->
<template>
  <section class="chat-page">
    <header class="cat-head">
      <button class="back-btn" @click="$router.back()">←</button>
      <b>{{ roomMeta.storeName || '업체 초톡' }}</b>
      <span class="spacer"></span>
      <small class="muted">
        맞출방 <b>{{ needRooms }}</b> · 필요인원 <b>{{ needPeople }}</b> · 참여자 <b>{{ matched }}</b>
      </small>
    </header>

    <section class="stat-bar">
      <div>맞출방: <b>{{ needRooms }}</b></div>
      <div>필요인원: <b>{{ needPeople }}</b></div>
      <div>참여자: <b>{{ matched }}</b></div>
      <div class="grow"></div>
      <div class="muted sm">업데이트 항상 가능 · 매일 07:00 리셋</div>

      <button class="chip sm" @click="toggleJoin">
        {{ joined ? '참여취소' : '참여하기' }}
      </button>
    </section>

    <div class="msg-box" ref="msgBox">
      <div v-for="m in messages" :key="m._id" class="msg" :class="{ me: m.me }">
        <div class="who">{{ m.author }}</div>
        <div class="bubble pre">{{ m.text }}</div>
        <div class="time">{{ m.time }}</div>
      </div>
    </div>

    <form class="composer" @submit.prevent="send">
      <textarea
        v-model="draft"
        rows="2"
        placeholder="메시지를 입력... (카톡 텍스트를 붙여넣고 ‘전송’을 누르면 반영됩니다)"
        @paste="onPaste"
        class="ta"
      ></textarea>
      <button type="submit">전송</button>
    </form>
  </section>
</template>

<script setup>
/* src/pages/ChatBiz.vue
 * ─────────────────────────────────────────────────────────────
 * ✅ 문서/방 ID 자동 해석 & 레거시 폴백
 *  - URL의 :storeId 가 Firestore 자동아이디여도, stores/{id}에서
 *    vendorKey|slug|key|bizKey|rooms_biz|title 등을 읽어
 *    사람키(예: labels)로 자동 매핑.
 *  - 메시지 구독 후보:
 *      A) /rooms_biz/{finalStoreId}/rooms/{finalRoomId}/messages
 *      B) /chat_rooms/{finalRoomId}/messages
 *      C) /chat_rooms/{aliasRoomId}/messages (labels_room_01 등 여러 후보)
 *      D) /rooms/{finalRoomId}/messages (또는 alias 후보)
 *  - 첫 번째로 문서가 존재하거나 스냅샷이 정상 오는 경로를 채택.
 * ─────────────────────────────────────────────────────────────
 */
import { ref, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'
import { useRoute } from 'vue-router'
import { fbDb, ensureSignedIn } from '@/firebase'
import {
  collection, doc, onSnapshot, getDoc, getDocs, setDoc, serverTimestamp,
  orderBy, query, deleteDoc
} from 'firebase/firestore'
import { safeAdd, safeUpdate } from '@/lib/firestoreSafe'

/* ---------------- route / state ---------------- */
const route = useRoute()
const rawStoreId = String((route.params.storeId ?? '')).trim()
const displayName = String(route.query.name || rawStoreId || '업체')

/** 최종 사용될 storeId/roomId (자동 매핑 이후 값) */
const finalStoreId = ref(rawStoreId)
const finalRoomId  = ref(String(route.query.roomId ?? `${rawStoreId}_room_01`))

/** 레거시 alias 후보 (예: labels) */
const aliasKey = ref('')          // stores 문서에서 추출한 사람이 읽는 키
const aliasRoomIds = ref([])      // labels_room_01, store_labels_room_01 등

const msgBox = ref(null)
const messages = ref([])
const draft = ref('')

const roomMeta = ref({ storeId: rawStoreId, storeName: displayName })
const matched = ref(0)
const joined = ref(false)

const needRooms = ref(0)
const needPeople = ref(0)
const ready = ref(false)

/** rooms_biz 스냅샷이 최소 1회 로딩됐는지(덮어쓰기 방지 플래그) */
const roomsBizLoaded = ref(false)

/** stores 구독 + 관리자 판별용 */
const storeStat = ref({
  maxRooms: 0,
  maxPersons: 0,
  match: 0,
  persons: 0,
  ownerId: '',
  managerUid: '',
  managerEmail: '',
  admins: [],
  managers: []
})

const me = ref(null)

/* ===== 권한 판별 ===== */
const WEB_ADMIN_EMAIL = 'gangtalk815@gmail.com'
const isWebAdmin = ref(false)
const isStoreManager = ref(false)
const canWriteCounts = computed(()=> isWebAdmin.value || isStoreManager.value)

function same(a='', b=''){
  return String(a||'').trim().toLowerCase() === String(b||'').trim().toLowerCase()
}
function arrHas(list, v){
  const a = Array.isArray(list) ? list : []
  return a.some(x => same(x, v) || same(x?.uid, v) || same(x?.email, v))
}
function recomputePerms(){
  const u = me.value
  if (!u){ isWebAdmin.value = false; isStoreManager.value = false; return }
  const email = u.email || ''
  const uid   = u.uid   || ''

  isWebAdmin.value =
    same(email, WEB_ADMIN_EMAIL) ||
    !!(u._tokenResult?.claims?.admin) ||
    same(u._tokenResult?.claims?.role, 'admin')

  const s = storeStat.value || {}
  isStoreManager.value =
    same(s.ownerId, uid) ||
    same(s.managerUid, uid) || same(s.managerEmail, email) ||
    arrHas(s.admins, uid) || arrHas(s.admins, email) ||
    arrHas(s.managers, uid) || arrHas(s.managers, email)
}

/* ---------------- util ---------------- */
const clock = (ms)=>{
  const d = new Date(ms)
  const h = String(d.getHours()).padStart(2,'0')
  const m = String(d.getMinutes()).padStart(2,'0')
  return `${h}:${m}`
}
const norm = (id,x)=>({
  _id:id,
  text:String(x.text||''),
  author:String(x.author||'익명'),
  me:x.authorUid === me.value?.uid,
  time: clock(x.createdAt?.toMillis?.() || Date.now())
})
function scrollBottom(){
  nextTick(()=>{
    const el=msgBox.value
    if(el) el.scrollTop = el.scrollHeight
  })
}

/* ---------------- Firestore helpers ---------------- */
/** 상단/하위 문서 보장 (최종 storeId/roomId 기준) */
async function ensureRoom(){
  try{
    const bizRef = doc(fbDb, 'rooms_biz', finalStoreId.value)
    const bs = await getDoc(bizRef)
    if (!bs.exists() && canWriteCounts.value){
      await setDoc(bizRef, {
        storeId: finalStoreId.value,
        storeName: displayName,
        needRooms: 0, needPeople: 0, matched: 0,
        lastResetDate: '',
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      }, { merge: true })
    }
    const roomRef = doc(fbDb, 'rooms_biz', finalStoreId.value, 'rooms', finalRoomId.value)
    const rs = await getDoc(roomRef)
    if (!rs.exists() && canWriteCounts.value){
      await setDoc(roomRef, {
        roomId: finalRoomId.value,
        active: true,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      }, { merge: true })
    }
  }catch(e){ /* 무시 */ }
}

/** 카운트 업데이트 */
async function updateCounts(roomCount, needSum, pastedText){
  if (!canWriteCounts.value){
    alert('카운트 수정 권한이 없습니다. (업체 관리자/웹 관리자만 가능)')
    return
  }
  try{
    await safeUpdate(
      doc(fbDb, 'rooms_biz', finalStoreId.value),
      {
        needRooms: roomCount,
        needPeople: needSum,
        lastPastedText: pastedText.slice(0, 2000),
        lastPastedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      'roomsBiz:counter'
    )
  }catch(e){
    console.warn('rooms_biz 카운트 업데이트 실패(무시):', e)
  }

  try{
    const sRef = doc(fbDb, 'stores', finalStoreId.value)
    const s = await getDoc(sRef)
    if (s.exists()){
      await safeUpdate(
        sRef,
        { match: roomCount, persons: needSum, updatedAt: serverTimestamp() },
        'update'
      )
    }
  }catch(_){}
}

/* ---------------- paste parsing ---------------- */
function parsePasted(text){
  const lines = String(text || '').split(/\r?\n/)
  let roomCount = 0
  let needSum = 0

  for (const raw of lines){
    const line = raw.trim()
    if (!line) continue

    const m1 = line.match(/^\s*(\d{1,4})\b/)
    if (!m1) continue
    roomCount += 1

    const after = line.slice(m1[0].length)
    const m2 = after.match(/(\d+)/)
    if (m2){
      const n = Number(m2[1])
      if (!Number.isNaN(n)) needSum += n
    }
  }
  return { roomCount, needSum }
}

/* ---------------- message helpers ---------------- */
async function sendMessage(text, kind='chat'){
  const original = String(text ?? '')
  if (!original.trim()) return null
  if (!me.value){ alert('로그인이 필요합니다.'); return null }

  const author = me.value.displayName || me.value.email || '익명'
  const ok = await safeAdd(
    collection(fbDb, 'rooms_biz', finalStoreId.value, 'rooms', finalRoomId.value, 'messages'),
    {
      text: original.replace(/\r\n/g, '\n'),
      author,
      authorUid: me.value.uid,
      kind, // 'paste' | 'chat'
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    'add'
  )
  if (!ok) { alert('전송 권한이 없습니다.'); return null }

  scrollBottom()
  return null
}

async function onPaste(e){
  const cd = e.clipboardData || window.clipboardData
  let text = ''
  if (cd) text = cd.getData('text/plain') || cd.getData('text') || ''
  if (!text && navigator?.clipboard?.readText) {
    try { text = await navigator.clipboard.readText() } catch {}
  }
  if (!text) return
  e.preventDefault()
  draft.value = text.replace(/\r\n/g, '\n')
}

async function send(){
  const t = String(draft.value || '')
  if (!t.trim()) return

  const multi = /[\r\n]/.test(t.trim())
  const kind = multi ? 'paste' : 'chat'

  if (multi){
    const { roomCount, needSum } = parsePasted(t)
    needRooms.value  = roomCount
    needPeople.value = needSum
    await updateCounts(roomCount, needSum, t)
  }

  await sendMessage(t, kind)
  draft.value=''
}

/* ---------------- legacy resolver ---------------- */
function sanitize(v){ return String(v ?? '').trim().toLowerCase() }
function looksLikeAutoId(v){
  const s = sanitize(v)
  return /^[a-z0-9]{20,}$/.test(s) // Firestore auto-id 패턴 대략
}

/** stores/{rawStoreId}에서 사람이 읽는 키 추출 */
async function resolveStoreKey(){
  if (!looksLikeAutoId(rawStoreId)) {
    finalStoreId.value = sanitize(rawStoreId)
    finalRoomId.value  = String(route.query.roomId ?? `${finalStoreId.value}_room_01`)
    aliasKey.value = finalStoreId.value
    return
  }

  try{
    const s = await getDoc(doc(fbDb, 'stores', rawStoreId))
    if (s.exists()){
      const d = s.data() || {}
      const picks = [
        d.vendorKey, d.slug, d.key, d.bizKey, d.rooms_biz, d.id, d.storeId, d.title, d.name
      ].map(x => sanitize(x)).filter(Boolean)

      const first = picks[0]
      if (first){
        aliasKey.value = first
        finalStoreId.value = first
        finalRoomId.value = String(route.query.roomId ?? `${first}_room_01`)
        console.info('[CHAT_RESOLVE] stores 문서에서 vendorKey 추출:', first)
        return
      }
    }
  }catch(e){
    console.warn('[CHAT_RESOLVE] stores 문서에서 vendorKey 추출 실패:', e?.message || e)
  }

  // 실패시: 원래 값 그대로 사용
  finalStoreId.value = sanitize(rawStoreId)
  finalRoomId.value  = String(route.query.roomId ?? `${finalStoreId.value}_room_01`)
  aliasKey.value = finalStoreId.value
}

/** alias 기반 레거시 roomId 후보 생성 */
function buildAliasRoomIds(){
  const k = aliasKey.value || finalStoreId.value
  const uniq = new Set([
    `${k}_room_01`,
    `store_${k}_room_01`,
    `${k}-room-01`,
    k, // 혹시 방ID가 그냥 키였던 경우 대비
  ])
  aliasRoomIds.value = Array.from(uniq)
}

/* ---------------- chat subscribe (multi-path fallback) ---------------- */
let unsubMsg = null
function cleanupMsg() {
  if (typeof unsubMsg === 'function') {
    try { unsubMsg() } catch {}
  }
  unsubMsg = null
}

function attachWithFallback(qRef, onOk) {
  try {
    const u = onSnapshot(qRef, onOk, async (err) => {
      console.warn('[CHAT] onSnapshot error:', err?.code || err)
      try {
        const once = await getDocs(qRef)
        onOk(once)
      } catch {}
    })
    return u
  } catch (e) {
    console.warn('[CHAT] attach failed:', e?.message || e)
    getDocs(qRef).then(onOk).catch(()=>{})
    return null
  }
}

/** 후보 경로를 “문서가 있는 곳”으로 자동 선택 */
async function subscribeMessages(){
  cleanupMsg()

  const candidates = []

  // 1) canonical
  candidates.push({
    label: 'rooms_biz',
    col: collection(fbDb, 'rooms_biz', finalStoreId.value, 'rooms', finalRoomId.value, 'messages'),
  })

  // 2) legacy chat_rooms (최종 roomId)
  candidates.push({
    label: 'chat_rooms',
    col: collection(fbDb, 'chat_rooms', finalRoomId.value, 'messages'),
  })
  // 3) legacy chat_rooms (alias 전부)
  for (const rid of aliasRoomIds.value) {
    candidates.push({
      label: `chat_rooms(alias:${rid})`,
      col: collection(fbDb, 'chat_rooms', rid, 'messages'),
    })
  }

  // 4) legacy rooms (최종 + alias)
  candidates.push({
    label: 'rooms(legacy)',
    col: collection(fbDb, 'rooms', finalRoomId.value, 'messages'),
  })
  for (const rid of aliasRoomIds.value) {
    candidates.push({
      label: `rooms(legacy alias:${rid})`,
      col: collection(fbDb, 'rooms', rid, 'messages'),
    })
  }

  // 순서대로 “문서가 1개 이상 있는” 경로를 찾아 구독
  for (const c of candidates) {
    const qRef = query(c.col, orderBy('createdAt','asc'))

    // 1) 존재 여부 1회 확인
    try {
      const once = await getDocs(qRef)
      const hasDocs = (once?.docs?.length || 0) > 0
      if (!hasDocs) {
        console.info('[CHAT_SUB skip(empty)]', c.label)
        continue
      }
      // 2) 스냅샷 구독
      unsubMsg = onSnapshot(qRef, (qs)=>{
        const list = (qs?.docs || []).map(d=>norm(d.id, d.data()))
        messages.value = list
        scrollBottom()
      }, (err)=>{
        console.warn('[CHAT] onSnapshot error:', err?.code || err)
      })
      console.info('[CHAT_SUB OK]', c.label)
      return
    } catch (e) {
      console.info('[CHAT_SUB skip(error)]', c.label, e?.code || e?.message || e)
      continue
    }
  }

  // 모든 후보에 문서가 없을 때: canonical 경로라도 잡아둔다(빈 목록)
  const fallback = query(
    collection(fbDb, 'rooms_biz', finalStoreId.value, 'rooms', finalRoomId.value, 'messages'),
    orderBy('createdAt','asc')
  )
  unsubMsg = onSnapshot(fallback, (qs)=>{
    messages.value = (qs?.docs || []).map(d=>norm(d.id, d.data()))
  })
  console.info('[CHAT_SUB fallback] rooms_biz (no docs anywhere)')
}

/* ---------------- chat actions ---------------- */
async function toggleJoin(){
  if(!me.value) return
  const pRef = doc(fbDb, 'rooms_biz', finalStoreId.value, 'participants', me.value.uid)
  try{
    const cur = await getDoc(pRef)
    if (cur.exists()){
      await deleteDoc(pRef)
      joined.value = false
    }else{
      await setDoc(pRef, {
        uid: me.value.uid,
        name: me.value.displayName || me.value.email || '익명',
        joinedAt: serverTimestamp()
      })
      joined.value = true
    }
  }catch(e){
    console.warn('참여 토글 실패:', e)
    alert('참여 권한이 없습니다.')
  }
}

/* ---------------- lifecycle ---------------- */
let unsubs = []
onMounted(async ()=>{
  // 로그인(익명 가능) + 커스텀 클레임 (AppCheck 문제 있어도 read는 공개라 표시됨)
  try{
    me.value = await ensureSignedIn()
    const token = await me.value?.getIdTokenResult?.()
    if (token) me.value._tokenResult = token
  }catch{
    // 익명 로그인 실패해도 읽기는 공개라 무시
  }

  await resolveStoreKey()
  buildAliasRoomIds()

  console.info('[CHAT_ROOM_IDS]', { storeId: finalStoreId.value, roomId: finalRoomId.value })

  // 상단/하위 문서 보장(권한자만 실제 생성)
  await ensureRoom()

  // rooms_biz 메타
  unsubs.push(onSnapshot(doc(fbDb, 'rooms_biz', finalStoreId.value), (s)=>{
    const d = s.data() || {}
    roomMeta.value = { storeId: finalStoreId.value, storeName: d.storeName || displayName }
    needRooms.value = Number(d.needRooms || 0)
    needPeople.value = Number(d.needPeople || 0)
    roomsBizLoaded.value = true
  }))

  // stores: 권한/소유 판별 전용
  unsubs.push(onSnapshot(doc(fbDb, 'stores', finalStoreId.value), (s)=>{
    const d = s.data() || {}
    storeStat.value = {
      maxRooms:  Number(d.maxRooms   || 0),
      maxPersons:Number(d.maxPersons || 0),
      match:     Number(d.match      || 0),
      persons:   Number(d.persons    || 0),
      ownerId:   String(d.ownerId || ''),
      managerUid:   String(d.managerUid || ''),
      managerEmail: String(d.managerEmail || ''),
      admins: Array.isArray(d.admins) ? d.admins : [],
      managers: Array.isArray(d.managers) ? d.managers : []
    }
    recomputePerms()
  }))

  // 참여자 → matched 동기화(권한자만)
  unsubs.push(onSnapshot(collection(fbDb, 'rooms_biz', finalStoreId.value, 'participants'), async (qs)=>{
    matched.value = qs.size
    if (ready.value && canWriteCounts.value) {
      try{
        await safeUpdate(
          doc(fbDb, 'rooms_biz', finalStoreId.value),
          { matched: qs.size, updatedAt: serverTimestamp() },
          'roomsBiz:counter'
        )
      }catch(e){
        console.warn('matched 업데이트 실패(무시):', e)
      }
    }
    if (me.value){ joined.value = !!qs.docs.find(d => d.id === me.value.uid) }
  }))

  // 메시지 구독(다중 경로 폴백 + alias)
  await subscribeMessages()

  recomputePerms()
  ready.value = true
})

onBeforeUnmount(()=>{
  unsubs.forEach(u=>typeof u==='function' && u())
  cleanupMsg()
})
</script>

<style scoped>
.chat-page{ display:flex; flex-direction:column; height:100vh; }
.cat-head{ display:flex; align-items:center; gap:8px; padding:10px; border-bottom:1px solid #eee; }
.spacer{ flex:1 }
.stat-bar{ display:flex; gap:12px; align-items:center; padding:8px 10px; border-bottom:1px dashed #eee; flex-wrap:wrap }
.stat-bar .grow{ flex:1 }
.muted{ opacity:.7 }
.muted.sm{ font-size:12px }

/* 메시지 리스트 */
.msg-box{ flex:1; overflow:auto; padding:10px; display:flex; flex-direction:column; gap:8px }
.msg{ max-width:78%; }
.msg.me{ align-self:flex-end; text-align:right }
.who{ font-size:12px; opacity:.7 }

/* 원본 줄바꿈/공백 보존 + 좌측 정렬 보장 */
.bubble.pre{
  white-space: pre-wrap;
  word-break: break-word;
  font-variant-ligatures: none;
  text-align: left;
}
.bubble{
  display:inline-block; padding:8px 10px; border:1px solid #ddd; border-radius:10px; background:#fff;
}
.time{ font-size:11px; opacity:.6; margin-top:2px }

/* 입력영역 */
.composer{ display:flex; gap:6px; padding:8px; border-top:1px solid #eee }
.composer .ta{
  flex:1;
  line-height: 1.35;
  font-size: 14px;
  height: calc(1.35em * 2 + 20px);
  min-height: calc(1.35em * 2 + 20px);
  max-height: 40vh;
  padding:10px;
  border:1px solid #ddd;
  border-radius:8px;
  resize: vertical;
  white-space: pre-wrap;
  text-align:left;
}
.chip.sm{ padding:6px 10px; border:1px solid #ddd; border-radius:999px; background:#fff; cursor:pointer }
</style>
