import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';

export interface SheetOption<T extends string> {
  key: T;
  label: string;
}

type Props<T extends string> = {
  visible: boolean;
  title: string;
  options: SheetOption<T>[];
  selected: T;
  onSelect: (key: T) => void;
  onClose: () => void;
};

/**
 * 웹의 드롭다운 <ul class="menu"> 대체.
 * 앱에서는 화면 상단 드롭다운보다 하단 시트가 한 손 조작에 유리해 형태를 바꿨다.
 */
export default function OptionSheet<T extends string>({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: Props<T>) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const s = styles(c);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable
          style={[s.sheet, { paddingBottom: insets.bottom + spacing.md }]}
          onPress={e => e.stopPropagation()}
        >
          <View style={s.grabber} />
          <Text style={s.title}>{title}</Text>
          {options.map(o => {
            const active = o.key === selected;
            return (
              <Pressable
                key={o.key}
                style={s.item}
                android_ripple={{ color: c.chipBorder }}
                onPress={() => {
                  onSelect(o.key);
                  onClose();
                }}
              >
                <Text style={[s.itemText, active && s.itemTextActive]}>{o.label}</Text>
                {active ? <Text style={s.check}>✓</Text> : null}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: spacing.page,
      paddingTop: spacing.md,
    },
    grabber: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: radius.pill,
      backgroundColor: c.line,
      marginBottom: spacing.md,
    },
    title: {
      fontSize: fontSize.sm,
      color: c.muted,
      marginBottom: spacing.xs,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 52,
    },
    itemText: { fontSize: fontSize.lg, color: c.fg },
    itemTextActive: { color: c.accent, fontWeight: '700' },
    check: { fontSize: fontSize.lg, color: c.accent },
  });
