<!-- AdminTools.vue : 배너 #1(제휴관) / #2(가게찾기) + 기사한줄 -->
<template>
  <section class="section">
    <h3 class="sub">운영자 도구</h3>

    <!-- ■ 기사한줄 관리 -->
    <div class="admin-box">
      <header class="admin-head">
        <strong>기사한줄 관리</strong>
        <div class="row" style="gap:6px;">
          <button class="btn tiny" @click="addNewsTop">새 글(최상단)</button>
          <button class="btn tiny" @click="reloadConfig">불러오기</button>
          <button class="btn primary tiny" :disabled="newsSaving" @click="saveNewsline">
            {{ newsSaving ? '저장 중…' : '저장' }}
          </button>
        </div>
      </header>

      <div class="news-list">
        <div class="news-item" v-for="(n, idx) in news.list" :key="n.id || idx">
          <div class="row" style="gap:8px; align-items:center;">
            <input class="news-input" v-model.trim="n.text" @input="onNewsChange" placeholder="기사 한 줄을 입력하세요" />
            <label class="chk">
              <input type="checkbox" v-model="n.badge" @change="onNewsChange" true-value="NEW" false-value="">
              NEW
            </label>
          </div>
          <div class="row" style="gap:6px; margin-top:6px;">
            <small class="muted">{{ timeAgo(n.createdAt) }} 작성</small>
            <span class="spacer"></span>
            <!-- ✅ 내부 유틸 호출로 교체 -->
            <button class="btn tiny" :disabled="idx===0" @click="moveItem(news.list, idx, -1)">위로</button>
            <button class="btn tiny" :disabled="idx===news.list.length-1" @click="moveItem(news.list, idx, +1)">아래로</button>
            <button class="btn tiny" @click="removeNews(idx)">삭제</button>
          </div>
        </div>
        <p v-if="!news.list.length" class="muted">아직 작성된 기사가 없습니다.</p>
      </div>
    </div>

    <!-- ■ 광고배너 관리: 제휴관(배너 #1) -->
    <div class="admin-box">
      <header class="admin-head">
        <strong>광고배너 관리 · 제휴관 페이지(배너 #1)</strong>
        <div class="row" style="gap:6px;">
          <button class="btn tiny" @click="onAddAd('P')">추가</button>
          <button class="btn tiny" @click="reloadConfig">불러오기</button>
          <button class="btn primary tiny" :disabled="isSavingP" @click="onSaveAds('P')">
            {{ isSavingP ? '저장 중…' : '저장' }}
          </button>
        </div>
      </header>

      <div class="card-grid">
        <div class="edit-card" v-for="(ad, idx) in adsPBox.list" :key="ad.id || `P_${idx}`">
          <div class="row" style="gap:6px; align-items:center;">
            <strong>광고 배너 #{{ idx + 1 }}</strong>
            <span class="spacer"></span>
            <button class="btn tiny ghost" type="button" @click.stop="onToggleAd('P', idx, ad)">
              {{ adOpen('P', ad) ? '닫기' : '편집' }}
            </button>
          </div>

          <div
            class="ad-preview clickable"
            :style="adPreviewStyle(ad)"
            :ref="setPreviewRef('P', idx)"
            @click="onToggleAd('P', idx, ad)"
          >
            <div v-if="ad.title" class="ad-tt">{{ ad.title }}</div>
            <div v-if="ad.desc" class="ad-desc">{{ ad.desc }}</div>

            <template v-if="ad.tags && ad.tags.length">
              <span
                v-for="(t, tIdx) in ad.tags"
                :key="t + '_' + tIdx"
                class="chip pill tag-abs"
                :style="tagPosStyle(ad, tIdx)"
                @mousedown.stop="onTagPointerDown($event, 'P', idx, tIdx)"
                @touchstart.stop="onTagPointerDown($event, 'P', idx, tIdx)"
              >{{ t }}</span>
            </template>

            <div
              class="ad-overlay"
              :class="ad._navPos || 'at-bl'"
              :style="{
                '--ad-nav-offset-x': ad._navX ?? '8px',
                '--ad-nav-offset-y': ad._navY ?? '40px',
                '--ad-nav-gap':     ad._navGap ?? '200px',
                '--ad-dots-bottom': ad._dotsBottom ?? '8px'
              }"
            >
              <div v-if="(ad.images?.length || 0) > 1" class="ad-navbar">
                <button class="ad-nav-btn" type="button" @click.stop="nextAdImageLocal('P', idx, -1)">‹</button>
                <button class="ad-nav-btn" type="button" @click.stop="nextAdImageLocal('P', idx, +1)">›</button>
              </div>
              <div v-if="(ad.images?.length || 0) > 1" class="dots">
                <button v-for="(u, j) in ad.images" :key="j" :class="['dot', { active: j === ad._imgIndex }]" type="button" @click.stop="setAdImageIndexLocal(ad, j)" />
              </div>
            </div>
          </div>

          <div class="image-actions">
            <input class="visually-hidden" type="file" accept="image/*" :id="`adp-file-${idx}`" multiple @change.stop="(e)=>onPickAdImagesLocal(e, 'P', idx)" />
            <label class="btn tiny" :for="`adp-file-${idx}`">이미지 변경</label>
            <small class="muted" v-if="ad.images?.length">· {{ ad.images.length }}장</small>
          </div>

          <div class="form tiny" v-show="adOpen('P', ad)">
            <div class="form-row"><label class="field grow"></label><label class="field grow"></label></div>
            <div class="form-row">
              <label class="field grow">
                <span>태그(쉼표 구분)</span>
                <input v-model="ad._tags" @input="() => onAdTagsChanged(ad)" placeholder="10% 할인, 첫 방문 케어" />
                <small class="muted">배너 위 태그 박스를 드래그해서 위치를 정하세요.</small>
              </label>
            </div>
          </div>

          <div class="row" v-show="adOpen('P', ad)" style="gap:6px;">
            <button class="btn tiny" :disabled="idx===0" @click="moveItem(adsPBox.list, idx, -1)">위로</button>
            <button class="btn tiny" :disabled="idx===adsPBox.list.length-1" @click="moveItem(adsPBox.list, idx, +1)">아래로</button>
            <button class="btn tiny" @click="dup(adsPBox.list, idx)">복제</button>
            <button class="btn tiny danger" @click="onRemoveAd('P', idx)">삭제</button>
            <span class="spacer"></span>
            <button class="btn tiny" type="button" @click="setAdOpen('P', ad, false)">닫기</button>
            <button class="btn tiny primary" type="button" :disabled="ad._saving" @click="onSaveAdOne('P', idx)">
              {{ ad._saving ? '저장 중…' : '이 항목만 저장' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ■ 광고배너 관리: 가게찾기(배너 #2) -->
    <div class="admin-box">
      <header class="admin-head">
        <strong>광고배너 관리 · 가게찾기 페이지(배너 #2)</strong>
        <div class="row" style="gap:6px;">
          <button class="btn tiny" @click="onAddAd('F')">추가</button>
          <button class="btn tiny" @click="reloadConfig">불러오기</button>
          <button class="btn primary tiny" :disabled="isSavingF" @click="onSaveAds('F')">
            {{ isSavingF ? '저장 중…' : '저장' }}
          </button>
        </div>
      </header>

      <div class="card-grid">
        <div class="edit-card" v-for="(ad, idx) in adsFBox.list" :key="ad.id || `F_${idx}`">
          <div class="row" style="gap:6px; align-items:center;">
            <strong>광고 배너 #{{ idx + 1 }}</strong>
            <span class="spacer"></span>
            <button class="btn tiny ghost" type="button" @click.stop="onToggleAd('F', idx, ad)">
              {{ adOpen('F', ad) ? '닫기' : '편집' }}
            </button>
          </div>

          <div
            class="ad-preview clickable"
            :style="adPreviewStyle(ad)"
            :ref="setPreviewRef('F', idx)"
            @click="onToggleAd('F', idx, ad)"
          >
            <div v-if="ad.title" class="ad-tt">{{ ad.title }}</div>
            <div v-if="ad.desc" class="ad-desc">{{ ad.desc }}</div>

            <template v-if="ad.tags && ad.tags.length">
              <span
                v-for="(t, tIdx) in ad.tags"
                :key="t + '_' + tIdx"
                class="chip pill tag-abs"
                :style="tagPosStyle(ad, tIdx)"
                @mousedown.stop="onTagPointerDown($event, 'F', idx, tIdx)"
                @touchstart.stop="onTagPointerDown($event, 'F', idx, tIdx)"
              >{{ t }}</span>
            </template>

            <div
              class="ad-overlay"
              :class="ad._navPos || 'at-bl'"
              :style="{
                '--ad-nav-offset-x': ad._navX ?? '8px',
                '--ad-nav-offset-y': ad._navY ?? '40px',
                '--ad-nav-gap':     ad._navGap ?? '200px',
                '--ad-dots-bottom': ad._dotsBottom ?? '8px'
              }"
            >
              <div v-if="(ad.images?.length || 0) > 1" class="ad-navbar">
                <button class="ad-nav-btn" type="button" @click.stop="nextAdImageLocal('F', idx, -1)">‹</button>
                <button class="ad-nav-btn" type="button" @click.stop="nextAdImageLocal('F', idx, +1)">›</button>
              </div>
              <div v-if="(ad.images?.length || 0) > 1" class="dots">
                <button v-for="(u, j) in ad.images" :key="j" :class="['dot', { active: j === ad._imgIndex }]" type="button" @click.stop="setAdImageIndexLocal(ad, j)" />
              </div>
            </div>
          </div>

          <div class="image-actions">
            <input class="visually-hidden" type="file" accept="image/*" :id="`adf-file-${idx}`" multiple @change.stop="(e)=>onPickAdImagesLocal(e, 'F', idx)" />
            <label class="btn tiny" :for="`adf-file-${idx}`">이미지 변경</label>
            <small class="muted" v-if="ad.images?.length">· {{ ad.images.length }}장</small>
          </div>

          <div class="form tiny" v-show="adOpen('F', ad)">
            <div class="form-row"><label class="field grow"></label><label class="field grow"></label></div>
            <div class="form-row">
              <label class="field grow">
                <span>태그(쉼표 구분)</span>
                <input v-model="ad._tags" @input="() => onAdTagsChanged(ad)" placeholder="10% 할인, 첫 방문 케어" />
                <small class="muted">배너 위 태그 박스를 드래그해서 위치를 정하세요.</small>
              </label>
            </div>
          </div>

          <div class="row" v-show="adOpen('F', ad)" style="gap:6px;">
            <button class="btn tiny" :disabled="idx===0" @click="moveItem(adsFBox.list, idx, -1)">위로</button>
            <button class="btn tiny" :disabled="idx===adsFBox.list.length-1" @click="moveItem(adsFBox.list, idx, +1)">아래로</button>
            <button class="btn tiny" @click="dup(adsFBox.list, idx)">복제</button>
            <button class="btn tiny danger" @click="onRemoveAd('F', idx)">삭제</button>
            <span class="spacer"></span>
            <button class="btn tiny" type="button" @click="setAdOpen('F', ad, false)">닫기</button>
            <button class="btn tiny primary" type="button" :disabled="ad._saving" @click="onSaveAdOne('F', idx)">
              {{ ad._saving ? '저장 중…' : '이 항목만 저장' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { fbDb, fbStorage, ensureSignedIn } from '@/firebase'
import { collection, doc, serverTimestamp, writeBatch, getDocs } from 'firebase/firestore'
import { ref as sRef, getDownloadURL, uploadBytes } from 'firebase/storage'

/* ===== emits ===== */
const emit = defineEmits(['update:adsP','update:adsF'])

/* ===== props ===== */
const props = defineProps({
  // 배너 데이터
  adsP: { type: Object, default: null },
  adsF: { type: Object, default: null },
  ads:  { type: Object, default: null }, // P의 fallback로 사용
  // 기사한줄
  news: { type: Object, required: true },

  // 저장 상태
  savingAdsP: { type: Boolean, default: false },
  savingAdsF: { type: Boolean, default: false },
  newsSaving: { type: Boolean, required: true },

  // helpers
  timeAgo: { type: Function, required: true },
  /* 👇 기존 move 프롭 제거 (내부 유틸 사용) */
  dup: { type: Function, required: true },
  syncTags: { type: Function, required: true },
  bgStyle: { type: Function, required: true },
  adPreviewStyle: { type: Function, required: true },

  // 기사한줄 콜백
  addNewsTop: { type: Function, required: true },
  reloadConfig: { type: Function, required: true },
  saveNewsline: { type: Function, required: true },
  onNewsChange: { type: Function, required: true },
  removeNews: { type: Function, required: true },

  // 배너 전용 콜백(P/F 및 공용 폴백)
  addAdP: { type: Function, default: null },
  saveAdsP: { type: Function, default: null },
  toggleAdP: { type: Function, default: null },
  saveAdOneP: { type: Function, default: null },
  removeAdP: { type: Function, default: null },
  onPickAdImagesP: { type: Function, default: null },
  nextAdImageP: { type: Function, default: null },
  prevAdImageP: { type: Function, default: null },

  addAdF: { type: Function, default: null },
  saveAdsF: { type: Function, default: null },
  toggleAdF: { type: Function, default: null },
  saveAdOneF: { type: Function, default: null },
  removeAdF: { type: Function, default: null },
  onPickAdImagesF: { type: Function, default: null },
  nextAdImageF: { type: Function, default: null },
  prevAdImageF: { type: Function, default: null },

  // 공용 폴백
  addAd: { type: Function, default: null },
  saveAds: { type: Function, default: null },
  toggleAd: { type: Function, default: null },
  saveAdOne: { type: Function, default: null },
  removeAd: { type: Function, default: null },
  onPickAdImages: { type: Function, default: null },
  nextAdImage: { type: Function, default: null },
  prevAdImage: { type: Function, default: null },
})

/* ===== 로컬 이동 유틸 (뉴스/배너 공통) ===== */
function moveItem(list, fromIndex, delta){
  try{
    if (!Array.isArray(list)) return
    const toIndex = fromIndex + delta
    if (toIndex < 0 || toIndex >= list.length) return
    const it = list.splice(fromIndex, 1)[0]
    list.splice(toIndex, 0, it)
  }catch(e){
    console.warn('[AdminTools] moveItem 실패', e)
  }
}

/* ===== 로컬 박스 ===== */
const LS_KEYS = { P: '__admin_adsP', F: '__admin_adsF' }
const localAdsP = ref({ list: reactive([]) })
const localAdsF = ref({ list: reactive([]) })

const asBox = (src, fallback)=>{
  const list =
    Array.isArray(src?.list) ? src.list :
    Array.isArray(src) ? src :
    Array.isArray(fallback?.list) ? fallback.list :
    []
  return { list }
}
const adsPBox = computed(() => asBox((props.adsP ?? props.ads), localAdsP.value))
const adsFBox = computed(() => asBox((props.adsF ?? props.ads), localAdsF.value))

/* 저장 스피너 */
const localSavingP = ref(false)
const localSavingF = ref(false)
const isSavingP = computed(()=> props.savingAdsP || localSavingP.value)
const isSavingF = computed(()=> props.savingAdsF || localSavingF.value)

/* ===== 유틸 ===== */
const call = (fn, ...a) => (typeof fn === 'function' ? fn(...a) : undefined)
const clamp01 = v => Math.max(0, Math.min(1, v))

/** 로컬 태그 파서: "a, b , c" → ["a","b","c"] */
function syncTagsLocal(ad) {
  const raw = String(ad?._tags ?? '')
  const arr = raw.split(',').map(s => s.trim()).filter(Boolean)
  ad.tags = arr
  ensureTagPos(ad, true) // 태그 개수에 맞춰 tagPos 보정
}

/* 직렬화 공통 */
const pickAdFields = (a)=>({
  id: a.id || '',
  title: a.title || '',
  desc: a.desc || '',
  tags: Array.isArray(a.tags) ? a.tags.slice() : [],
  tagPos: Array.isArray(a.tagPos) ? a.tagPos.slice() : [],
  color: a.color || '#FBD0C9',
  img: a.img || '',
  images: Array.isArray(a.images) ? a.images.slice() : [],
  _imgIndex: Number(a._imgIndex)||0
})

/* ========================================= */
/* === Storage 업로드(항상 https로 저장) === */
/* ========================================= */

const skipStorageUpload = ref(false)

// 로컬에서도 업로드 진행 (스킵하지 않음)
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  skipStorageUpload.value = false
}

async function normalizeImageURL(group, raw, fallbackHttps = '') {
  const url = String(raw || '').trim()
  if (!url) return ''

  // 이미 https 또는 / 절대경로면 그대로(캐시버스터 추가)
  if (/^https?:\/\//i.test(url) || url.startsWith('/')) {
    const u = url.includes('?') ? `${url}&v=${Date.now()}` : `${url}?v=${Date.now()}`
    return u
  }

  // gs:// → https
  if (url.startsWith('gs://')) {
    const u = await getDownloadURL(sRef(fbStorage, url))
    return u.includes('?') ? `${u}&v=${Date.now()}` : `${u}?v=${Date.now()}`
  }

  // data: → Blob 변환 후 uploadBytes
  if (url.startsWith('data:')) {
    if (skipStorageUpload.value) {
      throw new Error('이미지 업로드가 비활성화되어 있어 https URL을 만들 수 없습니다.')
    }
    const blob = dataURLtoBlob(url)
    const mime = blob.type || 'image/jpeg'
    const ext  = (mime.split('/')[1] || 'jpg').toLowerCase()

    const base = (group === 'F') ? 'marketing/adBannersFinder' : 'marketing/adBannersP'
    const name = `${base}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const rf   = sRef(fbStorage, name)

    await uploadBytes(rf, blob, {
      contentType: mime,
      cacheControl: 'public, max-age=86400',
    })
    const httpsUrl = await getDownloadURL(rf)
    return httpsUrl.includes('?') ? `${httpsUrl}&v=${Date.now()}` : `${httpsUrl}?v=${Date.now()}`
  }

  // 그 외 문자열은 무시하고 fallback(https)만 허용
  return /^https?:\/\//.test(fallbackHttps) ? (fallbackHttps.includes('?') ? `${fallbackHttps}&v=${Date.now()}` : `${fallbackHttps}?v=${Date.now()}`) : ''
}

/** 그룹별 컬렉션 경로 */
function colPath(group){
  return group === 'F'
    ? ['config','marketing','adBannersFinder']  // 가게찾기
    : ['config','marketing','adBannersP']       // 제휴관
}

/** ★ 고정 문서 ID 및 경로 (화면이 읽는 문서) */
const FIXED_DOC_ID = 'prod'
function fixedDocPath(group){
  const [a,b,c] = colPath(group)
  return [a, b, c, FIXED_DOC_ID]  // ex) config/marketing/adBannersFinder/prod
}

/* ========================================= */
/* === Firestore 저장(그룹별 서브컬렉션) === */
/* ========================================= */
async function saveToFirestore(group, listRef){
  const list = (listRef || []).map(pickAdFields)

  const [a,b,c] = colPath(group)
  const baseCol = collection(fbDb, a, b, c)

  // 기존 문서
  const snap = await getDocs(baseCol)
  const existingIds = new Set(snap.docs.map(d => d.id))

  // 정규화 + 업로드
  const normalized = []
  for (let i=0;i<list.length;i++){
    const it = list[i]
    const id = it.id || `ad_${Date.now()}_${Math.random().toString(36).slice(2,7)}`
    const imgs = Array.isArray(it.images) ? it.images : []
    const normImages = []
    for (const u of imgs){
      const nu = await normalizeImageURL(group, u, it.img)
      if (!nu) throw new Error('이미지 업로드 또는 URL 변환에 실패했습니다.')
      if (!nu.startsWith('data:')) normImages.push(nu)
    }
    const pickIndex = Math.max(0, Math.min((normImages.length||1)-1, Number(it._imgIndex)||0))
    const chosen = await normalizeImageURL(group, it.img || normImages[pickIndex] || '', it.img)
    if (!chosen) throw new Error('대표 이미지 URL을 만들 수 없습니다.')
    normalized.push({
      id,
      title: it.title || '',
      desc : it.desc  || '',
      tags : Array.isArray(it.tags) ? it.tags.filter(Boolean) : [],
      tagPos: Array.isArray(it.tagPos) ? it.tagPos.map(p=>({ x: Number(p.x)||0, y: Number(p.y)||0 })) : [],
      color: it.color || '#FBD0C9',
      img: chosen,
      images: normImages,
      _imgIndex: pickIndex
    })
  }

  // 배치 set / delete
  const batch = writeBatch(fbDb)
  const idIndex = []
  const slimRows = []
  for (const row of normalized){
    const ref = doc(baseCol, row.id)
    batch.set(ref, row, { merge: true })
    idIndex.push({ id: row.id, img: row.img })
    slimRows.push({ id: row.id, img: row.img, tags: row.tags, tagPos: row.tagPos })
    existingIds.delete(row.id)
  }
  for (const id of existingIds){ batch.delete(doc(baseCol, id)) }

  // 상위 문서(배너 전용 키만 갱신)
  const refM = doc(fbDb, 'config', 'marketing')
  const base = { serverUpdatedAt: serverTimestamp(), updatedAt: Date.now() }

  if (group === 'F') {
    batch.set(refM, {
      ...base,
      adBannersFinder: slimRows,
      adBannersIndexF: idIndex
    }, { merge: true })
  } else {
    batch.set(refM, {
      ...base,
      adBannersP: slimRows,
      adBannersIndexP: idIndex
    }, { merge: true })
  }

  /* ★★★ 화면이 읽는 "고정 문서"에도 미러 저장 (배열 형태) ★★★ */
  const fixedRef = doc(fbDb, ...fixedDocPath(group))
  const mirrorRows = normalized.map(({ _imgIndex, ...rest }) => rest)
  batch.set(
    fixedRef,
    { adBanners: mirrorRows, updatedAt: serverTimestamp() },
    { merge: true }
  )

  await batch.commit()
  console.log('[AdminTools] Firestore saved:', group, normalized.length)
}

/* ===== localStorage 폴백 ===== */
function saveToLS(group){
  try{
    const box = group==='F' ? adsFBox.value : adsPBox.value
    const list = (box.list || []).map(pickAdFields)
    localStorage.setItem(LS_KEYS[group], JSON.stringify({ list }))
  }catch(e){ console.warn('[AdminTools] localStorage save fail', e) }
}
function loadFromLS(group){
  try{
    const raw = localStorage.getItem(LS_KEYS[group]); if (!raw) return null
    const obj = JSON.parse(raw)
    if (!obj || !Array.isArray(obj.list)) return null
    return { list: reactive(obj.list.map(normalizeAd)) }
  }catch(e){ console.warn('[AdminTools] localStorage load fail', e); return null }
}

/* ===== 드래그 ===== */
const dragging = ref({ group:'', adIdx:-1, tagIdx:-1 })
const previewRects = new Map()
const containerRefs = new Map()
const keyOf = (g,i)=> `${g}:${i}`

function setPreviewRef(group, adIdx){
  return (el)=>{
    const key = keyOf(group, adIdx)
    if (el) { containerRefs.set(key, el); previewRects.set(key, el.getBoundingClientRect()) }
    else { containerRefs.delete(key); previewRects.delete(key) }
  }
}
function refreshRect(group, adIdx){
  const el = containerRefs.get(keyOf(group, adIdx))
  if (el) previewRects.set(keyOf(group, adIdx), el.getBoundingClientRect())
}
function ensureTagPos(ad, reset=false){
  const n = (ad.tags || []).length
  if (!Array.isArray(ad.tagPos)) ad.tagPos = []
  while (ad.tagPos.length < n){
    const ix = ad.tagPos.length
    ad.tagPos.push({ x: clamp01(0.12 + ix*0.08), y: clamp01(0.16 + ix*0.08) })
  }
  if (ad.tagPos.length > n) ad.tagPos.splice(n)
  if (reset){
    for (let i=0;i<n;i++){
      const p = ad.tagPos[i] || {}
      if (typeof p.x !== 'number' || typeof p.y !== 'number') ad.tagPos[i] = { x:0.12, y:0.16 }
    }
  }
}
function tagPosStyle(ad, tagIndex){
  ensureTagPos(ad)
  const pos = ad.tagPos?.[tagIndex] || { x:0.12, y:0.16 }
  return { position:'absolute', left:`${(pos.x??0.12)*100}%`, top:`${(pos.y??0.16)*100}%`, transform:'translate(-50%, -50%)', cursor:'grab', userSelect:'none', zIndex:3 }
}
function onAdTagsChanged(ad){
  if (typeof props.syncTags === 'function') {
    try { props.syncTags(ad) } catch {}
  } else {
    syncTagsLocal(ad)
  }
  ensureTagPos(ad, true)
}

const listByGroup = g => (g==='F' ? adsFBox.value.list : adsPBox.value.list)

function onTagPointerDown(ev, group, adIdx, tagIdx){
  dragging.value = { group, adIdx, tagIdx }; refreshRect(group, adIdx)
  window.addEventListener('mousemove', onPointerMove, { passive:false })
  window.addEventListener('mouseup', onPointerUp, { passive:true })
  window.addEventListener('touchmove', onPointerMove, { passive:false })
  window.addEventListener('touchend', onPointerUp, { passive:true })
}
function onPointerMove(ev){
  const { group, adIdx, tagIdx } = dragging.value || {}
  if (!group || adIdx<0 || tagIdx<0) return
  const rect = previewRects.get(keyOf(group, adIdx)); if (!rect) return
  const pt = ('touches' in ev && ev.touches?.length) ? ev.touches[0]
            : (('changedTouches' in ev && ev.changedTouches?.length) ? ev.changedTouches[0] : ev)
  if (!pt) return
  ev.preventDefault()
  const x = clamp01((pt.clientX - rect.left) / rect.width)
  const y = clamp01((pt.clientY - rect.top) / rect.height)
  const ad = listByGroup(group)?.[adIdx]; if (!ad) return
  ensureTagPos(ad); ad.tagPos[tagIdx] = { x, y }
}
function onPointerUp(){
  dragging.value = { group:'', adIdx:-1, tagIdx:-1 }
  window.removeEventListener('mousemove', onPointerMove)
  window.removeEventListener('mouseup', onPointerUp)
  window.removeEventListener('touchmove', onPointerMove)
  window.removeEventListener('touchend', onPointerUp)
}

/* 리사이즈 핸들러 */
function onResize(){
  (adsPBox.value.list || []).forEach((_ad,i)=>refreshRect('P', i))
  (adsFBox.value.list || []).forEach((_ad,i)=>refreshRect('F', i))
}
onMounted(async ()=>{
  // 스토리지/DB 권한 보장
  await ensureSignedIn()

  // localStorage 폴백 읽기
  if (!props.adsP && !props.ads){
    const fromLS = loadFromLS('P'); if (fromLS) localAdsP.value = fromLS
  } else if ((adsPBox.value.list || []).length === 0) {
    const fromLS = loadFromLS('P'); if (fromLS) localAdsP.value = fromLS
  }
  if (!props.adsF){
    const fromLS = loadFromLS('F'); if (fromLS) localAdsF.value = fromLS
  } else if ((adsFBox.value.list || []).length === 0) {
    const fromLS = loadFromLS('F'); if (fromLS) localAdsF.value = fromLS
  }
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(()=>{
  onPointerUp()
  window.removeEventListener('resize', onResize)
})

/* ===== 편집 패널 열림 상태 ===== */
const openState = reactive(new Map())
const adOpen = (_g, ad)=> !!openState.get(ad)
function setAdOpen(_g, ad, v){ openState.set(ad, !!v) }
function onToggleAd(group, idx, ad){
  setAdOpen(group, ad, !adOpen(group, ad))
  if (group==='F') call(props.toggleAdF, idx)
  else call(props.toggleAdP ?? props.toggleAd, idx)
}

/* ===== 이미지/네비 (DataURL 폴백) ===== */
function setAdImageIndexLocal(ad, i){
  if (!ad?.images?.length) return
  const n = ad.images.length
  const ni = Math.max(0, Math.min(n-1, Number(i)||0))
  ad._imgIndex = ni
  ad.img = ad.images[ni]
}
function fileToDataURL(f){
  return new Promise((res, rej)=>{
    const fr = new FileReader()
    fr.onload = ()=> res(fr.result)
    fr.onerror = rej
    fr.readAsDataURL(f)
  })
}
function dataURLtoBlob(dataUrl){
  try {
    const [header, base64] = String(dataUrl).split(',')
    const mime = (/^data:(.*?);base64$/i.exec(header)?.[1]) || 'application/octet-stream'
    const bin  = atob(base64)
    const len  = bin.length
    const buf  = new Uint8Array(len)
    for (let i = 0; i < len; i++) buf[i] = bin.charCodeAt(i)
    return new Blob([buf], { type: mime })
  } catch (e) {
    console.warn('[AdminTools] dataURL → Blob 변환 실패', e)
    throw new Error('잘못된 data URL 형식입니다.')
  }
}

async function onPickAdImagesLocal(e, group, idx){
  const handler = group==='F' ? (props.onPickAdImagesF || props.onPickAdImages) : (props.onPickAdImagesP || props.onPickAdImages)
  if (typeof handler === 'function') return handler(e, idx)

  const files = Array.from(e?.target?.files || [])
  if (!files.length) return
  const lst = listByGroup(group); const it = lst?.[idx]; if (!it) return

  const urls = []
  for (const f of files){ try{ urls.push(await fileToDataURL(f)) }catch{} }
  if (!urls.length) return
  it.images = (it.images || []).concat(urls)
  it._imgIndex = it.images.length - urls.length
  it.img = it.images[it._imgIndex]
  it._fileName = `${files.length} files`
}
function nextAdImageLocal(group, idx, step){
  const useNext = group==='F' ? (props.nextAdImageF || props.nextAdImage) : (props.nextAdImageP || props.nextAdImage)
  const usePrev = group==='F' ? (props.prevAdImageF || props.prevAdImage) : (props.prevAdImageP || props.prevAdImage)
  if (typeof useNext === 'function' && step>0) return useNext(idx, step)
  if (typeof usePrev === 'function' && step<0) return usePrev(idx)
  const it = listByGroup(group)?.[idx]; if(!it?.images?.length) return
  const n = it.images.length
  it._imgIndex = ((it._imgIndex||0) + step + n) % n
  it.img = it.images[it._imgIndex]
}

/* ===== 새 아이템 + 정규화 ===== */
function normalizeAd(a){
  const base = Object.assign({
    id:`ad_${Date.now()}_${Math.random().toString(36).slice(2)}`, // 기존 local_ → ad_로 변경된 상태 유지
    title:'', desc:'', tags:[], tagPos:[], color:'#FBD0C9', img:'', images:[], _imgIndex:0
  }, a||{})
  // 편집 입력창에 표시될 문자열 미러
  base._tags = Array.isArray(base.tags) ? base.tags.join(', ') : (base._tags || '')
  return base
}

function newAd(){ return normalizeAd({}) }
const boxOf = g => (g==='F' ? adsFBox.value : adsPBox.value)

/* ===== 저장 ===== */
async function onAddAd(group){
  const used = call(group==='F' ? props.addAdF : (props.addAdP ?? props.addAd))
  if (used !== undefined) return
  const box = boxOf(group)
  if (!Array.isArray(box.list)) box.list = reactive([])
  const item = newAd()
  box.list.push(item)
  await nextTick()
  setAdOpen(group, item, true)
}

async function onSaveAds(group){
  await ensureSignedIn()
  const box = boxOf(group)
  const listRef = box.list
  if (group==='F') emit('update:adsF', { list: listRef })
  else emit('update:adsP', { list: listRef })

  if (group==='F') localSavingF.value = true; else localSavingP.value = true
  try{
    await saveToFirestore(group, listRef)
    saveToLS(group)
    alert(group==='F' ? '가게찾기 배너가 저장되었습니다.' : '제휴관 배너가 저장되었습니다.')
  } catch(e){
    console.warn('[AdminTools] Firestore save failed', e)
    alert(`저장 실패: ${e?.message || e}`)
    saveToLS(group)
  } finally {
    if (group==='F') localSavingF.value = false; else localSavingP.value = false
  }
  ;(listRef || []).forEach(a=> setAdOpen(group, a, false))
  await call(props.reloadConfig)
}

async function onSaveAdOne(group, idx){
  await ensureSignedIn()
  const listRef = boxOf(group).list
  const ad = listRef?.[idx]; if (!ad) return

  if (group==='F') emit('update:adsF', { list: listRef })
  else emit('update:adsP', { list: listRef })

  try{
    await saveToFirestore(group, listRef)
    saveToLS(group)
    alert(group==='F' ? '해당 가게찾기 배너가 저장되었습니다.' : '해당 제휴관 배너가 저장되었습니다.')
  } catch(e){
    console.warn('[AdminTools] Firestore single save failed', e)
    alert(`저장 실패: ${e?.message || e}`)
    saveToLS(group)
  }
  setAdOpen(group, ad, false)
  await call(props.reloadConfig)
}

function onRemoveAd(group, idx){
  const used = call(group==='F' ? props.removeAdF : (props.removeAdP ?? props.removeAd), idx)
  const box = boxOf(group)
  if (used === undefined) {
    box.list.splice(idx, 1)
    if (group==='F') emit('update:adsF', { list: box.list })
    else emit('update:adsP', { list: box.list })
  }
  saveToFirestore(group, box.list)
    .then(()=> saveToLS(group))
    .catch(e=>{
      console.warn('[AdminTools] Firestore remove save failed', e)
      saveToLS(group)
    })
}
</script>

<style scoped>
.admin-box{ position:relative; }
.edit-card{ position:relative; }
.ad-preview{ position: relative; overflow: hidden; border-radius: 12px; min-height: 120px; }
.tag-abs{
  box-shadow: 0 2px 8px rgba(0,0,0,.18);
  backdrop-filter: blur(2px);
  pointer-events: auto;
}
.ad-preview .ad-shade{ display:none !important; background:none !important; width:0 !important; }
.ad-preview::before{ content:none !important; display:none !important; background:none !important; width:0 !important; }
.ad-preview{ -webkit-mask-image:none !important; mask-image:none !important; }
.image-actions{ display:flex; align-items:center; gap:8px; margin-top:8px; }
.visually-hidden{ position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
.ad-overlay{ position:absolute; inset:0; display:flex; align-items:flex-end; pointer-events:none; padding: var(--ad-nav-offset-y, 8px) var(--ad-nav-offset-x, 8px); }
.ad-overlay.at-bl{ align-items:flex-end;  justify-content:flex-start; }
.ad-overlay.at-bc{ align-items:flex-end;  justify-content:center; }
.ad-overlay.at-br{ align-items:flex-end;  justify-content:flex-end; }
.ad-overlay.at-tl{ align-items:flex-start; justify-content:flex-start; }
.ad-overlay.at-tc{ align-items:flex-start; justify-content:center; }
.ad-overlay.at-tr{ align-items:flex-start; justify-content:flex-end; }
.ad-navbar{ display:flex; gap: var(--ad-nav-gap, 8px); pointer-events:auto; z-index:6; }
.ad-nav-btn{ width:32px; height:32px; border:none; border-radius:50%; background:rgba(255,255,255,.96); color:#000; font-size:18px; line-height:32px; text-align:center; box-shadow:0 2px 8px rgba(0,0,0,.18); cursor:pointer; }
.dots{ position:absolute; left:0; right:0; bottom:var(--ad-dots-bottom, 8px); display:flex; gap:6px; justify-content:center; align-items:center; z-index:5; }
.dot{ width:8px; height:8px; border-radius:9999px; border:none; background:#cfd5e6; cursor:pointer; }
.dot.active{ background:#5561ff; }
</style>
