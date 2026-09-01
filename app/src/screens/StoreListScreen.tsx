import React, { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AppHeader from '@/components/common/AppHeader';
import Icon from '@/components/common/Icon';
import OptionSheet from '@/components/common/OptionSheet';
import ChipTabs from '@/components/common/ChipTabs';
import StoreListItem from '@/components/store/StoreListItem';
import StoreTopCard from '@/components/store/StoreTopCard';
import {
  STORE_CATEGORIES,
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
  const { stores, topSections, loading, error } = useStores(filter);

  const openStore = useCallback(
    (store: Store) => navigation.navigate('StoreDetail', { storeId: store.id }),
    [navigation],
  );

  const sortLabel = keyword.trim()
    ? '검색 연관순'
    : (SORT_OPTIONS.find(o => o.key === sort)?.label ?? '티시 높은순');

  return (
    <View style={s.root}>
      <AppHeader searchValue={keyword} onChangeSearch={setKeyword} />

      <ChipTabs
        items={STORE_CATEGORIES}
        value={category}
        onChange={setCategory}
        fadeColor={c.bg}
      />

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
          ListHeaderComponent={
            <>
              {/* 카테고리별 Top 5 — 검색 중에는 표시하지 않는다 */}
              {topSections.map(sec => (
                <View key={sec.key} style={s.section}>
                  <View style={s.sectionHead}>
                    <Text style={s.sectionTitle}>{sec.label} Top 5</Text>
                    <Pressable onPress={() => setCategory(sec.key)} hitSlop={8} style={s.moreBtn}>
                      <Text style={s.moreText}>더보기</Text>
                      <Icon name="chevronRight" size={14} color={c.muted} />
                    </Pressable>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.cardRow}
                  >
                    {sec.list.map((st, i) => (
                      <StoreTopCard key={st.id} store={st} rank={i + 1} onPress={openStore} />
                    ))}
                  </ScrollView>
                </View>
              ))}

              <View style={s.listHead}>
                <Text style={s.listCount}>전체 {stores.length}곳</Text>
              </View>
            </>
          }
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
      paddingBottom: spacing.xs,
    },
    filterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      minHeight: 30,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.chipBorder,
      backgroundColor: c.surface,
    },
    filterText: { fontSize: fontSize.sm, color: c.fg },

    spacer: { flex: 1 },
    center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64, gap: 4 },
    section: { marginTop: spacing.sm },
    sectionHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.page,
      paddingBottom: spacing.xs,
    },
    sectionTitle: { fontSize: fontSize.lg, fontWeight: '800', color: c.fg },
    moreBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    moreText: { fontSize: fontSize.sm, color: c.muted },
    cardRow: { paddingHorizontal: spacing.page, gap: spacing.sm, paddingBottom: spacing.xs },
    listHead: {
      paddingHorizontal: spacing.page,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xs,
    },
    listCount: { fontSize: fontSize.md, fontWeight: '700', color: c.fg },
    emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: c.fg },
    emptyDesc: { fontSize: fontSize.sm, color: c.muted },
  });
