import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';

const SECTIONS = [
  {
    title: 'Information We Collect',
    icon: 'document-text-outline' as const,
    body: `We collect information you provide when creating an account (username, email), content you post (text, images, links, videos), and interactions with other users (messages, follows, reactions).`,
  },
  {
    title: 'How We Use Your Data',
    icon: 'analytics-outline' as const,
    body: `Your data is used to provide and improve LinkerX services, personalize your feed, enable communication features, and ensure platform security. We do not sell your personal data to third parties.`,
  },
  {
    title: 'Content You Share',
    icon: 'share-social-outline' as const,
    body: `Posts, links, and bio pages you create are visible to other LinkerX users. Your bio page is publicly accessible. Direct messages are private between participants.`,
  },
  {
    title: 'Media & Uploads',
    icon: 'cloud-upload-outline' as const,
    body: `Images and files you upload are stored securely via Cloudinary. YouTube videos are linked by reference — we do not store video content directly.`,
  },
  {
    title: 'Data Retention',
    icon: 'time-outline' as const,
    body: `Your data is retained as long as your account is active. You may delete your account at any time, which will remove your personal data from our systems within 30 days.`,
  },
  {
    title: 'Your Rights',
    icon: 'shield-checkmark-outline' as const,
    body: `You have the right to access, correct, or delete your personal data. You can update your profile information at any time through the Edit Profile screen.`,
  },
  {
    title: 'Contact Us',
    icon: 'mail-outline' as const,
    body: `For privacy-related concerns, contact us at privacy@linkerx.app. We aim to respond within 48 hours.`,
  },
];

export default function PrivacyScreen() {
  const C = useColors();

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <View style={[styles.header, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: C.bgElevated }]}>
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Privacy Policy</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.lastUpdated, { color: C.textMuted }]}>Last updated: May 2026</Text>
        <Text style={[styles.intro, { color: C.textSecondary }]}>
          LinkerX is committed to protecting your privacy. This policy explains how we collect, use, and safeguard your information.
        </Text>

        {SECTIONS.map((section) => (
          <View key={section.title} style={[styles.section, { backgroundColor: C.bgCard, borderColor: C.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: C.purpleDim }]}>
                <Ionicons name={section.icon} size={18} color={C.purple} />
              </View>
              <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>{section.title}</Text>
            </View>
            <Text style={[styles.sectionBody, { color: C.textSecondary }]}>{section.body}</Text>
          </View>
        ))}

        <Text style={[styles.footer, { color: C.textMuted }]}>© 2026 LinkerX. All rights reserved.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1 },
  backBtn:      { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: 18, fontWeight: '700' },
  content:      { padding: 16, paddingBottom: 48, gap: 12 },
  lastUpdated:  { fontSize: 12, marginBottom: 4 },
  intro:        { fontSize: 14, lineHeight: 22, marginBottom: 8 },
  section:      { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  sectionBody:  { fontSize: 13, lineHeight: 20 },
  footer:       { textAlign: 'center', fontSize: 12, marginTop: 8 },
});
