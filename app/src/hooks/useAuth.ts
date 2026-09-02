import { useCallback, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  type FirebaseAuthTypes,
} from '@react-native-firebase/auth';
import {
  fetchUserProfile,
  subscribeUserProfile,
  type UserProfile,
} from '@/services/auth';
import { auth } from '@/services/firebase';

/**
 * 로그인 상태 + users/{uid} 프로필.
 * initializing 이 true 인 동안에는 비로그인 UI(로그인 유도 배너 등)를 그리지 않는다.
 * 웹 MainPage 의 isAuthReady 와 같은 목적 — 깜빡임 방지.
 */
export function useAuth() {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, next => {
      setUser(next);
      setInitializing(false);
      if (!next) setProfile(null);
    });
  }, []);

  /* 프로필은 **구독**한다.
   * 한 번만 읽으면 서버가 나중에 넣어 주는 값이 화면에 안 뜬다 —
   * 추천 보너스(가입 직후 Cloud Function 이 20,000P 지급), 글쓰기 포인트,
   * 리워드, 회원등급이 전부 그랬다. 웹(store/user.js:196)과 같은 방식. */
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) {
      setProfile(null);
      return;
    }
    return subscribeUserProfile(uid, setProfile, () => setProfile(null));
  }, [user?.uid]);

  const reloadProfile = useCallback(async () => {
    if (!user) return;
    try {
      setProfile(await fetchUserProfile(user.uid));
    } catch {
      // 무시 — 프로필은 부가 정보
    }
  }, [user]);

  return {
    user,
    uid: user?.uid ?? null,
    profile,
    initializing,
    isLoggedIn: user !== null,
    reloadProfile,
  };
}
