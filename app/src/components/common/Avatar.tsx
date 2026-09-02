/**
 * 프로필 아바타.
 * 웹 .avatar(사진 배경 + 닉네임 폴백 + bgColor/textColor)와 같은 규칙으로 그린다.
 */
import React from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import {
  AVATAR_BG_DEFAULT,
  AVATAR_TEXT_DEFAULT,
  avatarInitials,
} from '@/constants/profileColors';

type Props = {
  nickname?: string;
  photoUrl?: string;
  bgColor?: string;
  textColor?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export default function Avatar({
  nickname = '',
  photoUrl = '',
  bgColor = '',
  textColor = '',
  size = 48,
  style,
}: Props) {
  const bg = bgColor || AVATAR_BG_DEFAULT;
  const fg = textColor || AVATAR_TEXT_DEFAULT;
  const box: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: bg,
  };

  return (
    <View style={[styles.box, box, style]}>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.img} resizeMode="cover" />
      ) : (
        <Text
          style={[styles.text, { color: fg, fontSize: Math.max(11, Math.round(size * 0.34)) }]}
          numberOfLines={1}
        >
          {avatarInitials(nickname)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  text: { fontWeight: '800' },
});
