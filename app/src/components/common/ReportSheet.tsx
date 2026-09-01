import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from '@/components/common/Icon';
import {
  REPORT_DETAIL_MAX,
  REPORT_DONE_MESSAGE,
  REPORT_REASONS,
  REPORT_TARGET_LABEL,
  type ReportTargetType,
} from '@/constants/moderation';
import { blockUser, reportContent } from '@/services/moderation';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';

export interface ReportTarget {
  type: ReportTargetType;
  id: string;
  /** 작성자 uid — 있으면 "이 사용자 차단" 도 함께 제공 */
  ownerUid?: string;
  ownerName?: string;
  /** 관리자가 맥락을 볼 수 있도록 원문 일부 */
  excerpt?: string;
}

type Props = {
  target: ReportTarget | null;
  onClose: () => void;
  /** 차단이 끝난 뒤 목록 갱신 등이 필요하면 */
  onBlocked?: (uid: string) => void;
};

/**
 * 신고 · 차단 바텀시트 (Apple 심사지침 1.2).
 * 게시글 / 댓글 / 채팅 / 초톡 어디서든 같은 UI 를 쓴다.
 */
export default function ReportSheet({ target, onClose, onBlocked }: Props) {
  const c = useTheme();
  const s = styles(c);
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState('');
  const [busy, setBusy] = useState(false);

  // 시트를 다시 열 때 이전 입력이 남지 않도록
  useEffect(() => {
    if (target) {
      setReason('');
      setDetail('');
      setBusy(false);
    }
  }, [target]);

  if (!target) return null;

  const label = REPORT_TARGET_LABEL[target.type];

  const onSubmit = async () => {
    if (!reason) {
      Alert.alert('신고', '사유를 선택해 주세요.');
      return;
    }
    setBusy(true);
    try {
      await reportContent({
        targetType: target.type,
        targetId: target.id,
        targetOwnerUid: target.ownerUid,
        targetOwnerName: target.ownerName,
        excerpt: target.excerpt,
        reason,
        detail,
      });
      onClose();
      Alert.alert('신고 완료', REPORT_DONE_MESSAGE);
    } catch (e) {
      Alert.alert('신고 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const onBlock = () => {
    const uid = target.ownerUid;
    if (!uid) return;
    Alert.alert(
      '사용자 차단',
      `${target.ownerName || '이 사용자'} 님을 차단할까요?\n차단하면 이 사용자의 글과 메시지가 보이지 않습니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '차단',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(uid, target.ownerName ?? '');
              onClose();
              onBlocked?.(uid);
              Alert.alert('차단 완료', '마이페이지 > 차단 목록에서 해제할 수 있습니다.');
            } catch (e) {
              Alert.alert(
                '차단 실패',
                e instanceof Error ? e.message : '잠시 후 다시 시도해 주세요.',
              );
            }
          },
        },
      ],
    );
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.dim} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <View style={s.handle} />

          <View style={s.head}>
            <Text style={s.title}>{label} 신고</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={s.close}>✕</Text>
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            {target.excerpt ? (
              <View style={s.excerptBox}>
                <Text style={s.excerpt} numberOfLines={3}>
                  {target.excerpt}
                </Text>
              </View>
            ) : null}

            <Text style={s.section}>사유를 선택해 주세요</Text>
            {REPORT_REASONS.map(r => {
              const on = reason === r.key;
              return (
                <Pressable
                  key={r.key}
                  style={({ pressed }) => [s.row, pressed && s.rowPressed]}
                  onPress={() => setReason(r.key)}
                >
                  <View style={[s.radio, on && s.radioOn]}>
                    {on ? <View style={s.radioDot} /> : null}
                  </View>
                  <Text style={[s.rowText, on && s.rowTextOn]}>{r.label}</Text>
                </Pressable>
              );
            })}

            <Text style={s.section}>상세 내용 (선택)</Text>
            <TextInput
              style={s.input}
              value={detail}
              onChangeText={t => setDetail(t.slice(0, REPORT_DETAIL_MAX))}
              placeholder="어떤 점이 문제인지 알려주시면 빠르게 처리할 수 있습니다."
              placeholderTextColor={c.muted}
              multiline
              textAlignVertical="top"
            />

            <Pressable
              style={({ pressed }) => [s.submit, pressed && s.submitPressed]}
              onPress={onSubmit}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={s.submitText}>신고하기</Text>
              )}
            </Pressable>

            {target.ownerUid ? (
              <Pressable style={s.block} onPress={onBlock}>
                <Icon name="user" size={16} color={c.muted} />
                <Text style={s.blockText}>이 사용자 차단하기</Text>
              </Pressable>
            ) : null}

            <Text style={s.note}>
              접수된 신고는 24시간 이내에 검토 후 조치합니다.
              허위 신고가 반복되면 이용이 제한될 수 있습니다.
            </Text>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    dim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.42)', justifyContent: 'flex-end' },
    sheet: {
      maxHeight: '86%',
      paddingHorizontal: spacing.page,
      paddingBottom: spacing.xl,
      borderTopLeftRadius: radius.md,
      borderTopRightRadius: radius.md,
      backgroundColor: c.surface,
    },
    handle: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      marginTop: spacing.sm,
      borderRadius: 2,
      backgroundColor: c.line,
    },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
    },
    title: { fontSize: fontSize.xl, fontWeight: '800', color: c.fg },
    close: { fontSize: fontSize.lg, color: c.muted, paddingHorizontal: 4 },

    excerptBox: {
      padding: spacing.md,
      borderRadius: radius.sm,
      backgroundColor: c.chipBg,
      marginBottom: spacing.sm,
    },
    excerpt: { fontSize: fontSize.sm, color: c.muted, lineHeight: 17 },

    section: {
      fontSize: fontSize.sm,
      fontWeight: '700',
      color: c.muted,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
    },
    rowPressed: { opacity: 0.6 },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: c.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioOn: { borderColor: c.accent },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.accent },
    rowText: { fontSize: fontSize.lg, color: c.fg },
    rowTextOn: { fontWeight: '700', color: c.accent },

    input: {
      minHeight: 84,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.sm,
      fontSize: fontSize.md,
      color: c.fg,
      backgroundColor: c.surface,
    },

    submit: {
      marginTop: spacing.lg,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.sm,
      backgroundColor: c.accent,
    },
    submitPressed: { opacity: 0.85 },
    submitText: { fontSize: fontSize.lg, fontWeight: '800', color: '#ffffff' },

    block: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      marginTop: spacing.md,
      height: 44,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: c.line,
    },
    blockText: { fontSize: fontSize.md, fontWeight: '700', color: c.muted },

    note: {
      marginTop: spacing.lg,
      fontSize: fontSize.xs,
      lineHeight: 15,
      color: c.muted,
      textAlign: 'center',
    },
  });
