import React, { useCallback, useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import StoreListItem from '@/components/store/StoreListItem';
import { useAuth } from '@/hooks/useAuth';
import { subscribeMyFavorites } from '@/services/mypage';
import type { MainTabParamList } from '@/navigation/types';
import { fontSize, useTheme, type ThemeColors } from '@/theme';
import type { Store } from '@/types/store';

export default function FavoritesScreen() {
  const c = useTheme();
  const s = styles(c);
  const navigation = useNavigation<NavigationProp<MainTabParamList>>();
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
      navigation.navigate('Stores', { screen: 'StoreDetail', params: { storeId: store.id } }),
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
