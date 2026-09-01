import React, { useCallback } from 'react';
import { useRoute, type RouteProp } from '@react-navigation/native';
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '@/components/common/Icon';
import { CATEGORY_LABEL } from '@/constants/stores';
import { useFavorite } from '@/hooks/useFavorite';
import { useStore } from '@/hooks/useStore';
import { useThumb } from '@/hooks/useThumb';
import { eventTextOf, likesOf, payText, scoreOf, wageOf } from '@/services/stores';
import type { StoresStackParamList } from '@/navigation/types';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';
import type { Store } from '@/types/store';

/** 안심번호 우선순위 — 웹 StoreDetail.vue 와 동일 */
const safePhoneOf = (s: Store): string =>
  String(s.safePhone || s.phoneSafe || s.phone || '').trim();

/** 오픈채팅 우선순위 — openChatUrl → kakaoOpenChat → kakao */
const openChatOf = (s: Store): string =>
  String(s.openChatUrl || s.kakaoOpenChat || s.kakao || '').trim();

export default function StoreDetailScreen() {
  const c = useTheme();
  const s = styles(c);
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<StoresStackParamList, 'StoreDetail'>>();
  const { store, loading, error } = useStore(route.params.storeId);
  const { favorited, myRating, toggle, rate } = useFavorite(route.params.storeId);

  const openUrl = useCallback((url: string) => {
    if (url) Linking.openURL(url).catch(() => {});
  }, []);

  if (loading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }
  if (error || !store) {
    return (
      <View style={[s.root, s.center]}>
        <Text style={s.emptyTitle}>업체를 찾을 수 없습니다</Text>
        {error ? <Text style={s.emptyDesc}>{error}</Text> : null}
      </View>
    );
  }

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 96 + insets.bottom }}>
        <StoreHero store={store} />

        <View style={s.head}>
          <Text style={s.name}>{store.name || '가게'}</Text>
          <Text style={s.meta}>
            {store.region || '-'} · {CATEGORY_LABEL[store.category ?? ''] ?? ''}
          </Text>
          <View style={s.rateRow}>
            <Icon name="star" size={16} color="#f5b301" />
            <Text style={s.score}>{scoreOf(store)}</Text>
            <Text style={s.count}>({likesOf(store)})</Text>
            <View style={s.flex} />
            <Pressable onPress={toggle} hitSlop={8} style={s.wishBtn}>
              <Icon name="heart" size={22} color={favorited ? c.accent : c.line} />
            </Pressable>
          </View>

          <View style={s.starsRow}>
            {[1, 2, 3, 4, 5].map(n => (
              <Pressable key={n} onPress={() => rate(n)} hitSlop={4} style={s.starBtn}>
                <Icon
                  name="star"
                  size={26}
                  color={myRating >= n ? '#f5b301' : c.line}
                />
              </Pressable>
            ))}
            <Text style={s.starHint}>
              {myRating > 0 ? `내 별점 ${myRating}점 (다시 누르면 취소)` : '별점을 남겨보세요'}
            </Text>
          </View>
        </View>

        <Section title="소개" colors={c}>
          <Text style={s.body}>
            {store.longDesc || store.desc || store.description || '등록된 소개가 없습니다.'}
          </Text>
        </Section>

        {eventTextOf(store) ? (
          <Section title="이벤트" colors={c}>
            <Text style={[s.body, s.event]}>{eventTextOf(store)}</Text>
          </Section>
        ) : null}

        <Section title="시급" colors={c}>
          <Text style={s.pay}>{wageOf(store) ? payText(store) : '문의'}</Text>
          {store.payNote ? <Text style={s.note}>{store.payNote}</Text> : null}
        </Section>

        <Section title="영업 정보" colors={c}>
          <Row label="영업시간" value={store.hours || '-'} colors={c} />
          <Row label="룸" value={store.totalRooms ? `${store.totalRooms}개` : '-'} colors={c} />
          <Row
            label="필요인원"
            value={store.totalRemaining ? `${store.totalRemaining}명` : '-'}
            colors={c}
          />
        </Section>

        <Section title="위치" colors={c}>
          <Text style={s.body}>{store.address || '주소 정보가 없습니다.'}</Text>
        </Section>
      </ScrollView>

      <View style={[s.bar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <BarButton
          label="안심문자"
          disabled={!safePhoneOf(store)}
          onPress={() => openUrl(`sms:${safePhoneOf(store)}`)}
          colors={c}
        />
        <BarButton
          label="안심전화"
          disabled={!safePhoneOf(store)}
          onPress={() => openUrl(`tel:${safePhoneOf(store)}`)}
          colors={c}
        />
        <BarButton
          label="오픈카톡"
          primary
          disabled={!openChatOf(store)}
          onPress={() => openUrl(openChatOf(store))}
          colors={c}
        />
      </View>
    </View>
  );
}

