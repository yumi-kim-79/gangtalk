<!-- src/pages/StoreEditPage.vue -->
<template>
  <!-- 전역 CSS 변수 주입: 유료 옵션 색상 -->
  <main class="page" :style="cssVars">
    <!-- ================= Topbar ================= -->
    <header class="topbar">
      <h1 class="ttl">{{ isNew ? '업체 등록' : '업체 편집' }}</h1>
      <div class="rt">
        <button class="btn" @click="goBack">목록으로 나가기</button>
        <button class="btn primary" @click="save">저장</button>
      </div>
    </header>

    <!-- ================= 헤더(왼: 사진 / 오: 정보) ================= -->
    <section class="hero">
      <!-- 왼쪽: 썸네일 (보관함 + 좌/우 네비) -->
      <div class="hero-thumb" :style="bgImage(f.thumb)">
        <input
          id="filePick"
          class="file-input"
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

      <!-- 오른쪽: 제목/지역/유형 + 소개 -->
      <div class="hero-body">
        <!-- ===== 제목줄: [상호명] [지역] [유형] ===== -->
        <div class="title-row">
          <div class="title">
            <template v-if="edit.name">
              <input
                v-model.trim="f.name"
                class="inline-input big one-line"
                placeholder="상호명을 입력해요"
                @blur="edit.name=false"
                @keyup.enter="edit.name=false"
              />
            </template>
            <template v-else>
              <button class="inline-btn-txt big one-line" type="button" @click="edit.name=true" title="상호명">
                {{ f.name || '상호명을 입력해요' }}
              </button>
            </template>
          </div>

          <!-- 가운데: 지역 -->
          <div class="region-quick">
            <template v-if="edit.region">
              <select v-model="f.region" class="inline-select sm" @blur="edit.region=false">
                <option value="강남">강남</option>
                <option value="비강남">비강남</option>
                <option value="경기">경기</option>
                <option value="인천">인천</option>
              </select>
            </template>
            <template v-else>
              <button class="inline-chip sm" type="button" @click="edit.region=true">{{ f.region }}</button>
            </template>
          </div>

          <!-- 우측: 유형(업종) 퀵버튼 -->
          <div class="type-quick">
            <template v-if="edit.category">
              <select v-model="f.category" class="inline-select sm" @blur="edit.category=false">
                <option v-for="c in categories" :key="c.key" :value="c.key">{{ c.label }}</option>
              </select>
            </template>
            <template v-else>
              <button class="mini ghost" type="button" @click="edit.category=true">유형</button>
            </template>
          </div>
        </div>

        <!-- 소개: 16자, 한 줄 고정 -->
        <div class="intro-row">
          <template v-if="edit.desc">
            <div class="intro-editor">
              <input
                v-model.trim="f.desc"
                :maxlength="DESC_MAX"
                class="intro-input one-line"
                :placeholder="`가게 소개 (최대 ${DESC_MAX}자, 한 줄)`"
                @input="enforceIntroLimit"
                @keyup.enter="edit.desc=false"
                @blur="edit.desc=false"
              />
              <div class="intro-count">{{ descLen }} / {{ DESC_MAX }}</div>
            </div>
          </template>
          <template v-else>
            <button
              class="inline-area one-line"
              type="button"
              title="소개"
              :style="introLightFix"
              @click="edit.desc=true"
            >
              {{ f.desc || `가게 소개 (최대 ${DESC_MAX}자, 한 줄)` }}
            </button>
          </template>
        </div>

        <!-- ===== 메타줄 ===== -->
        <div class="meta-row tight">
          <div class="meta-l">
            <span class="mgr-text">담당자</span>

            <!-- 인라인 담당자 추가 UI -->
            <template v-if="managerInline.open">
              <input v-model.trim="managerInline.name"  class="inline-input mgr-field" placeholder="이름" />
              <input v-model.trim="managerInline.phone" class="inline-input mgr-field" placeholder="연락처" inputmode="tel" />
              <button class="mini add" type="button" @click="commitInlineManager">추가</button>
              <button class="mini" type="button" @click="cancelInlineManager">취소</button>
            </template>
            <template v-else>
              <button class="mini add mgr-inline" type="button" @click="openInlineManager">+ 추가</button>
            </template>

            <span class="star-chip">★ {{ ratingText }} ({{ wishCount }})</span>
          </div>
        </div>
      </div>

      <!-- ===== 이미지 아래: 좌(이벤트) | 우(급여) ===== -->
      <div class="hero-split">
        <div class="event-half">
          <label class="ev-label">이벤트</label>
          <input
            v-model.trim="f.eventMain"
            class="ev-input"
            :maxlength="EVENT_MAX"
            :placeholder="`예)콜비지원 (최대 ${EVENT_MAX}자)`"
          />
          <small class="ev-count">{{ eventLen }} / {{ EVENT_MAX }}</small>
        </div>

        <div class="wage-half">
          <div class="wage-inline big">
            <select v-model="wageType" class="inline-select sm">
              <option v-for="wt in wageTypeOptions" :key="wt.key" :value="wt.key">{{ wt.label }}</option>
            </select>

            <template v-if="edit.wage">
              <input
                class="inline-input num xs wage"
                inputmode="numeric"
                pattern="[0-9]*"
                :value="wageInput"
                @input="onWageInput($event.target.value)"
                @keyup.enter="edit.wage=false"
                @blur="edit.wage=false"
              />
            </template>
            <template v-else>
              <button class="inline-btn-txt wage sm one-line" type="button" @click="edit.wage = true" title="급여">
                {{ wageTypeLabel }} {{ won(f.wage || 0) }}
              </button>
            </template>
          </div>
        </div>
      </div>
    </section>

    <!-- (삭제) hero-stats: 맞출방/필요인원 -->

    <!-- ================= 본문(영업/담당자 리스트) ================= -->
    <section class="dv-card">
      <section class="dv-sec">
        <h4>영업 정보</h4>
        <div class="info-table">
          <div class="tr">
            <div class="tk">운영시간</div>
            <div class="tv">
              <template v-if="edit.hours">
                <input v-model.trim="f.hours" class="inline-input" placeholder="예: 18:00 ~ 05:00" @blur="edit.hours=false" @keyup.enter="edit.hours=false" />
              </template>
              <template v-else>
                <button class="inline-btn-txt" type="button" @click="edit.hours=true">{{ f.hours || '미등록' }}</button>
              </template>
            </div>
          </div>
          <div class="tr">
            <div class="tk">휴무</div>
            <div class="tv">
              <template v-if="edit.closed">
                <input v-model.trim="f.closed" class="inline-input" placeholder="예: 일요일" @blur="edit.closed=false" @keyup.enter="edit.closed=false" />
              </template>
              <template v-else>
                <button class="inline-btn-txt" type="button" @click="edit.closed=true">{{ f.closed || '미등록' }}</button>
              </template>
            </div>
          </div>
          <div class="tr">
            <div class="tk">주소</div>
            <div class="tv">
              <template v-if="edit.address">
                <input v-model.trim="f.address" class="inline-input" placeholder="사업장 주소" @blur="edit.address=false" @keyup.enter="edit.address=false" />
              </template>
              <template v-else>
                <button class="inline-btn-txt" type="button" @click="edit.address=true">{{ f.address || '미등록' }}</button>
              </template>
            </div>
          </div>
        </div>
      </section>

      <section class="dv-sec" v-if="(f.managers||[]).length">
        <h4 class="h4">담당자 리스트</h4>
        <div class="mgr-list">
          <div class="mgr-li" v-for="(m,i) in f.managers" :key="i" @click="startEditManager(i)">
            <template v-if="editingMgr.index === i">
              <input v-model.trim="editingMgr.name"  class="inline-input mgr-edit" placeholder="이름" @click.stop />
              <input v-model.trim="editingMgr.phone" class="inline-input mgr-edit" placeholder="연락처" inputmode="tel" @click.stop />
              <div class="mgr-edit-actions">
                <button class="mini add" @click.stop="saveEditManager">저장</button>
                <button class="mini" @click.stop="cancelEditManager">취소</button>
                <button class="mini danger" @click.stop="removeManager(i)">삭제</button>
              </div>
            </template>
            <template v-else>
              <div class="mgr-li-name">{{ m.name || '이름 미입력' }}</div>
              <div class="mgr-li-phone">{{ m.phone || '-' }}</div>
            </template>
          </div>
        </div>
      </section>
    </section>

    <!-- ===== [관리자 화면] 광고 패널 ===== -->
    <section class="panels-row" v-if="isAdmin">
      <!-- ⛔ 숨김: 광고 등급/노출 위치 (나중에 다시 사용할 수 있도록 코드만 유지) -->
      <section class="panel compact" v-if="false">
        <div class="panel-h"><strong>광고 등급/노출 위치</strong></div>
        <div class="tier-list">
          <button v-for="t in tiers" :key="t.key" type="button" class="tier-item" :class="{ on: adTier===t.key }" @click="adTier=t.key"><span>{{ t.label }}</span></button>
        </div>
      </section>

      <!-- ⛔ 숨김: 유료 옵션 (나중에 다시 사용할 수 있도록 코드만 유지) -->
      <section class="panel compact" v-if="false">
        <div class="panel-h"><strong>유료 옵션</strong></div>
        <div class="opt-list">
          <div class="opt-row">
            <div class="opt-title">
              <span class="ok">아이콘 세트</span>
              <span class="price-tag">{{ priceLabel(selectedIconPack.price) }}</span>
            </div>
            <select v-model="opt.iconPack">
              <option v-for="o in iconPacks" :key="o.key" :value="o.key">{{ o.label }}</option>
            </select>
          </div>

          <div class="opt-row">
            <div class="opt-title">
              <span class="ok">포인트 색상</span>
              <span class="price-tag">+{{ OPTION_PRICES.accent.unit.toLocaleString() }}원/일</span>
            </div>
            <div class="color-field">
              <input class="color" type="color" v-model="opt.accent" />
              <span class="color-preview" :style="{ background: opt.accent }"></span>
            </div>
          </div>

          <div class="opt-row">
            <div class="opt-title">
              <span class="ok">폰트 색상</span>
              <span class="price-tag">+{{ OPTION_PRICES.fontColor.unit.toLocaleString() }}원/일</span>
            </div>
            <div class="color-field">
              <input class="color" type="color" v-model="opt.fontColor" />
              <span class="color-preview" :style="{ background: opt.fontColor }"></span>
            </div>
          </div>

          <div class="opt-row">
            <div class="opt-title">
              <span class="ok">배너 액자</span>
              <span class="price-tag">{{ priceLabel(selectedFrame.price) }}</span>
            </div>
            <select v-model="opt.frame">
              <option v-for="o in frames" :key="o.key" :value="o.key">{{ o.label }}</option>
            </select>
          </div>
        </div>
      </section>

      <!-- ✅ 유지: 광고기간 -->
      <section class="panel compact">
        <div class="panel-h"><strong>광고기간</strong></div>
        <div class="dur-row">
          <div class="dur-chips compact">
            <button v-for="o in durOptions" :key="o.key" type="button" class="chip" :class="{ on: duration===o.key }" @click="pickDuration(o.key)">{{ o.label }}</button>
          </div>
          <div class="period-info slim">
            <span class="pi">시작: <b>{{ startStr }}</b></span>
            <span class="pi">종료: <b>{{ endStr }}</b></span>
            <span class="pi">총 <b>{{ adDays }}</b>일</span>
          </div>
        </div>
      </section>

      <!-- ✅ 유지: 결제금액(행 일부 숨김) -->
      <section class="panel compact">
        <div class="panel-h"><strong>결제금액</strong></div>
        <div class="bill compact">
          <div class="li">
            <span>기본 광고비</span>
            <span class="li-right"><em class="calc">{{ adDays }}일 × {{ won(BASE_PRICE_PER_DAY) }} =</em><b class="amt">{{ won(baseCost) }}</b></span>
          </div>

          <!-- ⛔ 숨김: 등급 추가요금 -->
          <div class="li" v-if="false">
            <span>등급 추가요금 <small>({{ tierLabel }})</small></span>
            <span class="li-right"><em class="calc">{{ adDays }}일 × {{ won(planUnit) }} =</em><b class="amt">{{ won(planCost) }}</b></span>
          </div>

          <!-- ⛔ 숨김: 포인트/폰트 등 유료 옵션 전체 -->
          <template v-if="false">
            <div class="li" v-for="row in optionBreakdown" :key="row.key">
              <span>{{ row.label }}</span>
              <span class="li-right">
                <template v-if="row.type==='perDay'">
                  <em class="calc">{{ adDays }}일 × {{ won(row.unit) }} =</em>
                  <b class="amt">{{ won(row.cost) }}</b>
                </template>
                <template v-else>
                  <em class="calc">고정</em>
                  <b class="amt">{{ won(row.unit) }}</b>
                </template>
              </span>
            </div>
          </template>

          <div class="li total">
            <span>총 결제금액</span>
            <span class="li-right"><b class="amt">{{ won(totalCost) }}</b></span>
          </div>
        </div>
      </section>
    </section>

    <section class="actions">
      <button class="btn primary" @click="save">저장</button>
      <button v-if="!isNew" class="btn danger" @click="remove">삭제</button>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { auth as fbAuth, db as fbDb, storage as fbStorage } from '@/firebase'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, deleteDoc, onSnapshot } from 'firebase/firestore'
