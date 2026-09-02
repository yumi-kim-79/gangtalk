import React from 'react';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { POINT_RULES, TIERS, TIER_BADGES, tierByPoints } from '@/constants/tiers';
import type { RootStackParamList } from '@/navigation/types';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';

/**
 * 등급표 + 포인트 적립 기준표.
 * 웹 components/mypage/TierTable.vue · PointRuleModal.vue 이식.
 * 앱에는 이 화면이 없어 포인트를 왜 받았는지 확인할 경로가 아예 없었다.
 */
export default function TiersScreen() {
  const c = useTheme();
  const s = styles(c);
  const { params } = useRoute<RouteProp<RootStackParamList, 'Tiers'>>();
  const points = Number(params?.points ?? 0);
  const info = tierByPoints(points);

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <View style={s.myBox}>
        <Text style={s.myLabel}>내 포인트</Text>
        <Text style={s.myValue}>{points.toLocaleString()} P</Text>
        <Text style={s.myTier}>
          현재 등급 · {info.current.label}
          {info.next ? `  |  다음: ${info.next.label} (${info.toNext.toLocaleString()}P 남음)` : '  |  최고 등급'}
        </Text>
      </View>

      <Text style={s.sec}>회원 등급표</Text>
      <View style={s.card}>
        {TIERS.map((t, i) => {
          const done = points >= t.threshold;
          const now = t.key === info.current.key;
          return (
            <View key={t.key} style={[s.row, now && s.rowNow]}>
              <Text style={s.rank}>{i + 1}</Text>
              {TIER_BADGES[t.key] ? (
                <Image source={TIER_BADGES[t.key]} style={s.badge} resizeMode="contain" />
              ) : (
                <View style={s.badge} />
              )}
              <Text style={[s.name, now && s.nameNow]}>{t.label}</Text>
              <Text style={s.thres}>{t.threshold.toLocaleString()} P</Text>
              <Text style={[s.state, done ? s.stateOk : s.stateWait]}>
                {done ? '달성' : '대기'}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={s.sec}>포인트 적립 기준</Text>
      <View style={s.card}>
        {POINT_RULES.map(r => (
          <View key={r.label} style={s.row}>
            <Text style={s.ruleLabel}>{r.label}</Text>
            <Text style={s.rulePoint}>+{r.point.toLocaleString()}P</Text>
          </View>
        ))}
      </View>

      <Text style={s.note}>* 포인트 정책은 서비스 운영 상황에 따라 변경될 수 있습니다.</Text>
    </ScrollView>
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.page, paddingBottom: spacing.xl * 2, gap: spacing.md },

    myBox: {
      padding: spacing.lg,
      borderRadius: radius.md,
      backgroundColor: c.accentWeak,
      gap: 2,
    },
    myLabel: { fontSize: fontSize.sm, color: c.muted },
    myValue: { fontSize: fontSize.xxl, fontWeight: '800', color: c.accent },
    myTier: { fontSize: fontSize.sm, color: c.fg, marginTop: 2 },

    sec: { fontSize: fontSize.md, fontWeight: '800', color: c.fg, marginTop: spacing.sm },
    card: {
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
      backgroundColor: c.surface,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.line,
    },
    rowNow: { backgroundColor: c.chipBg },
    rank: { width: 18, fontSize: fontSize.sm, color: c.muted, textAlign: 'center' },
    badge: { width: 20, height: 20 },
    name: { flex: 1, fontSize: fontSize.md, fontWeight: '700', color: c.fg },
    nameNow: { color: c.accent },
    thres: { fontSize: fontSize.sm, color: c.muted },
    state: { width: 34, fontSize: fontSize.xs, fontWeight: '800', textAlign: 'right' },
    stateOk: { color: c.accent },
    stateWait: { color: c.muted },

    ruleLabel: { flex: 1, fontSize: fontSize.md, color: c.fg },
    rulePoint: { fontSize: fontSize.md, fontWeight: '800', color: c.accent },

    note: { fontSize: fontSize.xs, color: c.muted, marginTop: spacing.sm },
  });
