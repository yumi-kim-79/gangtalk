/**
 * 인증 — 이메일 / 카카오 / 애플.
 *
 * 웹(store/user.js _fbSignupUser)의 users 문서 생성 로직을 그대로 이식했다.
 * 가입 순번(meta/counters.userSeq)과 추천코드(V2)를 트랜잭션으로 만든다.
 */
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  AppleAuthProvider,
  type FirebaseAuthTypes,
} from '@react-native-firebase/auth';
import {
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { login as kakaoLogin, logout as kakaoLogout, me as kakaoMe } from '@react-native-kakao/user';
import { Platform } from 'react-native';
import { FUNCTIONS_REGION } from '@/constants/auth';
import { app, auth, db } from '@/services/firebase';

/* ───────────────────────── 추천코드 ───────────────────────── */

const emailLocalPart = (email: string): string => String(email).split('@')[0] ?? '';

/** 웹 makeMyCodeV2 이식 — 이메일 첫 글자 + 가입순번 5자리 */
export function makeMyCodeV2(email = '', seq = 1): string {
  const prefix = (emailLocalPart(email)[0] ?? 'x').toLowerCase();
  const n = Math.max(1, Number(seq) || 1);
  return `${prefix}${String(n).padStart(5, '0')}`;
}

/* ───────────────────────── users 문서 ───────────────────────── */

interface CreateUserDocInput {
  uid: string;
  email: string;
  nickname: string;
  phone?: string;
  refCode?: string;
  /** 카카오/애플 등 소셜 로그인 구분 */
  provider?: 'email' | 'kakao' | 'apple';
}

/**
 * users/{uid} 생성 (이미 있으면 순번을 다시 매기지 않는다).
 * 웹 _fbSignupUser 의 트랜잭션을 그대로 옮겼다.
 */
export async function ensureUserDoc({
  uid,
  email,
  nickname,
  phone,
  refCode,
  provider = 'email',
}: CreateUserDocInput): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const countersRef = doc(db, 'meta', 'counters');

  await runTransaction(db, async tx => {
    const [cSnap, uSnap] = await Promise.all([tx.get(countersRef), tx.get(userRef)]);

    const existing = uSnap.exists() ? (uSnap.data() as { myJoinSeq?: number }) : null;
    if (existing && Number(existing.myJoinSeq) > 0) {
      // 이미 가입 완료 — 프로필만 갱신
      tx.set(
        userRef,
        { profile: { email, nickname, nick: nickname, uid }, updatedAt: serverTimestamp() },
        { merge: true },
      );
      return;
    }

    const base = cSnap.exists() ? Number((cSnap.data() as { userSeq?: number })?.userSeq ?? 0) : 0;
    const seq = base + 1;
    const myCode = makeMyCodeV2(email, seq);

    if (cSnap.exists()) tx.update(countersRef, { userSeq: seq, updatedAt: serverTimestamp() });
    else tx.set(countersRef, { userSeq: 1, updatedAt: serverTimestamp() });

    tx.set(
      userRef,
      {
        type: 'user',
        provider,
        profile: {
          email,
          nickname,
          nick: nickname,
          ...(nickname ? { nicknameLower: nickname.toLowerCase() } : {}),
          ...(phone ? { phone } : {}),
          uid,
        },
        // 가입 포인트는 0. 추천 보너스는 Cloud Functions 가 지급한다 (웹과 동일)
        points: 0,
        referral: {
          myCode,
          codeVersion: 2,
          refBy: refCode || null,
          refApplied: false,
        },
        myJoinSeq: seq,
        myRefCode: myCode,
        myRefCreatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });
}

export interface UserProfile {
  uid: string;
  email: string;
  nickname: string;
  points: number;
  myRefCode: string;
  /** 리워드 잔액 (원) — 웹 userReward 와 같은 필드를 본다 */
  reward: number;
  type?: string;
  provider?: string;
}

/** users/{uid} 문서 → UserProfile. fetch/subscribe 가 같은 결과를 내도록 한 곳에 둔다 */
function normalizeUserProfile(uid: string, raw: unknown): UserProfile {
  const d = (raw ?? {}) as {
    profile?: {
      email?: string;
      nickname?: string;
      nick?: string;
      referralCode?: string;
      reward?: number;
      rewardAmount?: number;
    };
    referral?: { myCode?: string };
    points?: number;
    reward?: number;
    myRefCode?: string;
    type?: string;
    provider?: string;
  };

  /* 추천코드 — 웹 useMyPageCore.myCode 와 **같은 우선순위**로 읽는다.
   * (referral.myCode 가 정본, myRefCode / profile.referralCode 는 미러) */
  const refCode = String(
    d.referral?.myCode || d.myRefCode || d.profile?.referralCode || '',
  ).trim();

  /* 리워드 — 최상위 reward 가 정본 (functions payReferral 이 여기에만 쓴다).
   * profile.* 는 옛 문서를 위한 폴백. 웹 MyPage.userReward 와 같은 순서. */
  const reward = Number(
    d.reward ?? d.profile?.reward ?? d.profile?.rewardAmount ?? 0,
  );

  return {
    uid,
    email: String(d.profile?.email ?? ''),
    nickname: String(d.profile?.nickname ?? d.profile?.nick ?? ''),
    points: Number(d.points ?? 0),
    myRefCode: refCode,
    reward,
    type: d.type,
    provider: d.provider,
  };
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return normalizeUserProfile(uid, snap.data());
}

/**
 * users/{uid} 실시간 구독.
 *
 * 한 번만 읽으면(fetchUserProfile) 서버가 나중에 바꾼 값이 화면에 영영 안 뜬다.
 * 실제로 겪은 문제: 추천코드로 가입하면 Cloud Function
 * (onUserCreatedReferralBonus)이 **가입 직후 비동기로** 20,000P 를 넣는데,
 * 앱은 그 직전 값(0P)을 읽고 끝내서 "적립이 안 된다"로 보였다.
 * 포인트·리워드·회원등급 전부 같은 문제를 안고 있었다.
 * 웹은 store/user.js:196 에서 이미 onSnapshot 으로 구독하고 있다 — 그쪽에 맞춘다.
 */
export function subscribeUserProfile(
  uid: string,
  onData: (profile: UserProfile | null) => void,
  onError?: (e: unknown) => void,
) {
  return onSnapshot(
    doc(db, 'users', uid),
    (snap: FirebaseFirestoreTypes.DocumentSnapshot) =>
      onData(snap.exists() ? normalizeUserProfile(uid, snap.data()) : null),
    e => onError?.(e),
  );
}

/* ───────────────────────── 이메일 ───────────────────────── */

export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

/**
 * 닉네임 중복 확인.
 * 웹은 가입 전에 이 함수를 부르는데 앱은 부르지 않아 같은 닉네임이 여러 개 생겼다.
 * (functions/index.js:388 checkNicknameDuplicate)
 * 함수 호출이 실패하면 가입 자체를 막지는 않는다 — 중복은 운영에서 정리 가능하지만
 * 네트워크 문제로 가입이 막히는 쪽이 더 나쁘다.
 */
export async function isNicknameTaken(nick: string): Promise<boolean> {
  const value = nick.trim();
  if (!value) return false;
  try {
    const call = httpsCallable<{ nick: string }, { exists: boolean }>(
      fns(),
      'checkNicknameDuplicate',
    );
    const res = await call({ nick: value });
    return res.data?.exists === true;
  } catch {
    return false;
  }
}

export async function signUpWithEmail(params: {
  email: string;
  password: string;
  nickname: string;
  phone?: string;
  refCode?: string;
}) {
  const email = params.email.trim();
  const cred = await createUserWithEmailAndPassword(auth, email, params.password);
  await ensureUserDoc({
    uid: cred.user.uid,
    email,
    nickname: params.nickname.trim(),
    phone: params.phone,
    refCode: params.refCode,
    provider: 'email',
  });
  return cred.user;
}

export async function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email.trim());
}