import { ref as sRef, uploadBytes, getDownloadURL } from 'firebase/storage'

/* --------- 분류 --------- */
const categories = [
  { key:'hopper',  label:'하퍼' },
  { key:'point5',  label:'쩜오' },
  { key:'ten',     label:'텐카페' },
  { key:'tenpro',  label:'텐프로' },
  { key:'onep',    label:'1%' },
  { key:'nrb',     label:'노래방' },
  { key:'kara',    label:'가라오케' },
  { key:'bar',     label:'바' },
  { key:'lounge',  label:'라운지' },
]
const mapCat = Object.fromEntries(categories.map(c=>[c.key, c.label]))

/* --------- 광고 단가/옵션 --------- */
const BASE_PRICE_PER_DAY = 5000
const TIER_PRICES = { silver:0, gold:3000, vip:7000, platinum:12000 }
const tiers = [
  { key:'platinum', label:'PLATINUM (카드형 광고)' },
  { key:'vip',      label:'VIP (상세배너)' },
  { key:'gold',     label:'GOLD (배너 광고)' },
  { key:'silver',   label:'SILVER (줄 광고)' },
]
const OPTION_PRICES = {
  accent:    { type:'perDay', unit: 500 },
  fontColor: { type:'perDay', unit: 300 },
}
const iconPacks = [
  { key:'basic',   label:'기본',    price: { type:'fixed',  unit: 0 } },
  { key:'emoji',   label:'이모지',  price: { type:'perDay', unit: 300 } },
  { key:'modern',  label:'모던',    price: { type:'perDay', unit: 500 } },
]
const frames = [
  { key:'none',    label:'없음',     price: { type:'fixed',  unit: 0 } },
  { key:'glass',   label:'글래스',   price: { type:'perDay', unit: 700 } },
  { key:'sticker', label:'스티커',   price: { type:'perDay', unit: 900 } },
]

