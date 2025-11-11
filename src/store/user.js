// src/store/user.js
import { ref, readonly, unref } from 'vue'

/**
 * 이 스토어는 2가지 모드로 동작합니다.
 * - Firebase 모드: src/firebase.js 가 존재하고 정상 초기화되면 Firebase Auth/Firestore 사용
 * - 로컬 데모 모드 : 브라우저 localStorage 사용
 *
 * firebase.js는 최소 다음을 export 해야 합니다.
 *   export const auth, db, fx
 *   (fx 안에 onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
 *    updateProfile, doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs,
 *    runTransaction, deleteField, onSnapshot 등)
 */

const LS_AUTH      = 'app:user:auth'
const LS_ACCOUNTS  = 'app:user:accounts'    // 이메일별 계정(데모용)
const LS_LEDGER    = 'app:referral:ledger'  // 추천 포인트 장부(데모용)
const LS_SEQ       = 'app:referral:seq'     // 로컬 가입순번

// ===== 추천 포인트 정책 =====
const BONUS_NEW_USER = 1000   // 추천코드 넣고 가입한 "신규" 회원
const BONUS_REFERRER = 1000   // (주의) 보안규칙상 클라에서 직접 반영 X → Functions 권장

/* ---------------- 공통 유틸 ---------------- */
function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback }
  catch { return fallback }
}
function saveJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)) }

/** 이메일 로컬파트(아이디) 추출 및 안전문자만 유지 */
function emailLocalPart(email = '') {
  const local = String(email || '').split('@')[0] || ''
  return local.replace(/[^a-zA-Z0-9._-]/g, '')
}

/** 내 추천코드 생성: 이메일아이디 + '+' + 가입순번 */
function makeMyCode(email = '', seq = 0) {
  return `${emailLocalPart(email)}+${Number(seq || 0)}`
}

/* ---------------- 로컬 데모 DB ---------------- */
function getAccounts() { return loadJSON(LS_ACCOUNTS, {}) }
function putAccount(email, data) {
  const all = getAccounts()
  all[email] = data
  saveJSON(LS_ACCOUNTS, all)
}
function getAccount(email) {
  const all = getAccounts()
  return all[email] || null
}
function getLedger() { return loadJSON(LS_LEDGER, {}) }
function setLedger(ledger) { saveJSON(LS_LEDGER, ledger) }

/** 로컬: 다음 가입순번 */
function nextLocalSeq() {
  const cur = Number(localStorage.getItem(LS_SEQ) || '0') || 0
  const next = cur + 1
  localStorage.setItem(LS_SEQ, String(next))
  return next
}

/** 추천 장부에 적립(추천인 코드 기준) — 로컬용 */
function creditReferrerLocal(code, amount) {
  if (!code || !amount) return
  const ledger = getLedger()
  ledger[code] = Number(ledger[code] || 0) + Number(amount)
  setLedger(ledger)
}

/** 로컬: 로그인 시 내 코드에 쌓인 장부를 실제 포인트에 반영 */
function applyPendingLedgerLocal(acc) {
  if (!acc?.referral?.myCode) return acc
  const code   = acc.referral.myCode
  const ledger = getLedger()
  const due    = Number(ledger[code] || 0)
  if (due > 0) {
    const fixed = { ...acc, points: Number(acc.points || 0) + due }
    ledger[code] = 0
    setLedger(ledger)
    putAccount(acc.profile?.email, fixed)
    return fixed
  }
  return acc
}

/** 로컬: 과거 가입자 보정 — 추천코드 넣고 가입했는데 0P였던 경우 1회 지급 */
function applyOneTimeNewUserBonusFix(acc) {
  if (!acc) return acc
  const refBy = acc.referral?.refBy
  const flag  = acc.referral?.refApplied // 보정 여부 플래그
  if (refBy && !flag) {
    const fixed = {
      ...acc,
      points: Number(acc.points || 0) + BONUS_NEW_USER,
      referral: { ...(acc.referral || {}), refApplied: true }
    }
    putAccount(acc.profile?.email, fixed)
    return fixed
  }
  return acc
}

