import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useRoute, type RouteProp } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChatRoom } from '@/hooks/useChat';
import { chatDay, chatTime } from '@/services/chat';
import type { ChatStackParamList } from '@/navigation/types';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';
import type { ChatMessage } from '@/types/chat';

type Row =
  | { kind: 'day'; id: string; label: string }
  | { kind: 'msg'; id: string; message: ChatMessage };

export default function ChatRoomScreen() {
  const c = useTheme();
  const s = styles(c);
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<ChatStackParamList, 'ChatRoom'>>();
  const listRef = useRef<FlatList<Row>>(null);

  const { messages, loading, sending, error, send, canSend } = useChatRoom(route.params.roomId);
  const [draft, setDraft] = useState('');

  /** 날짜가 바뀌는 지점에 구분선을 끼워 넣는다 */
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    let lastDay = '';
    for (const m of messages) {
      const day = chatDay(m.createdAt);
      if (day && day !== lastDay) {
        out.push({ kind: 'day', id: `day-${day}`, label: day });
        lastDay = day;
      }
      out.push({ kind: 'msg', id: m.id, message: m });
    }
    return out;
  }, [messages]);

  const onSend = useCallback(async () => {
    const text = draft;
    setDraft('');
    await send(text);
    listRef.current?.scrollToEnd({ animated: true });
  }, [draft, send]);

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}
    >
      {loading ? (
        <ActivityIndicator color={c.accent} style={s.loading} />
      ) : (
        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={item => item.id}
          contentContainerStyle={s.list}
          renderItem={({ item }) =>
            item.kind === 'day' ? (
              <Text style={s.day}>{item.label}</Text>
            ) : (
              <Bubble message={item.message} colors={c} />
            )
          }
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyText}>{error ?? '첫 메시지를 남겨보세요'}</Text>
            </View>
          }
        />
      )}

      <View style={[s.inputBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <TextInput
          style={s.input}
          value={draft}
          onChangeText={setDraft}
          placeholder={canSend ? '메시지를 입력하세요' : '로그인 후 이용할 수 있습니다'}
          placeholderTextColor={c.muted}
          editable={canSend}
          multiline
        />
        <Pressable
          onPress={onSend}
          disabled={!canSend || sending || !draft.trim()}
          style={({ pressed }) => [
            s.sendBtn,
            (!canSend || sending || !draft.trim()) && s.sendOff,
            pressed && s.pressed,
          ]}
        >
          <Text style={s.sendText}>전송</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Bubble({ message, colors }: { message: ChatMessage; colors: ThemeColors }) {
  const s = styles(colors);
  const mine = message.mine;
  return (
    <View style={[s.bubbleRow, mine && s.bubbleRowMine]}>
      {!mine ? <Text style={s.author}>{message.author}</Text> : null}
      <View style={s.bubbleLine}>
        {mine ? <Text style={s.time}>{chatTime(message.createdAt)}</Text> : null}
        <View style={[s.bubble, mine ? s.bubbleMine : s.bubbleOther]}>
          <Text style={[s.text, mine && s.textMine]}>{message.text}</Text>
        </View>
        {!mine ? <Text style={s.time}>{chatTime(message.createdAt)}</Text> : null}
      </View>
    </View>
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    loading: { marginVertical: spacing.xl },
    list: { padding: spacing.page, gap: spacing.sm },
    day: {
      alignSelf: 'center',
      marginVertical: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
      borderRadius: radius.pill,
      backgroundColor: c.chipBg,
      fontSize: fontSize.xs,
      color: c.muted,
    },
    empty: { alignItems: 'center', paddingVertical: 64 },
    emptyText: { fontSize: fontSize.sm, color: c.muted },

    bubbleRow: { alignItems: 'flex-start', gap: 2 },
    bubbleRowMine: { alignItems: 'flex-end' },
    author: { fontSize: fontSize.xs, color: c.muted, marginLeft: 4 },
    bubbleLine: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs, maxWidth: '85%' },
    bubble: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 16 },
    bubbleMine: { backgroundColor: c.accent, borderBottomRightRadius: 4 },
    bubbleOther: {
      backgroundColor: c.surface,
      borderBottomLeftRadius: 4,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
    },
    text: { fontSize: fontSize.md, lineHeight: 21, color: c.fg },
    textMine: { color: '#ffffff' },
    time: { fontSize: 10, color: c.muted },

    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
      paddingHorizontal: spacing.page,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.line,
      backgroundColor: c.surface,
    },
    input: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.chipBorder,
      backgroundColor: c.bg,
      fontSize: fontSize.md,
      color: c.fg,
    },
    sendBtn: {
      height: 44,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.sm,
      backgroundColor: c.accent,
    },
    sendOff: { opacity: 0.4 },
    pressed: { opacity: 0.85 },
    sendText: { fontSize: fontSize.md, fontWeight: '700', color: '#ffffff' },
  });
