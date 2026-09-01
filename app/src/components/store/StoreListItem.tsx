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
 * 웹 components/finder/StoreListView.vue 의 row-card 이식.
 * 행 구성(업체명 | 지역 · 유형 / 소개 / 담당 ⭐ 점수(찜) / 이벤트 / 일급)은 그대로 유지하고
 * 터치 피드백만 네이티브 방식으로 바꿨다.
 */
function StoreListItem({ store, onPress }: Props) {
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

      <View style={s.right}>
        <Text style={s.titleLine} numberOfLines={1}>
          <Text style={s.name}>{store.name ?? '이름 없음'}</Text>
          <Text style={s.meta}>
            {'  '}
            {store.region || '강남'} · {CATEGORY_LABEL[store.category ?? ''] ?? ''}
          </Text>
        </Text>

        <Text style={s.desc} numberOfLines={1}>
          {introOf(store)}
        </Text>

        <View style={s.infoRow}>
          {manager ? <Text style={s.manager}>{manager}</Text> : null}
          <Icon name="star" size={13} color="#f5b301" />
          <Text style={s.score}>{scoreOf(store)}</Text>
          <Text style={s.count}>({likesOf(store)})</Text>
        </View>

        <View style={s.bottomRow}>
          <Text style={s.event} numberOfLines={1}>
            {event}
          </Text>
          <Text style={s.pay}>일급 {payText(store)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

/** 목록이 길어 리렌더 비용이 커서 메모이즈 */
export default React.memo(StoreListItem);

const THUMB = 92;

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      paddingHorizontal: spacing.page,
      paddingVertical: spacing.md,
      gap: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.line,
    },
    cardPressed: { backgroundColor: c.chipBg },
    thumb: { width: THUMB, height: THUMB, borderRadius: radius.sm, backgroundColor: c.chipBg },
    thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
    thumbEmptyText: { fontSize: fontSize.xl, fontWeight: '800', color: c.muted },
    right: { flex: 1, justifyContent: 'space-between' },
    titleLine: { fontSize: fontSize.lg },
    name: { fontSize: fontSize.lg, fontWeight: '700', color: c.fg },
    meta: { fontSize: fontSize.sm, color: c.muted, fontWeight: '400' },
    desc: { fontSize: fontSize.sm, color: c.muted, marginTop: 2 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 4 },
    manager: { fontSize: fontSize.sm, color: c.fg, marginRight: spacing.xs },

    score: { fontSize: fontSize.sm, fontWeight: '700', color: c.fg },
    count: { fontSize: fontSize.sm, color: c.muted },
    bottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
      gap: spacing.sm,
    },
    event: { flex: 1, fontSize: fontSize.sm, color: c.accent },
    pay: { fontSize: fontSize.sm, fontWeight: '700', color: c.fg },
  });
