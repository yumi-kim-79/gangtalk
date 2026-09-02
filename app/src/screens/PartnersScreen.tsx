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
import BannerSlider from '@/components/common/BannerSlider';
import ChipTabs from '@/components/common/ChipTabs';
import Icon from '@/components/common/Icon';
import PartnerCard, { PartnerRow } from '@/components/partner/PartnerCard';
import { PARTNER_CATEGORIES, PARTNER_CATEGORY_LABEL } from '@/constants/partners';
import { useBanners } from '@/hooks/useBanners';
import { usePartners } from '@/hooks/usePartners';
import { topByCategory } from '@/services/partners';
import type { PartnersStackParamList } from '@/navigation/types';
import { fontSize, spacing, useTheme, type ThemeColors } from '@/theme';
import type { Partner } from '@/types/partner';

const CATEGORY_TABS = [
  { key: 'all', label: '전체' },
  ...PARTNER_CATEGORIES.map(c => ({ key: c.key, label: c.label })),
];

export default function PartnersScreen() {
  const c = useTheme();
  const s = styles(c);
  const navigation =
    useNavigation<NativeStackNavigationProp<PartnersStackParamList, 'PartnerList'>>();

  const [category, setCategory] = useState('all');
  const [keyword, setKeyword] = useState('');
  const { all, filtered, ranks, loading, error } = usePartners(category, keyword);
  const { banners, ready: bannersReady } = useBanners('P');

  const openPartner = useCallback(
    (p: Partner) => navigation.navigate('PartnerDetail', { partnerId: p.id }),
    [navigation],
  );

  /** 전체 탭이면 모든 카테고리 섹션, 특정 카테고리면 그 하나만 (웹 visibleCategories) */
  const sections = useMemo(
    () =>
      (category === 'all'
        ? PARTNER_CATEGORIES
        : PARTNER_CATEGORIES.filter(x => x.key === category)
      ).map(cat => ({ ...cat, items: topByCategory(all, ranks, cat.key) })),
    [category, all, ranks],
  );

  return (
    <View style={s.root}>
      <FlatList
        data={keyword ? filtered : filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <PartnerRow partner={item} onPress={openPartner} />}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={8}
        removeClippedSubviews
        ListHeaderComponent={
          <>
            <AppHeader
              searchValue={keyword}
              searchPlaceholder="업체명, 지역, 업종을 검색해보세요"
              onChangeSearch={setKeyword}
            />

            <ChipTabs
              items={CATEGORY_TABS}
              value={category}
              onChange={setCategory}
              fadeColor={c.bg}
            />

            {/* 제휴관 배너 — 웹 PartnersPage 가 쓰는 config/marketing/adBannersP 와 같은 소스 */}
            <BannerSlider banners={banners} ready={bannersReady} />

            {loading ? <ActivityIndicator color={c.accent} style={s.loading} /> : null}
            {error ? <Text style={s.error}>{error}</Text> : null}

            {/* 카테고리별 Top 5 */}
            {sections.map(sec =>
              sec.items.length ? (
                <View key={sec.key} style={s.section}>
                  <View style={s.sectionHead}>
                    <Text style={s.sectionTitle}>{sec.label} Top 5</Text>
                    <Pressable
                      onPress={() => setCategory(sec.key)}
                      hitSlop={8}
                      style={s.moreBtn}
                    >
                      <Text style={s.moreText}>더보기</Text>
                      <Icon name="chevronRight" size={14} color={c.muted} />
                    </Pressable>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.cardRow}
                  >
                    {sec.items.map((p, i) => (
                      <PartnerCard key={p.id} partner={p} rank={i + 1} onPress={openPartner} />
                    ))}
                  </ScrollView>
                </View>
              ) : null,
            )}

            <View style={s.listHead}>
              <Text style={s.listCount}>
                {category === 'all' ? '전체' : PARTNER_CATEGORY_LABEL[category]} {filtered.length}
                개
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          loading ? undefined : (
            <View style={s.empty}>
              <Text style={s.emptyTitle}>제휴업체가 없습니다</Text>
              <Text style={s.emptyDesc}>
                {keyword ? '다른 검색어로 찾아보세요' : '다른 카테고리를 눌러보세요'}
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    loading: { marginVertical: spacing.lg },
    error: {
      marginHorizontal: spacing.page,
      fontSize: fontSize.sm,
      color: c.muted,
    },
    section: { marginTop: spacing.sm },
    sectionHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.page,
      paddingBottom: spacing.sm,
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

    empty: { alignItems: 'center', paddingVertical: 48, gap: 4 },
    emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: c.fg },
    emptyDesc: { fontSize: fontSize.sm, color: c.muted },
  });
