import React from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';

type Props = TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
  right?: React.ReactNode;
};

export default function FormField({ label, hint, error, right, ...rest }: Props) {
  const c = useTheme();
  const s = styles(c);
  return (
    <View style={s.wrap}>
      <Text style={s.label}>{label}</Text>
      <View style={[s.inputRow, !!error && s.inputRowError]}>
        <TextInput
          style={s.input}
          placeholderTextColor={c.muted}
          autoCapitalize="none"
          autoCorrect={false}
          {...rest}
        />
        {right}
      </View>
      {error ? <Text style={s.error}>{error}</Text> : hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    wrap: { gap: 6 },
    label: { fontSize: fontSize.sm, fontWeight: '600', color: c.fg },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 48,
      paddingHorizontal: spacing.md,
      borderRadius: radius.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.chipBorder,
      backgroundColor: c.surface,
    },
    inputRowError: { borderColor: '#dc2626' },
    input: { flex: 1, fontSize: fontSize.md, color: c.fg, padding: 0 },
    hint: { fontSize: fontSize.xs, color: c.muted },
    error: { fontSize: fontSize.xs, color: '#dc2626' },
  });
