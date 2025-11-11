<template>
  <div v-if="open" class="sheet-backdrop" @click.self="$emit('close')">
    <section class="sheet">
      <header class="sheet-head">
        <strong>프로필 수정</strong>
        <button class="x" type="button" @click="$emit('close')">✕</button>
      </header>

      <!-- ================= 개인 회원 ================= -->
      <form v-if="type === 'user'" class="form" @submit.prevent="onSave">
        <div class="avatar-edit">
          <div
            class="avatar lg"
            :style="compAvatarStyle('user')"
            @click="onNext()"
          >
            <!-- 이니셜 폴백 -->
            <span v-if="!currentSrc && !state.profile?.photoUrl" class="avatar-fallback">
              {{ initials(displayNick) }}
            </span>

            <!-- 좌/우 네비 -->
            <button
              v-if="(edit.photos?.length || 0) > 1"
              type="button"
              class="avatar-nav left"
              @click.stop="onPrev()"
              aria-label="이전 이미지"
            >‹</button>
            <button
              v-if="(edit.photos?.length || 0) > 1"
              type="button"
              class="avatar-nav right"
              @click.stop="onNext()"
              aria-label="다음 이미지"
            >›</button>

            <!-- 현재 삭제 -->
            <button
              v-if="(edit.photos?.length || 0) >= 1"
              type="button"
              class="avatar-del"
              @click.stop="removeCurrentFromGallery"
              aria-label="현재 사진 삭제"
              title="현재 사진 삭제"
            >🗑</button>

            <!-- 개수 -->
            <small
              v-if="(edit.photos?.length || 0) > 1"
              class="avatar-count"
            >{{ (edit.photoIndex || 0) + 1 }} / {{ edit.photos.length }}</small>
          </div>

          <div class="file-row">
            <!-- ✅ 여러 장 선택 + 보관함에 누적 저장 -->
            <input type="file" accept="image/*" multiple @change="onFileChange" />
            <small class="muted ellip">{{ labelPicked }}</small>

            <button
              v-if="currentSrc || state.profile?.photoUrl"
              class="btn tiny"
              type="button"
              @click="clearAllPhotos"
            >모두 지우기</button>

            <button class="btn tiny" type="button" @click="applyRandomFemale">랜덤 여성 캐릭터</button>
          </div>

          <div v-if="galleryCount" class="gallery-info">
            보관함: {{ galleryCount }}장 (삭제 전까지 유지)
          </div>
        </div>

        <label class="field">
          <span>닉네임</span>
          <input v-model.trim="edit.nickname" placeholder="닉네임" maxlength="20" />
        </label>

        <label class="field">
          <span>연락처</span>
          <input v-model.trim="edit.phone" placeholder="연락처(선택)" />
        </label>

        <div class="row row-actions">
          <button type="button" class="btn" @click="$emit('close')">취소</button>
          <button type="submit" class="btn primary" :disabled="saving || savingInner">
            {{ (saving || savingInner) ? '저장 중…' : '저장' }}
          </button>
        </div>
      </form>

      <!-- ================= 기업 회원 ================= -->
      <form v-else class="form" @submit.prevent="onSave">
        <div class="avatar-edit">
          <div
            class="avatar lg"
            :style="compAvatarStyle('company')"
            @click="onNext()"
          >
            <span v-if="!currentSrc && !state.company?.logo" class="avatar-fallback">🏢</span>

            <button
              v-if="(edit.photos?.length || 0) > 1"
              type="button"
              class="avatar-nav left"
              @click.stop="onPrev()"
              aria-label="이전 이미지"
            >‹</button>
            <button
              v-if="(edit.photos?.length || 0) > 1"
              type="button"
              class="avatar-nav right"
              @click.stop="onNext()"
              aria-label="다음 이미지"
            >›</button>

            <button
              v-if="(edit.photos?.length || 0) >= 1"
              type="button"
              class="avatar-del"
              @click.stop="removeCurrentFromGallery"
              aria-label="현재 사진 삭제"
              title="현재 사진 삭제"
            >🗑</button>

            <small
              v-if="(edit.photos?.length || 0) > 1"
              class="avatar-count"
            >{{ (edit.photoIndex || 0) + 1 }} / {{ edit.photos.length }}</small>
          </div>

          <div class="file-row">
            <input type="file" accept="image/*" multiple @change="onFileChange" />
            <small class="muted ellip">{{ labelPicked }}</small>
            <button
              v-if="currentSrc || state.company?.logo"
              class="btn tiny"
              type="button"
              @click="clearAllPhotos"
            >모두 지우기</button>
          </div>

          <div v-if="galleryCount" class="gallery-info">
            보관함: {{ galleryCount }}장 (삭제 전까지 유지)
          </div>
        </div>

        <label class="field">
          <span>닉네임</span>
          <input v-model.trim="edit.nickname" placeholder="닉네임" maxlength="20" />
        </label>

        <label class="field">
          <span>업체명</span>
          <input v-model.trim="edit.companyName" placeholder="업체명" />
        </label>

        <label class="field">
          <span>사업자등록번호</span>
          <input v-model.trim="edit.brn" placeholder="10자리" inputmode="numeric" />
        </label>

        <label class="field">
          <span>담당자</span>
          <input v-model.trim="edit.manager" placeholder="담당자" />
        </label>

        <label class="field">
          <span>연락처</span>
          <input v-model.trim="edit.phone" placeholder="연락처" />
        </label>

        <label class="field">
          <span>주소</span>
          <input v-model.trim="edit.address" placeholder="주소" />
        </label>

        <div class="row row-actions">
          <button type="button" class="btn" @click="$emit('close')">취소</button>
          <button type="submit" class="btn primary" :disabled="saving || savingInner">
            {{ (saving || savingInner) ? '저장 중…' : '저장' }}
          </button>
        </div>
      </form>
    </section>
  </div>
