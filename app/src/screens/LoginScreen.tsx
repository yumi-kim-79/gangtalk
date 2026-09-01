import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '@/components/common/Button';
import FormField from '@/components/common/FormField';
import { SOCIAL_LOGIN_ENABLED } from '@/constants/auth';
import {
  authErrorMessage,
  resetPassword,
  signInWithApple,
  signInWithEmail,
  signInWithKakao,
} from '@/services/auth';
import type { AuthStackParamList } from '@/navigation/types';
import { fontSize, spacing, useTheme, type ThemeColors } from '@/theme';

export default function LoginScreen() {
  const c = useTheme();
  const s = styles(c);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'Login'>>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'email' | 'kakao' | 'apple' | null>(null);
  const [error, setError] = useState('');

  const run = async (kind: 'email' | 'kakao' | 'apple', fn: () => Promise<unknown>) => {
    if (busy) return;
    setError('');
    setBusy(kind);
    try {
      await fn();
      navigation.goBack();
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const onForgot = async () => {
    if (!email.trim()) {
      setError('비밀번호를 재설정할 이메일을 입력해 주세요.');
      return;
    }
    try {
      await resetPassword(email);
      Alert.alert('메일 발송', '비밀번호 재설정 메일을 보냈습니다.');
    } catch (e) {
      setError(authErrorMessage(e));
    }
  };

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={[s.content, { paddingBottom: insets.bottom + spacing.xl }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={s.title}>강톡</Text>
      <Text style={s.subtitle}>로그인하고 찜·댓글·글쓰기를 이용하세요</Text>

      {/* 소셜 로그인 — 구현 보존, 노출만 차단 (constants/auth.ts SOCIAL_LOGIN_ENABLED) */}
      {SOCIAL_LOGIN_ENABLED ? (
        <>
          <View style={s.social}>
            <Button
              label="카카오로 시작하기"
              variant="kakao"
              loading={busy === 'kakao'}
              disabled={busy !== null && busy !== 'kakao'}
              onPress={() => run('kakao', signInWithKakao)}
            />
            {Platform.OS === 'ios' ? (
              <Button
                label="Apple로 계속하기"
                variant="apple"
                loading={busy === 'apple'}
                disabled={busy !== null && busy !== 'apple'}
                onPress={() => run('apple', signInWithApple)}
              />
            ) : null}
          </View>

          <View style={s.divider}>
            <View style={s.line} />
            <Text style={s.dividerText}>또는 이메일</Text>
            <View style={s.line} />
          </View>
        </>
      ) : null}

      <FormField
        label="이메일"
        value={email}
        onChangeText={setEmail}
        placeholder="gangtalk@example.com"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <FormField
        label="비밀번호"
        value={password}
        onChangeText={setPassword}
        placeholder="비밀번호"
        secureTextEntry
        textContentType="password"
      />

      {error ? <Text style={s.error}>{error}</Text> : null}

      <Button
        label="로그인"
        loading={busy === 'email'}
        disabled={busy !== null && busy !== 'email'}
        onPress={() => run('email', () => signInWithEmail(email, password))}
      />

      <View style={s.links}>
        <Text style={s.link} onPress={onForgot}>
          비밀번호 찾기
        </Text>
        <Text style={s.linkDot}>·</Text>
        <Text style={s.link} onPress={() => navigation.navigate('Signup')}>
          회원가입
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.page, gap: spacing.md },
    title: { fontSize: 32, fontWeight: '800', color: c.accent, marginTop: spacing.xl },
    subtitle: { fontSize: fontSize.md, color: c.muted, marginBottom: spacing.lg },
    social: { gap: spacing.sm },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginVertical: spacing.md,
    },
    line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: c.line },
    dividerText: { fontSize: fontSize.sm, color: c.muted },
    error: { fontSize: fontSize.sm, color: '#dc2626' },
    links: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    link: { fontSize: fontSize.sm, color: c.muted, textDecorationLine: 'underline' },
    linkDot: { fontSize: fontSize.sm, color: c.muted },
  });
