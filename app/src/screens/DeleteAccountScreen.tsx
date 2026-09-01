import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '@/components/common/Button';
import FormField from '@/components/common/FormField';
import { deleteMyAccount } from '@/services/mypage';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';

/**
 * 회원탈퇴.
 * App Store 5.1.1(v) / Google Play 정책상 앱 안에서 계정 삭제가 가능해야 한다.
 * Auth 계정 삭제는 클라이언트가 할 수 없어 Cloud Function(deleteMyAccount)이 처리한다.
 */
export default function DeleteAccountScreen() {
  const c = useTheme();
  const s = styles(c);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const onDelete = () => {
    Alert.alert(
      '정말 탈퇴하시겠습니까?',
      '계정과 찜 목록이 삭제되며 되돌릴 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴하기',
          style: 'destructive',
          onPress: () => {
            setBusy(true);
            setError('');
            deleteMyAccount(reason)
              .catch(() => setError('탈퇴 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.'))
              .finally(() => setBusy(false));
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <View style={s.notice}>
        <Text style={s.noticeTitle}>탈퇴 전에 확인해 주세요</Text>
        <Text style={s.noticeItem}>· 계정 정보와 찜 목록이 삭제됩니다</Text>
        <Text style={s.noticeItem}>· 보유하신 포인트와 추천코드가 사라집니다</Text>
        <Text style={s.noticeItem}>· 작성하신 글과 댓글은 그대로 남습니다</Text>
        <Text style={s.noticeItem}>· 삭제된 정보는 복구할 수 없습니다</Text>
      </View>

      <FormField
        label="탈퇴 사유 (선택)"
        value={reason}
        onChangeText={setReason}
        placeholder="개선에 참고하겠습니다"
        multiline
      />

      {error ? <Text style={s.error}>{error}</Text> : null}

      <Button label="회원탈퇴" loading={busy} onPress={onDelete} />
    </ScrollView>
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.page, gap: spacing.lg },
    notice: {
      padding: spacing.lg,
      borderRadius: radius.md,
      backgroundColor: c.chipBg,
      gap: 6,
    },
    noticeTitle: { fontSize: fontSize.md, fontWeight: '800', color: c.fg, marginBottom: 2 },
    noticeItem: { fontSize: fontSize.sm, lineHeight: 20, color: c.muted },
    error: { fontSize: fontSize.sm, color: '#dc2626' },
  });
