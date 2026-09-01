import React, { useCallback } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { useBlocked } from '@/hooks/useBlocked';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';

/**
 * 차단 목록 (Apple 심사지침 1.2).
 * 차단은 서버에서 상대 글을 지우는 게 아니라 내 화면에서만 감추는 방식이라,
 * 여기서 해제하면 즉시 다시 보인다.
 */
export default function BlockedUsersScreen() {
  const c = useTheme();
  const s = styles(c);
  const { isLoggedIn } = useAuth();
  const { rows, unblock } = useBlocked();

  const onUnblock = useCallback(
    (uid: string, name: string) => {
      Alert.alert('차단 해제', `${name} 님의 차단을 해제할까요?`, [
        { text: '취소', style: 'cancel' },
        {
          text: '해제',
          onPress: async () => {
            try {
              await unblock(uid);
            } catch (e) {
              Alert.alert(
                '해제 실패',
                e instanceof Error ? e.message : '잠시 후 다시 시도해 주세요.',
              );
            }
          },
        },
      ]);
    },
    [unblock],
  );

  if (!isLoggedIn) {
    return (
      <View style={[s.root, s.center]}>
        <Text style={s.emptyTitle}>로그인이 필요합니다</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <FlatList
        data={rows}
        keyExtractor={item => item.uid}
        contentContainerStyle={s.list}
        ListHeaderComponent={
          <Text style={s.desc}>
            차단한 사용자의 글·댓글·메시지는 내 화면에서만 보이지 않습니다.
            상대에게는 알려지지 않습니다.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={s.row}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{item.name.slice(0, 1)}</Text>
            </View>
            <Text style={s.name} numberOfLines={1}>
              {item.name}
            </Text>
            <Pressable
              style={({ pressed }) => [s.btn, pressed && s.btnPressed]}
              onPress={() => onUnblock(item.uid, item.name)}
            >
              <Text style={s.btnText}>차단 해제</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyTitle}>차단한 사용자가 없습니다</Text>
            <Text style={s.emptyDesc}>
              글·댓글의 [신고] 또는 채팅 말풍선을 길게 눌러 차단할 수 있습니다
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    center: { alignItems: 'center', justifyContent: 'center' },
    list: { paddingBottom: spacing.xl },
    desc: {
      padding: spacing.page,
      fontSize: fontSize.sm,
      lineHeight: 17,
      color: c.muted,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.page,
      paddingVertical: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.line,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.chipBg,
    },
    avatarText: { fontSize: fontSize.md, fontWeight: '800', color: c.muted },
    name: { flex: 1, fontSize: fontSize.lg, color: c.fg },
    btn: {
      paddingHorizontal: spacing.md,
      paddingVertical: 7,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: c.line,
    },
    btnPressed: { backgroundColor: c.chipBg },
    btnText: { fontSize: fontSize.sm, fontWeight: '700', color: c.muted },

    empty: { alignItems: 'center', paddingVertical: 64, gap: 6 },
    emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: c.fg },
    emptyDesc: {
      fontSize: fontSize.sm,
      color: c.muted,
      textAlign: 'center',
      paddingHorizontal: spacing.xl,
    },
  });
