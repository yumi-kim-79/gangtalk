import React, { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
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
import ChipTabs from '@/components/common/ChipTabs';
import { STORE_CATEGORIES } from '@/constants/stores';
import StoreGridCard from '@/components/store/StoreGridCard';
import { useAuth } from '@/hooks/useAuth';
import { useHomeStores } from '@/hooks/useHomeStores';
import type { MainTabParamList } from '@/navigation/types';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';
import type { Store } from '@/types/store';

/** TODO: 웹 백로그대로 Firestore config 에서 가져오도록 연동 (현재는 웹과 동일한 하드코딩) */
const HOT_ISSUE = '강남톡방 그랜드오픈 이벤트 진행중!';

export default function HomeScreen() {
  const c = useTheme();
  const s = styles(c);
  const navigation = useNavigation<NavigationProp<MainTabParamList>>();
  const { isLoggedIn, initializing } = useAuth();

  const [category, setCategory] = useState('all');
  const [keyword, setKeyword] = useState('');
  const { stores, all, loading, roomsReady, error } = useHomeStores(category, keyword);

  const openStore = useCallback(
    (store: Store) =>
      navigation.navigate('Stores', { screen: 'StoreDetail', params: { storeId: store.id } }),
    [navigation],
  );
  const goAllStores = useCallback(
    () => navigation.navigate('Stores', { screen: 'StoreList' }),
    [navigation],
  );

  return (
    <View style={s.root}>
      <FlatList
        data={stores}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={s.column}
        contentContainerStyle={s.listContent}
        renderItem={({ item }) => (
          <StoreGridCard store={item} all={all} roomsReady={roomsReady} onPress={openStore} />
        )}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={6}
        windowSize={5}
        removeClippedSubviews
        ListHeaderComponent={
          <>
            <AppHeader
              title="강톡"
              subtitle="강남 지역 현황판"
              searchValue={keyword}
              onChangeSearch={setKeyword}
            />

            <Pressable style={s.hot} android_ripple={{ color: c.accentWeak }}>
              <View style={s.hotPill}>
                <Text style={s.hotPillText}>핫이슈</Text>
              </View>
              <Text style={s.hotText} numberOfLines={1}>
                {HOT_ISSUE}
              </Text>
              <Icon name="chevronRight" size={16} color={c.muted} />
            </Pressable>

            <ChipTabs
              items={STORE_CATEGORIES}
              value={category}
              onChange={setCategory}
              fadeColor={c.bg}
            />

            <View style={s.sectionHead}>
              <Text style={s.sectionTitle}>강남 인기 업소</Text>
              <Pressable onPress={goAllStores} hitSlop={8} style={s.moreBtn}>
                <Text style={s.moreText}>더보기</Text>
                <Icon name="chevronRight" size={14} color={c.muted} />
              </Pressable>
            </View>

            {loading ? <ActivityIndicator color={c.accent} style={s.loading} /> : null}
            {error ? <Text style={s.error}>{error}</Text> : null}
          </>
        }
        ListEmptyComponent={
          loading ? undefined : (
            <View style={s.empty}>
              <Text style={s.emptyTitle}>표시할 업소가 없습니다</Text>
              <Text style={s.emptyDesc}>카테고리를 바꿔보세요</Text>
            </View>
          )
        }
        ListFooterComponent={
          !initializing && !isLoggedIn ? (
            <Pressable style={s.cta} android_ripple={{ color: c.accentWeak }}>
              <Text style={s.ctaSmall}>지금 가입하면</Text>
              <Text style={s.ctaTitle}>맞춤 업소 추천을 받아보세요!</Text>
              <Text style={s.ctaDesc}>내 취향에 딱 맞는 공간을 찾아드립니다.</Text>
              <View style={s.ctaBtn}>
                <Text style={s.ctaBtnText}>로그인 / 회원가입</Text>
              </View>
            </Pressable>
          ) : undefined
        }
      />
    </View>
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    listContent: { paddingBottom: spacing.xl },
    column: { gap: spacing.sm, paddingHorizontal: spacing.page, marginBottom: spacing.sm },

    hot: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginHorizontal: spacing.page,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: c.accentWeak,
    },
    hotPill: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radius.pill,
      backgroundColor: c.accent,
    },
    hotPillText: { fontSize: fontSize.xs, fontWeight: '800', color: '#ffffff' },
    hotText: { flex: 1, fontSize: fontSize.md, fontWeight: '600', color: '#7a2447' },

    sectionHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.page,
      paddingTop: spacing.xs,
      paddingBottom: spacing.sm,
    },
    sectionTitle: { fontSize: fontSize.lg, fontWeight: '800', color: c.fg },
    moreBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    moreText: { fontSize: fontSize.sm, color: c.muted },

    loading: { marginVertical: spacing.xl },
    error: {
      marginHorizontal: spacing.page,
      marginBottom: spacing.md,
      fontSize: fontSize.sm,
      color: c.muted,
    },
    empty: { alignItems: 'center', paddingVertical: 48, gap: 4 },
    emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: c.fg },
    emptyDesc: { fontSize: fontSize.sm, color: c.muted },

    cta: {
      marginHorizontal: spacing.page,
      marginTop: spacing.sm,
      marginBottom: spacing.xl,
      padding: spacing.lg,
      borderRadius: radius.md,
      backgroundColor: c.accentWeak,
    },
    ctaSmall: { fontSize: fontSize.sm, color: '#a03465' },
    ctaTitle: { fontSize: fontSize.lg, fontWeight: '800', color: '#7a2447', marginTop: 2 },
    ctaDesc: { fontSize: fontSize.sm, color: '#a03465', marginTop: 4 },
    ctaBtn: {
      marginTop: spacing.md,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.sm,
      backgroundColor: c.accent,
    },
    ctaBtnText: { fontSize: fontSize.md, fontWeight: '700', color: '#ffffff' },
  });