</template>

<script setup>
import { computed, watch, nextTick, ref } from 'vue'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { ref as sref, uploadString, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/firebase' // ← 프로젝트 경로에 맞게 조정

const props = defineProps({
  open: { type: Boolean, required: true },
  type: { type: String, required: true }, // 'user' | 'company'
  state: { type: Object, required: true },
  edit: { type: Object, required: true },
  saving: { type: Boolean, required: true },

  displayNick: { type: String, required: true },
  initials: { type: Function, required: true },

  // 부모 스타일러(없으면 로컬에서 대체)
  previewAvatarStyle: { type: Function, required: true },

  // 부모 쪽 핸들러(있으면 호출, 없으면 로컬 폴백)
  onPickProfilePhoto: { type: Function, required: true },
  onPickProfilePhotos: { type: Function, required: true },
  clearProfilePhoto: { type: Function, required: true },
  applyRandomFemale: { type: Function, required: true },
  nextProfilePhoto: { type: Function, required: true },
  prevProfilePhoto: { type: Function, required: true },
})
const emit = defineEmits(['save','close'])

/* 내부 저장 플래그 */
const savingInner = ref(false)

/* ===== 보관함 키 ===== */
const galleryKey = computed(() => {
  const uid = props.state?.uid || props.state?.profile?.uid || 'guest'
  return `profile:gallery:${props.type}:${uid}`
})

/* ===== 현재 src/표시용 ===== */
const currentSrc = computed(() => {
  const arr = props.edit.photos || []
  const i = Math.min(Math.max(props.edit.photoIndex || 0, 0), Math.max(arr.length - 1, 0))
  const item = arr[i]
  return typeof item === 'string' ? item : (item?.src || '')
})
const labelPicked = computed(() =>
  props.edit._photoName
    ? props.edit._photoName
    : (props.edit.photos?.length ? `${props.edit.photos.length}장 보관됨` : '선택된 파일 없음')
)
const galleryCount = computed(() => props.edit.photos?.length || 0)

/* ===== 프리뷰 스타일: currentSrc 우선 ===== */
function compAvatarStyle(kind){
  if (currentSrc.value) {
    return { backgroundImage: `url("${currentSrc.value}")`, backgroundSize:'cover', backgroundPosition:'center' }
  }
  // 부모 기본
  return props.previewAvatarStyle(kind)
}

/* ===== 보관함 I/O ===== */
function readGallery(){
  try{
    const raw = localStorage.getItem(galleryKey.value) || '[]'
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.map(x => (typeof x==='string'? {src:x, ts:Date.now()} : x)).filter(x=>x?.src) : []
  }catch{ return [] }
}
function writeGallery(list){
  try{
    localStorage.setItem(galleryKey.value, JSON.stringify(list.map(x => (typeof x==='string'? x : x.src)).filter(Boolean)))
  }catch(e){
    console.warn('profile gallery 저장 실패:', e)
    alert('이미지 보관함 저장공간이 부족해요. 일부 이미지를 삭제해 주세요.')
  }
}

/* ===== 시트 열릴 때: 보관함 → edit.photos ===== */
watch(() => props.open, async (v) => {
  if (!v) return
  await nextTick()
  const g = readGallery()
  const seed = (props.type === 'company'
    ? (props.state?.company?.logo || '')
    : (props.state?.profile?.photoUrl || '')) || ''
  const seeded = seed && !g.some(x => x.src === seed) ? [{ src:seed, ts:Date.now() }, ...g] : g
  props.edit.photos = seeded.slice()
  props.edit.photoIndex = Math.min(props.edit.photoIndex || 0, Math.max(seeded.length - 1, 0))
  props.edit._photoName = ''
}, { immediate:true })

/* ===== 파일 → DataURL ===== */
function fileToDataUrl(file, maxW=800, quality=0.78){
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onerror = reject
    fr.onload = () => {
      const img = new Image()
      img.onload = () => {
        const s = Math.min(1, maxW / img.width)
        const w = Math.max(1, Math.round(img.width*s))
        const h = Math.max(1, Math.round(img.height*s))
        const c = document.createElement('canvas'); c.width=w; c.height=h
        const ctx = c.getContext('2d'); ctx.drawImage(img,0,0,w,h)
        resolve(c.toDataURL('image/jpeg', quality))
      }
      img.src = fr.result
    }
    fr.readAsDataURL(file)
  })
}

