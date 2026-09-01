<!-- src/pages/PartnerRequestPage.vue -->
<template>
  <main class="page">
    <!-- ================= Topbar ================= -->
    <header class="topbar">
      <h1 class="ttl">제휴업체 등록신청</h1>
      <div class="rt">
        <button class="btn" @click="goBack">취소</button>
        <button class="btn" @click="saveDraft">임시저장</button>
        <button class="btn primary" :disabled="submitting" @click="submit">
          {{ submitting ? '처리중…' : '신청하기' }}
        </button>
      </div>
    </header>

    <!-- ================= 헤더(왼: 사진 / 오: 기본정보) ================= -->
    <section class="hero">
      <!-- 왼쪽: 썸네일 + 다중 보관/네비 -->
      <div class="hero-thumb" :style="bgImage(f.thumb)">
        <!-- iOS 대응: 시각적 숨김 -->
        <input
          id="filePick"
          class="file-input-sronly"
          type="file"
          accept="image/*"
          multiple
          @change="onPick"
        />
        <label class="thumb-btn" for="filePick" title="이미지 변경">이미지 변경</label>

        <button
          v-if="gallery.length > 1"
          type="button"
          class="thumb-nav left"
          aria-label="이전 이미지"
          @click="prevThumb"
        >‹</button>
        <button
          v-if="gallery.length > 1"
          type="button"
          class="thumb-nav right"
          aria-label="다음 이미지"
          @click="nextThumb"
        >›</button>
        <small v-if="gallery.length > 1" class="thumb-count">
          {{ photoIndex + 1 }} / {{ gallery.length }}
        </small>
      </div>

      <!-- 오른쪽: 상호/소개/대표서비스(인라인) -->
      <div class="hero-body">
        <!-- ===== 한 줄: 상호명(좌) · 지역 · 유형(우) ===== -->
        <div class="title-row">
          <!-- 상호명 -->
          <div class="title">
            <template v-if="edit.name">
              <input
                v-model.trim="f.name"
                class="inline-input big one-line"
                placeholder="상호명을 입력하세요"
                @blur="edit.name=false"
                @keyup.enter="edit.name=false"
              />
            </template>
            <template v-else>
              <button class="inline-btn-txt big one-line" type="button" @click="edit.name=true" title="상호명">
                {{ f.name || '상호명을 입력하세요' }}
              </button>
            </template>
          </div>

          <!-- 지역 -->
          <div class="mini-slot">
            <template v-if="edit.region">
              <input
                v-model.trim="f.region"
                class="inline-input xs"
                placeholder="지역"
                @blur="edit.region=false"
                @keyup.enter="edit.region=false"
              />
            </template>
            <template v-else>
              <button class="inline-chip xs" type="button" @click="edit.region=true">
                {{ f.region || '지역' }}
              </button>
            </template>
          </div>

          <!-- 카테고리(유형) -->
          <div class="mini-slot">
            <template v-if="edit.category">
              <select v-model="f.category" class="inline-select xs" @blur="edit.category=false">
                <option v-for="opt in partnerCategoryOptions" :key="opt.key" :value="opt.key">
                  {{ opt.label }}
                </option>
              </select>
            </template>
            <template v-else>
              <button class="inline-chip xs" type="button" @click="edit.category=true">
                {{ mapCat[f.category] || '유형' }}
              </button>
            </template>
          </div>
        </div>

        <!-- 소개: 헤더 내부 인라인 -->
        <div class="intro-row">
          <template v-if="edit.desc">
            <textarea
              v-model.trim="f.desc"
              rows="2"
              class="inline-textarea"
              placeholder="가게 소개를 입력하세요."
              @blur="edit.desc=false"
            />
          </template>
          <template v-else>
            <button class="inline-area one-line" type="button" @click="edit.desc=true" title="소개">
              {{ f.desc || '소개' }}
            </button>
          </template>
        </div>

        <!-- ✅ 대표 서비스: 입력 후 '추가'로 하나씩 저장 -->
        <div class="tags-inline">
          <div class="tags" v-if="f.tags.length">
            <span v-for="(t, i) in f.tags" :key="i" class="tag sm">
              {{ t }}
              <button type="button" class="tag-x" @click="removeTag(i)">×</button>
            </span>
          </div>

          <div class="tag-input-row">
            <input
              v-model.trim="tagDraft"
              class="inline-input xs"
              placeholder="대표 서비스 입력"
              @keyup.enter="addTag"
            />
            <button type="button" class="chip add" @click="addTag">추가</button>
          </div>
          <small class="muted hint">예: 컷 / 펌 / 염색 · 엔터 또는 ‘추가’로 저장</small>
        </div>
      </div>
    </section>

    <!-- ================= 본문(영업정보만) ================= -->
    <section class="dv-card">
      <section class="dv-sec">
        <h4>영업 정보</h4>
        <div class="info-table">
          <div class="tr">
            <div class="tk">주소</div>
            <div class="tv">
              <input v-model.trim="f.address" class="inline-input" placeholder="예: 서울 강남구 어딘로 123" />
            </div>
          </div>
          <div class="tr">
            <div class="tk">운영시간</div>
            <div class="tv">
              <input v-model.trim="f.hours" class="inline-input" placeholder="예: 10:00~21:00" />
            </div>
          </div>
          <div class="tr">
            <div class="tk">휴일</div>
            <div class="tv">
              <input v-model.trim="f.holiday" class="inline-input" placeholder="예: 매주 월요일" />
            </div>
          </div>
        </div>
      </section>
    </section>

    <!-- ================= 가로 패널(광고기간/비용) ================= -->
    <section class="panels-row">
      <!-- 광고기간 -->
      <section class="panel compact">
        <div class="panel-h">
          <strong>광고기간</strong>
          <small class="muted">+개월 버튼 · 종료 23:59:59</small>
        </div>

        <div class="dur-row">
          <div class="dur-chips compact">
            <button
              v-for="o in durOptions"
              :key="o.key"
              type="button"
              class="chip"
              :class="{ on: duration===o.key }"
              @click="pickDuration(o.key)"
            >{{ o.label }}</button>
          </div>

          <div class="period-info slim">
            <span class="pi">시작: <b>{{ startStr }}</b></span>
            <span class="pi">종료: <b>{{ endStr }}</b></span>
            <span class="pi">총 <b>{{ adDays }}</b>일</span>
          </div>
        </div>
      </section>

      <!-- 광고비용 -->
      <section class="panel compact">
        <div class="panel-h">
          <div class="two-line">
            <strong>결제금액</strong>
          </div>
        </div>
        <div class="bill compact">
          <div v-if="adDays > 0" class="calc">
            <b>{{ adDays }}</b>일 × <b>{{ won(EXTEND_UNIT) }}</b> = <b>{{ won(adCost) }}</b>
          </div>
          <div v-else class="calc muted">기간을 선택하면 비용이 계산됩니다.</div>

          <div class="notice">등록신청 이후 <b>24시간 안에</b> 아래 계좌로 입금 확인되어야 승인됩니다.</div>
          <div class="account">
            <div class="acc-bank">가상(더미)계좌 : 우리은행 1002-000-123456</div>
            <div class="acc-owner">예금주 : ㈜강톡</div>
            <small class="muted">* 실제 계좌는 추후 교체 가능합니다.</small>
          </div>
        </div>
      </section>
    </section>

    <!-- 하단 액션 -->
    <section class="actions">
      <button class="btn" @click="saveDraft">임시저장</button>
      <button class="btn primary" :disabled="submitting" @click="submit">
        {{ submitting ? '처리중…' : '신청하기' }}
      </button>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { auth as fbAuth, db as fbDb, storage as fbStorage } from '@/firebase'
