import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useAuth } from '@/hooks/useAuth';
import type { RootStackParamList } from '@/navigation/types';

/**
 * 로그인이 필요한 동작 앞에 세우는 가드.
 * 비로그인이면 로그인 모달을 띄우고 false 를 돌려준다.
 */
export function useRequireAuth() {
  const { uid } = useAuth();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const requireAuth = useCallback((): string | null => {
    if (uid) return uid;
    navigation.navigate('Auth', { screen: 'Login' });
    return null;
  }, [uid, navigation]);

  return { uid, requireAuth };
}
