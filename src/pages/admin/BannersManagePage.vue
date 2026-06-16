<!--
  src/pages/admin/BannersManagePage.vue
  배너 관리 — 가게찾기(F) / 제휴관(P) 두 그룹
  Firestore: config/marketing/adBanners{Finder|P}/prod  { adBanners: [...] }
  Storage:   marketing/adBanners{Finder|P}/{ts}_{rand}.{ext}
-->
<template>
  <div class="adm-page">
    <header class="adm-page-head">
      <h2 class="adm-page-title">📢 배너 관리</h2>
      <p class="adm-page-sub">두 곳의 배너를 각각 관리합니다.</p>
    </header>

    <!-- 그룹 탭 -->
    <nav class="adm-tabs">
      <button
        class="adm-tab"
        :class="{ active: group === 'F' }"
        type="button"
        @click="group = 'F'"
      >가게찾기 배너
        <span class="adm-tab-count">{{ banners.F.length }}</span>
      </button>
      <button
        class="adm-tab"
        :class="{ active: group === 'P' }"
        type="button"
        @click="group = 'P'"
      >제휴관 배너
        <span class="adm-tab-count">{{ banners.P.length }}</span>
      </button>
    </nav>

    <section class="adm-section">
      <header class="adm-section-head">
        <h3>{{ group === 'F' ? '가게찾기' : '제휴관' }} 배너 ({{ currentList.length }}개)</h3>
        <div class="adm-section-actions">
          <input
            ref="fileInputEl"
            type="file"
            accept="image/*"
            style="display:none"
            @change="onPickFile"
          />
          <button class="adm-btn" type="button" :disabled="uploading" @click="fileInputEl?.click()">
            {{ uploading ? '업로드 중…' : '+ 이미지 업로드' }}
          </button>
          <button class="adm-btn primary" type="button" :disabled="saving" @click="saveBanners">
            {{ saving ? '저장 중…' : '저장' }}
          </button>
        </div>
      </header>
      <p class="adm-hint">이미지 업로드 → 항목이 추가됩니다. 제목/설명/링크 수정 후 저장하세요. 드래그(☰)로 순서 변경.</p>

      <ul class="adm-banner-list" v-if="currentList.length">
        <li
          v-for="(b, i) in currentList"
          :key="b.id || i"
          class="adm-banner-row"
          draggable="true"
          @dragstart="onDragStart(i, $event)"
          @dragover="onDragOver(i, $event)"
          @drop.prevent
          @dragend="onDragEnd"
        >
          <span class="adm-drag-handle">☰</span>
          <img v-if="b.img" :src="b.img" class="adm-banner-thumb" alt="" />
          <div v-else class="adm-banner-thumb noimg">이미지 없음</div>

          <div class="adm-banner-fields">
            <label>
              <span>제목</span>
              <input v-model="b.title" type="text" placeholder="배너 제목" />
            </label>
            <label>
              <span>설명</span>
              <input v-model="b.desc" type="text" placeholder="배너 설명" />
            </label>
            <label>
              <span>링크 (선택)</span>
              <input v-model="b.link" type="text" placeholder="https:// 또는 /partners/xxx" />
            </label>
            <label>
              <span>배경색</span>
              <input v-model="b.color" type="text" placeholder="#FBD0C9" />
            </label>
          </div>

          <button class="adm-btn ghost small" type="button" @click="removeBanner(i)">삭제</button>
        </li>
      </ul>
      <p v-else class="adm-empty">아직 등록된 배너가 없습니다. '이미지 업로드' 로 추가하세요.</p>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { db as fbDb, storage as fbStorage } from '@/firebase'
import {
  doc, onSnapshot, setDoc, serverTimestamp,
} from 'firebase/firestore'
import {
  ref as sRef, uploadBytes, getDownloadURL,
} from 'firebase/storage'

const group = ref('F') // 'F' = 가게찾기, 'P' = 제휴관

const banners = ref({ F: [], P: [] })

const fileInputEl = ref(null)
const uploading = ref(false)
const saving = ref(false)

let unsubF = null
let unsubP = null

