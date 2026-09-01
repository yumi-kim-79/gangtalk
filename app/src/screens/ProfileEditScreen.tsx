import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { ScrollView, StyleSheet, Text } from 'react-native';
import Button from '@/components/common/Button';
import FormField from '@/components/common/FormField';
import { NICKNAME_MAX, NICKNAME_MIN } from '@/constants/auth';
import { useAuth } from '@/hooks/useAuth';
import { updateNickname } from '@/services/mypage';
import { fontSize, spacing, useTheme, type ThemeColors } from '@/theme';

export default function ProfileEditScreen() {
  const c = useTheme();
  const s = styles(c);
  const navigation = useNavigation();
  const { uid, profile, reloadProfile } = useAuth();

  const [nickname, setNickname] = useState(profile?.nickname ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const onSave = async () => {
    setError('');
    const nick = nickname.trim();
    if (nick.length < NICKNAME_MIN || nick.length > NICKNAME_MAX) {
      setError(`닉네임은 ${NICKNAME_MIN}~${NICKNAME_MAX}자로 입력해 주세요.`);
      return;
    }
    if (!uid) return;

    setBusy(true);
    try {
      await updateNickname(uid, nick);
      await reloadProfile();
      navigation.goBack();
    } catch {
      setError('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <FormField
        label="닉네임"
        value={nickname}
        onChangeText={setNickname}
        placeholder={`${NICKNAME_MIN}~${NICKNAME_MAX}자`}
        maxLength={NICKNAME_MAX}
      />
      <FormField
        label="이메일"
        value={profile?.email ?? ''}
        editable={false}
        hint="이메일은 변경할 수 없습니다"
      />
      {error ? <Text style={s.error}>{error}</Text> : null}
      <Button label="저장" loading={busy} onPress={onSave} />
    </ScrollView>
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.page, gap: spacing.md },
    error: { fontSize: fontSize.sm, color: '#dc2626' },
  });
