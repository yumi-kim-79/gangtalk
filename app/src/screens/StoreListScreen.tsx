import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AppHeader from '@/components/common/AppHeader';
import BannerSlider from '@/components/common/BannerSlider';
import Icon from '@/components/common/Icon';
import OptionSheet from '@/components/common/OptionSheet';
import ChipTabs from '@/components/common/ChipTabs';
import HotRankTicker from '@/components/store/HotRankTicker';
import StoreGridItem from '@/components/store/StoreGridItem';
import StoreListItem from '@/components/store/StoreListItem';
import StoreTopCard from '@/components/store/StoreTopCard';
import {
  CATEGORY_CHIPS,
  REGIONS,
  REGION_LABEL,
  SORT_OPTIONS,
  type RegionKey,
  type SortKey,
} from '@/constants/stores';
import { useBanners } from '@/hooks/useBanners';
import { resolveBannerTarget } from '@/services/bannerLink';
import { useStores } from '@/hooks/useStores';
import {
  DEFAULT_CENTER_LABEL,
  NEARBY_RADIUS_KM,
  getCenter,
  pickWithin,
} from '@/services/nearby';
import type { StoresStackParamList } from '@/navigation/types';
import { fontSize, radius, spacing, useTheme, useThemeMode, type ThemeColors } from '@/theme';
import type { Store } from '@/types/store';

/** 웹 localStorage 'finder:view' 와 같은 역할 */
const VIEW_KEY = 'finder:view';
type ViewMode = 'list' | 'grid';

