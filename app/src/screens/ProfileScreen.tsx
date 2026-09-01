import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AppHeader from '@/components/common/AppHeader';
import Button from '@/components/common/Button';
import Icon from '@/components/common/Icon';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/services/auth';
import type { RootStackParamList } from '@/navigation/types';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';

export default function ProfileScreen() {
  const c = useTheme();
  const s = styles(c);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { isLoggedIn, profile, user } = useAuth();

  const goLogin = useCallback(
    () => navigation.navigate('Auth', { screen: 'Login' }),
    [navigation],
  );

  const onSignOut = useCallback(() => {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: () => {
          signOut().catch(() => {});
        },
      },
    ]);
  }, []);

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <AppHeader title="마이" showSearch={false} />

      {isLoggedIn ? (
        <View style={s.card}>
          <View style={s.avatar}>
            <Icon name="user" size={28} color={c.muted} />
          </View>
          <View style={s.info}>
            <Text style={s.nickname}>{profile?.nickname || '회원'}</Text>
            <Text style={s.email}>{profile?.email || user?.email || ''}</Text>
          </View>
        </View>
      ) : (
        <Pressable style={s.loginCard} onPress={goLogin} android_ripple={{ color: c.accentWeak }}>
          <View style={s.info}>
            <Text style={s.loginTitle}>로그인이 필요합니다</Text>
            <Text style={s.loginDesc}>찜 · 별점 · 댓글 · 글쓰기를 이용하려면 로그인하세요</Text>
          </View>
          <Icon name="chevronRight" size={20} color={c.muted} />
        </Pressable>
      )}

      {isLoggedIn ? (
        <>
          <View style={s.stats}>
            <Stat label="포인트" value={`${(profile?.points ?? 0).toLocaleString()}P`} colors={c} />
            <Stat label="추천코드" value={profile?.myRefCode || '-'} colors={c} />
          </View>

          <View style={s.actions}>
            <Button label="로그아웃" variant="outline" onPress={onSignOut} />
          </View>
        </>
      ) : null}

      <Text style={s.todo}>즐겨찾기 · 내 글 · 회원탈퇴는 다음 작업에서 추가됩니다</Text>
    </ScrollView>
  );
}

function Stat({
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
    <View style={s.stat}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    content: { paddingBottom: spacing.xl },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      margin: spacing.page,
      padding: spacing.lg,
      borderRadius: radius.md,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.chipBg,
    },
    info: { flex: 1, gap: 2 },
    nickname: { fontSize: fontSize.xl, fontWeight: '800', color: c.fg },
    email: { fontSize: fontSize.sm, color: c.muted },

    loginCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      margin: spacing.page,
      padding: spacing.lg,
      borderRadius: radius.md,
      backgroundColor: c.accentWeak,
    },
    loginTitle: { fontSize: fontSize.lg, fontWeight: '800', color: '#7a2447' },
    loginDesc: { fontSize: fontSize.sm, color: '#a03465' },

    stats: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.page },
    stat: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
      paddingVertical: spacing.lg,
      borderRadius: radius.md,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
    },
    statValue: { fontSize: fontSize.lg, fontWeight: '800', color: c.accent },
    statLabel: { fontSize: fontSize.xs, color: c.muted },

    actions: { padding: spacing.page, gap: spacing.sm },
    todo: {
      textAlign: 'center',
      paddingHorizontal: spacing.page,
      fontSize: fontSize.xs,
      color: c.muted,
    },
  });
