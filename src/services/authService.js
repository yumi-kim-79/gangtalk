// src/services/authService.js
// Firebase 이메일/비밀번호 로그인/가입 래퍼 + 에러 한국어화

import { auth, firebaseReady } from '@/firebase' // ✅ firebaseReady 함께 임포트
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { humanizeAuthError } from '@/utils/authErrors'

/**
 * 이메일/비밀번호 회원가입
 * @param {string} email
 * @param {string} password
 * @param {string} [displayName] - (선택) 프로필 닉네임
 */
export async function signUpEmail(email, password, displayName) {
  await firebaseReady // ✅ AppCheck/초기화 보장
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    if (displayName) {
      await updateProfile(cred.user, { displayName })
    }
    return { ok: true, user: cred.user }
  } catch (e) {
    return { ok: false, error: humanizeAuthError(e), raw: e }
  }
}

/**
 * 이메일/비밀번호 로그인
 * @param {string} email
 * @param {string} password
 */
export async function signInEmail(email, password) {
  await firebaseReady // ✅ AppCheck/초기화 보장
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    return { ok: true, user: cred.user }
  } catch (e) {
    return { ok: false, error: humanizeAuthError(e), raw: e }
  }
}

/** 로그아웃 */
export async function signOutNow() {
  await firebaseReady // ✅ AppCheck/초기화 보장
  try {
    await signOut(auth)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: humanizeAuthError(e), raw: e }
  }
}
