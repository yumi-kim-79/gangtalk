/**
 * 프로필 수정 — 웹 ProfileEditSheet.vue(개인 회원) 이식.
 * 아바타 사진 / 배경색 9색 / 글자색 8색 / 닉네임 / 연락처를 웹과 같은 필드에 저장한다.
 */
import React, { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Avatar from '@/components/common/Avatar';
import Button from '@/components/common/Button';
import FormField from '@/components/common/FormField';
import { NICKNAME_MAX, NICKNAME_MIN } from '@/constants/auth';
import {
  AVATAR_BG_DEFAULT,
  AVATAR_BG_PRESETS,
  AVATAR_TEXT_DEFAULT,
  AVATAR_TEXT_PRESETS,
} from '@/constants/profileColors';
import { useAuth } from '@/hooks/useAuth';
import { saveProfile } from '@/services/mypage';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';

export default function ProfileEditScreen() {
  const c = useTheme();
  const s = styles(c);
  const navigation = useNavigation();
  const { uid, profile, reloadProfile } = useAuth();

  const [nickname, setNickname] = useState(profile?.nickname ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [photo, setPhoto] = useState(profile?.photoUrl ?? '');
  const [bgColor, setBgColor] = useState(profile?.bgColor || AVATAR_BG_DEFAULT);
  const [textColor, setTextColor] = useState(profile?.textColor || AVATAR_TEXT_DEFAULT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pickPhoto = useCallback(async () => {
    try {
      const res = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        // 업로드 용량을 줄인다 — storage.rules 상한 10MB
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.8,
      });
      if (res.didCancel) return;
      if (res.errorCode) {
        Alert.alert('사진을 불러오지 못했습니다', res.errorMessage ?? res.errorCode);
        return;
      }
      const uri = res.assets?.[0]?.uri;
      if (uri) setPhoto(uri);
    } catch (e) {
      Alert.alert('사진을 불러오지 못했습니다', e instanceof Error ? e.message : '');
    }
  }, []);

  const onSave = useCallback(async () => {
    setError('');
    const nick = nickname.trim();
    if (nick.length < NICKNAME_MIN || nick.length > NICKNAME_MAX) {
      setError(`닉네임은 ${NICKNAME_MIN}~${NICKNAME_MAX}자로 입력해 주세요.`);
      return;
    }
    if (!uid) return;

    setBusy(true);
    try {
      await saveProfile(uid, { nickname: nick, phone, bgColor, textColor, photo });
      await reloadProfile();
      navigation.goBack();
    } catch (e) {
      // 조용히 삼키면 "저장했다는데 안 바뀐다"가 된다 — 사유를 그대로 보여 준다
      setError(e instanceof Error ? e.message : '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }, [nickname, phone, bgColor, textColor, photo, uid, reloadProfile, navigation]);

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      {/* 아바타 미리보기 — 탭하면 사진 선택 */}
      <View style={s.avatarWrap}>
        <Pressable onPress={pickPhoto} accessibilityRole="button" accessibilityLabel="프로필 사진 변경">
          <Avatar
            nickname={nickname || profile?.nickname || ''}
            photoUrl={photo}
            bgColor={bgColor}
            textColor={textColor}
            size={96}
          />
        </Pressable>
        <View style={s.photoBtns}>
          <Pressable style={s.tiny} onPress={pickPhoto}>
            <Text style={s.tinyText}>사진 선택</Text>
          </Pressable>
          {photo ? (
            <Pressable style={s.tiny} onPress={() => setPhoto('')}>
              <Text style={s.tinyText}>사진 지우기</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* 배경 색상 9색 */}
      <View style={s.colorRow}>
        <View style={s.colorHead}>
          <Text style={s.colorLabel}>배경 색상</Text>
          <Text style={s.colorHint}>기본 색상 9개 중 선택</Text>
        </View>
        <View style={s.dots}>
          {AVATAR_BG_PRESETS.map(v => (
            <Pressable
              key={v}
              onPress={() => setBgColor(v)}
              accessibilityRole="button"
              accessibilityLabel={`배경색 ${v} 선택`}
              style={[s.dot, { backgroundColor: v }, v === bgColor && s.dotOn]}
            />
          ))}
        </View>
      </View>

      {/* 텍스트 색상 8색 */}
      <View style={s.colorRow}>
        <View style={s.colorHead}>
          <Text style={s.colorLabel}>텍스트 색상</Text>
          <Text style={s.colorHint}>글자 색상 8개 중 선택</Text>
        </View>
        <View style={s.dots}>
          {AVATAR_TEXT_PRESETS.map(v => (
            <Pressable
              key={v}
              onPress={() => setTextColor(v)}
              accessibilityRole="button"
              accessibilityLabel={`텍스트 색 ${v} 선택`}
              style={[s.dot, { backgroundColor: v }, v === textColor && s.dotOn]}
            />
          ))}
        </View>
      </View>

      <FormField
        label="닉네임"
        value={nickname}
        onChangeText={setNickname}
        placeholder={`${NICKNAME_MIN}~${NICKNAME_MAX}자`}
        maxLength={NICKNAME_MAX}
      />
      <FormField
        label="연락처"
        value={phone}
        onChangeText={setPhone}
        placeholder="연락처(선택)"
        keyboardType="phone-pad"
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

    avatarWrap: { alignItems: 'center', gap: spacing.sm },
    photoBtns: { flexDirection: 'row', gap: spacing.sm },
    tiny: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.sm,
      backgroundColor: c.chipBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.chipBorder,
    },
    tinyText: { fontSize: fontSize.md, color: c.fg, fontWeight: '600' },

    colorRow: { gap: spacing.sm },
    colorHead: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
    colorLabel: { fontSize: fontSize.md, fontWeight: '700', color: c.fg },
    colorHint: { fontSize: fontSize.xs, color: c.muted },
    dots: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    dot: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.line,
    },
    dotOn: { borderWidth: 3, borderColor: c.accent },

    error: { fontSize: fontSize.sm, color: '#dc2626' },
  });