/* ===== 여러 장 선택 + 누적 보관 ===== */
async function handlePickAndRemember(e){
  const files = Array.from(e?.target?.files || [])
  if (!files.length) return
  const urls = []
  for (const f of files){ try{ urls.push(await fileToDataUrl(f)) }catch{} }
  if (!urls.length) return
  const g = readGallery()
  const has = new Set(g.map(x => x.src))
  for (const u of urls){ if (!has.has(u)) g.push({ src:u, ts:Date.now() }) }
  writeGallery(g)
  props.edit.photos = g.slice()
  props.edit.photoIndex = Math.max(0, g.length - urls.length)
  props.edit._photoName = `${urls.length}개 추가됨`
}

/* ===== 삭제 ===== */
function removeCurrentFromGallery(){
  const arr = props.edit.photos || []
  const i = Math.min(Math.max(props.edit.photoIndex || 0, 0), Math.max(arr.length - 1, 0))
  if (i < 0 || i >= arr.length) return
  const next = arr.slice(0,i).concat(arr.slice(i+1))
  writeGallery(next)
  props.edit.photos = next
  props.edit.photoIndex = Math.min(i, Math.max(next.length - 1, 0))
  if (!next.length) props.clearProfilePhoto()
}
function clearAllPhotos(){
  if (!confirm('보관된 모든 이미지를 삭제할까요?')) return
  writeGallery([])
  props.edit.photos = []
  props.edit.photoIndex = 0
  props.edit._photoName = ''
  props.clearProfilePhoto()
}

/* ===== 좌/우 네비 (부모 있으면 호출, 없으면 로컬) ===== */
function onNext(){
  if (typeof props.nextProfilePhoto === 'function') props.nextProfilePhoto()
  else {
    const n = props.edit.photos?.length || 0
    if (!n) return
    props.edit.photoIndex = (props.edit.photoIndex + 1) % n
  }
}
function onPrev(){
  if (typeof props.prevProfilePhoto === 'function') props.prevProfilePhoto()
  else {
    const n = props.edit.photos?.length || 0
    if (!n) return
    props.edit.photoIndex = (props.edit.photoIndex - 1 + n) % n
  }
}

