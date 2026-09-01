import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { fontSize, radius, useTheme, type ThemeColors } from '@/theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'kakao' | 'apple';
  disabled?: boolean;
  loading?: boolean;
};

const KAKAO_BG = '#FEE500';
const KAKAO_FG = '#191600';

export default function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
}: Props) {
  const c = useTheme();
  const s = styles(c);
  const off = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        s.base,
        variant === 'primary' && s.primary,
        variant === 'outline' && s.outline,
        variant === 'kakao' && s.kakao,
        variant === 'apple' && s.apple,
        off && s.off,
        pressed && !off && s.pressed,
      ]}
      android_ripple={off ? undefined : { color: 'rgba(0,0,0,0.08)' }}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : c.fg} />
      ) : (
        <Text
          style={[
            s.text,
            variant === 'primary' && s.textPrimary,
            variant === 'outline' && s.textOutline,
            variant === 'kakao' && s.textKakao,
            variant === 'apple' && s.textApple,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    base: {
      minHeight: 50,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.sm,
    },
    primary: { backgroundColor: c.accent },
    outline: {
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.chipBorder,
    },
    kakao: { backgroundColor: KAKAO_BG },
    apple: { backgroundColor: '#000000' },
    off: { opacity: 0.5 },
    pressed: { opacity: 0.85 },
    text: { fontSize: fontSize.md, fontWeight: '700' },
    textPrimary: { color: '#ffffff' },
    textOutline: { color: c.fg },
    textKakao: { color: KAKAO_FG },
    textApple: { color: '#ffffff' },
  });