/* ---------------- Firebase 옵션 로딩 ---------------- */
let FB = null
async function ensureFirebase() {
  if (FB !== null) return FB // 이미 시도한 적 있음(성공/실패)
  try {
    const mod = await import(/* @vite-ignore */ '@/firebase.js')
    const fbAuth = mod.auth
    const fbDb   = mod.db
    const fx     = mod.fx || {}
    const authMod = await import('firebase/auth')
    const dbMod   = await import('firebase/firestore') // onSnapshot 포함
    FB = { auth: fbAuth, db: fbDb, ...authMod, ...dbMod, ...fx }
  } catch (e) {
    FB = null
  }
  return FB
}

/* ---------------- 에러 타입 ---------------- */
class RoleMismatchError extends Error {
  constructor(actual, expected) {
    super('role-mismatch')
    this.name = 'RoleMismatchError'
    this.code = 'role-mismatch'
    this.actual = actual        // 실제 문서의 타입: 'user' | 'company'
    this.expected = expected    // 로그인 시도 타입
  }
}

/* ---------------- 내부 공통 ---------------- */
const _ready = ref(false)
let _inited  = false

function normalizeType(t) {
  const s = String(t || 'guest').toLowerCase()
  if (s === 'biz') return 'company'
  return s
}

/* ===== 실시간 포인트 바인딩용 상태 ===== */
const _uid = ref('')
const _points = ref( Number(loadJSON(LS_AUTH, { loggedIn:false })?.points || 0) )
let _unsubUserDoc = null

/** Firestore users/{uid} 문서 실시간 구독 → points 반영 */
function _listenUserDoc(FBOK, uid){
  // 이전 구독 정리
  if (typeof _unsubUserDoc === 'function') { _unsubUserDoc(); _unsubUserDoc = null }
  _points.value = 0
  if (!FBOK || !uid) return

  const { db, doc, onSnapshot } = FBOK
  const userRef = doc(db, 'users', uid)
  _unsubUserDoc = onSnapshot(userRef, (snap)=>{
    const data = snap.data() || {}
    const p = Number(data.points || 0)
    _points.value = p

    // 세션에도 동기화(화면 전반 동일 값 사용)
    if (me.auth.value?.loggedIn) {
      me.auth.value = { ...(me.auth.value || {}), points: p }
      me.save()
    }
  }, ()=>{/* noop: 오류 발생 시 기존 값 유지 */})
}

/** 외부에서 쓰기 쉽게 내보내는 헬퍼 */
export function useUserPoints(){
  return readonly(_points)
}

