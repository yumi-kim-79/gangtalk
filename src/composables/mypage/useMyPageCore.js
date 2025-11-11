// useMyPageCore.js — fixed full file
import { computed, onMounted, watch, reactive, ref } from 'vue'
import { tierByPoints } from '@/lib/tiers.js'   // ✅ 등급 계산 유틸
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { me } from '@/store/user.js'
import { useUserNick } from '@/store/userNick.js'
import { fbDb, fbStorage, ensureSignedIn } from '@/firebase.js'
import {
  doc, setDoc, getDoc, serverTimestamp,
  collection, getDocs, query, where, onSnapshot, deleteDoc, deleteField
} from 'firebase/firestore'
import { ref as sRef, uploadBytes, getDownloadURL } from 'firebase/storage'

export function useMyPageCore(){

  /* ───── 운영자 식별을 먼저 선언 (state 계산에서 사용) ───── */
  const isAdminDoc = ref(false)
  let _adminUnsub = null

  // 현재 uid를 안정적으로 얻기 (Firebase Auth 우선, me 스토어 보조)
  function currentUid () {
    const a = getAuth()?.currentUser?.uid
    return a || me?.auth?.value?.uid || me?.auth?.uid || me?.uid || ''
  }

  function watchAdminDoc(){
    if (_adminUnsub) { _adminUnsub(); _adminUnsub = null }
    const uid = currentUid()
    if (!fbDb || !uid) { isAdminDoc.value = false; return }
    const refx = doc(fbDb, 'admins', String(uid))
    _adminUnsub = onSnapshot(
      refx,
      s => { isAdminDoc.value = s.exists() },
      () => { isAdminDoc.value = false }
    )
  }

  onMounted(() => {
    watchAdminDoc()
    // 로그인/로그아웃 등 Auth 상태가 바뀔 때도 재구독
    onAuthStateChanged(getAuth(), () => { watchAdminDoc() })
  })
  // me 스토어의 uid가 변해도 재구독
  watch(() => (me?.auth?.value?.uid || me?.auth?.uid || me?.uid), watchAdminDoc)

  const isAdmin = computed(() => isAdminDoc.value)

  // ───────── 유틸: 참조/안전 저장 ─────────
  const marketingDocRef   = computed(() => fbDb ? doc(fbDb, 'config', 'marketing') : null)
  // ➜ 배너를 P/F로 분리
  const adBannersPColRef        = computed(() => fbDb ? collection(fbDb, 'config', 'marketing', 'adBannersP') : null)
  const adBannersFinderColRef   = computed(() => fbDb ? collection(fbDb, 'config', 'marketing', 'adBannersFinder') : null)
  const partnerCardsColRef      = computed(() => fbDb ? collection(fbDb, 'config', 'marketing', 'partnerCards') : null)


  // 🔧 레거시 키를 더 이상 자동 삭제하지 않음(호환 유지). 필요한 경우에만 아래 유틸을 수동 호출.
  async function safeSetMarketingDoc(patch = {}) {
    if (!marketingDocRef.value) return
    await setDoc(
      marketingDocRef.value,
      { ...patch, serverUpdatedAt: serverTimestamp(), updatedAt: Date.now() },
      { merge: true }
    )
  }

  // 필요시 콘솔에서 한 번에 정리하는 유틸(수동 실행 전용)
  async function shrinkMarketingDoc() {
    if (!marketingDocRef.value) return
    try {
      const snap = await getDoc(marketingDocRef.value)
      if (!snap.exists()) return
      const data = snap.data() || {}
      const toDelete = {}
      for (const k of ['bigImages','carousel']) { // ← 정말 무거운 키만 정리
        if (k in data) toDelete[k] = deleteField()
      }
      if (Object.keys(toDelete).length) {
        await setDoc(marketingDocRef.value, toDelete, { merge: true })
      }
    } catch (e) {
      console.warn('shrinkMarketingDoc fail:', e?.message || e)
    }
  }
  if (typeof window !== 'undefined') Object.assign(window, { __shrinkMarketingDoc: shrinkMarketingDoc })

  /* ───────── 유저 상태 정규화 ───────── */
  const state = computed(() => {
    const a = me?.auth?.value ?? me?.auth ?? {}
    const profile   = a.profile ?? me?.profile?.value ?? me?.profile ?? null
    const companyRaw= a.company ?? me?.company?.value ?? me?.company ?? profile?.company ?? null

    // role이 비어도 company/storeId가 있으면 기업으로 간주
    const roleGuess = a.type || a.role || (a.company || a.storeId ? 'biz' : (me?.role?.value || me?.role || 'guest'))
    const normType  = (isAdminDoc.value || roleGuess === 'biz' || companyRaw || a.storeId)
      ? 'company'
      : (roleGuess || 'guest')

    // ✅ 회사 정보가 없어도 운영자/기업 UI가 막히지 않게 빈 객체로 폴백
    const company = (normType === 'company') ? (companyRaw || {}) : null

    return {
      loggedIn: !!a.loggedIn,
      type: normType,              // ← 이제 운영자/기업이면 항상 'company'
      profile,
      company,
      storeId: a.storeId ?? companyRaw?.storeId ?? profile?.storeId ?? null,
      uid: a.uid || a.user?.uid || profile?.uid || me?.uid || null,
      companyId: company?.id || company?.docId || null,
      points: a.points,
      referral: a.referral,
      email: profile?.email || a?.email || ''
    }
  })

  // ===== 포인트 → 등급 계산 =====
  const userPoints = computed(() => Number(state.value?.points || 0))
  const _tierInfo  = computed(() => tierByPoints(userPoints.value))

  // 마이페이지에서 바로 쓸 수 있게 분해 노출
  const userTier         = computed(() => _tierInfo.value.current)      // { key,label,min,brands[] }
  const nextTier         = computed(() => _tierInfo.value.next)         // 다음 등급(없으면 null)
  const tierProgressPct  = computed(() => _tierInfo.value.progressPct)  // 0~100
  const tierPointToNext  = computed(() => _tierInfo.value.toNext)       // 다음 등급까지 남은 포인트


  /* ====== 운영자: 연장 단가/시간 유틸 ====== */
  const pricing = reactive({ extendUnit: 5000 })
  const pricingDocRef = computed(() => fbDb ? doc(fbDb, 'config', 'pricing') : null)
  async function loadPricing(){
    if (!pricingDocRef.value) return
    try{
      const s = await getDoc(pricingDocRef.value)
      const d = s.exists() ? (s.data() || {}) : {}
      pricing.extendUnit = Number(d.extendUnit || d.extendPrice || 5000)
    }catch(e){ console.warn('pricing 불러오기 실패:', e?.message || e) }
  }
  const unitDefault = computed(()=> Number(pricing.extendUnit || 5000))
  const ONE_DAY = 24*60*60*1000
  const toMs = (v) => v?.seconds ? v.seconds*1000 : (v instanceof Date ? v.getTime() : Number(v||0)||0)

  /* ====== 운영자: stores/partners 대기 목록 ====== */
  const admin = reactive({ pending: [], partnerPending: [], extendPending: [] })

  // 상세 라인(주소/운영시간/휴일/혜택) 생성 유틸
  const detailLinesOf = (src={}, kind='partner')=>{
    const clean = (s)=> (s==null || s===0 || s==='0') ? '' : String(s||'').trim()
    return [
      { k:'주소',    v: clean(src.address)  || '-' },
      { k:'운영시간', v: clean(src.hours)    || '-' },
      { k:'휴무',    v: clean(src.holiday)  || '-' },
      { k:'혜택',    v: clean(src.benefits) || '-' },
    ]
  }

  // data:URL 또는 http(s) URL을 받아 Storage 업로드(필요 시) 후 최종 URL 반환
  async function ensureUploaded(urlOrDataUrl, storagePath){
    const s = String(urlOrDataUrl || '')
    if (!s) return ''
    if (!s.startsWith('data:')) return s   // 이미 URL이면 그대로 사용

    // DataURL -> Blob
    const res = await fetch(s)
    const blob = await res.blob()
    const refx = sRef(fbStorage, storagePath)
    await uploadBytes(refx, blob, { contentType: blob.type || 'image/jpeg', cacheControl: 'public,max-age=86400' })
    const url = await getDownloadURL(refx)
    const v = Date.now().toString(36)
    return `${url}${url.includes('?') ? '&' : '?'}v=${v}`
  }

  async function loadAdminPending(){
    if (!isAdmin.value || !fbDb) return
    try{
      // 1) stores 대기 목록
      const snap = await getDocs(query(collection(fbDb,'stores'), where('applyStatus','==','pending')))
      const arr = []
      snap.forEach(d => arr.push({ id:d.id, ...d.data() }))

      // 2) connectRequests(pending) → storeId 기준으로 _reqId 매핑
      try {
        const cr = await getDocs(query(collection(fbDb,'connectRequests'), where('status','==','pending')))
        const byStore = new Map()
        cr.forEach(docu => {
          const x = docu.data() || {}
          if (x.storeId) byStore.set(String(x.storeId), docu.id)
        })
        for (const s of arr) {
          s._reqId = s._reqId || byStore.get(String(s.id)) || null
        }
      } catch (e) {
        console.warn('connectRequests 매핑 실패(무시):', e?.message || e)
      }

      // 세부 토글/라인 기본값 주입
      arr.forEach(s => { s._open = !!s._open; s._detail = detailLinesOf(s, 'store') })

      arr.sort((a,b)=> (b.updatedAt?.seconds||b.updatedAt||0) - (a.updatedAt?.seconds||a.updatedAt||0))
      admin.pending = arr
    }catch(e){
      console.warn('stores pending 불러오기 실패:', e?.message || e)
    }
  }
  const toggleStoreDetail = (s)=>{ if (!s) return; s._open = !s._open }

  async function loadPartnerPending(){
    if (!isAdmin.value || !fbDb) return
    try{
      const snap = await getDocs(query(collection(fbDb,'partnerRequests'), where('status','==','pending')))
      const arr = []
      snap.forEach(d => arr.push({ id:d.id, ...d.data() }))
      // 세부 토글/라인 기본값
      arr.forEach(p => { p._open = !!p._open; p._detail = detailLinesOf(p, 'partner') })
      arr.sort((a,b)=> (b.createdAt?.seconds||b.createdAt||0) - (a.createdAt?.seconds||a.createdAt||0))
      admin.partnerPending = arr
    }catch(e){
      console.warn('partnerRequests 불러오기 실패:', e?.message || e)
    }
  }

  /* ===== 연결요청 승인/거절 (stores 중심) ===== */
  async function approveReq(r){
    if (!confirm('승인하시겠습니까?')) return
    const storeId = String(r.storeId || r.id)
    try{
      await setDoc(doc(fbDb,'stores', storeId), {
        approved: true, approvedAt: serverTimestamp(), applyStatus: 'approved',
        exposure: { realtime:true, find:true, gangtalk:true, partners:true },
        updatedAt: serverTimestamp()
      }, { merge:true })

      if (r._reqId) {
        try{
          await setDoc(doc(fbDb,'connectRequests', String(r._reqId)), {
            status:'approved', reason:'', decidedAt: serverTimestamp()
          }, { merge:true })
        } catch(e) {
          console.warn('connectRequests 승인 스킵:', e?.code||e?.message||e)
        }
      }

      alert('승인 처리되었습니다.')
      loadAdminPending(); loadConnect()
    }catch(e){
      console.warn(e); alert('승인 중 오류가 발생했습니다.')
    }
  }
  async function rejectReq(r){
    const reason = prompt('거절 사유를 입력해 주세요.', r.reason || '')
    if (reason === null) return
    const storeId = String(r.storeId || r.id)
    try{
      await setDoc(doc(fbDb,'stores', storeId), {
        applyStatus:'rejected', lastRejectReason: reason, approved:false, updatedAt: serverTimestamp()
      }, { merge:true })

      if (r._reqId) {
        try{
          await setDoc(doc(fbDb,'connectRequests', String(r._reqId)), {
            status:'rejected', reason, decidedAt: serverTimestamp()
          }, { merge:true })
        } catch(e) {
          console.warn('connectRequests 거절 스킵:', e?.code||e?.message||e)
        }
      }

      alert('거절 처리되었습니다.')
      loadAdminPending(); loadConnect()
    }catch(e){
      console.warn(e); alert('거절 중 오류가 발생했습니다.')
    }
  }
  const approveStore = (s) => approveReq({ storeId:s.id, _reqId:s._reqId || null })
  const rejectStore  = (s) => rejectReq({ storeId:s.id, _reqId:s._reqId || null })

  /* ===== 연결요청 목록 (관리자/내 것) ===== */
  const conn = reactive({ list: [], my: [] })
  async function loadConnect(){
    if (!fbDb || !state.value.loggedIn) return
    try{
      let snap
      if (isAdmin.value) snap = await getDocs(query(collection(fbDb, 'connectRequests')))
      else snap = await getDocs(query(collection(fbDb, 'connectRequests'), where('ownerId', '==', String(state.value.uid))))
      const arr = []; snap.forEach(d => arr.push({ id:d.id, ...d.data() }))
      if (isAdmin.value) {
        await Promise.all(arr.map(async (r) => {
          try{
            if (!r.storeId) return
            const s = await getDoc(doc(fbDb, 'stores', String(r.storeId)))
            if (s.exists()) {
              r._store = s.data()
              if (!r.storeName) r.storeName = r._store.name || r.storeId
            }
          }catch{}
        }))
      }
      arr.sort((a,b)=>{
        const rank = (x)=> x.status==='pending'?0:(x.status==='approved'?1:2)
        const ca = (a.createdAt?.seconds || a.createdAt || 0)
        const cb = (b.createdAt?.seconds || b.createdAt || 0)
        return rank(a)-rank(b) || cb-ca
      })
      conn.list = arr
      conn.my   = arr.filter(r => r.ownerId === state.value.uid)
    }catch(e){
      console.warn('연결요청 불러오기 실패:', e?.message || e)
    }
  }

  /* ====== 연장신청: 타겟 메타 주입 ====== */
  function pick(obj, paths = []) {
    for (const p of paths) {
      const segs = String(p).split('.');
      let cur = obj, ok = true;
      for (const s of segs) { if (cur && s in cur) cur = cur[s]; else { ok=false; break } }
      if (ok && cur != null && cur !== '') return cur;
    }
    return null;
  }
  const toStr = (v)=> (v==null ? '' : String(v));
  const low = (v)=> toStr(v).toLowerCase();

  // pt_ 접두 강제
  const ensurePtId = (v) => {
    const s = toStr(v)
    if (!s) return ''
    return s.startsWith('pt_') ? s : `pt_${s}`
  }

  const targetOf = (r) => {
    const ttype = low(pick(r, [
      'targetType', 'target.type', 'target_type', 'meta.targetType', 'payload.targetType'
    ]));

    const tid        = pick(r, ['targetId','target.id'])
    const storeId    = pick(r, ['storeId','target.storeId'])
    const partnerId  = pick(r, ['partnerId','partner_id','target.partnerId'])
    const reqId      = pick(r, [
      'partnerRequestId','partner_request_id','requestId','reqId',
      'target.requestId','target.partnerRequestId',
      'meta.requestId','meta.partnerRequestId',
      'payload.requestId','payload.partnerRequestId','payload.partner_request_id'
    ])

    if (ttype === 'partner') {
      const id = toStr(partnerId || reqId || tid)
      return id ? { type: 'partner', id } : null
    }
    if (ttype === 'store') {
      const id = toStr(storeId || tid)
      return id ? { type: 'store', id } : null
    }

    const isPartnerHint = !!(partnerId || reqId || (toStr(tid).startsWith('pt_')))
    if (isPartnerHint) return { type: 'partner', id: toStr(partnerId || reqId || tid) }

    const id = toStr(storeId || tid)
    return id ? { type: 'store', id } : null
  };

  // r에 포함된 정보만으로 pt_형식 파트너ID 추출
  function canonicalPartnerIdFrom(r){
    const t = targetOf(r)
    if (t?.type !== 'partner') return ''
    const raw = pick(r, ['partnerId','partner_id']) || t.id || pick(r, ['partnerRequestId','partner_request_id','requestId','reqId']) || ''
    return ensurePtId(raw)
  }

  function applyPartnerMetaToExtend(r, id, d = {}){
    const catRaw = d.category || d.categoryRaw || r.partnerCategory || 'etc'
       const cat = normalizeCat(catRaw)
    r._type = 'partner'; r._target = d
    r._name = d.name || r.partnerName || id
    r._region = d.region || r.partnerRegion || ''
    r._category = cat
    r._thumb = d.thumb || d.image || r.partnerThumb || ''
    r.storeName = r.storeName || r._name
    r.storeRegion = r.storeRegion || r._region
    r.storeCategory = r.storeCategory || r._category
    r.storeThumb = r.storeThumb || r._thumb
    r.partnerId = ensurePtId(id)
    r._detail = detailLinesOf(d, 'partner')
  }

  let _mkCache = null;
  async function getMarketingCache(){
    try{
      if (_mkCache) return _mkCache;
      if (!marketingDocRef.value) return null;
      const s = await getDoc(marketingDocRef.value);
      const data = s.exists() ? (s.data()||{}) : {};
      const list = Array.isArray(data.partnerCards) ? data.partnerCards : [];
      const map = new Map();
      for (const c of list) { if (c?.id) map.set(String(c.id), c) }
      _mkCache = map;
      return _mkCache;
    }catch{ return null }
  }

  async function hydrateExtendMeta(r){
    const t = targetOf(r); if (!t) { r._type='unknown'; return }
    try{
      if (t.type === 'store'){
        const s = await getDoc(doc(fbDb,'stores', t.id))
        if (s.exists()){
          const d = s.data()||{}
          r._type = 'store'; r._target = d
          r._name = d.name || r.storeName || t.id
          r._region = d.region || r.storeRegion || ''
          r._category = d.category || r.storeCategory || 'etc'
          r._thumb = d.thumb || r.storeThumb || ''
          r.storeName = r._name; r.storeRegion = r._region; r.storeCategory = r._category; r.storeThumb = r._thumb
          r.storeId = t.id
          r._detail = detailLinesOf(d, 'store')
        } else {
          r._type = 'store'
        }
        return
      }

      let pid = canonicalPartnerIdFrom(r) || ensurePtId(t.id)
      let ps = await getDoc(doc(fbDb,'partners', pid))
      if (!ps.exists() && !pid.startsWith('pt_')) {
        pid = ensurePtId(pid)
        ps = await getDoc(doc(fbDb,'partners', pid))
      }
      if (ps.exists()){ applyPartnerMetaToExtend(r, pid, ps.data()||{}); return }

      const reqId = toStr(
        pick(r, ['partnerRequestId','partner_request_id','requestId','reqId',
                 'target.requestId','meta.requestId','payload.requestId']) ||
        pid.replace(/^pt_/, '')
      )
      if (reqId) {
        const req = await getDoc(doc(fbDb,'partnerRequests', reqId))
        if (req.exists()){
          applyPartnerMetaToExtend(r, ensurePtId(reqId), req.data()||{})
          return
        }
      }

      const cache = await getMarketingCache()
      const card = cache?.get(pid) || cache?.get(pid.replace(/^pt_/, ''))
      if (card){ applyPartnerMetaToExtend(r, pid, card); return }

      r._type='partner'
    }catch(e){ console.warn('hydrateExtendMeta 실패:', e?.message||e) }
  }

  async function loadExtendPending(){
    if (!isAdmin.value || !fbDb) return
    try{
      _mkCache = null;
      const snap = await getDocs(query(collection(fbDb,'extendRequests'), where('status','==','pending')))
      const arr = []
      snap.forEach(d => arr.push({ id:d.id, _open:false, ...d.data() }))
      await Promise.all(arr.map(hydrateExtendMeta))
      arr.sort((a,b)=> (b.createdAt?.seconds||b.createdAt||0) - (a.createdAt?.seconds||a.createdAt||0))
      admin.extendPending = arr
    }catch(e){
      console.warn('extendRequests 불러오기 실패:', e?.message || e)
    }
  }
  const toggleExtendDetail = async (r)=>{
    if (!r) return
    r._open = !r._open
    if (r._open && !r._target) { try{ await hydrateExtendMeta(r) }catch{} }
  }

  const unitOf  = (r)=> Number(r?.unit || unitDefault.value || 5000)
  const totalOf = (r)=> Math.max(0, Number(r?.days||0)) * unitOf(r)
  function fmtDate(msOrTs){
    const ms = msOrTs?.seconds ? msOrTs.seconds*1000 : Number(msOrTs||0)
    if (!ms) return '-'
    const d = new Date(ms); const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), da = String(d.getDate()).padStart(2,'0')
    return `${y}.${m}.${da}`
  }
  function previewAfterApprove(r){
    const baseEnd = toMs(r._target?.adEnd) || Date.now()
    const base = Math.max(baseEnd, Date.now())
    const plus = base + Math.max(0, Number(r.days||0)) * ONE_DAY
    const s = r._target?.adStart ? toMs(r._target.adStart) : Date.now()
    return `${fmtDate(s)} ~ ${fmtDate(plus)}`
  }

  /* 유틸 (표시/계산) */
  const bgStyle = (url)=> url ? ({ backgroundImage:`url(${url})` }) : ({})
  const timeAgo = (tsIn) => {
    const ms = tsIn?.seconds ? tsIn.seconds * 1000 : tsIn instanceof Date ? tsIn.getTime() : (typeof tsIn === 'number' ? tsIn : Number(tsIn || Date.now()))
    const sec = Math.floor((Date.now() - ms) / 1000)
    if (sec < 60) return `${sec}s`; const m = Math.floor(sec/60); if (m < 60) return `${m}분전`
    const h = Math.floor(m/60); if (h < 24) return `${h}시간전`; const d = Math.floor(h/24); return `${d}일전`
  }
  const daysBetween = (a,b)=>{
    const msA = a?.seconds ? a.seconds*1000 : Number(a||0)
    const msB = b?.seconds ? b.seconds*1000 : Number(b||0)
    if (!msA || !msB) return 0
    const ONE = 24*60*60*1000
    return Math.max(1, Math.round((msB - msA + 1) / ONE))
  }
  const adDaysOf  = (p) => daysBetween(p.adStart, p.adEnd)
  const adCostOf  = (p) => adDaysOf(p) * 5000
  const formatWon = (n)=> (Number(n||0)).toLocaleString('ko-KR') + '원'
  function hourlyOf(s){ return s?.hourly ?? s?.wage ?? s?.payPerHour ?? s?.hourPay ?? s?.hourlyPay ?? 0 }

  /* ───────── 스토어 카테고리 (인기순위용) ───────── */
  const storeCategoryOptions = [
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
  const storeCatLabel = (k)=> (storeCategoryOptions.find(o=>o.key===k)?.label || k)

  /* 카테고리(제휴) */
  const partnerCategoryOptions = [
    { key:'salon',  label:'미용실' }, { key:'nail',   label:'네일' }, { key:'ps',     label:'성형외과' },
    { key:'real',   label:'부동산' }, { key:'rental', label:'렌탈샵' }, { key:'fit',    label:'피트니스' },
    { key:'cafe',   label:'카페' },   { key:'etc',    label:'기타' },
  ]
  const catLabel = (k)=> (partnerCategoryOptions.find(o=>o.key===k)?.label || '기타')
  function normalizeCat(raw=''){
    const v = String(raw).trim().toLowerCase()
    if (!v) return 'etc'
    const hit = (arr)=> arr.some(w=>v.includes(w))
    if (['salon','hair'].includes(v) || hit(['미용','헤어','살롱'])) return 'salon'
    if (['nail'].includes(v)  || hit(['네일'])) return 'nail'
    if (['ps','plastic'].includes(v) || hit(['성형'])) return 'ps'
    if (['real','estate'].includes(v) || hit(['부동산'])) return 'real'
    if (['rental'].includes(v) || hit(['렌탈'])) return 'rental'
    if (['fit','fitness','pt','gym'].includes(v) || hit(['피트니스','헬스','pt'])) return 'fit'
    if (['cafe','coffee'].includes(v) || hit(['카페','커피'])) return 'cafe'
    return 'etc'
  }

  /* ===== 광고/제휴/기사한줄 편집 공용 ===== */
  // 제휴관(P) / 가게찾기(F) 각각 보관
  const adsP = reactive({ list: [] })   // 제휴관 배너(#1)
  const adsF = reactive({ list: [] })   // 가게찾기 배너(#2)

  // 하위 호환(기존 코드가 ads.list를 참조할 수 있으니 비워서 유지)
  const ads = reactive({ list: [] })

  const partners = reactive({ list: [] })
  const news = reactive({ list: [] })
  const savingAds = ref(false)
  const savingPartners = ref(false)
  const newsSaving = ref(false)

  // 날짜 input 보조 ⇄ ms 변환
  const dateStrOf = (v)=> {
    const ms = toMs(v); if (!ms) return ''
    const d = new Date(ms)
    const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), da = String(d.getDate()).padStart(2,'0')
    return `${y}-${m}-${da}`
  }
  const parseDateStr = (s)=>{
    const v = String(s||'').trim(); if (!v) return null
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m) return null
    const ms = new Date(Number(m[1]), Number(m[2])-1, Number(m[3]), 0, 0, 0, 0).getTime()
    return isFinite(ms) ? ms : null
  }

  /* ------- 태그/배너 텍스트 유틸 (추가) ------- */
  const trimStr = (v) => String(v ?? '').trim()
  const parseTags = (v) => String(v || '').split(',').map(s => s.trim()).filter(Boolean)

  // ad 객체의 title/desc/tags를 정규화하고 _hasText 플래그 부여
  function normalizeAdTexts(ad){
    const tags  = Array.isArray(ad.tags) ? ad.tags.map(trimStr).filter(Boolean) : parseTags(ad._tags)
    const _tags = (ad._tags ?? tags.join(', '))
    const _hasText = !!tags.length
    const tagPos = Array.isArray(ad.tagPos) ? ad.tagPos.slice() : []
    while (tagPos.length < Math.max(1, tags.length)) tagPos.push({ x:0.08 + tagPos.length*0.12, y:0.10 })
    const _imgIndex = Number.isFinite(ad._imgIndex) ? ad._imgIndex : 0
    const images = Array.isArray(ad.images) ? ad.images.slice() : (ad.img ? [ad.img] : [])

    const base = {
      ...ad,
      tags, _tags, _hasText,
      _hideAdBadge: true,
      images, _imgIndex,
      tagPos
    }
    delete base.title; delete base.desc
    return base
  }

  const adHasText = (ad) => !!(Array.isArray(ad?.tags) && ad.tags.some(t => trimStr(t)))

  // 태그 편집(드래그 순서 변경 지원)
  function addAdTag(idx, label=''){
    const it = ads.list[idx]; if (!it) return
    const t = trimStr(label); if (!Array.isArray(it.tags)) it.tags = parseTags(it._tags)
    if (t) { it.tags.push(t); it.tagPos.push({ x:0.08 + it.tags.length*0.12, y:0.10 }) }
    it._tags = (it.tags || []).join(', ')
    it._hasText = adHasText(it)
  }
  function removeAdTag(idx, tagIndex){
    const it = ads.list[idx]; if (!it || !Array.isArray(it.tags)) return
    if (tagIndex<0 || tagIndex>=it.tags.length) return
    it.tags.splice(tagIndex,1)
    it.tagPos.splice(tagIndex,1)
    it._tags = (it.tags || []).join(', ')
    it._hasText = adHasText(it)
  }
  function moveAdTag(idx, from, to){
    const it = ads.list[idx]; if (!it || !Array.isArray(it.tags)) return
    if (from===to) return
    const arr = it.tags; if (from<0 || from>=arr.length || to<0 || to>=arr.length) return
    const [x] = arr.splice(from,1); arr.splice(to,0,x)
    const [p] = it.tagPos.splice(from,1); it.tagPos.splice(to,0,p)
    it._tags = arr.join(', ')
  }
  function setAdTag(idx, tagIndex, label){
    const it = ads.list[idx]; if (!it || !Array.isArray(it.tags)) return
    if (tagIndex<0 || tagIndex>=it.tags.length) return
    it.tags[tagIndex] = trimStr(label)
    it.tags = it.tags.filter(Boolean)
    while (it.tagPos.length < it.tags.length) it.tagPos.push({ x:0.08 + it.tagPos.length*0.12, y:0.10 })
    it._tags = it.tags.join(', ')
    it._hasText = adHasText(it)
  }
  function syncTags(obj){ obj.tags = parseTags(obj._tags) }

  // 태그 드래그 포지션 저장(정규화 좌표)
  function setAdTagPosNormalized(adIndex, tagIndex, nx, ny){
    const it = ads.list[adIndex]; if (!it) return
    const clamp = (v, min=0, max=1)=> Math.max(min, Math.min(max, v))
    if (!Array.isArray(it.tagPos)) it.tagPos = []
    while (it.tagPos.length <= tagIndex) it.tagPos.push({ x:0.08, y:0.10 })
    it.tagPos[tagIndex] = { x: clamp(nx), y: clamp(ny) }
  }
  function setAdTagPosByPixel(adIndex, tagIndex, px, py, rect){
    if (!rect) return
    const nx = (px - rect.left) / rect.width
    const ny = (py - rect.top)  / rect.height
    setAdTagPosNormalized(adIndex, tagIndex, nx, ny)
  }
  function adTagPosStyle(adIndex, tagIndex){
    const it = ads.list[adIndex]; if (!it) return {}
    const p = it.tagPos?.[tagIndex] || { x:0.08, y:0.10 }
    return { position:'absolute', left: `${p.x*100}%`, top: `${p.y*100}%`, transform:'translate(-50%, -50%)' }
  }

  // 배너 추가(공용 UI는 그대로 ads.list를 씀)
  function addAd(){
    ads.list.push({
      id: `ad_${Date.now()}`,
      img:'', images:[], _imgIndex:0,
      tags:[], _tags:'', tagPos:[],
      _fileName:'', _open:true, _saving:false, _hasText:false,
      _hideAdBadge: true
    })
  }

  // 내부 공용: 주어진 박스(adsP/adsF)의 리스트를 해당 컬렉션에 저장
  async function persistAdsTo(box, colRef, indexKey, legacyAlso=false){
    if (!isAdmin.value || !marketingDocRef.value || !colRef?.value) return

    const index = []       // 가벼운 인덱스(id,img)
    const legacySlim = []  // 레거시 키(ads/banners/adBanners) 호환

    for (const ad of box.list){
      const imgs = Array.isArray(ad.images) && ad.images.length ? ad.images : (ad.img ? [ad.img] : [])
      const uploaded = []
      for (let i=0; i<Math.min(imgs.length, 5); i++){
        const u = await ensureUploaded(imgs[i], `marketing/${indexKey}/${ad.id || 'ad'}/${i}-${Date.now()}.jpg`)
        if (u) uploaded.push(u)
      }
      const sel = Math.max(0, Math.min(uploaded.length-1, Number(ad._imgIndex)||0))
      const img = uploaded[sel] || uploaded[0] || ''
      const row = {
        id: ad.id || `ad_${Date.now()}`,
        img,
        images: uploaded,
        tagPos: Array.isArray(ad.tagPos) ? ad.tagPos.map(p=>({x:Number(p.x)||0,y:Number(p.y)||0})) : [],
        tags: Array.isArray(ad.tags) ? ad.tags.map(t => String(t).trim()).filter(Boolean) : parseTags(ad._tags || '')
      }
      await setDoc(doc(colRef.value, String(row.id)), row, { merge:true })
      index.push({ id: row.id, img: row.img })
      legacySlim.push({ id: row.id, img: row.img, tags: row.tags, tagPos: row.tagPos })
    }

    const patch = { [indexKey]: legacySlim }
    if (legacyAlso){
      Object.assign(patch, { adBanners: legacySlim, banners: legacySlim, ads: legacySlim })
    }
    await safeSetMarketingDoc(patch)
  }

  // 실제 저장 버튼에서 호출: 제휴관(#1) / 가게찾기(#2)
  async function saveAdsP(){        // 제휴관
    try{ savingAds.value = true; await persistAdsTo(adsP, adBannersPColRef, 'adBannersP', true); alert('제휴관 배너가 저장되었습니다.') }
    catch(e){ console.warn('saveAdsP 실패:', e); alert('저장 중 오류가 발생했습니다.') }
    finally{ savingAds.value = false }
  }
  async function saveAdsF(){        // 가게찾기
    try{ savingAds.value = true; await persistAdsTo(adsF, adBannersFinderColRef, 'adBannersFinder'); alert('가게찾기 배너가 저장되었습니다.') }
    catch(e){ console.warn('saveAdsF 실패:', e); alert('저장 중 오류가 발생했습니다.') }
    finally{ savingAds.value = false }
  }

  // 삭제도 P/F에서 호출
  async function removeAdFrom(box, i){
    const ok = await confirmTwice('해당 광고배너를 삭제할까요?'); if (!ok) return
    box.list.splice(i,1)
    try{
      if (box === adsP) await persistAdsTo(adsP, adBannersPColRef, 'adBannersP', true)
      else await persistAdsTo(adsF, adBannersFinderColRef, 'adBannersFinder')
      alert('삭제되었습니다.')
    }catch{ alert('삭제 저장 중 오류가 발생했습니다.') }
  }

  function clearAdImage(idx){
    const it = ads.list[idx]; if(!it) return; it.img = ''; it.images = []; it._imgIndex = 0; it._fileName = ''
  }
  async function onPickAdImage(e, idx){
    const f = e.target.files?.[0]; if(!f) return
    const url = await fileToDataUrl(f, 1280, 0.8)
    const it = ads.list[idx]; if (!it) return
    it.img = url; it.images = [url]; it._imgIndex = 0; it._fileName = f.name
  }
  async function onPickAdImages(e, idx){
    const files = Array.from(e?.target?.files || [])
    if (!files.length) return
    const it = ads.list[idx]; if (!it) return
    const urls = []
    for (const f of files){ const u = await fileToDataUrl(f, 1280, 0.8); if (u) urls.push(u) }
    if (!urls.length) return
    it.images = urls
    it.img = urls[0]
    it._imgIndex = 0
    it._fileName = `${files.length} files`
  }
  function nextAdImage(idx, step=1){
    const it = ads.list[idx]; if(!it || !it.images?.length) return
    const n = it.images.length
    it._imgIndex = ( (it._imgIndex||0) + step + n ) % n
    it.img = it.images[it._imgIndex]
  }
  function prevAdImage(idx){ nextAdImage(idx, -1) }

  function toggleAd(idx){ const it = ads.list[idx]; if(!it) return; it._open = !it._open }
  function move(arr, idx, dir){
    const ni = idx + dir; if (ni < 0 || ni >= arr.length) return
    const [it] = arr.splice(idx,1); arr.splice(ni,0,it); if (arr === news.list) onNewsChange()
  }
  function dup(arr, idx){
    const it = JSON.parse(JSON.stringify(arr[idx] || {}))
    it.id = `${(it.id || 'item')}_${Math.random().toString(36).slice(2,7)}`
    arr.splice(idx+1, 0, it)
  }
  // 단일 배너 저장: 해당 아이템이 P/F 어디에 있는지 찾아서 저장
  async function saveAdOne(idx){
    if (!isAdmin.value || !marketingDocRef.value) return
    const it = ads.list[idx]; if(!it) return
    it._saving = true
    try{
      // P/F 중 어느 리스트에 들어있는지 판단
      const inP = adsP.list.find(a => a.id === it.id)
      const inF = adsF.list.find(a => a.id === it.id)
      if (inP) await persistAdsTo(adsP, adBannersPColRef, 'adBannersP', true)
      else if (inF) await persistAdsTo(adsF, adBannersFinderColRef, 'adBannersFinder')
      else {
        // UI가 ads.list만 보고 있을 수 있으니 기본은 제휴관(P)로 저장
        await persistAdsTo({ list:[it] }, adBannersPColRef, 'adBannersP', true)
      }
      alert('해당 광고배너가 저장되었습니다.')
      it._open = false
    }catch(e){ console.warn('saveAdOne 실패:', e); alert('저장 중 오류가 발생했습니다.') }
    finally{ it._saving = false }
  }

  // 전체 저장 버튼(하위호환): 제휴관(P) 먼저, 그 다음 가게찾기(F)
  async function saveAds(){
    try{
      savingAds.value = true
      await persistAdsTo(adsP, adBannersPColRef, 'adBannersP', true)
      await persistAdsTo(adsF, adBannersFinderColRef, 'adBannersFinder')
      alert('광고배너가 저장되었습니다.')
    }catch(e){ console.warn('saveAds 실패:', e); alert('저장 중 오류가 발생했습니다.') }
    finally{ savingAds.value = false }
  }

  function addPartner(){
    partners.list.push({
      id:`pt_${Date.now()}`, name:'', region:'', category:'', thumb:'',
      images:[], _imgIndex:0,
      desc:'', address:'', hours:'', holiday:'', benefits:'',
      tags:[], _tags:'', _fileName:'', _open:true, _saving:false,
      adStart:null, adEnd:null,
      _adStartStr:'', _adEndStr:''
    })
  }

  async function persistPartnerCards(){
    if (!isAdmin.value || !marketingDocRef.value || !partnerCardsColRef.value) return

    const index = []
    const miniObj = {}   // 레거시 호환(최소 정보)
    const miniArr = []   // partnerCardList 호환
    for (const raw of partners.list){
      const id = ensurePtId(raw.id || `pt_${Date.now()}`)
      const startMs = parseDateStr(raw._adStartStr)
      const endMs   = parseDateStr(raw._adEndStr)
      const body = {
        id,
        name: raw.name || '', region: raw.region || '',
        category: normalizeCat(raw.category || 'etc'),
        tags: Array.isArray(raw.tags) ? raw.tags.map(t=>String(t).trim()).filter(Boolean) : parseTags(raw._tags || ''),
        desc: raw.desc || '', address: raw.address || '', hours: raw.hours || '', holiday: raw.holiday || '', benefits: raw.benefits || '',
        adStart: (startMs ?? raw.adStart ?? null),
        adEnd:   (endMs   ?? raw.adEnd   ?? null),
        rating: Number(raw.rating || 4.5),
        images: Array.isArray(raw.images) ? raw.images.slice() : (raw.thumb ? [raw.thumb] : []),
        thumb: raw.thumb || '',
        updatedAt: serverTimestamp(),
      }

      const uploaded = []
      for (let i=0; i<Math.min(body.images.length, 8); i++){
        const u = await ensureUploaded(body.images[i], `marketing/partnerCards/${id}/img-${i}-${Date.now()}.jpg`)
        if (u) uploaded.push(u)
      }

      const sel = Math.max(0, Math.min(uploaded.length - 1, Number(raw._imgIndex) || 0))
      body.images = uploaded
      body.thumb  = uploaded[sel] || uploaded[0] || body.thumb || ''

      await setDoc(doc(fbDb, 'config', 'marketing', 'partnerCards', id), body, { merge:true })

      index.push({
        id, name: body.name, region: body.region,
        category: body.category, thumb: body.thumb,
        adStart: body.adStart || null, adEnd: body.adEnd || null,
        rating: body.rating || null
      })

      miniObj[id] = {
        id, name: body.name, region: body.region,
        category: body.category, thumb: body.thumb,
        adStart: body.adStart || null, adEnd: body.adEnd || null,
        rating: body.rating || null
      }
      miniArr.push(miniObj[id])
    }

    await safeSetMarketingDoc({
      partnerCardIndex: index,
      partnerCards: miniArr,         // 배열 호환
      partnerCardList: miniArr       // 과거 키 호환
    })
  }

  async function removePartner(i){
    const it = partners.list[i]; if(!it) return
    const ok = await confirmTwice('해당 제휴업체 카드를 삭제할까요?'); if (!ok) return
    const removed = partners.list.splice(i,1)[0]
    try{
      await persistPartnerCards()
      if (removed?.id){ try{ await deleteDoc(doc(fbDb,'partners', String(removed.id))) }catch(e){ console.warn('partners doc 삭제 실패(무시):', e?.message) } }
    }catch(e){
      console.warn('removePartner persist error:', e); alert('삭제 저장 중 오류가 발생했습니다.')
    }
  }
  function clearPartnerImage(idx){
    const it = partners.list[idx]; if(!it) return; it.thumb = ''; it.images=[]; it._imgIndex=0; it._fileName = ''
  }
  async function onPickPartnerImage(e, idx){
    const f = e.target.files?.[0]; if(!f) return
    const url = await fileToDataUrl(f, 1280, 0.8)
    const it = partners.list[idx]; if (!it) return
    it.thumb = url; it.images=[url]; it._imgIndex=0; it._fileName = f.name
  }
  async function onPickPartnerImages(e, idx){
    const files = Array.from(e?.target?.files || [])
    if (!files.length) return
    const it = partners.list[idx]; if (!it) return
    const urls = []
    for (const f of files){ const u = await fileToDataUrl(f, 1280, 0.8); if (u) urls.push(u) }
    if (!urls.length) return
    it.images = urls
    it.thumb = urls[0]
    it._imgIndex = 0
    it._fileName = `${files.length} files`
  }
  function nextPartnerImage(idx, step=1){
    const it = partners.list[idx]; if(!it || !it.images?.length) return
    const n = it.images.length
    it._imgIndex = ((it._imgIndex||0) + step + n) % n
    it.thumb = it.images[it._imgIndex]
  }
  function prevPartnerImage(idx){ nextPartnerImage(idx, -1) }

  function setPartnerImageIndex(idx, i){
    const it = partners.list[idx]; if(!it || !Array.isArray(it.images) || !it.images.length) return
    const n = it.images.length
    const ni = Math.max(0, Math.min(n - 1, Number(i) || 0))
    it._imgIndex = ni
    it.thumb = it.images[ni]
  }

  function togglePartner(idx){ const it = partners.list[idx]; if(!it) return; it._open = !it._open }

  async function savePartnerOne(idx){
    if (!isAdmin.value || !marketingDocRef.value || !partnerCardsColRef.value) return
    const it = partners.list[idx]; if(!it) return
    it._saving = true
    try{
      const id = ensurePtId(it.id || `pt_${Date.now()}`)
      const norm = normalizeCat(it.category)
      const tags = Array.isArray(it.tags) ? it.tags.map(t=>String(t).trim()).filter(Boolean) : parseTags(it._tags || '')
      const startMs = parseDateStr(it._adStartStr)
      const endMs   = parseDateStr(it._adEndStr)

      const imgs = Array.isArray(it.images) ? it.images.slice() : (it.thumb ? [it.thumb] : [])
      const uploaded = []
      for (let i=0; i<Math.min(imgs.length, 8); i++){
        uploaded.push(await ensureUploaded(imgs[i], `marketing/partnerCards/${id}/img-${i}-${Date.now()}.jpg`))
      }

      const sel = Math.max(0, Math.min(uploaded.length - 1, Number(it._imgIndex) || 0))
      const thumb = uploaded[sel]
        || (await ensureUploaded(it.thumb || '', `marketing/partnerCards/${id}/thumb-${Date.now()}.jpg`))
        || ''

      await setDoc(doc(fbDb, 'partners', id), {
        name: it.name || '', region: it.region || '', category: norm, categoryRaw: it.category || norm,
        thumb, image: thumb, link: it.link || '', rating: Number(it.rating || 4.5),
        tags, desc: it.desc || '', address: it.address || '', hours: it.hours || '', holiday: it.holiday || '', benefits: it.benefits || '',
        images: uploaded, adStart: (startMs ?? it.adStart ?? null), adEnd: (endMs ?? it.adEnd ?? null),
        updatedAt: serverTimestamp(), createdAt: it.createdAt || serverTimestamp(),
      }, { merge: true })

      await setDoc(doc(fbDb, 'config', 'marketing', 'partnerCards', id), {
        name: it.name || '', region: it.region || '', category: norm,
        thumb, images: uploaded,
        desc: it.desc || '', address: it.address || '', hours: it.hours || '', holiday: it.holiday || '', benefits: it.benefits || '',
        tags, adStart: (startMs ?? it.adStart ?? null), adEnd: (endMs ?? it.adEnd ?? null),
        rating: Number(it.rating || 4.5), updatedAt: serverTimestamp()
      }, { merge:true })

      // 인덱스 갱신 (가벼운 필드만) + 레거시 키 갱신
      const idxSnap = await getDoc(marketingDocRef.value)
      const idxData = idxSnap.exists() ? (idxSnap.data() || {}) : {}
      const list = Array.isArray(idxData.partnerCardIndex) ? idxData.partnerCardIndex.slice() : []
      const pos = list.findIndex(x => String(x.id||'') === id)
      const row = { id, name: it.name || '', region: it.region || '', category: norm, thumb, adStart: (startMs ?? it.adStart ?? null), adEnd: (endMs ?? it.adEnd ?? null), rating: Number(it.rating || 4.5) }
      if (pos >= 0) list[pos] = row; else list.unshift(row)

      await safeSetMarketingDoc({
        partnerCardIndex: list,
        partnerCards: list,       // 배열 호환
        partnerCardList: list     // 예전 키
      })

      alert('해당 제휴업체 카드가 저장되었습니다.')
      it._open = false
    }catch(e){ console.warn('savePartnerOne 실패:', e); alert('저장 중 오류가 발생했습니다.') }
    finally{ it._saving = false }
  }

  async function savePartners(){ try{ savingPartners.value = true; await persistPartnerCards(); alert('제휴업체 카드가 저장되었습니다.') }catch(e){ console.warn('savePartners 실패:', e); alert('저장 중 오류가 발생했습니다.') } finally{ savingPartners.value = false } }

  async function patchMarketingPartnerCard(id, start, end){
    if (!marketingDocRef.value || !id) return
    await setDoc(doc(fbDb,'config','marketing','partnerCards', String(id)), {
      adStart: start, adEnd: end, updatedAt: serverTimestamp()
    }, { merge:true })

    // 인덱스의 해당 항목만 날짜 업데이트
    const snap = await getDoc(marketingDocRef.value)
    const data = snap.exists() ? (snap.data() || {}) : {}
    const list = Array.isArray(data.partnerCardIndex) ? data.partnerCardIndex.slice() : []
    const i = list.findIndex(x => String(x.id||'') === String(id))
    if (i >= 0) {
      list[i] = { ...list[i], adStart: start, adEnd: end }
    } else {
      list.unshift({ id: String(id), name:'', region:'', category:'etc', thumb:'', adStart:start, adEnd:end, rating:0 })
    }
    await safeSetMarketingDoc({
      partnerCardIndex: list,
      partnerCards: list,
      partnerCardList: list
    })
  }

  /* 제휴 등록신청 승인/거절 */
  async function approvePartnerReq(r){
    if (!confirm('제휴업체 등록신청을 승인할까요?')) return
    try{
      await setDoc(doc(fbDb,'partnerRequests', r.id), {
        status:'approved', reason:'', decidedAt: serverTimestamp()
      }, { merge:true })

      const docId = ensurePtId(r.partnerId || r.id)
      await setDoc(doc(fbDb,'partners', docId), {
        name: r.name||'', region: r.region||'',
        category: normalizeCat(r.category || 'etc'),
        desc: r.desc||'', address: r.address||'', hours: r.hours||'',
        holiday: r.holiday||'', benefits: r.benefits||'',
        tags: Array.isArray(r.tags) ? r.tags : [],
        thumb: r.thumb||'', rating: Number(r.rating||4.5),
        adStart: r.adStart || null, adEnd: r.adEnd || null,
        createdAt: r.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge:true })

      // 인덱스/서브컬렉션 및 레거시 키 반영
      await setDoc(doc(fbDb, 'config', 'marketing', 'partnerCards', docId), {
        name: r.name||'', region:r.region||'', category: normalizeCat(r.category || 'etc'),
        thumb: r.thumb||'', images: r.thumb ? [r.thumb] : [],
        desc: r.desc||'', address:r.address||'', hours:r.hours||'', holiday:r.holiday||'', benefits:r.benefits||'',
        tags: Array.isArray(r.tags) ? r.tags : [],
        adStart: r.adStart || null, adEnd: r.adEnd || null,
        rating: Number(r.rating||4.5), updatedAt: serverTimestamp()
      }, { merge:true })

      const idxSnap = await getDoc(marketingDocRef.value)
      const idxData = idxSnap.exists() ? (idxSnap.data() || {}) : {}
      const list = Array.isArray(idxData.partnerCardIndex) ? idxData.partnerCardIndex.slice() : []
      const i = list.findIndex(x => String(x.id||'') === docId)
      const row = { id: docId, name: r.name||'', region:r.region||'', category: normalizeCat(r.category||'etc'), thumb: r.thumb||'', adStart: r.adStart||null, adEnd: r.adEnd||null, rating: Number(r.rating||4.5) }
      if (i >= 0) list[i] = row; else list.unshift(row)
      await safeSetMarketingDoc({
        partnerCardIndex: list,
        partnerCards: list,
        partnerCardList: list
      })

      alert('승인 처리되었습니다.')
      await loadPartnerPending()
      await reloadConfig()
    }catch(e){
      console.warn(e)
      alert('승인 중 오류가 발생했습니다.')
    }
  }

  async function rejectPartnerReq(r){
    const reason = prompt('거절 사유를 입력해 주세요.', r.reason || '')
    if (reason === null) return
    try{
      await setDoc(doc(fbDb,'partnerRequests', r.id), {
        status:'rejected', reason, decidedAt: serverTimestamp()
      }, { merge:true })

      const id = ensurePtId(r.partnerId || r.id)
      const snap = await getDoc(marketingDocRef.value)
      if (snap.exists()){
        const data = snap.data() || {}
        const list = Array.isArray(data.partnerCardIndex) ? data.partnerCardIndex.slice() : []
        const next = list.filter(x => String(x.id || '') !== String(id))
        await safeSetMarketingDoc({ partnerCardIndex: next, partnerCards: next, partnerCardList: next })
      }
      alert('거절 처리되었습니다.')
      await loadPartnerPending()
      await reloadConfig()
    }catch(e){
      console.warn(e)
      alert('승인 중 오류가 발생했습니다.')
    }
  }

  async function approveExtendReq(r){
    if (!confirm('연장신청을 승인할까요?')) return
    try{
      const t = targetOf(r); if (!t){ alert('대상 ID가 없어 처리할 수 없습니다.'); return }
      let start = Date.now(), end = Date.now()

      if (t.type === 'store'){
        const sref = doc(fbDb,'stores', t.id)
        const ss = await getDoc(sref); const sd = ss.exists()? (ss.data()||{}) : {}
        const base = Math.max(toMs(sd.adEnd), Date.now())
        end = base + Math.max(0, Number(r.days||0))*ONE_DAY
        start = toMs(sd.adStart) || Date.now()
        await setDoc(sref, { adStart: start, adEnd: end, updatedAt: serverTimestamp() }, { merge:true })
      } else {
        let pid = canonicalPartnerIdFrom(r) || ensurePtId(t.id)
        const pref = doc(fbDb,'partners', pid)
        const ps = await getDoc(pref)

        if (!ps.exists()){
          const reqId = (pick(r, ['partnerRequestId','partner_request_id','requestId','reqId']) || '').toString() || pid.replace(/^pt_/,'')
          if (reqId){
            try {
              const req = await getDoc(doc(fbDb,'partnerRequests', reqId))
              if (req.exists()){
                const d = req.data()||{}
                await setDoc(pref, {
                  name: d.name || '', region: d.region || '',
                  category: normalizeCat(d.category || 'etc'),
                  thumb: d.thumb || d.image || '',
                  createdAt: d.createdAt || serverTimestamp(),
                  updatedAt: serverTimestamp()
                }, { merge:true })
              }
            } catch (e) { console.warn('partnerRequests->partners 보강 실패(무시):', e?.message) }
          }
        }

        const pdSnap = await getDoc(pref)
        const pd = pdSnap.exists()? (pdSnap.data()||{}) : {}
        const base = Math.max(toMs(pd.adEnd), Date.now())
        end = base + Math.max(0, Number(r.days||0))*ONE_DAY
        start = toMs(pd.adStart) || Date.now()
        await setDoc(pref, { adStart: start, adEnd: end, updatedAt: serverTimestamp() }, { merge:true })
        await patchMarketingPartnerCard(pid, start, end)
      }

      await setDoc(doc(fbDb,'extendRequests', String(r.id)), {
        status:'approved', decidedAt: serverTimestamp(),
        amount: totalOf(r), unit: unitOf(r),
        targetType: t.type,
        targetId: t.type === 'partner' ? (canonicalPartnerIdFrom(r) || ensurePtId(t.id)) : t.id
      }, { merge:true })

      alert('승인 처리되었습니다.')
      await loadExtendPending()
    }catch(e){
      console.warn('approveExtendReq 실패:', e?.message||e)
      alert('승인 중 오류가 발생했습니다.')
    }
  }
  async function rejectExtendReq(r){
    const reason = prompt('거절 사유를 입력해 주세요.', r.reason || '')
    if (reason === null) return
    try{
      await setDoc(doc(fbDb,'extendRequests', String(r.id)), {
        status:'rejected', reason, decidedAt: serverTimestamp()
      }, { merge:true })
      alert('거절 처리되었습니다.')
      await loadExtendPending()
    }catch(e){
      console.warn('rejectExtendReq 실패:', e?.message||e)
      alert('승인 중 오류가 발생했습니다.')
    }
  }

  /* 상세: 라우팅 대신 토글(후방호환) */
  function detailTargetOf(r){
    const t = targetOf(r)
    if (!t) return null
    if (t.type === 'store') return { kind:'store', id:String(t.id) }
    const pid = canonicalPartnerIdFrom(r) || ensurePtId(t.id)
    return { kind:'partner', id: pid }
  }
  function openExtendDetail(r/*, router*/){ toggleExtendDetail(r) }
  function openStoreDetail(s/*, router*/){ toggleStoreDetail(s) }
  function openPartnerReqDetail(p/*, router*/){ p && (p._open = !p._open) }
  const openPendingDetail = (x/*, router*/)=>{ (x && (x._open = !x._open)) }

  /* 기사한줄 */
  function addNewsTop(){
    news.list.unshift({ id:`news_${Date.now()}`, text:'', badge:'NEW', createdAt: Date.now(), author: displayNick.value || '운영자' })
  }
  async function saveNewsline(){
    if (!isAdmin.value || !marketingDocRef.value) return
    newsSaving.value = true
    try{
      const payload = news.list.map(n => ({
        id: n.id || `news_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
        text: String(n.text || '').trim(), badge: n.badge ? 'NEW' : '',
        createdAt: n.createdAt || Date.now(), author: n.author || displayNick.value || '관리자'
      })).filter(n => n.text)
      await safeSetMarketingDoc({ newsline: payload })
      const compatibleItems = payload.map(p => ({ id: p.id, title: p.text, text: p.text, createdAt: p.createdAt, isNew: p.badge === 'NEW' }))
      await setDoc(doc(fbDb, 'config', 'news'), { items: compatibleItems, updatedAt: serverTimestamp() }, { merge: true })
    } catch(e) {
      console.warn('saveNewsline 실패:', e); alert('기사한줄 저장 중 오류가 발생했습니다.')
    } finally { newsSaving.value = false }
  }
  async function removeNews(idx){
    const ok = await confirmTwice('해당 기사를 삭제할까요?'); if (!ok) return
    news.list.splice(idx,1); onNewsChange()
  }
  let newsTimer = null
  function onNewsChange(){ if (newsTimer) clearTimeout(newsTimer); newsTimer = setTimeout(saveNewsline, 600) }

  /* ───────── 운영자: 카테고리 Top 순위 편집 ───────── */
  const topRank = reactive({
    map: {},        // 카테고리 → storeId[]
    preview: {},    // 카테고리 → 간단 메타 프리뷰
    saving: false,
    limitDefault: 5,
  })

  const _storeMetaCache = new Map() // id -> {id,name,region,thumb}
  async function getStoreMeta(id){
    const key = String(id||''); if (!key) return null
    if (_storeMetaCache.has(key)) return _storeMetaCache.get(key)
    try{
      const s = await getDoc(doc(fbDb,'stores', key))
      if (!s.exists()) { _storeMetaCache.set(key, null); return null }
      const d = s.data()||{}
      const m = { id:key, name:d.name||key, region:d.region||'', thumb:d.thumb||'' }
      _storeMetaCache.set(key, m); return m
    }catch{ _storeMetaCache.set(key, null); return null }
  }

  function ensureRankCategory(cat){
    const c = String(cat||'').trim()
    if (!c) return
    if (!Array.isArray(topRank.map[c])) topRank.map[c] = []
    if (!Array.isArray(topRank.preview[c])) topRank.preview[c] = []
  }

  async function syncTopPreview(category){
    ensureRankCategory(category)
    const ids = (topRank.map[category] || []).slice(0, 50)
    const metas = await Promise.all(ids.map(getStoreMeta))
    topRank.preview[category] = metas.filter(Boolean)
  }

  async function loadTopRanks(){
    if (!marketingDocRef.value) return
    try{
      const s = await getDoc(marketingDocRef.value)
      const d = s.exists() ? (s.data()||{}) : {}
      const fromArr = (Array.isArray(d.topRanks) && d.topRanks.every(x => Array.isArray(x?.ids))) ? d.topRanks : null
      const fromObj = (d.topRanks && typeof d.topRanks === 'object' && !Array.isArray(d.topRanks)) ? d.topRanks : null
      const map = {}

      if (fromObj) {
        Object.keys(fromObj).forEach(k => { map[k] = Array.isArray(fromObj[k]) ? fromObj[k].map(String) : [] })
      } else if (fromArr) {
        fromArr.forEach(r => { if (r?.category) map[String(r.category)] = (Array.isArray(r.ids) ? r.ids : []).map(String) })
      } else {
        for (const o of storeCategoryOptions) map[o.key] = []
      }

      topRank.map = map
      await Promise.all(Object.keys(map).map(syncTopPreview))
    }catch(e){
      console.warn('loadTopRanks 실패:', e?.message||e)
    }
  }

  async function saveTopRanks(){
    if (!marketingDocRef.value) return
    try{
      topRank.saving = true
      await setDoc(
        marketingDocRef.value,
        { topRanks: topRank.map, ranksUpdatedAt: serverTimestamp(), updatedAt: Date.now() },
        { merge:true }
      )
      alert('인기 순위가 저장되었습니다.')
    }catch(e){
      console.warn('saveTopRanks 실패:', e?.message||e)
      alert('저장 중 오류가 발생했습니다.')
    }finally{
      topRank.saving = false
    }
  }

  function setTopRank(category, ids = []){
    ensureRankCategory(category)
    topRank.map[category] = (ids || []).map(String)
    syncTopPreview(category)
  }
  function addTopRankItem(category, storeId){
    ensureRankCategory(category)
    const id = String(storeId||'').trim(); if (!id) return
    const arr = topRank.map[category]
    if (!arr.includes(id)) arr.push(id)
    syncTopPreview(category)
  }
  function removeTopRankItem(category, idx){
    ensureRankCategory(category)
    const arr = topRank.map[category]
    if (idx < 0 || idx >= arr.length) return
    arr.splice(idx, 1)
    syncTopPreview(category)
  }
  function moveTopRankItem(category, idx, dir){
    ensureRankCategory(category)
    const arr = topRank.map[category]
    const ni = idx + dir
    if (ni < 0 || ni >= arr.length) return
    const [x] = arr.splice(idx,1); arr.splice(ni,0,x)
    syncTopPreview(category)
  }

  /* 설정 불러오기 (구데이터 완전 호환) */
  async function reloadConfig(){
    if (!marketingDocRef.value) return
    try{
      const snap = await getDoc(marketingDocRef.value)
      const data = snap.exists() ? (snap.data() || {}) : {}

      // 1) 광고 배너 기본 목록 (finder 키까지 폭넓게 폴백)
      // === 1) 광고 배너 기본 목록: P(제휴관) / F(가게찾기) 분리 로드 ===

      // ---------- 제휴관(P) ----------
      let rawAdsP =
        (Array.isArray(data.adBannersP) && data.adBannersP) ||       // 신규 키
        (Array.isArray(data.adBanners)  && data.adBanners)  ||       // 레거시 호환
        (Array.isArray(data.banners)    && data.banners)    ||       // 레거시 호환
        (Array.isArray(data.ads)        && data.ads)        ||       // 레거시 호환
        (data.adBanners && typeof data.adBanners === 'object' && !Array.isArray(data.adBanners)
          ? Object.keys(data.adBanners).map(k => ({ id:k, ...(data.adBanners[k]||{}) }))
          : null)

      if (!rawAdsP || !rawAdsP.length) {
        // 서브컬렉션 우선: adBannersP
        try {
          const subP = await getDocs(collection(fbDb,'config','marketing','adBannersP'))
          const temp = []
          subP.forEach(d => temp.push({ id:d.id, ...(d.data()||{}) }))
          if (temp.length) rawAdsP = temp
        } catch (e) {
          console.warn('adBannersP subcollection load 실패:', e?.message||e)
        }
      }
      // 구(아주 예전) 최후 폴백: config/ads
      if (!rawAdsP || !rawAdsP.length) {
        try {
          const old = await getDoc(doc(fbDb,'config','ads'))
          if (old.exists()) {
            const a = old.data()||{}
            rawAdsP =
              (Array.isArray(a.items) && a.items) ||
              (Array.isArray(a.banners) && a.banners) ||
              (a.items && typeof a.items === 'object' && !Array.isArray(a.items)
                ? Object.keys(a.items).map(k => ({ id:k, ...(a.items[k]||{}) }))
                : [])
          }
        } catch (e) {
          console.warn('config/ads 폴백 로드 실패(P):', e?.message||e)
        }
      }
      rawAdsP = rawAdsP || []

      // ---------- 가게찾기(F) ----------
      let rawAdsF =
        (Array.isArray(data.adBannersFinder) && data.adBannersFinder) ||  // 신규 키
        (Array.isArray(data.finderBanners)   && data.finderBanners)   ||  // 레거시 호환
        (Array.isArray(data.finderAds)       && data.finderAds)       ||  // 레거시 호환
        null

      if (!rawAdsF || !rawAdsF.length) {
        try {
          const subF = await getDocs(collection(fbDb,'config','marketing','adBannersFinder'))
          const temp = []
          subF.forEach(d => temp.push({ id:d.id, ...(d.data()||{}) }))
          if (temp.length) rawAdsF = temp
        } catch (e) {
          console.warn('adBannersFinder subcollection load 실패:', e?.message||e)
        }
      }
      rawAdsF = rawAdsF || []

      // 공통 정규화 도우미
      const toAdUi = (x) => ({
        id: x.id || x.key || `ad_${Date.now()}`,
        tags:  Array.isArray(x.tags) ? x.tags
              : String(x._tags || x.tag || x.tagsStr || '').split(',').map(s=>s.trim()).filter(Boolean),
        img:   x.img || x.image || (Array.isArray(x.images) ? x.images[0] : ''),
        images: Array.isArray(x.images) ? x.images.slice()
              : ((x.img || x.image) ? [x.img || x.image] : []),
        tagPos: Array.isArray(x.tagPos) ? x.tagPos
              : (Array.isArray(x.tags) ? new Array(x.tags.length).fill({x:0.08,y:0.10}) : [])
      })

      // 각각 UI 필드 보강
      const mkUiList = (raw) => raw.map(toAdUi).map(x => ({
        ...x,
        images: Array.isArray(x.images) ? x.images.slice() : (x.img ? [x.img] : []),
        _imgIndex: 0,
        _tags: Array.isArray(x.tags) ? x.tags.join(', ') : (x._tags || ''),
        _fileName:'', _open:false, _saving:false
      }))

      adsP.list = mkUiList(rawAdsP)  // 제휴관
      adsF.list = mkUiList(rawAdsF)  // 가게찾기

      // (구 하위호환: 기존 코드가 ads.list를 그릴 수도 있어 첫 번째 세트만 복사)
      ads.list = mkUiList(rawAdsP)
      // 이미 위에서 adsP.list / adsF.list를 만들었고,
      // 하위호환만 유지하면 됩니다.
      ads.list = adsP.list.slice()

      // 2) 제휴업체 카드
      const indexList = Array.isArray(data.partnerCardIndex) ? data.partnerCardIndex : []
      let ptList = []
      try{
        const snap2 = await getDocs(collection(fbDb, 'config', 'marketing', 'partnerCards'))
        snap2.forEach(d => ptList.push({ id:d.id, ...(d.data() || {}) }))
      }catch(e){
        console.warn('partnerCards subcollection load 실패:', e?.message || e)
      }

      if (!ptList.length) {
        const rawCards =
          (Array.isArray(data.partnerCards) && data.partnerCards) ||
          (data.partnerCards && typeof data.partnerCards === 'object' && !Array.isArray(data.partnerCards)
            ? Object.keys(data.partnerCards).map(k => ({ id:k, ...(data.partnerCards[k]||{}) }))
            : []) ||
          (Array.isArray(data.partnerCardList) && data.partnerCardList) ||
          []
        if (rawCards.length) {
          ptList = rawCards.map(x => ({
            id: ensurePtId(x.id || x.key || `pt_${Date.now()}`),
            name: x.name || '',
            region: x.region || '',
            category: normalizeCat(x.category || x.categoryRaw || 'etc'),
            thumb: x.thumb || x.image || '',
            image: x.image || x.thumb || '',
            images: Array.isArray(x.images) ? x.images.slice()
                  : ((x.thumb || x.image) ? [x.thumb || x.image] : []),
            desc: x.desc || x.description || '',
            address: x.address || '',
            hours: x.hours || '',
            holiday: x.holiday || '',
            benefits: x.benefits || '',
            tags: Array.isArray(x.tags) ? x.tags : parseTags(x._tags || ''),
            adStart: x.adStart || null, adEnd: x.adEnd || null,
            rating: Number(x.rating || 4.5)
          }))
        }
      }

      if (!ptList.length) {
        try {
          const ps = await getDocs(collection(fbDb,'partners'))
          const temp = []
          ps.forEach(d => {
            const x = d.data() || {}
            temp.push({
              id: ensurePtId(d.id),
              name: x.name || '',
              region: x.region || '',
              category: normalizeCat(x.category || x.categoryRaw || 'etc'),
              thumb: x.thumb || x.image || '',
              image: x.image || x.thumb || '',
              images: Array.isArray(x.images) ? x.images.slice()
                    : ((x.thumb || x.image) ? [x.thumb || x.image] : []),
              desc: x.desc || x.description || '',
              address: x.address || '',
              hours: x.hours || '',
              holiday: x.holiday || '',
              benefits: x.benefits || '',
              tags: Array.isArray(x.tags) ? x.tags : parseTags(x._tags || ''),
              adStart: x.adStart || null,
              adEnd: x.adEnd || null,
              rating: Number(x.rating || 4.5)
            })
          })
          if (temp.length) ptList = temp
        } catch (e) {
          console.warn('partners 컬렉션 폴백 로드 실패:', e?.message||e)
        }
      }

      if (!ptList.length && indexList.length) {
        ptList = indexList.map(x => ({
          id: ensurePtId(x.id),
          name: x.name || '',
          region: x.region || '',
          category: normalizeCat(x.category || 'etc'),
          thumb: x.thumb || '',
          images: x.thumb ? [x.thumb] : [],
          desc:'', address:'', hours:'', holiday:'', benefits:'',
          tags: [],
          adStart: x.adStart || null,
          adEnd: x.adEnd || null,
          rating: Number(x.rating || 0)
        }))
      }

      partners.list = ptList.map(x => ({
        ...x,
        images: Array.isArray(x.images) ? x.images.slice() : (x.thumb ? [x.thumb] : []),
        _imgIndex: 0,
        _tags: Array.isArray(x.tags) ? x.tags.join(', ') : '',
        _fileName:'', _open:false, _saving:false,
        _adStartStr: dateStrOf(x.adStart), _adEndStr: dateStrOf(x.adEnd)
      }))

      ensureUiFieldsForAdsBox(adsP)
      ensureUiFieldsForAdsBox(adsF)
      ensureUiFieldsForPartners()

      const newsList = Array.isArray(data.newsline) ? data.newsline : []
      news.list = newsList.map(n => ({
        id: n.id || `news_${Math.random().toString(36).slice(2,8)}`,
        text: n.text || n.title || '',
        badge: n.badge || n.tag || '',
        createdAt: n.createdAt || n.ts || Date.now(),
        author: n.author || '운영자'
      }))

      if (data.topRanks) {
        const obj = (typeof data.topRanks === 'object' && !Array.isArray(data.topRanks)) ? data.topRanks : {}
        topRank.map = {}
        for (const k of Object.keys(obj)) topRank.map[k] = Array.isArray(obj[k]) ? obj[k].map(String) : []
      } else {
        const base = {}
        for (const o of storeCategoryOptions) base[o.key] = []
        topRank.map = base
      }
      await Promise.all(Object.keys(topRank.map).map(syncTopPreview))
    } catch(e) {
      console.warn('config/marketing 불러오기 실패:', e); alert('설정을 불러오지 못했습니다.')
    }
  }

  function ensureUiFieldsForAdsBox(box){
    box.list = (box.list || []).map(x => {
      const norm = normalizeAdTexts(x)
      const primary = (Array.isArray(norm.images) && norm.images.length)
        ? norm.images[Math.min(norm._imgIndex||0, norm.images.length-1)]
        : (norm.img || '')
      return {
        ...norm,
        img: norm.img || primary,
        image: norm.image || primary,
        _fileName: norm._fileName || '',
        _open: !!norm._open,
        _saving: false
      }
    })
  }

  function ensureUiFieldsForPartners(){
    partners.list = (partners.list || []).map(x => {
      const images = Array.isArray(x.images)
        ? x.images
        : (x.thumb ? [x.thumb] : (x.image ? [x.image] : []))
      const primary = images[0] || x.thumb || x.image || ''
      const startIdxFromThumb = Math.max(0, images.findIndex(u => u === (x.thumb || x.image || '')))
      const startIdx = Number.isFinite(x._imgIndex) ? x._imgIndex : (startIdxFromThumb >= 0 ? startIdxFromThumb : 0)

      return {
        desc: x.desc || '', address: x.address || '', hours: x.hours || '', holiday: x.holiday || '', benefits: x.benefits || '',
        adStart: x.adStart || null, adEnd: x.adEnd || null,
        _adStartStr: x._adStartStr ?? dateStrOf(x.adStart),
        _adEndStr: x._adEndStr ?? dateStrOf(x.adEnd),
        ...x,
        images,
        thumb: x.thumb || primary,
        image: x.image || primary,
        _imgIndex: startIdx,
        _tags: x._tags ?? (Array.isArray(x.tags) ? x.tags.join(', ') : ''),
        _fileName: x._fileName || '', _open: !!x._open, _saving: false
      }
    })
  }

  /* 복사/문자 유틸 */
  const copy = async (v) => {
    if (!v) return
    if (window.isSecureContext && navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(v); alert('복사되었습니다.'); return } catch {}
    }
    try {
      const ta = document.createElement('textarea'); ta.value = v; ta.setAttribute('readonly',''); ta.style.position='fixed'; ta.style.top='-9999px'
      document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); document.body.removeChild(ta)
      if (ok) alert('복사되었습니다.'); else throw new Error()
    } catch { alert('복사에 실패했어요. 텍스트를 길게 눌러 직접 복사해 주세요.') }
  }
  async function confirmTwice(msg='삭제하시겠습니까?'){
    if (!confirm(msg)) return false
    return confirm('정말로 삭제할까요? 삭제 후에는 복구할 수 없습니다.')
  }

  /* 아바타/닉네임 */
  const { setNick } = useUserNick()
  const nickKey = computed(() => {
    const id = state.value.uid || state.value.email || 'guest'
    return `user:nick:${id}`
  })
  function getNickFromStorage(){ const key = nickKey.value || 'user:nick'; return localStorage.getItem(key) || localStorage.getItem('user:nick') || '' }
  function setNickToStorage(v){ if (!v) return; const key = nickKey.value || 'user:nick'; localStorage.setItem(key, v); localStorage.setItem('user:nick', v) }

  const displayNick = computed(() => {
    const a = me?.auth?.value ?? me?.auth ?? {}
    const p = a.profile ?? me?.profile?.value ?? me?.profile ?? {}
    const c = a.company ?? me?.company?.value ?? me?.company ?? {}
    const fromLocal = getNickFromStorage() || localStorage.getItem('nickname')
    const email = p?.email || a?.email || ''
    const emailId = email && String(email).includes('@') ? String(email).split('@')[0] : ''
    return (p?.nickname || p?.nick || p?.name || a?.nickname || a?.nick || a?.name || c?.nickname || c?.manager || fromLocal || emailId || '게스트')
  })
  const myCode = computed(() => {
    const a = me?.auth?.value ?? me?.auth ?? {}
    const p = a.profile ?? me?.profile?.value ?? me?.profile ?? {}
    const ref = a.referral ?? p?.referral ?? {}
    return (ref?.myCode || p?.referralCode || a?.myCode || localStorage.getItem('ref:my') || '-')
  })

  const hasAvatarImage = computed(()=> !!(state.value.type === 'company' ? state.value.company?.logo : state.value.profile?.photoUrl))
  const avatarUrl = computed(()=>{
    const fromStore = state.value.type === 'company' ? (state.value.company?.logo || '') : (state.value.profile?.photoUrl || '')
    if (fromStore) return fromStore
    if (state.value.type === 'user') return femaleAvatarDataUrl(state.value.uid || displayNick.value || 'seed')
    return ''
  })
  const avatarStyle = computed(() =>
    avatarUrl.value ? ({ backgroundImage:`url(${avatarUrl.value})` }) : ({})
  )

  function previewAvatarStyle(kind='user'){
    const preview = edit.photo || (kind==='company'
      ? state.value.company?.logo
      : state.value.profile?.photoUrl
    )
    const url = preview || (kind==='user'
      ? femaleAvatarDataUrl(state.value.uid || displayNick.value || 'seed')
      : ''
    )
    return url ? ({ backgroundImage:`url(${url})` }) : ({})
  }

  const initials = (name) => (name || '').trim().slice(0, 2)

  /* 파일 → DataURL */
  async function fileToDataUrl(file, maxW = 1280, quality = 0.8){
    if (!file) return null
    const img = new Image()
    const data = await new Promise((resolve, reject) => {
      const fr = new FileReader(); fr.onload = () => resolve(fr.result); fr.onerror = reject; fr.readAsDataURL(file)
    })
    return await new Promise((resolve) => {
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width)
        const w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = data
    })
  }
  function femaleAvatarDataUrl(seed='seed'){
    return `data:image/svg+xml;utf8,` + encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>
        <rect width='100%' height='100%' fill='#FFE8F1'/>
        <text x='50%' y='54%' dominant-baseline='middle' text-anchor='middle' font-size='56' font-weight='700' fill='#FF2C8A'>👩</text>
      </svg>`
    )
  }

  /* 프로필 수정 모달 (멀티 사진 지원) */
  const ui = reactive({ editOpen: false })
  const saving = ref(false)
  const edit = reactive({
    nickname:'', phone:'', photo:'', _photoName:'',
    photos:[], photoIndex:0,
    companyName:'', brn:'', manager:'', address:''
  })
  const openEdit = () => {
    edit.nickname = state.value.profile?.nickname || state.value.profile?.nick || state.value.company?.nickname || displayNick.value || ''
    edit.phone = state.value.profile?.phone || state.value.company?.phone || ''
    edit.manager = state.value.company?.manager || ''
    edit.address = state.value.company?.address || ''
    edit.companyName = state.value.company?.name || ''
    edit.brn = state.value.company?.brn || ''
    edit.photo = state.value.type === 'company' ? (state.value.company?.logo || '') : (state.value.profile?.photoUrl || '')
    edit.photos = edit.photo ? [edit.photo] : []
    edit.photoIndex = 0
    edit._photoName = ''
    ui.editOpen = true
  }
  const closeEdit = () => { ui.editOpen = false }
  async function onPickProfilePhoto(e){
    const f = e.target.files?.[0]; if(!f) return
    const dataUrl = await fileToDataUrl(f, 640, 0.76)
    edit.photo = dataUrl; edit.photos = [dataUrl]; edit.photoIndex = 0; edit._photoName = f.name
  }
  async function onPickProfilePhotos(e){
    const files = Array.from(e?.target?.files || [])
    if (!files.length) return
    const urls = []
    for (const f of files){ const u = await fileToDataUrl(f, 640, 0.76); if (u) urls.push(u) }
    if (!urls.length) return
    edit.photos = urls
    edit.photoIndex = 0
    edit.photo = urls[0]
    edit._photoName = `${files.length} files`
  }
  function nextProfilePhoto(step=1){
    if (!edit.photos?.length) return
    const n = edit.photos.length
    edit.photoIndex = ((edit.photoIndex||0) + step + n) % n
    edit.photo = edit.photos[edit.photoIndex]
  }
  function prevProfilePhoto(){ nextProfilePhoto(-1) }

  function clearProfilePhoto(){ edit.photo = ''; edit.photos=[]; edit.photoIndex=0; edit._photoName = '' }
  function applyRandomFemale(){ edit.photo = femaleAvatarDataUrl(state.value.uid || displayNick.value || Math.random().toString(36)); edit.photos=[edit.photo]; edit.photoIndex=0; edit._photoName = 'female-avatar.svg' }

  const { setNick: _setNick } = { setNick }
  function unifyNickInStore(nick){
    const a = me?.auth?.value ?? me?.auth ?? {}
    if (!a) return
    a.nickname = nick; a.nick = nick
    if (a.profile?.value) a.profile.value = { ...(a.profile.value || {}), nickname: nick, nick: nick }
    else if (a.profile) a.profile = { ...(a.profile || {}), nickname: nick, nick: nick }
    else if (me?.profile?.value) me.profile.value = { ...(me.profile.value || {}), nickname: nick, nick: nick }
    else if (me?.profile) me.profile = { ...(me?.profile || {}), nickname: nick, nick: nick }
    if (state.value.type === 'company') {
      if (a.company?.value) a.company.value = { ...(a.company.value || {}), nickname: nick }
      else if (a.company) a.company = { ...(a.company || {}), nickname: nick }
      else if (me?.company?.value) me.company.value = { ...(me?.company?.value || {}), nickname: nick }
      else if (me?.company) me.company = { ...(me?.company || {}), nickname: nick }
    }
    setNick(nick)
  }

  async function saveProfile(){
    if (!edit.nickname?.trim()) { alert('닉네임을 입력해 주세요.'); return }
    if (saving.value) return
    saving.value = true
    try {
      const nick = edit.nickname.trim()

      // 최종 사진 결정
      let decidedPhoto = ''
      if (Array.isArray(edit.photos) && edit.photos.length) {
        const i = Math.min(Math.max(Number(edit.photoIndex) || 0, 0), edit.photos.length - 1)
        const item = edit.photos[i]
        decidedPhoto = typeof item === 'string' ? item : (item?.src || '')
      } else if (edit.photo) {
        decidedPhoto = (typeof edit.photo === 'string') ? edit.photo : (edit.photo?.src || '')
      }
      decidedPhoto = (decidedPhoto || '').toString().trim()

      if (!decidedPhoto && state.value.type === 'user') {
        decidedPhoto = femaleAvatarDataUrl(state.value.uid || displayNick.value || Math.random().toString(36))
      }

      const updatesUser = {
        profile: {
          nickname: nick, nick: nick, phone: edit.phone?.trim() || null,
          ...(state.value.type === 'user' ? { photoUrl: decidedPhoto || null } : {})
        },
        serverUpdatedAt: serverTimestamp(),
        updatedAt: Date.now(),
      }

      const updatesCompany = state.value.type === 'company' ? {
        company: {
          nickname: nick,
          name: (edit.companyName || '').trim() || null,
          brn: (edit.brn || '').trim() || null,
          manager: edit.manager?.trim() || null,
          phone: edit.phone?.trim() || null,
          address: edit.address?.trim() || null,
          logo: decidedPhoto || null,
        }
      } : {}

      if (fbDb && state.value.uid) {
        await setDoc(doc(fbDb, 'users', String(state.value.uid)), { ...updatesUser, ...updatesCompany }, { merge: true })
      }

      const a = me?.auth?.value ?? me?.auth ?? {}
      const profPatch = { nickname: nick, nick, phone: updatesUser.profile.phone }
      if (state.value.type === 'user') profPatch.photoUrl = decidedPhoto || null
      if (a.profile?.value) a.profile.value = { ...(a.profile.value || {}), ...profPatch }
      else if (a.profile) a.profile = { ...(a.profile || {}), ...profPatch }
      else if (me?.profile?.value) me.profile.value = { ...(me.profile.value || {}), ...profPatch }
      else if (me?.profile) me.profile = { ...(me?.profile || {}), ...profPatch }

      if (state.value.type === 'company') {
        const c = updatesCompany.company
        if (a.company?.value) a.company.value = { ...(a.company.value || {}), ...c }
        else if (a.company) a.company = { ...(a.company || {}), ...c }
        else if (me?.company?.value) me.company.value = { ...(me?.company?.value || {}), ...c }
        else if (me?.company) me.company = { ...(me?.company || {}), ...c }
      }

      a.nickname = nick; a.nick = nick;
      setNickToStorage(nick); setNick(nick);

      alert('저장되었습니다.')
      closeEdit()
    } finally {
      saving.value = false
    }
  }

  /* 로그인 직후 동기화 */
  const bootSynced = ref(false)
  async function syncAfterLogin(){
    if (bootSynced.value) return
    bootSynced.value = true
    const stored = (getNickFromStorage() || '').trim()
    const current = (displayNick.value || '').trim()
    const canonical = stored || current
    if (!canonical) return
    if (stored && stored !== current) { unifyNickInStore(stored) }
    else { setNickToStorage(canonical); unifyNickInStore(canonical) }

    try {
      if (fbDb && state.value.uid) {
        const patch = {
          profile: { nickname: canonical, nick: canonical },
          serverUpdatedAt: serverTimestamp(),
          updatedAt: Date.now()
        }
        if (state.value.type === 'company') {
          patch.company = { nickname: canonical }
        }
        await setDoc(doc(fbDb, 'users', String(state.value.uid)), patch, { merge: true })
      }
    } catch (e) {
      console.warn('syncAfterLogin Firestore skip:', e)
    }
  }

  /* 초기 로딩/워치 */
  onMounted(() => {
    if (state.value.loggedIn) {
      syncAfterLogin(); loadConnect(); loadAdminPending();
      reloadConfig();
      if (isAdmin.value) { loadPartnerPending(); loadExtendPending(); loadPricing(); loadTopRanks() }
    }
  })
  watch(() => state.value.loggedIn, v => {
    if (v) {
      syncAfterLogin(); loadConnect(); loadAdminPending();
      reloadConfig();
      if (isAdmin.value) { loadPartnerPending(); loadExtendPending(); loadPricing(); loadTopRanks() }
    }
  })
  watch(isAdmin, v => {
    if (v) { loadAdminPending(); loadPartnerPending(); loadExtendPending(); loadPricing(); loadTopRanks() }
    reloadConfig()
  })

  // --- 표시 제어: 어떤 등록신청 섹션을 보여줄지 ---
  const isBiz = computed(() => state.value.type === 'company' && !isAdmin.value)

  // 관리자만: 매장등록/연장신청
  const showStoreApply   = computed(() => isAdmin.value)                 // 매장 등록신청(가게)
  const showExtendApply  = computed(() => isAdmin.value)                 // 연장 신청

  // 관리자 + 기업회원: 광고/업체(제휴) 등록신청만 보이기
  const showPartnerApply = computed(() => isAdmin.value || isBiz.value)  // 광고/업체 등록신청

  function adPreviewStyle(ad){
    return {
      backgroundColor: '#F5F7FB',
      backgroundImage: (ad && ad.img) ? `url(${ad.img})` : 'linear-gradient(135deg,#f7f7fb 0%,#eff2ff 100%)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      position: 'relative'
    }
  }

  return {
    // 상태
    state, isAdmin, admin, conn,
    userPoints,
      userTier,
      nextTier,
      tierProgressPct,
      tierPointToNext,
    ads, adsP, adsF, partners, news,
    savingAds, savingPartners, newsSaving,
    pricing, unitDefault,
    // 노출 플래그(템플릿에서 v-if로 사용)
    showStoreApply,
    showPartnerApply,
    showExtendApply,

    // 표시/유틸
    displayNick, myCode, hasAvatarImage, avatarUrl, avatarStyle, initials,
    previewAvatarStyle, copy, bgStyle, timeAgo, fmtDate, formatWon, adDaysOf, adCostOf,
    normalizeCat, catLabel, partnerCategoryOptions, hourlyOf, unitOf, totalOf, previewAfterApprove,

    // 로딩/액션(관리자)
    loadAdminPending, loadPartnerPending, loadExtendPending, loadConnect,
    approveStore, rejectStore,
    approvePartnerReq, rejectPartnerReq,
    approveExtendReq, rejectExtendReq,

    // 상세 토글/열기(통일)
    toggleStoreDetail, toggleExtendDetail,
    openExtendDetail, openStoreDetail, openPartnerReqDetail, openPendingDetail,

    // 마케팅 편집
    // 마케팅 편집
    addAd,
    removeAdFrom,                  // 삭제: 박스 지정 필요(adsP/adsF)
    onPickAdImage, onPickAdImages, clearAdImage, toggleAd, saveAdOne,
    saveAdsP,                      // 제휴관(#1) 저장
    saveAdsF,                      // 가게찾기(#2) 저장
    addPartner, removePartner, onPickPartnerImage, onPickPartnerImages, clearPartnerImage, togglePartner, savePartnerOne, savePartners,
    addNewsTop, removeNews, onNewsChange, reloadConfig, saveNewsline,
    move, dup, syncTags, adPreviewStyle,

    // 날짜 문자열 보조
    dateStrOf, parseDateStr,

    // 디테일 대상
    detailTargetOf,

    // 프로필 수정 (멀티 / 슬라이드)
    ui, saving, edit, openEdit, closeEdit, saveProfile,
    onPickProfilePhoto, onPickProfilePhotos, clearProfilePhoto, applyRandomFemale,
    nextProfilePhoto, prevProfilePhoto,

    // ===== 카테고리 Top 순위(운영자 설정) =====
    topRank,
    storeCategoryOptions, storeCatLabel,
    loadTopRanks, saveTopRanks, setTopRank,
    addTopRankItem, removeTopRankItem, moveTopRankItem, syncTopPreview,

    // ===== 배너 텍스트/태그 편의 (추가 노출) =====
    adHasText, addAdTag, removeAdTag, moveAdTag, setAdTag,

    // ===== 배너 태그 드래그(정규화 좌표) =====
    setAdTagPosNormalized, setAdTagPosByPixel, adTagPosStyle,

    // ===== 배너/업체 멀티 이미지 슬라이드 =====
    nextAdImage,
    prevAdImage,
    nextPartnerImage,
    prevPartnerImage,
    setPartnerImageIndex
  }
}
