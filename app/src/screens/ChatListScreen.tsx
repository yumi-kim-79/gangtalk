import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AppHeader from '@/components/common/AppHeader';
import Icon from '@/components/common/Icon';
import { useAuth } from '@/hooks/useAuth';
import { useChatRooms } from '@/hooks/useChat';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { boardDate } from '@/services/board';
import type { CommunityStackParamList } from '@/navigation/types';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';
import type { ChatRoom } from '@/types/chat';

export default function ChatListScreen() {
  const c = useTheme();
  const s = styles(c);
  const navigation = useNavigation<NativeStackNavigationProp<CommunityStackParamList, 'ChatList'>>();
  const { isLoggedIn, initializing } = useAuth();
  const { requireAuth } = useRequireAuth();
  const { rooms, loading, error } = useChatRooms();

  const openRoom = useCallback(
    (room: ChatRoom) =>
      navigation.navigate('ChatRoom', { roomId: room.id, title: room.title }),
    [navigation],
  );

  return (
    <View style={s.root}>
      <AppHeader title="채팅" subtitle="강톡 채팅방" showSearch={false} />

      {!initializing && !isLoggedIn ? (
        <Pressable
          style={s.loginCard}
          onPress={() => requireAuth()}
          android_ripple={{ color: c.accentWeak }}
        >
          <View style={s.loginText}>
            <Text style={s.loginTitle}>로그인이 필요합니다</Text>
            <Text style={s.loginDesc}>채팅은 로그인 후 이용할 수 있습니다</Text>
          </View>
          <Icon name="chevronRight" size={20} color={c.muted} />
        </Pressable>
      ) : loading ? (
        <ActivityIndicator color={c.accent} style={s.loading} />
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [s.row, pressed && s.pressed]}
              onPress={() => openRoom(item)}
              android_ripple={{ color: c.chipBg }}
            >
              <View style={s.avatar}>
                <Icon name="chat" size={22} color={c.muted} />
              </View>
              <View style={s.body}>
                <Text style={s.title} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={s.sub} numberOfLines={1}>
                  {item.lastMessage || item.subtitle || '대화를 시작해보세요'}
                </Text>
              </View>
              {item.updatedAt ? <Text style={s.time}>{boardDate(item.updatedAt)}</Text> : null}
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyTitle}>참여 가능한 채팅방이 없습니다</Text>
              <Text style={s.emptyDesc}>
                {error ?? '채팅방은 관리자가 개설합니다'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    loading: { marginVertical: spacing.xl },
    loginCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      margin: spacing.page,
      padding: spacing.lg,
      borderRadius: radius.md,
      backgroundColor: c.accentWeak,
    },
    loginText: { flex: 1, gap: 2 },
    loginTitle: { fontSize: fontSize.lg, fontWeight: '800', color: '#7a2447' },
    loginDesc: { fontSize: fontSize.sm, color: '#a03465' },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.page,
      paddingVertical: spacing.md,
      backgroundColor: c.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.line,
    },
    pressed: { backgroundColor: c.chipBg },
    avatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.chipBg,
    },
    body: { flex: 1, gap: 2 },
    title: { fontSize: fontSize.md, fontWeight: '700', color: c.fg },
    sub: { fontSize: fontSize.sm, color: c.muted },
    time: { fontSize: fontSize.xs, color: c.muted },

    empty: { alignItems: 'center', paddingVertical: 64, gap: 4 },
    emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: c.fg },
    emptyDesc: { fontSize: fontSize.sm, color: c.muted },
  });