function subscribeFixedDoc(g){
  const subcoll = g === 'F' ? 'adBannersFinder' : 'adBannersP'
  return onSnapshot(
    doc(fbDb, 'config', 'marketing', subcoll, 'prod'),
    (snap) => {
      const data = snap.exists() ? (snap.data() || {}) : {}
      const arr = Array.isArray(data.adBanners) ? data.adBanners.slice() : []
      // 신규 ID 가 없는 항목 보강
      banners.value[g] = arr.map((b, i) => ({
        id: b.id || `ad_${Date.now()}_${i}`,
        title: b.title || '',
        desc:  b.desc  || '',
        link:  b.link  || '',
        color: b.color || '#FBD0C9',
        img:   b.img   || '',
        images: Array.isArray(b.images) ? b.images.slice() : (b.img ? [b.img] : []),
        tags:  Array.isArray(b.tags) ? b.tags.slice() : [],
        tagPos: Array.isArray(b.tagPos) ? b.tagPos.slice() : [],
        _imgIndex: Number(b._imgIndex) || 0,
      }))
    },
    () => {},
  )
}

onMounted(() => {
  unsubF = subscribeFixedDoc('F')
  unsubP = subscribeFixedDoc('P')
})
onBeforeUnmount(() => {
  if (unsubF) try { unsubF() } catch {}
  if (unsubP) try { unsubP() } catch {}
})

const currentList = computed(() => banners.value[group.value])

/* === 업로드 === */
async function onPickFile(e){
  const f = e.target.files?.[0]
  if (!f) return
  uploading.value = true
  try {
    const ext = (f.name.split('.').pop() || 'jpg').toLowerCase()
    const base = group.value === 'F' ? 'marketing/adBannersFinder' : 'marketing/adBannersP'
    const path = `${base}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const rf = sRef(fbStorage, path)
    await uploadBytes(rf, f, {
      contentType: f.type || 'image/jpeg',
      cacheControl: 'public, max-age=86400',
    })
    const url = await getDownloadURL(rf)
    // 새 배너 항목 추가
    const newBanner = {
      id: `ad_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: '',
      desc: '',
      link: '',
      color: '#FBD0C9',
      img: url,
      images: [url],
      tags: [],
      tagPos: [],
      _imgIndex: 0,
    }
    banners.value[group.value] = [...banners.value[group.value], newBanner]
  } catch (err) {
    console.error(err)
    alert('업로드 실패: ' + (err?.message || err))
  } finally {
    uploading.value = false
    if (fileInputEl.value) fileInputEl.value.value = ''
  }
}

/* === 드래그 === */
const drag = ref({ from: -1 })
function onDragStart(i, e){
  drag.value.from = i
  try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain','d') } catch {}
}
function onDragOver(i, e){
  e.preventDefault()
  const from = drag.value.from
  if (from < 0 || from === i) return
  const arr = banners.value[group.value].slice()
  if (from >= arr.length || i >= arr.length) return
  const [moved] = arr.splice(from, 1)
  arr.splice(i, 0, moved)
  banners.value[group.value] = arr
  drag.value.from = i
}
function onDragEnd(){ drag.value.from = -1 }

/* === 삭제 === */
function removeBanner(i){
  if (!confirm('이 배너를 삭제할까요? (저장 시 반영)')) return
  const arr = banners.value[group.value].slice()
  arr.splice(i, 1)
  banners.value[group.value] = arr
}

/* === 저장 ===
 * 주요 write: config/marketing/adBanners{Finder|P}/prod  { adBanners: [...] }
 * 보조 write: config/marketing 루트 doc 에 slim 인덱스 (기존 호환성 유지)
 */
