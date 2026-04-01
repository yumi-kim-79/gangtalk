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
const LS_SEQ       = 'app:referral:seq'     // 추천/가입 순번 (로컬 데모용)

/* ===== 추천 포인트 정책 ===== */
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

/**
 * V1: 기존 추천코드 포맷
 *  - 이메일아이디 + '+' + 가입 순번
 *  - 예) asdf+1
 *  - 이미 가입된 계정 보정/로그인용으로만 사용
 */
function makeMyCodeV1(email = '', seq = 0) {
  return `${emailLocalPart(email)}+${Number(seq || 0)}`
}

/**
 * V2: 신규 추천코드 포맷 (신규 가입자용)
 *  - 앞글자 + 숫자 (앞글자 + 00001)
 *  - 숫자는 최소 5자리로 0 패딩, 5자리 초과면 그대로 사용
 *  - 예) email=asdf@naver.com, seq=1 → 'a00001'
 */
function makeMyCodeV2(email = '', seq = 1) {
  const local = emailLocalPart(email)
  const prefix = (local[0] || 'x').toLowerCase()
  const n = Math.max(1, Number(seq) || 1)
  const numStr = String(n)
  const padded = numStr.length >= 5 ? numStr : numStr.padStart(5, '0')
  return `${prefix}${padded}`
}

