import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = { title: string; note?: string };

/** Phase 0 스캐폴드용 임시 화면. 각 Phase 에서 실제 구현으로 교체된다. */
export default function ScreenPlaceholder({ title, note }: Props) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>{title}</Text>
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: { fontSize: 20, fontWeight: '700' },
  note: { fontSize: 13, color: '#888' },
});