function StoreHero({ store }: { store: Store }) {
  const c = useTheme();
  const s = styles(c);
  const uri = useThumb(store);
  return uri ? (
    <Image source={{ uri }} style={s.hero} resizeMode="cover" />
  ) : (
    <View style={[s.hero, s.heroEmpty]}>
      <Text style={s.heroEmptyText}>{store.name?.slice(0, 2) ?? '?'}</Text>
    </View>
  );
}

function Section({
  title,
  children,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  colors: ThemeColors;
}) {
  const s = styles(colors);
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ThemeColors;
}) {
  const s = styles(colors);
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

function BarButton({
  label,
  onPress,
  disabled,
  primary,
  colors,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
  colors: ThemeColors;
}) {
  const s = styles(colors);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.barBtn,
        primary && s.barBtnPrimary,
        disabled && s.barBtnDisabled,
        pressed && !disabled && s.barBtnPressed,
      ]}
      android_ripple={disabled ? undefined : { color: colors.chipBorder }}
    >
      <Text style={[s.barText, primary && s.barTextPrimary, disabled && s.barTextDisabled]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    center: { alignItems: 'center', justifyContent: 'center', gap: 4 },
    emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: c.fg },
    emptyDesc: { fontSize: fontSize.sm, color: c.muted },

    hero: { width: '100%', aspectRatio: 16 / 10, backgroundColor: c.chipBg },
    heroEmpty: { alignItems: 'center', justifyContent: 'center' },
    heroEmptyText: { fontSize: 40, fontWeight: '800', color: c.muted },

    head: { paddingHorizontal: spacing.page, paddingTop: spacing.lg },
    name: { fontSize: fontSize.xxl, fontWeight: '800', color: c.fg },
    meta: { fontSize: fontSize.md, color: c.muted, marginTop: 4 },
    rateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
    flex: { flex: 1 },
    wishBtn: { padding: 4 },
    starsRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: spacing.sm },
    starBtn: { padding: 2 },
    starHint: { marginLeft: spacing.sm, fontSize: fontSize.xs, color: c.muted },

    score: { fontSize: fontSize.md, fontWeight: '700', color: c.fg },
    count: { fontSize: fontSize.sm, color: c.muted },

    section: {
      paddingHorizontal: spacing.page,
      paddingVertical: spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.line,
      marginTop: spacing.lg,
    },
    sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: c.fg, marginBottom: spacing.sm },
    body: { fontSize: fontSize.md, lineHeight: 22, color: c.fg },
    event: { color: c.accent },
    pay: { fontSize: fontSize.xl, fontWeight: '800', color: c.fg },
    note: { fontSize: fontSize.sm, color: c.muted, marginTop: 4 },

    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
    infoLabel: { fontSize: fontSize.md, color: c.muted },
    infoValue: { fontSize: fontSize.md, color: c.fg, fontWeight: '600' },

    bar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.page,
      paddingTop: spacing.sm,
      backgroundColor: c.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.line,
    },
    barBtn: {
      flex: 1,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.chipBorder,
      backgroundColor: c.surface,
    },
    barBtnPrimary: { backgroundColor: c.accent, borderColor: c.accent },
    barBtnPressed: { opacity: Platform.OS === 'ios' ? 0.6 : 1 },
    barBtnDisabled: { opacity: 0.4 },
    barText: { fontSize: fontSize.md, fontWeight: '600', color: c.fg },
    barTextPrimary: { color: '#ffffff' },
    barTextDisabled: { color: c.muted },
  });
