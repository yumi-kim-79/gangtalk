import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '@/components/common/Button';
import FormField from '@/components/common/FormField';
import { NICKNAME_MAX, NICKNAME_MIN, PASSWORD_MIN } from '@/constants/auth';
import {
  authErrorMessage,
  sendSmsCode,
  isEmailTaken,
  isNicknameTaken,
  isReferralCodeValid,
  signUpWithEmail,
  verifySmsCode,
} from '@/services/auth';
import type { AuthStackParamList } from '@/navigation/types';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';

export default function SignupScreen() {
  const c = useTheme();
  const s = styles(c);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'Signup'>>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [refCode, setRefCode] = useState('');
  /* 웹 AuthPage 의 '중복확인' 버튼과 같은 동작 — 결과를 즉시 알려준다 */
  const [emailChecking, setEmailChecking] = useState(false);
  const [nickChecking, setNickChecking] = useState(false);

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const onSend = async () => {
    setError('');
    if (!/^\d{10,11}$/.test(phone.replace(/[^0-9]/g, ''))) {
      setError('휴대폰 번호를 정확히 입력해 주세요.');
      return;
    }
    setSending(true);
    try {
      await sendSmsCode(phone);
      setSent(true);
    } catch (e) {
      setError(smsErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const onVerify = async () => {
    setError('');
    setVerifying(true);
    try {
      const res = await verifySmsCode(phone, smsCode);
      if (res.ok) setVerified(true);
      else setError(verifyFailMessage(res.reason));
    } catch (e) {
      setError(smsErrorMessage(e));
    } finally {
      setVerifying(false);
    }
  };

  const onCheckEmail = async () => {
    const v = email.trim();
    if (!v) {
      Alert.alert('이메일', '이메일을 입력해 주세요.');
      return;
    }
    setEmailChecking(true);
    try {
      const taken = await isEmailTaken(v);
      Alert.alert(
        '이메일',
        taken ? '이미 사용 중인 이메일입니다.' : '사용 가능한 이메일입니다.',
      );
    } finally {
      setEmailChecking(false);
    }
  };

  const onCheckNick = async () => {
    const v = nickname.trim();
    if (!v) {
      Alert.alert('닉네임', '닉네임을 입력해 주세요.');
      return;
    }
    setNickChecking(true);
    try {
      const taken = await isNicknameTaken(v);
      Alert.alert(
        '닉네임',
        taken ? '이미 사용 중인 닉네임입니다.' : '사용 가능한 닉네임입니다.',
      );
    } finally {
      setNickChecking(false);
    }
  };

  const onSubmit = async () => {
    setError('');
    const nick = nickname.trim();
    if (nick.length < NICKNAME_MIN || nick.length > NICKNAME_MAX) {
      setError(`닉네임은 ${NICKNAME_MIN}~${NICKNAME_MAX}자로 입력해 주세요.`);
      return;
    }
    if (password.length < PASSWORD_MIN) {
      setError(`비밀번호는 ${PASSWORD_MIN}자 이상이어야 합니다.`);
      return;
    }
    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (!verified) {
      setError('휴대폰 인증을 완료해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      if (await isEmailTaken(email.trim())) {
        setError('이미 사용 중인 이메일입니다.');
        setSubmitting(false);
        return;
      }
      if (await isNicknameTaken(nick)) {
        setError('이미 사용 중인 닉네임입니다.');
        setSubmitting(false);
        return;
      }
      // 없는 코드로 가입하면 적립이 조용히 실패한다 → 계정 만들기 전에 잡는다
      const ref = refCode.trim().toLowerCase();
      if (ref && !(await isReferralCodeValid(ref))) {
        setError(`추천코드 "${ref}" 를 찾을 수 없습니다. 다시 확인해 주세요.`);
        setSubmitting(false);
        return;
      }
      await signUpWithEmail({
        email,
        password,
        nickname: nick,
        phone: phone.replace(/[^0-9]/g, ''),
        refCode: ref || undefined,
      });
      navigation.getParent()?.goBack();
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={[s.content, { paddingBottom: insets.bottom + spacing.xl }]}
      keyboardShouldPersistTaps="handled"
    >
      <FormField
        label="이메일"
        value={email}
        onChangeText={setEmail}
        placeholder="gangtalk@example.com"
        keyboardType="email-address"
        right={
          <Pressable
            style={s.checkBtn}
            onPress={onCheckEmail}
            disabled={emailChecking}
          >
            <Text style={s.checkBtnText}>
              {emailChecking ? '확인중…' : '중복확인'}
            </Text>
          </Pressable>
        }
      />
      <FormField
        label="비밀번호"
        value={password}
        onChangeText={setPassword}
        placeholder={`${PASSWORD_MIN}자 이상`}
        secureTextEntry
      />
      <FormField
        label="비밀번호 확인"
        value={passwordConfirm}
        onChangeText={setPasswordConfirm}
        placeholder="비밀번호 다시 입력"
        secureTextEntry
      />
      <FormField
        label="닉네임"
        value={nickname}
        onChangeText={setNickname}
        placeholder={`${NICKNAME_MIN}~${NICKNAME_MAX}자`}
        maxLength={NICKNAME_MAX}
        right={
          <Pressable
            style={s.checkBtn}
            onPress={onCheckNick}
            disabled={nickChecking}
          >
            <Text style={s.checkBtnText}>
              {nickChecking ? '확인중…' : '중복확인'}
            </Text>
          </Pressable>
        }
      />

      <FormField
        label="휴대폰 번호"
        value={phone}
        onChangeText={v => {
          setPhone(v);
          setSent(false);
          setVerified(false);
        }}
        placeholder="01012345678"
        keyboardType="number-pad"
        editable={!verified}
      />
      {!verified ? (
        <Button
          label={sent ? '인증번호 다시 받기' : '인증번호 받기'}
          variant="outline"
          loading={sending}
          onPress={onSend}
        />
      ) : null}

      {sent && !verified ? (
        <>
          <FormField
            label="인증번호"
            value={smsCode}
            onChangeText={setSmsCode}
            placeholder="6자리"
            keyboardType="number-pad"
            maxLength={6}
          />
          <Button label="인증 확인" variant="outline" loading={verifying} onPress={onVerify} />
        </>
      ) : null}

      {verified ? <Text style={s.ok}>휴대폰 인증이 완료되었습니다.</Text> : null}

      <FormField
        label="추천인 코드 (선택)"
        value={refCode}
        onChangeText={setRefCode}
        placeholder="친구에게 받은 코드를 그대로 입력"
        autoCapitalize="none"
      />

      {error ? <Text style={s.error}>{error}</Text> : null}

      <View style={s.submit}>
        <Button label="가입하기" loading={submitting} onPress={onSubmit} />
      </View>
    </ScrollView>
  );
}

/** App Check 미설정 시 나오는 오류를 구분해서 안내 */
function smsErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  const msg = (e as { message?: string })?.message ?? '';
  if (code.includes('unauthenticated') || msg.includes('App Check')) {
    return '문자 인증 서버 설정이 필요합니다. (App Check 미구성)';
  }
  if (code.includes('resource-exhausted')) {
    return '인증 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.';
  }
  return authErrorMessage(e);
}

function verifyFailMessage(reason?: string): string {
  switch (reason) {
    case 'no_request':
      return '먼저 인증번호를 받아 주세요.';
    case 'code_invalidated':
      return '인증번호가 만료되었습니다. 다시 받아 주세요.';
    case 'expired':
      return '인증번호 유효시간이 지났습니다.';
    default:
      return '인증번호가 올바르지 않습니다.';
  }
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.page, gap: spacing.md },
    ok: { fontSize: fontSize.sm, color: '#16a34a', fontWeight: '600' },
    error: { fontSize: fontSize.sm, color: '#dc2626' },
    submit: { marginTop: spacing.md },
    /* 웹 AuthPage 의 .btn.sm.ghost 와 같은 자리·역할 */
    checkBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radius.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
      backgroundColor: c.surface,
    },
    checkBtnText: { fontSize: fontSize.sm, fontWeight: '700', color: c.fg },
  });
