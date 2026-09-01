import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AppHeader from '@/components/common/AppHeader';
import Icon from '@/components/common/Icon';
import MenuRow from '@/components/common/MenuRow';
import { env } from '@/config/env';
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { signOut } from '@/services/auth';
import type { ProfileStackParamList } from '@/navigation/types';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';

export default function ProfileScreen() {
  const c = useTheme();
  const s = styles(c);
  const navigation =
    useNavigation<NativeStackNavigationProp<ProfileStackParamList, 'ProfileHome'>>();
  const { isLoggedIn, profile, user } = useAuth();
  const { requireAuth } = useRequireAuth();

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

  const openWeb = useCallback((path: string) => {
    Linking.openURL(`${env.webUrl}${path}`).catch(() => {});
  }, []);

  const needLogin = useCallback(
    (go: () => void) => () => {
      if (requireAuth()) go();
    },
    [requireAuth],
  );

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <AppHeader showSearch={false} />

      {isLoggedIn ? (
        <>
          <View style={s.card}>
            <View style={s.avatar}>
              <Icon name="user" size={28} color={c.muted} />
            </View>
            <View style={s.info}>
              <Text style={s.nickname}>{profile?.nickname || '회원'}</Text>
              <Text style={s.email}>{profile?.email || user?.email || ''}</Text>
            </View>
            <Pressable
              onPress={() => navigation.navigate('ProfileEdit')}
              hitSlop={8}
              style={s.editBtn}
            >
              <Text style={s.editText}>수정</Text>
            </Pressable>
          </View>

          <View style={s.stats}>
            <Stat label="포인트" value={`${(profile?.points ?? 0).toLocaleString()}P`} colors={c} />
            <Stat label="추천코드" value={profile?.myRefCode || '-'} colors={c} />
          </View>
        </>
      ) : (
        <Pressable
          style={s.loginCard}
          onPress={() => requireAuth()}
          android_ripple={{ color: c.accentWeak }}
        >
          <View style={s.info}>
            <Text style={s.loginTitle}>로그인이 필요합니다</Text>
            <Text style={s.loginDesc}>찜 · 별점 · 댓글 · 글쓰기를 이용하려면 로그인하세요</Text>
          </View>
          <Icon name="chevronRight" size={20} color={c.muted} />
        </Pressable>
      )}

      <Text style={s.sectionTitle}>내 활동</Text>
      <MenuRow label="찜한 업체" onPress={needLogin(() => navigation.navigate('Favorites'))} />
      <MenuRow label="내가 쓴 글" onPress={needLogin(() => navigation.navigate('MyPosts'))} />
      <MenuRow
        label="차단 목록"
        onPress={needLogin(() => navigation.navigate('BlockedUsers'))}
      />

      <Text style={s.sectionTitle}>고객센터</Text>
      <MenuRow label="이용약관" onPress={() => openWeb('/support')} />
      <MenuRow label="개인정보처리방침" onPress={() => openWeb('/support')} />
      <MenuRow label="문의하기" onPress={() => openWeb('/support')} />

      {isLoggedIn ? (
        <>
          <Text style={s.sectionTitle}>계정</Text>
          <MenuRow label="로그아웃" onPress={onSignOut} />
          <MenuRow
            label="회원탈퇴"
            danger
            onPress={() => navigation.navigate('DeleteAccount')}
          />
        </>
      ) : null}
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
    editBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radius.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.chipBorder,
    },
    editText: { fontSize: fontSize.sm, color: c.fg },

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

    stats: {
      flexDirection: 'row',
      gap: spacing.md,
      paddingHorizontal: spacing.page,
      marginBottom: spacing.sm,
    },
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

    sectionTitle: {
      paddingHorizontal: spacing.page,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
      fontSize: fontSize.sm,
      fontWeight: '700',
      color: c.muted,
    },
  });
