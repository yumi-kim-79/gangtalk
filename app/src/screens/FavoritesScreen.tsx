import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ChipTabs from '@/components/common/ChipTabs';
import Icon from '@/components/common/Icon';
import PartnerCard from '@/components/partner/PartnerCard';
import StoreListItem from '@/components/store/StoreListItem';
import { useAuth } from '@/hooks/useAuth';
import { useMyFavorites } from '@/hooks/useMyFavorites';
import { subscribeMyFavorites, subscribeMyPartnerFavorites } from '@/services/mypage';
import type { RootStackParamList } from '@/navigation/types';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';
import type { Partner } from '@/types/partner';
import type { Store } from '@/types/store';

/** 웹 FavoritesPage.vue:9-11 의 탭과 동일 */
const TABS = [
  { key: 'all', label: '전체' },
  { key: 'store', label: '업체' },
  { key: 'partner', label: '제휴업체' },
];

export default function FavoritesScreen() {
  const c = useTheme();
  const s = styles(c);
  /* 이 화면은 두 곳에 있다 — 마이 탭 스택 안, 그리고 헤더 메뉴용 루트 스택.
   * 어느 쪽에서 열려도 같게 동작하도록 **루트 경로로 명시 이동**한다. */
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { uid } = useAuth();
  const { toggleStore, togglePartner } = useMyFavorites();

  const [tab, setTab] = useState('all');
  const [stores, setStores] = useState<Store[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [loadingPartners, setLoadingPartners] = useState(true);

  useEffect(() => {
    if (!uid) {
      setLoadingStores(false);
      setLoadingPartners(false);
      return;
    }
    const unsubStores = subscribeMyFavorites(
      uid,
      rows => {
        setStores(rows);
        setLoadingStores(false);
      },
      () => setLoadingStores(false),
    );
    const unsubPartners = subscribeMyPartnerFavorites(
      uid,
      rows => {
        setPartners(rows);
        setLoadingPartners(false);
      },
      () => setLoadingPartners(false),
    );
    return () => {
      unsubStores();
      unsubPartners();
    };
  }, [uid]);

  const openStore = useCallback(
    (store: Store) =>
      navigation.navigate('MainTabs', {
        screen: 'Stores',
        params: { screen: 'StoreDetail', params: { storeId: store.id } },
      }),
    [navigation],
  );

  const openPartner = useCallback(
    (partner: Partner) =>
      navigation.navigate('MainTabs', {
        screen: 'Partners',
        params: { screen: 'PartnerDetail', params: { partnerId: partner.id } },
      }),
    [navigation],
  );

  /** 전체 탭은 업체 → 제휴업체 순으로 이어 붙인다 (웹과 동일) */
  type Row =
    | { kind: 'store'; id: string; store: Store }
    | { kind: 'partner'; id: string; partner: Partner };

  const rows = useMemo<Row[]>(() => {
    const st: Row[] = stores.map(x => ({ kind: 'store', id: `s_${x.id}`, store: x }));
    const pt: Row[] = partners.map(x => ({ kind: 'partner', id: `p_${x.id}`, partner: x }));
    if (tab === 'store') return st;
    if (tab === 'partner') return pt;
    return [...st, ...pt];
  }, [stores, partners, tab]);

  if (loadingStores || loadingPartners) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <ChipTabs items={TABS} value={tab} onChange={setTab} />

      <FlatList
        data={rows}
        keyExtractor={r => r.id}
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <View style={s.row}>
            <View style={s.rowBody}>
              {item.kind === 'store' ? (
                <StoreListItem store={item.store} onPress={openStore} />
              ) : (
                <PartnerCard partner={item.partner} onPress={openPartner} />
              )}
            </View>

            {/* 찜 해제 — 웹 FavoritesPage.vue:98-100 에는 있는데 앱에는 없어서
                상세화면에 들어가지 않으면 뺄 방법이 없었다 */}
            <Pressable
              style={s.remove}
              onPress={() =>
                (item.kind === 'store'
                  ? toggleStore(item.store.id)
                  : togglePartner(item.partner.id)
                ).catch(e =>
                  Alert.alert(
                    '찜 해제 실패',
                    e instanceof Error ? e.message : '잠시 후 다시 시도해 주세요.',
                  ),
                )
              }
              hitSlop={8}
            >
              <Icon name="heart" size={18} color={c.accent} filled />
              <Text style={s.removeText}>해제</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          /* 문구는 웹 FavoritesPage.vue:36-41 과 동일하게 맞췄다 (바로가기 버튼까지) */
          <View style={s.center}>
            <Text style={s.emptyTitle}>아직 찜한 항목이 없어요.</Text>
            <Text style={s.emptyDesc}>가게/제휴관 카드의 하트를 눌러 추가해 보세요.</Text>
            <View style={s.emptyBtns}>
              <Pressable
                style={s.emptyBtn}
                onPress={() => navigation.navigate('MainTabs', { screen: 'Stores', params: { screen: 'StoreList' } })}
              >
                <Text style={s.emptyBtnText}>가게 찾기</Text>
              </Pressable>
              <Pressable
                style={s.emptyBtn}
                onPress={() => navigation.navigate('MainTabs', { screen: 'Partners', params: { screen: 'PartnerList' } })}
              >
                <Text style={s.emptyBtnText}>제휴관 보기</Text>
              </Pressable>
            </View>
          </View>
        }
      />
    </View>
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    list: { paddingBottom: spacing.xl },
    center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64, gap: 4 },
    emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: c.fg },
    emptyDesc: { fontSize: fontSize.sm, color: c.muted },
    emptyBtns: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    emptyBtn: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: radius.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.chipBorder,
      backgroundColor: c.surface,
    },
    emptyBtnText: { fontSize: fontSize.md, fontWeight: '600', color: c.fg },

    row: { position: 'relative' },
    rowBody: { flex: 1 },
    remove: {
      position: 'absolute',
      right: spacing.page,
      top: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radius.pill,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
    },
    removeText: { fontSize: fontSize.xs, fontWeight: '700', color: c.accent },
  });