export default function StoreListScreen() {
  const c = useTheme();
  const s = styles(c);
  const navigation =
    useNavigation<NativeStackNavigationProp<StoresStackParamList, 'StoreList'>>();
  const { isDark, toggle: toggleTheme } = useThemeMode();

  const [category, setCategory] = useState('all');
  const [region, setRegion] = useState<RegionKey>('gn');
  const [sort, setSort] = useState<SortKey>('tc');
  const [keyword, setKeyword] = useState('');
  const [regionOpen, setRegionOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [view, setView] = useState<ViewMode>('list');
  /** 내 주변 결과 — null 이면 미적용 */
  const [nearby, setNearby] = useState<{ ids: string[]; usedDefault: boolean } | null>(null);
  const [nearbyBusy, setNearbyBusy] = useState(false);

  const filter = useMemo(
    () => ({ category, region, sort, keyword }),
    [category, region, sort, keyword],
  );
  const { stores, topSections, hotRankIds, loading, error, reload } = useStores(filter);
  const { banners, ready: bannersReady } = useBanners('F');

  /* 뷰 선택은 앱을 다시 켜도 유지된다 (웹과 동일) */
  useEffect(() => {
    AsyncStorage.getItem(VIEW_KEY)
      .then(v => {
        if (v === 'list' || v === 'grid') setView(v);
      })
      .catch(() => undefined);
  }, []);

  const toggleView = useCallback(() => {
    setView(prev => {
      const next: ViewMode = prev === 'list' ? 'grid' : 'list';
      AsyncStorage.setItem(VIEW_KEY, next).catch(() => undefined);
      return next;
    });
  }, []);

  const openStore = useCallback(
    (store: Store) => navigation.navigate('StoreDetail', { storeId: store.id }),
    [navigation],
  );
  /* 배너 제목(업체명)/설명(담당자) 으로 업체를 찾아 상세로 — 웹과 같은 규칙 */
  const onPressBanner = useCallback(
    (b: Parameters<typeof resolveBannerTarget>[0]) => {
      const hit = resolveBannerTarget(b, stores);
      if (!hit) return false;
      navigation.navigate('StoreDetail', { storeId: hit.id });
      return true;
    },
    [stores, navigation],
  );

  const openStoreById = useCallback(
    (storeId: string) => navigation.navigate('StoreDetail', { storeId }),
    [navigation],
  );

  /** 📍 내 주변 10km — 한 번 더 누르면 해제 */
  const onNearby = useCallback(async () => {
    if (nearby) {
      setNearby(null);
      return;
    }
    if (nearbyBusy) return;
    setNearbyBusy(true);
    try {
      const { center, usedDefault } = await getCenter();
      const within = pickWithin(stores, center);
      if (!within.length) {
        Alert.alert(
          '내 주변 10km',
          `${NEARBY_RADIUS_KM}km 안에 좌표가 등록된 업체를 찾지 못했습니다.`,
        );
        return;
      }
      setNearby({ ids: within.map(x => x.store.id), usedDefault });
    } finally {
      setNearbyBusy(false);
    }
  }, [nearby, nearbyBusy, stores]);

  /** 내 주변이 켜져 있으면 그 순서(가까운 순)를 그대로 쓴다 */
  const listed = useMemo(() => {
    if (!nearby) return stores;
    const byId = new Map(stores.map(x => [x.id, x]));
    return nearby.ids.map(id => byId.get(id)).filter((x): x is Store => !!x);
  }, [stores, nearby]);

  const sortLabel = keyword.trim()
    ? '검색 연관순'
    : (SORT_OPTIONS.find(o => o.key === sort)?.label ?? '티시 높은순');

  const header = (
    <>
      <HotRankTicker stores={stores} adminIds={hotRankIds} onOpenStore={openStoreById} />
      <BannerSlider banners={banners} ready={bannersReady} onPressBanner={onPressBanner} />

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
        <Text style={s.listCount}>
          {nearby ? `내 주변 ${NEARBY_RADIUS_KM}km ${listed.length}곳` : `전체 ${listed.length}곳`}
        </Text>
        {nearby?.usedDefault ? (
          <Text style={s.listNote}>위치를 못 받아 {DEFAULT_CENTER_LABEL} 기준입니다</Text>
        ) : null}
      </View>
    </>
  );

  const empty = (
    <View style={s.center}>
      <Text style={s.emptyTitle}>조건에 맞는 업체가 없습니다</Text>
      <Text style={s.emptyDesc}>지역이나 카테고리를 바꿔보세요</Text>
    </View>
  );

  return (
    <View style={s.root}>
      <AppHeader searchValue={keyword} onChangeSearch={setKeyword} />

      <ChipTabs
        items={CATEGORY_CHIPS}
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

        {/* 웹 StoreFinder .view-tools 와 같은 4개 도구 */}
        <Pressable
          style={s.tool}
          onPress={toggleTheme}
          hitSlop={6}
          accessibilityLabel={isDark ? '라이트 모드' : '다크 모드'}
        >
          <Icon name={isDark ? 'moon' : 'sun'} size={18} color={c.fg} />
        </Pressable>
        <Pressable
          style={[s.tool, !!nearby && s.toolOn]}
          onPress={onNearby}
          hitSlop={6}
          accessibilityLabel={`내 주변 보기(${NEARBY_RADIUS_KM}km)`}
        >
          {nearbyBusy ? (
            <ActivityIndicator size="small" color={c.accent} />
          ) : (
            <Icon name="pin" size={18} color={nearby ? c.chipActiveFg : c.fg} />
          )}
        </Pressable>
        <Pressable
          style={s.tool}
          onPress={toggleView}
          hitSlop={6}
          accessibilityLabel={view === 'list' ? '두칸보기로 전환' : '한줄보기로 전환'}
        >
          <Icon name={view === 'list' ? 'listView' : 'gridView'} size={18} color={c.fg} />
        </Pressable>
        <Pressable style={s.tool} onPress={reload} hitSlop={6} accessibilityLabel="새로고침">
          <Icon name="refresh" size={18} color={c.fg} />
        </Pressable>
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
      ) : view === 'grid' ? (
        <FlatList
          key="grid"
          data={listed}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={s.gridRow}
          contentContainerStyle={s.gridContent}
          renderItem={({ item }) => <StoreGridItem store={item} onPress={openStore} />}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={8}
          windowSize={7}
          removeClippedSubviews
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
        />
      ) : (
        <FlatList
          key="list"
          data={listed}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <StoreListItem store={item} onPress={openStore} />}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={8}
          windowSize={7}
          removeClippedSubviews
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
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
      gap: spacing.xs,
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
    tool: {
      width: 30,
      height: 30,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
    },
    toolOn: { backgroundColor: c.chipActiveBg },

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
      gap: 2,
    },
    listCount: { fontSize: fontSize.md, fontWeight: '700', color: c.fg },
    listNote: { fontSize: fontSize.xs, color: c.muted },
    gridRow: { gap: spacing.sm, paddingHorizontal: spacing.page },
    gridContent: { paddingBottom: spacing.lg, gap: spacing.sm },
    emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: c.fg },
    emptyDesc: { fontSize: fontSize.sm, color: c.muted },
  });
