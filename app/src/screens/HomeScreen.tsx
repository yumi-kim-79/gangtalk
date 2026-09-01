import React, { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AppHeader from '@/components/common/AppHeader';
import Icon from '@/components/common/Icon';
import ChipTabs from '@/components/common/ChipTabs';
import { STORE_CATEGORIES } from '@/constants/stores';
import StoreStatusCard from '@/components/store/StoreStatusCard';
import { useAuth } from '@/hooks/useAuth';
import { useHomeStores } from '@/hooks/useHomeStores';
import { useNewsline } from '@/hooks/useNewsline';
import type { MainTabParamList } from '@/navigation/types';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';
import type { Store } from '@/types/store';

/** 관리자 "뉴스/한줄 관리" 에 등록된 글이 없을 때만 쓰는 기본 문구 (웹과 동일) */
const HOT_ISSUE_FALLBACK = '강남톡방 그랜드오픈 이벤트 진행중!';

export default function HomeScreen() {
  const c = useTheme();
  const s = styles(c);
  const navigation = useNavigation<NavigationProp<MainTabParamList>>();
  const { isLoggedIn, initializing } = useAuth();

  const [category, setCategory] = useState('all');
  const [keyword, setKeyword] = useState('');
  const { stores, all, loading, roomsReady, error } = useHomeStores(category, keyword);
  const { visible: news, current: currentNews } = useNewsline();
  const [newsOpen, setNewsOpen] = useState(false);

  const openStore = useCallback(
    (store: Store) =>
      navigation.navigate('Stores', { screen: 'StoreDetail', params: { storeId: store.id } }),
    [navigation],
  );
  const goAllStores = useCallback(
    () => navigation.navigate('Stores', { screen: 'StoreList' }),
    [navigation],
  );
  const openChotok = useCallback(
    (store: Store) =>
      navigation.navigate('Stores', {
        screen: 'Chotok',
        params: { storeId: store.id, storeName: store.name ?? '업체' },
      }),
    [navigation],
  );

  return (
    <View style={s.root}>
      <FlatList
        data={stores}
        keyExtractor={item => item.id}
        contentContainerStyle={s.listContent}
        renderItem={({ item }) => (
          <StoreStatusCard
            store={item}
            all={all}
            roomsReady={roomsReady}
            onPress={openStore}
            onOpenChotok={openChotok}
          />
        )}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={8}
        windowSize={5}
        removeClippedSubviews
        ListHeaderComponent={
          <>
            <AppHeader searchValue={keyword} onChangeSearch={setKeyword} />

            <Pressable
              style={s.hot}
              android_ripple={{ color: c.accentWeak }}
              onPress={() => news.length && setNewsOpen(true)}
            >
              <View style={s.hotPill}>
                <Text style={s.hotPillText}>핫이슈</Text>
              </View>
              <Text style={s.hotText} numberOfLines={1}>
                {currentNews?.title ?? HOT_ISSUE_FALLBACK}
              </Text>
              {currentNews?.isNew ? <Text style={s.hotNew}>NEW</Text> : null}
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

      {/* 핫이슈 전체 보기 — 관리자가 등록한 순서 그대로 */}
      <Modal
        visible={newsOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setNewsOpen(false)}
      >
        <Pressable style={s.sheetDim} onPress={() => setNewsOpen(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>핫이슈</Text>
            <ScrollView style={s.sheetBody}>
              {news.map(n => (
                <View key={n.id} style={s.newsRow}>
                  <Text style={s.newsText}>{n.title}</Text>
                  {n.isNew ? <Text style={s.hotNew}>NEW</Text> : null}
                </View>
              ))}
            </ScrollView>
            <Pressable style={s.sheetClose} onPress={() => setNewsOpen(false)}>
              <Text style={s.sheetCloseText}>닫기</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    listContent: { paddingBottom: spacing.xl },

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
    hotNew: {
      fontSize: fontSize.xs,
      fontWeight: '800',
      color: c.accent,
      letterSpacing: 0.3,
    },

    sheetDim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: {
      maxHeight: '70%',
      paddingBottom: spacing.xl,
      borderTopLeftRadius: radius.md,
      borderTopRightRadius: radius.md,
      backgroundColor: c.surface,
    },
    sheetHandle: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      marginTop: spacing.sm,
      borderRadius: 2,
      backgroundColor: c.line,
    },
    sheetTitle: {
      fontSize: fontSize.lg,
      fontWeight: '800',
      color: c.fg,
      paddingHorizontal: spacing.page,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    sheetBody: { paddingHorizontal: spacing.page },
    newsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.line,
    },
    newsText: { flex: 1, fontSize: fontSize.md, color: c.fg },
    sheetClose: {
      marginHorizontal: spacing.page,
      marginTop: spacing.md,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.sm,
      backgroundColor: c.accentWeak,
    },
    sheetCloseText: { fontSize: fontSize.md, fontWeight: '700', color: c.accent },

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