/* ───────────────────────── SMS 인증 ───────────────────────── */

const fns = () => getFunctions(app, FUNCTIONS_REGION);

/**
 * 인증번호 발송.
 * sendSmsCode 는 enforceAppCheck: true 라 App Check 가 설정돼 있어야 한다.
 */
export async function sendSmsCode(phone: string): Promise<void> {
  const call = httpsCallable<{ phone: string }, { ok?: boolean }>(fns(), 'sendSmsCode');
  await call({ phone: phone.replace(/[^0-9]/g, '') });
}

export async function verifySmsCode(
  phone: string,
  code: string,
): Promise<{ ok: boolean; reason?: string }> {
  const call = httpsCallable<
    { phone: string; code: string },
    { ok: boolean; reason?: string }
  >(fns(), 'verifySmsCode');
  const res = await call({ phone: phone.replace(/[^0-9]/g, ''), code: code.trim() });
  return res.data;
}

/* ───────────────────────── 카카오 ───────────────────────── */

/**
 * 카카오 로그인.
 * 카카오 SDK 로 access token 을 받아 Cloud Function(kakaoSignIn)에 넘기고,
 * 돌려받은 커스텀 토큰으로 Firebase Auth 세션을 만든다.
 * (Firestore 규칙이 request.auth.uid 를 검사하므로 실제 Auth 세션이 반드시 필요)
 */