/* 파일 선택 후 처리 + 같은 파일 재선택 가능하도록 value 리셋 */
async function onFileChange(e){
  await handlePickAndRemember(e);
  try { e.target.value = null } catch(_) {}
}

/* ====== Storage 업로드 & Firestore 업데이트 ====== */
function nowStamp(){
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

/** DataURL을 Storage에 업로드하고 {url, path} 반환 */
async function uploadDataUrlToStorage(uid, dataUrl){
  const path = `profiles/${uid}/avatar_${nowStamp()}.jpg`
  const r = sref(storage, path)
  await uploadString(r, dataUrl, 'data_url', { contentType: 'image/jpeg' })
  const url = await getDownloadURL(r)
  return { url, path }
}

async function onSave(){
  if (savingInner.value) return
  const uid = props.state?.uid
  if (!uid){ alert('로그인이 필요합니다.'); return }

  try{
    savingInner.value = true

    // 현재 선택된 이미지
    let photoUrl = currentSrc.value || (props.type === 'company' ? props.state.company?.logo : props.state.profile?.photoUrl) || ''
    let photoPath = props.type === 'company' ? (props.state.company?.logoPath || '') : (props.state.profile?.photoPath || '')

    // base64이면 Storage 업로드 → URL/경로 교체
    if (photoUrl && photoUrl.startsWith('data:image')){
      const { url, path } = await uploadDataUrlToStorage(uid, photoUrl)
      photoUrl = url
      photoPath = path
      // 로컬 갤러리도 URL로 치환(선택 사항)
      const g = readGallery().map(x => (x.src?.startsWith('data:image') ? { ...x, src:url } : x))
      writeGallery(g)
      props.edit.photos = g
    }

    // Firestore 업데이트 페이로드
    const payload = {
      updatedAt: Date.now(),
      serverUpdatedAt: serverTimestamp(),
      type: props.type === 'company' ? 'company' : 'user',
    }

    if (props.type === 'company'){
      payload.company = {
        ...(props.state.company || {}),
        logo: photoUrl || null,
        logoPath: photoPath || null,
        nickname: props.edit.nickname ?? props.state.company?.nickname ?? '',
        companyName: props.edit.companyName ?? props.state.company?.companyName ?? '',
        brn: props.edit.brn ?? props.state.company?.brn ?? '',
        manager: props.edit.manager ?? props.state.company?.manager ?? '',
        phone: props.edit.phone ?? props.state.company?.phone ?? '',
        address: props.edit.address ?? props.state.company?.address ?? '',
      }
    }else{
      payload.profile = {
        ...(props.state.profile || {}),
        nickname: props.edit.nickname ?? props.state.profile?.nickname ?? '',
        nick: props.edit.nickname ?? props.state.profile?.nick ?? '',
        phone: props.edit.phone ?? props.state.profile?.phone ?? null,
        photoUrl: photoUrl || null,   // 🔹 긴 base64 대신 짧은 URL
        photoPath: photoPath || null, // 🔹 아주 짧은 Storage 경로(원하면 이것만 저장해도 됨)
        uid,
        email: props.state.profile?.email || '',
      }
    }

    await updateDoc(doc(db, 'users', uid), payload)

    emit('save') // 기존 부모 연동 유지
    alert('프로필을 저장했어요!')
  }catch(err){
    console.error(err)
    alert('프로필 저장 중 오류가 발생했어요.')
  }finally{
    savingInner.value = false
  }
}
</script>

<style scoped>
/* ===== Backdrop & Sheet ===== */
.sheet-backdrop{
  position:fixed; inset:0; z-index:9999;
  background: rgba(0,0,0,.35);
  display:grid; place-items:end center;
}
.sheet{
  width:100%; max-width:680px;
  background:var(--surface); color:var(--fg);
  border-top-left-radius:18px; border-top-right-radius:18px;
  box-shadow:0 -10px 30px rgba(0,0,0,.25);
  padding:12px 14px 14px;

  max-height: 92vh;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;

  animation:slideUp .16s ease-out;
}
@keyframes slideUp{ from{ transform:translateY(16px); opacity:.7 } to{ transform:none; opacity:1 } }
.sheet-head{
  display:flex; justify-content:space-between; align-items:center;
  padding:4px 2px 10px; border-bottom:1px solid var(--line);
  position: sticky; top: 0; z-index: 3;
  background: var(--surface);
}
.sheet-head strong{ font-size:16px }
.sheet-head .x{
  width:32px; height:32px; border-radius:999px;
  border:1px solid var(--line); background:var(--surface);
}

/* ===== Form ===== */
.form{ padding:10px 2px 80px; display:flex; flex-direction:column; gap:10px }
.field{ display:flex; flex-direction:column; gap:6px }
.field > span{ font-weight:800; font-size:12px; color:var(--muted) }
.field input{
  height:42px; padding:0 12px;
  border-radius:12px; border:1px solid var(--line);
  background:var(--surface); color:var(--fg); font-weight:800;
}

/* 하단 고정 버튼 */
.row-actions{
  position: sticky;
  bottom: 0;
  padding: 10px 0 8px;
  background:
    linear-gradient(to top, color-mix(in oklab, var(--surface), transparent 0%), color-mix(in oklab, var(--surface), transparent 85%));
  border-top: 1px solid var(--line);
  z-index: 2;
  display:flex; gap:8px; margin-top:8px;
}
.btn{
  flex:1; min-width:120px; height:42px; border-radius:12px;
  border:1px solid var(--line); background:var(--surface); font-weight:800;
}
.btn.tiny{
  flex:0 0 auto; height:30px; padding:0 10px; border-radius:999px; font-weight:900;
}
.btn.primary{
  background: color-mix(in oklab, var(--accent), white 85%);
  border-color: var(--accent);
}

/* ===== Avatar ===== */
.avatar-edit{ display:flex; flex-direction:column; gap:10px }
.avatar{
  position:relative; cursor:pointer; user-select:none;
  width:120px; height:120px; border-radius:22px;
  background:#f2f2f4 center/cover no-repeat;
  border:1px solid var(--line); box-shadow:0 4px 14px var(--shadow);
  overflow:hidden;
}
.avatar.lg{ width:140px; height:140px }
.avatar-fallback{
  position:absolute; inset:0; display:grid; place-items:center;
  font-size:42px; font-weight:900; color:#fff;
  background:linear-gradient(135deg, #f06, #f89);
}

/* 좌/우 네비 */
.avatar-nav{
  position:absolute; top:50%; transform:translateY(-50%);
  width:28px; height:28px; border:none; border-radius:50%;
  background:rgba(0,0,0,.4); color:#fff;
  display:grid; place-items:center; font-size:20px; line-height:1;
}
.avatar-nav.left{ left:4px }
.avatar-nav.right{ right:4px }

/* 현재 삭제 버튼 */
.avatar-del{
  position:absolute; top:6px; right:6px;
  width:26px; height:26px; border:none; border-radius:50%;
  background:rgba(0,0,0,.45); color:#fff; font-size:14px; line-height:1;
}

/* 하단 페이지 수 */
.avatar-count{
  position:absolute; right:6px; bottom:6px;
  background:rgba(0,0,0,.45); color:#fff;
  padding:2px 6px; border-radius:8px; font-size:12px; font-weight:800;
}

/* 파일 선택 줄 */
.file-row{
  display:flex; align-items:center; gap:8px; flex-wrap:wrap;
}
.file-row input[type="file"]{ flex:1 }
.muted{ color:var(--muted) }
.ellip{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:220px }

.gallery-info{
  font-size:12px; color:var(--muted);
}

/* 다크 테마 대비 */
:root[data-theme="dark"] .avatar-count,
:root[data-theme="black"] .avatar-count{
  background:rgba(0,0,0,.55);
}
</style>
