import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '@/components/common/Icon';
import { useThumb } from '@/hooks/useThumb';
import { CATEGORY_LABEL } from '@/constants/stores';
import {
  eventTextOf,
  introOf,
  likesOf,
  managerName,
  payText,
  scoreOf,
} from '@/services/stores';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';
import type { Store } from '@/types/store';

type Props = { store: Store; onPress: (store: Store) => void };

/**
 * 두칸 보기 카드 — 웹 components/finder/StoreGridView.vue 이식.
 * 표시 항목(썸네일 / 업체명·지역·유형 / 소개 / 담당 ⭐ 점수(찜) / 이벤트 / 일급)은
 * 한줄 보기와 동일하고 배치만 세로로 바꿨다.
 */
function StoreGridItem({ store, onPress }: Props) {
  const c = useTheme();
  const s = styles(c);
  const thumb = useThumb(store);
  const event = eventTextOf(store);
  const manager = managerName(store);

  return (
    <Pressable
      onPress={() => onPress(store)}
      style={({ pressed }) => [s.card, pressed && s.cardPressed]}
      android_ripple={{ color: c.chipBg }}
    >
      {thumb ? (
        <Image source={{ uri: thumb }} style={s.thumb} resizeMode="cover" />
      ) : (
        <View style={[s.thumb, s.thumbEmpty]}>
          <Text style={s.thumbEmptyText}>{store.name?.slice(0, 2) ?? '?'}</Text>
        </View>
      )}

      <View style={s.meta}>
        <Text style={s.name} numberOfLines={1}>
          {store.name ?? '이름 없음'}
        </Text>
        <Text style={s.sub} numberOfLines={1}>
          {store.region || '강남'} · {CATEGORY_LABEL[store.category ?? ''] ?? ''}
        </Text>
        <Text style={s.desc} numberOfLines={1}>
          {introOf(store)}
        </Text>

        <View style={s.infoRow}>
          {manager ? (
            <Text style={s.manager} numberOfLines={1}>
              {manager}
            </Text>
          ) : null}
          <Icon name="star" size={12} color="#f5b301" />
          <Text style={s.score}>{scoreOf(store)}</Text>
          <Text style={s.count}>({likesOf(store)})</Text>
        </View>

        {event ? (
          <Text style={s.event} numberOfLines={1}>
            {event}
          </Text>
        ) : null}
        <Text style={s.pay} numberOfLines={1}>
          일급 {payText(store)}
        </Text>
      </View>
    </Pressable>
  );
}

export default React.memo(StoreGridItem);

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
    cardPressed: { backgroundColor: c.chipBg },
    thumb: { width: '100%', aspectRatio: 1.35, backgroundColor: c.chipBg },
    thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
    thumbEmptyText: { fontSize: fontSize.xl, fontWeight: '800', color: c.muted },
    meta: { padding: spacing.md, gap: 2 },
    name: { fontSize: fontSize.md, fontWeight: '700', color: c.fg },
    sub: { fontSize: fontSize.xs, color: c.muted },
    desc: { fontSize: fontSize.xs, color: c.muted },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
    manager: { fontSize: fontSize.xs, color: c.fg, maxWidth: '45%' },
    score: { fontSize: fontSize.xs, fontWeight: '700', color: c.fg },
    count: { fontSize: fontSize.xs, color: c.muted },
    event: { fontSize: fontSize.xs, color: c.accent, marginTop: 2 },
    pay: { fontSize: fontSize.xs, fontWeight: '700', color: c.fg },
  });