/* --------- 라우터/로드 --------- */
const router = useRouter()
const route  = useRoute()
const idParam = computed(() => String(route.params.id||''))   // 'new' or docId
const isNew   = computed(() => idParam.value === 'new')

const draftId = ref('')
const f = ref({
  name:'', region:'강남', category:'lounge',
  status:'여유',
  totalRooms:0, match:0,
  maxPersons:0, persons:0,
  adStart: 0, adEnd: 0,
  desc:'', wage:0,
  eventMain:'',                // 메인 이벤트 문구
  hours:'', closed:'', address:'',
  thumb:'',
  managers:[],
  manager:'', phone:'', talkId:'',
  invites:[], events:[],
  ownerId:null
})
const edit = ref({
  name:false, region:false, category:false,
  desc:false, wage:false, hours:false, closed:false, address:false,
  rooms:false, persons:false
})

/* ===== 소개 글자수 제한(16자, 한 줄) ===== */
const DESC_MAX = 16
const descLen  = computed(() => (f.value.desc||'').length)
function enforceIntroLimit(){
  if ((f.value.desc||'').length > DESC_MAX) {
    f.value.desc = (f.value.desc||'').slice(0, DESC_MAX)
  }
}

/* ===== 이벤트 글자수 제한(12자) ===== */
const EVENT_MAX = 12
const eventLen  = computed(() => (f.value.eventMain||'').length)

/* ===== 급여 종류 ===== */
const wageTypeOptions = [
  { key:'hourly',  label:'시급' },
  { key:'daily',   label:'일급' },
  { key:'monthly', label:'월급' },
  { key:'etc',     label:'기타' },
]
const wageType = ref('hourly')
const wageTypeLabel = computed(() => wageTypeOptions.find(w => w.key === wageType.value)?.label || '시급')

/* ===== 평점/찜(표시 전용) ===== */
const ratingText = computed(() => (Number(f.value.rating ?? 0)).toFixed(1))
const wishCount = computed(() => Number(f.value.wish ?? f.value.wishCount ?? 0))

/* ===== 썸네일 보관함(로컬) ===== */
const gallery = ref/** @type {string[]} */([])
const photoIndex = ref(0)
const galleryKey = computed(() => draftId.value ? `store:gallery:${draftId.value}` : 'store:gallery:new')
function readGallery(){ try{ return JSON.parse(localStorage.getItem(galleryKey.value)||'[]').filter(x=>typeof x==='string'&&x) }catch{ return [] } }
function writeGallery(list){ try{ localStorage.setItem(galleryKey.value, JSON.stringify(list||[])) }catch{} }
function addToGallery(url){ if(!url) return; const has=new Set(gallery.value); if(!has.has(url)){ gallery.value.push(url); writeGallery(gallery.value) } }
function applyCurrentThumb(){ if(!gallery.value.length) return; const i=Math.min(Math.max(photoIndex.value,0),gallery.value.length-1); f.value.thumb=gallery.value[i] }
function nextThumb(){ const n=gallery.value.length; if(!n) return; photoIndex.value=(photoIndex.value+1)%n; applyCurrentThumb() }
function prevThumb(){ const n=gallery.value.length; if(!n) return; photoIndex.value=(photoIndex.value-1+n)%n; applyCurrentThumb() }

onMounted(() => {
  const handler = ()=> openCreate()
  window.addEventListener('open-biz-create', handler)
  // 저장
  window.__bizCreateHandler__ = handler
})
onUnmounted(() => {
  if (window.__bizCreateHandler__) {
    window.removeEventListener('open-biz-create', window.__bizCreateHandler__)
    delete window.__bizCreateHandler__
  }
})

