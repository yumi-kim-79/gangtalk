import React, { useCallback, useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import StoreListItem from '@/components/store/StoreListItem';
import { useAuth } from '@/hooks/useAuth';
import { subscribeMyFavorites } from '@/services/mypage';
import type { RootStackParamList } from '@/navigation/types';
import { fontSize, useTheme, type ThemeColors } from '@/theme';
import type { Store } from '@/types/store';

export default function FavoritesScreen() {
  const c = useTheme();
  const s = styles(c);
  /* 이 화면은 두 곳에 있다 — 마이 탭 스택 안, 그리고 헤더 메뉴용 루트 스택.
   * 어느 쪽에서 열려도 같게 동작하도록 **루트 경로로 명시 이동**한다.
   * (탭 안에서 열렸을 때는 액션이 부모로 올라가 그대로 처리된다) */
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { uid } = useAuth();

  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
    const unsub = subscribeMyFavorites(
      uid,
      rows => {
        setStores(rows);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [uid]);

  const openStore = useCallback(
    (store: Store) =>
      navigation.navigate('MainTabs', {
        screen: 'Stores',
        params: { screen: 'StoreDetail', params: { storeId: store.id } },
      }),
    [navigation],
  );

  if (loading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  return (
    <FlatList
      style={s.root}
      data={stores}
      keyExtractor={item => item.id}
      renderItem={({ item }) => <StoreListItem store={item} onPress={openStore} />}
      ListEmptyComponent={
        <View style={s.center}>
          <Text style={s.emptyTitle}>찜한 업체가 없습니다</Text>
          <Text style={s.emptyDesc}>업체 상세에서 하트를 눌러 저장해보세요</Text>
        </View>
      }
    />
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64, gap: 4 },
    emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: c.fg },
    emptyDesc: { fontSize: fontSize.sm, color: c.muted },
  });
