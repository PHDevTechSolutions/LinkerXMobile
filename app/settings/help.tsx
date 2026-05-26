import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';

const FAQS = [
  {
    q: 'How do I change my profile picture?',
    a: 'Go to Profile → Edit Profile. Tap your avatar to pick a new photo from your gallery.',
  },
  {
    q: 'How do I post a YouTube video?',
    a: 'Tap the + (Post) tab → select "Video" → tap "Search YouTube Video" to find and attach a video to your post.',
  },
  {
    q: 'What is the Music Player?',
    a: 'The Music Player lets you search and play YouTube music that persists across all tabs. Access it from Profile → Music Player.',
  },
  {
    q: 'What is my Bio Page?',
    a: 'Your Bio Page is a public page at linkerx/@username showing your links, profile, and recent posts. Share it with anyone — no account needed to view.',
  },
  {
    q: 'How do I delete a message?',
    a: 'Long press any message in a chat to open the options menu. Choose "Delete for Me" to hide it only for you, or "Delete for Everyone" to remove it for both sides.',
  },
  {
    q: 'How do I pin a message?',
    a: 'Long press a message → tap "Pin Message". The pinned message will appear in a banner at the top of the chat.',
  },
  {
    q: 'How do I start a video call?',
    a: 'Open a chat conversation and tap the video camera icon in the top right, or use the attach menu (+) and select "Video Call".',
  },
  {
    q: 'How do I share my bio page?',
    a: 'Go to Profile → My Links. Tap the share icon on the bio banner at the top to copy or share your bio link.',
  },
];

const CONTACT = [
  { icon: 'mail-outline' as const,    label: 'Email Support',   value: 'support@linkerx.app',          action: () => Linking.openURL('mailto:support@linkerx.app') },
  { icon: 'logo-github' as const,     label: 'GitHub Issues',   value: 'github.com/PHDevTechSolutions',  action: () => Linking.openURL('https://github.com/PHDevTechSolutions') },
];

export default function HelpScreen() {
  const C = useColors();
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <View style={[styles.header, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: C.bgElevated }]}>
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Help & Support</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient colors={[C.purple + 'cc', C.cyan + 'aa']} style={styles.hero}>
          <Ionicons name="help-buoy-outline" size={36} color="#fff" />
          <Text style={styles.heroTitle}>How can we help?</Text>
          <Text style={styles.heroSub}>Find answers to common questions below.</Text>
        </LinearGradient>

        {/* FAQ */}
        <Text style={[styles.sectionLabel, { color: C.textMuted }]}>FREQUENTLY ASKED QUESTIONS</Text>
        {FAQS.map((faq, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.faqItem, { backgroundColor: C.bgCard, borderColor: expanded === i ? C.purple : C.border }]}
            onPress={() => setExpanded(expanded === i ? null : i)}
            activeOpacity={0.8}
          >
            <View style={styles.faqHeader}>
              <Text style={[styles.faqQ, { color: C.textPrimary }]}>{faq.q}</Text>
              <Ionicons name={expanded === i ? 'chevron-up' : 'chevron-down'} size={16} color={C.textMuted} />
            </View>
            {expanded === i && (
              <Text style={[styles.faqA, { color: C.textSecondary }]}>{faq.a}</Text>
            )}
          </TouchableOpacity>
        ))}

        {/* Contact */}
        <Text style={[styles.sectionLabel, { color: C.textMuted, marginTop: 8 }]}>CONTACT US</Text>
        {CONTACT.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.contactItem, { backgroundColor: C.bgCard, borderColor: C.border }]}
            onPress={item.action}
          >
            <View style={[styles.contactIcon, { backgroundColor: C.purpleDim }]}>
              <Ionicons name={item.icon} size={20} color={C.purple} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.contactLabel, { color: C.textPrimary }]}>{item.label}</Text>
              <Text style={[styles.contactValue, { color: C.textMuted }]}>{item.value}</Text>
            </View>
            <Ionicons name="open-outline" size={16} color={C.cyan} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1 },
  backBtn:      { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: 18, fontWeight: '700' },
  content:      { padding: 16, paddingBottom: 48, gap: 10 },
  hero:         { borderRadius: 20, padding: 24, alignItems: 'center', gap: 8, marginBottom: 4 },
  heroTitle:    { color: '#fff', fontSize: 20, fontWeight: '800' },
  heroSub:      { color: 'rgba(255,255,255,0.8)', fontSize: 13, textAlign: 'center' },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginLeft: 2 },
  faqItem:      { borderRadius: 14, borderWidth: 1, padding: 14 },
  faqHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  faqQ:         { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  faqA:         { fontSize: 13, lineHeight: 20, marginTop: 10 },
  contactItem:  { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  contactIcon:  { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  contactLabel: { fontSize: 14, fontWeight: '600' },
  contactValue: { fontSize: 12, marginTop: 2 },
});
