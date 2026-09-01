import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '@/components/common/Icon';
import { fontSize, spacing, useTheme, type ThemeColors } from '@/theme';

type Props = {
  label: string;
  value?: string;
  onPress: () => void;
  danger?: boolean;
};

export default function MenuRow({ label, value, onPress, danger }: Props) {
  const c = useTheme();
  const s = styles(c);
  return (
    <Pressable
      style={({ pressed }) => [s.row, pressed && s.pressed]}
      onPress={onPress}
      android_ripple={{ color: c.chipBg }}
    >
      <Text style={[s.label, danger && s.danger]}>{label}</Text>
      <View style={s.right}>
        {value ? <Text style={s.value}>{value}</Text> : null}
        <Icon name="chevronRight" size={16} color={c.muted} />
      </View>
    </Pressable>
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 54,
      paddingHorizontal: spacing.page,
      backgroundColor: c.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.line,
    },
    pressed: { backgroundColor: c.chipBg },
    label: { fontSize: fontSize.md, color: c.fg },
    danger: { color: '#dc2626' },
    right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    value: { fontSize: fontSize.sm, color: c.muted },
  });