/* ===== 문서 로드 ===== */
onMounted(async ()=>{
  if (isNew.value) {
    draftId.value = doc(collection(fbDb, 'stores')).id
    gallery.value = readGallery()
    if (f.value.thumb && !gallery.value.includes(f.value.thumb)) gallery.value.unshift(f.value.thumb)
    photoIndex.value = Math.max(0, gallery.value.findIndex(u => u === f.value.thumb))
    applyCurrentThumb()
    pickDuration('m1')
  } else {
    draftId.value = idParam.value
    const snap = await getDoc(doc(fbDb,'stores', draftId.value))
    if (snap.exists()){
      const data = snap.data() || {}
      f.value = {
        name: data.name||'',
        region: data.region||'강남',
        category: data.category||'lounge',
        status: data.status || '여유',
        totalRooms: Number(data.totalRooms||0),
        match: Number(data.match||0),
        maxPersons: Number(data.maxPersons||0),
        persons: Number(data.persons||0),
        adStart: toMs(data.adStart) || 0,
        adEnd: toMs(data.adEnd) || 0,
        desc: data.desc || '',
        wage: Number(data.wage||0),
        eventMain: (Array.isArray(data.events) && data.events[0]) ? String(data.events[0]) : (data.eventMain || ''),
        hours: data.hours || '',
        closed: data.closed || '',
        address: data.address || '',
        thumb: data.thumb || '',
        managers: Array.isArray(data.managers) ? data.managers.slice(0) : [],
        manager: data.manager||'', phone: data.phone||'', talkId: data.talkId||'',
        invites: data.invites||[], events: Array.isArray(data.events) ? data.events.slice(0) : [],
        ownerId: data.ownerId||null,
        rating: Number(data.rating ?? 0),
        wish: Number(data.wish ?? data.wishCount ?? 0),
      }
      wageType.value = String(data.wageType || 'hourly')
      duration.value = guessDuration(f.value.adStart, f.value.adEnd)
    }
    gallery.value = readGallery()
    if (f.value.thumb && !gallery.value.includes(f.value.thumb)) gallery.value.unshift(f.value.thumb)
    photoIndex.value = Math.max(0, gallery.value.findIndex(u => u === f.value.thumb))
    applyCurrentThumb()
  }
})

/* --------- 숫자 입력 --------- */
const toDigits = v => (String(v ?? '').replace(/\D/g, '') || '0')
const wageInput = computed(() => String(f.value.wage ?? 0))
const onWageInput       = v => { f.value.wage       = Number(toDigits(v)) }

/* --------- 혼잡도(자동) --------- */
const ratioRooms   = computed(() => {
  const t = Number(f.value.totalRooms||0), a = Number(f.value.match||0)
  return t > 0 ? a / t : null
})
const ratioPersons = computed(() => {
  const m = Number(f.value.maxPersons||0), p = Number(f.value.persons||0)
  return m > 0 ? p / m : null
})
const availability = computed(() => {
  const arr = [ratioRooms.value, ratioPersons.value].filter(v=>typeof v==='number')
  if (!arr.length) return 1
  return Math.max(0, Math.min(1, Math.min(...arr)))
})
const autoStatus = computed(() => {
  const r = availability.value
  if (r >= 0.60) return '여유'
  if (r >= 0.30) return '보통'
  return '혼잡'
})
watch(autoStatus, v => { f.value.status = v })

/* --------- 광고기간(+개월) --------- */
const durOptions = [
  { key:'m1', label:'+1개월', months:1 },
  { key:'m3', label:'+3개월', months:3 },
  { key:'m6', label:'+6개월', months:6 },
]
const duration = ref('m1')

