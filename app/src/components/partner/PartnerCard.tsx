import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '@/components/common/Icon';
import { PARTNER_CATEGORY_LABEL } from '@/constants/partners';
import { isPriceLike } from '@/services/partners';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';
import type { Partner } from '@/types/partner';

type Props = {
  partner: Partner;
  /** Top5 섹션에서 쓰는 순위 뱃지 */
  rank?: number;
  onPress: (partner: Partner) => void;
};

/** 웹 .pp-card 이식 — Top5 가로 스크롤용 카드 */
function PartnerCard({ partner, rank, onPress }: Props) {
  const c = useTheme();
  const s = styles(c);
  const benefit = partner.benefits || partner.intro;

  return (
    <Pressable
      style={({ pressed }) => [s.card, pressed && s.pressed]}
      onPress={() => onPress(partner)}
      android_ripple={{ color: c.chipBg }}
    >
      <View>
        {partner.thumb ? (
          <Image source={{ uri: partner.thumb }} style={s.image} resizeMode="cover" />
        ) : (
          <View style={[s.image, s.imageEmpty]}>
            <Text style={s.imageEmptyText}>{partner.name.slice(0, 2) || '?'}</Text>
          </View>
        )}
        {rank ? (
          <View style={s.rank}>
            <Text style={s.rankText}>{rank}</Text>
          </View>
        ) : null}
      </View>

      <View style={s.body}>
        <Text style={s.name} numberOfLines={1}>
          {partner.name || '이름 없음'}
        </Text>
        <Text style={s.sub} numberOfLines={1}>
          {partner.region || '강남'} · {PARTNER_CATEGORY_LABEL[partner.category] ?? '기타'}
        </Text>
        {partner.intro ? (
          <Text style={s.intro} numberOfLines={1}>
            {partner.intro}
          </Text>
        ) : null}
        {benefit && benefit !== partner.intro ? (
          <Text style={[s.benefit, isPriceLike(benefit) && s.benefitPrice]} numberOfLines={1}>
            {benefit}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export default React.memo(PartnerCard);

/** 하단 전체 목록용 가로 행 */
export function PartnerRow({
  partner,
  onPress,
}: {
  partner: Partner;
  onPress: (p: Partner) => void;
}) {
  const c = useTheme();
  const s = styles(c);
  const benefit = partner.benefits || '';

  return (
    <Pressable
      style={({ pressed }) => [s.row, pressed && s.pressed]}
      onPress={() => onPress(partner)}
      android_ripple={{ color: c.chipBg }}
    >
      {partner.thumb ? (
        <Image source={{ uri: partner.thumb }} style={s.rowThumb} resizeMode="cover" />
      ) : (
        <View style={[s.rowThumb, s.imageEmpty]}>
          <Text style={s.imageEmptyText}>{partner.name.slice(0, 2) || '?'}</Text>
        </View>
      )}
      <View style={s.rowBody}>
        <Text style={s.rowTitle} numberOfLines={1}>
          <Text style={s.name}>{partner.name}</Text>
          <Text style={s.sub}>
            {'  ㅣ  '}
            {partner.region || '강남'} · {PARTNER_CATEGORY_LABEL[partner.category] ?? '기타'}
          </Text>
        </Text>
        {partner.intro ? (
          <Text style={s.intro} numberOfLines={1}>
            {partner.intro}
          </Text>
        ) : null}
        <View style={s.ratingRow}>
          <Icon name="star" size={12} color="#f5b301" />
          <Text style={s.rate}>{partner.rating.toFixed(1)}</Text>
          {partner.favs > 0 ? <Text style={s.sub}>({partner.favs})</Text> : null}
        </View>
        {benefit ? (
          <Text style={[s.benefit, isPriceLike(benefit) && s.benefitPrice]} numberOfLines={1}>
            {benefit}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const CARD_W = 220;

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
    imageEmptyText: { fontSize: 24, fontWeight: '800', color: c.muted },
    rank: {
      position: 'absolute',
      top: 8,
      left: 8,
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.accent,
    },
    rankText: { fontSize: fontSize.sm, fontWeight: '800', color: '#ffffff' },

    body: { padding: spacing.md, gap: 2 },
    name: { fontSize: fontSize.lg, fontWeight: '700', color: c.fg },
    sub: { fontSize: fontSize.sm, color: c.muted, fontWeight: '400' },
    intro: { fontSize: fontSize.sm, color: c.fg },
    benefit: { fontSize: fontSize.sm, color: c.muted, marginTop: 2 },
    benefitPrice: { color: c.accent, fontWeight: '700' },

    row: {
      flexDirection: 'row',
      gap: spacing.md,
      paddingHorizontal: spacing.page,
      paddingVertical: spacing.md,
      backgroundColor: c.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.line,
    },
    rowThumb: { width: 96, height: 72, borderRadius: radius.sm, backgroundColor: c.chipBg },
    rowBody: { flex: 1, gap: 2 },
    rowTitle: { fontSize: fontSize.lg },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
    rate: { fontSize: fontSize.sm, fontWeight: '700', color: c.fg },
  });
