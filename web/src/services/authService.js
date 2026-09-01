// src/services/authService.js
// Firebase 이메일/비밀번호 로그인/가입 래퍼 + 에러 한국어화
// + 이메일/닉네임 중복확인 유틸

import { auth, firebaseReady, db as fbDb } from '@/firebase'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  fetchSignInMethodsForEmail,
} from 'firebase/auth'
import {
  collection,
  query,
  where,
  limit,
  getDocs,
} from 'firebase/firestore'
import { humanizeAuthError } from '@/utils/authErrors'

/* ──────────────────────────────────────────────
 * 1. 간단 유효성 검사 (네트워크 타기 전에 필터링)
 * ────────────────────────────────────────────── */

function isValidEmail(email) {
  const v = String(email || '').trim()
  if (!v) return false
  // 느슨하지만 빠른 이메일 패턴
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

function isValidNickname(nick) {
  const v = String(nick || '').trim()
  // 닉네임 길이 규칙은 필요에 따라 조정 가능
  return v.length >= 2 && v.length <= 20
}

/* ──────────────────────────────────────────────
 * 2. 중복확인 결과 캐시
 *    - 같은 값으로 여러 번 확인 시 즉시 응답
 * ────────────────────────────────────────────── */

const emailCache = new Map() // key: email,           value: boolean (true = 사용 가능)
const nickCache  = new Map() // key: nicknameLower,  value: boolean (true = 사용 가능)

/* ──────────────────────────────────────────────
 * 3. 이메일 중복 확인 (Firebase Auth 기반)
 *    - true  => 사용 가능
 *    - false => 이미 가입된 이메일
 * ────────────────────────────────────────────── */

export async function checkEmailAvailable(email) {
  const raw = String(email || '').trim()

  if (!isValidEmail(raw)) {
    throw new Error('이메일 형식이 올바르지 않습니다.')
  }

  // 캐시 먼저 확인
  if (emailCache.has(raw)) {
    return emailCache.get(raw)
  }

  await firebaseReady

  // Firebase Auth 에게 "이 이메일로 가입된 계정이 있냐"를 직접 물어봄
  const methods = await fetchSignInMethodsForEmail(auth, raw)

  // methods.length === 0 이면 아직 아무 계정도 없음 → 사용 가능
  const available = methods.length === 0

  emailCache.set(raw, available)
  return available
}

/* ──────────────────────────────────────────────
 * 4. 닉네임 중복 확인 (Firestore users 컬렉션)
 *    - true  => 사용 가능
 *    - false => 이미 사용 중
 *
 *  ⚠️ 전제:
 *    users 문서에 profile.nicknameLower 필드가 있다고 가정
 *    가입 저장 시: profile.nicknameLower = nickname.toLowerCase()
 * ────────────────────────────────────────────── */

export async function checkNicknameAvailable(nickname) {
  const raw = String(nickname || '').trim()
  const lower = raw.toLowerCase()

  if (!isValidNickname(raw)) {
    throw new Error('닉네임은 2~20자 사이로 입력해 주세요.')
  }

  // 캐시 먼저 확인
  if (nickCache.has(lower)) {
    return nickCache.get(lower)
  }

  await firebaseReady
  if (!fbDb) {
    throw new Error('Firestore 초기화가 아직 완료되지 않았습니다.')
  }

  const col = collection(fbDb, 'users')
  const q = query(
    col,
    where('profile.nicknameLower', '==', lower),
    limit(1),
  )

  const snap = await getDocs(q)
  const available = snap.empty // 문서 없으면 사용 가능

  nickCache.set(lower, available)
  return available
}

/* ──────────────────────────────────────────────
 * 5. 가입 시 user 문서 profile 기본 구조 헬퍼
 *    - 닉네임 lower 필드를 자동 포함
 * ────────────────────────────────────────────── */

export function buildUserProfileForSignup({ email, nickname, extra = {} }) {
  const nick = String(nickname || '').trim()
  const lower = nick.toLowerCase()
  const em = String(email || '').trim()

  return {
    email: em,
    profile: {
      nickname: nick,
      nick,
      nicknameLower: lower,
      email: em,
      ...extra,
    },
  }
}

/* ──────────────────────────────────────────────
 * 6. 이메일/비밀번호 회원가입
 * ────────────────────────────────────────────── */

/**
 * 이메일/비밀번호 회원가입
 * @param {string} email
 * @param {string} password
 * @param {string} [displayName] - (선택) 프로필 닉네임
 */
export async function signUpEmail(email, password, displayName) {
  await firebaseReady // AppCheck/초기화 보장
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    if (displayName) {
      await updateProfile(cred.user, { displayName })
    }

    // 이메일/닉네임 관련 캐시는 의미 없으니 가입 후 초기화
    emailCache.clear()
    nickCache.clear()

    return { ok: true, user: cred.user }
  } catch (e) {
    return { ok: false, error: humanizeAuthError(e), raw: e }
  }
}

/* ──────────────────────────────────────────────
 * 7. 이메일/비밀번호 로그인
 * ────────────────────────────────────────────── */

/**
 * 이메일/비밀번호 로그인
 * @param {string} email
 * @param {string} password
 */
export async function signInEmail(email, password) {
  await firebaseReady // AppCheck/초기화 보장
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    return { ok: true, user: cred.user }
  } catch (e) {
    return { ok: false, error: humanizeAuthError(e), raw: e }
  }
}

/* ──────────────────────────────────────────────
 * 8. 로그아웃
 * ────────────────────────────────────────────── */

export async function signOutNow() {
  await firebaseReady // AppCheck/초기화 보장
  try {
    await signOut(auth)

    // 로그아웃 시 캐시도 초기화 (다음 세션에서 다시 검사)
    emailCache.clear()
    nickCache.clear()

    return { ok: true }
  } catch (e) {
    return { ok: false, error: humanizeAuthError(e), raw: e }
  }
}
