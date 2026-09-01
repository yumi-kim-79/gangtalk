import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { CATEGORY_LABEL } from '@/constants/stores';
import { useThumb } from '@/hooks/useThumb';
import { eventTextOf, introOf, managerName, payText } from '@/services/stores';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';
import type { Store } from '@/types/store';

type Props = { store: Store; rank: number; onPress: (store: Store) => void };

/**
 * 가게찾기 카테고리별 Top5 카드 — 웹 StoreFinder 의 Top5 카드 이식.
 * 순위 뱃지 + 업소명 ㅣ 지역·유형 + 이벤트 문구 + 일급 + 담당자.
 */
function StoreTopCard({ store, rank, onPress }: Props) {
  const c = useTheme();
  const s = styles(c);
  const thumb = useThumb(store);
  const headline = eventTextOf(store) || introOf(store);
  const manager = managerName(store);

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
        <View style={s.rank}>
          <Text style={s.rankText}>{rank}</Text>
        </View>
      </View>

      <View style={s.body}>
        <Text style={s.titleLine} numberOfLines={1}>
          <Text style={s.name}>{store.name ?? '이름 없음'}</Text>
          <Text style={s.sub}>
            {'  ㅣ  '}
            {store.region || '강남'} · {CATEGORY_LABEL[store.category ?? ''] ?? ''}
          </Text>
        </Text>

        {headline ? (
          <Text style={s.headline} numberOfLines={1}>
            {headline}
          </Text>
        ) : null}

        <Text style={s.pay}>일급 {payText(store)}</Text>
        {manager ? <Text style={s.manager}>담당: {manager}</Text> : null}
      </View>
    </Pressable>
  );
}

export default React.memo(StoreTopCard);

/** 화면당 2장이 보이도록 */
const CARD_W = 190;

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
      width: CARD_W,
      borderRadius: radius.md,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
      overflow: 'hidden',
    },
    pressed: { opacity: 0.9 },
    image: { width: '100%', aspectRatio: 16 / 9, backgroundColor: c.chipBg },
    imageEmpty: { alignItems: 'center', justifyContent: 'center' },
    imageEmptyText: { fontSize: 20, fontWeight: '800', color: c.muted },
    rank: {
      position: 'absolute',
      top: 6,
      left: 6,
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.accent,
    },
    rankText: { fontSize: fontSize.xs, fontWeight: '800', color: '#ffffff' },

    body: { padding: spacing.sm, gap: 1 },
    titleLine: { fontSize: fontSize.md },
    name: { fontSize: fontSize.md, fontWeight: '800', color: c.fg },
    sub: { fontSize: fontSize.xs, color: c.muted, fontWeight: '400' },
    headline: { fontSize: fontSize.xs, color: c.fg },
    pay: { fontSize: fontSize.md, fontWeight: '800', color: c.accent, marginTop: 1 },
    manager: { fontSize: fontSize.xs, color: c.muted },
  });