export async function signInWithKakao(): Promise<FirebaseAuthTypes.User> {
  const token = await kakaoLogin();
  const accessToken = token.accessToken;
  if (!accessToken) throw new Error('카카오 토큰을 받지 못했습니다.');

  const call = httpsCallable<
    { accessToken: string },
    { token: string; profile: { uid: string; email: string; nickname: string } }
  >(fns(), 'kakaoSignIn');
  const res = await call({ accessToken });

  const cred = await signInWithCustomToken(auth, res.data.token);

  // 닉네임이 비어 있으면 카카오 프로필에서 채운다
  let nickname = res.data.profile.nickname;
  if (!nickname) {
    try {
      const p = await kakaoMe();
      nickname = String(p.nickname ?? '');
    } catch {
      nickname = '';
    }
  }

  await ensureUserDoc({
    uid: cred.user.uid,
    email: res.data.profile.email || cred.user.email || '',
    nickname: nickname || '카카오회원',
    provider: 'kakao',
  });

  return cred.user;
}

/* ───────────────────────── 애플 ───────────────────────── */

/** 애플 로그인 (iOS 전용). 소셜 로그인을 넣으면 App Store 4.8 상 필수 */
export async function signInWithApple(): Promise<FirebaseAuthTypes.User> {
  if (Platform.OS !== 'ios') throw new Error('애플 로그인은 iOS 에서만 지원합니다.');

  const res = await appleAuth.performRequest({
    requestedOperation: appleAuth.Operation.LOGIN,
    requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
  });
  if (!res.identityToken) throw new Error('애플 로그인이 완료되지 않았습니다.');

  const credential = AppleAuthProvider.credential(res.identityToken, res.nonce);
  const cred = await signInWithCredential(auth, credential);

  const nickname =
    [res.fullName?.familyName, res.fullName?.givenName].filter(Boolean).join('') ||
    cred.user.displayName ||
    '애플회원';

  await ensureUserDoc({
    uid: cred.user.uid,
    email: cred.user.email ?? res.email ?? '',
    nickname,
    provider: 'apple',
  });

  return cred.user;
}

/* ───────────────────────── 공통 ───────────────────────── */

export async function signOut(): Promise<void> {
  // 카카오 사용자가 아니면 실패하지만 무시한다
  try {
    await kakaoLogout();
  } catch {
    // ignore
  }
  await fbSignOut(auth);
}

export function watchAuth(cb: (user: FirebaseAuthTypes.User | null) => void) {
  return onAuthStateChanged(getAuth(), cb);
}

/** Firebase Auth 에러코드를 사람이 읽는 문구로 (웹 utils/authErrors.js 대응) */
export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return '이메일 형식이 올바르지 않습니다.';
    case 'auth/email-already-in-use':
      return '이미 가입된 이메일입니다.';
    case 'auth/weak-password':
      return '비밀번호는 6자 이상이어야 합니다.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return '이메일 또는 비밀번호가 올바르지 않습니다.';
    case 'auth/too-many-requests':
      return '시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.';
    case 'auth/network-request-failed':
      return '네트워크 연결을 확인해 주세요.';
    default:
      return (e as { message?: string })?.message ?? '오류가 발생했습니다.';
  }
}