import { collection, doc, serverTimestamp, setDoc, getDoc } from 'firebase/firestore'
import { ref as sRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { onAuthStateChanged } from 'firebase/auth'   // ✅ 추가

const router = useRouter()
const route  = useRoute()
const goBack = () => router.push({ name:'myStores' })
const submitting = ref(false)

/* ===== 관리자회원(제휴관 담당자) 여부 =====
 * - users/{uid}.type === 'company'
 * - users/{uid}.accountKind === 'partnerOwner'
 */
const isPartnerOwner = ref(false)

async function resolvePartnerOwner(user){
  if (!user) {
    isPartnerOwner.value = false
    return
  }
  try {
    const snap = await getDoc(doc(fbDb, 'users', user.uid))
    if (!snap.exists()) {
      isPartnerOwner.value = false
      return
    }
    const data = snap.data() || {}
    const type = String(data.type || data.profile?.type || '').toLowerCase()
    const kind = String(data.accountKind || '').toLowerCase()

    // 🔹 제휴관 담당자 = company + partnerOwner
    isPartnerOwner.value = (type === 'company' && kind === 'partnerowner')
  } catch (e) {
    console.warn('[PartnerRequest] resolvePartnerOwner failed:', e)
    isPartnerOwner.value = false
  }
}

onMounted(() => {
  // 초기 로그인 상태
  resolvePartnerOwner(fbAuth.currentUser)
  // 로그인/로그아웃 변화 감지
  onAuthStateChanged(fbAuth, resolvePartnerOwner)
})

/* ===== 광고 단가 ===== */
const EXTEND_UNIT = 5000

/* ===== 카테고리 ===== */
const partnerCategoryOptions = [
  { key:'salon',  label:'미용실' },
  { key:'nail',   label:'네일' },
  { key:'ps',     label:'성형외과' },
  { key:'real',   label:'부동산' },
  { key:'rental', label:'렌탈샵' },
  { key:'fit',    label:'피트니스' },
  { key:'cafe',   label:'카페' },
  { key:'etc',    label:'기타' },
]
const mapCat = Object.fromEntries(partnerCategoryOptions.map(c=>[c.key, c.label]))
const normalizeCat = (raw='')=>{
  const v = String(raw).trim().toLowerCase()
  if (!v) return 'etc'
  const hit = a=>a.some(w=>v.includes(w))
  if (['salon','hair'].includes(v) || hit(['미용','헤어','살롱'])) return 'salon'
  if (['nail'].includes(v) || hit(['네일'])) return 'nail'
  if (['ps','plastic'].includes(v) || hit(['성형'])) return 'ps'
  if (['real','estate'].includes(v) || hit(['부동산'])) return 'real'
  if (['rental'].includes(v) || hit(['렌탈'])) return 'rental'
  if (['fit','fitness','pt','gym'].includes(v) || hit(['피트니스','헬스','pt'])) return 'fit'
  if (['cafe','coffee'].includes(v) || hit(['카페','커피'])) return 'cafe'
  return 'etc'
}

/* ===== 폼 ===== */
const f = ref({
  name:'', region:'', category:'salon',
  adStart: 0, adEnd: 0,
  desc:'', address:'', hours:'', holiday:'', benefits:'',
  tags:[], thumb:''
})
const edit = ref({ name:false, region:false, category:false, desc:false })

/* ✅ 대표 서비스: 하나씩 추가 방식 */
const tagDraft = ref('')
function addTag(){
  const t = tagDraft.value.trim()
  if (!t) return
  // 중복 방지
  const s = new Set(f.value.tags || [])
  if (!s.has(t)){
    f.value.tags = [...s, t]
  }
  tagDraft.value = ''
}
function removeTag(i){ f.value.tags.splice(i, 1) }

/* 새 신청용 기본 id */
const requestId = ref(doc(collection(fbDb, 'partnerRequests')).id)

/* ===== 썸네일 보관함(로컬) ===== */
const editingId = computed(()=> String(route.query.id || route.params?.id || '').trim())
const gallery = ref/** @type {string[]} */([])
const photoIndex = ref(0)
const galleryKey = computed(() =>
  editingId.value
    ? `partnerReq:gallery:${editingId.value}`
    : 'partnerReq:gallery:new'
)
function readGallery(){
  try{
    const raw = localStorage.getItem(galleryKey.value) || '[]'
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter(x => typeof x === 'string' && x) : []
  }catch{ return [] }
}
function writeGallery(list){
  try{ localStorage.setItem(galleryKey.value, JSON.stringify(list || [])) }catch{}
}
function addToGallery(url){
  if (!url) return
  const s = new Set(gallery.value)
  if (!s.has(url)){
    gallery.value.push(url)
    writeGallery(gallery.value)
  }
}
function applyCurrentThumb(){
  if (!gallery.value.length) return
  const i = Math.min(Math.max(photoIndex.value, 0), gallery.value.length - 1)
  f.value.thumb = gallery.value[i]
}
function nextThumb(){
  const n = gallery.value.length; if (!n) return
  photoIndex.value = (photoIndex.value + 1) % n
  applyCurrentThumb()
}
function prevThumb(){
  const n = gallery.value.length; if (!n) return
  photoIndex.value = (photoIndex.value - 1 + n) % n
  applyCurrentThumb()
}

/* ===== 프리필 ===== */
function toMs(v){
  if (!v) return 0
  if (typeof v === 'number') return v
  if (v instanceof Date) return v.getTime()
  if (typeof v.seconds === 'number') return v.seconds*1000 + Math.floor((v.nanoseconds||0)/1e6)
  return 0
}
async function prefillIfEditing(){
  if (!editingId.value) return
  try{
    // partners/{id}
    let snap = await getDoc(doc(fbDb, 'partners', editingId.value))
    if (snap.exists()){
      const d = snap.data() || {}
      f.value = {
        name: d.name || '',
        region: d.region || '',
        category: normalizeCat(d.category || d.categoryRaw || ''),
        adStart: toMs(d.adStart) || 0,
        adEnd: toMs(d.adEnd) || 0,
        desc: d.desc || '',
        address: d.address || '',
        hours: d.hours || '',
        holiday: d.holiday || '',
        benefits: d.benefits || '',
        tags: Array.isArray(d.tags) ? d.tags : String(d.tags||'').split(',').map(s=>s.trim()).filter(Boolean),
        thumb: d.thumb || d.image || ''
      }
      return
    }
    // partnerRequests/{id}
    snap = await getDoc(doc(fbDb, 'partnerRequests', editingId.value))
    if (snap.exists()){
      const d = snap.data() || {}
      f.value = {
        name: d.name || '',
        region: d.region || '',
        category: normalizeCat(d.category || ''),
        adStart: toMs(d.adStart) || 0,
        adEnd: toMs(d.adEnd) || 0,
        desc: d.desc || '',
        address: d.address || '',
        hours: d.hours || '',
        holiday: d.holiday || '',
        benefits: d.benefits || '',
        tags: Array.isArray(d.tags) ? d.tags : String(d.tags||'').split(',').map(s=>s.trim()).filter(Boolean),
        thumb: d.thumb || ''
      }
    }
  }catch(e){
    console.warn('prefill 실패:', e?.message || e)
  }
}
function initGallery(){
  gallery.value = readGallery()
  if (f.value.thumb && !gallery.value.includes(f.value.thumb)) gallery.value.unshift(f.value.thumb)
  photoIndex.value = Math.max(0, gallery.value.findIndex(u=>u===f.value.thumb))
  applyCurrentThumb()
}
onMounted(async ()=>{
  await prefillIfEditing()
  initGallery()
  // ✅ 기존 데이터가 없을 때만 기본 1개월 선택
  if ((!f.value.adStart || !f.value.adEnd) && !duration.value) {
    pickDuration('m1')
  }
})
watch(() => route.fullPath, async ()=>{
  await prefillIfEditing()
  initGallery()
  // ✅ 라우트 재진입 시에도 동일한 기본 처리
  if ((!f.value.adStart || !f.value.adEnd) && !duration.value) {
    pickDuration('m1')
  }
})


/* ===== 광고기간(+개월) ===== */
const durOptions = [
  { key:'m1', label:'+1개월', months:1 },
  { key:'m3', label:'+3개월', months:3 },
  { key:'m6', label:'+6개월', months:6 },
]
const duration = ref('')

function startOfTodayMs(){
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0,0,0,0).getTime()
}
function endOfDayMs(ms){
  const d = new Date(ms)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23,59,59,999).getTime()
}
function addMonthsBoundary(startMs, months){
  const s = new Date(startMs)
  const atNext = new Date(s.getFullYear(), s.getMonth()+months, s.getDate(), 0,0,0,0).getTime()
  const endMs = atNext - 1
  return endOfDayMs(endMs)
}
function pickDuration(key){
  const opt = durOptions.find(o=>o.key===key); if(!opt) return
  duration.value = key
  const s = startOfTodayMs()
  f.value.adStart = s
  f.value.adEnd   = addMonthsBoundary(s, opt.months)
}
const toDateStr = (ms)=>{
  if (!ms) return ''
  const d = new Date(ms)
  const y = d.getFullYear()
  const m = String(d.getMonth()+1).padStart(2,'0')
  const day = String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${day}`
}
const adDays = computed(()=>{
  const s = Number(f.value.adStart||0), e = Number(f.value.adEnd||0)
  if (!s || !e || e < s) return 0
  return Math.floor((e - s) / 86400000) + 1
})
const adCost = computed(()=> adDays.value * EXTEND_UNIT)
const startStr = computed(()=> toDateStr(f.value.adStart))
const endStr   = computed(()=> toDateStr(f.value.adEnd))
const won = (n)=> (Number(n||0)).toLocaleString('ko-KR') + '원'

/* ===== 업로드 ===== */
async function fileToJpegBlob(file, maxW = 1280, quality = 0.85){
  const img = new Image()
  const dataUrl = await new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result)
    fr.onerror = reject
    fr.readAsDataURL(file)
  })
  await new Promise((res)=>{ img.onload = res; img.src = dataUrl })
  const scale = Math.min(1, maxW / img.width)
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, w, h)
  const blob = await new Promise((resolve)=> canvas.toBlob(resolve, 'image/jpeg', quality))
  return blob || file
}
async function onPick(e){
  const files = Array.from(e.target.files || [])
  if (!files.length) return
  const user = fbAuth.currentUser
  if (!user){ alert('로그인이 필요합니다.'); return }
  try{
    for (const file of files){
      const blob = await fileToJpegBlob(file, 1280, .85)
      const ts = Date.now() + '_' + Math.random().toString(36).slice(2,6)
      const path = `partnerRequests/${user.uid}/${requestId.value}/thumb-${ts}.jpg`
      const refOnStorage = sRef(fbStorage, path)
      await uploadBytes(refOnStorage, blob, { contentType:'image/jpeg', cacheControl:'public, max-age=60' })
      const url = await getDownloadURL(refOnStorage)
      const versioned = `${url}${url.includes('?')?'&':'?'}v=${ts}`

      addToGallery(versioned)
      photoIndex.value = gallery.value.length - 1
      applyCurrentThumb()
    }
    writeGallery(gallery.value)
  }catch(e2){
    console.warn('이미지 업로드 실패:', e2)
    alert('이미지 업로드 권한 오류 또는 네트워크 문제입니다.')
  }finally{
    try{ e.target.value = '' }catch{}
  }
}

/* ===== 임시 저장 ===== */
async function saveDraft(){
  const user = fbAuth.currentUser
  if (!user){
    alert('로그인이 필요합니다.')
    return
  }

  // 🔹 관리자회원(제휴관 담당자)인지 확인
  if (!isPartnerOwner.value) {
    alert('관리자회원(제휴관 담당자)만 제휴업체 등록신청을 임시저장할 수 있습니다.')
    router.push({
      name: 'auth',
      query: {
        next: route.fullPath || '/partners',
        mode: 'login',
        who: 'admin',   // 관리자 탭으로 유도
      },
    })
    return
  }

  if (!f.value.name.trim()){
    alert('업체명을 입력해 주세요.')
    return
  }
  const categoryNorm = normalizeCat(f.value.category)
  try{
    await setDoc(
      doc(fbDb, 'partnerRequests', currentId),
      {
        id: currentId,
        ownerId: user.uid,
        ownerEmail: user.email || '',
        status: 'draft',
        name: f.value.name.trim(),
        region: f.value.region.trim(),
        category: categoryNorm,
        adStart: Number(f.value.adStart||0),
        adEnd: Number(f.value.adEnd||0),
        desc: f.value.desc || '',
        address: f.value.address || '',
        hours: f.value.hours || '',
        holiday: f.value.holiday || '',
        benefits: f.value.benefits || '',
        tags: f.value.tags || [],
        thumb: f.value.thumb || '',
        savedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge:true }
    )
    alert('임시 저장되었습니다.')
  }catch(e){
    console.warn('임시저장 실패:', e?.message || e)
    alert('임시 저장에 실패했습니다.')
  }
}

/* ===== 최종 제출 ===== */
async function submit(){
  const user = fbAuth.currentUser
  if (!user){
    alert('로그인이 필요합니다.')
    return
  }

  // 🔹 관리자회원(제휴관 담당자)인지 확인
  if (!isPartnerOwner.value) {
    alert('관리자회원(제휴관 담당자)만 제휴업체 등록신청을 할 수 있습니다.')
    router.push({
      name: 'auth',
      query: {
        next: route.fullPath || '/partners',
        mode: 'login',
        who: 'admin',   // 관리자 탭으로 유도
      },
    })
    return
  }

  if (!f.value.name.trim()){
    alert('업체명을 입력해 주세요.')
    return
  }
  if (submitting.value) return
  submitting.value = true

  const currentId = editingId.value || requestId.value
  const categoryNorm = normalizeCat(f.value.category)
  const days = adDays.value || 30

  const payloadReq = {
    id: currentId,
    ownerId: user.uid,
    ownerEmail: user.email || '',
    status: 'pending',          // ✅ 승인대기 상태로 저장
    reason: '',
    approved: false,            // ✅ 승인 여부 기본 false
    decidedAt: null,

    name: f.value.name.trim(),
    region: f.value.region.trim(),
    category: categoryNorm,

    adStart: Number(f.value.adStart || 0),
    adEnd: Number(f.value.adEnd || 0),

    desc: f.value.desc || '',
    address: f.value.address || '',
    hours: f.value.hours || '',
    holiday: f.value.holiday || '',
    benefits: f.value.benefits || '',
    tags: f.value.tags || [],
    thumb: f.value.thumb || '',

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  try{
    // 1) 등록신청 저장
    await setDoc(doc(fbDb, 'partnerRequests', currentId), payloadReq, { merge:true })

    // 2) 연장신청 생성
    const extRef = doc(collection(fbDb, 'extendRequests'))
    await setDoc(extRef, {
      status: 'pending',
      targetType: 'partner',
      partnerRequestId: currentId,
      days: Number(days),
      unit: EXTEND_UNIT,
      ownerId: user.uid,
      createdAt: serverTimestamp(),
      storeName: payloadReq.name,
      storeRegion: payloadReq.region,
      storeCategory: categoryNorm,
      storeThumb: payloadReq.thumb
    })

    alert('제휴업체 등록신청이 접수되었습니다. (연장신청도 함께 생성됨)')
    router.push({ name:'myStores' })
  }catch(e){
    console.warn('신청 저장 실패:', e?.message || e)
    alert('신청 저장에 실패했습니다. (권한/네트워크 문제)')
  } finally {
    submitting.value = false
  }
}

/* ===== 스타일 헬퍼 ===== */
function bgImage(url){
  const u = String(url||'').replace(/"/g,'\\"')
  return u ? ({ backgroundImage:`url("${u}")` }) : ({})
}
</script>

<style scoped>
/* ===== 공통 레이아웃/버튼 ===== */
.page{ padding:10px 12px 84px; }               /* 유격 축소 */
.topbar{ display:flex; justify-content:space-between; align-items:center; margin-bottom:8px }
.ttl{ margin:0; font-size:19px; font-weight:900 }
.rt{ display:flex; gap:6px }
.btn{ border:1px solid var(--line); background:var(--surface); color:var(--fg); padding:7px 10px; border-radius:10px; font-weight:800; }
.btn.primary{ background:var(--accent); border-color:var(--accent); color:#fff }
.btn.danger{ color:#ff6a6a; border-color:#ff6a6a; background:color-mix(in oklab, #ff6a6a, white 92%) }

/* ===== 헤더(사진/정보 2열) ===== */
.hero{
  display:grid; gap:10px;
  grid-template-columns: 100px 1fr;
  align-items:start;
  border:1px solid var(--line); border-radius:14px; background:var(--surface); box-shadow:0 6px 18px var(--shadow);
  padding:10px; overflow:hidden;
}
.hero-thumb{
  position:relative; width:100px; height:100px; border-radius:12px; overflow:hidden;
  background:#f0f2f5; background-size:cover; background-position:center;
}
/* 파일 input: 시각적 숨김(sronly) */
.file-input-sronly{
  position:absolute !important;
  width:1px; height:1px; padding:0; margin:-1px;
  overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0;
}
/* 카드 안쪽 작은 버튼 */
.thumb-btn{
  position:absolute; left:6px; bottom:6px; z-index:3;
  height:22px; padding:0 8px;
  border-radius:999px; border:1px solid var(--line);
  background:rgba(255,255,255,.92); color:#111; font-weight:900; font-size:11px;
  display:inline-flex; align-items:center; justify-content:center;
  max-width:calc(100% - 12px); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
/* 좌/우 네비 + 카운트 */
.thumb-nav{
  position:absolute; top:50%; transform:translateY(-50%); z-index:3;
  width:22px; height:22px; border:none; border-radius:50%;
  background:rgba(0,0,0,.45); color:#fff; font-size:16px; line-height:1;
  display:grid; place-items:center;
}
.thumb-nav.left{ left:4px }
.thumb-nav.right{ right:4px }
.thumb-count{
  position:absolute; right:6px; bottom:6px; z-index:3;
  background:rgba(0,0,0,.45); color:#fff; font-weight:800; font-size:10px;
  padding:2px 6px; border-radius:8px;
}

.hero-body{ display:flex; flex-direction:column; gap:6px; min-width:0 }

/* ===== 제목 한 줄(상호명 · 지역 · 유형) ===== */
.title-row{
  display:grid; grid-template-columns: 1fr auto auto; align-items:center; gap:6px;
}
.title{ font-weight:900; font-size:18px; color:var(--fg); min-width:0 }
.one-line{ display:block; max-width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-align:left }
.mini-slot{ display:flex; align-items:center; }

/* 소개 인라인 */
.intro-row{ margin-top:2px }
.inline-area{
  width:100%; text-align:left;
  border:1px solid var(--line); background:var(--surface);
  border-radius:999px; padding:7px 10px; font-weight:800; color:var(--fg);
}
.inline-textarea{
  width:100%; border:1px solid var(--line); background:var(--surface); color:var(--fg);
  border-radius:10px; padding:7px 9px; font-weight:800;
}

/* 대표 서비스 인라인 */
.tags-inline{ display:flex; flex-direction:column; gap:6px; }
.tags{ display:flex; flex-wrap:wrap; gap:4px }
.tag.sm{
  display:inline-flex; align-items:center; gap:6px;
  padding:2px 8px; border-radius:999px; border:1px solid var(--line);
  background:var(--surface); color:var(--fg); font-weight:800; font-size:12px;
}
.tag-x{ border:none; background:transparent; color:var(--muted); font-weight:900; cursor:pointer; padding:0; line-height:1; }
.tag-input-row{ display:flex; gap:6px; align-items:center; }
.chip.add{
  height:30px; padding:0 12px; border-radius:999px; border:1px solid var(--line);
  background:var(--surface); font-weight:900; font-size:12px;
}

/* 인라인 요소 */
.inline-btn-txt{ appearance:none; border:0; background:transparent; color:var(--fg); font-weight:900; }
.inline-btn-txt.big{ font-size:18px }
.inline-input{ width:100%; border:1px solid var(--line); background:var(--surface); color:var(--fg); border-radius:8px; padding:6px 8px; font-weight:800 }
.inline-input.big{ font-size:18px }
.inline-input.xs{ padding:4px 8px; font-size:12.5px; height:30px }
.inline-select{ border:1px solid var(--line); background:var(--surface); color:var(--fg); border-radius:8px; padding:6px 8px; font-weight:800 }
.inline-select.xs{ padding:4px 8px; font-size:12.5px; height:30px }
.inline-chip{ border:1px solid var(--line); border-radius:999px; background:var(--surface); padding:4px 10px; font-weight:900; color:var(--fg) }
.inline-chip.xs{ padding:3px 10px; font-size:12px }

/* ===== 본문 카드 ===== */
.dv-card{ border:1px solid var(--line); border-radius:14px; overflow:hidden; background:var(--surface); box-shadow:0 6px 18px var(--shadow); margin-top:8px; }
.dv-sec{ padding:8px 10px 10px }
.dv-sec + .dv-sec{ border-top:1px solid var(--line) }
.dv-sec h4{ margin:0 0 6px; font-size:13.5px; color:var(--fg) }

/* 영업 정보 테이블 */
.info-table{ border:1px solid var(--line); border-radius:10px; overflow:hidden }
.tr{ display:flex; border-top:1px solid var(--line); }
.tr:first-child{ border-top:0 }
.tk{ flex:0 0 88px; background:color-mix(in oklab, var(--accent), white 92%); font-weight:800; padding:7px 9px; color:#111; font-size:13px }
.tv{ flex:1; padding:7px 9px }

/* ===== 가로 패널 ===== */
.panels-row{
  display:grid; gap:8px; margin-top:8px;
  grid-template-columns: repeat(1, minmax(0,1fr));
}
@media(min-width: 960px){
  .panels-row{ grid-template-columns: repeat(2, minmax(240px, 1fr)); }
}
.panel{ border:1px solid var(--line); background:var(--surface); color:var(--fg); border-radius:14px; box-shadow:0 6px 18px var(--shadow); }

/* ▼ 밑줄 제거 */
.panel-h{
  display:flex; align-items:center; justify-content:space-between; gap:6px;
  padding:8px 10px; border-bottom:0;
}

.panel-h strong{ font-size:13.5px }
/* 결제금액 한 줄 고정 */
.panel-h .two-line strong{ white-space: nowrap; }
.panel-h .two-line{ display:flex; flex-direction:column; line-height:1.1 }
.panel-h .two-line small{ font-size:11px; color:var(--muted); font-weight:800; margin-top:2px }
.panel > *:not(.panel-h){ padding:8px 10px }

/* 광고기간: 칩 가로 고정 */
.dur-row{ display:flex; align-items:center; justify-content:space-between; gap:6px; flex-wrap:nowrap; }
.panel.compact .dur-row{ padding:6px 8px; }
.dur-chips{ display:flex; gap:6px; flex-wrap:wrap }
.dur-chips.compact{ display:flex; gap:6px; flex-wrap:wrap }
.chip{
  display:inline-flex; align-items:center; justify-content:center;
  height:26px; padding:0 10px; border-radius:999px; border:1px solid var(--line);
  background:var(--surface); font-weight:900; color:var(--fg); font-size:12px;
  white-space:nowrap;
}
.chip.on{ outline:2px solid var(--accent) }
.period-info{ display:flex; gap:6px; flex-wrap:wrap; font-size:12.5px }
.period-info.slim{ gap:6px; white-space:nowrap; }

/* 결제내역/안내 */
.bill{
  border:1px dashed var(--line);
  border-radius:10px;
  padding:10px;
  background: color-mix(in oklab, var(--accent), white 96%);
}
.bill.compact{ font-size:12.5px }
.calc{ font-weight:800 }
.notice{ font-size:12px; margin-top:4px }
.account{
  margin-top:6px; padding:8px; border:1px solid var(--line); border-radius:8px;
  background:var(--surface); display:flex; flex-direction:column; gap:2px;
}
.acc-bank{ font-weight:900; }
.acc-owner{ color:var(--muted); }

/* 하단 버튼 */
.actions{ display:flex; gap:6px; margin-top:12px; justify-content:flex-end }

/* 라이트 모드 보정 */
@media (prefers-color-scheme: light){
  .title, .inline-btn-txt, .inline-input{ color:#111; }
  button, .btn, .btn.primary, .btn.danger, .chip, .inline-chip, .thumb-btn { color:#111 !important; }
}
</style>
