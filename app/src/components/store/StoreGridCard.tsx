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

/**
 * 홈 2열 그리드용 압축 카드.
 * 한 화면에 더 많은 업체를 보여주려고 지표 3줄을 이미지 위 뱃지 + 한 줄 텍스트로 접었다.
 */
function StoreGridCard({ store, all, roomsReady, onPress }: Props) {
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

        <View style={[s.status, { backgroundColor: TONE_COLOR[tone] }]}>
          <Text style={s.statusText}>{label}</Text>
        </View>
      </View>

      <View style={s.body}>
        <Text style={s.name} numberOfLines={1}>
          {store.name ?? '이름 없음'}
        </Text>
        <Text style={s.sub} numberOfLines={1}>
          {store.region || '강남'} · {CATEGORY_LABEL[store.category ?? ''] ?? store.category}
        </Text>

        <View style={s.ratingRow}>
          <Icon name="star" size={12} color="#f5b301" />
          <Text style={s.rate}>{ratingOf(store)}</Text>
          <Text style={s.reviews} numberOfLines={1}>
            리뷰 {reviewCountOf(store)}
          </Text>
        </View>

        <Text style={s.metrics} numberOfLines={1}>
          맞출방 <Text style={s.metricNum}>{roomsReady ? (store.match ?? 0) : '—'}</Text>
          {'  ·  '}
          인원 <Text style={s.metricNum}>{roomsReady ? (store.persons ?? 0) : '—'}</Text>
        </Text>
      </View>
    </Pressable>
  );
}

export default React.memo(StoreGridCard);

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
      overflow: 'hidden',
    },
    pressed: { opacity: 0.9 },
    image: { width: '100%', aspectRatio: 3 / 2, backgroundColor: c.chipBg },
    imageEmpty: { alignItems: 'center', justifyContent: 'center' },
    imageEmptyText: { fontSize: 22, fontWeight: '800', color: c.muted },
    badge: {
      position: 'absolute',
      top: 6,
      left: 6,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: radius.pill,
      backgroundColor: c.accent,
    },
    badgeText: { fontSize: 10, fontWeight: '800', color: '#ffffff' },
    status: {
      position: 'absolute',
      bottom: 6,
      right: 6,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    statusText: { fontSize: 10, fontWeight: '800', color: '#ffffff' },

    body: { padding: spacing.sm, gap: 0 },
    name: { fontSize: fontSize.md, fontWeight: '700', color: c.fg },
    sub: { fontSize: fontSize.xs, color: c.muted },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
    rate: { fontSize: fontSize.xs, fontWeight: '700', color: c.fg },
    reviews: { fontSize: fontSize.xs, color: c.muted },
    metrics: { fontSize: fontSize.xs, color: c.muted, marginTop: 2 },
    metricNum: { fontWeight: '800', color: c.accent },
  });
