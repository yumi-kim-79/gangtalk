import React from 'react';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  LEGAL_COMPANY,
  PRIVACY_SECTIONS,
  TERMS_SECTIONS,
  type LegalSection,
} from '@/constants/legal';
import type { RootStackParamList } from '@/navigation/types';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';

/**
 * 이용약관 / 개인정보처리방침.
 * 스토어 심사에서 **앱 안에서** 열람 가능해야 하므로 웹 링크로 대체하지 않는다.
 */
export default function LegalScreen() {
  const c = useTheme();
  const s = styles(c);
  const { params } = useRoute<RouteProp<RootStackParamList, 'Legal'>>();
  const isTerms = params?.kind === 'terms';
  const sections: LegalSection[] = isTerms ? TERMS_SECTIONS : PRIVACY_SECTIONS;

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <View style={s.head}>
        <Text style={s.title}>{isTerms ? '강톡 이용약관' : '개인정보처리방침'}</Text>
        <Text style={s.meta}>시행일 {LEGAL_COMPANY.updatedAt}</Text>
      </View>

      {sections.map(sec => (
        <View key={sec.title} style={s.section}>
          <Text style={s.sectionTitle}>{sec.title}</Text>
          <Text style={s.body}>{sec.body}</Text>
        </View>
      ))}

      <View style={s.footer}>
        <Text style={s.footerLine}>{LEGAL_COMPANY.name}</Text>
        <Text style={s.footerLine}>대표 {LEGAL_COMPANY.ceo}</Text>
        <Text style={s.footerLine}>사업자등록번호 {LEGAL_COMPANY.bizNo}</Text>
        <Text style={s.footerLine}>{LEGAL_COMPANY.address}</Text>
        <Text style={s.footerLine}>{LEGAL_COMPANY.email}</Text>
      </View>
    </ScrollView>
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.page, paddingBottom: spacing.page * 2, gap: spacing.lg },
    head: { gap: 4 },
    title: { fontSize: fontSize.xl, fontWeight: '800', color: c.fg },
    meta: { fontSize: fontSize.sm, color: c.muted },
    section: { gap: 6 },
    sectionTitle: { fontSize: fontSize.md, fontWeight: '800', color: c.fg },
    body: { fontSize: fontSize.sm, lineHeight: 22, color: c.muted },
    footer: {
      marginTop: spacing.lg,
      padding: spacing.lg,
      borderRadius: radius.md,
      backgroundColor: c.chipBg,
      gap: 3,
    },
    footerLine: { fontSize: fontSize.xs, lineHeight: 18, color: c.muted },
  });
