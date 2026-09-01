import React, { useEffect, useState } from 'react';
import { useRoute, type RouteProp } from '@react-navigation/native';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from '@/components/common/Icon';
import { PARTNER_CATEGORY_LABEL } from '@/constants/partners';
import { subscribePartners } from '@/services/partners';
import type { PartnersStackParamList } from '@/navigation/types';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';
import type { Partner } from '@/types/partner';

export default function PartnerDetailScreen() {
  const c = useTheme();
  const s = styles(c);
  const route = useRoute<RouteProp<PartnersStackParamList, 'PartnerDetail'>>();

  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // partners 는 단건 조회 규칙이 목록과 같아 구독 하나로 처리한다
    const unsub = subscribePartners(
      rows => {
        setPartner(rows.find(p => p.id === route.params.partnerId) ?? null);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [route.params.partnerId]);

  if (loading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }
  if (!partner) {
    return (
      <View style={[s.root, s.center]}>
        <Text style={s.emptyTitle}>업체를 찾을 수 없습니다</Text>
      </View>
    );
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      {partner.thumb ? (
        <Image source={{ uri: partner.thumb }} style={s.hero} resizeMode="cover" />
      ) : (
        <View style={[s.hero, s.heroEmpty]}>
          <Text style={s.heroEmptyText}>{partner.name.slice(0, 2) || '?'}</Text>
        </View>
      )}

      <View style={s.head}>
        <Text style={s.name}>{partner.name}</Text>
        <Text style={s.meta}>
          {partner.region || '강남'} · {PARTNER_CATEGORY_LABEL[partner.category] ?? '기타'}
        </Text>
        <View style={s.rateRow}>
          <Icon name="star" size={16} color="#f5b301" />
          <Text style={s.rate}>{partner.rating.toFixed(1)}</Text>
          {partner.favs > 0 ? <Text style={s.count}>({partner.favs})</Text> : null}
        </View>
      </View>

      {partner.tags.length ? (
        <View style={s.tags}>
          {partner.tags.map(t => (
            <View key={t} style={s.tag}>
              <Text style={s.tagText}>#{t}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {partner.benefits ? (
        <View style={s.section}>
          <Text style={s.sectionTitle}>혜택</Text>
          <Text style={s.benefit}>{partner.benefits}</Text>
        </View>
      ) : null}

      <View style={s.section}>
        <Text style={s.sectionTitle}>소개</Text>
        <Text style={s.body}>{partner.intro || '등록된 소개가 없습니다.'}</Text>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>위치</Text>
        <Text style={s.body}>{partner.address || '주소 정보가 없습니다.'}</Text>
      </View>

      {partner.link ? (
        <Pressable
          style={({ pressed }) => [s.linkBtn, pressed && s.pressed]}
          onPress={() => Linking.openURL(partner.link).catch(() => {})}
        >
          <Text style={s.linkText}>홈페이지 / 예약 바로가기</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    content: { paddingBottom: spacing.xl },
    center: { alignItems: 'center', justifyContent: 'center', gap: 4 },
    emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: c.fg },

    hero: { width: '100%', aspectRatio: 16 / 9, backgroundColor: c.chipBg },
    heroEmpty: { alignItems: 'center', justifyContent: 'center' },
    heroEmptyText: { fontSize: 40, fontWeight: '800', color: c.muted },

    head: { paddingHorizontal: spacing.page, paddingTop: spacing.lg, gap: 4 },
    name: { fontSize: fontSize.xxl, fontWeight: '800', color: c.fg },
    meta: { fontSize: fontSize.md, color: c.muted },
    rateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
    rate: { fontSize: fontSize.md, fontWeight: '700', color: c.fg },
    count: { fontSize: fontSize.sm, color: c.muted },

    tags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      paddingHorizontal: spacing.page,
      paddingTop: spacing.md,
    },
    tag: {
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
      borderRadius: radius.pill,
      backgroundColor: c.chipBg,
    },
    tagText: { fontSize: fontSize.sm, color: c.muted },

    section: {
      paddingHorizontal: spacing.page,
      paddingVertical: spacing.lg,
      marginTop: spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.line,
    },
    sectionTitle: {
      fontSize: fontSize.lg,
      fontWeight: '700',
      color: c.fg,
      marginBottom: spacing.sm,
    },
    body: { fontSize: fontSize.md, lineHeight: 22, color: c.fg },
    benefit: { fontSize: fontSize.md, lineHeight: 22, color: c.accent, fontWeight: '600' },

    linkBtn: {
      margin: spacing.page,
      minHeight: 50,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.sm,
      backgroundColor: c.accent,
    },
    pressed: { opacity: 0.85 },
    linkText: { fontSize: fontSize.md, fontWeight: '700', color: '#ffffff' },
  });
