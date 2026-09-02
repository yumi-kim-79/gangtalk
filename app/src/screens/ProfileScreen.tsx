import React, { useCallback, useMemo } from 'react';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Alert,
  Clipboard,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AppHeader from '@/components/common/AppHeader';
import Icon from '@/components/common/Icon';
import MenuRow from '@/components/common/MenuRow';
import { env } from '@/config/env';
import { REFERRAL_REWARD_POINT, TIER_BADGES, tierByPoints } from '@/constants/tiers';
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { signOut } from '@/services/auth';
import type { ProfileStackParamList, RootStackParamList } from '@/navigation/types';
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

  /* 약관·개인정보·고객센터는 루트 스택 화면이라 마이 탭 스택으로는 못 간다 */
  const rootNav = navigation.getParent<NavigationProp<RootStackParamList>>('Root' as never);
  const openLegal = useCallback(
    (kind: 'terms' | 'privacy') => rootNav?.navigate('Legal', { kind }),
    [rootNav],
  );

  const needLogin = useCallback(
    (go: () => void) => () => {
      if (requireAuth()) go();
    },
    [requireAuth],
  );

  const points = profile?.points ?? 0;
  const reward = profile?.reward ?? 0;
  const refCode = profile?.myRefCode ?? '';
  const tier = useMemo(() => tierByPoints(points), [points]);

  /** 추천코드 복사
   * RN 0.87 의 core Clipboard 는 deprecated 경고를 띄우지만 아직 동작한다.
   * 별도 네이티브 모듈(@react-native-clipboard/clipboard)을 넣으면 재빌드가
   * 필요해 지금은 core 를 쓴다. */
  const onCopyCode = useCallback(() => {
    if (!refCode) {
      Alert.alert('추천코드', '추천코드가 아직 없습니다.\n잠시 후 다시 시도해 주세요.');
      return;
    }
    Clipboard.setString(refCode);
    Alert.alert('복사 완료', `추천코드 ${refCode} 를 복사했습니다.`);
  }, [refCode]);

  /** 초대 링크 공유 — 웹 copyMyInviteLink 와 같은 URL 형식 */
  const onShareCode = useCallback(async () => {
    if (!refCode) {
      Alert.alert('추천코드', '추천코드가 아직 없습니다.\n잠시 후 다시 시도해 주세요.');
      return;
    }
    const url = `${env.webUrl}/auth?mode=signup&ref=${encodeURIComponent(refCode)}`;
    try {
      await Share.share({
        message: `강남톡방에 초대합니다!\n제 추천코드 ${refCode} 로 가입하면 서로 ${REFERRAL_REWARD_POINT.toLocaleString()}P 를 받아요.\n${url}`,
      });
    } catch {
      // 사용자가 공유 시트를 닫은 경우 — 무시
    }
  }, [refCode]);

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

          {/* 포인트 · 리워드 — 웹 마이페이지와 같은 지표 */}
          <View style={s.stats}>
            <Stat label="보유 포인트" value={`${points.toLocaleString()}P`} colors={c} />
            <Stat
              label="리워드"
              value={`${Math.floor(reward).toLocaleString()}원`}
              colors={c}
            />
          </View>

          {/* 회원 등급 + 다음 등급까지 진행바 */}
          <View style={s.tierBox}>
            <View style={s.tierHead}>
              <Text style={s.tierLabel}>회원 등급</Text>
              <View style={s.tierBadge}>
                {TIER_BADGES[tier.current.key] ? (
                  <Image
                    source={TIER_BADGES[tier.current.key]}
                    style={s.tierBadgeImg}
                    resizeMode="contain"
                  />
                ) : null}
                <Text style={s.tierBadgeText}>{tier.current.label}</Text>
              </View>
            </View>

            <View style={s.tierBar}>
              <View style={[s.tierBarFill, { width: `${tier.progressPct}%` }]} />
            </View>

            <Text style={s.tierNext}>
              {tier.next
                ? `다음: ${tier.next.label} (${tier.toNext.toLocaleString()}P 남음)`
                : '최고 등급입니다'}
            </Text>
          </View>

          {/* 내 추천코드 */}
          <View style={s.refBox}>
            <Text style={s.refLabel}>내 추천코드</Text>
            <View style={s.refRow}>
              <View style={s.refCodeBox}>
                <Text style={s.refCode}>{refCode || '-'}</Text>
              </View>
              <Pressable
                style={({ pressed }) => [s.refCopy, pressed && s.pressed]}
                onPress={onCopyCode}
              >
                <Text style={s.refCopyText}>복사</Text>
              </Pressable>
            </View>
          </View>

          {/* 추천 리워드 안내 + 공유 */}
          <View style={s.inviteBox}>
            <Text style={s.inviteText}>
              추천 리워드 — 친구가 회원가입 시 서로{' '}
              <Text style={s.inviteStrong}>
                {REFERRAL_REWARD_POINT.toLocaleString()}P
              </Text>
              !
            </Text>
            <Pressable
              style={({ pressed }) => [s.inviteBtn, pressed && s.pressed]}
              onPress={onShareCode}
            >
              <Text style={s.inviteBtnText}>내 코드 공유하기</Text>
            </Pressable>
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
      <MenuRow label="이용약관" onPress={() => openLegal('terms')} />
      <MenuRow label="개인정보처리방침" onPress={() => openLegal('privacy')} />
      <MenuRow label="문의하기" onPress={() => rootNav?.navigate('Support')} />

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
    pressed: { opacity: 0.85 },

    /* 회원 등급 */
    tierBox: {
      marginHorizontal: spacing.page,
      marginBottom: spacing.sm,
      padding: spacing.lg,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
      backgroundColor: c.surface,
    },
    tierHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    tierLabel: { fontSize: fontSize.md, color: c.muted },
    tierBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
      borderRadius: radius.pill,
      backgroundColor: c.accentWeak,
    },
    /* 웹 .tier-badge-img 와 같은 크기감 */
    tierBadgeImg: { width: 18, height: 18 },
    tierBadgeText: { fontSize: fontSize.md, fontWeight: '800', color: c.accent },
    tierBar: {
      height: 6,
      borderRadius: 3,
      backgroundColor: c.chipBg,
      overflow: 'hidden',
    },
    tierBarFill: { height: '100%', borderRadius: 3, backgroundColor: c.accent },
    tierNext: { marginTop: spacing.sm, fontSize: fontSize.sm, color: c.muted },

    /* 추천코드 */
    refBox: {
      marginHorizontal: spacing.page,
      marginBottom: spacing.sm,
      padding: spacing.lg,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
      backgroundColor: c.surface,
    },
    refLabel: { fontSize: fontSize.md, color: c.muted, marginBottom: spacing.sm },
    refRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    refCodeBox: {
      flex: 1,
      height: 44,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      borderRadius: radius.sm,
      backgroundColor: c.accentWeak,
    },
    refCode: {
      fontSize: fontSize.xl,
      fontWeight: '800',
      color: c.accent,
      letterSpacing: 1,
    },
    refCopy: {
      height: 44,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: c.line,
    },
    refCopyText: { fontSize: fontSize.md, fontWeight: '700', color: c.muted },

    /* 추천 리워드 */
    inviteBox: {
      marginHorizontal: spacing.page,
      marginBottom: spacing.lg,
      padding: spacing.lg,
      borderRadius: radius.md,
      backgroundColor: c.accentWeak,
      gap: spacing.md,
    },
    inviteText: { fontSize: fontSize.md, color: '#a03465', lineHeight: 19 },
    inviteStrong: { fontWeight: '800', color: c.accent },
    inviteBtn: {
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
      backgroundColor: c.accent,
    },
    inviteBtnText: { fontSize: fontSize.md, fontWeight: '800', color: '#ffffff' },
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
