import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '@/components/common/Icon';
import { CATEGORY_LABEL } from '@/constants/stores';
import { useThumb } from '@/hooks/useThumb';
import {
  ratingOf,
  resolveStatus,
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
  favorited?: boolean;
  onToggleFavorite?: (store: Store) => void;
  /** 초톡방 열기 — 업체가 붙여넣은 카톡 내용 보기 */
  onOpenChotok?: (store: Store) => void;
};

const TONE_COLOR: Record<StatusTone, string> = {
  ok: '#16a34a',
  mid: '#f59e0b',
  busy: '#dc2626',
};

/**
 * 현황판 업소 카드 — 웹 MainPage 의 .mp-store 를 가로 1행으로 이식.
 * 왼쪽 정사각 썸네일 + 오른쪽 정보, 그 아래 지표 3종(맞출방/필요인원/혼잡도).
 */
function StoreStatusCard({
  store,
  all,
  roomsReady,
  onPress,
  favorited,
  onToggleFavorite,
  onOpenChotok,
}: Props) {
  const c = useTheme();
  const s = styles(c);
  const thumb = useThumb(store);

  const label = roomsReady ? resolveStatus(store, all) : '보통';
  const tone = roomsReady ? statusTone(label) : 'mid';

  return (
    <Pressable
      style={({ pressed }) => [s.card, pressed && s.pressed]}
      onPress={() => onPress(store)}
      android_ripple={{ color: c.chipBg }}
    >
      <View style={s.top}>
        <View>
          {thumb ? (
            <Image source={{ uri: thumb }} style={s.thumb} resizeMode="cover" />
          ) : (
            <View style={[s.thumb, s.thumbEmpty]}>
              <Text style={s.thumbEmptyText}>{store.name?.slice(0, 2) ?? '?'}</Text>
            </View>
          )}
          <View style={s.badge}>
            <Text style={s.badgeText}>인기</Text>
          </View>
        </View>

        <View style={s.info}>
          <Text style={s.name} numberOfLines={1}>
            {store.name ?? '이름 없음'}
          </Text>
          <Text style={s.sub} numberOfLines={1}>
            {store.region || '강남'} · {CATEGORY_LABEL[store.category ?? ''] ?? store.category}
          </Text>
          <View style={s.ratingRow}>
            <Icon name="star" size={13} color="#f5b301" />
            <Text style={s.rate}>{ratingOf(store)}</Text>
            <Text style={s.reviews}>리뷰 {reviewCountOf(store)}</Text>
          </View>
        </View>

        <View style={s.side}>
          {onToggleFavorite ? (
            <Pressable onPress={() => onToggleFavorite(store)} hitSlop={8} style={s.heart}>
              <Icon name="heart" size={20} color={favorited ? c.accent : c.line} />
            </Pressable>
          ) : null}

          {onOpenChotok ? (
            <Pressable
              onPress={() => onOpenChotok(store)}
              hitSlop={6}
              style={({ pressed }) => [s.chotok, pressed && s.chotokPressed]}
            >
              <Icon name="chat" size={14} color={c.accent} />
              <Text style={s.chotokText}>초톡</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={s.metrics}>
        <View style={s.metric}>
          <Text style={s.metricNum}>{roomsReady ? (store.match ?? 0) : '—'}</Text>
          <Text style={s.metricLabel}>맞출방</Text>
        </View>
        <View style={s.metric}>
          <Text style={s.metricNum}>{roomsReady ? (store.persons ?? 0) : '—'}</Text>
          <Text style={s.metricLabel}>필요인원</Text>
        </View>
        <View style={s.metric}>
          <View style={s.statusRow}>
            <Icon name="signal" size={14} color={TONE_COLOR[tone]} />
            <Text style={[s.statusText, { color: TONE_COLOR[tone] }]}>{label}</Text>
          </View>
          <Text style={s.metricLabel}>혼잡도</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default React.memo(StoreStatusCard);

const THUMB = 84;

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      paddingHorizontal: spacing.page,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.line,
    },
    pressed: { backgroundColor: c.chipBg },

    top: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
    thumb: { width: THUMB, height: THUMB, borderRadius: radius.sm, backgroundColor: c.chipBg },
    thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
    thumbEmptyText: { fontSize: fontSize.lg, fontWeight: '800', color: c.muted },
    badge: {
      position: 'absolute',
      top: 5,
      left: 5,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: radius.pill,
      backgroundColor: c.accent,
    },
    badgeText: { fontSize: 9, fontWeight: '800', color: '#ffffff' },

    info: { flex: 1, gap: 2, paddingTop: 2 },
    name: { fontSize: fontSize.xl, fontWeight: '800', color: c.fg },
    sub: { fontSize: fontSize.sm, color: c.muted },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
    rate: { fontSize: fontSize.md, fontWeight: '700', color: c.fg },
    reviews: { fontSize: fontSize.sm, color: c.muted },
    heart: { padding: 2 },
    side: { alignItems: 'flex-end', gap: spacing.sm, paddingTop: 2 },
    chotok: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: c.accent,
      backgroundColor: c.surface,
    },
    chotokPressed: { backgroundColor: c.accentWeak },
    chotokText: { fontSize: fontSize.xs, fontWeight: '800', color: c.accent },

    metrics: { flexDirection: 'row', marginTop: spacing.sm },
    metric: { flex: 1, alignItems: 'center', gap: 1 },
    metricNum: { fontSize: fontSize.lg, fontWeight: '800', color: c.accent },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    statusText: { fontSize: fontSize.md, fontWeight: '800' },
    metricLabel: { fontSize: fontSize.xs, color: c.muted },
  });
