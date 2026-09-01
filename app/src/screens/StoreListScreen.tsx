import React, { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AppHeader from '@/components/common/AppHeader';
import Icon from '@/components/common/Icon';
import OptionSheet from '@/components/common/OptionSheet';
import CategoryChips from '@/components/store/CategoryChips';
import StoreListItem from '@/components/store/StoreListItem';
import {
  REGIONS,
  REGION_LABEL,
  SORT_OPTIONS,
  type RegionKey,
  type SortKey,
} from '@/constants/stores';
import { useStores } from '@/hooks/useStores';
import type { StoresStackParamList } from '@/navigation/types';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';
import type { Store } from '@/types/store';

export default function StoreListScreen() {
  const c = useTheme();
  const s = styles(c);
  const navigation =
    useNavigation<NativeStackNavigationProp<StoresStackParamList, 'StoreList'>>();

  const [category, setCategory] = useState('all');
  const [region, setRegion] = useState<RegionKey>('gn');
  const [sort, setSort] = useState<SortKey>('tc');
  const [keyword, setKeyword] = useState('');
  const [regionOpen, setRegionOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const filter = useMemo(
    () => ({ category, region, sort, keyword }),
    [category, region, sort, keyword],
  );
  const { stores, loading, error } = useStores(filter);

  const openStore = useCallback(
    (store: Store) => navigation.navigate('StoreDetail', { storeId: store.id }),
    [navigation],
  );

  const sortLabel = keyword.trim()
    ? '검색 연관순'
    : (SORT_OPTIONS.find(o => o.key === sort)?.label ?? '티시 높은순');

  return (
    <View style={s.root}>
      <AppHeader
        title="업체"
        subtitle="강남 지역 업체 찾기"
        searchValue={keyword}
        onChangeSearch={setKeyword}
      />

      <CategoryChips value={category} onChange={setCategory} />

      <View style={s.filterBar}>
        <Pressable style={s.filterBtn} onPress={() => setRegionOpen(true)}>
          <Text style={s.filterText}>{REGION_LABEL[region]}</Text>
          <Icon name="chevronDown" size={14} color={c.muted} />
        </Pressable>
        <Pressable style={s.filterBtn} onPress={() => setSortOpen(true)}>
          <Text style={s.filterText}>{sortLabel}</Text>
          <Icon name="chevronDown" size={14} color={c.muted} />
        </Pressable>
        <View style={s.spacer} />
        <Text style={s.count}>{stores.length}곳</Text>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={c.accent} />
        </View>
      ) : error ? (
        <View style={s.center}>
          <Text style={s.emptyTitle}>불러오지 못했습니다</Text>
          <Text style={s.emptyDesc}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={stores}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <StoreListItem store={item} onPress={openStore} />}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={8}
          windowSize={7}
          removeClippedSubviews
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={s.emptyTitle}>조건에 맞는 업체가 없습니다</Text>
              <Text style={s.emptyDesc}>지역이나 카테고리를 바꿔보세요</Text>
            </View>
          }
        />
      )}

      <OptionSheet
        visible={regionOpen}
        title="지역"
        options={REGIONS}
        selected={region}
        onSelect={setRegion}
        onClose={() => setRegionOpen(false)}
      />
      <OptionSheet
        visible={sortOpen}
        title="정렬"
        options={SORT_OPTIONS}
        selected={sort}
        onSelect={setSort}
        onClose={() => setSortOpen(false)}
      />
    </View>
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    filterBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.page,
      paddingBottom: spacing.sm,
    },
    filterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      minHeight: 34,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.chipBorder,
      backgroundColor: c.surface,
    },
    filterText: { fontSize: fontSize.sm, color: c.fg },

    spacer: { flex: 1 },
    count: { fontSize: fontSize.sm, color: c.muted },
    center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64, gap: 4 },
    emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: c.fg },
    emptyDesc: { fontSize: fontSize.sm, color: c.muted },
  });