/* ---------------- 공개 스토어 ---------------- */
export const me = {
  /** 현재 세션 스냅샷(LS 캐시에서 초기화) */
  auth: ref(loadJSON(LS_AUTH, { loggedIn: false })),

  /** 저장 */
  save() { saveJSON(LS_AUTH, unref(me.auth)) },

  /** 초기화: Firebase 모드면 onAuthStateChanged 구독, 아니면 즉시 ready 처리 */
  async init() {
    if (_inited) return
    _inited = true
    const FBOK = await ensureFirebase()
    if (!FBOK) {
      // 로컬 모드: LS에 있는 값 그대로 사용 + 포인트 동기화
      _points.value = Number(me.auth.value?.points || 0)
      _ready.value = true
      return
    }

    const { auth, db, onAuthStateChanged, doc, getDoc, setDoc, updateDoc, deleteField, serverTimestamp } = FBOK
    onAuthStateChanged(auth, async (u) => {
      if (!u) {
        me.auth.value = { loggedIn: false }
        me.save()
        _uid.value = ''
        _listenUserDoc(FBOK, '') // 구독 해제 & 0으로 리셋
        _ready.value = true
        return
      }

      // Firestore 사용자 문서 로드/보정
      const userRef = doc(db, 'users', u.uid)
      let data
      const snap = await getDoc(userRef)
      if (snap.exists()) {
        data = snap.data()
        if (!data.type) data.type = 'user'
        // 여성회원이면 company 필드 정리(남아 있으면 UI가 기업회원으로 오인)
        const actual = normalizeType(data.type)
        if (actual === 'user' && 'company' in data) {
          try {
            await updateDoc(userRef, { company: deleteField(), updatedAt: serverTimestamp() })
            delete data.company
          } catch (_) {}
        }

        // 추천코드 자동 보정: myJoinSeq가 있고 referral.myCode가 다르면 정합화
        const seq = Number(data.myJoinSeq || 0)
        const wantCode = makeMyCode(data?.profile?.email || u.email || '', seq)
        if (seq > 0 && (!data.referral || data.referral.myCode !== wantCode)) {
          try {
            await updateDoc(userRef, { 'referral.myCode': wantCode, updatedAt: serverTimestamp() })
            data.referral = { ...(data.referral || {}), myCode: wantCode }
          } catch (_) {}
        }

      } else {
        // (예외) 문서가 없을 때 최소 기본값만 생성 — 추천코드/순번은 가입 시에 이미 생성됨
        data = {
          type: 'user',
          profile: { email: u.email || '', nickname: u.displayName || '', uid: u.uid },
          points: 0,
          referral: { myCode: makeMyCode(u.email || '', 0), refBy: null, refApplied: false },
          createdAt: Date.now(),
        }
        await setDoc(userRef, data)
      }

      const fixed = {
        loggedIn: true,
        ...data,
        type: normalizeType(data.type),
      }
      // 세션 객체에서도 company 제거(표시 일관성)
      if (fixed.type === 'user' && 'company' in fixed) {
        const { company, ...rest } = fixed
        me.auth.value = rest
      } else {
        me.auth.value = fixed
      }
      me.save()

      // 닉네임 캐싱(채팅 등에서 사용)
      const nick = me.auth.value?.profile?.nickname
      if (nick) {
        localStorage.setItem('user:nick', nick)
        localStorage.setItem('nickname', nick)
      }

      // ✅ 실시간 포인트 구독 시작
      _uid.value = u.uid
      _listenUserDoc(FBOK, u.uid)

      _ready.value = true
    })
  },

  /** 세션 준비 완료 보장(라우터 가드 등에서 사용) */
  ensureAuthReady() {
    if (_ready.value) return Promise.resolve()
    return new Promise((resolve) => {
      const iv = setInterval(() => {
        if (_ready.value) { clearInterval(iv); resolve() }
      }, 10)
    })
  },

  /* ===== Firebase 모드 구현 ===== */
  async _fbSignupUser({ email, password, nickname, refCode }) {
    const FBOK = await ensureFirebase()
    const {
      auth, db,
      createUserWithEmailAndPassword,
      doc, setDoc, getDoc, runTransaction, serverTimestamp, deleteField
    } = FBOK

    // 1) 계정 생성
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    const uid  = cred.user.uid

    // 2) 트랜잭션으로 가입순번 확정 + 내 문서 기록
    await runTransaction(db, async (tx) => {
      const countersRef = doc(db, 'meta', 'counters')
      const userRef     = doc(db, 'users', uid)

      // 모든 읽기 먼저
      const cSnap = await tx.get(countersRef)
      const uSnap = await tx.get(userRef)

      // 이미 순번 있으면 스킵(재시도 대비)
      const already = uSnap.exists() && Number(uSnap.get('myJoinSeq')) > 0
      if (already) return

      const base = cSnap.exists() ? Number(cSnap.get('userSeq')) || 0 : 0
      const next = base + 1

      // counters: create 또는 update — 정확한 수치로 기록
      if (!cSnap.exists()) {
        tx.set(countersRef, { userSeq: 1, updatedAt: serverTimestamp() })
      } else {
        tx.update(countersRef, { userSeq: next, updatedAt: serverTimestamp() })
      }

      // 내 추천코드/순번
      const myCode = makeMyCode(email, next)

      // 신규유저 보너스(추천코드 입력 시) — 내 포인트에만 반영
      const myPoints = refCode ? BONUS_NEW_USER : 0

      // 사용자 문서 작성(또는 병합)
      tx.set(
        userRef,
        {
          type: 'user',
          profile: { email, nickname, uid },
          points: myPoints,
          referral: { myCode, refBy: refCode || null, refApplied: !!refCode },
          myJoinSeq: next,
          myRefCode: myCode,
          myRefCreatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
      // 여성회원 문서에 남아있을 수 있는 company 필드 제거
      tx.update(userRef, { company: deleteField() })
    })

    // 3) 세션 반영(세션 객체에서도 company 제거)
    const userSnap = await getDoc(doc(db, 'users', uid))
    const raw = userSnap.exists() ? userSnap.data() : {}
    const data = { ...raw, type: 'user' }
    delete data.company

    me.auth.value = { loggedIn: true, ...data }
    me.save()
    localStorage.setItem('user:nick', nickname)
    localStorage.setItem('nickname', nickname)

    // ✅ 포인트 실시간 구독 시작
    _uid.value = uid
    _listenUserDoc(FBOK, uid)

    _ready.value = true
  },

  async _fbSignupBiz({ email, password, storeName, businessNo, address, phone, manager }) {
    const FBOK = await ensureFirebase()
    const { auth, db, createUserWithEmailAndPassword, doc, setDoc, getDoc, serverTimestamp } = FBOK

    const cred = await createUserWithEmailAndPassword(auth, email, password)
    const uid  = cred.user.uid

    await setDoc(doc(db, 'users', uid), {
      type: 'company',
      profile: { email, uid },
      company: {
        name: storeName || '',
        brn: businessNo || '',
        address: address || '',
        phone: phone || '',
        manager: manager || '',
      },
      points: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true })

    const snap = await getDoc(doc(db, 'users', uid))
    me.auth.value = { loggedIn: true, ...(snap.exists() ? snap.data() : {}), type: 'company' }
    me.save()

    // ✅ 포인트 실시간 구독 시작(기업도 동일)
    _uid.value = uid
    _listenUserDoc(FBOK, uid)

    _ready.value = true
  },

  async _fbLoginWithRole({ email, password, expectedType }) {
    const FBOK = await ensureFirebase()
    const { auth, db, signInWithEmailAndPassword, doc, getDoc, setDoc, updateDoc, deleteField, serverTimestamp } = FBOK

    const cred = await signInWithEmailAndPassword(auth, email, password)
    const uid  = cred.user.uid

    const userDocRef = doc(db, 'users', uid)
    const snap = await getDoc(userDocRef)

    let data
    if (snap.exists()) {
      data = snap.data()
      if (!data.type) data.type = 'user'
      const actual0 = normalizeType(data.type)
      if (actual0 === 'user' && 'company' in data) {
        // 로그인 시에도 company 정리(예전 데이터 정돈)
        try {
          await updateDoc(userDocRef, { company: deleteField(), updatedAt: serverTimestamp() })
          delete data.company
        } catch (_) {}
      }

      // 추천코드 정합화
      const seq = Number(data.myJoinSeq || 0)
      const wantCode = makeMyCode(data?.profile?.email || email, seq)
      if (seq > 0 && (!data.referral || data.referral.myCode !== wantCode)) {
        try {
          await updateDoc(userDocRef, { 'referral.myCode': wantCode, updatedAt: serverTimestamp() })
          data.referral = { ...(data.referral || {}), myCode: wantCode }
        } catch (_) {}
      }

    } else {
      // (예외) 문서 누락 시 최소 기본값 생성
      data = {
        type: 'user',
        profile: { email, nickname: '', uid },
        points: 0,
        referral: { myCode: makeMyCode(email, 0), refBy: null, refApplied: false },
        myJoinSeq: 0,
        createdAt: Date.now(),
      }
      await setDoc(userDocRef, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
    }

    const actual = normalizeType(data.type)
    if (expectedType && actual !== expectedType) {
      throw new RoleMismatchError(actual, expectedType)
    }

    // 세션 객체에서도 company 제거
    const clean = (actual === 'user' && 'company' in data) ? (() => { const { company, ...rest } = data; return rest })() : data
    me.auth.value = { loggedIn: true, ...clean, type: actual }
    me.save()

    const nick = me.auth.value?.profile?.nickname
    if (nick) {
      localStorage.setItem('user:nick', nick)
      localStorage.setItem('nickname', nick)
    }

    // ✅ 포인트 실시간 구독 시작
    _uid.value = uid
    _listenUserDoc(FBOK, uid)

    _ready.value = true
  },

  /* ===== 로컬 데모 모드 구현 ===== */
  _localSignupUser({ email, password, nickname, refCode }) {
    if (getAccount(email)) throw new Error('이미 가입된 이메일입니다.')

    const seq    = nextLocalSeq()
    const myCode = makeMyCode(email, seq)
    const profile = { email, nickname }
    const auth = {
      loggedIn: true,
      type: 'user',
      profile,
      points: refCode ? BONUS_NEW_USER : 0,
      referral: { myCode, refBy: refCode || null, refApplied: !!refCode },
      myJoinSeq: seq,
      myRefCode: myCode,
      createdAt: Date.now(),
    }
    if (refCode) {
      // 추천인 포인트는 장부에 적립 → 추천인 로그인 시 반영
      creditReferrerLocal(refCode, BONUS_REFERRER)
    }

    putAccount(email, { password, ...auth })
    me.auth.value = auth
    me.save()

    // 로컬도 userPoints 동기화
    _points.value = Number(auth.points || 0)

    localStorage.setItem('user:nick', nickname)
    localStorage.setItem('nickname', nickname)
    _ready.value = true
  },

  _localSignupBiz({ email, password, storeName, businessNo, address, phone, manager }) {
    if (getAccount(email)) throw new Error('이미 가입된 이메일입니다.')
    const authData = {
      loggedIn: true,
      type: 'company',
      profile: { email },
      company: { name: storeName || '', brn: businessNo || '', address: address || '', phone: phone || '', manager: manager || '' },
      points: 0,
      createdAt: Date.now(),
    }
    putAccount(email, { password, ...authData })
    me.auth.value = authData
    me.save()

    _points.value = 0

    _ready.value = true
  },

  _localLoginWithRole({ email, password, expectedType }) {
    const acc0 = getAccount(email)
    if (!acc0) throw new Error('가입 이력이 없습니다. 회원가입을 진행해 주세요.')
    // if (acc0.password && acc0.password !== password) throw new Error('비밀번호가 일치하지 않습니다.')

    const actual = normalizeType(acc0.type)
    if (expectedType && actual !== expectedType) {
      throw new RoleMismatchError(actual, expectedType)
    }

    if (actual === 'user') {
      let acc = applyOneTimeNewUserBonusFix(acc0)
      acc = applyPendingLedgerLocal(acc)
      // 세션에서도 company 제거
      const { company, ...rest } = acc
      me.auth.value = { ...rest, loggedIn: true, type: actual }
      _points.value = Number(rest.points || 0)
    } else {
      me.auth.value = { ...acc0, loggedIn: true, type: actual }
      _points.value = Number(acc0.points || 0)
    }
    me.save()

    const nick = me.auth.value?.profile?.nickname
    if (nick) {
      localStorage.setItem('user:nick', nick)
      localStorage.setItem('nickname', nick)
    }
    _ready.value = true
  },

  /* ===== 퍼블릭 API (컴포넌트에서 사용하는 함수) ===== */
  async signupUser({ email, password, nick, refCode }) {
    const FBOK = await ensureFirebase()
    if (FBOK) return me._fbSignupUser({ email, password, nickname: nick, refCode })
    return me._localSignupUser({ email, password, nickname: nick, refCode })
  },

  async signupBiz({ email, password, storeName, businessNo, address, phone, manager }) {
    const FBOK = await ensureFirebase()
    if (FBOK) return me._fbSignupBiz({ email, password, storeName, businessNo, address, phone, manager })
    return me._localSignupBiz({ email, password, storeName, businessNo, address, phone, manager })
  },

  async loginUser({ email, password }) {
    const FBOK = await ensureFirebase()
    if (FBOK) return me._fbLoginWithRole({ email, password, expectedType: 'user' })
    return me._localLoginWithRole({ email, password, expectedType: 'user' })
  },

  async loginBiz({ email, password }) {
    const FBOK = await ensureFirebase()
    if (FBOK) return me._fbLoginWithRole({ email, password, expectedType: 'company' })
    return me._localLoginWithRole({ email, password, expectedType: 'company' })
  },

  async logout() {
    try {
      const FBOK = await ensureFirebase()
      if (FBOK?.signOut && FBOK?.auth) {
        await FBOK.signOut(FBOK.auth)
      }
    } catch {}
    me.auth.value = { loggedIn: false }
    me.save()

    // 구독 해제 + 포인트 리셋
    _uid.value = ''
    if (typeof _unsubUserDoc === 'function') { _unsubUserDoc(); _unsubUserDoc = null }
    _points.value = 0

    _ready.value = true
  },

  /** 외부에서 세션 준비 여부 확인용 */
  get ready() { return _ready.value },
}
