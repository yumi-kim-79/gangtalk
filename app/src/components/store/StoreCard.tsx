import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '@/components/common/Icon';
import { CATEGORY_LABEL } from '@/constants/stores';
import { useThumb } from '@/hooks/useThumb';
import {
  computeStatus,
  ratingOf,
  reviewCountOf,
  statusTone,
  type StatusTone,
} from '@/services/dashboard';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';
import type { Store } from '@/types/store';

type Props = {
  store: Store;
  /** 혼잡도 정규화에 같은 카테고리 분포가 필요해 전체 목록을 받는다 */
  all: Store[];
  roomsReady: boolean;
  onPress: (store: Store) => void;
};

const TONE_COLOR: Record<StatusTone, string> = {
  ok: '#16a34a',
  mid: '#f59e0b',
  busy: '#dc2626',
};

/** 웹 MainPage 의 .mp-store 카드 이식 */
function StoreCard({ store, all, roomsReady, onPress }: Props) {
  const c = useTheme();
  const s = styles(c);
  const thumb = useThumb(store);

  const label = roomsReady ? computeStatus(store, all) : '보통';
  const tone = roomsReady ? statusTone(label) : 'mid';

  return (
    <Pressable
      style={({ pressed }) => [s.card, pressed && s.pressed]}
      onPress={() => onPress(store)}
      android_ripple={{ color: c.chipBg }}
    >
      <View>
        {thumb ? (
          <Image source={{ uri: thumb }} style={s.image} resizeMode="cover" />
        ) : (
          <View style={[s.image, s.imageEmpty]}>
            <Text style={s.imageEmptyText}>{store.name?.slice(0, 2) ?? '?'}</Text>
          </View>
        )}
        <View style={s.badge}>
          <Text style={s.badgeText}>인기</Text>
        </View>
      </View>

      <View style={s.body}>
        <View style={s.head}>
          <View style={s.nameWrap}>
            <Text style={s.name} numberOfLines={1}>
              {store.name ?? '이름 없음'}
            </Text>
            <Text style={s.sub} numberOfLines={1}>
              {store.region || '강남'} · {CATEGORY_LABEL[store.category ?? ''] ?? store.category}
            </Text>
          </View>
          <Icon name="heart" size={20} color={c.line} />
        </View>

        <View style={s.ratingRow}>
          <Icon name="star" size={14} color="#f5b301" />
          <Text style={s.rate}>{ratingOf(store)}</Text>
          <Text style={s.reviews}>리뷰 {reviewCountOf(store)}</Text>
        </View>

        <View style={s.metrics}>
          <Metric value={roomsReady ? String(store.match ?? 0) : '—'} label="맞출방" colors={c} />
          <Metric
            value={roomsReady ? String(store.persons ?? 0) : '—'}
            label="필요인원"
            colors={c}
          />
          <Metric value={label} label="혼잡도" colors={c} valueColor={TONE_COLOR[tone]} />
        </View>
      </View>
    </Pressable>
  );
}

function Metric({
  value,
  label,
  colors,
  valueColor,
}: {
  value: string;
  label: string;
  colors: ThemeColors;
  valueColor?: string;
}) {
  const s = styles(colors);
  return (
    <View style={s.metric}>
      <Text style={[s.metricNum, { color: valueColor ?? colors.accent }]}>{value}</Text>
      <Text style={s.metricLabel}>{label}</Text>
    </View>
  );
}

export default React.memo(StoreCard);

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
      marginHorizontal: spacing.page,
      marginBottom: spacing.md,
      overflow: 'hidden',
    },
    pressed: { opacity: 0.9 },
    image: { width: '100%', aspectRatio: 16 / 9, backgroundColor: c.chipBg },
    imageEmpty: { alignItems: 'center', justifyContent: 'center' },
    imageEmptyText: { fontSize: 32, fontWeight: '800', color: c.muted },
    badge: {
      position: 'absolute',
      top: spacing.sm,
      left: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radius.pill,
      backgroundColor: c.accent,
    },
    badgeText: { fontSize: fontSize.xs, fontWeight: '800', color: '#ffffff' },
    body: { padding: spacing.md },
    head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    nameWrap: { flex: 1 },
    name: { fontSize: fontSize.lg, fontWeight: '700', color: c.fg },
    sub: { fontSize: fontSize.sm, color: c.muted, marginTop: 2 },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.sm,
    },
    rate: { fontSize: fontSize.sm, fontWeight: '700', color: c.fg },
    reviews: { fontSize: fontSize.sm, color: c.muted },
    metrics: {
      flexDirection: 'row',
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.line,
    },
    metric: { flex: 1, alignItems: 'center', gap: 2 },
    metricNum: { fontSize: fontSize.lg, fontWeight: '800' },
    metricLabel: { fontSize: fontSize.xs, color: c.muted },
  });