function toMs(v){
  if (!v) return 0
  if (typeof v === 'number') return v
  if (v instanceof Date) return v.getTime()
  if (typeof v.seconds === 'number') return v.seconds*1000 + Math.floor((v.nanoseconds||0)/1e6)
  return 0
}
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
  const optDur = durOptions.find(o=>o.key===key); if(!optDur) return
  duration.value = key
  const s = startOfTodayMs()
  f.value.adStart = s
  f.value.adEnd   = addMonthsBoundary(s, optDur.months)
}
function ymd(ms){
  if (!ms) return ''
  const d = new Date(ms)
  const y = d.getFullYear()
  const m = String(d.getMonth()+1).padStart(2,'0')
  const day = String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${day}`
}
const startStr = computed(()=> ymd(f.value.adStart))
const endStr   = computed(()=> ymd(f.value.adEnd))
function guessDuration(s, e){
  if(!s || !e) return 'm1'
  for(const o of durOptions){
    const expectedEnd = addMonthsBoundary(s, o.months)
    if (Math.abs(expectedEnd - e) < 1000) return o.key
  }
  return 'm1'
}
const adDays = computed(()=>{
  const s = Number(f.value.adStart||0), e = Number(f.value.adEnd||0)
  if (!s || !e || e < s) return 0
  return Math.floor((e - s) / 86400000) + 1
})
const won = n => (Number(n||0)).toLocaleString('ko-KR') + '원'

/* --------- 라이트/다크 모드 감지 + 소개 색 강제 --------- */
const isLightMode = ref(window.matchMedia?.('(prefers-color-scheme: light)').matches ?? true)
onMounted(() => {
  const mq = window.matchMedia?.('(prefers-color-scheme: light)')
  if (mq) {
    const handler = (e) => (isLightMode.value = e.matches)
    mq.addEventListener ? mq.addEventListener('change', handler) : mq.addListener(handler)
  }
})
const introLightFix = computed(() =>
  isLightMode.value
    ? { color:'#111', WebkitTextFillColor:'#111', caretColor:'#111' }
    : {}
)

/* --------- 광고 티어/옵션 & 비용 --------- */
const adTier = ref('silver')
const tierLabel = computed(()=> tiers.find(t=>t.key===adTier.value)?.label || '')
const planUnit = computed(()=> TIER_PRICES[adTier.value] || 0)

const opt = ref({
  iconPack:'basic',
  accent:'#ff2d83',
  fontColor:'#111111',
  frame:'none'
})
const cssVars = computed(()=> ({
  '--accent-preview': opt.value.accent,
  '--font-preview': opt.value.fontColor,
}))
const selectedIconPack = computed(()=> iconPacks.find(i=>i.key===opt.value.iconPack) || iconPacks[0])
const selectedFrame    = computed(()=> frames.find(fm=>fm.key===opt.value.frame) || frames[0])

const baseCost = computed(()=> adDays.value * BASE_PRICE_PER_DAY)
const planCost = computed(()=> adDays.value * planUnit.value)
function priceLabel(p){ return p.type==='perDay' ? `+${(p.unit).toLocaleString()}원/일` : (p.unit>0 ? `+${(p.unit).toLocaleString()}원` : '무료') }

const optionBreakdown = computed(()=>{
  const rows = []
  const selIcon = selectedIconPack.value
  if (selIcon.price.unit>0){
    rows.push({
      key:'icon', label:`아이콘 세트(${selIcon.label})`,
      type: selIcon.price.type,
      unit: selIcon.price.unit,
      cost: selIcon.price.type==='perDay' ? adDays.value * selIcon.price.unit : selIcon.price.unit
    })
  }
  if (OPTION_PRICES.accent.unit>0){
    rows.push({ key:'accent', label:'포인트 색상', type:'perDay', unit:OPTION_PRICES.accent.unit, cost: adDays.value * OPTION_PRICES.accent.unit })
  }
  if (OPTION_PRICES.fontColor.unit>0){
    rows.push({ key:'font', label:'폰트 색상', type:'perDay', unit:OPTION_PRICES.fontColor.unit, cost: adDays.value * OPTION_PRICES.fontColor.unit })
  }
  const selFrame = selectedFrame.value
  if (selFrame.price.unit>0){
    rows.push({
      key:'frame', label:`배너 액자(${selFrame.label})`,
      type: selFrame.price.type,
      unit: selFrame.price.unit,
      cost: selFrame.price.type==='perDay' ? adDays.value * selFrame.price.unit : selFrame.price.unit
    })
  }
  return rows
})
const optionCost = computed(()=> optionBreakdown.value.reduce((a,b)=> a + b.cost, 0))
const totalCost  = computed(()=> baseCost.value + planCost.value + optionCost.value)

/* --------- 상단 인라인 담당자 추가 --------- */
const managerInline = ref({ open:false, name:'', phone:'' })
function openInlineManager(){ managerInline.value.open = true }
function cancelInlineManager(){ managerInline.value = { open:false, name:'', phone:'' } }
function commitInlineManager(){
  const name = (managerInline.value.name||'').trim()
  const phone = (managerInline.value.phone||'').trim()
  if (!name){ alert('담당자 이름을 입력해 주세요.'); return }
  f.value.managers.push({ name, phone })
  cancelInlineManager()
}

/* --------- 리스트 인라인 편집/삭제 --------- */
const editingMgr = ref({ index:-1, name:'', phone:'' })
function startEditManager(i){ const m = f.value.managers[i]; editingMgr.value = { index:i, name:m.name||'', phone:m.phone||'' } }
function saveEditManager(){
  const { index, name, phone } = editingMgr.value
  if (index < 0) return
  f.value.managers[index] = { name:(name||'').trim(), phone:(phone||'').trim() }
  editingMgr.value = { index:-1, name:'', phone:'' }
}
function cancelEditManager(){ editingMgr.value = { index:-1, name:'', phone:'' } }
function removeManager(i){
  f.value.managers.splice(i,1)
  if (editingMgr.value.index === i) cancelEditManager()
}

/* --------- 파일 업로드 --------- */
async function fileToJpegBlob(file, maxW = 1280, quality = 0.85){
  const img = new Image()
  const dataUrl = await new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result))
    fr.onerror = reject
    fr.readAsDataURL(file)
  })
  await new Promise(res => { img.onload = res; img.src = dataUrl })
  const scale = Math.min(1, maxW / img.width)
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, w, h)
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
  return blob || file
}

async function onPick(e){
  const files = Array.from(e.target.files || [])
  if (!files.length || !draftId.value) return
  try{
    for (const file of files){
      const blob = await fileToJpegBlob(file, 1280, 0.85)
      const ts = Date.now() + '_' + Math.random().toString(36).slice(2,6)
      const thePath = `stores/${draftId.value}/thumb-${ts}.jpg`
      const refOnStorage = sRef(fbStorage, thePath)
      await uploadBytes(refOnStorage, blob, { contentType: 'image/jpeg', cacheControl: 'public, max-age=60' })
      const url = await getDownloadURL(refOnStorage)
      const versioned = `${url}${url.includes('?') ? '&' : '?'}v=${ts}`

      addToGallery(versioned)
      photoIndex.value = gallery.value.length - 1
      applyCurrentThumb()

      if (!isNew.value) {
        await updateDoc(doc(fbDb,'stores', draftId.value), { thumb: versioned, thumbVer: ts, updatedAt: serverTimestamp() })
      }
    }
    writeGallery(gallery.value)
  }catch(err){
    console.warn('이미지 업로드 실패:', err)
    alert('이미지 업로드에 실패했습니다.')
  }finally{
    try { e.target.value = '' } catch {}
  }
}

/* --------- 저장/삭제 --------- */
function goBack(){ router.push({ name:'myStores' }) }

async function save(){
  const uid = fbAuth.currentUser?.uid || null
  if (!uid){
    alert('로그인이 필요합니다.')
    router.replace({ path:'/auth', query:{ next: route.fullPath, mode:'login', who:'biz' } })
    return
  }
  if (!f.value.name.trim()){
    alert('상호명을 입력해 주세요.')
    return
  }
  if ((f.value.desc||'').length > DESC_MAX){
    alert(`소개는 최대 ${DESC_MAX}자까지 입력할 수 있어요.`)
    return
  }
  if ((f.value.eventMain||'').length > EVENT_MAX){
    alert(`이벤트 문구는 최대 ${EVENT_MAX}자까지 입력할 수 있어요.`)
    return
  }

  const now = serverTimestamp()
  const id = draftId.value

  const payload = {
    id,
    name: f.value.name,
    region: f.value.region,
    category: f.value.category,
    status: autoStatus.value,
    totalRooms: Number(f.value.totalRooms||0),
    match: Number(f.value.match||0),
    maxPersons: Number(f.value.maxPersons||0),
    persons: Number(f.value.persons||0),
    adStart: Number(f.value.adStart||0),
    adEnd: Number(f.value.adEnd||0),
    desc: f.value.desc || '',
    wage: Number(f.value.wage||0),
    wageType: wageType.value,
    eventMain: f.value.eventMain || '',
    events: (f.value.eventMain ? [f.value.eventMain] : (Array.isArray(f.value.events) ? f.value.events : [])),
    hours: f.value.hours || '',
    closed: f.value.closed || '',
    address: f.value.address || '',
    thumb: f.value.thumb || '',
    thumbVer: Date.now(),

    /* ↓ 광고/결제 미리보기 필드(UI 숨김) */
    adPlan: { tier: adTier.value, unitPerDay: planUnit.value },
    adOptions: { iconPack: opt.value.iconPack, accent: opt.value.accent, fontColor: opt.value.fontColor, frame: opt.value.frame },
    pricePreview: {
      adDays: adDays.value,
      basePerDay: BASE_PRICE_PER_DAY,
      baseCost: baseCost.value,
      planPerDay: planUnit.value,
      planCost: planCost.value,
      optionCost: optionCost.value,
      total: totalCost.value
    },

    managers: (f.value.managers || []).map(m=>({ name:(m.name||'').trim(), phone:(m.phone||'').trim() })),
    manager: f.value.manager || '',
    phone: f.value.phone || '',
    talkId: f.value.talkId || '',
    invites: f.value.invites || [],

    updatedAt: now,
  }

  if (isNew.value){
    await setDoc(doc(fbDb,'stores', id), { ...payload, ownerId: uid, createdAt: now }, { merge: true })
  }else{
    const extra = {}
    if (!f.value.ownerId) extra.ownerId = uid
    await updateDoc(doc(fbDb,'stores', id), { ...payload, ...extra })
  }
  try{ localStorage.setItem('stores:changed', String(Date.now())) }catch{}
  alert('저장되었습니다.')
  router.push({ name:'myStores' })
}

async function remove(){
  const first = confirm('정말 삭제할까요? 삭제 후에는 복구할 수 없습니다.')
  if (!first) return
  const second = confirm('정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')
  if (!second) return
  await deleteDoc(doc(fbDb,'stores', draftId.value))
  try{
    const arr = JSON.parse(localStorage.getItem('my:storeIds')||'[]').filter(x=>x!==draftId.value)
    localStorage.setItem('my:storeIds', JSON.stringify(arr))
  }catch{}
  alert('삭제되었습니다.')
  router.push({ name:'myStores' })
}

/* --------- 관리자 판별: admins/{uid} 문서 존재여부 --------- */
const isAdminDoc = ref(false)
let unsubAdmin = null
function watchAdminDoc(){
  const u = fbAuth.currentUser?.uid
  if (!u){ isAdminDoc.value = false; return }
  try{
    const ref = doc(fbDb, 'admins', String(u))
    unsubAdmin = onSnapshot(ref, (snap)=>{ isAdminDoc.value = snap.exists() }, ()=>{ isAdminDoc.value = false })
  }catch{ isAdminDoc.value = false }
}
const isAdmin = computed(()=> isAdminDoc.value)

onMounted(() => {
  watchAdminDoc()
})
onUnmounted(() => {
  try{ unsubAdmin?.() }catch{}
})

/* --------- 헬퍼 --------- */
function bgImage(url){
  const u = String(url||'').replace(/"/g,'\\"')
  return u ? ({ backgroundImage:`url("${u}")` }) : ({})
}
</script>

<style scoped>
/* ===== 공통 레이아웃/버튼 ===== */
.page{ padding:12px 16px 96px; }
.topbar{ display:flex; justify-content:space-between; align-items:center; margin-bottom:12px }
.ttl{ margin:0; font-size:20px }
.rt{ display:flex; gap:8px }
.btn{ border:1px solid var(--line); background:var(--surface); color:var(--fg); padding:8px 12px; border-radius:10px; font-weight:700; }
.btn.primary{ background:var(--accent); border-color:var(--accent); color:#fff }
.btn.danger{ color:#ff6a6a; border-color:#ff6a6a; background:color-mix(in oklab, #ff6a6a, white 92%) }

/* ===== 헤더(사진/정보 2열) ===== */
.hero{
  display:grid; gap:8px;
  grid-template-columns: 110px 1fr;
  grid-auto-rows: auto;
  align-items:start;
  border:1px solid var(--line); border-radius:16px; background:var(--surface); box-shadow:0 8px 22px var(--shadow);
  padding:10px;
  overflow:hidden;
}
.hero-thumb{
  grid-column: 1 / 2;
  grid-row: 1 / 2;
  position:relative; width:110px; height:110px; border-radius:12px; overflow:hidden;
  background:#f0f2f5; background-size:cover; background-position:center;
}
.file-input{ position:absolute; inset:0; width:100%; height:100%; opacity:0; appearance:none; outline:0; border:0; cursor:pointer; }
.thumb-btn{
  position:absolute; left:6px; bottom:6px; z-index:2;
  height:24px; padding:0 8px;
  border-radius:999px; border:1px solid var(--line);
  background:rgba(255,255,255,.92); color:#111; font-weight:900; font-size:11px;
  display:inline-flex; align-items:center; justify-content:center;
  max-width:calc(100% - 12px); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.thumb-nav{ position:absolute; top:50%; transform:translateY(-50%); width:24px; height:24px; border:none; border-radius:50%; background:rgba(0,0,0,.45); color:#fff; font-size:16px; line-height:1; display:grid; place-items:center; }
.thumb-nav.left{ left:4px } .thumb-nav.right{ right:4px }
.thumb-count{ position:absolute; right:6px; bottom:6px; background:rgba(0,0,0,.45); color:#fff; font-weight:800; font-size:10px; padding:2px 6px; border-radius:8px; }

.hero-body{ grid-column: 2 / 3; grid-row: 1 / 2; display:flex; flex-direction:column; gap:6px; min-width:0 }

/* ===== 제목줄 ===== */
.title-row{ display:grid; align-items:center; gap:6px; grid-template-columns: 1fr auto auto; }
.title{ font-weight:900; font-size:18px; color:var(--font-preview, var(--fg)); min-width:0 }
.one-line{ display:block; max-width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-align:left }

/* 배경색 없앤 지역 칩 */
.inline-chip{ border:1px solid var(--line); border-radius:999px; background:transparent !important; color:#111 !important; font-weight:900; padding:4px 12px; }
.inline-chip.sm{ padding:3px 10px; font-size:12px }

.mini.ghost{ height:28px; padding:0 10px; border-radius:999px; border:1px solid var(--line); background:var(--surface); font-weight:900; font-size:12px; }

/* 소개 */
.intro-row{ margin-top:4px }
.inline-area{
  width:100%;
  text-align:left;
  white-space:pre-wrap;
  background:transparent !important;
  color:#111 !important;
  border:1px solid var(--line);
  border-radius:10px;
  padding:7px 10px;
  font-weight:800;
}
/* 소개 편집 + 카운터 */
.intro-editor{ position:relative }
.intro-input{
  width:100%;
  border:1px solid var(--line);
  border-radius:10px;
  padding:7px 10px;
  background:var(--surface);
  font-weight:800;
}
.intro-count{ position:absolute; right:10px; bottom:-18px; font-size:11px; color:#888; }

/* ===== 메타줄 ===== */
.meta-row{ margin-top:4px; display:flex; align-items:center; gap:6px; flex-wrap:wrap }
.meta-row.tight{ justify-content:flex-start }
.meta-l{ display:flex; align-items:center; gap:6px; flex-wrap:wrap }
.star-chip{
  padding:2px 8px; border-radius:999px;
  border:1px dashed var(--line); font-weight:800; font-size:11.5px; color:var(--fg);
  background:color-mix(in oklab, var(--surface), white 30%);
}
.mgr-text{ font-weight:900; font-size:12.5px; color:#555; margin-right:2px }
.mgr-inline{ margin-right:2px }
.mgr-field{ width:120px }

/* ===== 이미지 아래: 반반 레이아웃 ===== */
.hero-split{ grid-column: 1 / 3; grid-row: 2 / 3; display:grid; grid-template-columns: 1fr 1fr; gap:10px; align-items:center; }
.event-half{ display:grid; grid-template-columns: auto 1fr auto; align-items:center; gap:8px; min-width:0; }
.ev-label{ font-size:12px; font-weight:900; color:#666 }
.ev-input{ width:100%; border:1px solid var(--line); border-radius:10px; background:var(--surface); color:var(--fg); padding:6px 8px; font-weight:800; }
.ev-count{ font-size:11px; color:#8a8a8a }
.wage-half{ display:flex; align-items:center; justify-content:flex-start }
.wage-inline{ display:flex; align-items:center; gap:6px }
.wage-inline.big .inline-btn-txt.wage.sm{ font-size:14px; padding:5px 8px }
.inline-select.sm{ height:28px; padding:0 8px; font-size:12px }
.inline-btn-txt.wage.sm{ font-size:13px; padding:3px 6px; border-radius:8px; border:1px dashed var(--line); }
.inline-input.num.xs{ width:112px; text-align:right; }

/* 인라인 편집 공통 */
.edit-row{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:4px }
.edit-item{ display:flex; align-items:center; gap:6px }
.kk{ color:var(--muted); font-size:12px; min-width:56px; }
.inline-input.half{ width:80px }
.inline-input.wide{ width:80px }
.inline-input.num{ text-align:right; font-variant-numeric: tabular-nums; }

/* ===== 본문 카드 ===== */
.dv-card{ border:1px solid var(--line); border-radius:16px; overflow:hidden; background:var(--surface); box-shadow:0 8px 22px var(--shadow); margin-top:10px; }
.dv-sec{ padding:10px 12px 12px }
.dv-sec + .dv-sec{ border-top:1px solid var(--line) }
.dv-sec h4, .h4{ margin:0 0 6px; font-size:14px; color:var(--fg) }

.info-table{ border:1px solid var(--line); border-radius:12px; overflow:hidden }
.tr{ display:flex; border-top:1px solid var(--line); }
.tr:first-child{ border-top:0 }
.tk{ flex:0 0 96px; background:color-mix(in oklab, var(--accent), white 92%); font-weight:800; padding:8px 10px; color:#111 }
.tv{ flex:1; padding:8px 10px }

/* 담당자 리스트(저장 후 표시) */
.mgr-list{ border:1px solid var(--line); border-radius:12px; overflow:hidden }
.mgr-li{ display:grid; grid-template-columns: 1fr auto; gap:8px; padding:8px 10px; border-top:1px solid var(--line); cursor:pointer }
.mgr-li:first-child{ border-top:0 }
.mgr-li-name{ font-weight:900 }
.mgr-li-phone{ color:#666 }
.mgr-edit{ width:100% }
.mgr-edit-actions{ display:flex; gap:6px; justify-content:flex-end; grid-column: 1 / -1 }

/* 인라인 입력 공통 */
.inline-btn-txt{ appearance:none; border:0; background:transparent; color:var(--font-preview, var(--fg)); font-weight:900; }
.inline-btn-txt.big{ font-size:18px }
.inline-input{ border:1px solid var(--line); background:var(--surface); color:var(--fg); border-radius:8px; padding:6px 8px; font-weight:800 }
.inline-input.big{ font-size:18px }
.inline-input.wage, .inline-btn-txt.wage{ color:var(--accent-preview, var(--accent)); }
.inline-select{ border:1px solid var(--line); background:var(--surface); color:var(--fg); border-radius:8px; padding:6px 8px; font-weight:800 }
.mini{ height:34px; padding:0 10px; border:1px solid var(--line); border-radius:8px; background:var(--surface); font-weight:800; color:var(--fg); }
.mini.add{ border-color:var(--accent); color:var(--accent) }
.mini.danger{ color:#ff6a6a; border-color:#ff6a6a }

/* ===== 가로 패널(4개) ===== */
.panels-row{ display:grid; gap:12px; margin-top:12px; grid-template-columns: repeat(1, minmax(0,1fr)); }
@media(min-width: 960px){ .panels-row{ grid-template-columns: repeat(4, minmax(240px, 1fr)); } }
.panel{ border:1px solid var(--line); background:var(--surface); color:var(--fg); border-radius:16px; box-shadow:0 8px 22px var(--shadow); }
.panel-h{ display:flex; align-items:center; gap:8px; padding:10px 12px; border-bottom:0; }
.panel-h strong{ flex:1 1 auto; font-size:14px; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.panel-h small{ flex:none; white-space:nowrap; opacity:.8; }
.panel > *:not(.panel-h){ padding:10px 12px }

/* 광고 등급/노출 위치 칩 */
.tier-list{ display:flex; gap:6px; flex-wrap:wrap }
.tier-item{
  height:28px; padding:0 12px; border-radius:999px; border:1px solid var(--line);
  background:transparent !important; color:#111 !important; font-weight:900; font-size:12px;
}
.tier-item.on{ outline:2px solid var(--accent); }

/* 유료 옵션(리스트형) */
.opt-list{ border:1px solid var(--line); border-radius:12px; overflow:hidden; background:color-mix(in oklab, var(--surface), white 2%); }
.opt-row{ padding:6px 10px; }
.opt-row + .opt-row{ border-top:1px solid var(--line); }
.opt-title{ display:flex; align-items:center; justify-content:space-between; margin-bottom:3px; }
.ok{ font-weight:800; }
.price-tag{ font-size:12px; font-weight:800; opacity:.85 }
.opt-row select{ width:100%; border:1px solid var(--line); background:var(--surface); color:var(--fg); border-radius:8px; padding:4px 8px; font-weight:800; }
.color-field{ display:flex; align-items:center; gap:6px; }
.color-field .color{ width:30px; height:24px; padding:0; border:1px solid var(--line); border-radius:6px; background:var(--surface); }
.color-preview{ flex:1; height:6px; border-radius:999px; border:1px solid var(--line); }

/* 광고기간 */
.dur-row{ display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:nowrap }
.dur-chips{ display:flex; gap:6px; flex-wrap:wrap }
.chip{
  display:inline-flex; align-items:center; justify-content:center;
  height:26px; padding:0 10px; border-radius:999px; border:1px solid var(--line);
  background:var(--surface); font-weight:900; color:var(--fg); font-size:12px; white-space:nowrap;
}
.chip.on{ outline:2px solid var(--accent) }
.period-info{ display:flex; gap:6px; flex-wrap:wrap; font-size:12.5px }
.period-info.slim{ gap:6px; white-space:nowrap; }

/* 결제금액 내역 */
.bill{ border:1px dashed var(--line); border-radius:12px; background:color-mix(in oklab, var(--accent), white 96%); }
.bill.compact{ font-size:12.5px; padding:10px }
.bill .li{ display:flex; align-items:flex-start; justify-content:space-between; gap:8px; padding:6px 0; border-top:1px dashed var(--line) }
.bill .li:first-child{ border-top:0 }
.bill .li .li-right{ display:flex; flex-direction:column; align-items:flex-end; gap:2px; }
.bill .li .calc{ font-style:normal; opacity:.72 }
.bill .li .amt{ font-weight:900 }
.bill .li.total{ border-top:2px solid var(--line); font-weight:900 }
/* 다크/블랙 모드 패치 */
:global([data-theme="dark"] .bill),
:global([data-theme="black"] .bill){
  background: color-mix(in oklab, var(--surface), var(--accent) 2%);
  border: 1px dashed var(--line);
  color: var(--fg);
  box-shadow: none;
}
:global([data-theme="dark"] .bill .li),
:global([data-theme="black"] .bill .li){
  border-top: 1px dashed var(--line);
}
:global([data-theme="dark"] .bill .li.total),
:global([data-theme="black"] .bill .li.total){
  border-top: 2px solid var(--line);
}
:global([data-theme="dark"] .bill .calc),
:global([data-theme="black"] .bill .calc){
  opacity: .72;
}

/* 전역 미리보기 색 변수(안전값) */
:root{
  --accent-preview: var(--accent, #ff2d83);
  --font-preview: var(--fg, #111);
}

/* 다크 테마 읽기 개선 */
[data-theme="dark"],
[data-theme="black"] {
  .inline-area,
  .inline-chip,
  .inline-btn-txt,
  .mini,
  .mini.ghost,
  .pill,
  .chip,
  .tag,
  .rank-chip,
  .quick-chip,
  .filter-chip,
  .category-chip,
  .region-btn,
  .search-btn,
  .tier-item,
  .metric,
  .act,
  .tool,
  .btn,
  .btn.primary,
  .btn.danger {
    color: var(--fg) !important;
    background: var(--surface) !important;
    border-color: var(--line) !important;
    box-shadow: none !important;
  }

  .inline-area *,
  .inline-btn-txt *,
  .chip *,
  .tag * {
    color: var(--fg) !important;
  }

  .badge { border-color: var(--fg) !important; }

  .chip.active,
  .seg button.active,
  .tier-item.on {
    background: var(--accent) !important;
    color: #fff !important;
    outline: 2px solid var(--accent) !important;
  }

  input,
  textarea,
  .inline-input,
  .intro-input {
    color: var(--fg) !important;
    -webkit-text-fill-color: var(--fg) !important;
    caret-color: var(--fg) !important;
    background: var(--surface) !important;
    border: 1px solid var(--line) !important;
  }
  input::placeholder,
  textarea::placeholder,
  .intro-input::placeholder {
    color: var(--fg) !important;
    opacity: .45 !important;
  }

  .inline-area.one-line,
  .intro-row .inline-area {
    color: var(--fg) !important;
    -webkit-text-fill-color: var(--fg) !important;
  }

  .muted,
  .ev-label { color: var(--muted) !important; }

  svg, svg * {
    stroke: currentColor !important;
    fill: currentColor !important;
    color: var(--fg) !important;
  }
}

/* 라이트 모드 인풋 컬러 */
:where(:root,[data-theme="light"],[data-theme="white"]) input,
:where(:root,[data-theme="light"],[data-theme="white"]) textarea,
:where(:root,[data-theme="light"],[data-theme="white"]) .inline-input,
:where(:root,[data-theme="light"],[data-theme="white"]) .intro-input {
  color:#111 !important;
  -webkit-text-fill-color:#111 !important;
  caret-color:#111 !important;
}
:where(:root,[data-theme="light"],[data-theme="white"]) input::placeholder,
:where(:root,[data-theme="light"],[data-theme="white"]) textarea::placeholder,
:where(:root,[data-theme="light"],[data-theme="white"]) .intro-input::placeholder{
  color:#111 !important; opacity:.45 !important;
}
</style>