async function saveBanners(){
  if (saving.value) return
  saving.value = true
  try {
    const g = group.value
    const subcoll = g === 'F' ? 'adBannersFinder' : 'adBannersP'
    const list = banners.value[g].map(b => ({
      id: b.id,
      title: b.title || '',
      desc:  b.desc  || '',
      link:  b.link  || '',
      color: b.color || '#FBD0C9',
      img:   b.img   || '',
      images: Array.isArray(b.images) && b.images.length ? b.images : (b.img ? [b.img] : []),
      tags:  Array.isArray(b.tags) ? b.tags.filter(Boolean) : [],
      tagPos: Array.isArray(b.tagPos) ? b.tagPos.slice() : [],
    }))

    // 1) 사용자 페이지가 읽는 고정 doc
    await setDoc(
      doc(fbDb, 'config', 'marketing', subcoll, 'prod'),
      { adBanners: list, updatedAt: serverTimestamp() },
      { merge: true },
    )

    // 2) 루트 인덱스 (기존 호환)
    const slimRows = list.map(b => ({ id: b.id, img: b.img, tags: b.tags, tagPos: b.tagPos }))
    const idIndex = list.map(b => ({ id: b.id, img: b.img }))
    const patch = g === 'F'
      ? { adBannersFinder: slimRows, adBannersIndexF: idIndex }
      : { adBannersP: slimRows,      adBannersIndexP: idIndex }
    await setDoc(
      doc(fbDb, 'config', 'marketing'),
      { ...patch, serverUpdatedAt: serverTimestamp(), updatedAt: Date.now() },
      { merge: true },
    )

    alert('저장되었습니다.')
  } catch (e) {
    console.error(e)
    alert('저장 실패: ' + (e?.message || e))
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.adm-page{ max-width:1100px; margin:0 auto; }
.adm-page-head{ margin-bottom:14px; }
.adm-page-title{ margin:0; font-size:22px; font-weight:900; }
.adm-page-sub{ margin:4px 0 0; font-size:13px; color:#888; }

.adm-tabs{
  display:flex; gap:6px; margin-bottom:14px;
  border-bottom:1px solid #eee;
}
.adm-tab{
  background:transparent; border:none; cursor:pointer;
  padding:10px 14px; font-size:14px; font-weight:700;
  color:#666;
  border-bottom:2px solid transparent;
  display:inline-flex; align-items:center; gap:6px;
}
.adm-tab.active{ color:#ff2e7e; border-bottom-color:#ff2e7e; }
.adm-tab-count{
  font-size:11px; padding:1px 6px; border-radius:999px;
  background:#ffe4ef; color:#ff2e7e; font-weight:800;
}
.adm-tab.active .adm-tab-count{ background:#ff2e7e; color:#fff; }

.adm-section{
  background:#fff; border:1px solid #f0f0f0; border-radius:14px;
  padding:16px 20px;
}
.adm-section-head{
  display:flex; align-items:center; justify-content:space-between;
  gap:10px; margin-bottom:10px; flex-wrap:wrap;
}
.adm-section-head h3{ margin:0; font-size:15px; font-weight:800; }
.adm-section-actions{ display:flex; gap:6px; }
.adm-hint{ font-size:12px; color:#888; margin:0 0 12px; }

.adm-btn{
  height:34px; padding:0 14px;
  border:1px solid #eee; background:#fafafa; color:#333;
  border-radius:10px; font-weight:700; font-size:13px;
  cursor:pointer; white-space:nowrap;
}
.adm-btn.primary{ background:#ff2e7e; border-color:#ff2e7e; color:#fff; }
.adm-btn.primary:disabled{ opacity:.6; cursor:not-allowed; }
.adm-btn:disabled{ opacity:.6; cursor:not-allowed; }
.adm-btn.ghost{ background:#fff; }
.adm-btn.small{ height:28px; padding:0 10px; font-size:12px; border-radius:8px; }

.adm-banner-list{ list-style:none; margin:0; padding:0; }
.adm-banner-row{
  display:flex; align-items:flex-start; gap:14px;
  padding:14px 0;
  border-bottom:1px solid #f5f5f5;
}
.adm-banner-row:last-child{ border-bottom:none; }
.adm-banner-row[draggable="true"]{ cursor:grab; }
.adm-drag-handle{ color:#bbb; margin-top:30px; }
.adm-banner-thumb{
  width:120px; height:80px; border-radius:10px;
  object-fit:cover; background:#f5f5f5; flex:none;
  display:grid; place-items:center;
  font-size:11px; color:#aaa;
}
.adm-banner-thumb.noimg{ background:#f5f5f5; }

.adm-banner-fields{
  flex:1; min-width:0;
  display:grid; grid-template-columns:1fr 1fr; gap:8px 12px;
}
.adm-banner-fields label{
  display:flex; flex-direction:column; gap:2px;
}
.adm-banner-fields span{
  font-size:11px; color:#888; font-weight:700;
}
.adm-banner-fields input{
  height:30px; padding:0 8px;
  border:1px solid #eee; border-radius:6px;
  font-size:12px; background:#fff;
}
.adm-banner-fields input:focus{ outline:none; border-color:#ff2e7e; }

.adm-empty{ color:#aaa; font-size:13px; padding:20px 0; text-align:center; }

@media (max-width:680px){
  .adm-banner-fields{ grid-template-columns:1fr; }
  .adm-banner-row{ flex-direction:column; }
  .adm-banner-thumb{ width:100%; height:140px; }
  .adm-drag-handle{ margin-top:0; }
}

:root[data-theme="dark"] .adm-section,
:root[data-theme="black"] .adm-section{ background:#1c1c1c; border-color:#2a2a2a; }
:root[data-theme="dark"] .adm-banner-row,
:root[data-theme="black"] .adm-banner-row{ border-bottom-color:#2a2a2a; }
:root[data-theme="dark"] .adm-banner-fields input,
:root[data-theme="black"] .adm-banner-fields input{ background:#222; border-color:#2a2a2a; color:#eee; }
</style>