/** 기본 makeMyCode (옛 코드 호환용: V1 사용) */
function makeMyCode(email = '', seq = 0) {
  return makeMyCodeV1(email, seq)
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
    const mod = await import(/* @vite-ignore */ '@/firebase')
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
    this.actual = actual        // 실제 값(type/accountKind 등)
    this.expected = expected    // 기대 값
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
  if (typeof _unsubUserDoc === 'function') { _unsubUserDoc(); _unsubUserDoc = null }
  _points.value = 0
  if (!FBOK || !uid) return

  const { db, doc, onSnapshot } = FBOK
  const userRef = doc(db, 'users', uid)
  _unsubUserDoc = onSnapshot(
    userRef,
    (snap)=>{
      const data = snap.data() || {}
      const p = Number(data.points || 0)
      _points.value = p

      if (me.auth.value?.loggedIn) {
        me.auth.value = { ...(me.auth.value || {}), points: p }
        me.save()
      }
    },
    () => { /* no-op */ },
  )
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
      _points.value = Number(me.auth.value?.points || 0)
      _ready.value = true
      return
    }

    const {
      auth, db,
      onAuthStateChanged,
      doc, getDoc, setDoc, updateDoc,
      serverTimestamp,
      deleteField,
    } = FBOK

    onAuthStateChanged(auth, async (u) => {
      if (!u) {
        me.auth.value = { loggedIn: false }
        me.save()
        _uid.value = ''
        _listenUserDoc(FBOK, '')
        _ready.value = true
        return
      }

      const userRef = doc(db, 'users', u.uid)
      let data
      const snap = await getDoc(userRef)

      if (snap.exists()) {
        data = snap.data() || {}
        if (!data.type) data.type = 'user'

        // ✅ 닉네임 LowerCase 자동 보정
        const profile = data.profile || {}
        const hasNickname = !!profile.nickname
        const hasLower    = !!profile.nicknameLower
        if (hasNickname && !hasLower) {
          const lower = String(profile.nickname).toLowerCase()
          data.profile = {
            ...profile,
            nick: profile.nick || profile.nickname,
            nicknameLower: lower,
          }
          try {
            await updateDoc(userRef, {
              'profile.nicknameLower': lower,
              'profile.nick': data.profile.nick,
              updatedAt: serverTimestamp(),
            })
          } catch (_) {}
        }

        const actual0 = normalizeType(data.type)
        if (actual0 === 'user' && 'company' in data) {
          try {
            await updateDoc(userRef, { company: deleteField(), updatedAt: serverTimestamp() })
            delete data.company
          } catch (_) {}
          data.type = 'user'
        }

        // ✅ 추천코드 정합화 (버전별 포맷 유지)
        const seq = Number(data.myJoinSeq || 0)
        if (seq > 0) {
          const baseEmail = data?.profile?.email || u.email || ''
          const codeVersion = Number(data.referral?.codeVersion || 1)
          const maker = codeVersion >= 2 ? makeMyCodeV2 : makeMyCodeV1
          const wantCode = maker(baseEmail, seq)

          if (!data.referral || data.referral.myCode !== wantCode || data.referral.codeVersion !== codeVersion) {
            try {
              await updateDoc(userRef, {
                'referral.myCode': wantCode,
                'referral.codeVersion': codeVersion,
                updatedAt: serverTimestamp(),
              })
              data.referral = { ...(data.referral || {}), myCode: wantCode, codeVersion }
            } catch (_) {}
          }
        }
      } else {
        // (예외) 문서가 없을 때 최소 생성 — 이 경우도 V2 포맷 사용
        const seq = 1
        const myCode = makeMyCodeV2(u.email || '', seq)
        const nickname = u.displayName || ''
        const hasNickname = !!nickname

        data = {
          type: 'user',
          profile: {
            email: u.email || '',
            nickname,
            nick: nickname || '',
            // ✅ 닉네임이 있을 때만 nicknameLower 필드를 추가
            ...(hasNickname
              ? { nicknameLower: nickname.toLowerCase() }
              : {}),
            uid: u.uid,
          },
          points: 0,
          referral: { myCode, codeVersion: 2, refBy: null, refApplied: false },
          myJoinSeq: seq,
          myRefCode: myCode,
          myRefCreatedAt: serverTimestamp(),
          createdAt: Date.now(),
        }
        await setDoc(userRef, {
          ...data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }

      // 🔹 company인데 accountKind 없으면 기본 storeOwner로 보정
      const actualType = normalizeType(data.type)
      if (actualType === 'company' && !data.accountKind) {
        data.accountKind = 'storeOwner'
        try {
          await updateDoc(userRef, { accountKind: 'storeOwner', updatedAt: serverTimestamp() })
        } catch (_) {}
      }

      const fixed = { loggedIn: true, ...data, type: actualType }

      if (fixed.type === 'user' && 'company' in fixed) {
        const { company, ...rest } = fixed
        me.auth.value = rest
      } else {
        me.auth.value = fixed
      }
      me.save()

      const nick = me.auth.value?.profile?.nickname
      if (nick) {
        localStorage.setItem('user:nick', nick)
        localStorage.setItem('nickname', nick)
      }

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

  /* ===== Firebase 모드: 여성회원 가입 ===== */
  async _fbSignupUser({ email, password, nickname, refCode }) {
    const FBOK = await ensureFirebase()
    const {
      auth, db,
      createUserWithEmailAndPassword,
      doc, setDoc, getDoc, runTransaction,
      serverTimestamp,
      deleteField,
    } = FBOK

    const cred = await createUserWithEmailAndPassword(auth, email, password)
    const uid  = cred.user.uid
    const userRef = doc(db, 'users', uid)
    const countersRef = doc(db, 'meta', 'counters')

    // 1) counters.userSeq를 사용해서 전역 가입순번 + V2 코드 생성
    let seq = 0
    let myCode = ''

    await runTransaction(db, async (tx) => {
      const cSnap = await tx.get(countersRef)
      const uSnap = await tx.get(userRef)

      const already = uSnap.exists() && Number(uSnap.get('myJoinSeq')) > 0
      if (already) {
        seq = Number(uSnap.get('myJoinSeq')) || 1
        myCode = makeMyCodeV2(email, seq)
        return
      }

      const base = cSnap.exists() ? Number(cSnap.get('userSeq')) || 0 : 0
      seq = base + 1

      if (!cSnap.exists()) {
        tx.set(countersRef, { userSeq: 1, updatedAt: serverTimestamp() })
      } else {
        tx.update(countersRef, { userSeq: seq, updatedAt: serverTimestamp() })
      }

      myCode = makeMyCodeV2(email, seq)

      // ✨ 가입 시 포인트는 0으로 시작 (추천 보너스는 Functions에서 20,000P 지급)
      const myPoints = 0
      const hasNickname = !!nickname

      tx.set(
        userRef,
        {
          type: 'user',
          profile: {
            email,
            nickname,
            nick: nickname || '',
            // ✅ 닉네임이 있을 때만 nicknameLower 추가
            ...(hasNickname
              ? { nicknameLower: nickname.toLowerCase() }
              : {}),
            uid,
          },
          points: myPoints,
          referral: {
            myCode,
            codeVersion: 2,
            refBy: refCode || null,
            // ✨ 처음에는 항상 false → Functions가 refBy 를 보고 한 번만 보너스 지급
            refApplied: false,
          },
          myJoinSeq: seq,
          myRefCode: myCode,
          myRefCreatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )

      tx.update(userRef, { company: deleteField() })
    })

    // 2) 세션 반영
    const userSnap = await getDoc(userRef)
    const raw = userSnap.exists() ? userSnap.data() : {}
    const data = { ...raw, type: 'user' }
    delete data.company

    me.auth.value = { loggedIn: true, ...data }
    me.save()
    localStorage.setItem('user:nick', nickname)
    localStorage.setItem('nickname', nickname)

    _uid.value = uid
    _listenUserDoc(FBOK, uid)

    _ready.value = true
  },

  // 🔹 기업회원 = 가게찾기 업체 사장님 (storeOwner)
  async _fbSignupBiz({
    email,
    password,
    nick,
    phone,
    storeName,
    businessNo,
    address,
    refCode,
    accountKind = 'storeOwner',
  }) {
    const FBOK = await ensureFirebase()
    const {
      auth, db,
      createUserWithEmailAndPassword,
      doc, setDoc, getDoc, runTransaction,
      serverTimestamp,
    } = FBOK

    const cred = await createUserWithEmailAndPassword(auth, email, password)
    const uid  = cred.user.uid
    const userRef = doc(db, 'users', uid)
    const countersRef = doc(db, 'meta', 'counters')

    let seq = 0
    let myCode = ''

    await runTransaction(db, async (tx) => {
      const cSnap = await tx.get(countersRef)
      const uSnap = await tx.get(userRef)

      const already = uSnap.exists() && Number(uSnap.get('myJoinSeq')) > 0
      if (already) {
        seq = Number(uSnap.get('myJoinSeq')) || 1
        myCode = makeMyCodeV2(email, seq)
      } else {
        const base = cSnap.exists() ? Number(cSnap.get('userSeq')) || 0 : 0
        seq = base + 1

        if (!cSnap.exists()) {
          tx.set(countersRef, { userSeq: 1, updatedAt: serverTimestamp() })
        } else {
          tx.update(countersRef, { userSeq: seq, updatedAt: serverTimestamp() })
        }
      }

      myCode = makeMyCodeV2(email, seq)

      // ✨ refCode 유무와 상관없이 refApplied 는 항상 false 로 시작
      const referral = {
        myCode,
        codeVersion: 2,
        refBy: refCode || null,
        refApplied: false,
      }

      const nickname = nick || ''
      const hasNickname = !!nickname

      tx.set(
        userRef,
        {
          type: 'company',
          accountKind,
          profile: {
            email,
            nickname,
            nick: nickname,
            // ✅ 닉네임이 있을 때만 nicknameLower 추가
            ...(hasNickname
              ? { nicknameLower: nickname.toLowerCase() }
              : {}),
            uid,
          },
          company: {
            name: storeName || '',
            brn: businessNo || '',
            address: address || '',
            phone: phone || '',
            manager: nick || '',
          },
          points: 0,
          referral,
          myJoinSeq: seq,
          myRefCode: myCode,
          myRefCreatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
    })

    const snap = await getDoc(userRef)
    const data = snap.exists() ? snap.data() : {}

    me.auth.value = {
      loggedIn: true,
      ...data,
      type: normalizeType(data.type),
    }
    me.save()

    const nickName = me.auth.value?.profile?.nickname
    if (nickName) {
      localStorage.setItem('user:nick', nickName)
      localStorage.setItem('nickname', nickName)
    }

    _uid.value = uid
    _listenUserDoc(FBOK, uid)

    _ready.value = true
  },

  // 🔹 관리자회원 = 제휴관 페이지 업체 담당자 (partnerOwner)
  async _fbSignupAdmin({
    email,
    password,
    nick,
    phone,
    storeName,
    businessNo,
    address,
    refCode,
    accountKind = 'partnerOwner',
  }) {
    const FBOK = await ensureFirebase()
    const {
      auth, db,
      createUserWithEmailAndPassword,
      doc, setDoc, getDoc, runTransaction,
      serverTimestamp,
    } = FBOK

    const cred = await createUserWithEmailAndPassword(auth, email, password)
    const uid  = cred.user.uid
    const userRef = doc(db, 'users', uid)
    const countersRef = doc(db, 'meta', 'counters')

    let seq = 0
    let myCode = ''

    await runTransaction(db, async (tx) => {
      const cSnap = await tx.get(countersRef)
      const uSnap = await tx.get(userRef)

      const already = uSnap.exists() && Number(uSnap.get('myJoinSeq')) > 0
      if (already) {
        seq = Number(uSnap.get('myJoinSeq')) || 1
        myCode = makeMyCodeV2(email, seq)
      } else {
        const base = cSnap.exists() ? Number(cSnap.get('userSeq')) || 0 : 0
        seq = base + 1

        if (!cSnap.exists()) {
          tx.set(countersRef, { userSeq: 1, updatedAt: serverTimestamp() })
        } else {
          tx.update(countersRef, { userSeq: seq, updatedAt: serverTimestamp() })
        }
      }

      myCode = makeMyCodeV2(email, seq)

      // ✨ 관리자도 동일하게 refApplied 는 false 로 시작
      const referral = {
        myCode,
        codeVersion: 2,
        refBy: refCode || null,
        refApplied: false,
      }

      const nickname = nick || ''
      const hasNickname = !!nickname

      tx.set(
        userRef,
        {
          type: 'company',
          accountKind,
          profile: {
            email,
            nickname,
            nick: nickname,
            // ✅ 닉네임이 있을 때만 nicknameLower 추가
            ...(hasNickname
              ? { nicknameLower: nickname.toLowerCase() }
              : {}),
            uid,
          },
          company: {
            name: storeName || '',
            brn: businessNo || '',
            address: address || '',
            phone: phone || '',
            manager: nick || '',
          },
          points: 0,
          referral,
          myJoinSeq: seq,
          myRefCode: myCode,
          myRefCreatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
    })

    const snap = await getDoc(userRef)
    const data = snap.exists() ? snap.data() : {}

    me.auth.value = {
      loggedIn: true,
      ...data,
      type: normalizeType(data.type),
    }
    me.save()

    const nickName = me.auth.value?.profile?.nickname
    if (nickName) {
      localStorage.setItem('user:nick', nickName)
      localStorage.setItem('nickname', nickName)
    }

    _uid.value = uid
    _listenUserDoc(FBOK, uid)

    _ready.value = true
  },

  async _fbLoginWithRole({ email, password, expectedType, expectedAccountKind }) {
    const FBOK = await ensureFirebase()
    const {
      auth, db,
      signInWithEmailAndPassword,
      doc, getDoc, setDoc, updateDoc,
      serverTimestamp,
      deleteField,
    } = FBOK

    const cred = await signInWithEmailAndPassword(auth, email, password)
    const uid  = cred.user.uid

    const userDocRef = doc(db, 'users', uid)
    const snap = await getDoc(userDocRef)

    let data
    if (snap.exists()) {
      data = snap.data() || {}
      if (!data.type) data.type = 'user'

      // ✅ 닉네임 LowerCase 자동 보정
      const profile = data.profile || {}
      const hasNickname = !!profile.nickname
      const hasLower    = !!profile.nicknameLower
      if (hasNickname && !hasLower) {
        const lower = String(profile.nickname).toLowerCase()
        data.profile = {
          ...profile,
          nick: profile.nick || profile.nickname,
          nicknameLower: lower,
        }
        try {
          await updateDoc(userDocRef, {
            'profile.nicknameLower': lower,
            'profile.nick': data.profile.nick,
            updatedAt: serverTimestamp(),
          })
        } catch (_) {}
      }

      const actual0 = normalizeType(data.type)
      if (actual0 === 'user' && 'company' in data) {
        try {
          await updateDoc(userDocRef, { company: deleteField(), updatedAt: serverTimestamp() })
          delete data.company
        } catch (_) {}
      }

      // ✅ 추천코드 정합화 (버전 유지)
      const seq = Number(data.myJoinSeq || 0)
      if (seq > 0) {
        const baseEmail = data?.profile?.email || email
        const codeVersion = Number(data.referral?.codeVersion || 1)
        const maker = codeVersion >= 2 ? makeMyCodeV2 : makeMyCodeV1
        const wantCode = maker(baseEmail, seq)
        if (!data.referral || data.referral.myCode !== wantCode || data.referral.codeVersion !== codeVersion) {
          try {
            await updateDoc(userDocRef, {
              'referral.myCode': wantCode,
              'referral.codeVersion': codeVersion,
              updatedAt: serverTimestamp(),
            })
            data.referral = { ...(data.referral || {}), myCode: wantCode, codeVersion }
          } catch (_) {}
        }
      }
    } else {
      // (예외) 문서 누락 시 최소 생성 — V2 포맷 사용
      const seq = 1
      const myCode = makeMyCodeV2(email, seq)
      data = {
        type: 'user',
        profile: {
          email,
          nickname: '',
          nick: '',
          // nicknameLower 없음 (닉네임 없으므로)
          uid,
        },
        points: 0,
        referral: { myCode, codeVersion: 2, refBy: null, refApplied: false },
        myJoinSeq: seq,
        myRefCode: myCode,
        createdAt: Date.now(),
      }
      await setDoc(userDocRef, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }

    const actual = normalizeType(data.type)

    // company인데 accountKind 없으면 기본 storeOwner
    let effectiveAccountKind = data.accountKind || null
    if (actual === 'company' && !effectiveAccountKind) {
      effectiveAccountKind = 'storeOwner'
      data.accountKind = effectiveAccountKind
      try {
        await updateDoc(userDocRef, { accountKind: 'storeOwner', updatedAt: serverTimestamp() })
      } catch (_) {}
    }

    if (expectedType && actual !== expectedType) {
      throw new RoleMismatchError(actual, expectedType)
    }
    if (expectedAccountKind) {
      if (!effectiveAccountKind || effectiveAccountKind !== expectedAccountKind) {
        throw new RoleMismatchError(effectiveAccountKind || 'unknown', expectedAccountKind)
      }
    }

    const clean =
      actual === 'user' && 'company' in data
        ? (() => {
            const { company, ...rest } = data
            return rest
          })()
        : data

    me.auth.value = { loggedIn: true, ...clean, type: actual }
    me.save()

    const nick = me.auth.value?.profile?.nickname
    if (nick) {
      localStorage.setItem('user:nick', nick)
      localStorage.setItem('nickname', nick)
    }

    _uid.value = uid
    _listenUserDoc(FBOK, uid)

    _ready.value = true
  },

  /* ===== 로컬 데모 모드 구현 ===== */
  _localSignupUser({ email, password, nickname, refCode }) {
    if (getAccount(email)) throw new Error('이미 가입된 이메일입니다.')

    const seq    = nextLocalSeq()
    const myCode = makeMyCodeV2(email, seq)   // 로컬도 V2 포맷 사용
    const profile = {
      email,
      nickname,
      nick: nickname,
      nicknameLower: nickname.toLowerCase(),
    }
    const auth = {
      loggedIn: true,
      type: 'user',
      profile,
      points: refCode ? BONUS_NEW_USER : 0,
      referral: { myCode, codeVersion: 2, refBy: refCode || null, refApplied: !!refCode },
      myJoinSeq: seq,
      myRefCode: myCode,
      createdAt: Date.now(),
    }
    if (refCode) {
      creditReferrerLocal(refCode, BONUS_REFERRER)
    }

    putAccount(email, { password, ...auth })
    me.auth.value = auth
    me.save()

    _points.value = Number(auth.points || 0)

    localStorage.setItem('user:nick', nickname)
    localStorage.setItem('nickname', nickname)
    _ready.value = true
  },

  _localSignupBiz({
    email,
    password,
    nick,
    storeName,
    businessNo,
    address,
    phone,
    manager,
    accountKind = 'storeOwner',
  }) {
    if (getAccount(email)) throw new Error('이미 가입된 이메일입니다.')
    const seq    = nextLocalSeq()
    const myCode = makeMyCodeV2(email, seq)
    const authData = {
      loggedIn: true,
      type: 'company',
      accountKind,
      profile: {
        email,
        nickname: nick || '',
        nick: nick || '',
        nicknameLower: (nick || '').toLowerCase() || undefined,
      },
      company: {
        name: storeName || '',
        brn: businessNo || '',
        address: address || '',
        phone: phone || '',
        manager: manager || nick || '',
      },
      points: 0,
      referral: { myCode, codeVersion: 2, refBy: null, refApplied: false },
      myJoinSeq: seq,
      myRefCode: myCode,
      createdAt: Date.now(),
    }
    putAccount(email, { password, ...authData })
    me.auth.value = authData
    me.save()

    _points.value = 0

    _ready.value = true
  },

  _localSignupAdmin({
    email,
    password,
    nick,
    storeName,
    businessNo,
    address,
    phone,
    manager,
    accountKind = 'partnerOwner',
  }) {
    if (getAccount(email)) throw new Error('이미 가입된 이메일입니다.')
    const seq    = nextLocalSeq()
    const myCode = makeMyCodeV2(email, seq)
    const authData = {
      loggedIn: true,
      type: 'company',
      accountKind,
      profile: {
        email,
        nickname: nick || '',
        nick: nick || '',
        nicknameLower: (nick || '').toLowerCase() || undefined,
      },
      company: {
        name: storeName || '',
        brn: businessNo || '',
        address: address || '',
        phone: phone || '',
        manager: manager || nick || '',
      },
      points: 0,
      referral: { myCode, codeVersion: 2, refBy: null, refApplied: false },
      myJoinSeq: seq,
      myRefCode: myCode,
      createdAt: Date.now(),
    }
    putAccount(email, { password, ...authData })
    me.auth.value = authData
    me.save()

    _points.value = 0

    _ready.value = true
  },

  _localLoginWithRole({ email, password, expectedType, expectedAccountKind }) {
    const acc0 = getAccount(email)
    if (!acc0) throw new Error('가입 이력이 없습니다. 회원가입을 진행해 주세요.')

    const actual = normalizeType(acc0.type)

    if (actual === 'company' && !acc0.accountKind) {
      acc0.accountKind = 'storeOwner'
      putAccount(email, acc0)
    }
    const actualKind = acc0.accountKind || null

    if (expectedType && actual !== expectedType) {
      throw new RoleMismatchError(actual, expectedType)
    }
    if (expectedAccountKind && actualKind !== expectedAccountKind) {
      throw new RoleMismatchError(actualKind || 'unknown', expectedAccountKind)
    }

    if (actual === 'user') {
      let acc = applyOneTimeNewUserBonusFix(acc0)
      acc = applyPendingLedgerLocal(acc)
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

  // 기업회원 = 가게찾기 업체 담당자
  async signupBiz(payload) {
    const {
      email,
      password,
    } = payload

    const nick       = (payload.nick || payload.manager || '') || ''
    const phone      = payload.phone || ''
    const storeName  = payload.storeName || ''
    const businessNo = payload.businessNo || ''
    const address    = payload.address || ''
    const refCode    = payload.refCode
    const accountKind = payload.accountKind || 'storeOwner'

    const FBOK = await ensureFirebase()
    if (FBOK) {
      return me._fbSignupBiz({
        email,
        password,
        nick,
        phone,
        storeName,
        businessNo,
        address,
        refCode,
        accountKind,
      })
    }
    return me._localSignupBiz({
      email,
      password,
      nick,
      storeName,
      businessNo,
      address,
      phone,
      manager: nick,
      accountKind,
    })
  },

  // 관리자회원 = 제휴관 업체 담당자
  async signupAdmin(payload) {
    const {
      email,
      password,
    } = payload

    const nick       = payload.nick || ''
    const phone      = payload.phone || ''
    const storeName  = payload.storeName || ''
    const businessNo = payload.businessNo || ''
    const address    = payload.address || ''
    const refCode    = payload.refCode
    const accountKind = payload.accountKind || 'partnerOwner'

    const FBOK = await ensureFirebase()
    if (FBOK) {
      return me._fbSignupAdmin({
        email,
        password,
        nick,
        phone,
        storeName,
        businessNo,
        address,
        refCode,
        accountKind,
      })
    }
    return me._localSignupAdmin({
      email,
      password,
      nick,
      storeName,
      businessNo,
      address,
      phone,
      manager: nick,
      accountKind,
    })
  },

  async loginUser({ email, password }) {
    const FBOK = await ensureFirebase()
    if (FBOK) return me._fbLoginWithRole({ email, password, expectedType: 'user' })
    return me._localLoginWithRole({ email, password, expectedType: 'user' })
  },

  // 기업회원 로그인 = storeOwner
  async loginBiz({ email, password }) {
    const FBOK = await ensureFirebase()
    if (FBOK) {
      return me._fbLoginWithRole({
        email,
        password,
        expectedType: 'company',
        expectedAccountKind: 'storeOwner',
      })
    }
    return me._localLoginWithRole({
      email,
      password,
      expectedType: 'company',
      expectedAccountKind: 'storeOwner',
    })
  },

  // 관리자회원 로그인 = 제휴관 담당자
  async loginAdmin({ email, password }) {
    const FBOK = await ensureFirebase()
    if (FBOK) {
      return me._fbLoginWithRole({
        email,
        password,
        expectedType: 'company',
        expectedAccountKind: 'partnerOwner',
      })
    }
    return me._localLoginWithRole({
      email,
      password,
      expectedType: 'company',
      expectedAccountKind: 'partnerOwner',
    })
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

    _uid.value = ''
    if (typeof _unsubUserDoc === 'function') { _unsubUserDoc(); _unsubUserDoc = null }
    _points.value = 0

    _ready.value = true
  },

  /** 외부에서 세션 준비 여부 확인용 */
  get ready() { return _ready.value },
}
