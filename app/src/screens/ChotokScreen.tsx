import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRoute, type RouteProp } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import ReportSheet, { type ReportTarget } from '@/components/common/ReportSheet';
import { useBlocked } from '@/hooks/useBlocked';
import { useChotok } from '@/hooks/useChotok';
import type { StoresStackParamList } from '@/navigation/types';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';
import type { ChotokMessage } from '@/services/chotok';

/** 날짜 구분선을 끼워 넣기 위한 목록 아이템 */
type Row =
  | { type: 'day'; id: string; label: string }
  | { type: 'msg'; id: string; msg: ChotokMessage };

const pad = (n: number) => String(n).padStart(2, '0');

function dayLabel(ms: number): string {
  if (!ms) return '';
  const d = new Date(ms);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function timeLabel(ms: number): string {
  if (!ms) return '';
  const d = new Date(ms);
  const h = d.getHours();
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${h12}:${pad(d.getMinutes())}`;
}

/**
 * 초톡방 — 업체가 붙여넣은 카톡 내용을 그대로 보여준다.
 * 카톡 채팅창처럼 말풍선 + 날짜 구분선 형태.
 */
export default function ChotokScreen() {
  const c = useTheme();
  const s = styles(c);
  const { params } = useRoute<RouteProp<StoresStackParamList, 'Chotok'>>();
  const {
    messages,
    parsed,
    loading,
    error,
    participants,
    send,
    canWrite,
  } = useChotok(params.storeId);
  const { hidden } = useBlocked();
  const listRef = useRef<FlatList<Row>>(null);
  const [report, setReport] = useState<ReportTarget | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  /* 웹 ChatBiz 와 같은 동작 — 줄바꿈이 있으면 붙여넣기(paste)로 저장된다 */
  const onSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft('');
    try {
      await send(text);
      listRef.current?.scrollToEnd({ animated: true });
    } catch (e) {
      // 실패하면 입력을 돌려준다 — 그냥 비우면 쓴 글이 사라진다
      setDraft(prev => (prev ? prev : text));
      Alert.alert(
        '전송 실패',
        e instanceof Error && e.message.includes('로그인')
          ? '로그인이 필요합니다.'
          : '전송 권한이 없거나 네트워크 문제가 발생했습니다.',
      );
    } finally {
      setSending(false);
    }
  }, [draft, sending, send]);



  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    let lastDay = '';
    for (const m of messages) {
      // 차단한 사용자의 메시지는 감춘다 (다른 목록 화면들과 동일)
      if (hidden(m.authorUid)) continue;
      const day = dayLabel(m.createdAt);
      if (day && day !== lastDay) {
        out.push({ type: 'day', id: `day_${day}`, label: day });
        lastDay = day;
      }
      out.push({ type: 'msg', id: m.id, msg: m });
    }
    return out;
  }, [messages, hidden]);

  // 새 메시지가 오면 항상 맨 아래로
  useEffect(() => {
    if (!rows.length) return;
    const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 60);
    return () => clearTimeout(t);
  }, [rows.length]);

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}
    >
      <View style={s.statusBar}>
        <View style={s.stat}>
          <Text style={s.statNum}>{parsed?.roomCount ?? 0}</Text>
          <Text style={s.statLabel}>맞출방</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.stat}>
          <Text style={s.statNum}>{parsed?.needSum ?? 0}</Text>
          <Text style={s.statLabel}>필요인원</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.stat}>
          {/* 웹 ChatBiz.vue:18 도 '참여자' 다. 앱만 메시지 수를 보여줬다 */}
          <Text style={s.statNum}>{participants}</Text>
          <Text style={s.statLabel}>참여자</Text>
        </View>
      </View>

      {loading ? <ActivityIndicator color={c.accent} style={s.loading} /> : null}
      {error ? <Text style={s.error}>{error}</Text> : null}

      <FlatList
        ref={listRef}
        data={rows}
        keyExtractor={r => r.id}
        contentContainerStyle={s.list}
        renderItem={({ item }) =>
          item.type === 'day' ? (
            <View style={s.dayWrap}>
              <Text style={s.day}>{item.label}</Text>
            </View>
          ) : (
            /* 길게 누르면 신고 (Apple 심사지침 1.2) */
            <Pressable
              style={s.msgRow}
              onLongPress={() =>
                setReport({
                  type: 'chotok',
                  id: item.msg.id,
                  ownerUid: item.msg.authorUid,
                  ownerName: item.msg.author,
                  excerpt: item.msg.text,
                })
              }
              delayLongPress={400}
            >
              <View style={s.avatar}>
                <Text style={s.avatarText}>{item.msg.author.slice(0, 1)}</Text>
              </View>
              <View style={s.msgBody}>
                <Text style={s.author}>{item.msg.author}</Text>
                <View style={s.bubbleRow}>
                  <View style={s.bubble}>
                    <Text style={s.bubbleText}>{item.msg.text}</Text>
                  </View>
                  <Text style={s.time}>{timeLabel(item.msg.createdAt)}</Text>
                </View>
              </View>
            </Pressable>
          )
        }
        ListEmptyComponent={
          loading ? undefined : (
            <View style={s.empty}>
              <Text style={s.emptyTitle}>아직 올라온 초톡이 없습니다</Text>
              <Text style={s.emptyDesc}>업체가 올리면 여기에 바로 표시됩니다</Text>
            </View>
          )
        }
      />

      {/* 웹 ChatBiz 의 composer 와 같은 자리 */}
      <View style={s.composer}>
        <TextInput
          style={s.input}
          value={draft}
          onChangeText={setDraft}
          placeholder={
            canWrite
              ? '메시지 입력 (카톡 내용을 붙여넣으면 현황에 반영됩니다)'
              : '로그인 후 이용할 수 있습니다'
          }
          placeholderTextColor={c.muted}
          editable={canWrite && !sending}
          multiline
        />
        <Pressable
          style={[s.sendBtn, (!draft.trim() || sending) && s.sendBtnOff]}
          onPress={onSend}
          disabled={!draft.trim() || sending}
        >
          <Text style={s.sendBtnText}>전송</Text>
        </Pressable>
      </View>

      <ReportSheet target={report} onClose={() => setReport(null)} />
    </KeyboardAvoidingView>
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.chipBg },

    statusBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      backgroundColor: c.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.line,
    },
    stat: { flex: 1, alignItems: 'center', gap: 1 },
    statDivider: { width: StyleSheet.hairlineWidth, height: 22, backgroundColor: c.line },
    statNum: { fontSize: fontSize.lg, fontWeight: '800', color: c.accent },
    statLabel: { fontSize: fontSize.xs, color: c.muted },

    list: { padding: spacing.md, paddingBottom: spacing.xl },

    /* 입력창 — 웹 .composer */
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
      padding: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.line,
      backgroundColor: c.surface,
    },
    input: {
      flex: 1,
      maxHeight: 120,
      minHeight: 40,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
      backgroundColor: c.bg,
      color: c.fg,
      fontSize: fontSize.md,
    },
    sendBtn: {
      paddingHorizontal: spacing.lg,
      paddingVertical: 10,
      borderRadius: radius.md,
      backgroundColor: c.accent,
    },
    sendBtnOff: { opacity: 0.4 },
    sendBtnText: { fontSize: fontSize.md, fontWeight: '800', color: '#fff' },

    dayWrap: { alignItems: 'center', marginVertical: spacing.md },
    day: {
      fontSize: fontSize.xs,
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.28)',
      paddingHorizontal: spacing.md,
      paddingVertical: 3,
      borderRadius: radius.pill,
      overflow: 'hidden',
    },

    msgRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
    avatar: {
      width: 34,
      height: 34,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.accentWeak,
    },
    avatarText: { fontSize: fontSize.md, fontWeight: '800', color: c.accent },
    msgBody: { flex: 1, gap: 3 },
    author: { fontSize: fontSize.sm, color: c.muted },
    bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
    bubble: {
      maxWidth: '86%',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      borderTopLeftRadius: 2,
      backgroundColor: c.surface,
    },
    bubbleText: { fontSize: fontSize.md, lineHeight: 20, color: c.fg },
    time: { fontSize: fontSize.xs, color: c.muted },

    loading: { marginVertical: spacing.xl },
    error: {
      margin: spacing.page,
      fontSize: fontSize.sm,
      color: c.muted,
      textAlign: 'center',
    },
    empty: { alignItems: 'center', paddingVertical: 64, gap: 4 },
    emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: c.fg },
    emptyDesc: { fontSize: fontSize.sm, color: c.muted },
  });
